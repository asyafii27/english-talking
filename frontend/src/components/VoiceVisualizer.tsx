export type VoiceStatus = 'idle' | 'listening' | 'thinking' | 'speaking'

const LABELS: Record<VoiceStatus, string> = {
  idle: '',
  listening: 'Listening...',
  thinking: 'AI Thinking...',
  speaking: 'AI Speaking...',
}

export default function VoiceVisualizer({ status }: { status: VoiceStatus }) {
  if (status === 'idle') return null
  const animated = status === 'listening' || status === 'speaking'
  return (
    <div className={`voice-status ${status}`}>
      <div className={`wave ${animated ? 'active' : ''}`}>
        {Array.from({ length: 5 }).map((_, i) => (
          <span key={i} style={{ animationDelay: `${i * 0.1}s` }} />
        ))}
      </div>
      <span>{LABELS[status]}</span>
    </div>
  )
}
