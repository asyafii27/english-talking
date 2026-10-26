package controllers

import (
	"log"
	"net/http"
	"os"
	"strings"

	"github.com/gin-gonic/gin"
	"github.com/yourusername/english-conversation-partner/models"
	"github.com/yourusername/english-conversation-partner/repositories"
	"github.com/yourusername/english-conversation-partner/services"
)

const (
	maxMessageLength = 2000
	historyLimit     = 20
	defaultLevel     = "B1"
)

type ChatController struct {
	repo *repositories.ConversationRepository
}

func NewChatController(repo *repositories.ConversationRepository) *ChatController {
	return &ChatController{repo: repo}
}

func serverError(c *gin.Context, err error) {
	log.Printf("error: %v", err)
	c.JSON(http.StatusInternalServerError, gin.H{"error": "Terjadi kesalahan di server"})
}

func makeTitle(message string) string {
	title := strings.TrimSpace(message)
	if r := []rune(title); len(r) > 50 {
		title = string(r[:50]) + "..."
	}
	return title
}

func (cc *ChatController) HandleChat(c *gin.Context) {
	var req struct {
		Message        string `json:"message" binding:"required"`
		ConversationID string `json:"conversation_id"`
		Level          string `json:"level"`
		VoiceMode      bool   `json:"voice_mode"`
	}
	if err := c.BindJSON(&req); err != nil {
		c.JSON(http.StatusBadRequest, gin.H{"error": "Invalid request"})
		return
	}
	req.Message = strings.TrimSpace(req.Message)
	if req.Message == "" || len([]rune(req.Message)) > maxMessageLength {
		c.JSON(http.StatusBadRequest, gin.H{"error": "Pesan kosong atau terlalu panjang"})
		return
	}
	if req.Level == "" {
		req.Level = defaultLevel
	}

	apiKey := os.Getenv("AI_API_KEY")
	if apiKey == "" {
		c.JSON(http.StatusInternalServerError, gin.H{"error": "AI_API_KEY not configured"})
		return
	}

	conversationID := req.ConversationID
	history := []models.HistoryMessage{}
	if conversationID != "" {
		exists, err := cc.repo.Exists(conversationID)
		if err != nil {
			serverError(c, err)
			return
		}
		if !exists {
			c.JSON(http.StatusNotFound, gin.H{"error": "Percakapan tidak ditemukan"})
			return
		}
		if history, err = cc.repo.RecentHistory(conversationID, historyLimit); err != nil {
			serverError(c, err)
			return
		}
	}

	aiService := services.NewAIService(os.Getenv("AI_PROVIDER"), apiKey, os.Getenv("AI_MODEL"))
	reply, correction, err := aiService.GetResponse(req.Message, history, req.Level, req.VoiceMode)
	if err != nil {
		c.JSON(http.StatusBadGateway, gin.H{"error": err.Error()})
		return
	}

	if conversationID == "" {
		conv, err := cc.repo.Create(makeTitle(req.Message), req.Level)
		if err != nil {
			serverError(c, err)
			return
		}
		conversationID = conv.ID
	}

	if err := cc.repo.SaveExchange(conversationID, req.Message, reply, correction); err != nil {
		serverError(c, err)
		return
	}

	c.JSON(http.StatusOK, models.ChatResponse{
		ConversationID: conversationID,
		Reply:          reply,
		Correction:     correction,
	})
}

func (cc *ChatController) ListConversations(c *gin.Context) {
	list, err := cc.repo.List()
	if err != nil {
		serverError(c, err)
		return
	}
	c.JSON(http.StatusOK, list)
}

func (cc *ChatController) GetMessages(c *gin.Context) {
	id := c.Param("id")
	exists, err := cc.repo.Exists(id)
	if err != nil {
		serverError(c, err)
		return
	}
	if !exists {
		c.JSON(http.StatusNotFound, gin.H{"error": "Percakapan tidak ditemukan"})
		return
	}
	msgs, err := cc.repo.Messages(id)
	if err != nil {
		serverError(c, err)
		return
	}
	c.JSON(http.StatusOK, msgs)
}

func (cc *ChatController) DeleteConversation(c *gin.Context) {
	if err := cc.repo.Delete(c.Param("id")); err != nil {
		serverError(c, err)
		return
	}
	c.Status(http.StatusNoContent)
}
