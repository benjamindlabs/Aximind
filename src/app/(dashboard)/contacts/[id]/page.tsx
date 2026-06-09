'use client'

import * as React from 'react'
import { useParams, useRouter } from 'next/navigation'
import {
  ArrowLeft,
  Mail,
  Phone,
  Briefcase,
  Calendar,
  Clock,
  Globe,
  FileText,
  Pencil,
  Check,
  X,
  Loader2,
  Activity,
} from 'lucide-react'
import { Button } from '@/components/ui/button'
import { cn } from '@/lib/utils'
import { createClient } from '@/lib/supabase/client'
import type { Contact } from '../types'
import {
  getInitials,
  getAvatarColor,
  formatDate,
  getStatusClasses,
  getStatusDotColor,
  capitalize,
  getSourceLabel,
  getFullName,
} from '../utils'
import { ToastProvider, useToast } from '../toast'

// ─── Info Item ──────────────────────────────────────────────────────────
function InfoItem({
  icon: Icon,
  label,
  value,
  isLink,
}: {
  icon: React.ComponentType<any>
  label: string
  value: string | null | undefined
  isLink?: boolean
}) {
  return (
    <div className="flex items-start gap-3 py-3">
      <div className="h-9 w-9 rounded-lg bg-zinc-800/60 border border-zinc-700/30 flex items-center justify-center shrink-0 mt-0.5">
        <Icon className="h-4 w-4 text-zinc-500" />
      </div>
      <div className="min-w-0">
        <p className="text-xs text-zinc-500 font-medium uppercase tracking-wider mb-1">{label}</p>
        {value ? (
          isLink ? (
            <a href={`mailto:${value}`} className="text-sm text-indigo-400 hover:text-indigo-300 transition-colors">
              {value}
            </a>
          ) : (
            <p className="text-sm text-zinc-200">{value}</p>
          )
        ) : (
          <p className="text-sm text-zinc-600 italic">Not provided</p>
        )}
      </div>
    </div>
  )
}

// ─── Skeleton ───────────────────────────────────────────────────────────
function DetailSkeleton() {
  return (
    <div className="space-y-6 animate-pulse">
      <div className="h-8 w-24 rounded bg-zinc-800" />
      <div className="flex items-center gap-5">
        <div className="h-20 w-20 rounded-2xl bg-zinc-800" />
        <div className="space-y-2">
          <div className="h-7 w-48 rounded bg-zinc-800" />
          <div className="h-4 w-32 rounded bg-zinc-800" />
        </div>
      </div>
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        <div className="lg:col-span-2 h-64 rounded-xl bg-zinc-900/50" />
        <div className="h-64 rounded-xl bg-zinc-900/50" />
      </div>
    </div>
  )
}

// ─── Main Detail Content ────────────────────────────────────────────────
function ContactDetailContent() {
  const params = useParams()
  const router = useRouter()
  const { showToast } = useToast()

  const [contact, setContact] = React.useState<Contact | null>(null)
  const [loading, setLoading] = React.useState(true)
  const [notFound, setNotFound] = React.useState(false)

  // Notes editing state
  const [editingNotes, setEditingNotes] = React.useState(false)
  const [notesValue, setNotesValue] = React.useState('')
  const [savingNotes, setSavingNotes] = React.useState(false)

  const contactId = params.id as string

  // Fetch contact
  React.useEffect(() => {
    const fetchContact = async () => {
      try {
        const supabase = createClient()
        const { data, error } = await supabase
          .from('contacts')
          .select('*')
          .eq('id', contactId)
          .single()

        if (error || !data) {
          setNotFound(true)
          return
        }

        setContact(data as unknown as Contact)
        setNotesValue((data as any).notes || '')
      } catch (err: any) {
        console.error('Error fetching contact:', err?.message || 'Unknown error')
        setNotFound(true)
      } finally {
        setLoading(false)
      }
    }

    if (contactId) fetchContact()
  }, [contactId])

  // Save notes
  const handleSaveNotes = async () => {
    if (!contact) return
    setSavingNotes(true)

    try {
      const supabase = createClient()
      const { error } = await supabase
        .from('contacts')
        .update({ notes: notesValue.trim() || null } as any)
        .eq('id', contact.id)

      if (error) throw error

      setContact((prev) => prev ? { ...prev, notes: notesValue.trim() || null } : null)
      setEditingNotes(false)
      showToast('success', 'Notes updated successfully.')
    } catch (err: any) {
      console.error('Error saving notes:', err?.message || 'Unknown error')
      showToast('error', err?.message || 'Failed to save notes.')
    } finally {
      setSavingNotes(false)
    }
  }

  // Loading state
  if (loading) {
    return <DetailSkeleton />
  }

  // Not found state
  if (notFound || !contact) {
    return (
      <div className="flex flex-col items-center justify-center min-h-[50vh] text-center space-y-4">
        <div className="bg-zinc-900 border border-zinc-800/80 rounded-2xl p-12 max-w-md shadow-xl">
          <h1 className="text-xl font-bold text-white mb-2">Contact Not Found</h1>
          <p className="text-sm text-zinc-400 mb-6">
            The contact you&apos;re looking for doesn&apos;t exist or has been deleted.
          </p>
          <Button variant="outline" onClick={() => router.push('/contacts')}>
            <ArrowLeft className="h-4 w-4 mr-2" />
            Back to Contacts
          </Button>
        </div>
      </div>
    )
  }

  const fullName = getFullName(contact.first_name, contact.last_name)
  const initials = getInitials(contact.first_name, contact.last_name)
  const avatarColor = getAvatarColor(fullName)

  return (
    <div className="space-y-6 max-w-5xl">
      {/* ─── Back Button ───────────────────────────────────────────── */}
      <button
        onClick={() => router.push('/contacts')}
        className="flex items-center gap-2 text-sm text-zinc-500 hover:text-zinc-300 transition-colors group cursor-pointer"
      >
        <ArrowLeft className="h-4 w-4 group-hover:-translate-x-0.5 transition-transform" />
        Back to Contacts
      </button>

      {/* ─── Contact Header ────────────────────────────────────────── */}
      <div className="bg-zinc-900/50 border border-zinc-800/60 rounded-xl p-6">
        <div className="flex items-center gap-5">
          {/* Large avatar */}
          <div
            className="h-[72px] w-[72px] rounded-2xl flex items-center justify-center text-xl font-bold text-white shadow-lg shrink-0"
            style={{ backgroundColor: avatarColor }}
          >
            {initials}
          </div>

          <div className="min-w-0">
            <div className="flex items-center gap-3 mb-1">
              <h1 className="text-2xl font-bold text-white tracking-tight truncate">
                {fullName}
              </h1>
              <span
                className={cn(
                  'inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-medium border shrink-0',
                  getStatusClasses(contact.status)
                )}
              >
                <span className={cn('h-1.5 w-1.5 rounded-full', getStatusDotColor(contact.status))} />
                {capitalize(contact.status)}
              </span>
            </div>
            {contact.job_title && (
              <p className="text-sm text-zinc-400">{contact.job_title}</p>
            )}
          </div>
        </div>
      </div>

      {/* ─── Two Column Layout ─────────────────────────────────────── */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Left: Contact Information */}
        <div className="lg:col-span-2 bg-zinc-900/50 border border-zinc-800/60 rounded-xl p-6">
          <h2 className="text-base font-semibold text-white mb-4">Contact Information</h2>
          <div className="divide-y divide-zinc-800/40">
            <InfoItem icon={Mail} label="Email" value={contact.email} isLink />
            <InfoItem icon={Phone} label="Phone" value={contact.phone} />
            <InfoItem icon={Briefcase} label="Job Title" value={contact.job_title} />
            <InfoItem icon={Globe} label="Source" value={contact.source ? getSourceLabel(contact.source) : null} />
            <InfoItem icon={Calendar} label="Created" value={formatDate(contact.created_at)} />
            <InfoItem icon={Clock} label="Last Updated" value={formatDate(contact.updated_at)} />
          </div>
        </div>

        {/* Right: Notes */}
        <div className="bg-zinc-900/50 border border-zinc-800/60 rounded-xl p-6">
          <div className="flex items-center justify-between mb-4">
            <h2 className="text-base font-semibold text-white">Notes</h2>
            {!editingNotes && (
              <button
                onClick={() => {
                  setNotesValue(contact.notes || '')
                  setEditingNotes(true)
                }}
                className="h-8 w-8 rounded-lg text-zinc-500 hover:text-indigo-400 hover:bg-indigo-500/10 flex items-center justify-center transition-colors cursor-pointer"
                title="Edit notes"
              >
                <Pencil className="h-3.5 w-3.5" />
              </button>
            )}
          </div>

          {editingNotes ? (
            <div className="space-y-3">
              <textarea
                value={notesValue}
                onChange={(e) => setNotesValue(e.target.value)}
                rows={6}
                autoFocus
                className="flex w-full rounded-lg border border-zinc-800 bg-zinc-900/50 px-3 py-2.5 text-sm text-white placeholder-zinc-500 transition-colors focus-visible:outline-hidden focus-visible:border-indigo-500 focus-visible:ring-1 focus-visible:ring-indigo-500/30 resize-none"
                placeholder="Add notes about this contact..."
              />
              <div className="flex items-center justify-end gap-2">
                <button
                  onClick={() => setEditingNotes(false)}
                  disabled={savingNotes}
                  className="h-8 px-3 rounded-lg text-sm text-zinc-400 hover:text-zinc-200 hover:bg-zinc-800 transition-colors cursor-pointer disabled:opacity-50"
                >
                  Cancel
                </button>
                <Button size="sm" onClick={handleSaveNotes} disabled={savingNotes}>
                  {savingNotes ? (
                    <Loader2 className="h-3.5 w-3.5 mr-1.5 animate-spin" />
                  ) : (
                    <Check className="h-3.5 w-3.5 mr-1.5" />
                  )}
                  Save
                </Button>
              </div>
            </div>
          ) : contact.notes ? (
            <p className="text-sm text-zinc-400 leading-relaxed whitespace-pre-wrap">
              {contact.notes}
            </p>
          ) : (
            <div className="flex flex-col items-center justify-center py-8 text-center">
              <FileText className="h-8 w-8 text-zinc-700 mb-3" />
              <p className="text-sm text-zinc-500">No notes yet.</p>
              <button
                onClick={() => setEditingNotes(true)}
                className="text-xs text-indigo-400 hover:text-indigo-300 mt-1.5 transition-colors cursor-pointer"
              >
                Add a note
              </button>
            </div>
          )}
        </div>
      </div>

      {/* ─── Activity Timeline ─────────────────────────────────────── */}
      <div className="bg-zinc-900/50 border border-zinc-800/60 rounded-xl p-6">
        <h2 className="text-base font-semibold text-white mb-4">Activity Timeline</h2>
        <div className="flex flex-col items-center justify-center py-12 text-center">
          <div className="h-14 w-14 rounded-2xl bg-zinc-800/60 border border-zinc-700/40 flex items-center justify-center mb-4">
            <Activity className="h-7 w-7 text-zinc-600" />
          </div>
          <h3 className="text-sm font-medium text-zinc-400 mb-1">No activities recorded yet</h3>
          <p className="text-xs text-zinc-600 max-w-xs">
            Activity history will appear here as you interact with this contact.
          </p>
        </div>
      </div>
    </div>
  )
}

// ─── Page Export ─────────────────────────────────────────────────────────
export default function ContactDetailPage() {
  return (
    <ToastProvider>
      <ContactDetailContent />
    </ToastProvider>
  )
}
