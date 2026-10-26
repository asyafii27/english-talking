package models

type ChatRequest struct {
	Message        string        `json:"message"`
	ConversationID string        `json:"conversation_id,omitempty"`
	History        []interface{} `json:"history,omitempty"`
	Level          string        `json:"level,omitempty"`
	CorrectionMode string        `json:"correction_mode,omitempty"`
}

type Correction struct {
	Original      string `json:"original,omitempty"`
	Corrected     string `json:"corrected,omitempty"`
	Explanation   string `json:"explanation,omitempty"`
	ExplanationID string `json:"explanation_id,omitempty"`
}

type ChatResponse struct {
	Reply      string       `json:"reply"`
	Correction *Correction  `json:"correction,omitempty"`
}

type Message struct {
	ID             string `json:"id"`
	ConversationID string `json:"conversation_id"`
	Role           string `json:"role"`
	Content        string `json:"content"`
	CreatedAt      string `json:"created_at"`
}

type Conversation struct {
	ID        string `json:"id"`
	UserID    string `json:"user_id,omitempty"`
	Title     string `json:"title,omitempty"`
	Level     string `json:"level"`
	CreatedAt string `json:"created_at"`
	UpdatedAt string `json:"updated_at"`
}
