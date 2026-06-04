'use client'

import { useEffect } from 'react'
import { AlertCircle } from 'lucide-react'

export default function DashboardError({
  error,
  reset,
}: {
  error: Error & { digest?: string }
  reset: () => void
}) {
  useEffect(() => {
    console.error('Dashboard error caught by boundary:', error?.message || 'Unknown error')
  }, [error])

  return (
    <div className="flex h-[calc(100vh-64px)] flex-col items-center justify-center p-8 text-center w-full">
      <div className="space-y-6 max-w-md w-full bg-zinc-900 border border-zinc-800 rounded-2xl p-8 shadow-xl">
        <div className="w-12 h-12 rounded-full bg-red-500/10 border border-red-500/20 flex items-center justify-center mx-auto">
          <AlertCircle className="w-6 h-6 text-red-500" />
        </div>
        <div>
          <h2 className="text-xl font-bold text-white mb-2">Failed to load content</h2>
          <p className="text-zinc-400 text-sm">We encountered a problem loading this section of the dashboard.</p>
        </div>
        <button
          onClick={() => reset()}
          className="px-4 py-2 bg-zinc-800 hover:bg-zinc-700 text-white rounded-lg transition-colors w-full border border-zinc-700"
        >
          Try again
        </button>
      </div>
    </div>
  )
}
