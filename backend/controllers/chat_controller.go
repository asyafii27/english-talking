package controllers

import (
	"database/sql"
	"net/http"
	"os"

	"github.com/gin-gonic/gin"
	"github.com/yourusername/english-conversation-partner/services"
	"github.com/yourusername/english-conversation-partner/models"
)

type ChatController struct {
	db *sql.DB
}

func NewChatController(db *sql.DB) *ChatController {
	return &ChatController{db: db}
}

func (cc *ChatController) HandleChat(c *gin.Context) {
	var req struct {
		Message string        `json:"message" binding:"required"`
		History []interface{} `json:"history"`
		Level   string        `json:"level"`
	}

	if err := c.BindJSON(&req); err != nil {
		c.JSON(http.StatusBadRequest, gin.H{"error": "Invalid request"})
		return
	}

	// Get AI provider and model from env
	provider := os.Getenv("AI_PROVIDER")
	apiKey := os.Getenv("AI_API_KEY")
	model := os.Getenv("AI_MODEL")

	if apiKey == "" {
		c.JSON(http.StatusInternalServerError, gin.H{
			"error": "AI_API_KEY not configured",
		})
		return
	}

	// Get AI response
	aiService := services.NewAIService(provider, apiKey, model)
	reply, correction, err := aiService.GetResponse(req.Message, req.History, req.Level)
	if err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{
			"error": err.Error(),
		})
		return
	}

	response := models.ChatResponse{
		Reply: reply,
	}

	if correction != nil {
		response.Correction = correction
	}

	c.JSON(http.StatusOK, response)
}
