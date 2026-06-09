'use client'

import * as React from 'react'
import { useParams, useRouter } from 'next/navigation'
import Link from 'next/link'
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
  Loader2,
  Activity,
  MapPin,
  DollarSign,
  Building2,
  Users,
} from 'lucide-react'
import { Button } from '@/components/ui/button'
import { cn } from '@/lib/utils'
import { createClient } from '@/lib/supabase/client'
import type { Company } from '../types'
import {
  getCompanyInitial,
  getAvatarColor,
  formatDate,
  getSizeClasses,
  getLocation,
  ensureProtocol,
  formatWebsite,
  formatRevenue,
} from '../utils'
import { ToastProvider, useToast } from '../toast'

// ─── Info Item ──────────────────────────────────────────────────────────
function InfoItem({
  icon: Icon,
  label,
  value,
  isEmail,
  isWebsite,
}: {
  icon: React.ComponentType<any>
  label: string
  value: string | null | undefined
  isEmail?: boolean
  isWebsite?: boolean
}) {
  return (
    <div className="flex items-start gap-3 py-3">
      <div className="h-9 w-9 rounded-lg bg-zinc-800/60 border border-zinc-700/30 flex items-center justify-center shrink-0 mt-0.5">
        <Icon className="h-4 w-4 text-zinc-500" />
      </div>
      <div className="min-w-0">
        <p className="text-xs text-zinc-500 font-medium uppercase tracking-wider mb-1">{label}</p>
        {value ? (
          isEmail ? (
            <a href={`mailto:${value}`} className="text-sm text-indigo-400 hover:text-indigo-300 transition-colors truncate block">
              {value}
            </a>
          ) : isWebsite ? (
            <a
              href={ensureProtocol(value)}
              target="_blank"
              rel="noopener noreferrer"
              className="text-sm text-indigo-400 hover:text-indigo-300 transition-colors truncate block inline-flex items-center gap-1"
            >
              {formatWebsite(value)}
            </a>
          ) : (
            <p className="text-sm text-zinc-200">{value}</p>
          )
        ) : (
          <p className="text-sm text-zinc-650 italic">Not provided</p>
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
        <div className="lg:col-span-2 h-96 rounded-xl bg-zinc-900/50" />
        <div className="h-96 rounded-xl bg-zinc-900/50" />
      </div>
    </div>
  )
}

// ─── Main Detail Content ────────────────────────────────────────────────
function CompanyDetailContent() {
  const params = useParams()
  const router = useRouter()
  const { showToast } = useToast()

  const [company, setCompany] = React.useState<Company | null>(null)
  const [contacts, setContacts] = React.useState<any[]>([])
  const [loading, setLoading] = React.useState(true)
  const [notFound, setNotFound] = React.useState(false)

  // Notes editing state
  const [editingNotes, setEditingNotes] = React.useState(false)
  const [notesValue, setNotesValue] = React.useState('')
  const [savingNotes, setSavingNotes] = React.useState(false)

  const companyId = params.id as string

  // Fetch company & related contacts
  React.useEffect(() => {
    const fetchData = async () => {
      try {
        const supabase = createClient()
        
        // 1. Fetch Company
        const { data: companyData, error: companyError } = await supabase
          .from('companies')
          .select('*')
          .eq('id', companyId)
          .single()

        if (companyError || !companyData) {
          setNotFound(true)
          return
        }

        setCompany(companyData as unknown as Company)
        setNotesValue((companyData as any).notes || '')

        // 2. Fetch Related Contacts
        const { data: contactsData, error: contactsError } = await supabase
          .from('contacts')
          .select('*')
          .eq('company_id', companyId)

        if (!contactsError && contactsData) {
          setContacts(contactsData)
        }
      } catch (err: any) {
        console.error('Error fetching company details:', err?.message || 'Unknown error')
        setNotFound(true)
      } finally {
        setLoading(false)
      }
    }

    if (companyId) fetchData()
  }, [companyId])

  // Save notes
  const handleSaveNotes = async () => {
    if (!company) return
    setSavingNotes(true)

    try {
      const supabase = createClient()
      const { error } = await supabase
        .from('companies')
        .update({ notes: notesValue.trim() || null } as any)
        .eq('id', company.id)

      if (error) throw error

      setCompany((prev) => prev ? { ...prev, notes: notesValue.trim() || null } : null)
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
  if (notFound || !company) {
    return (
      <div className="flex flex-col items-center justify-center min-h-[50vh] text-center space-y-4">
        <div className="bg-zinc-900 border border-zinc-800/80 rounded-2xl p-12 max-w-md shadow-xl">
          <h1 className="text-xl font-bold text-white mb-2">Company Not Found</h1>
          <p className="text-sm text-zinc-400 mb-6">
            The company you&apos;re looking for doesn&apos;t exist or has been deleted.
          </p>
          <Button variant="outline" onClick={() => router.push('/companies')}>
            <ArrowLeft className="h-4 w-4 mr-2" />
            Back to Companies
          </Button>
        </div>
      </div>
    )
  }

  const initial = getCompanyInitial(company.name)
  const avatarColor = getAvatarColor(company.name)

  return (
    <div className="space-y-6 max-w-5xl">
      {/* ─── Back Button ───────────────────────────────────────────── */}
      <button
        onClick={() => router.push('/companies')}
        className="flex items-center gap-2 text-sm text-zinc-500 hover:text-zinc-300 transition-colors group cursor-pointer"
      >
        <ArrowLeft className="h-4 w-4 group-hover:-translate-x-0.5 transition-transform" />
        Back to Companies
      </button>

      {/* ─── Company Header ────────────────────────────────────────── */}
      <div className="bg-zinc-900/50 border border-zinc-800/60 rounded-xl p-6">
        <div className="flex items-center gap-5">
          {/* Large avatar */}
          <div
            className="h-[72px] w-[72px] rounded-2xl flex items-center justify-center text-xl font-bold text-white shadow-lg shrink-0"
            style={{ backgroundColor: avatarColor }}
          >
            {initial}
          </div>

          <div className="min-w-0">
            <div className="flex items-center gap-3 mb-1">
              <h1 className="text-2xl font-bold text-white tracking-tight truncate">
                {company.name}
              </h1>
              {company.size && (
                <span
                  className={cn(
                    'inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium border shrink-0',
                    getSizeClasses(company.size)
                  )}
                >
                  {company.size} employees
                </span>
              )}
            </div>
            {company.industry && (
              <p className="text-sm text-zinc-400">{company.industry}</p>
            )}
          </div>
        </div>
      </div>

      {/* ─── Two Column Layout ─────────────────────────────────────── */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Left: Company Information */}
        <div className="lg:col-span-2 bg-zinc-900/50 border border-zinc-800/60 rounded-xl p-6">
          <h2 className="text-base font-semibold text-white mb-4">Company Details</h2>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-x-6 divide-y md:divide-y-0 divide-zinc-800/40">
            <div className="divide-y divide-zinc-800/40">
              <InfoItem icon={Globe} label="Website" value={company.website} isWebsite />
              <InfoItem icon={Phone} label="Phone" value={company.phone} />
              <InfoItem icon={Mail} label="Email" value={company.email} isEmail />
              <InfoItem icon={Briefcase} label="Industry" value={company.industry} />
            </div>
            <div className="divide-y divide-zinc-800/40">
              <InfoItem icon={MapPin} label="Address" value={company.address} />
              <InfoItem icon={MapPin} label="Location" value={getLocation(company.city, company.country)} />
              <InfoItem icon={DollarSign} label="Annual Revenue" value={formatRevenue(company.annual_revenue)} />
              <InfoItem icon={Calendar} label="Created" value={formatDate(company.created_at)} />
            </div>
          </div>
        </div>

        {/* Right: Notes */}
        <div className="bg-zinc-900/50 border border-zinc-800/60 rounded-xl p-6 flex flex-col">
          <div className="flex items-center justify-between mb-4">
            <h2 className="text-base font-semibold text-white">Notes</h2>
            {!editingNotes && (
              <button
                onClick={() => {
                  setNotesValue(company.notes || '')
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
            <div className="space-y-3 flex-1 flex flex-col">
              <textarea
                value={notesValue}
                onChange={(e) => setNotesValue(e.target.value)}
                rows={6}
                autoFocus
                className="flex w-full rounded-lg border border-zinc-800 bg-zinc-900/50 px-3 py-2.5 text-sm text-white placeholder-zinc-500 transition-colors focus-visible:outline-hidden focus-visible:border-indigo-500 focus-visible:ring-1 focus-visible:ring-indigo-500/30 resize-none flex-1"
                placeholder="Add notes about this company..."
              />
              <div className="flex items-center justify-end gap-2 shrink-0">
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
          ) : company.notes ? (
            <p className="text-sm text-zinc-400 leading-relaxed whitespace-pre-wrap flex-1">
              {company.notes}
            </p>
          ) : (
            <div className="flex flex-col items-center justify-center py-12 text-center flex-1">
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

      {/* ─── Associated Contacts ────────────────────────────────────── */}
      <div className="bg-zinc-900/50 border border-zinc-800/60 rounded-xl p-6">
        <div className="flex items-center justify-between mb-4">
          <h2 className="text-base font-semibold text-white">Associated Contacts</h2>
          <span className="inline-flex items-center justify-center h-5 px-2 rounded-full bg-zinc-800 text-zinc-400 text-xs font-semibold">
            {contacts.length}
          </span>
        </div>

        {contacts.length === 0 ? (
          <div className="flex flex-col items-center justify-center py-8 text-center border border-dashed border-zinc-800/60 rounded-lg">
            <Users className="h-7 w-7 text-zinc-750 mb-2" />
            <p className="text-sm text-zinc-500">No contacts associated with this company yet.</p>
          </div>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            {contacts.map((contact) => {
              const fullName = [contact.first_name, contact.last_name].filter(Boolean).join(' ')
              const cInitial = contact.first_name?.[0]?.toUpperCase() || '?'
              const cColor = getAvatarColor(fullName)

              return (
                <div
                  key={contact.id}
                  className="flex items-center gap-3 p-3.5 bg-zinc-950/40 border border-zinc-805/30 border-zinc-800/40 rounded-xl hover:bg-zinc-900/50 transition-colors group"
                >
                  <div
                    className="h-9 w-9 rounded-full flex items-center justify-center text-xs font-bold text-white shrink-0 shadow-md"
                    style={{ backgroundColor: cColor }}
                  >
                    {cInitial}
                  </div>
                  <div className="min-w-0 flex-1">
                    <Link
                      href={`/contacts/${contact.id}`}
                      className="text-sm font-medium text-zinc-200 hover:text-indigo-400 transition-colors block truncate"
                    >
                      {fullName}
                    </Link>
                    {contact.job_title && (
                      <p className="text-xs text-zinc-500 truncate">{contact.job_title}</p>
                    )}
                  </div>
                  <Link
                    href={`/contacts/${contact.id}`}
                    className="h-7 px-2.5 rounded-lg text-xs font-medium bg-zinc-900 text-zinc-400 border border-zinc-800 hover:text-zinc-250 hover:bg-zinc-850 flex items-center justify-center transition-colors shrink-0"
                  >
                    View
                  </Link>
                </div>
              )
            })}
          </div>
        )}
      </div>

      {/* ─── Activity Timeline ─────────────────────────────────────── */}
      <div className="bg-zinc-900/50 border border-zinc-800/60 rounded-xl p-6">
        <h2 className="text-base font-semibold text-white mb-4">Activity Timeline</h2>
        <div className="flex flex-col items-center justify-center py-12 text-center">
          <div className="h-14 w-14 rounded-2xl bg-zinc-800/60 border border-zinc-700/40 flex items-center justify-center mb-4">
            <Activity className="h-7 w-7 text-zinc-650" />
          </div>
          <h3 className="text-sm font-medium text-zinc-455 mb-1">No activities yet</h3>
          <p className="text-xs text-zinc-650 max-w-xs">
            Activities related to this company will appear here.
          </p>
        </div>
      </div>
    </div>
  )
}

// ─── Page Export ─────────────────────────────────────────────────────────
export default function CompanyDetailPage() {
  return (
    <ToastProvider>
      <CompanyDetailContent />
    </ToastProvider>
  )
}
