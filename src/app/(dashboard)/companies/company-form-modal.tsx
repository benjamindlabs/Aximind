'use client'

import * as React from 'react'
import { X, Loader2, ChevronDown } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { cn } from '@/lib/utils'
import { createClient } from '@/lib/supabase/client'
import type { Company, CompanyFormData, CompanySize } from './types'
import { SIZE_OPTIONS, EMPTY_FORM_DATA } from './types'

interface CompanyFormModalProps {
  mode: 'add' | 'edit'
  company?: Company | null
  onSuccess: () => void
  onClose: () => void
}

// ─── Custom Select Component ────────────────────────────────────────────
function FormSelect({
  label,
  value,
  onChange,
  options,
}: {
  label: string
  value: string
  onChange: (v: string) => void
  options: { value: string; label: string }[]
}) {
  return (
    <div className="space-y-2">
      <label className="text-sm font-medium text-zinc-300">{label}</label>
      <div className="relative">
        <select
          value={value}
          onChange={(e) => onChange(e.target.value)}
          className="flex h-10 w-full rounded-lg border border-zinc-800 bg-zinc-900/50 px-3 py-2 text-sm text-white appearance-none cursor-pointer transition-colors focus-visible:outline-hidden focus-visible:border-indigo-500 focus-visible:ring-1 focus-visible:ring-indigo-500/30"
        >
          {options.map((opt) => (
            <option key={opt.value} value={opt.value} className="bg-zinc-900">
              {opt.label}
            </option>
          ))}
        </select>
        <ChevronDown className="absolute right-3 top-1/2 -translate-y-1/2 h-4 w-4 text-zinc-500 pointer-events-none" />
      </div>
    </div>
  )
}

// ─── Main Component ─────────────────────────────────────────────────────
export function CompanyFormModal({ mode, company, onSuccess, onClose }: CompanyFormModalProps) {
  const [formData, setFormData] = React.useState<CompanyFormData>(() => {
    if (mode === 'edit' && company) {
      return {
        name: company.name || '',
        industry: company.industry || '',
        website: company.website || '',
        phone: company.phone || '',
        email: company.email || '',
        address: company.address || '',
        city: company.city || '',
        country: company.country || '',
        size: company.size || '',
        annual_revenue: company.annual_revenue !== null ? String(company.annual_revenue) : '',
        notes: company.notes || '',
      }
    }
    return { ...EMPTY_FORM_DATA }
  })

  const [loading, setLoading] = React.useState(false)
  const [error, setError] = React.useState<string | null>(null)

  // Close on Escape
  React.useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape' && !loading) onClose()
    }
    document.addEventListener('keydown', handleKeyDown)
    return () => document.removeEventListener('keydown', handleKeyDown)
  }, [loading, onClose])

  const updateField = <K extends keyof CompanyFormData>(key: K, value: CompanyFormData[K]) => {
    setFormData((prev) => ({ ...prev, [key]: value }))
  }

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setError(null)

    // Validation
    if (!formData.name.trim()) {
      setError('Company name is required.')
      return
    }

    if (formData.email && !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(formData.email)) {
      setError('Please enter a valid email address.')
      return
    }

    setLoading(true)

    try {
      const supabase = createClient()

      // Convert fields
      const annualRevenueVal = formData.annual_revenue.trim() 
        ? parseFloat(formData.annual_revenue.trim()) 
        : null

      if (annualRevenueVal !== null && isNaN(annualRevenueVal)) {
        setError('Annual revenue must be a valid number.')
        setLoading(false)
        return
      }

      if (mode === 'add') {
        // Fetch workspace_id using CRITICAL workspace pattern
        let workspaceId: string | null = null

        const { data: membership } = await supabase
          .from('workspace_members')
          .select('workspace_id')
          .limit(1)
          .single()

        if (membership?.workspace_id) {
          workspaceId = membership.workspace_id
        } else {
          setError('No workspace found. Please create a workspace first.')
          setLoading(false)
          return
        }

        const insertData: Record<string, unknown> = {
          workspace_id: workspaceId,
          name: formData.name.trim(),
          industry: formData.industry.trim() || null,
          website: formData.website.trim() || null,
          phone: formData.phone.trim() || null,
          email: formData.email.trim() || null,
          address: formData.address.trim() || null,
          city: formData.city.trim() || null,
          country: formData.country.trim() || null,
          size: formData.size || null,
          annual_revenue: annualRevenueVal,
          notes: formData.notes.trim() || null,
        }

        const { error: insertError } = await supabase
          .from('companies')
          .insert(insertData as any)

        if (insertError) throw insertError
      } else {
        // Edit mode
        const updateData: Record<string, unknown> = {
          name: formData.name.trim(),
          industry: formData.industry.trim() || null,
          website: formData.website.trim() || null,
          phone: formData.phone.trim() || null,
          email: formData.email.trim() || null,
          address: formData.address.trim() || null,
          city: formData.city.trim() || null,
          country: formData.country.trim() || null,
          size: formData.size || null,
          annual_revenue: annualRevenueVal,
          notes: formData.notes.trim() || null,
        }

        const { error: updateError } = await supabase
          .from('companies')
          .update(updateData as any)
          .eq('id', company!.id)

        if (updateError) throw updateError
      }

      onSuccess()
    } catch (err: any) {
      console.error('Error saving company:', err?.message || 'Unknown error')
      setError(err?.message || 'An unexpected error occurred. Please try again.')
    } finally {
      setLoading(false)
    }
  }

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center">
      {/* Backdrop */}
      <div
        className="absolute inset-0 bg-black/60 backdrop-blur-sm animate-[companyFadeIn_0.15s_ease-out]"
        onClick={loading ? undefined : onClose}
      />

      {/* Modal */}
      <div className="relative bg-zinc-900 border border-zinc-800 rounded-2xl shadow-2xl w-full max-w-lg mx-4 animate-[companyScaleIn_0.2s_ease-out] max-h-[90vh] flex flex-col">
        {/* Header */}
        <div className="flex items-center justify-between px-6 py-4 border-b border-zinc-800/60 shrink-0">
          <h2 className="text-lg font-semibold text-white">
            {mode === 'add' ? 'Add Company' : 'Edit Company'}
          </h2>
          <button
            onClick={onClose}
            disabled={loading}
            className="h-8 w-8 rounded-lg text-zinc-500 hover:text-zinc-300 hover:bg-zinc-800 flex items-center justify-center transition-colors cursor-pointer disabled:opacity-50"
          >
            <X className="h-4 w-4" />
          </button>
        </div>

        {/* Form */}
        <form onSubmit={handleSubmit} className="overflow-y-auto flex-1">
          <div className="px-6 py-5 space-y-4">
            {/* Error message */}
            {error && (
              <div className="bg-red-500/10 border border-red-500/20 rounded-lg px-4 py-3 text-sm text-red-300">
                {error}
              </div>
            )}

            {/* Company Name & Industry */}
            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <label className="text-sm font-medium text-zinc-300">
                  Company Name <span className="text-red-400">*</span>
                </label>
                <Input
                  value={formData.name}
                  onChange={(e) => updateField('name', e.target.value)}
                  placeholder="Acme Corp"
                  autoFocus
                />
              </div>
              <div className="space-y-2">
                <label className="text-sm font-medium text-zinc-300">Industry</label>
                <Input
                  value={formData.industry}
                  onChange={(e) => updateField('industry', e.target.value)}
                  placeholder="Technology"
                />
              </div>
            </div>

            {/* Website & Phone */}
            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <label className="text-sm font-medium text-zinc-300">Website</label>
                <Input
                  value={formData.website}
                  onChange={(e) => updateField('website', e.target.value)}
                  placeholder="https://example.com"
                />
              </div>
              <div className="space-y-2">
                <label className="text-sm font-medium text-zinc-300">Phone</label>
                <Input
                  value={formData.phone}
                  onChange={(e) => updateField('phone', e.target.value)}
                  placeholder="+1 (555) 123-4567"
                />
              </div>
            </div>

            {/* Email */}
            <div className="space-y-2">
              <label className="text-sm font-medium text-zinc-300">Email</label>
              <Input
                type="email"
                value={formData.email}
                onChange={(e) => updateField('email', e.target.value)}
                placeholder="info@acme.com"
              />
            </div>

            {/* Address */}
            <div className="space-y-2">
              <label className="text-sm font-medium text-zinc-300">Address</label>
              <Input
                value={formData.address}
                onChange={(e) => updateField('address', e.target.value)}
                placeholder="123 Main St"
              />
            </div>

            {/* City & Country */}
            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <label className="text-sm font-medium text-zinc-300">City</label>
                <Input
                  value={formData.city}
                  onChange={(e) => updateField('city', e.target.value)}
                  placeholder="San Francisco"
                />
              </div>
              <div className="space-y-2">
                <label className="text-sm font-medium text-zinc-300">Country</label>
                <Input
                  value={formData.country}
                  onChange={(e) => updateField('country', e.target.value)}
                  placeholder="United States"
                />
              </div>
            </div>

            {/* Company Size & Annual Revenue */}
            <div className="grid grid-cols-2 gap-4">
              <FormSelect
                label="Company Size"
                value={formData.size}
                onChange={(v) => updateField('size', v)}
                options={SIZE_OPTIONS}
              />
              <div className="space-y-2">
                <label className="text-sm font-medium text-zinc-300">Annual Revenue ($)</label>
                <Input
                  type="number"
                  value={formData.annual_revenue}
                  onChange={(e) => updateField('annual_revenue', e.target.value)}
                  placeholder="1000000"
                />
              </div>
            </div>

            {/* Notes */}
            <div className="space-y-2">
              <label className="text-sm font-medium text-zinc-300">Notes</label>
              <textarea
                value={formData.notes}
                onChange={(e) => updateField('notes', e.target.value)}
                placeholder="Add any notes about this company..."
                rows={3}
                className="flex w-full rounded-lg border border-zinc-800 bg-zinc-900/50 px-3 py-2.5 text-sm text-white placeholder-zinc-500 transition-colors focus-visible:outline-hidden focus-visible:border-indigo-500 focus-visible:ring-1 focus-visible:ring-indigo-500/30 resize-none"
              />
            </div>
          </div>

          {/* Footer */}
          <div className="px-6 py-4 border-t border-zinc-800/60 flex items-center justify-end gap-3 shrink-0">
            <Button type="button" variant="outline" onClick={onClose} disabled={loading}>
              Cancel
            </Button>
            <Button type="submit" disabled={loading}>
              {loading ? (
                <>
                  <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                  Saving...
                </>
              ) : (
                mode === 'add' ? 'Save Company' : 'Update Company'
              )}
            </Button>
          </div>
        </form>
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
