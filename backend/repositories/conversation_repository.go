package repositories

import (
	"database/sql"
	"encoding/json"
	"time"

	schema "github.com/yourusername/english-conversation-partner/db"
	"github.com/yourusername/english-conversation-partner/models"
)

type ConversationRepository struct {
	db *sql.DB
}

func NewConversationRepository(db *sql.DB) *ConversationRepository {
	return &ConversationRepository{db: db}
}

func (r *ConversationRepository) Migrate() error {
	if _, err := r.db.Exec(schema.Schema); err != nil {
		return err
	}
	_, err := r.db.Exec(`ALTER TABLE messages ADD COLUMN IF NOT EXISTS correction JSONB`)
	return err
}

func (r *ConversationRepository) Create(title, level string) (*models.Conversation, error) {
	c := &models.Conversation{}
	var created, updated time.Time
	err := r.db.QueryRow(
		`INSERT INTO conversations (title, level) VALUES ($1, $2)
		 RETURNING id, COALESCE(title, ''), level, created_at, updated_at`,
		title, level,
	).Scan(&c.ID, &c.Title, &c.Level, &created, &updated)
	if err != nil {
		return nil, err
	}
	c.CreatedAt, c.UpdatedAt = created.Format(time.RFC3339), updated.Format(time.RFC3339)
	return c, nil
}

func (r *ConversationRepository) List() ([]models.Conversation, error) {
	rows, err := r.db.Query(
		`SELECT id, COALESCE(title, ''), level, created_at, updated_at
		 FROM conversations ORDER BY updated_at DESC LIMIT 100`,
	)
	if err != nil {
		return nil, err
	}
	defer rows.Close()

	list := []models.Conversation{}
	for rows.Next() {
		var c models.Conversation
		var created, updated time.Time
		if err := rows.Scan(&c.ID, &c.Title, &c.Level, &created, &updated); err != nil {
			return nil, err
		}
		c.CreatedAt, c.UpdatedAt = created.Format(time.RFC3339), updated.Format(time.RFC3339)
		list = append(list, c)
	}
	return list, rows.Err()
}

func (r *ConversationRepository) Exists(id string) (bool, error) {
	var exists bool
	err := r.db.QueryRow(`SELECT EXISTS(SELECT 1 FROM conversations WHERE id::text = $1)`, id).Scan(&exists)
	return exists, err
}

func (r *ConversationRepository) Delete(id string) error {
	_, err := r.db.Exec(`DELETE FROM conversations WHERE id::text = $1`, id)
	return err
}

func (r *ConversationRepository) Messages(conversationID string) ([]models.Message, error) {
	rows, err := r.db.Query(
		`SELECT id, conversation_id, role, content, correction, created_at
		 FROM messages WHERE conversation_id::text = $1 ORDER BY created_at ASC`,
		conversationID,
	)
	if err != nil {
		return nil, err
	}
	defer rows.Close()

	list := []models.Message{}
	for rows.Next() {
		var m models.Message
		var correction []byte
		var created time.Time
		if err := rows.Scan(&m.ID, &m.ConversationID, &m.Role, &m.Content, &correction, &created); err != nil {
			return nil, err
		}
		if len(correction) > 0 {
			var c models.Correction
			if json.Unmarshal(correction, &c) == nil {
				m.Correction = &c
			}
		}
		m.CreatedAt = created.Format(time.RFC3339)
		list = append(list, m)
	}
	return list, rows.Err()
}

func (r *ConversationRepository) RecentHistory(conversationID string, limit int) ([]models.HistoryMessage, error) {
	rows, err := r.db.Query(
		`SELECT role, content FROM (
		   SELECT role, content, created_at FROM messages
		   WHERE conversation_id::text = $1 ORDER BY created_at DESC LIMIT $2
		 ) t ORDER BY created_at ASC`,
		conversationID, limit,
	)
	if err != nil {
		return nil, err
	}
	defer rows.Close()

	history := []models.HistoryMessage{}
	for rows.Next() {
		var h models.HistoryMessage
		if err := rows.Scan(&h.Role, &h.Content); err != nil {
			return nil, err
		}
		history = append(history, h)
	}
	return history, rows.Err()
}

func (r *ConversationRepository) SaveExchange(conversationID, userMsg, reply string, correction *models.Correction) error {
	tx, err := r.db.Begin()
	if err != nil {
		return err
	}
	defer tx.Rollback()

	var correctionJSON interface{}
	if correction != nil {
		b, _ := json.Marshal(correction)
		correctionJSON = string(b)
	}

	if _, err := tx.Exec(
		`INSERT INTO messages (conversation_id, role, content, created_at)
		 VALUES ($1, 'user', $2, NOW())`,
		conversationID, userMsg,
	); err != nil {
		return err
	}
	if _, err := tx.Exec(
		`INSERT INTO messages (conversation_id, role, content, correction, created_at)
		 VALUES ($1, 'assistant', $2, $3, NOW() + INTERVAL '1 millisecond')`,
		conversationID, reply, correctionJSON,
	); err != nil {
		return err
	}
	if _, err := tx.Exec(`UPDATE conversations SET updated_at = NOW() WHERE id = $1`, conversationID); err != nil {
		return err
	}
	return tx.Commit()
}
