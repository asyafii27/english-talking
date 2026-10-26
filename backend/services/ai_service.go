package services

import (
	"bytes"
	"encoding/json"
	"fmt"
	"io"
	"net/http"
	"strings"
	"time"

	"github.com/yourusername/english-conversation-partner/models"
)

const maxHistory = 20

const basePrompt = `You are a friendly English conversation partner and patient English tutor.
The learner may be a beginner or intermediate English speaker.

Rules:
1. Continue a natural conversation in English.
2. Use clear, natural English suitable for the learner's level.
3. Usually ask one relevant follow-up question to keep the conversation going.
4. Do not turn every message into a grammar lecture.
5. If the learner's latest message has a meaningful English mistake, provide a correction.
6. Write the correction explanation briefly in Indonesian.
7. If the sentence is already natural, set "correction" to null. Never invent a correction.
8. Encourage the learner without being condescending.
9. Do not claim to assess pronunciation from text alone.
10. Do not use markdown or emoji in "reply".

Respond ONLY with a JSON object in this exact shape:
{"reply": "<your conversational reply>", "correction": null or {"original": "<learner sentence>", "corrected": "<corrected sentence>", "explanation": "<short explanation in Indonesian>"}}`

const voicePrompt = `

Voice mode is ON: the reply will be read aloud. Keep "reply" short (1-3 sentences) and conversational. Do not mention the correction inside "reply"; it is shown separately on screen.`

type AIService struct {
	Provider string
	APIKey   string
	Model    string
}

func NewAIService(provider, apiKey, model string) *AIService {
	return &AIService{Provider: provider, APIKey: apiKey, Model: model}
}

func (as *AIService) GetResponse(message string, history []models.HistoryMessage, level string, voiceMode bool) (string, *models.Correction, error) {
	if as.Model == "" {
		return "", nil, fmt.Errorf("AI_MODEL is not configured")
	}

	system, messages := buildConversation(message, history, level, voiceMode)

	var content string
	var err error
	switch as.Provider {
	case "gemini":
		content, err = as.callGemini(system, messages)
	case "groq":
		content, err = as.callGroq(system, messages)
	default:
		return "", nil, fmt.Errorf("unsupported AI provider: %s", as.Provider)
	}
	if err != nil {
		return "", nil, err
	}
	return parseAIContent(content)
}

func buildConversation(message string, history []models.HistoryMessage, level string, voiceMode bool) (string, []map[string]string) {
	system := basePrompt
	if level != "" {
		system += fmt.Sprintf("\n\nLearner level: %s.", level)
	}
	if voiceMode {
		system += voicePrompt
	}

	var messages []map[string]string

	if len(history) > maxHistory {
		history = history[len(history)-maxHistory:]
	}
	for _, h := range history {
		messages = append(messages, map[string]string{"role": h.Role, "content": h.Content})
	}

	messages = append(messages, map[string]string{"role": "user", "content": message})
	return system, messages
}

var httpClient = &http.Client{Timeout: 60 * time.Second}

func postJSON(url string, headers map[string]string, payload interface{}, out interface{}, name string) error {
	body, _ := json.Marshal(payload)

	var resp *http.Response
	for attempt := 0; attempt < 2; attempt++ {
		req, _ := http.NewRequest("POST", url, bytes.NewBuffer(body))
		req.Header.Set("Content-Type", "application/json")
		for k, v := range headers {
			req.Header.Set(k, v)
		}

		var err error
		resp, err = httpClient.Do(req)
		if err != nil {
			if attempt == 0 {
				continue
			}
			return fmt.Errorf("%s tidak merespons (timeout/jaringan), coba lagi atau ganti AI_MODEL", name)
		}
		if resp.StatusCode == http.StatusServiceUnavailable && attempt == 0 {
			resp.Body.Close()
			time.Sleep(time.Second)
			continue
		}
		break
	}
	defer resp.Body.Close()

	if resp.StatusCode == http.StatusServiceUnavailable {
		return fmt.Errorf("model %s sedang sibuk (503), coba lagi sebentar atau ganti AI_MODEL", name)
	}

	if resp.StatusCode == http.StatusTooManyRequests {
		return fmt.Errorf("kuota AI habis atau terlalu banyak request, coba lagi nanti")
	}
	if resp.StatusCode != http.StatusOK {
		b, _ := io.ReadAll(resp.Body)
		return fmt.Errorf("%s API error: %d - %s", name, resp.StatusCode, string(b))
	}
	if err := json.NewDecoder(resp.Body).Decode(out); err != nil {
		return fmt.Errorf("invalid response from %s API", name)
	}
	return nil
}

func (as *AIService) callGroq(system string, messages []map[string]string) (string, error) {
	all := append([]map[string]string{{"role": "system", "content": system}}, messages...)
	payload := map[string]interface{}{
		"model":           as.Model,
		"messages":        all,
		"response_format": map[string]string{"type": "json_object"},
	}

	var result struct {
		Choices []struct {
			Message struct {
				Content string `json:"content"`
			} `json:"message"`
		} `json:"choices"`
	}
	headers := map[string]string{"Authorization": "Bearer " + as.APIKey}
	if err := postJSON("https://api.groq.com/openai/v1/chat/completions", headers, payload, &result, "Groq"); err != nil {
		return "", err
	}
	if len(result.Choices) == 0 {
		return "", fmt.Errorf("no response from Groq API")
	}
	return result.Choices[0].Message.Content, nil
}

func (as *AIService) callGemini(system string, messages []map[string]string) (string, error) {
	type part struct {
		Text string `json:"text"`
	}
	type content struct {
		Role  string `json:"role,omitempty"`
		Parts []part `json:"parts"`
	}

	contents := make([]content, 0, len(messages))
	for _, m := range messages {
		role := "user"
		if m["role"] == "assistant" {
			role = "model"
		}
		contents = append(contents, content{Role: role, Parts: []part{{Text: m["content"]}}})
	}

	payload := map[string]interface{}{
		"systemInstruction": content{Parts: []part{{Text: system}}},
		"contents":          contents,
		"generationConfig":  map[string]string{"responseMimeType": "application/json"},
	}

	var result struct {
		Candidates []struct {
			Content content `json:"content"`
		} `json:"candidates"`
	}
	url := fmt.Sprintf("https://generativelanguage.googleapis.com/v1beta/models/%s:generateContent", as.Model)
	headers := map[string]string{"x-goog-api-key": as.APIKey}
	if err := postJSON(url, headers, payload, &result, "Gemini"); err != nil {
		return "", err
	}
	if len(result.Candidates) == 0 || len(result.Candidates[0].Content.Parts) == 0 {
		return "", fmt.Errorf("no response from Gemini API")
	}
	return result.Candidates[0].Content.Parts[0].Text, nil
}

func parseAIContent(content string) (string, *models.Correction, error) {
	var parsed struct {
		Reply      string             `json:"reply"`
		Correction *models.Correction `json:"correction"`
	}
	if err := json.Unmarshal([]byte(content), &parsed); err != nil || strings.TrimSpace(parsed.Reply) == "" {
		return strings.TrimSpace(content), nil, nil
	}
	if parsed.Correction != nil && strings.TrimSpace(parsed.Correction.Corrected) == "" {
		parsed.Correction = nil
	}
	return parsed.Reply, parsed.Correction, nil
}
