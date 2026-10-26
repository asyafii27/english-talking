import { useCallback, useEffect, useRef, useState } from 'react'

export function cleanTextForSpeech(text: string): string {
  return text
    .replace(/\*\*(.*?)\*\*/g, '$1')
    .replace(/\*(.*?)\*/g, '$1')
    .replace(/[`#_~]/g, '')
    .replace(/[\u{1F300}-\u{1FAFF}\u{2600}-\u{27BF}]/gu, '')
    .trim()
}

// Friendly & Natural voices ranked by warmth and conversational quality
const PREFERRED_VOICE_KEYWORDS = [
  'Jenny', // Microsoft Jenny Online (Natural) - very friendly conversational female voice
  'Aria', // Microsoft Aria Online (Natural) - polite, pleasant
  'Guy', // Microsoft Guy Online (Natural) - friendly conversational male voice
  'Ana', // Microsoft Ana Online (Natural)
  'Google US English', // Chrome friendly US voice
  'Google UK English Female',
  'Natural', // Any Edge/Windows Online Natural voice
  'Samantha', // macOS friendly voice
  'Zira', // Windows desktop female voice
]

const STORAGE_VOICE_KEY = 'preferredVoiceURI'

function filterEnglishVoices(all: SpeechSynthesisVoice[]): SpeechSynthesisVoice[] {
  return all.filter((v) => v.lang.toLowerCase().startsWith('en'))
}

function findBestFriendlyVoice(
  voices: SpeechSynthesisVoice[],
  savedURI?: string | null,
): SpeechSynthesisVoice | null {
  if (voices.length === 0) return null

  // 1. Check if user previously saved a preference
  if (savedURI) {
    const found = voices.find((v) => v.voiceURI === savedURI)
    if (found) return found
  }

  // 2. Look for preferred friendly/natural voices
  for (const keyword of PREFERRED_VOICE_KEYWORDS) {
    const match = voices.find((v) => v.name.includes(keyword))
    if (match) return match
  }

  // 3. Fallback to any en-US or first English voice
  const usVoice = voices.find((v) => v.lang.toLowerCase() === 'en-us')
  return usVoice || voices[0] || null
}

export function useTextToSpeech() {
  const isSupported = typeof window !== 'undefined' && 'speechSynthesis' in window
  const [isSpeaking, setIsSpeaking] = useState(false)
  const [voices, setVoices] = useState<SpeechSynthesisVoice[]>([])
  const [selectedVoiceURI, setSelectedVoiceURI] = useState<string>(() => {
    try {
      return localStorage.getItem(STORAGE_VOICE_KEY) || ''
    } catch {
      return ''
    }
  })
  const [rate, setRate] = useState(1)
  const utteranceRef = useRef<SpeechSynthesisUtterance | null>(null)

  const updateVoices = useCallback(() => {
    if (!isSupported) return
    const all = window.speechSynthesis.getVoices()
    const english = filterEnglishVoices(all)
    setVoices(english)

    setSelectedVoiceURI((prevURI) => {
      const best = findBestFriendlyVoice(english, prevURI)
      return best ? best.voiceURI : ''
    })
  }, [isSupported])

  useEffect(() => {
    if (!isSupported) return
    updateVoices()
    window.speechSynthesis.addEventListener('voiceschanged', updateVoices)
    return () => window.speechSynthesis.removeEventListener('voiceschanged', updateVoices)
  }, [isSupported, updateVoices])

  const setVoiceURI = useCallback((uri: string) => {
    setSelectedVoiceURI(uri)
    try {
      localStorage.setItem(STORAGE_VOICE_KEY, uri)
    } catch {
      // ignore storage error
    }
  }, [])

  const stop = useCallback(() => {
    if (!isSupported) return
    window.speechSynthesis.cancel()
    setIsSpeaking(false)
  }, [isSupported])

  const currentVoice = voices.find((v) => v.voiceURI === selectedVoiceURI) || null

  const speak = useCallback(
    (text: string) => {
      if (!isSupported) return
      const clean = cleanTextForSpeech(text)
      if (!clean) return
      window.speechSynthesis.cancel()
      const utterance = new SpeechSynthesisUtterance(clean)

      const activeVoice = voices.find((v) => v.voiceURI === selectedVoiceURI) || currentVoice
      if (activeVoice) {
        utterance.voice = activeVoice
        utterance.lang = activeVoice.lang
      } else {
        utterance.lang = 'en-US'
      }

      utterance.rate = rate
      // Slightly warmer pitch for friendlier and less robotic tone
      utterance.pitch = 1.05

      utterance.onstart = () => setIsSpeaking(true)
      utterance.onend = () => setIsSpeaking(false)
      utterance.onerror = () => setIsSpeaking(false)

      // Chrome drops utterances queued right after cancel() and can garbage-collect them mid-speech.
      utteranceRef.current = utterance
      setTimeout(() => {
        window.speechSynthesis.resume()
        window.speechSynthesis.speak(utterance)
      }, 100)
    },
    [isSupported, voices, selectedVoiceURI, currentVoice, rate],
  )

  return {
    isSupported,
    isSpeaking,
    speak,
    stop,
    rate,
    setRate,
    voices,
    selectedVoiceURI,
    setVoiceURI,
  }
}
