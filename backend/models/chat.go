package models

type Correction struct {
	Original    string `json:"original,omitempty"`
	Corrected   string `json:"corrected,omitempty"`
	Explanation string `json:"explanation,omitempty"`
}

type ChatResponse struct {
	ConversationID string      `json:"conversation_id"`
	Reply          string      `json:"reply"`
	Correction     *Correction `json:"correction,omitempty"`
}

type HistoryMessage struct {
	Role    string
	Content string
}

type Message struct {
	ID             string      `json:"id"`
	ConversationID string      `json:"conversation_id"`
	Role           string      `json:"role"`
	Content        string      `json:"content"`
	Correction     *Correction `json:"correction,omitempty"`
	CreatedAt      string      `json:"created_at"`
}

type Conversation struct {
	ID        string `json:"id"`
	Title     string `json:"title"`
	Level     string `json:"level"`
	CreatedAt string `json:"created_at"`
	UpdatedAt string `json:"updated_at"`
}
