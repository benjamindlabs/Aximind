'use client'

import * as React from 'react'
import Link from 'next/link'
import {
  Plus,
  Search,
  Target,
  Pencil,
  Trash2,
  ChevronDown,
  TrendingUp,
  DollarSign,
  Briefcase,
  Layers,
  Award,
  Sparkles,
} from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { cn } from '@/lib/utils'
import { createClient } from '@/lib/supabase/client'
import type { Lead, LeadStatus, LeadPriority } from './types'
import {
  formatDate,
  formatCurrency,
  getStatusClasses,
  getStatusDotColor,
  getPriorityClasses,
  capitalize,
  getSourceLabel,
} from './utils'
import { ToastProvider, useToast } from './toast'
import { LeadFormModal } from './lead-form-modal'
import { DeleteConfirmation } from './delete-confirmation'

// ─── Filter dropdown options ───────────────────────────────────────────
const STATUS_FILTERS = [
  { value: 'all', label: 'All Statuses' },
  { value: 'new', label: 'New' },
  { value: 'contacted', label: 'Contacted' },
  { value: 'qualified', label: 'Qualified' },
  { value: 'unqualified', label: 'Unqualified' },
  { value: 'converted', label: 'Converted' },
  { value: 'lost', label: 'Lost' },
]

const PRIORITY_FILTERS = [
  { value: 'all', label: 'All Priorities' },
  { value: 'low', label: 'Low' },
  { value: 'medium', label: 'Medium' },
  { value: 'high', label: 'High' },
]

// ─── Stat Card Component ───────────────────────────────────────────────
function StatCard({
  icon: Icon,
  label,
  value,
  colorClass,
}: {
  icon: React.ComponentType<any>
  label: string
  value: number
  colorClass: string
}) {
  return (
    <div className="bg-zinc-900 border border-zinc-800/80 rounded-xl p-4 flex items-center justify-between shadow-xs">
      <div className="space-y-1">
        <p className="text-xs text-zinc-500 font-medium uppercase tracking-wider">{label}</p>
        <p className="text-2xl font-bold text-white tracking-tight">{value}</p>
      </div>
      <div className={cn("h-10 w-10 rounded-lg flex items-center justify-center border", colorClass)}>
        <Icon className="h-5 w-5" />
      </div>
    </div>
  )
}

// ─── Skeleton Row ───────────────────────────────────────────────────────
function SkeletonRow() {
  return (
    <tr className="border-b border-zinc-800/40">
      <td className="px-4 py-3.5"><div className="h-4 w-4 rounded bg-zinc-800 animate-pulse" /></td>
      <td className="px-4 py-3.5"><div className="h-4 w-44 rounded bg-zinc-800 animate-pulse" /></td>
      <td className="px-4 py-3.5"><div className="h-5 w-20 rounded-full bg-zinc-800 animate-pulse" /></td>
      <td className="px-4 py-3.5"><div className="h-5 w-16 rounded-full bg-zinc-800 animate-pulse" /></td>
      <td className="px-4 py-3.5"><div className="h-4 w-20 rounded bg-zinc-800 animate-pulse" /></td>
      <td className="px-4 py-3.5"><div className="h-4 w-16 rounded bg-zinc-800 animate-pulse" /></td>
      <td className="px-4 py-3.5"><div className="h-4 w-24 rounded bg-zinc-800 animate-pulse" /></td>
      <td className="px-4 py-3.5"><div className="h-4 w-16 rounded bg-zinc-800 animate-pulse" /></td>
    </tr>
  )
}

// ─── Main Content Component ─────────────────────────────────────────────
function LeadsContent() {
  const { showToast } = useToast()

  // State
  const [leads, setLeads] = React.useState<Lead[]>([])
  const [loading, setLoading] = React.useState(true)
  const [searchQuery, setSearchQuery] = React.useState('')
  const [statusFilter, setStatusFilter] = React.useState('all')
  const [priorityFilter, setPriorityFilter] = React.useState('all')

  const [showAddModal, setShowAddModal] = React.useState(false)
  const [editLead, setEditLead] = React.useState<Lead | null>(null)
  const [deleteLead, setDeleteLead] = React.useState<Lead | null>(null)
  const [deleteLoading, setDeleteLoading] = React.useState(false)

  // Custom Dropdown UI State
  const [showStatusDropdown, setShowStatusDropdown] = React.useState(false)
  const [showPriorityDropdown, setShowPriorityDropdown] = React.useState(false)

  const statusRef = React.useRef<HTMLDivElement>(null)
  const priorityRef = React.useRef<HTMLDivElement>(null)

  // Dropdown dismissals
  React.useEffect(() => {
    const handleClickOutside = (e: MouseEvent) => {
      if (statusRef.current && !statusRef.current.contains(e.target as Node)) {
        setShowStatusDropdown(false)
      }
      if (priorityRef.current && !priorityRef.current.contains(e.target as Node)) {
        setShowPriorityDropdown(false)
      }
    }
    document.addEventListener('mousedown', handleClickOutside)
    return () => document.removeEventListener('mousedown', handleClickOutside)
  }, [])

  // Fetch leads
  const fetchLeads = React.useCallback(async () => {
    try {
      const supabase = createClient()
      const { data, error } = await supabase
        .from('leads')
        .select('*')
        .order('created_at', { ascending: false })

      if (error) throw error
      setLeads((data as unknown as Lead[]) || [])
    } catch (err: any) {
      console.error('Error fetching leads:', err?.message || 'Unknown error')
      showToast('error', 'Failed to load leads.')
    } finally {
      setLoading(false)
    }
  }, [showToast])

  React.useEffect(() => {
    fetchLeads()
  }, [fetchLeads])

  // Filters computed
  const filteredLeads = React.useMemo(() => {
    let result = leads

    // Search query by title
    if (searchQuery.trim()) {
      const q = searchQuery.toLowerCase()
      result = result.filter((l) => l.title.toLowerCase().includes(q))
    }

    // Status filter
    if (statusFilter !== 'all') {
      result = result.filter((l) => l.status === statusFilter)
    }

    // Priority filter
    if (priorityFilter !== 'all') {
      result = result.filter((l) => l.priority === priorityFilter)
    }

    return result
  }, [leads, searchQuery, statusFilter, priorityFilter])

  // Stat computations (from all leads)
  const stats = React.useMemo(() => {
    return {
      total: leads.length,
      new: leads.filter((l) => l.status === 'new').length,
      qualified: leads.filter((l) => l.status === 'qualified').length,
      converted: leads.filter((l) => l.status === 'converted').length,
    }
  }, [leads])

  // Delete lead handler
  const handleDelete = async () => {
    if (!deleteLead) return
    setDeleteLoading(true)
    try {
      const supabase = createClient()
      const { error } = await supabase
        .from('leads')
        .delete()
        .eq('id', deleteLead.id)

      if (error) throw error

      setDeleteLead(null)
      showToast('success', 'Lead deleted successfully.')
      fetchLeads()
    } catch (err: any) {
      console.error('Error deleting lead:', err?.message || 'Unknown error')
      showToast('error', err?.message || 'Failed to delete lead.')
    } finally {
      setDeleteLoading(false)
    }
  }

  // Success callbacks
  const handleAddSuccess = () => {
    setShowAddModal(false)
    showToast('success', 'Lead created successfully.')
    fetchLeads()
  }

  const handleEditSuccess = () => {
    setEditLead(null)
    showToast('success', 'Lead updated successfully.')
    fetchLeads()
  }

  const selectedStatusLabel = STATUS_FILTERS.find((f) => f.value === statusFilter)?.label || 'All Statuses'
  const selectedPriorityLabel = PRIORITY_FILTERS.find((f) => f.value === priorityFilter)?.label || 'All Priorities'

  return (
    <div className="space-y-6">
      {/* ─── Page Header ─────────────────────────────────────────────── */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div className="flex items-center gap-3">
          <h1 className="text-2xl font-bold text-white tracking-tight">Leads</h1>
          {!loading && (
            <span className="inline-flex items-center justify-center h-6 min-w-[24px] px-2 rounded-full bg-indigo-500/15 text-indigo-400 text-xs font-semibold border border-indigo-500/20">
              {leads.length}
            </span>
          )}
        </div>
        <Button onClick={() => setShowAddModal(true)} className="w-full sm:w-auto h-11 sm:h-9">
          <Plus className="h-4 w-4 mr-2" />
          Add Lead
        </Button>
      </div>

      {/* ─── Summary Bar (Stats Cards) ────────────────────────────────── */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        <StatCard
          icon={Layers}
          label="Total Leads"
          value={stats.total}
          colorClass="bg-zinc-800/40 border-zinc-700/30 text-zinc-400"
        />
        <StatCard
          icon={Sparkles}
          label="New Leads"
          value={stats.new}
          colorClass="bg-blue-500/10 border-blue-500/20 text-blue-400"
        />
        <StatCard
          icon={Award}
          label="Qualified"
          value={stats.qualified}
          colorClass="bg-emerald-500/10 border-emerald-500/20 text-emerald-400"
        />
        <StatCard
          icon={TrendingUp}
          label="Converted"
          value={stats.converted}
          colorClass="bg-indigo-500/10 border-indigo-500/20 text-indigo-400"
        />
      </div>

      {/* ─── Search & Filters ────────────────────────────────────────── */}
      <div className="flex flex-col sm:flex-row items-stretch sm:items-center gap-3">
        <div className="relative flex-1 max-w-sm sm:min-w-[260px]">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-zinc-500" />
          <Input
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            placeholder="Search leads by title..."
            className="pl-10"
          />
        </div>

        {/* Status Dropdown */}
        <div className="relative" ref={statusRef}>
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
            <div className="absolute top-full left-0 mt-1.5 w-44 bg-zinc-900 border border-zinc-800 rounded-xl shadow-2xl z-20 py-1.5 animate-[leadsScaleIn_0.15s_ease-out]">
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

        {/* Priority Dropdown */}
        <div className="relative" ref={priorityRef}>
          <button
            onClick={() => setShowPriorityDropdown(!showPriorityDropdown)}
            className={cn(
              'flex items-center gap-2 h-10 px-3.5 rounded-lg border text-sm font-medium transition-colors cursor-pointer',
              priorityFilter !== 'all'
                ? 'border-indigo-500/40 bg-indigo-500/10 text-indigo-300'
                : 'border-zinc-800 bg-zinc-900/50 text-zinc-400 hover:text-zinc-200 hover:border-zinc-700'
            )}
          >
            {selectedPriorityLabel}
            <ChevronDown className="h-3.5 w-3.5" />
          </button>

          {showPriorityDropdown && (
            <div className="absolute top-full left-0 mt-1.5 w-44 bg-zinc-900 border border-zinc-800 rounded-xl shadow-2xl z-20 py-1.5 animate-[leadsScaleIn_0.15s_ease-out]">
              {PRIORITY_FILTERS.map((f) => (
                <button
                  key={f.value}
                  onClick={() => {
                    setPriorityFilter(f.value)
                    setShowPriorityDropdown(false)
                  }}
                  className={cn(
                    'w-full text-left px-3.5 py-2 text-sm transition-colors cursor-pointer',
                    priorityFilter === f.value
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
                  <th className="px-4 py-3 text-left text-xs font-semibold text-zinc-500 uppercase tracking-wider">Title</th>
                  <th className="px-4 py-3 text-left text-xs font-semibold text-zinc-500 uppercase tracking-wider">Status</th>
                  <th className="px-4 py-3 text-left text-xs font-semibold text-zinc-500 uppercase tracking-wider">Priority</th>
                  <th className="px-4 py-3 text-left text-xs font-semibold text-zinc-500 uppercase tracking-wider">Est. Value</th>
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
                  <div className="h-4 w-48 bg-zinc-800 rounded animate-pulse" />
                  <div className="h-3 w-32 bg-zinc-800 rounded animate-pulse" />
                </div>
              ))}
            </div>
          </>
        ) : filteredLeads.length === 0 ? (
          /* Empty state */
          <div className="flex flex-col items-center justify-center py-20 px-6">
            <div className="h-16 w-16 rounded-2xl bg-zinc-800/60 border border-zinc-700/40 flex items-center justify-center mb-5">
              <Target className="h-8 w-8 text-zinc-650" />
            </div>
            <h3 className="text-base font-semibold text-zinc-300 mb-1.5">
              {searchQuery || statusFilter !== 'all' || priorityFilter !== 'all' ? 'No leads found' : 'No leads yet'}
            </h3>
            <p className="text-sm text-zinc-500 mb-6 text-center max-w-sm">
              {searchQuery || statusFilter !== 'all' || priorityFilter !== 'all'
                ? 'Try adjusting your search or filter values.'
                : 'Add your first lead to track this new deal opportunity.'}
            </p>
            {!searchQuery && statusFilter === 'all' && priorityFilter === 'all' && (
              <Button onClick={() => setShowAddModal(true)} size="sm">
                <Plus className="h-4 w-4 mr-1.5" />
                Add Lead
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
                  <th className="px-4 py-3 text-left text-xs font-semibold text-zinc-500 uppercase tracking-wider">Title</th>
                  <th className="px-4 py-3 text-left text-xs font-semibold text-zinc-500 uppercase tracking-wider">Status</th>
                  <th className="px-4 py-3 text-left text-xs font-semibold text-zinc-500 uppercase tracking-wider">Priority</th>
                  <th className="px-4 py-3 text-left text-xs font-semibold text-zinc-500 uppercase tracking-wider">Est. Value</th>
                  <th className="px-4 py-3 text-left text-xs font-semibold text-zinc-500 uppercase tracking-wider">Source</th>
                  <th className="px-4 py-3 text-left text-xs font-semibold text-zinc-500 uppercase tracking-wider">Created</th>
                  <th className="px-4 py-3 w-24" />
                </tr>
              </thead>
              <tbody>
                {filteredLeads.map((lead) => {
                  return (
                    <tr
                      key={lead.id}
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

                      {/* Title */}
                      <td className="px-4 py-3">
                        <Link
                          href={`/leads/${lead.id}`}
                          className="text-sm font-medium text-zinc-200 hover:text-indigo-400 transition-colors block truncate max-w-xs"
                        >
                          {lead.title}
                        </Link>
                      </td>

                      {/* Status Badge */}
                      <td className="px-4 py-3">
                        <span
                          className={cn(
                            'inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-medium border',
                            getStatusClasses(lead.status)
                          )}
                        >
                          <span className={cn('h-1.5 w-1.5 rounded-full', getStatusDotColor(lead.status))} />
                          {capitalize(lead.status)}
                        </span>
                      </td>

                      {/* Priority Badge */}
                      <td className="px-4 py-3">
                        <span
                          className={cn(
                            'inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium border',
                            getPriorityClasses(lead.priority)
                          )}
                        >
                          {capitalize(lead.priority)}
                        </span>
                      </td>

                      {/* Estimated Value */}
                      <td className="px-4 py-3">
                        <span className="text-sm text-zinc-400">
                          {lead.estimated_value !== null ? (
                            <span className="text-zinc-200 font-medium">
                              {formatCurrency(lead.estimated_value)}
                            </span>
                          ) : (
                            <span className="text-zinc-600">—</span>
                          )}
                        </span>
                      </td>

                      {/* Source */}
                      <td className="px-4 py-3">
                        <span className="text-sm text-zinc-500">{getSourceLabel(lead.source)}</span>
                      </td>

                      {/* Created date */}
                      <td className="px-4 py-3">
                        <span className="text-sm text-zinc-500">{formatDate(lead.created_at)}</span>
                      </td>

                      {/* Actions */}
                      <td className="px-4 py-3">
                        <div className="flex items-center gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
                          <button
                            onClick={() => setEditLead(lead)}
                            className="h-8 w-8 rounded-lg text-zinc-500 hover:text-indigo-400 hover:bg-indigo-500/10 flex items-center justify-center transition-colors cursor-pointer"
                            title="Edit lead"
                          >
                            <Pencil className="h-3.5 w-3.5" />
                          </button>
                          <button
                            onClick={() => setDeleteLead(lead)}
                            className="h-8 w-8 rounded-lg text-zinc-500 hover:text-red-400 hover:bg-red-500/10 flex items-center justify-center transition-colors cursor-pointer"
                            title="Delete lead"
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
              {filteredLeads.map((lead) => {
                return (
                  <div key={lead.id} className="p-4 flex flex-col gap-3">
                    <div className="flex items-start justify-between gap-3">
                      <Link href={`/leads/${lead.id}`} className="flex-1 min-w-0">
                        <h3 className="text-sm font-semibold text-zinc-200 truncate pr-2 hover:text-indigo-400">{lead.title}</h3>
                        <div className="flex items-center gap-2 mt-1">
                          <span
                            className={cn(
                              'inline-flex items-center gap-1.5 px-2 py-0.5 rounded-full text-[10px] font-medium border',
                              getStatusClasses(lead.status)
                            )}
                          >
                            <span className={cn('h-1 w-1 rounded-full', getStatusDotColor(lead.status))} />
                            {capitalize(lead.status)}
                          </span>
                          <span
                            className={cn(
                              'inline-flex items-center px-1.5 py-0.5 rounded-full text-[10px] font-medium border',
                              getPriorityClasses(lead.priority)
                            )}
                          >
                            {capitalize(lead.priority)}
                          </span>
                        </div>
                      </Link>
                      
                      {/* Action Menu */}
                      <div className="flex items-center gap-1 shrink-0">
                        <button
                          onClick={() => setEditLead(lead)}
                          className="h-10 w-10 rounded-lg text-zinc-500 hover:bg-indigo-500/10 hover:text-indigo-400 flex items-center justify-center"
                        >
                          <Pencil className="h-4 w-4" />
                        </button>
                        <button
                          onClick={() => setDeleteLead(lead)}
                          className="h-10 w-10 rounded-lg text-zinc-500 hover:bg-red-500/10 hover:text-red-400 flex items-center justify-center"
                        >
                          <Trash2 className="h-4 w-4" />
                        </button>
                      </div>
                    </div>
                    
                    <div className="grid grid-cols-2 gap-2 text-xs">
                      <div className="flex flex-col">
                        <span className="text-zinc-500">Value</span>
                        <span className="text-zinc-300 font-medium">{lead.estimated_value ? formatCurrency(lead.estimated_value) : '—'}</span>
                      </div>
                      <div className="flex flex-col text-right">
                        <span className="text-zinc-500">Created</span>
                        <span className="text-zinc-300">{formatDate(lead.created_at)}</span>
                      </div>
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
        <LeadFormModal
          mode="add"
          onSuccess={handleAddSuccess}
          onClose={() => setShowAddModal(false)}
        />
      )}

      {editLead && (
        <LeadFormModal
          mode="edit"
          lead={editLead}
          onSuccess={handleEditSuccess}
          onClose={() => setEditLead(null)}
        />
      )}

      {deleteLead && (
        <DeleteConfirmation
          lead={deleteLead}
          loading={deleteLoading}
          onConfirm={handleDelete}
          onCancel={() => setDeleteLead(null)}
        />
      )}

      <style jsx global>{`
        @keyframes leadsScaleIn {
          from { opacity: 0; transform: scale(0.95); }
          to { opacity: 1; transform: scale(1); }
        }
      `}</style>
    </div>
  )
}

// ─── Page Export (wrapped in Toast Provider) ─────────────────────────────
export default function LeadsPage() {
  return (
    <ToastProvider>
      <LeadsContent />
    </ToastProvider>
  )
}
