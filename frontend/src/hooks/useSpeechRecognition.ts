import { useCallback, useEffect, useRef, useState } from 'react'

/* eslint-disable @typescript-eslint/no-explicit-any */
const SpeechRecognitionImpl: any =
  typeof window !== 'undefined'
    ? (window as any).SpeechRecognition || (window as any).webkitSpeechRecognition
    : undefined

const ERROR_MESSAGES: Record<string, string> = {
  'not-allowed': 'Izin mikrofon ditolak. Aktifkan izin mikrofon di browser.',
  'no-speech': 'Tidak ada suara terdeteksi. Coba lagi.',
  'audio-capture': 'Mikrofon tidak ditemukan.',
  network: 'Koneksi bermasalah saat mengenali suara.',
}

interface Options {
  onFinal?: (text: string) => void
  silenceMs?: number
}

export function useSpeechRecognition({ onFinal, silenceMs = 3000 }: Options = {}) {
  const isSupported = Boolean(SpeechRecognitionImpl)
  const [isListening, setIsListening] = useState(false)
  const [transcript, setTranscript] = useState('')
  const [interim, setInterim] = useState('')
  const [error, setError] = useState<string | null>(null)
  const recognitionRef = useRef<any>(null)
  const finalRef = useRef('')
  const onFinalRef = useRef(onFinal)
  onFinalRef.current = onFinal
  const silenceTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null)

  const clearSilenceTimer = () => {
    if (silenceTimerRef.current) clearTimeout(silenceTimerRef.current)
    silenceTimerRef.current = null
  }

  useEffect(() => {
    if (!isSupported) return
    const recognition = new SpeechRecognitionImpl()
    recognition.lang = 'en-US'
    recognition.continuous = true
    recognition.interimResults = true

    recognition.onresult = (event: any) => {
      clearSilenceTimer()
      silenceTimerRef.current = setTimeout(() => recognition.stop(), silenceMs)
      let interimText = ''
      for (let i = event.resultIndex; i < event.results.length; i++) {
        const result = event.results[i]
        if (result.isFinal) {
          finalRef.current += result[0].transcript
        } else {
          interimText += result[0].transcript
        }
      }
      setTranscript(finalRef.current)
      setInterim(interimText)
    }

    recognition.onerror = (event: any) => {
      if (event.error !== 'aborted') {
        setError(ERROR_MESSAGES[event.error] ?? `Error: ${event.error}`)
      }
    }

    recognition.onend = () => {
      clearSilenceTimer()
      setIsListening(false)
      setInterim('')
      const text = finalRef.current.trim()
      if (text) onFinalRef.current?.(text)
    }

    recognitionRef.current = recognition
    return () => {
      clearSilenceTimer()
      recognition.abort()
    }
  }, [isSupported, silenceMs])

  const startListening = useCallback(() => {
    if (!recognitionRef.current || isListening) return
    finalRef.current = ''
    setTranscript('')
    setInterim('')
    setError(null)
    try {
      recognitionRef.current.start()
      setIsListening(true)
    } catch {
      setIsListening(false)
    }
  }, [isListening])

  const stopListening = useCallback(() => {
    recognitionRef.current?.stop()
  }, [])

  return { isSupported, isListening, transcript, interim, error, startListening, stopListening }
}
