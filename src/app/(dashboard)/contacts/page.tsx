'use client'

import * as React from 'react'
import Link from 'next/link'
import {
  Plus,
  Search,
  Users,
  Pencil,
  Trash2,
  ChevronDown,
  Mail,
  Phone,
} from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { cn } from '@/lib/utils'
import { createClient } from '@/lib/supabase/client'
import type { Contact, ContactStatus } from './types'
import {
  getInitials,
  getAvatarColor,
  formatDate,
  getStatusClasses,
  getStatusDotColor,
  capitalize,
  getSourceLabel,
  getFullName,
} from './utils'
import { ToastProvider, useToast } from './toast'
import { ContactFormModal } from './contact-form-modal'
import { DeleteConfirmation } from './delete-confirmation'

// ─── Status filter options ──────────────────────────────────────────────
const STATUS_FILTERS: { value: string; label: string }[] = [
  { value: 'all', label: 'All Statuses' },
  { value: 'active', label: 'Active' },
  { value: 'inactive', label: 'Inactive' },
  { value: 'blocked', label: 'Blocked' },
]

// ─── Skeleton Row ───────────────────────────────────────────────────────
function SkeletonRow() {
  return (
    <tr className="border-b border-zinc-800/40">
      <td className="px-4 py-3.5"><div className="h-4 w-4 rounded bg-zinc-800 animate-pulse" /></td>
      <td className="px-4 py-3.5">
        <div className="flex items-center gap-3">
          <div className="h-9 w-9 rounded-full bg-zinc-800 animate-pulse" />
          <div className="h-4 w-28 rounded bg-zinc-800 animate-pulse" />
        </div>
      </td>
      <td className="px-4 py-3.5"><div className="h-4 w-36 rounded bg-zinc-800 animate-pulse" /></td>
      <td className="px-4 py-3.5"><div className="h-4 w-28 rounded bg-zinc-800 animate-pulse" /></td>
      <td className="px-4 py-3.5"><div className="h-4 w-24 rounded bg-zinc-800 animate-pulse" /></td>
      <td className="px-4 py-3.5"><div className="h-5 w-16 rounded-full bg-zinc-800 animate-pulse" /></td>
      <td className="px-4 py-3.5"><div className="h-4 w-16 rounded bg-zinc-800 animate-pulse" /></td>
      <td className="px-4 py-3.5"><div className="h-4 w-20 rounded bg-zinc-800 animate-pulse" /></td>
      <td className="px-4 py-3.5"><div className="h-4 w-16 rounded bg-zinc-800 animate-pulse" /></td>
    </tr>
  )
}

// ─── Main Content Component ─────────────────────────────────────────────
function ContactsContent() {
  const { showToast } = useToast()

  // State
  const [contacts, setContacts] = React.useState<Contact[]>([])
  const [loading, setLoading] = React.useState(true)
  const [searchQuery, setSearchQuery] = React.useState('')
  const [statusFilter, setStatusFilter] = React.useState('all')
  const [showAddModal, setShowAddModal] = React.useState(false)
  const [editContact, setEditContact] = React.useState<Contact | null>(null)
  const [deleteContact, setDeleteContact] = React.useState<Contact | null>(null)
  const [deleteLoading, setDeleteLoading] = React.useState(false)
  const [showStatusDropdown, setShowStatusDropdown] = React.useState(false)

  const statusDropdownRef = React.useRef<HTMLDivElement>(null)

  // Close dropdown on click outside
  React.useEffect(() => {
    const handleClick = (e: MouseEvent) => {
      if (statusDropdownRef.current && !statusDropdownRef.current.contains(e.target as Node)) {
        setShowStatusDropdown(false)
      }
    }
    document.addEventListener('mousedown', handleClick)
    return () => document.removeEventListener('mousedown', handleClick)
  }, [])

  // Fetch contacts
  const fetchContacts = React.useCallback(async () => {
    try {
      const supabase = createClient()
      const { data, error } = await supabase
        .from('contacts')
        .select('*')
        .order('created_at', { ascending: false })

      if (error) throw error
      setContacts((data as unknown as Contact[]) || [])
    } catch (err: any) {
      console.error('Error fetching contacts:', err?.message || 'Unknown error')
      showToast('error', 'Failed to load contacts.')
    } finally {
      setLoading(false)
    }
  }, [showToast])

  React.useEffect(() => {
    fetchContacts()
  }, [fetchContacts])

  // Filter contacts
  const filteredContacts = React.useMemo(() => {
    let result = contacts

    // Search filter
    if (searchQuery.trim()) {
      const q = searchQuery.toLowerCase()
      result = result.filter((c) => {
        const fullName = getFullName(c.first_name, c.last_name).toLowerCase()
        const email = (c.email || '').toLowerCase()
        return fullName.includes(q) || email.includes(q)
      })
    }

    // Status filter
    if (statusFilter !== 'all') {
      result = result.filter((c) => c.status === statusFilter)
    }

    return result
  }, [contacts, searchQuery, statusFilter])

  // Delete handler
  const handleDelete = async () => {
    if (!deleteContact) return
    setDeleteLoading(true)
    try {
      const supabase = createClient()
      const { error } = await supabase
        .from('contacts')
        .delete()
        .eq('id', deleteContact.id)

      if (error) throw error

      setDeleteContact(null)
      showToast('success', 'Contact deleted successfully.')
      fetchContacts()
    } catch (err: any) {
      console.error('Error deleting contact:', err?.message || 'Unknown error')
      showToast('error', err?.message || 'Failed to delete contact.')
    } finally {
      setDeleteLoading(false)
    }
  }

  // Modal success handlers
  const handleAddSuccess = () => {
    setShowAddModal(false)
    showToast('success', 'Contact created successfully.')
    fetchContacts()
  }

  const handleEditSuccess = () => {
    setEditContact(null)
    showToast('success', 'Contact updated successfully.')
    fetchContacts()
  }

  const selectedStatusLabel = STATUS_FILTERS.find((f) => f.value === statusFilter)?.label || 'All Statuses'

  return (
    <div className="space-y-6">
      {/* ─── Page Header ─────────────────────────────────────────────── */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div className="flex items-center gap-3">
          <h1 className="text-2xl font-bold text-white tracking-tight">Contacts</h1>
          {!loading && (
            <span className="inline-flex items-center justify-center h-6 min-w-[24px] px-2 rounded-full bg-indigo-500/15 text-indigo-400 text-xs font-semibold border border-indigo-500/20">
              {contacts.length}
            </span>
          )}
        </div>
        <Button onClick={() => setShowAddModal(true)} className="w-full sm:w-auto h-11 sm:h-9">
          <Plus className="h-4 w-4 mr-2" />
          Add Contact
        </Button>
      </div>

      {/* ─── Search & Filters ────────────────────────────────────────── */}
      <div className="flex flex-col sm:flex-row items-stretch sm:items-center gap-3">
        <div className="relative flex-1 max-w-sm">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-zinc-500" />
          <Input
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            placeholder="Search by name or email..."
            className="pl-10"
          />
        </div>

        {/* Status filter dropdown */}
        <div className="relative" ref={statusDropdownRef}>
          <button
            onClick={() => setShowStatusDropdown(!showStatusDropdown)}
            className={cn(
              'flex items-center gap-2 h-10 px-3.5 rounded-lg border text-sm font-medium transition-colors cursor-pointer',
              statusFilter !== 'all'
                ? 'border-indigo-500/40 bg-indigo-500/10 text-indigo-300'
                : 'border-zinc-800 bg-zinc-900/50 text-zinc-400 hover:text-zinc-200 hover:border-zinc-700'
            )}
          >
            {selectedStatusLabel}
            <ChevronDown className="h-3.5 w-3.5" />
          </button>

          {showStatusDropdown && (
            <div className="absolute top-full left-0 mt-1.5 w-44 bg-zinc-900 border border-zinc-800 rounded-xl shadow-2xl z-20 py-1.5 animate-[scaleIn_0.15s_ease-out]">
              {STATUS_FILTERS.map((f) => (
                <button
                  key={f.value}
                  onClick={() => {
                    setStatusFilter(f.value)
                    setShowStatusDropdown(false)
                  }}
                  className={cn(
                    'w-full text-left px-3.5 py-2 text-sm transition-colors cursor-pointer',
                    statusFilter === f.value
                      ? 'bg-indigo-500/15 text-indigo-300'
                      : 'text-zinc-400 hover:bg-zinc-800/60 hover:text-zinc-200'
                  )}
                >
                  {f.label}
                </button>
              ))}
            </div>
          )}
        </div>
      </div>

      {/* ─── Table & Cards ───────────────────────────────────────────────────── */}
      <div className="bg-zinc-900/50 border border-zinc-800/60 rounded-xl overflow-hidden">
        {loading ? (
          <>
            {/* Desktop Skeleton Table */}
            <table className="hidden lg:table w-full">
              <thead>
                <tr className="border-b border-zinc-800/60">
                  <th className="px-4 py-3 w-12" />
                  <th className="px-4 py-3 text-left text-xs font-semibold text-zinc-500 uppercase tracking-wider">Name</th>
                  <th className="px-4 py-3 text-left text-xs font-semibold text-zinc-500 uppercase tracking-wider">Email</th>
                  <th className="px-4 py-3 text-left text-xs font-semibold text-zinc-500 uppercase tracking-wider">Phone</th>
                  <th className="px-4 py-3 text-left text-xs font-semibold text-zinc-500 uppercase tracking-wider">Job Title</th>
                  <th className="px-4 py-3 text-left text-xs font-semibold text-zinc-500 uppercase tracking-wider">Status</th>
                  <th className="px-4 py-3 text-left text-xs font-semibold text-zinc-500 uppercase tracking-wider">Source</th>
                  <th className="px-4 py-3 text-left text-xs font-semibold text-zinc-500 uppercase tracking-wider">Created</th>
                  <th className="px-4 py-3 w-24" />
                </tr>
              </thead>
              <tbody>
                {Array.from({ length: 5 }).map((_, i) => (
                  <SkeletonRow key={i} />
                ))}
              </tbody>
            </table>
            {/* Mobile Skeleton Cards */}
            <div className="lg:hidden flex flex-col divide-y divide-zinc-800/60">
              {Array.from({ length: 5 }).map((_, i) => (
                <div key={i} className="p-4 space-y-3">
                  <div className="flex items-center gap-3">
                    <div className="h-10 w-10 rounded-full bg-zinc-800 animate-pulse shrink-0" />
                    <div className="space-y-2 flex-1">
                      <div className="h-4 w-32 bg-zinc-800 rounded animate-pulse" />
                      <div className="h-3 w-48 bg-zinc-800 rounded animate-pulse" />
                    </div>
                  </div>
                </div>
              ))}
            </div>
          </>
        ) : filteredContacts.length === 0 ? (
          /* Empty state */
          <div className="flex flex-col items-center justify-center py-20 px-6">
            <div className="h-16 w-16 rounded-2xl bg-zinc-800/60 border border-zinc-700/40 flex items-center justify-center mb-5">
              <Users className="h-8 w-8 text-zinc-600" />
            </div>
            <h3 className="text-base font-semibold text-zinc-300 mb-1.5">
              {searchQuery || statusFilter !== 'all' ? 'No contacts found' : 'No contacts yet'}
            </h3>
            <p className="text-sm text-zinc-500 mb-6 text-center max-w-sm">
              {searchQuery || statusFilter !== 'all'
                ? 'Try adjusting your search or filter criteria.'
                : 'Add your first contact to start building your CRM.'}
            </p>
            {!searchQuery && statusFilter === 'all' && (
              <Button onClick={() => setShowAddModal(true)} size="sm">
                <Plus className="h-4 w-4 mr-1.5" />
                Add Contact
              </Button>
            )}
          </div>
        ) : (
          <>
            {/* Desktop Table */}
            <table className="hidden lg:table w-full">
              <thead>
                <tr className="border-b border-zinc-800/60">
                  <th className="px-4 py-3 w-12">
                    <input
                      type="checkbox"
                      disabled
                      className="h-4 w-4 rounded border-zinc-700 bg-zinc-800 cursor-not-allowed accent-indigo-500"
                    />
                  </th>
                  <th className="px-4 py-3 text-left text-xs font-semibold text-zinc-500 uppercase tracking-wider">Name</th>
                  <th className="px-4 py-3 text-left text-xs font-semibold text-zinc-500 uppercase tracking-wider">Email</th>
                  <th className="px-4 py-3 text-left text-xs font-semibold text-zinc-500 uppercase tracking-wider">Phone</th>
                  <th className="px-4 py-3 text-left text-xs font-semibold text-zinc-500 uppercase tracking-wider">Job Title</th>
                  <th className="px-4 py-3 text-left text-xs font-semibold text-zinc-500 uppercase tracking-wider">Status</th>
                  <th className="px-4 py-3 text-left text-xs font-semibold text-zinc-500 uppercase tracking-wider">Source</th>
                  <th className="px-4 py-3 text-left text-xs font-semibold text-zinc-500 uppercase tracking-wider">Created</th>
                  <th className="px-4 py-3 w-24" />
                </tr>
              </thead>
              <tbody>
                {filteredContacts.map((contact) => {
                  const fullName = getFullName(contact.first_name, contact.last_name)
                  const initials = getInitials(contact.first_name, contact.last_name)
                  const avatarColor = getAvatarColor(fullName)

                  return (
                    <tr
                      key={contact.id}
                      className="border-b border-zinc-800/30 hover:bg-zinc-800/20 transition-colors group"
                    >
                      {/* Checkbox */}
                      <td className="px-4 py-3">
                        <input
                          type="checkbox"
                          disabled
                          className="h-4 w-4 rounded border-zinc-700 bg-zinc-800 cursor-not-allowed accent-indigo-500"
                        />
                      </td>

                      {/* Name + Avatar */}
                      <td className="px-4 py-3">
                        <Link
                          href={`/contacts/${contact.id}`}
                          className="flex items-center gap-3 group/name"
                        >
                          <div
                            className="h-9 w-9 rounded-full flex items-center justify-center text-xs font-bold text-white shrink-0 shadow-md"
                            style={{ backgroundColor: avatarColor }}
                          >
                            {initials}
                          </div>
                          <span className="text-sm font-medium text-zinc-200 group-hover/name:text-indigo-400 transition-colors">
                            {fullName}
                          </span>
                        </Link>
                      </td>

                      {/* Email */}
                      <td className="px-4 py-3">
                        {contact.email ? (
                          <span className="text-sm text-zinc-400 flex items-center gap-1.5">
                            <Mail className="h-3.5 w-3.5 text-zinc-600" />
                            {contact.email}
                          </span>
                        ) : (
                          <span className="text-sm text-zinc-600">—</span>
                        )}
                      </td>

                      {/* Phone */}
                      <td className="px-4 py-3">
                        {contact.phone ? (
                          <span className="text-sm text-zinc-400 flex items-center gap-1.5">
                            <Phone className="h-3.5 w-3.5 text-zinc-600" />
                            {contact.phone}
                          </span>
                        ) : (
                          <span className="text-sm text-zinc-600">—</span>
                        )}
                      </td>

                      {/* Job Title */}
                      <td className="px-4 py-3">
                        <span className="text-sm text-zinc-400">
                          {contact.job_title || <span className="text-zinc-600">—</span>}
                        </span>
                      </td>

                      {/* Status Badge */}
                      <td className="px-4 py-3">
                        <span
                          className={cn(
                            'inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-medium border',
                            getStatusClasses(contact.status)
                          )}
                        >
                          <span className={cn('h-1.5 w-1.5 rounded-full', getStatusDotColor(contact.status))} />
                          {capitalize(contact.status)}
                        </span>
                      </td>

                      {/* Source */}
                      <td className="px-4 py-3">
                        <span className="text-sm text-zinc-500">{getSourceLabel(contact.source)}</span>
                      </td>

                      {/* Created date */}
                      <td className="px-4 py-3">
                        <span className="text-sm text-zinc-500">{formatDate(contact.created_at)}</span>
                      </td>

                      {/* Actions */}
                      <td className="px-4 py-3">
                        <div className="flex items-center gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
                          <button
                            onClick={() => setEditContact(contact)}
                            className="h-8 w-8 rounded-lg text-zinc-500 hover:text-indigo-400 hover:bg-indigo-500/10 flex items-center justify-center transition-colors cursor-pointer"
                            title="Edit contact"
                          >
                            <Pencil className="h-3.5 w-3.5" />
                          </button>
                          <button
                            onClick={() => setDeleteContact(contact)}
                            className="h-8 w-8 rounded-lg text-zinc-500 hover:text-red-400 hover:bg-red-500/10 flex items-center justify-center transition-colors cursor-pointer"
                            title="Delete contact"
                          >
                            <Trash2 className="h-3.5 w-3.5" />
                          </button>
                        </div>
                      </td>
                    </tr>
                  )
                })}
              </tbody>
            </table>

            {/* Mobile Cards View */}
            <div className="lg:hidden flex flex-col divide-y divide-zinc-800/60">
              {filteredContacts.map((contact) => {
                const fullName = getFullName(contact.first_name, contact.last_name)
                const initials = getInitials(contact.first_name, contact.last_name)
                const avatarColor = getAvatarColor(fullName)

                return (
                  <div key={contact.id} className="p-4 flex flex-col gap-3">
                    <div className="flex items-start justify-between gap-3">
                      <Link href={`/contacts/${contact.id}`} className="flex items-center gap-3 min-w-0">
                        <div
                          className="h-10 w-10 rounded-full flex items-center justify-center text-sm font-bold text-white shrink-0 shadow-md"
                          style={{ backgroundColor: avatarColor }}
                        >
                          {initials}
                        </div>
                        <div className="min-w-0">
                          <h3 className="text-sm font-semibold text-zinc-200 truncate">{fullName}</h3>
                          <p className="text-xs text-zinc-500 truncate">{contact.job_title || 'No Title'}</p>
                        </div>
                      </Link>
                      
                      {/* Action Menu (Inline for mobile) */}
                      <div className="flex items-center gap-1 shrink-0">
                        <button
                          onClick={() => setEditContact(contact)}
                          className="h-10 w-10 rounded-lg text-zinc-500 hover:bg-indigo-500/10 hover:text-indigo-400 flex items-center justify-center"
                        >
                          <Pencil className="h-4 w-4" />
                        </button>
                        <button
                          onClick={() => setDeleteContact(contact)}
                          className="h-10 w-10 rounded-lg text-zinc-500 hover:bg-red-500/10 hover:text-red-400 flex items-center justify-center"
                        >
                          <Trash2 className="h-4 w-4" />
                        </button>
                      </div>
                    </div>
                    
                    <div className="grid grid-cols-2 gap-2 text-xs">
                      {contact.email && (
                        <div className="flex items-center gap-1.5 text-zinc-400 truncate">
                          <Mail className="h-3.5 w-3.5 shrink-0" />
                          <span className="truncate">{contact.email}</span>
                        </div>
                      )}
                      {contact.phone && (
                        <div className="flex items-center gap-1.5 text-zinc-400 truncate">
                          <Phone className="h-3.5 w-3.5 shrink-0" />
                          <span className="truncate">{contact.phone}</span>
                        </div>
                      )}
                    </div>
                    
                    <div className="flex items-center justify-between pt-1">
                      <span
                        className={cn(
                          'inline-flex items-center gap-1.5 px-2 py-0.5 rounded-full text-[10px] font-medium border',
                          getStatusClasses(contact.status)
                        )}
                      >
                        <span className={cn('h-1.5 w-1.5 rounded-full', getStatusDotColor(contact.status))} />
                        {capitalize(contact.status)}
                      </span>
                      <span className="text-[10px] text-zinc-500">{formatDate(contact.created_at)}</span>
                    </div>
                  </div>
                )
              })}
            </div>
          </>
        )}
      </div>

      {/* ─── Modals ──────────────────────────────────────────────────── */}
      {showAddModal && (
        <ContactFormModal
          mode="add"
          onSuccess={handleAddSuccess}
          onClose={() => setShowAddModal(false)}
        />
      )}

      {editContact && (
        <ContactFormModal
          mode="edit"
          contact={editContact}
          onSuccess={handleEditSuccess}
          onClose={() => setEditContact(null)}
        />
      )}

      {deleteContact && (
        <DeleteConfirmation
          contact={deleteContact}
          loading={deleteLoading}
          onConfirm={handleDelete}
          onCancel={() => setDeleteContact(null)}
        />
      )}

      <style jsx global>{`
        @keyframes scaleIn {
          from { opacity: 0; transform: scale(0.95); }
          to { opacity: 1; transform: scale(1); }
        }
      `}</style>
    </div>
  )
}

// ─── Page Export (wrapped in Toast Provider) ─────────────────────────────
export default function ContactsPage() {
  return (
    <ToastProvider>
      <ContactsContent />
    </ToastProvider>
  )
}
