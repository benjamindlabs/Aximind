'use client'

import * as React from 'react'
import { AlertTriangle, Loader2 } from 'lucide-react'

interface DeleteConfirmationProps {
  isOpen: boolean
  onClose: () => void
  onConfirm: () => void
  isDeleting: boolean
  itemName?: string
}

export function DeleteConfirmation({
  isOpen,
  onClose,
  onConfirm,
  isDeleting,
  itemName = 'this item',
}: DeleteConfirmationProps) {
  if (!isOpen) return null

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-sm">
      <div className="bg-zinc-950 border border-zinc-800 rounded-2xl p-6 w-full max-w-md shadow-2xl animate-in fade-in zoom-in-95 duration-200">
        <div className="flex flex-col items-center text-center space-y-4">
          <div className="w-12 h-12 rounded-full bg-red-500/10 flex items-center justify-center mb-2">
            <AlertTriangle className="w-6 h-6 text-red-500" />
          </div>
          
          <h2 className="text-xl font-semibold text-white">Delete Deal</h2>
          
          <p className="text-sm text-zinc-400 max-w-[280px]">
            Are you sure you want to delete <span className="text-zinc-200 font-medium">{itemName}</span>? 
            This action cannot be undone.
          </p>

          <div className="flex gap-3 w-full pt-4">
            <button
              onClick={onClose}
              disabled={isDeleting}
              className="flex-1 px-4 py-2 bg-zinc-900 hover:bg-zinc-800 text-zinc-300 font-medium rounded-lg transition-colors border border-zinc-800 disabled:opacity-50"
            >
              Cancel
            </button>
            <button
              onClick={onConfirm}
              disabled={isDeleting}
              className="flex-1 px-4 py-2 bg-red-500 hover:bg-red-600 text-white font-medium rounded-lg transition-colors flex items-center justify-center gap-2 disabled:opacity-50"
            >
              {isDeleting ? (
                <>
                  <Loader2 className="w-4 h-4 animate-spin" />
                  <span>Deleting...</span>
                </>
              ) : (
                <span>Delete</span>
              )}
            </button>
          </div>
        </div>
      </div>
    </div>
  )
}
