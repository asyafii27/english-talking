import type { ChatMessage, ChatResponse, Conversation } from '../types/chat'

const API_BASE = import.meta.env.VITE_API_BASE_URL ?? 'http://localhost:8081/api'

async function request<T>(path: string, init?: RequestInit): Promise<T> {
  const response = await fetch(`${API_BASE}${path}`, {
    headers: { 'Content-Type': 'application/json' },
    ...init,
  })
  if (response.status === 204) return undefined as T
  const data = await response.json().catch(() => ({}))
  if (!response.ok) throw new Error(data.error ?? `API error: ${response.status}`)
  return data as T
}

export const chatApi = {
  sendMessage: (body: { message: string; conversation_id?: string; voice_mode: boolean }) =>
    request<ChatResponse>('/chat', { method: 'POST', body: JSON.stringify(body) }),
  listConversations: () => request<Conversation[]>('/conversations'),
  getMessages: (id: string) => request<ChatMessage[]>(`/conversations/${id}/messages`),
  deleteConversation: (id: string) => request<void>(`/conversations/${id}`, { method: 'DELETE' }),
}
