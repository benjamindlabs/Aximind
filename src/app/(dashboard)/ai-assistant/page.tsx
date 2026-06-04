'use client'

import * as React from 'react'
import {
  Bot,
  Send,
  Plus,
  Trash2,
  Loader2,
  AlertCircle,
  X,
  Mic,
  MicOff,
  Volume2,
  VolumeX,
  Menu
} from 'lucide-react'
import ReactMarkdown from 'react-markdown'
import remarkGfm from 'remark-gfm'
import { cn } from '@/lib/utils'
import { createClient } from '@/lib/supabase/client'

interface Conversation {
  id: string
  title: string
  created_at: string
  updated_at: string
}

interface Message {
  id: string
  role: 'user' | 'assistant' | 'system_error'
  content: string
  created_at?: string
}

interface Toast {
  type: 'success' | 'error'
  message: string
}

const WELCOME_MESSAGE: Message = {
  id: 'welcome',
  role: 'assistant',
  content: 'Hi there! I am AXIMIND. I can help you manage contacts, analyze deals, and handle your CRM tasks. How can I help you today?',
  created_at: new Date().toISOString()
}

const SUGGESTIONS = [
  "How many open deals do I have?",
  "Show me my high priority leads",
  "What tasks are due today?",
  "Create a contact named John Smith",
  "Give me a pipeline summary"
]

export default function AIAssistantPage() {
  const [conversations, setConversations] = React.useState<Conversation[]>([])
  const [selectedId, setSelectedId] = React.useState<string | null>(null)
  const [messages, setMessages] = React.useState<Message[]>([WELCOME_MESSAGE])
  const [input, setInput] = React.useState('')
  const [isListLoading, setIsListLoading] = React.useState(true)
  const [isMessagesLoading, setIsMessagesLoading] = React.useState(false)
  const [isResponding, setIsResponding] = React.useState(false)
  const [user, setUser] = React.useState<any>(null)
  const [toast, setToast] = React.useState<Toast | null>(null)
  const [deleteConfirmId, setDeleteConfirmId] = React.useState<string | null>(null)
  const [isDeleting, setIsDeleting] = React.useState(false)
  const [isSidebarOpen, setIsSidebarOpen] = React.useState(false)
  
  // Voice states
  const [isListening, setIsListening] = React.useState(false)
  const [voiceEnabled, setVoiceEnabled] = React.useState(true)
  const [recognition, setRecognition] = React.useState<any>(null)

  const messagesEndRef = React.useRef<HTMLDivElement>(null)
  const textareaRef = React.useRef<HTMLTextAreaElement>(null)

  const scrollToBottom = () => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' })
  }

  React.useEffect(() => {
    if (toast) {
      const timer = setTimeout(() => setToast(null), 4000)
      return () => clearTimeout(timer)
    }
  }, [toast])

  React.useEffect(() => {
    const textarea = textareaRef.current
    if (textarea) {
      textarea.style.height = 'auto'
      textarea.style.height = `${Math.min(textarea.scrollHeight, 120)}px`
    }
  }, [input])

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
      if (recognition) {
        recognition.abort()
      }
      if (window.speechSynthesis) {
        window.speechSynthesis.cancel()
      }
    }
  }, [recognition])

  // Stop speech when user starts typing or sending a new message
  React.useEffect(() => {
    if (window.speechSynthesis && (input.length > 0 || isResponding)) {
      window.speechSynthesis.cancel()
    }
  }, [input, isResponding])

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

  // Start listening function
  const startListening = React.useCallback(() => {
    if (!recognition) {
      alert('Speech recognition is not supported in your browser. Try Chrome or Edge.')
      return
    }
    
    setIsListening(true)
    
    recognition.onresult = (event: any) => {
      const transcript = event.results[0][0].transcript
      setInput(transcript)
      setIsListening(false)
      setTimeout(() => handleSend(transcript), 100)
    }
    
    recognition.onerror = (event: any) => {
      console.error('Speech error:', event.error)
      setIsListening(false)
      if (event.error === 'not-allowed') {
        alert('Please allow microphone access to use voice input.')
      }
    }
    
    recognition.onend = () => {
      setIsListening(false)
    }
    
    recognition.start()
  }, [recognition])

  // Fix handleSend to use the correct dependency
  const handleSend = React.useCallback(async (messageText?: string) => {
    const textToSend = (messageText || input).trim()
    if (!textToSend || isResponding) return

    const userMsg: Message = {
      id: `user-${Date.now()}`,
      role: 'user',
      content: textToSend,
      created_at: new Date().toISOString()
    }

    setMessages(prev => [...prev, userMsg])
    setInput('')
    setIsResponding(true)

    try {
      let activeConversationId = selectedId

      if (!activeConversationId) {
        const title = textToSend.substring(0, 30) + (textToSend.length > 30 ? '...' : '')
        const convRes = await fetch('/api/ai/conversations', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ title })
        })
        if (!convRes.ok) throw new Error('Failed to create conversation')
        const newConv = await convRes.json()
        activeConversationId = newConv.id
        setSelectedId(newConv.id)
      }

      const history = messages
        .filter(m => m.role !== 'system_error' && m.id !== 'welcome')
        .map(m => ({ role: m.role, content: m.content }))

      const chatRes = await fetch('/api/ai/chat', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          message: textToSend,
          conversationId: activeConversationId,
          history
        })
      })

      const chatData = await chatRes.json()

      if (!chatRes.ok) throw new Error(chatData.error || 'AI request failed')

      const assistantMsg: Message = {
        id: `assistant-${Date.now()}`,
        role: 'assistant',
        content: chatData.message || 'Done.',
        created_at: new Date().toISOString()
      }

      setMessages(prev => [...prev, assistantMsg])
      speakResponse(assistantMsg.content)
      await fetchConversations()
    } catch (err: any) {
      console.error('Send error:', err?.message || 'Unknown error')
      setMessages(prev => [...prev, {
        id: `err-${Date.now()}`,
        role: 'system_error',
        content: err.message || 'An error occurred. Please try again.',
        created_at: new Date().toISOString()
      }])
    } finally {
      setIsResponding(false)
    }
  }, [input, isResponding, selectedId, messages, speakResponse])

  const fetchConversations = React.useCallback(async () => {
    try {
      setIsListLoading(true)
      const res = await fetch('/api/ai/conversations')
      if (!res.ok) throw new Error('Failed to load conversations')
      const data = await res.json()
      setConversations(data || [])
    } catch (err: any) {
      console.error(err)
    } finally {
      setIsListLoading(false)
    }
  }, [])

  React.useEffect(() => {
    fetchConversations()
  }, [fetchConversations])

  React.useEffect(() => {
    if (!selectedId) {
      setMessages([WELCOME_MESSAGE])
      return
    }

    const fetchMessages = async () => {
      try {
        setIsMessagesLoading(true)
        const res = await fetch(`/api/ai/conversations/${selectedId}`)
        if (!res.ok) throw new Error('Failed to fetch messages')
        const data = await res.json()
        
        if (data && data.length > 0) {
          const mappedMsgs: Message[] = data.map((m: any) => ({
            id: m.id,
            role: m.role,
            content: m.content,
            created_at: m.created_at
          }))
          setMessages(mappedMsgs)
        } else {
          setMessages([WELCOME_MESSAGE])
        }
        setTimeout(scrollToBottom, 100)
      } catch (err: any) {
        console.error(err)
        setToast({ type: 'error', message: err.message })
      } finally {
        setIsMessagesLoading(false)
      }
    }

    fetchMessages()
  }, [selectedId])

  React.useEffect(() => {
    if (messages.length > 0) scrollToBottom()
  }, [messages, isResponding])

  const handleDeleteConversation = async (id: string) => {
    setIsDeleting(true)
    try {
      const res = await fetch(`/api/ai/conversations/${id}`, { method: 'DELETE' })
      if (!res.ok) throw new Error('Failed to delete')
      if (selectedId === id) {
        setSelectedId(null)
        setMessages([WELCOME_MESSAGE])
      }
      setToast({ type: 'success', message: 'Conversation deleted' })
      await fetchConversations()
    } catch (err: any) {
      setToast({ type: 'error', message: err.message })
    } finally {
      setIsDeleting(false)
      setDeleteConfirmId(null)
    }
  }

  const formatTimeAgo = (dateString: string) => {
    try {
      const date = new Date(dateString)
      const diffMins = Math.floor((Date.now() - date.getTime()) / 60000)
      if (diffMins < 1) return 'Just now'
      if (diffMins < 60) return `${diffMins}m ago`
      if (diffMins < 1440) return `${Math.floor(diffMins / 60)}h ago`
      return `${Math.floor(diffMins / 1440)}d ago`
    } catch { return '' }
  }

  const getInitials = () => {
    if (!user) return 'U'
    const name = user.user_metadata?.full_name || user.email || ''
    return name.slice(0, 2).toUpperCase()
  }

  const handleKeyDown = (e: React.KeyboardEvent<HTMLTextAreaElement>) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault()
      handleSend()
    }
  }

  const handleNewChat = () => {
    setSelectedId(null)
    setMessages([WELCOME_MESSAGE])
    setIsSidebarOpen(false)
  }

  return (
    <div className="flex -m-8 h-screen bg-zinc-950 text-white overflow-hidden relative">
      {/* Mobile Sidebar Overlay */}
      {isSidebarOpen && (
        <div 
          className="fixed inset-0 bg-black/60 z-40 lg:hidden"
          onClick={() => setIsSidebarOpen(false)}
        />
      )}

      {/* Sidebar */}
      <aside className={cn(
        "fixed inset-y-0 left-0 z-50 w-[260px] transform transition-transform duration-300 ease-in-out lg:relative lg:translate-x-0 border-r border-zinc-800 bg-zinc-900 flex flex-col h-full",
        isSidebarOpen ? "translate-x-0" : "-translate-x-full"
      )}>
        <div className="p-4 border-b border-zinc-800 flex items-center justify-between">
          <button
            onClick={handleNewChat}
            className="flex-1 bg-indigo-600 hover:bg-indigo-500 text-white font-medium py-2.5 px-4 rounded-xl flex items-center justify-center gap-2 transition-all cursor-pointer"
          >
            <Plus className="w-4 h-4" />
            New Chat
          </button>
          <button 
            className="lg:hidden ml-2 p-2 text-zinc-400 hover:text-white"
            onClick={() => setIsSidebarOpen(false)}
          >
            <X className="w-5 h-5" />
          </button>
        </div>
        <div className="flex-1 overflow-y-auto py-3 px-2 space-y-1">
          {isListLoading ? (
            <div className="space-y-2">
              {[1, 2, 3, 4, 5].map(i => (
                <div key={i} className="p-3 rounded-xl bg-zinc-800/20 animate-pulse">
                  <div className="h-3.5 bg-zinc-800 rounded w-4/5 mb-2" />
                  <div className="h-2 bg-zinc-800 rounded w-1/4" />
                </div>
              ))}
            </div>
          ) : conversations.length === 0 ? (
            <div className="text-center py-8 text-zinc-500 text-sm">No conversations yet</div>
          ) : (
            conversations.map(conv => (
              <div
                key={conv.id}
                onClick={() => {
                  setSelectedId(conv.id)
                  setIsSidebarOpen(false)
                }}
                className={cn(
                  "group relative flex flex-col p-3 rounded-xl cursor-pointer border-l-2 transition-all",
                  selectedId === conv.id
                    ? "bg-indigo-500/10 border-indigo-500"
                    : "border-transparent hover:bg-zinc-800/40"
                )}
              >
                <div className="pr-6 truncate text-[13px] font-medium">
                  {conv.title || 'New Conversation'}
                </div>
                <span className="text-[10px] text-zinc-500 mt-1">
                  {formatTimeAgo(conv.updated_at || conv.created_at)}
                </span>
                <button
                  onClick={(e) => { e.stopPropagation(); setDeleteConfirmId(conv.id) }}
                  className="absolute right-2 top-1/2 -translate-y-1/2 p-1.5 rounded-lg text-zinc-500 hover:text-red-400 opacity-0 group-hover:opacity-100 transition"
                >
                  <Trash2 className="w-3.5 h-3.5" />
                </button>
              </div>
            ))
          )}
        </div>
      </aside>

      {/* Main Chat */}
      <section className="flex-1 flex flex-col h-full bg-zinc-950 min-w-0 lg:ml-0">
        <header className="h-16 border-b border-zinc-800/80 bg-zinc-900/20 flex items-center justify-between px-4 sm:px-6 shrink-0">
          <div className="flex items-center gap-3">
            <button 
              className="lg:hidden p-2 -ml-2 text-zinc-400 hover:text-white"
              onClick={() => setIsSidebarOpen(true)}
            >
              <Menu className="w-5 h-5" />
            </button>
            <div className="h-9 w-9 rounded-xl bg-gradient-to-tr from-indigo-600 to-violet-600 flex items-center justify-center shrink-0">
              <Bot className="h-5 w-5 text-white" />
            </div>
            <div>
              <h2 className="text-sm font-bold text-white">AXIMIND AI</h2>
              <p className="text-[11px] text-zinc-400 hidden sm:block">Ask anything about your CRM</p>
            </div>
          </div>
        </header>

        <div className="flex-1 overflow-y-auto">
          {isMessagesLoading ? (
            <div className="h-full flex items-center justify-center">
              <Loader2 className="w-8 h-8 text-indigo-500 animate-spin" />
            </div>
          ) : messages.length === 0 || (messages.length === 1 && messages[0].id === 'welcome' && !selectedId) ? (
            <div className="max-w-2xl mx-auto px-6 py-12 h-full flex flex-col items-center justify-center text-center">
              <div className="h-16 w-16 rounded-2xl bg-indigo-500/10 border border-indigo-500/20 flex items-center justify-center mb-6">
                <Bot className="h-8 w-8 text-indigo-400" />
              </div>
              <h1 className="text-2xl font-bold text-white mb-2">Hello! I am AXIMIND AI</h1>
              <p className="text-zinc-400 text-sm mb-10">Ask me about contacts, leads, deals, tasks, or pipeline</p>
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 w-full max-w-xl">
                {SUGGESTIONS.map(suggestion => (
                  <button
                    key={suggestion}
                    onClick={() => handleSend(suggestion)}
                    className="text-left p-3 rounded-xl border border-zinc-800 bg-zinc-900/30 hover:bg-zinc-900/60 hover:border-indigo-500/40 text-sm text-zinc-300 transition"
                  >
                    {suggestion}
                  </button>
                ))}
              </div>
            </div>
          ) : (
            <div className="max-w-3xl mx-auto px-6 py-8 space-y-6">
              {messages.filter(m => m.role !== 'system_error').map(msg => {
                const isUser = msg.role === 'user'
                return (
                  <div key={msg.id} className={`flex gap-3 ${isUser ? 'justify-end' : 'justify-start'}`}>
                    {!isUser && (
                      <div className="h-8 w-8 rounded-full bg-gradient-to-tr from-indigo-600 to-violet-600 flex items-center justify-center shrink-0">
                        <Bot className="h-4 w-4" />
                      </div>
                    )}
                    <div className={`max-w-[80%] rounded-2xl px-4 py-2.5 ${isUser ? 'bg-indigo-600 rounded-tr-none' : 'bg-zinc-800 rounded-tl-none'}`}>
                      {isUser ? (
                        <p className="text-sm text-white whitespace-pre-wrap">{msg.content}</p>
                      ) : (
                        <div className="prose prose-invert prose-sm max-w-none">
                          <ReactMarkdown remarkPlugins={[remarkGfm]}>
                            {msg.content}
                          </ReactMarkdown>
                        </div>
                      )}
                    </div>
                    {isUser && (
                      <div className="h-8 w-8 rounded-full bg-indigo-500/20 border border-indigo-500/30 flex items-center justify-center text-[10px] font-bold text-indigo-300 shrink-0">
                        {getInitials()}
                      </div>
                    )}
                  </div>
                )
              })}
              
              {messages.filter(m => m.role === 'system_error').map(msg => (
                <div key={msg.id} className="flex justify-center">
                  <div className="bg-red-500/10 border border-red-500/20 text-red-400 rounded-xl px-4 py-2 text-xs flex items-center gap-2">
                    <AlertCircle className="w-4 h-4" />
                    {msg.content}
                  </div>
                </div>
              ))}
              
              {isResponding && (
                <div className="flex gap-3">
                  <div className="h-8 w-8 rounded-full bg-gradient-to-tr from-indigo-600 to-violet-600 flex items-center justify-center">
                    <Bot className="h-4 w-4" />
                  </div>
                  <div className="bg-zinc-800 rounded-2xl rounded-tl-none px-4 py-3 flex gap-1">
                    <div className="w-1.5 h-1.5 rounded-full bg-zinc-400 animate-bounce" />
                    <div className="w-1.5 h-1.5 rounded-full bg-zinc-400 animate-bounce [animation-delay:-0.15s]" />
                    <div className="w-1.5 h-1.5 rounded-full bg-zinc-400 animate-bounce [animation-delay:-0.3s]" />
                  </div>
                </div>
              )}
              <div ref={messagesEndRef} />
            </div>
          )}
        </div>

        <div className="p-4 border-t border-zinc-800/80 bg-zinc-900/20 shrink-0">
          <div className="max-w-3xl mx-auto">
            <div className="flex gap-2 bg-zinc-950 border border-zinc-800 rounded-2xl focus-within:ring-1 focus-within:ring-indigo-500/50">
              <textarea
                ref={textareaRef}
                value={input}
                onChange={(e) => setInput(e.target.value.slice(0, 2000))}
                onKeyDown={handleKeyDown}
                placeholder="Ask AXIMIND anything..."
                className="flex-1 bg-transparent px-4 py-3 text-sm text-white placeholder:text-zinc-500 focus:outline-none resize-none max-h-32 min-h-[48px]"
                disabled={isResponding || isMessagesLoading}
                rows={1}
              />
              <div className="flex items-center gap-1.5 m-1.5">
                <button
                  onClick={startListening}
                  className={cn(
                    "h-9 w-9 rounded-xl flex items-center justify-center transition-all cursor-pointer shrink-0",
                    isListening ? "bg-red-500 text-white animate-pulse" : "bg-indigo-500/20 text-indigo-400 hover:bg-indigo-500/30"
                  )}
                  title="Voice Input"
                >
                  {isListening ? <MicOff className="h-4 w-4" /> : <Mic className="h-4 w-4" />}
                </button>
                <button
                  onClick={() => setVoiceEnabled(!voiceEnabled)}
                  className={cn(
                    "h-9 w-9 rounded-xl flex items-center justify-center transition-all cursor-pointer bg-zinc-800 text-zinc-400 hover:text-zinc-200 hover:bg-zinc-700 shrink-0"
                  )}
                  title={voiceEnabled ? "Mute Voice Response" : "Enable Voice Response"}
                >
                  {voiceEnabled ? <Volume2 className="h-4 w-4" /> : <VolumeX className="h-4 w-4" />}
                </button>
                <button
                  onClick={() => handleSend()}
                  disabled={!input.trim() || isResponding || isMessagesLoading}
                  className="h-9 w-9 rounded-xl bg-indigo-600 text-white disabled:opacity-30 hover:bg-indigo-500 transition-all cursor-pointer flex items-center justify-center shrink-0"
                >
                  <Send className="h-4 w-4" />
                </button>
              </div>
            </div>
            <div className="flex justify-between px-2 mt-2 text-[10px] text-zinc-500">
              <span>Powered by Groq</span>
              <span>{input.length} / 2000</span>
            </div>
          </div>
        </div>
      </section>

      {/* Delete Modal */}
      {deleteConfirmId && (
        <div className="fixed inset-0 flex items-center justify-center bg-black/60 z-50">
          <div className="bg-zinc-900 border border-zinc-800 rounded-2xl p-6 max-w-md w-full mx-4">
            <div className="flex items-center gap-2 text-red-400 mb-3">
              <AlertCircle className="w-5 h-5" />
              <h3 className="text-lg font-bold text-white">Delete Conversation</h3>
            </div>
            <p className="text-sm text-zinc-400 mb-6">This action cannot be undone. All messages will be permanently deleted.</p>
            <div className="flex justify-end gap-3">
              <button onClick={() => setDeleteConfirmId(null)} className="px-4 py-2 rounded-lg text-sm text-zinc-400 hover:text-white hover:bg-zinc-800 transition">
                Cancel
              </button>
              <button onClick={() => handleDeleteConversation(deleteConfirmId)} className="px-4 py-2 rounded-lg bg-red-600 text-sm text-white hover:bg-red-500 transition">
                {isDeleting ? <Loader2 className="w-4 h-4 animate-spin" /> : 'Delete'}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Toast */}
      {toast && (
        <div className="fixed bottom-6 left-1/2 -translate-x-1/2 bg-zinc-900 border border-zinc-800 rounded-xl px-4 py-3 flex items-center gap-3 z-50 shadow-xl">
          <div className={`w-2 h-2 rounded-full ${toast.type === 'success' ? 'bg-green-500' : 'bg-red-500'}`} />
          <span className="text-sm text-zinc-200">{toast.message}</span>
          <button onClick={() => setToast(null)} className="text-zinc-500 hover:text-zinc-300">
            <X className="w-4 h-4" />
          </button>
        </div>
      )}
    </div>
  )
}