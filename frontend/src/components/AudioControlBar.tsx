interface Props {
  autoSpeak: boolean
  onAutoSpeakChange: (value: boolean) => void
  rate: number
  onRateChange: (value: number) => void
}

const RATES = [
  { value: 0.75, label: '0.75x (Slow)' },
  { value: 1, label: '1.0x (Normal)' },
  { value: 1.25, label: '1.25x (Fast)' },
]

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
