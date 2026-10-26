package services

import (
	"bytes"
	"encoding/json"
	"fmt"
	"io"
	"net/http"

	"github.com/yourusername/english-conversation-partner/models"
)

type AIService struct {
	Provider string
	APIKey   string
	Model    string
}

func NewAIService(provider, apiKey, model string) *AIService {
	return &AIService{
		Provider: provider,
		APIKey:   apiKey,
		Model:    model,
	}
}

func (as *AIService) GetResponse(message string, history []interface{}, level string) (string, *models.Correction, error) {
	// For MVP, implement Groq API integration
	if as.Provider == "groq" {
		return as.callGroqAPI(message, history, level)
	}

	return "", nil, fmt.Errorf("unsupported AI provider: %s", as.Provider)
}

func (as *AIService) callGroqAPI(message string, history []interface{}, level string) (string, *models.Correction, error) {
	if as.Model == "" {
		return "", nil, fmt.Errorf("AI_MODEL is not configured")
	}

	// Build messages for Groq API
	messages := []map[string]string{
		{
			"role": "system",
			"content": `You are a friendly English conversation partner and patient English tutor.
The learner may be a beginner or intermediate English speaker.

Rules:
1. Continue a natural conversation in English.
2. Use clear, natural English suitable for the learner's selected level.
3. Usually ask one relevant follow-up question to keep the conversation going.
4. Do not turn every message into a grammar lecture.
5. When the learner makes a meaningful English mistake, show a corrected sentence.
6. Explain important corrections briefly in Indonesian when correction mode is enabled.
7. If the sentence is already natural, do not invent a correction.
8. Encourage the learner without being condescending.
9. Do not claim to assess pronunciation from text alone.
10. Keep replies concise unless the learner asks for more detail.`,
		},
	}

	// Add conversation history if provided
	if history != nil && len(history) > 0 {
		for _, msg := range history {
			if m, ok := msg.(map[string]interface{}); ok {
				if role, ok := m["role"].(string); ok && role != "" {
					if content, ok := m["content"].(string); ok && content != "" {
						messages = append(messages, map[string]string{
							"role":    role,
							"content": content,
						})
					}
				}
			}
		}
	}

	// Add current message
	messages = append(messages, map[string]string{
		"role":    "user",
		"content": message,
	})

	// Make request to Groq API
	reqBody := map[string]interface{}{
		"model":    as.Model,
		"messages": messages,
	}

	body, _ := json.Marshal(reqBody)
	req, _ := http.NewRequest("POST", "https://api.groq.com/openai/v1/chat/completions", bytes.NewBuffer(body))
	req.Header.Set("Content-Type", "application/json")
	req.Header.Set("Authorization", fmt.Sprintf("Bearer %s", as.APIKey))

	client := &http.Client{}
	resp, err := client.Do(req)
	if err != nil {
		return "", nil, fmt.Errorf("failed to call Groq API: %w", err)
	}
	defer resp.Body.Close()

	if resp.StatusCode != http.StatusOK {
		body, _ := io.ReadAll(resp.Body)
		return "", nil, fmt.Errorf("Groq API error: %d - %s", resp.StatusCode, string(body))
	}

	var result struct {
		Choices []struct {
			Message struct {
				Content string `json:"content"`
			} `json:"message"`
		} `json:"choices"`
	}

	json.NewDecoder(resp.Body).Decode(&result)

	if len(result.Choices) == 0 {
		return "", nil, fmt.Errorf("no response from Groq API")
	}

	reply := result.Choices[0].Message.Content

	return reply, nil, nil
}
