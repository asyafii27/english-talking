interface Props {
  isListening: boolean
  disabled?: boolean
  onClick: () => void
}

export default function MicButton({ isListening, disabled, onClick }: Props) {
  return (
    <button
      type="button"
      className={`mic-button ${isListening ? 'listening' : ''}`}
      onClick={onClick}
      disabled={disabled}
      title={isListening ? 'Stop' : 'Bicara'}
      aria-label={isListening ? 'Stop listening' : 'Start listening'}
    >
      {isListening ? '⏹' : '🎤'}
    </button>
  )
}
