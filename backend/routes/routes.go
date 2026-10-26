package routes

import (
	"database/sql"
	"log"

	"github.com/gin-gonic/gin"
	"github.com/yourusername/english-conversation-partner/controllers"
	"github.com/yourusername/english-conversation-partner/repositories"
)

func SetupRoutes(router *gin.Engine, db *sql.DB) {
	repo := repositories.NewConversationRepository(db)
	if err := repo.Migrate(); err != nil {
		log.Fatalf("Failed to migrate database: %v", err)
	}
	chat := controllers.NewChatController(repo)

	api := router.Group("/api")
	api.GET("/health", func(c *gin.Context) {
		c.JSON(200, gin.H{"status": "ok"})
	})
	api.POST("/chat", chat.HandleChat)
	api.GET("/conversations", chat.ListConversations)
	api.GET("/conversations/:id/messages", chat.GetMessages)
	api.DELETE("/conversations/:id", chat.DeleteConversation)
}
