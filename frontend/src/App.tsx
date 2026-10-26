import { useEffect, useRef, useState } from 'react'
import './App.css'
import MicButton from './components/MicButton'
import VoiceVisualizer, { type VoiceStatus } from './components/VoiceVisualizer'
import AudioControlBar from './components/AudioControlBar'
import { useTextToSpeech } from './hooks/useTextToSpeech'
import { useSpeechRecognition } from './hooks/useSpeechRecognition'
import ConversationSidebar from './components/ConversationSidebar'
import { chatApi } from './services/chatApi'
import type { ChatMessage, Conversation } from './types/chat'

const ACTIVE_KEY = 'activeConversationId'

function readActiveId(): string | null {
  try {
    return localStorage.getItem(ACTIVE_KEY)
  } catch {
    return null
  }
}

function writeActiveId(id: string | null) {
  try {
    if (id) localStorage.setItem(ACTIVE_KEY, id)
    else localStorage.removeItem(ACTIVE_KEY)
  } catch {
    // storage unavailable
  }
}

const THEME_KEY = 'appTheme'

function readTheme(): 'light' | 'dark' {
  try {
    const saved = localStorage.getItem(THEME_KEY)
    if (saved === 'dark' || saved === 'light') return saved
    return window.matchMedia?.('(prefers-color-scheme: dark)').matches ? 'dark' : 'light'
  } catch {
    return 'light'
  }
}

function App() {
  const [messages, setMessages] = useState<ChatMessage[]>([])
  const [conversations, setConversations] = useState<Conversation[]>([])
  const [activeId, setActiveId] = useState<string | null>(readActiveId)
  const [theme, setTheme] = useState<'light' | 'dark'>(readTheme)
  const [sidebarOpen, setSidebarOpen] = useState(true)
  const [input, setInput] = useState('')
  const [loading, setLoading] = useState(false)
  const [autoSpeak, setAutoSpeak] = useState(true)
  const messagesEndRef = useRef<HTMLDivElement>(null)

  const tts = useTextToSpeech()

  const refreshConversations = () =>
    chatApi.listConversations().then(setConversations).catch(() => setConversations([]))

  useEffect(() => {
    refreshConversations()
  }, [])

  const selectConversation = async (id: string | null) => {
    tts.stop()
    setActiveId(id)
    writeActiveId(id)
    if (!id) {
      setMessages([])
      return
    }
    try {
      setMessages(await chatApi.getMessages(id))
    } catch {
      setActiveId(null)
      writeActiveId(null)
      setMessages([])
    }
  }

  useEffect(() => {
    if (activeId) selectConversation(activeId)
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [])

  const deleteConversation = async (id: string) => {
    await chatApi.deleteConversation(id).catch(() => undefined)
    if (id === activeId) selectConversation(null)
    refreshConversations()
  }

  const sendMessage = async (text: string) => {
    const trimmed = text.trim()
    if (!trimmed || loading) return

    setMessages((prev) => [...prev, { role: 'user', content: trimmed }])
    setInput('')
    setLoading(true)

    try {
      const data = await chatApi.sendMessage({
        message: trimmed,
        conversation_id: activeId ?? undefined,
        voice_mode: autoSpeak,
      })

      setMessages((prev) => [
        ...prev,
        { role: 'assistant', content: data.reply, correction: data.correction ?? undefined },
      ])
      if (autoSpeak) tts.speak(data.reply)
      if (data.conversation_id !== activeId) {
        setActiveId(data.conversation_id)
        writeActiveId(data.conversation_id)
      }
      refreshConversations()
    } catch (error) {
      const msg = error instanceof Error ? error.message : 'Unknown error'
      setMessages((prev) => [...prev, { role: 'assistant', content: `Sorry, there was an error: ${msg}` }])
    } finally {
      setLoading(false)
    }
  }

  const stt = useSpeechRecognition({
    onFinal: (text) => sendMessage(text),
    silenceMs: 3000,
  })

  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' })
  }, [messages, loading])

  const handleMicClick = () => {
    if (stt.isListening) {
      stt.stopListening()
    } else {
      tts.stop()
      stt.startListening()
    }
  }

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault()
      sendMessage(input)
    }
  }

  const status: VoiceStatus = stt.isListening
    ? 'listening'
    : loading
      ? 'thinking'
      : tts.isSpeaking
        ? 'speaking'
        : 'idle'

  const liveText = stt.isListening ? `${stt.transcript} ${stt.interim}`.trim() : ''

  const toggleTheme = () => {
    setTheme((prev) => {
      const next = prev === 'light' ? 'dark' : 'light'
      try {
        localStorage.setItem(THEME_KEY, next)
      } catch {
        // ignore
      }
      return next
    })
  }

  return (
    <div className={`app-container ${theme}`}>
      <div className="header">
        <button
          type="button"
          className="header-toggle-btn"
          onClick={() => setSidebarOpen((prev) => !prev)}
          title={sidebarOpen ? 'Tutup sidebar' : 'Buka riwayat percakapan'}
          aria-label="Toggle sidebar"
        >
          {sidebarOpen ? '◀ Tutup' : '☰ Riwayat'}
        </button>
        <div className="header-titles">
          <h1>🎓 English Conversation Partner</h1>
          <p>Learn English by chatting with AI</p>
        </div>
        <button
          type="button"
          className="theme-toggle-btn"
          onClick={toggleTheme}
          title={theme === 'dark' ? 'Ganti ke Mode Terang' : 'Ganti ke Mode Malam'}
          aria-label="Toggle theme"
        >
          {theme === 'dark' ? '☀️ Terang' : '🌙 Gelap'}
        </button>
      </div>

      <div className="main-layout">
        <ConversationSidebar
          conversations={conversations}
          activeId={activeId}
          isOpen={sidebarOpen}
          onSelect={selectConversation}
          onNew={() => selectConversation(null)}
          onDelete={deleteConversation}
          onToggle={() => setSidebarOpen((prev) => !prev)}
        />

      <div className="chat-container">
        <div className="messages">
          {messages.length === 0 ? (
            <div className="welcome-message">
              <p>👋 Hello! Start a conversation in English.</p>
              <p>Ketik pesan atau tekan 🎤 untuk berbicara.</p>
            </div>
          ) : (
            messages.map((msg, idx) => (
              <div key={idx} className={`message ${msg.role}`}>
                <div className="message-label">{msg.role === 'user' ? 'You' : 'AI'}</div>
                <div className="message-content">
                  {msg.content}
                  {msg.role === 'assistant' && tts.isSupported && (
                    <button
                      type="button"
                      className="replay-button"
                      onClick={() => tts.speak(msg.content)}
                      title="Putar ulang"
                    >
                      🔊
                    </button>
                  )}
                </div>
                {msg.correction?.corrected && (
                  <div className="correction">
                    {msg.correction.original && (
                      <div>
                        <s>{msg.correction.original}</s>
                      </div>
                    )}
                    <div>✅ {msg.correction.corrected}</div>
                    {msg.correction.explanation && <div className="explanation">{msg.correction.explanation}</div>}
                  </div>
                )}
              </div>
            ))
          )}
          {loading && (
            <div className="message assistant">
              <div className="message-label">AI</div>
              <div className="message-content">
                <span className="typing-indicator">
                  <span></span>
                  <span></span>
                  <span></span>
                </span>
              </div>
            </div>
          )}
          <div ref={messagesEndRef} />
        </div>

        <VoiceVisualizer status={status} />
        {liveText && <div className="live-transcript">{liveText}</div>}
        {stt.error && <div className="voice-error">{stt.error}</div>}
        {!stt.isSupported && (
          <div className="voice-error">
            Browser ini tidak mendukung pengenalan suara. Gunakan Chrome atau Edge, atau ketik pesan.
          </div>
        )}

        <AudioControlBar
          autoSpeak={autoSpeak}
          onAutoSpeakChange={(v) => {
            setAutoSpeak(v)
            if (!v) tts.stop()
          }}
          rate={tts.rate}
          onRateChange={tts.setRate}
          voices={tts.voices}
          selectedVoiceURI={tts.selectedVoiceURI}
          onVoiceChange={tts.setVoiceURI}
          onTestVoice={() =>
            tts.speak("Hello! I'm your English conversation partner. How are you doing today?")
          }
        />

        <div className="input-area">
          {stt.isSupported && (
            <MicButton isListening={stt.isListening} disabled={loading} onClick={handleMicClick} />
          )}
          <textarea
            value={input}
            onChange={(e) => setInput(e.target.value)}
            onKeyDown={handleKeyDown}
            placeholder="Type your message in English... (Enter to send, Shift+Enter for new line)"
            disabled={loading}
          />
          <button onClick={() => sendMessage(input)}>
            {loading ? 'Sending...' : 'Send'}
          </button>
        </div>
      </div>
      </div>
    </div>
  )
}

export default App
