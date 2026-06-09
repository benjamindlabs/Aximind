'use client'

import * as React from 'react'
import Link from 'next/link'
import {
  Plus,
  Search,
  Building2,
  Pencil,
  Trash2,
  ChevronDown,
  Mail,
  Phone,
  Globe,
} from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { cn } from '@/lib/utils'
import { createClient } from '@/lib/supabase/client'
import type { Company } from './types'
import {
  getCompanyInitial,
  getAvatarColor,
  formatDate,
  getSizeClasses,
  getLocation,
  ensureProtocol,
  formatWebsite,
} from './utils'
import { ToastProvider, useToast } from './toast'
import { CompanyFormModal } from './company-form-modal'
import { DeleteConfirmation } from './delete-confirmation'

// ─── Size filter options ────────────────────────────────────────────────
const SIZE_FILTERS: { value: string; label: string }[] = [
  { value: 'all', label: 'All Sizes' },
  { value: '1-10', label: '1-10' },
  { value: '11-50', label: '11-50' },
  { value: '51-200', label: '51-200' },
  { value: '201-500', label: '201-500' },
  { value: '500+', label: '500+' },
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
      <td className="px-4 py-3.5"><div className="h-4 w-24 rounded bg-zinc-800 animate-pulse" /></td>
      <td className="px-4 py-3.5"><div className="h-4 w-32 rounded bg-zinc-800 animate-pulse" /></td>
      <td className="px-4 py-3.5"><div className="h-4 w-28 rounded bg-zinc-800 animate-pulse" /></td>
      <td className="px-4 py-3.5"><div className="h-4 w-36 rounded bg-zinc-800 animate-pulse" /></td>
      <td className="px-4 py-3.5"><div className="h-4 w-24 rounded bg-zinc-800 animate-pulse" /></td>
      <td className="px-4 py-3.5"><div className="h-5 w-16 rounded-full bg-zinc-800 animate-pulse" /></td>
      <td className="px-4 py-3.5"><div className="h-4 w-20 rounded bg-zinc-800 animate-pulse" /></td>
      <td className="px-4 py-3.5"><div className="h-4 w-16 rounded bg-zinc-800 animate-pulse" /></td>
    </tr>
  )
}

// ─── Main Content Component ─────────────────────────────────────────────
function CompaniesContent() {
  const { showToast } = useToast()

  // State
  const [companies, setCompanies] = React.useState<Company[]>([])
  const [loading, setLoading] = React.useState(true)
  const [searchQuery, setSearchQuery] = React.useState('')
  const [sizeFilter, setSizeFilter] = React.useState('all')
  const [showAddModal, setShowAddModal] = React.useState(false)
  const [editCompany, setEditCompany] = React.useState<Company | null>(null)
  const [deleteCompany, setDeleteCompany] = React.useState<Company | null>(null)
  const [deleteLoading, setDeleteLoading] = React.useState(false)
  const [showSizeDropdown, setShowSizeDropdown] = React.useState(false)

  const sizeDropdownRef = React.useRef<HTMLDivElement>(null)

  // Close dropdown on click outside
  React.useEffect(() => {
    const handleClick = (e: MouseEvent) => {
      if (sizeDropdownRef.current && !sizeDropdownRef.current.contains(e.target as Node)) {
        setShowSizeDropdown(false)
      }
    }
    document.addEventListener('mousedown', handleClick)
    return () => document.removeEventListener('mousedown', handleClick)
  }, [])

  // Fetch companies
  const fetchCompanies = React.useCallback(async () => {
    try {
      const supabase = createClient()
      const { data, error } = await supabase
        .from('companies')
        .select('*')
        .order('created_at', { ascending: false })

      if (error) throw error
      setCompanies((data as unknown as Company[]) || [])
    } catch (err: any) {
      console.error('Error fetching companies:', err?.message || 'Unknown error')
      showToast('error', 'Failed to load companies.')
    } finally {
      setLoading(false)
    }
  }, [showToast])

  React.useEffect(() => {
    fetchCompanies()
  }, [fetchCompanies])

  // Filter companies
  const filteredCompanies = React.useMemo(() => {
    let result = companies

    // Search filter
    if (searchQuery.trim()) {
      const q = searchQuery.toLowerCase()
      result = result.filter((c) => {
        return c.name.toLowerCase().includes(q)
      })
    }

    // Size filter
    if (sizeFilter !== 'all') {
      result = result.filter((c) => c.size === sizeFilter)
    }

    return result
  }, [companies, searchQuery, sizeFilter])

  // Delete handler
  const handleDelete = async () => {
    if (!deleteCompany) return
    setDeleteLoading(true)
    try {
      const supabase = createClient()
      const { error } = await supabase
        .from('companies')
        .delete()
        .eq('id', deleteCompany.id)

      if (error) throw error

      setDeleteCompany(null)
      showToast('success', 'Company deleted successfully.')
      fetchCompanies()
    } catch (err: any) {
      console.error('Error deleting company:', err?.message || 'Unknown error')
      showToast('error', err?.message || 'Failed to delete company.')
    } finally {
      setDeleteLoading(false)
    }
  }

  // Modal success handlers
  const handleAddSuccess = () => {
    setShowAddModal(false)
    showToast('success', 'Company created successfully.')
    fetchCompanies()
  }

  const handleEditSuccess = () => {
    setEditCompany(null)
    showToast('success', 'Company updated successfully.')
    fetchCompanies()
  }

  const selectedSizeLabel = SIZE_FILTERS.find((f) => f.value === sizeFilter)?.label || 'All Sizes'

  return (
    <div className="space-y-6">
      {/* ─── Page Header ─────────────────────────────────────────────── */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-3">
          <h1 className="text-2xl font-bold text-white tracking-tight">Companies</h1>
          {!loading && (
            <span className="inline-flex items-center justify-center h-6 min-w-[24px] px-2 rounded-full bg-indigo-500/15 text-indigo-400 text-xs font-semibold border border-indigo-500/20">
              {companies.length}
            </span>
          )}
        </div>
        <Button onClick={() => setShowAddModal(true)}>
          <Plus className="h-4 w-4 mr-2" />
          Add Company
        </Button>
      </div>

      {/* ─── Search & Filters ────────────────────────────────────────── */}
      <div className="flex items-center gap-3">
        <div className="relative flex-1 max-w-sm">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-zinc-500" />
          <Input
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            placeholder="Search by company name..."
            className="pl-10"
          />
        </div>

        {/* Size filter dropdown */}
        <div className="relative" ref={sizeDropdownRef}>
          <button
            onClick={() => setShowSizeDropdown(!showSizeDropdown)}
            className={cn(
              'flex items-center gap-2 h-10 px-3.5 rounded-lg border text-sm font-medium transition-colors cursor-pointer',
              sizeFilter !== 'all'
                ? 'border-indigo-500/40 bg-indigo-500/10 text-indigo-300'
                : 'border-zinc-800 bg-zinc-900/50 text-zinc-400 hover:text-zinc-200 hover:border-zinc-700'
            )}
          >
            {selectedSizeLabel}
            <ChevronDown className="h-3.5 w-3.5" />
          </button>

          {showSizeDropdown && (
            <div className="absolute top-full left-0 mt-1.5 w-44 bg-zinc-900 border border-zinc-800 rounded-xl shadow-2xl z-20 py-1.5 animate-[companyScaleIn_0.15s_ease-out]">
              {SIZE_FILTERS.map((f) => (
                <button
                  key={f.value}
                  onClick={() => {
                    setSizeFilter(f.value)
                    setShowSizeDropdown(false)
                  }}
                  className={cn(
                    'w-full text-left px-3.5 py-2 text-sm transition-colors cursor-pointer',
                    sizeFilter === f.value
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

      {/* ─── Table ───────────────────────────────────────────────────── */}
      <div className="bg-zinc-900/50 border border-zinc-800/60 rounded-xl overflow-hidden">
        {loading ? (
          <table className="w-full">
            <thead>
              <tr className="border-b border-zinc-800/60">
                <th className="px-4 py-3 w-12" />
                <th className="px-4 py-3 text-left text-xs font-semibold text-zinc-500 uppercase tracking-wider">Company</th>
                <th className="px-4 py-3 text-left text-xs font-semibold text-zinc-500 uppercase tracking-wider">Industry</th>
                <th className="px-4 py-3 text-left text-xs font-semibold text-zinc-500 uppercase tracking-wider">Website</th>
                <th className="px-4 py-3 text-left text-xs font-semibold text-zinc-500 uppercase tracking-wider">Phone</th>
                <th className="px-4 py-3 text-left text-xs font-semibold text-zinc-500 uppercase tracking-wider">Email</th>
                <th className="px-4 py-3 text-left text-xs font-semibold text-zinc-500 uppercase tracking-wider">Location</th>
                <th className="px-4 py-3 text-left text-xs font-semibold text-zinc-500 uppercase tracking-wider">Size</th>
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
        ) : filteredCompanies.length === 0 ? (
          /* Empty state */
          <div className="flex flex-col items-center justify-center py-20 px-6">
            <div className="h-16 w-16 rounded-2xl bg-zinc-800/60 border border-zinc-700/40 flex items-center justify-center mb-5">
              <Building2 className="h-8 w-8 text-zinc-600" />
            </div>
            <h3 className="text-base font-semibold text-zinc-300 mb-1.5">
              {searchQuery || sizeFilter !== 'all' ? 'No companies found' : 'No companies yet'}
            </h3>
            <p className="text-sm text-zinc-500 mb-6 text-center max-w-sm">
              {searchQuery || sizeFilter !== 'all'
                ? 'Try adjusting your search or filter criteria.'
                : 'Add your first company to start building your CRM.'}
            </p>
            {!searchQuery && sizeFilter === 'all' && (
              <Button onClick={() => setShowAddModal(true)} size="sm">
                <Plus className="h-4 w-4 mr-1.5" />
                Add Company
              </Button>
            )}
          </div>
        ) : (
          <table className="w-full">
            <thead>
              <tr className="border-b border-zinc-800/60">
                <th className="px-4 py-3 w-12">
                  <input
                    type="checkbox"
                    disabled
                    className="h-4 w-4 rounded border-zinc-700 bg-zinc-800 cursor-not-allowed accent-indigo-500"
                  />
                </th>
                <th className="px-4 py-3 text-left text-xs font-semibold text-zinc-500 uppercase tracking-wider">Company</th>
                <th className="px-4 py-3 text-left text-xs font-semibold text-zinc-500 uppercase tracking-wider">Industry</th>
                <th className="px-4 py-3 text-left text-xs font-semibold text-zinc-500 uppercase tracking-wider">Website</th>
                <th className="px-4 py-3 text-left text-xs font-semibold text-zinc-500 uppercase tracking-wider">Phone</th>
                <th className="px-4 py-3 text-left text-xs font-semibold text-zinc-500 uppercase tracking-wider">Email</th>
                <th className="px-4 py-3 text-left text-xs font-semibold text-zinc-500 uppercase tracking-wider">Location</th>
                <th className="px-4 py-3 text-left text-xs font-semibold text-zinc-500 uppercase tracking-wider">Size</th>
                <th className="px-4 py-3 text-left text-xs font-semibold text-zinc-500 uppercase tracking-wider">Created</th>
                <th className="px-4 py-3 w-24" />
              </tr>
            </thead>
            <tbody>
              {filteredCompanies.map((company) => {
                const initial = getCompanyInitial(company.name)
                const avatarColor = getAvatarColor(company.name)
                const location = getLocation(company.city, company.country)

                return (
                  <tr
                    key={company.id}
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
                        href={`/companies/${company.id}`}
                        className="flex items-center gap-3 group/name"
                      >
                        <div
                          className="h-9 w-9 rounded-full flex items-center justify-center text-xs font-bold text-white shrink-0 shadow-md"
                          style={{ backgroundColor: avatarColor }}
                        >
                          {initial}
                        </div>
                        <span className="text-sm font-medium text-zinc-200 group-hover/name:text-indigo-400 transition-colors">
                          {company.name}
                        </span>
                      </Link>
                    </td>

                    {/* Industry */}
                    <td className="px-4 py-3">
                      <span className="text-sm text-zinc-400">
                        {company.industry || <span className="text-zinc-600">—</span>}
                      </span>
                    </td>

                    {/* Website */}
                    <td className="px-4 py-3">
                      {company.website ? (
                        <a
                          href={ensureProtocol(company.website)}
                          target="_blank"
                          rel="noopener noreferrer"
                          className="text-sm text-indigo-450 hover:text-indigo-400 inline-flex items-center gap-1.5 transition-colors"
                          onClick={(e) => e.stopPropagation()}
                        >
                          <Globe className="h-3.5 w-3.5 text-zinc-650 shrink-0" />
                          {formatWebsite(company.website)}
                        </a>
                      ) : (
                        <span className="text-sm text-zinc-600">—</span>
                      )}
                    </td>

                    {/* Phone */}
                    <td className="px-4 py-3">
                      {company.phone ? (
                        <span className="text-sm text-zinc-400 flex items-center gap-1.5">
                          <Phone className="h-3.5 w-3.5 text-zinc-600" />
                          {company.phone}
                        </span>
                      ) : (
                        <span className="text-sm text-zinc-600">—</span>
                      )}
                    </td>

                    {/* Email */}
                    <td className="px-4 py-3">
                      {company.email ? (
                        <span className="text-sm text-zinc-400 flex items-center gap-1.5">
                          <Mail className="h-3.5 w-3.5 text-zinc-600" />
                          {company.email}
                        </span>
                      ) : (
                        <span className="text-sm text-zinc-600">—</span>
                      )}
                    </td>

                    {/* Location */}
                    <td className="px-4 py-3">
                      <span className="text-sm text-zinc-400">
                        {location || <span className="text-zinc-600">—</span>}
                      </span>
                    </td>

                    {/* Size Badge */}
                    <td className="px-4 py-3">
                      {company.size ? (
                        <span
                          className={cn(
                            'inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium border',
                            getSizeClasses(company.size)
                          )}
                        >
                          {company.size}
                        </span>
                      ) : (
                        <span className="text-sm text-zinc-650">—</span>
                      )}
                    </td>

                    {/* Created date */}
                    <td className="px-4 py-3">
                      <span className="text-sm text-zinc-500">{formatDate(company.created_at)}</span>
                    </td>

                    {/* Actions */}
                    <td className="px-4 py-3">
                      <div className="flex items-center gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
                        <button
                          onClick={() => setEditCompany(company)}
                          className="h-8 w-8 rounded-lg text-zinc-500 hover:text-indigo-400 hover:bg-indigo-500/10 flex items-center justify-center transition-colors cursor-pointer"
                          title="Edit company"
                        >
                          <Pencil className="h-3.5 w-3.5" />
                        </button>
                        <button
                          onClick={() => setDeleteCompany(company)}
                          className="h-8 w-8 rounded-lg text-zinc-500 hover:text-red-400 hover:bg-red-500/10 flex items-center justify-center transition-colors cursor-pointer"
                          title="Delete company"
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
        )}
      </div>

      {/* ─── Modals ──────────────────────────────────────────────────── */}
      {showAddModal && (
        <CompanyFormModal
          mode="add"
          onSuccess={handleAddSuccess}
          onClose={() => setShowAddModal(false)}
        />
      )}

      {editCompany && (
        <CompanyFormModal
          mode="edit"
          company={editCompany}
          onSuccess={handleEditSuccess}
          onClose={() => setEditCompany(null)}
        />
      )}

      {deleteCompany && (
        <DeleteConfirmation
          company={deleteCompany}
          loading={deleteLoading}
          onConfirm={handleDelete}
          onCancel={() => setDeleteCompany(null)}
        />
      )}

      <style jsx global>{`
        @keyframes companyScaleIn {
          from { opacity: 0; transform: scale(0.95); }
          to { opacity: 1; transform: scale(1); }
        }
      `}</style>
    </div>
  )
}

// ─── Page Export (wrapped in Toast Provider) ─────────────────────────────
export default function CompaniesPage() {
  return (
    <ToastProvider>
      <CompaniesContent />
    </ToastProvider>
  )
}
