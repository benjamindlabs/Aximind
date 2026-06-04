'use client'

import { useEffect } from 'react'

export default function Error({
  error,
  reset,
}: {
  error: Error & { digest?: string }
  reset: () => void
}) {
  useEffect(() => {
    console.error('Global error caught by boundary:', error?.message || 'Unknown error')
  }, [error])

  return (
    <div className="flex min-h-screen flex-col items-center justify-center p-8 text-center bg-zinc-950 text-white">
      <div className="space-y-4 max-w-md w-full bg-zinc-900 border border-zinc-800 rounded-2xl p-8">
        <h2 className="text-2xl font-bold text-red-500">Something went wrong!</h2>
        <p className="text-zinc-400">An unexpected error occurred in the application.</p>
        <button
          onClick={() => reset()}
          className="mt-4 px-4 py-2 bg-indigo-600 hover:bg-indigo-500 text-white rounded-lg transition-colors w-full"
        >
          Try again
        </button>
      </div>
    </div>
  )
}
