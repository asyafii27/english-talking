package main

import (
	"log"
	"os"
	"strings"

	"github.com/gin-gonic/gin"
	"github.com/yourusername/english-conversation-partner/config"
	"github.com/yourusername/english-conversation-partner/routes"
)

func main() {
	// Initialize database
	db, err := config.NewDatabase()
	if err != nil {
		log.Fatalf("Failed to connect to database: %v", err)
	}
	defer db.Close()

	// Initialize Gin
	router := gin.Default()

	// CORS middleware
	allowedOrigins := map[string]bool{}
	for _, o := range strings.Split(os.Getenv("FRONTEND_ORIGIN"), ",") {
		if o = strings.TrimRight(strings.TrimSpace(o), "/"); o != "" {
			allowedOrigins[o] = true
		}
	}

	router.Use(func(c *gin.Context) {
		if origin := c.GetHeader("Origin"); allowedOrigins[origin] {
			c.Writer.Header().Set("Access-Control-Allow-Origin", origin)
			c.Writer.Header().Set("Vary", "Origin")
		}
		c.Writer.Header().Set("Access-Control-Allow-Credentials", "true")
		c.Writer.Header().Set("Access-Control-Allow-Headers", "Content-Type, Content-Length, Accept-Encoding, X-CSRF-Token, Authorization, accept, origin, Cache-Control, X-Requested-With")
		c.Writer.Header().Set("Access-Control-Allow-Methods", "POST, OPTIONS, GET, PUT, DELETE")

		if c.Request.Method == "OPTIONS" {
			c.AbortWithStatus(204)
			return
		}

		c.Next()
	})

	// Routes
	routes.SetupRoutes(router, db)

	// Start server
	port := os.Getenv("APP_PORT")
	if port == "" {
		port = "8081"
	}

	log.Printf("Server running on port %s\n", port)
	if err := router.Run(":" + port); err != nil {
		log.Fatalf("Failed to start server: %v", err)
	}
}
