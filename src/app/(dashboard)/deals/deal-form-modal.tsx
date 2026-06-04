'use client'

import * as React from 'react'
import { X, Loader2, ChevronDown } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { createClient } from '@/lib/supabase/client'
import type { Deal, DealFormData, PipelineStage } from './types'
import { STATUS_OPTIONS, CURRENCY_OPTIONS, EMPTY_FORM_DATA } from './types'

interface DealFormModalProps {
  mode: 'add' | 'edit'
  deal?: Deal | null
  onSuccess: () => void
  onClose: () => void
}

function FormSelect({
  label,
  value,
  onChange,
  options,
  placeholder = '',
  required = false
}: {
  label: string
  value: string
  onChange: (v: string) => void
  options: { value: string; label: string }[]
  placeholder?: string
  required?: boolean
}) {
  return (
    <div className="space-y-2">
      <label className="text-sm font-medium text-zinc-300">
        {label} {required && <span className="text-red-400">*</span>}
      </label>
      <div className="relative">
        <select
          value={value}
          onChange={(e) => onChange(e.target.value)}
          required={required}
          className="flex h-10 w-full rounded-lg border border-zinc-800 bg-zinc-900/50 px-3 py-2 text-sm text-white appearance-none cursor-pointer transition-colors focus-visible:outline-hidden focus-visible:border-indigo-500 focus-visible:ring-1 focus-visible:ring-indigo-500/30"
        >
          {placeholder && <option value="" disabled className="bg-zinc-900">{placeholder}</option>}
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

export function DealFormModal({ mode, deal, onSuccess, onClose }: DealFormModalProps) {
  const [formData, setFormData] = React.useState<DealFormData>(() => {
    if (mode === 'edit' && deal) {
      return {
        title: deal.title || '',
        description: deal.description || '',
        value: deal.value !== null ? String(deal.value) : '',
        currency: deal.currency || 'USD',
        probability: deal.probability !== null ? String(deal.probability) : '50',
        status: deal.status || 'open',
        expected_close_date: deal.expected_close_date ? deal.expected_close_date.split('T')[0] : '',
        stage_id: deal.stage_id || '',
        contact_id: deal.contact_id || '',
        company_id: deal.company_id || '',
      }
    }
    return { ...EMPTY_FORM_DATA }
  })

  const [loading, setLoading] = React.useState(false)
  const [fetchingData, setFetchingData] = React.useState(true)
  const [error, setError] = React.useState<string | null>(null)
  
  const [stages, setStages] = React.useState<PipelineStage[]>([])
  const [contacts, setContacts] = React.useState<{ id: string; name: string }[]>([])
  const [companies, setCompanies] = React.useState<{ id: string; name: string }[]>([])
  const [pipelineId, setPipelineId] = React.useState<string | null>(null)

  React.useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape' && !loading) onClose()
    }
    document.addEventListener('keydown', handleKeyDown)
    return () => document.removeEventListener('keydown', handleKeyDown)
  }, [loading, onClose])

  React.useEffect(() => {
    async function fetchData() {
      try {
        const supabase = createClient()
        
        let workspaceId: string | null = null
        const { data: membership } = await supabase
          .from('workspace_members')
          .select('workspace_id')
          .limit(1)
          .single()

        if (membership?.workspace_id) {
          workspaceId = membership.workspace_id
        }

        if (!workspaceId) {
          setError('No workspace found.')
          setFetchingData(false)
          return
        }

        // Fetch default pipeline
        let currentPipelineId = null
        const { data: defaultPipeline } = await supabase
          .from('pipelines')
          .select('id')
          .eq('workspace_id', workspaceId)
          .eq('is_default', true)
          .limit(1)
          .single()
        
        if (defaultPipeline) {
          currentPipelineId = defaultPipeline.id
          setPipelineId(currentPipelineId)
        } else {
          // Fallback to first pipeline
          const { data: firstPipeline } = await supabase
            .from('pipelines')
            .select('id')
            .eq('workspace_id', workspaceId)
            .limit(1)
            .single()
          
          if (firstPipeline) {
            currentPipelineId = firstPipeline.id
            setPipelineId(currentPipelineId)
          }
        }

        // Fetch stages
        if (currentPipelineId) {
          const { data: stageData } = await supabase
            .from('pipeline_stages')
            .select('*')
            .eq('pipeline_id', currentPipelineId)
            .order('position', { ascending: true })
          
          if (stageData) {
            setStages(stageData)
            if (mode === 'add' && stageData.length > 0 && !formData.stage_id) {
              setFormData(prev => ({ ...prev, stage_id: stageData[0].id }))
            }
          }
        }

        // Fetch contacts
        const { data: contactsData } = await supabase
          .from('contacts')
          .select('id, first_name, last_name')
          .eq('workspace_id', workspaceId)
          .order('first_name', { ascending: true })

        if (contactsData) {
          setContacts(contactsData.map(c => ({
            id: c.id,
            name: `${c.first_name} ${c.last_name || ''}`.trim()
          })))
        }

        // Fetch companies
        const { data: companiesData } = await supabase
          .from('companies')
          .select('id, name')
          .eq('workspace_id', workspaceId)
          .order('name', { ascending: true })
        
        if (companiesData) {
          setCompanies(companiesData.map(c => ({
            id: c.id,
            name: c.name
          })))
        }

      } catch (err: any) {
        console.error('Error fetching relational data:', err?.message || 'Unknown error')
      } finally {
        setFetchingData(false)
      }
    }

    fetchData()
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []) // Empty dependency array, we only run this once on mount

  const updateField = <K extends keyof DealFormData>(key: K, value: DealFormData[K]) => {
    setFormData((prev) => ({ ...prev, [key]: value }))
  }

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setError(null)

    if (!formData.title.trim()) {
      setError('Title is required.')
      return
    }

    if (!formData.stage_id) {
      setError('Stage is required.')
      return
    }

    setLoading(true)

    try {
      const supabase = createClient()
      
      const valueNum = parseFloat(formData.value) || 0
      const probNum = parseInt(formData.probability, 10) || 0

      if (mode === 'add') {
        let workspaceId: string | null = null
        const { data: membership } = await supabase
          .from('workspace_members')
          .select('workspace_id')
          .limit(1)
          .single()

        if (membership?.workspace_id) {
          workspaceId = membership.workspace_id
        } else {
          setError('No workspace found.')
          setLoading(false)
          return
        }

        const insertData: Record<string, unknown> = {
          workspace_id: workspaceId,
          pipeline_id: pipelineId,
          stage_id: formData.stage_id,
          title: formData.title.trim(),
          description: formData.description.trim() || null,
          value: valueNum,
          currency: formData.currency,
          probability: probNum,
          status: formData.status,
          expected_close_date: formData.expected_close_date || null,
          contact_id: formData.contact_id || null,
          company_id: formData.company_id || null,
        }

        const { error: insertError } = await supabase
          .from('deals')
          .insert(insertData as any)

        if (insertError) throw insertError
      } else {
        const updateData: Record<string, unknown> = {
          stage_id: formData.stage_id,
          title: formData.title.trim(),
          description: formData.description.trim() || null,
          value: valueNum,
          currency: formData.currency,
          probability: probNum,
          status: formData.status,
          expected_close_date: formData.expected_close_date || null,
          contact_id: formData.contact_id || null,
          company_id: formData.company_id || null,
        }

        const { error: updateError } = await supabase
          .from('deals')
          .update(updateData as any)
          .eq('id', deal!.id)

        if (updateError) throw updateError
      }

      onSuccess()
    } catch (err: any) {
      console.error('Error saving deal:', err?.message || 'Unknown error')
      setError(err?.message || 'An unexpected error occurred.')
    } finally {
      setLoading(false)
    }
  }

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center">
      <div className="absolute inset-0 bg-black/60 backdrop-blur-sm animate-[dealFadeIn_0.15s_ease-out]" onClick={loading ? undefined : onClose} />
      
      <div className="relative bg-zinc-950 border border-zinc-800 rounded-2xl shadow-2xl w-full max-w-2xl mx-4 animate-[dealScaleIn_0.2s_ease-out] max-h-[90vh] flex flex-col">
        {/* Header */}
        <div className="flex items-center justify-between px-6 py-4 border-b border-zinc-800/60 shrink-0 bg-zinc-900/50 rounded-t-2xl">
          <h2 className="text-lg font-semibold text-white">
            {mode === 'add' ? 'Add Deal' : 'Edit Deal'}
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
        {fetchingData ? (
          <div className="flex flex-col items-center justify-center p-12 space-y-4">
            <Loader2 className="w-8 h-8 text-indigo-500 animate-spin" />
            <p className="text-zinc-400 text-sm">Loading options...</p>
          </div>
        ) : (
          <form onSubmit={handleSubmit} className="overflow-y-auto flex-1">
            <div className="px-6 py-5 space-y-6">
              {error && (
                <div className="bg-red-500/10 border border-red-500/20 rounded-lg px-4 py-3 text-sm text-red-300">
                  {error}
                </div>
              )}

              {/* Deal Name & Pipeline Stage */}
              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-2">
                  <label className="text-sm font-medium text-zinc-300">
                    Deal Title <span className="text-red-400">*</span>
                  </label>
                  <Input
                    value={formData.title}
                    onChange={(e) => updateField('title', e.target.value)}
                    placeholder="Website Redesign"
                    autoFocus
                  />
                </div>
                <FormSelect
                  label="Pipeline Stage"
                  value={formData.stage_id}
                  onChange={(v) => updateField('stage_id', v)}
                  options={stages.map(s => ({ value: s.id, label: s.name }))}
                  required
                />
              </div>

              {/* Value & Currency */}
              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-2">
                  <label className="text-sm font-medium text-zinc-300">Value</label>
                  <Input
                    type="number"
                    value={formData.value}
                    onChange={(e) => updateField('value', e.target.value)}
                    placeholder="10000"
                    min="0"
                  />
                </div>
                <FormSelect
                  label="Currency"
                  value={formData.currency}
                  onChange={(v) => updateField('currency', v as any)}
                  options={CURRENCY_OPTIONS}
                />
              </div>

              {/* Probability & Status */}
              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-2">
                  <label className="text-sm font-medium text-zinc-300">Probability (%)</label>
                  <Input
                    type="number"
                    value={formData.probability}
                    onChange={(e) => updateField('probability', e.target.value)}
                    placeholder="50"
                    min="0"
                    max="100"
                  />
                </div>
                <FormSelect
                  label="Status"
                  value={formData.status}
                  onChange={(v) => updateField('status', v as any)}
                  options={STATUS_OPTIONS}
                />
              </div>

              {/* Close Date */}
              <div className="space-y-2">
                <label className="text-sm font-medium text-zinc-300">Expected Close Date</label>
                <Input
                  type="date"
                  value={formData.expected_close_date}
                  onChange={(e) => updateField('expected_close_date', e.target.value)}
                />
              </div>
              
              {/* Divider */}
              <div className="h-px bg-zinc-800/60 w-full my-4" />

              {/* Relations: Contact & Company */}
              <div className="grid grid-cols-2 gap-4">
                <FormSelect
                  label="Primary Contact"
                  value={formData.contact_id}
                  onChange={(v) => updateField('contact_id', v)}
                  options={contacts.map(c => ({ value: c.id, label: c.name }))}
                  placeholder="Select a contact (optional)"
                />
                <FormSelect
                  label="Company"
                  value={formData.company_id}
                  onChange={(v) => updateField('company_id', v)}
                  options={companies.map(c => ({ value: c.id, label: c.name }))}
                  placeholder="Select a company (optional)"
                />
              </div>

              {/* Description */}
              <div className="space-y-2">
                <label className="text-sm font-medium text-zinc-300">Description / Notes</label>
                <textarea
                  value={formData.description}
                  onChange={(e) => updateField('description', e.target.value)}
                  placeholder="Details about the deal..."
                  rows={4}
                  className="flex w-full rounded-lg border border-zinc-800 bg-zinc-900/50 px-3 py-2.5 text-sm text-white placeholder-zinc-500 transition-colors focus-visible:outline-hidden focus-visible:border-indigo-500 focus-visible:ring-1 focus-visible:ring-indigo-500/30 resize-none"
                />
              </div>
            </div>

            {/* Footer */}
            <div className="px-6 py-4 border-t border-zinc-800/60 bg-zinc-900/50 rounded-b-2xl flex items-center justify-end gap-3 shrink-0">
              <Button type="button" variant="outline" onClick={onClose} disabled={loading}>
                Cancel
              </Button>
              <Button type="submit" disabled={loading} className="bg-indigo-600 hover:bg-indigo-700 text-white">
                {loading ? (
                  <>
                    <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                    Saving...
                  </>
                ) : (
                  mode === 'add' ? 'Save Deal' : 'Update Deal'
                )}
              </Button>
            </div>
          </form>
        )}
      </div>

      <style jsx global>{`
        @keyframes dealFadeIn {
          from { opacity: 0; }
          to { opacity: 1; }
        }
        @keyframes dealScaleIn {
          from { opacity: 0; transform: scale(0.95); }
          to { opacity: 1; transform: scale(1); }
        }
      `}</style>
    </div>
  )
}
