export interface Correction {
  original?: string
  corrected?: string
  explanation?: string
}

export interface ChatMessage {
  id?: string
  role: 'user' | 'assistant'
  content: string
  correction?: Correction
}

export interface Conversation {
  id: string
  title: string
  level: string
  created_at: string
  updated_at: string
}

export interface ChatResponse {
  conversation_id: string
  reply: string
  correction?: Correction | null
}
