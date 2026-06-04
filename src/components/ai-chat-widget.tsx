'use client'

import * as React from 'react'
import { Bot, X, Send, Sparkles, RefreshCcw, Loader2, Mic, MicOff, Volume2, VolumeX } from 'lucide-react'
import ReactMarkdown from 'react-markdown'
import remarkGfm from 'remark-gfm'
import { cn } from '@/lib/utils'

type Message = {
  id: string
  role: 'user' | 'assistant'
  content: string
}

const WELCOME_MESSAGE: Message = {
  id: '1',
  role: 'assistant',
  content: 'Hi there! I am AXIMIND. I can help you find contacts, analyze deals, and manage your pipeline. How can I help you today?',
}

export function AiChatWidget() {
  const [isOpen, setIsOpen] = React.useState(false)
  const [isHovered, setIsHovered] = React.useState(false)
  const [message, setMessage] = React.useState('')
  const [messages, setMessages] = React.useState<Message[]>([WELCOME_MESSAGE])
  const [isLoading, setIsLoading] = React.useState(false)
  const [conversationId, setConversationId] = React.useState<string | null>(null)
  
  // Voice states
  const [isListening, setIsListening] = React.useState(false)
  const [voiceEnabled, setVoiceEnabled] = React.useState(true)
  const [recognition, setRecognition] = React.useState<any>(null)

  // Drag states
  const [position, setPosition] = React.useState({ x: 0, y: 0 })
  const [isDragging, setIsDragging] = React.useState(false)
  const [hasDragged, setHasDragged] = React.useState(false)
  const dragStartRef = React.useRef({ x: 0, y: 0, posX: 0, posY: 0 })
  
  const messagesEndRef = React.useRef<HTMLDivElement>(null)

  const scrollToBottom = () => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' })
  }

  React.useEffect(() => {
    scrollToBottom()
  }, [messages, isLoading])

  // Fetch the latest conversation on mount
  React.useEffect(() => {
    async function initChat() {
      try {
        const res = await fetch('/api/ai/conversations')
        if (res.ok) {
          const convs = await res.json()
          if (convs && convs.length > 0) {
            const latestConv = convs[0]
            setConversationId(latestConv.id)
            
            const msgRes = await fetch(`/api/ai/conversations/${latestConv.id}`)
            if (msgRes.ok) {
              const msgs = await msgRes.json()
              if (msgs && msgs.length > 0) {
                const mappedMsgs: Message[] = msgs.map((m: any) => ({
                  id: m.id,
                  role: m.role,
                  content: m.content
                }))
                setMessages(mappedMsgs)
              }
            }
          }
        }
      } catch (err) {
        console.error('Failed to init chat', err?.message || 'Unknown error')
      }
    }
    initChat()
  }, [])

  // Initialize speech recognition
  React.useEffect(() => {
    if (typeof window !== 'undefined') {
      const SpeechRecognition = (window as any).SpeechRecognition || (window as any).webkitSpeechRecognition
      if (SpeechRecognition) {
        const recognitionInstance = new SpeechRecognition()
        recognitionInstance.continuous = false
        recognitionInstance.interimResults = false
        recognitionInstance.lang = 'en-US'
        setRecognition(recognitionInstance)
      }
    }
  }, [])

  // Clean up speech on unmount
  React.useEffect(() => {
    return () => {
      if (recognition) recognition.abort()
      if (window.speechSynthesis) window.speechSynthesis.cancel()
    }
  }, [recognition])

  // Stop speech when user starts typing or sending a new message
  React.useEffect(() => {
    if (window.speechSynthesis && (message.length > 0 || isLoading)) {
      window.speechSynthesis.cancel()
    }
  }, [message, isLoading])

  // Load voices on mount
  React.useEffect(() => {
    let handleVoicesChanged: (() => void) | null = null;
    if (typeof window !== 'undefined' && window.speechSynthesis) {
      // Preload voices
      window.speechSynthesis.getVoices()
      
      handleVoicesChanged = () => {
        window.speechSynthesis.getVoices()
      }
      // Some browsers need this to load voices async
      window.speechSynthesis.addEventListener('voiceschanged', handleVoicesChanged)
    }

    return () => {
      if (typeof window !== 'undefined' && window.speechSynthesis && handleVoicesChanged) {
        window.speechSynthesis.removeEventListener('voiceschanged', handleVoicesChanged)
      }
    }
  }, [])

  // Speak response function
  const speakResponse = React.useCallback((text: string) => {
    if (!voiceEnabled) return
    
    // Cancel any ongoing speech
    if (window.speechSynthesis.speaking) {
      window.speechSynthesis.cancel()
    }
    
    // Clean the text more thoroughly
    let cleanText = text
      // Remove markdown
      .replace(/\*/g, '')
      .replace(/_/g, '')
      .replace(/\[(.*?)\]\((.*?)\)/g, '$1')
      .replace(/`(.*?)`/g, '$1')
      .replace(/\n/g, ' ')
      .replace(/#{1,6}\s/g, '')
      // Remove extra spaces
      .replace(/\s+/g, ' ')
      // Remove special characters that cause issues
      .replace(/[^\w\s\.,!?]/g, '')
      // Trim and limit length
      .trim()
      .slice(0, 300)
    
    // Don't speak if text is too short or empty
    if (cleanText.length < 3) return
    
    // Small delay to ensure any previous speech is fully cancelled
    setTimeout(() => {
      const utterance = new SpeechSynthesisUtterance(cleanText)
      utterance.rate = 0.9
      utterance.pitch = 1.0
      utterance.lang = 'en-US'
      
      // Use a more reliable voice
      const voices = window.speechSynthesis.getVoices()
      const preferredVoice = voices.find(voice => 
        voice.lang === 'en-US' && voice.name.includes('Google')
      ) || voices.find(voice => voice.lang === 'en-US')
      
      if (preferredVoice) {
        utterance.voice = preferredVoice
      }
      
      // Add error handling
      utterance.onerror = (event: any) => {
        if (event.error === 'interrupted' || event.error === 'canceled') return;
        console.error('Speech error:', event.error || event)
      }
      
      window.speechSynthesis.speak(utterance)
    }, 50)
  }, [voiceEnabled])

  const submitMessage = async (textToSend: string) => {
    if (!textToSend.trim() || isLoading) return

    const userMsg: Message = { id: Date.now().toString(), role: 'user', content: textToSend.trim() }
    setMessages(prev => [...prev, userMsg])
    setMessage('')
    setIsLoading(true)

    try {
      let currentConversationId = conversationId;
      
      if (!currentConversationId) {
        const titleMatch = userMsg.content.substring(0, 30);
        const titleRes = await fetch('/api/ai/conversations', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ title: titleMatch + (userMsg.content.length > 30 ? '...' : '') })
        })
        if (titleRes.ok) {
          const newConv = await titleRes.json()
          currentConversationId = newConv.id
          setConversationId(newConv.id)
        }
      }

      let historyMap = messages
        .filter(msg => msg.id !== '1' && msg.content !== 'Chat history cleared. A new conversation will start with your next message.')
        .map(msg => ({
          role: msg.role,
          content: msg.content
        }));
      
      if (historyMap.length > 0 && historyMap[0].role === 'assistant') {
        historyMap = historyMap.slice(1);
      }
      
      const response = await fetch('/api/ai/chat', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          message: userMsg.content,
          history: historyMap,
          conversationId: currentConversationId
        }),
      })

      const data = await response.json()

      if (!response.ok) {
        throw new Error(data.error || 'Failed to get response')
      }

      const assistantMsg: Message = {
        id: (Date.now() + 1).toString(),
        role: 'assistant',
        content: data.message || 'I processed your request, but received no text response.',
      }

      setMessages(prev => [...prev, assistantMsg])
      speakResponse(assistantMsg.content)
    } catch (error: any) {
      console.error('Chat error:', error?.message || 'Unknown error')
      const errorMsg: Message = {
        id: (Date.now() + 1).toString(),
        role: 'assistant',
        content: 'Sorry, I encountered an error while processing your request. Please try again.',
      }
      setMessages(prev => [...prev, errorMsg])
      speakResponse(errorMsg.content)
    } finally {
      setIsLoading(false)
    }
  }

  const handleSend = (e?: React.FormEvent) => {
    e?.preventDefault()
    submitMessage(message)
  }

  const startListening = React.useCallback(() => {
    if (!recognition) {
      alert('Speech recognition is not supported in your browser.')
      return
    }
    setIsListening(true)
    
    recognition.onresult = (event: any) => {
      const transcript = event.results[0][0].transcript
      setMessage(transcript)
      setIsListening(false)
      setTimeout(() => submitMessage(transcript), 100)
    }
    
    recognition.onerror = (event: any) => {
      console.error('Speech error:', event.error)
      setIsListening(false)
      if (event.error === 'not-allowed') {
        alert('Please allow microphone access.')
      }
    }
    
    recognition.onend = () => setIsListening(false)
    recognition.start()
  }, [recognition])

  const handleReset = () => {
    setConversationId(null)
    setMessages([
      {
        id: Date.now().toString(),
        role: 'assistant',
        content: 'Chat history cleared. A new conversation will start with your next message.',
      },
    ])
  }

  // --- Drag Logic ---
  const handlePointerDown = (e: React.PointerEvent<HTMLElement>) => {
    if ((e.target as HTMLElement).closest('.no-drag')) return
    setIsDragging(true)
    setHasDragged(false)
    dragStartRef.current = {
      x: e.clientX,
      y: e.clientY,
      posX: position.x,
      posY: position.y
    }
    ;(e.currentTarget as HTMLElement).setPointerCapture(e.pointerId)
  }

  const handlePointerMove = (e: React.PointerEvent<HTMLElement>) => {
    if (!isDragging) return
    const dx = e.clientX - dragStartRef.current.x
    const dy = e.clientY - dragStartRef.current.y
    if (Math.abs(dx) > 5 || Math.abs(dy) > 5) setHasDragged(true)
    setPosition({
      x: dragStartRef.current.posX + dx,
      y: dragStartRef.current.posY + dy
    })
  }

  const handlePointerUp = (e: React.PointerEvent<HTMLElement>) => {
    setIsDragging(false)
    ;(e.currentTarget as HTMLElement).releasePointerCapture(e.pointerId)
  }

  const toggleOpen = () => {
    if (!hasDragged) setIsOpen(!isOpen)
  }

  return (
    <div 
      className="fixed bottom-6 right-6 z-50 flex flex-col items-end"
      style={{ transform: `translate(${position.x}px, ${position.y}px)`, touchAction: 'none' }}
    >
      {/* Chat Window */}
      {isOpen && (
        <div className="mb-4 w-[380px] h-[550px] max-h-[calc(100vh-120px)] flex flex-col bg-zinc-950 border border-zinc-800/80 rounded-2xl shadow-2xl shadow-indigo-500/10 overflow-hidden transform transition-all duration-300 ease-out origin-bottom-right">
          
          {/* Header (Draggable) */}
          <div 
            className="h-14 bg-zinc-900 border-b border-zinc-800/60 flex items-center justify-between px-4 shrink-0 cursor-move"
            onPointerDown={handlePointerDown}
            onPointerMove={handlePointerMove}
            onPointerUp={handlePointerUp}
          >
            <div className="flex items-center gap-2.5">
              <div className="flex items-center justify-center h-7 w-7 rounded-md bg-gradient-to-tr from-indigo-600 to-violet-600 shadow-sm shadow-indigo-500/20">
                <Sparkles className="h-3.5 w-3.5 text-white" />
              </div>
              <div>
                <h3 className="text-sm font-semibold text-zinc-100 leading-none select-none">AXIMIND AI</h3>
                <p className="text-[10px] text-zinc-400 mt-0.5 select-none">CRM Intelligence Agent</p>
              </div>
            </div>
            <div className="flex items-center gap-1 no-drag">
              <button 
                onClick={handleReset}
                className="h-8 w-8 rounded-lg flex items-center justify-center text-zinc-400 hover:text-zinc-200 hover:bg-zinc-800/60 transition-colors"
                title="Start New Chat"
              >
                <RefreshCcw className="h-3.5 w-3.5" />
              </button>
              <button 
                onClick={() => setIsOpen(false)}
                className="h-8 w-8 rounded-lg flex items-center justify-center text-zinc-400 hover:text-zinc-200 hover:bg-zinc-800/60 transition-colors"
              >
                <X className="h-4 w-4" />
              </button>
            </div>
          </div>

          {/* Messages Area */}
          <div className="flex-1 overflow-y-auto p-4 space-y-4 scroll-smooth bg-zinc-950/80">
            {messages.map((msg) => (
              <div 
                key={msg.id} 
                className={cn(
                  "flex w-full",
                  msg.role === 'user' ? "justify-end" : "justify-start"
                )}
              >
                <div 
                  className={cn(
                    "max-w-[85%] rounded-2xl px-4 py-2.5 shadow-sm",
                    msg.role === 'user' 
                      ? "bg-indigo-600 text-white rounded-br-sm" 
                      : "bg-zinc-900 border border-zinc-800/60 text-zinc-300 rounded-bl-sm prose prose-sm prose-invert prose-p:leading-relaxed prose-pre:bg-zinc-950 prose-pre:border prose-pre:border-zinc-800 max-w-none"
                  )}
                >
                  {msg.role === 'user' ? (
                    <p className="whitespace-pre-wrap text-[13px] leading-relaxed">{msg.content}</p>
                  ) : (
                    <ReactMarkdown remarkPlugins={[remarkGfm]}>
                      {msg.content}
                    </ReactMarkdown>
                  )}
                </div>
              </div>
            ))}
            
            {isLoading && (
              <div className="flex w-full justify-start">
                <div className="max-w-[85%] rounded-2xl px-4 py-3 bg-zinc-900 border border-zinc-800/60 text-zinc-400 rounded-bl-sm flex items-center gap-2">
                  <Loader2 className="h-3.5 w-3.5 animate-spin text-indigo-400" />
                  <span className="text-xs font-medium animate-pulse">Analyzing CRM data...</span>
                </div>
              </div>
            )}
            <div ref={messagesEndRef} />
          </div>

          {/* Input Area */}
          <div className="p-3 bg-zinc-900 border-t border-zinc-800/60 shrink-0">
            <div className="relative flex items-center bg-zinc-950 border border-zinc-800 rounded-xl focus-within:ring-1 focus-within:ring-indigo-500/50 focus-within:border-indigo-500/50 transition-all shadow-inner">
              <input
                type="text"
                value={message}
                onChange={(e) => setMessage(e.target.value)}
                onKeyDown={(e) => {
                  if (e.key === 'Enter') {
                    e.preventDefault()
                    handleSend(e)
                  }
                }}
                placeholder="Ask AXIMIND anything..."
                className="w-full bg-transparent px-4 py-3.5 text-[13px] text-zinc-100 placeholder:text-zinc-500 focus:outline-none"
                disabled={isLoading}
              />
              
              <div className="flex items-center gap-1 pr-1.5 shrink-0">
                <button
                  type="button"
                  onClick={startListening}
                  disabled={isLoading}
                  className={cn(
                    "h-8 w-8 flex items-center justify-center rounded-lg transition-colors shrink-0",
                    isListening ? "bg-red-500 text-white animate-pulse" : "bg-indigo-500/20 text-indigo-400 hover:bg-indigo-500/30"
                  )}
                  title="Voice Input"
                >
                  {isListening ? <MicOff className="h-4 w-4" /> : <Mic className="h-4 w-4" />}
                </button>
                <button
                  type="button"
                  onClick={() => setVoiceEnabled(!voiceEnabled)}
                  className="h-8 w-8 flex items-center justify-center rounded-lg bg-zinc-800 text-zinc-400 hover:text-zinc-200 hover:bg-zinc-700 shrink-0"
                  title={voiceEnabled ? "Mute Voice" : "Enable Voice"}
                >
                  {voiceEnabled ? <Volume2 className="h-4 w-4" /> : <VolumeX className="h-4 w-4" />}
                </button>
                <button
                  type="button"
                  onClick={handleSend}
                  disabled={!message.trim() || isLoading}
                  className="h-8 w-8 flex items-center justify-center rounded-lg bg-indigo-600 text-white disabled:opacity-50 disabled:bg-zinc-800 disabled:text-zinc-500 hover:bg-indigo-500 transition-colors shrink-0"
                >
                  <Send className="h-3.5 w-3.5 ml-0.5" />
                </button>
              </div>
            </div>
            <div className="mt-2 text-center">
              <span className="text-[9px] text-zinc-500 uppercase tracking-wider font-medium">Powered by Groq</span>
            </div>
          </div>
        </div>
      )}

      {/* FAB (Draggable) */}
      <button
        onClick={toggleOpen}
        onMouseEnter={() => setIsHovered(true)}
        onMouseLeave={() => setIsHovered(false)}
        onPointerDown={handlePointerDown}
        onPointerMove={handlePointerMove}
        onPointerUp={handlePointerUp}
        className={cn(
          "relative flex items-center justify-center h-14 w-14 rounded-full shadow-xl shadow-indigo-500/20 transition-all cursor-move",
          isOpen ? "bg-zinc-800" : "bg-gradient-to-tr from-indigo-600 to-violet-600 hover:shadow-indigo-500/30"
        )}
      >
        {isOpen ? (
          <X className="h-6 w-6 text-zinc-400 pointer-events-none" />
        ) : (
          <>
            <Bot className={cn("h-6 w-6 text-white absolute transition-opacity duration-300 pointer-events-none", isHovered ? "opacity-0" : "opacity-100")} />
            <Sparkles className={cn("h-6 w-6 text-white absolute transition-opacity duration-300 pointer-events-none", isHovered ? "opacity-100" : "opacity-0")} />
            <span className="absolute -inset-1 rounded-full border border-indigo-500 opacity-30 animate-ping pointer-events-none" style={{ animationDuration: '3s' }}></span>
          </>
        )}
      </button>
    </div>
  )
}
