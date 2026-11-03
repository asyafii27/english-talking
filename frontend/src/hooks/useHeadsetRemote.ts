import { useEffect, useRef } from 'react'

// Silent 1-second audio in Base64 to keep mediaSession active in OS/Browser
const SILENT_WAV =
  'data:audio/wav;base64,UklGRigAAABXQVZFZm10IBAAAAABAAEARKwAAIhYAQACABAAZGF0YQQAAAAAAP8A/w=='

export function playRemoteChime(type: 'start' | 'stop') {
  try {
    /* eslint-disable @typescript-eslint/no-explicit-any */
    const AudioCtx = window.AudioContext || (window as any).webkitAudioContext
    if (!AudioCtx) return
    const ctx = new AudioCtx()
    const osc = ctx.createOscillator()
    const gain = ctx.createGain()
    osc.connect(gain)
    gain.connect(ctx.destination)
    osc.type = 'sine'

    const now = ctx.currentTime
    if (type === 'start') {
      // High pitch double-chime (D5 -> A5) to signal mic active
      osc.frequency.setValueAtTime(587.33, now)
      osc.frequency.exponentialRampToValueAtTime(880, now + 0.1)
    } else {
      // Descending chime (A5 -> D5) to signal mic stopped
      osc.frequency.setValueAtTime(880, now)
      osc.frequency.exponentialRampToValueAtTime(440, now + 0.1)
    }

    gain.gain.setValueAtTime(0.12, now)
    gain.gain.exponentialRampToValueAtTime(0.001, now + 0.22)
    osc.start(now)
    osc.stop(now + 0.25)
  } catch {
    // Ignore audio context errors
  }
}

interface UseHeadsetRemoteProps {
  enabled: boolean
  onToggleMic: () => void
}

export function useHeadsetRemote({ enabled, onToggleMic }: UseHeadsetRemoteProps) {
  const onToggleRef = useRef(onToggleMic)
  onToggleRef.current = onToggleMic
  const audioRef = useRef<HTMLAudioElement | null>(null)

  useEffect(() => {
    if (!enabled || typeof window === 'undefined') return

    // 1. Maintain a silent loop so the OS keeps media session routed to this tab
    let audio = audioRef.current
    if (!audio) {
      audio = new Audio(SILENT_WAV)
      audio.loop = true
      audio.volume = 0.01 // Minimal volume to prevent muting restrictions
      audioRef.current = audio
    }

    audio.play().catch(() => {
      // Autoplay might need user gesture; user clicking checkbox serves as gesture
    })

    // 2. Setup navigator.mediaSession
    if ('mediaSession' in navigator) {
      navigator.mediaSession.metadata = new MediaMetadata({
        title: 'English Conversation Partner',
        artist: 'Headset Remote Active 🎧',
        album: 'Tekan tombol headset untuk bicara',
      })

      const handleRemoteClick = () => {
        onToggleRef.current()
      }

      const actions: MediaSessionAction[] = [
        'play',
        'pause',
        'nexttrack',
        'previoustrack',
        'stop',
      ]

      actions.forEach((act) => {
        try {
          navigator.mediaSession.setActionHandler(act, handleRemoteClick)
        } catch {
          // ignore unsupported actions
        }
      })

      // Special action in Chromium for headset mic toggle button
      try {
        /* eslint-disable @typescript-eslint/no-explicit-any */
        navigator.mediaSession.setActionHandler('togglemicrophone' as any, handleRemoteClick)
      } catch {
        // ignore
      }
    }

    // 3. Fallback for wireless clickers & media keys via keyboard events
    const handleKeyDown = (e: KeyboardEvent) => {
      // Detect Media Keys sent by Bluetooth headsets
      if (
        e.code === 'MediaPlayPause' ||
        e.code === 'MediaTrackNext' ||
        e.code === 'MediaTrackPrevious' ||
        e.key === 'MediaPlayPause'
      ) {
        e.preventDefault()
        onToggleRef.current()
        return
      }

      // Shortcut: Alt + M to toggle mic
      if (e.altKey && (e.key === 'm' || e.key === 'M')) {
        e.preventDefault()
        onToggleRef.current()
      }
    }

    window.addEventListener('keydown', handleKeyDown)

    return () => {
      window.removeEventListener('keydown', handleKeyDown)
      if (audioRef.current) {
        audioRef.current.pause()
      }
      if ('mediaSession' in navigator) {
        try {
          navigator.mediaSession.setActionHandler('play', null)
          navigator.mediaSession.setActionHandler('pause', null)
          navigator.mediaSession.setActionHandler('nexttrack', null)
          navigator.mediaSession.setActionHandler('previoustrack', null)
        } catch {
          // ignore
        }
      }
    }
  }, [enabled])
}
