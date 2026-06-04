'use client'

import * as React from 'react'
import { CheckCircle2, XCircle, X } from 'lucide-react'
import { cn } from '@/lib/utils'

interface Toast {
  id: string
  type: 'success' | 'error'
  message: string
}

interface ToastContextValue {
  showToast: (type: 'success' | 'error', message: string) => void
}

const ToastContext = React.createContext<ToastContextValue | null>(null)

export function useToast() {
  const ctx = React.useContext(ToastContext)
  if (!ctx) throw new Error('useToast must be used within ToastProvider')
  return ctx
}

export function ToastProvider({ children }: { children: React.ReactNode }) {
  const [toasts, setToasts] = React.useState<Toast[]>([])

  const showToast = React.useCallback((type: 'success' | 'error', message: string) => {
    const id = crypto.randomUUID()
    setToasts((prev) => [...prev, { id, type, message }])
    setTimeout(() => {
      setToasts((prev) => prev.filter((t) => t.id !== id))
    }, 3500)
  }, [])

  const dismiss = React.useCallback((id: string) => {
    setToasts((prev) => prev.filter((t) => t.id !== id))
  }, [])

  return (
    <ToastContext.Provider value={{ showToast }}>
      {children}

      {/* Toast container */}
      <div className="fixed bottom-6 right-6 z-[100] flex flex-col gap-3 pointer-events-none">
        {toasts.map((toast) => (
          <div
            key={toast.id}
            className={cn(
              'pointer-events-auto flex items-center gap-3 px-4 py-3 rounded-xl border shadow-2xl backdrop-blur-sm min-w-[320px] max-w-[420px]',
              'animate-[leadsSlideIn_0.3s_ease-out]',
              toast.type === 'success'
                ? 'bg-emerald-950/80 border-emerald-500/30 text-emerald-200'
                : 'bg-red-950/80 border-red-500/30 text-red-200'
            )}
          >
            {toast.type === 'success' ? (
              <CheckCircle2 className="h-5 w-5 text-emerald-400 shrink-0" />
            ) : (
              <XCircle className="h-5 w-5 text-red-400 shrink-0" />
            )}
            <p className="text-sm font-medium flex-1">{toast.message}</p>
            <button
              onClick={() => dismiss(toast.id)}
              className="h-6 w-6 rounded-md flex items-center justify-center hover:bg-white/10 transition-colors shrink-0 cursor-pointer"
            >
              <X className="h-3.5 w-3.5" />
            </button>
          </div>
        ))}
      </div>

      <style jsx global>{`
        @keyframes leadsSlideIn {
          from {
            opacity: 0;
            transform: translateX(100%) scale(0.95);
          }
          to {
            opacity: 1;
            transform: translateX(0) scale(1);
          }
        }
      `}</style>
    </ToastContext.Provider>
  )
}
