'use client'

import * as React from 'react'
import { AlertTriangle, X, Loader2 } from 'lucide-react'
import { Button } from '@/components/ui/button'

interface DeleteConfirmationProps {
  company: { id: string; name: string }
  loading: boolean
  onConfirm: () => void
  onCancel: () => void
}

export function DeleteConfirmation({ company, loading, onConfirm, onCancel }: DeleteConfirmationProps) {
  // Close on Escape
  React.useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape' && !loading) onCancel()
    }
    document.addEventListener('keydown', handleKeyDown)
    return () => document.removeEventListener('keydown', handleKeyDown)
  }, [loading, onCancel])

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center">
      {/* Backdrop */}
      <div
        className="absolute inset-0 bg-black/60 backdrop-blur-sm animate-[companyFadeIn_0.15s_ease-out]"
        onClick={loading ? undefined : onCancel}
      />

      {/* Dialog */}
      <div className="relative bg-zinc-900 border border-zinc-800 rounded-2xl shadow-2xl w-full max-w-md mx-4 p-6 animate-[companyScaleIn_0.2s_ease-out]">
        {/* Close button */}
        <button
          onClick={onCancel}
          disabled={loading}
          className="absolute top-4 right-4 h-8 w-8 rounded-lg text-zinc-500 hover:text-zinc-300 hover:bg-zinc-800 flex items-center justify-center transition-colors cursor-pointer disabled:opacity-50"
        >
          <X className="h-4 w-4" />
        </button>

        {/* Warning icon */}
        <div className="flex items-center justify-center h-12 w-12 rounded-full bg-red-500/10 border border-red-500/20 mb-4">
          <AlertTriangle className="h-6 w-6 text-red-400" />
        </div>

        <h3 className="text-lg font-semibold text-white mb-2">Delete Company</h3>
        <p className="text-sm text-zinc-400 mb-6 leading-relaxed">
          Are you sure you want to delete{' '}
          <span className="text-white font-medium">
            {company.name}
          </span>
          ? This action cannot be undone. All contact links may be affected.
        </p>

        <div className="flex items-center justify-end gap-3">
          <Button
            variant="outline"
            onClick={onCancel}
            disabled={loading}
          >
            Cancel
          </Button>
          <Button
            variant="destructive"
            onClick={onConfirm}
            disabled={loading}
          >
            {loading ? (
              <>
                <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                Deleting...
              </>
            ) : (
              'Delete'
            )}
          </Button>
        </div>
      </div>

      <style jsx global>{`
        @keyframes companyFadeIn {
          from { opacity: 0; }
          to { opacity: 1; }
        }
        @keyframes companyScaleIn {
          from { opacity: 0; transform: scale(0.95); }
          to { opacity: 1; transform: scale(1); }
        }
      `}</style>
    </div>
  )
}
