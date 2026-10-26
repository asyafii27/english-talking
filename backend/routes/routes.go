package routes

import (
	"database/sql"

	"github.com/gin-gonic/gin"
	"github.com/yourusername/english-conversation-partner/controllers"
)

func SetupRoutes(router *gin.Engine, db *sql.DB) {
	chatController := controllers.NewChatController(db)

	// Health check
	router.GET("/api/health", func(c *gin.Context) {
		c.JSON(200, gin.H{
			"status": "ok",
		})
	})

	// Chat endpoints
	router.POST("/api/chat", chatController.HandleChat)
}
