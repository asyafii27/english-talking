import type { Conversation } from '../types/chat'

interface Props {
  conversations: Conversation[]
  activeId: string | null
  onSelect: (id: string) => void
  onNew: () => void
  onDelete: (id: string) => void
}

export default function ConversationSidebar({ conversations, activeId, onSelect, onNew, onDelete }: Props) {
  return (
    <aside className="sidebar">
      <button type="button" className="new-conversation" onClick={onNew}>
        + New conversation
      </button>
      <div className="conversation-list">
        {conversations.length === 0 && <p className="empty">Belum ada percakapan.</p>}
        {conversations.map((c) => (
          <div
            key={c.id}
            className={`conversation-item ${c.id === activeId ? 'active' : ''}`}
            onClick={() => onSelect(c.id)}
          >
            <div className="conversation-title">{c.title || 'Untitled'}</div>
            <div className="conversation-date">{new Date(c.updated_at).toLocaleString()}</div>
            <button
              type="button"
              className="delete-conversation"
              title="Hapus"
              onClick={(e) => {
                e.stopPropagation()
                if (confirm('Hapus percakapan ini?')) onDelete(c.id)
              }}
            >
              🗑
            </button>
          </div>
        ))}
      </div>
    </aside>
  )
}
