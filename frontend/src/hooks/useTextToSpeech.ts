import { useCallback, useEffect, useRef, useState } from 'react'

export function cleanTextForSpeech(text: string): string {
  return text
    .replace(/\*\*(.*?)\*\*/g, '$1')
    .replace(/\*(.*?)\*/g, '$1')
    .replace(/[`#_~]/g, '')
    .replace(/[\u{1F300}-\u{1FAFF}\u{2600}-\u{27BF}]/gu, '')
    .trim()
}

const PREFERRED_VOICES = ['Natural', 'Google US English', 'Google UK English', 'Samantha']

function pickVoice(voices: SpeechSynthesisVoice[]): SpeechSynthesisVoice | null {
  const english = voices.filter((v) => v.lang.toLowerCase().startsWith('en'))
  for (const name of PREFERRED_VOICES) {
    const match = english.find((v) => v.name.includes(name))
    if (match) return match
  }
  return english[0] ?? null
}

export function useTextToSpeech() {
  const isSupported = typeof window !== 'undefined' && 'speechSynthesis' in window
  const [isSpeaking, setIsSpeaking] = useState(false)
  const [voice, setVoice] = useState<SpeechSynthesisVoice | null>(null)
  const [rate, setRate] = useState(1)
  const utteranceRef = useRef<SpeechSynthesisUtterance | null>(null)

  useEffect(() => {
    if (!isSupported) return
    const load = () => setVoice(pickVoice(window.speechSynthesis.getVoices()))
    load()
    window.speechSynthesis.addEventListener('voiceschanged', load)
    return () => window.speechSynthesis.removeEventListener('voiceschanged', load)
  }, [isSupported])

  const stop = useCallback(() => {
    if (!isSupported) return
    window.speechSynthesis.cancel()
    setIsSpeaking(false)
  }, [isSupported])

  const speak = useCallback(
    (text: string) => {
      if (!isSupported) return
      const clean = cleanTextForSpeech(text)
      if (!clean) return
      window.speechSynthesis.cancel()
      const utterance = new SpeechSynthesisUtterance(clean)
      utterance.lang = voice?.lang ?? 'en-US'
      if (voice) utterance.voice = voice
      utterance.rate = rate
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
    [isSupported, voice, rate],
  )

  return { isSupported, isSpeaking, speak, stop, rate, setRate }
}
