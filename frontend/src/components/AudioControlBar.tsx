interface Props {
  autoSpeak: boolean
  onAutoSpeakChange: (value: boolean) => void
  rate: number
  onRateChange: (value: number) => void
  voices: SpeechSynthesisVoice[]
  selectedVoiceURI: string
  onVoiceChange: (value: string) => void
  onTestVoice: () => void
}

const RATES = [
  { value: 0.75, label: '0.75x (Slow)' },
  { value: 1, label: '1.0x (Normal)' },
  { value: 1.25, label: '1.25x (Fast)' },
]

function formatVoiceName(name: string): string {
  return name
    .replace('Microsoft ', '')
    .replace(' Online (Natural)', ' (Natural ⭐)')
    .replace(' - English (United States)', ' (US)')
    .replace(' - English (United Kingdom)', ' (UK)')
    .replace(' - English (Australia)', ' (AU)')
    .replace(' - English (India)', ' (IN)')
}

export default function AudioControlBar(props: Props) {
  return (
    <div className="audio-controls">
      <label>
        <input
          type="checkbox"
          checked={props.autoSpeak}
          onChange={(e) => props.onAutoSpeakChange(e.target.checked)}
        />
        Auto Speak AI
      </label>

      {props.voices.length > 0 && (
        <label>
          Voice
          <select
            value={props.selectedVoiceURI}
            onChange={(e) => props.onVoiceChange(e.target.value)}
          >
            {props.voices.map((v) => (
              <option key={v.voiceURI} value={v.voiceURI}>
                {formatVoiceName(v.name)}
              </option>
            ))}
          </select>
          <button
            type="button"
            className="test-voice-button"
            onClick={props.onTestVoice}
            title="Dengarkan contoh suara"
          >
            ▶ Test
          </button>
        </label>
      )}

      <label>
        Speed
        <select value={props.rate} onChange={(e) => props.onRateChange(Number(e.target.value))}>
          {RATES.map((r) => (
            <option key={r.value} value={r.value}>
              {r.label}
            </option>
          ))}
        </select>
      </label>
    </div>
  )
}
