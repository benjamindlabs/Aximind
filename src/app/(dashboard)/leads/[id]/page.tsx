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
  FileText,
  Loader2,
  Activity,
  MapPin,
  DollarSign,
  Building2,
  Users,
  Target,
  Sparkles,
  TrendingUp,
  XCircle,
  HelpCircle,
  AlertTriangle,
  Check,
} from 'lucide-react'
import { Button } from '@/components/ui/button'
import { cn } from '@/lib/utils'
import { createClient } from '@/lib/supabase/client'
import type { Lead, LeadStatus, LeadPriority } from '../types'
import {
  formatDate,
  formatCurrency,
  getStatusClasses,
  getStatusDotColor,
  getPriorityClasses,
  capitalize,
  getSourceLabel,
} from '../utils'
import { ToastProvider, useToast } from '../toast'

// ─── Info Row Component ─────────────────────────────────────────────────
function InfoRow({
  icon: Icon,
  label,
  value,
}: {
  icon: React.ComponentType<any>
  label: string
  value: React.ReactNode
}) {
  return (
    <div className="flex items-start gap-3 py-3">
      <div className="h-9 w-9 rounded-lg bg-zinc-800/60 border border-zinc-700/30 flex items-center justify-center shrink-0 mt-0.5">
        <Icon className="h-4 w-4 text-zinc-500" />
      </div>
      <div className="min-w-0 flex-1">
        <p className="text-xs text-zinc-500 font-medium uppercase tracking-wider mb-1">{label}</p>
        <div className="text-sm text-zinc-200">{value}</div>
      </div>
    </div>
  )
}

// ─── Skeleton Screen ───────────────────────────────────────────────────
function DetailSkeleton() {
  return (
    <div className="space-y-6 animate-pulse">
      <div className="h-8 w-24 rounded bg-zinc-800" />
      <div className="h-28 rounded-xl bg-zinc-900/50" />
      <div className="h-16 rounded-xl bg-zinc-900/50" />
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        <div className="lg:col-span-2 h-96 rounded-xl bg-zinc-900/50" />
        <div className="h-96 rounded-xl bg-zinc-900/50" />
      </div>
    </div>
  )
}

// ─── Main Content Component ─────────────────────────────────────────────
function LeadDetailContent() {
  const params = useParams()
  const router = useRouter()
  const { showToast } = useToast()

  const [lead, setLead] = React.useState<Lead | null>(null)
  const [loading, setLoading] = React.useState(true)
  const [notFound, setNotFound] = React.useState(false)
  const [statusUpdating, setStatusUpdating] = React.useState<string | null>(null)

  const leadId = params.id as string

  // Fetch lead with joins
  const fetchLeadDetails = React.useCallback(async () => {
    try {
      const supabase = createClient()
      const { data, error } = await supabase
        .from('leads')
        .select(`
          *,
          contacts (
            id,
            first_name,
            last_name,
            email,
            phone
          ),
          companies (
            id,
            name,
            industry
          )
        `)
        .eq('id', leadId)
        .single()

      if (error || !data) {
        setNotFound(true)
        return
      }

      setLead(data as unknown as Lead)
    } catch (err: any) {
      console.error('Error loading lead detail:', err?.message || 'Unknown error')
      setNotFound(true)
    } finally {
      setLoading(false)
    }
  }, [leadId])

  React.useEffect(() => {
    if (leadId) fetchLeadDetails()
  }, [leadId, fetchLeadDetails])

  // Update Status
  const handleUpdateStatus = async (newStatus: LeadStatus) => {
    if (!lead) return
    setStatusUpdating(newStatus)

    try {
      const supabase = createClient()
      const updateData: Record<string, any> = {
        status: newStatus,
        updated_at: new Date().toISOString(),
      }

      if (newStatus === 'converted') {
        updateData.converted_at = new Date().toISOString()
      }

      const { error } = await supabase
        .from('leads')
        .update(updateData)
        .eq('id', lead.id)

      if (error) throw error

      showToast('success', `Lead status updated to ${capitalize(newStatus)}.`)
      fetchLeadDetails()
    } catch (err: any) {
      console.error('Error updating status:', err?.message || 'Unknown error')
      showToast('error', err?.message || 'Failed to update status.')
    } finally {
      setStatusUpdating(null)
    }
  }

  if (loading) {
    return <DetailSkeleton />
  }

  if (notFound || !lead) {
    return (
      <div className="flex flex-col items-center justify-center min-h-[50vh] text-center space-y-4">
        <div className="bg-zinc-900 border border-zinc-800/80 rounded-2xl p-12 max-w-md shadow-xl">
          <h1 className="text-xl font-bold text-white mb-2">Lead Not Found</h1>
          <p className="text-sm text-zinc-400 mb-6">
            The lead you are looking for doesn&apos;t exist or has been deleted.
          </p>
          <Button variant="outline" onClick={() => router.push('/leads')}>
            <ArrowLeft className="h-4 w-4 mr-2" />
            Back to Leads
          </Button>
        </div>
      </div>
    )
  }

  // Pipeline helper variables
  const pipelineSteps = ['new', 'contacted', 'qualified', 'converted']
  const isFailed = lead.status === 'lost' || lead.status === 'unqualified'
  const currentStepIndex = isFailed ? -1 : pipelineSteps.indexOf(lead.status)

  // Associated Contact & Company details
  const contactName = lead.contacts
    ? [lead.contacts.first_name, lead.contacts.last_name].filter(Boolean).join(' ')
    : null
  const companyName = lead.companies?.name || null

  return (
    <div className="space-y-6 max-w-5xl">
      {/* ─── Back Button ───────────────────────────────────────────── */}
      <button
        onClick={() => router.push('/leads')}
        className="flex items-center gap-2 text-sm text-zinc-500 hover:text-zinc-300 transition-colors group cursor-pointer"
      >
        <ArrowLeft className="h-4 w-4 group-hover:-translate-x-0.5 transition-transform" />
        Back to Leads
      </button>

      {/* ─── Header Card ────────────────────────────────────────────── */}
      <div className="bg-zinc-900/50 border border-zinc-800/60 rounded-xl p-6 space-y-4">
        <div className="flex flex-wrap items-center justify-between gap-4">
          <div className="flex items-center gap-4">
            <div className="h-12 w-12 rounded-xl bg-indigo-500/10 border border-indigo-500/20 flex items-center justify-center text-indigo-400 shrink-0">
              <Target className="h-6 w-6" />
            </div>
            <div>
              <h1 className="text-xl font-bold text-white tracking-tight leading-tight mb-1.5">
                {lead.title}
              </h1>
              <div className="flex items-center gap-2.5">
                <span
                  className={cn(
                    'inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-medium border shrink-0',
                    getStatusClasses(lead.status)
                  )}
                >
                  <span className={cn('h-1.5 w-1.5 rounded-full', getStatusDotColor(lead.status))} />
                  {capitalize(lead.status)}
                </span>
                <span
                  className={cn(
                    'inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium border shrink-0',
                    getPriorityClasses(lead.priority)
                  )}
                >
                  {capitalize(lead.priority)} Priority
                </span>
              </div>
            </div>
          </div>

          {/* Quick status update buttons */}
          <div className="flex flex-wrap items-center gap-2">
            {lead.status === 'new' && (
              <>
                <Button
                  size="sm"
                  onClick={() => handleUpdateStatus('contacted')}
                  disabled={statusUpdating !== null}
                >
                  {statusUpdating === 'contacted' ? (
                    <Loader2 className="h-3.5 w-3.5 mr-1.5 animate-spin" />
                  ) : (
                    <Mail className="h-3.5 w-3.5 mr-1.5" />
                  )}
                  Mark as Contacted
                </Button>
                <Button
                  size="sm"
                  variant="outline"
                  className="hover:border-red-500/35 hover:text-red-400"
                  onClick={() => handleUpdateStatus('lost')}
                  disabled={statusUpdating !== null}
                >
                  Mark as Lost
                </Button>
              </>
            )}

            {lead.status === 'contacted' && (
              <>
                <Button
                  size="sm"
                  onClick={() => handleUpdateStatus('qualified')}
                  disabled={statusUpdating !== null}
                >
                  {statusUpdating === 'qualified' ? (
                    <Loader2 className="h-3.5 w-3.5 mr-1.5 animate-spin" />
                  ) : (
                    <TrendingUp className="h-3.5 w-3.5 mr-1.5" />
                  )}
                  Mark as Qualified
                </Button>
                <Button
                  size="sm"
                  variant="outline"
                  className="hover:border-red-500/35 hover:text-red-400"
                  onClick={() => handleUpdateStatus('lost')}
                  disabled={statusUpdating !== null}
                >
                  Mark as Lost
                </Button>
              </>
            )}

            {lead.status === 'qualified' && (
              <>
                <Button
                  size="sm"
                  className="bg-emerald-600 hover:bg-emerald-550 shadow-md shadow-emerald-600/10"
                  onClick={() => handleUpdateStatus('converted')}
                  disabled={statusUpdating !== null}
                >
                  {statusUpdating === 'converted' ? (
                    <Loader2 className="h-3.5 w-3.5 mr-1.5 animate-spin" />
                  ) : (
                    <Sparkles className="h-3.5 w-3.5 mr-1.5" />
                  )}
                  Mark as Converted
                </Button>
                <Button
                  size="sm"
                  variant="outline"
                  className="hover:border-red-500/35 hover:text-red-400"
                  onClick={() => handleUpdateStatus('lost')}
                  disabled={statusUpdating !== null}
                >
                  Mark as Lost
                </Button>
              </>
            )}
          </div>
        </div>

        {/* ─── Status Pipeline Bar ───────────────────────────────────── */}
        <div className="border-t border-zinc-800/60 pt-5">
          <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
            <span className="text-xs text-zinc-500 font-semibold uppercase tracking-wider">
              Journey Status
            </span>

            <div className="flex items-center gap-2 sm:gap-4 flex-wrap w-full sm:w-auto">
              {pipelineSteps.map((step, idx) => {
                const isActive = currentStepIndex >= idx
                const isCurrent = lead.status === step
                return (
                  <React.Fragment key={step}>
                    <div className="flex items-center gap-1.5">
                      <div
                        className={cn(
                          'h-6 w-6 rounded-full flex items-center justify-center text-[10px] font-bold border transition-all duration-300',
                          isCurrent
                            ? 'bg-indigo-650 border-indigo-500 text-white scale-110 shadow-md shadow-indigo-600/25'
                            : isActive
                            ? 'bg-zinc-800 border-zinc-700 text-zinc-300'
                            : 'bg-zinc-950/20 border-zinc-850 text-zinc-600'
                        )}
                      >
                        {isActive && !isCurrent ? (
                          <Check className="h-3 w-3 text-indigo-400" />
                        ) : (
                          idx + 1
                        )}
                      </div>
                      <span
                        className={cn(
                          'text-xs font-medium transition-colors duration-300',
                          isCurrent
                            ? 'text-indigo-400 font-semibold'
                            : isActive
                            ? 'text-zinc-300'
                            : 'text-zinc-650'
                        )}
                      >
                        {capitalize(step)}
                      </span>
                    </div>

                    {idx < pipelineSteps.length - 1 && (
                      <div
                        className={cn(
                          'hidden sm:block h-px w-8 transition-colors duration-300',
                          currentStepIndex > idx ? 'bg-indigo-600' : 'bg-zinc-800'
                        )}
                      />
                    )}
                  </React.Fragment>
                )
              })}

              {/* Lost or Unqualified terminal indicator */}
              {isFailed && (
                <>
                  <div className="hidden sm:block h-px w-8 bg-zinc-850" />
                  <div className="flex items-center gap-1.5 animate-[leadsScaleIn_0.2s_ease-out]">
                    <div className="h-6 w-6 rounded-full bg-red-950/40 border border-red-500/40 flex items-center justify-center text-red-400 shrink-0">
                      <XCircle className="h-3.5 w-3.5" />
                    </div>
                    <span className="text-xs font-semibold text-red-400">
                      {capitalize(lead.status)}
                    </span>
                  </div>
                </>
              )}
            </div>
          </div>
        </div>
      </div>

      {/* ─── Three Column Layout ────────────────────────────────────── */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Left Column (Wider): Lead Details */}
        <div className="lg:col-span-2 bg-zinc-900/50 border border-zinc-800/60 rounded-xl p-6">
          <h2 className="text-base font-semibold text-white mb-4">Opportunity Details</h2>
          
          <div className="grid grid-cols-1 md:grid-cols-2 gap-x-6 divide-y md:divide-y-0 divide-zinc-800/30">
            <div className="divide-y divide-zinc-800/30">
              <InfoRow
                icon={Target}
                label="Lead Status"
                value={
                  <span
                    className={cn(
                      'inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-xs font-medium border',
                      getStatusClasses(lead.status)
                    )}
                  >
                    {capitalize(lead.status)}
                  </span>
                }
              />
              <InfoRow
                icon={DollarSign}
                label="Estimated Value"
                value={
                  lead.estimated_value !== null ? (
                    <span className="text-white font-semibold text-base">
                      {formatCurrency(lead.estimated_value)}
                    </span>
                  ) : (
                    <span className="text-zinc-650 italic">Not set</span>
                  )
                }
              />
              <InfoRow
                icon={HelpCircle}
                label="Priority"
                value={
                  <span
                    className={cn(
                      'inline-flex items-center px-2 py-0.5 rounded-full text-xs font-medium border',
                      getPriorityClasses(lead.priority)
                    )}
                  >
                    {capitalize(lead.priority)}
                  </span>
                }
              />
              <InfoRow
                icon={Briefcase}
                label="Lead Source"
                value={getSourceLabel(lead.source)}
              />
            </div>

            <div className="divide-y divide-zinc-800/30">
              <InfoRow
                icon={Calendar}
                label="Created Date"
                value={formatDate(lead.created_at)}
              />
              <InfoRow
                icon={Clock}
                label="Last Updated"
                value={formatDate(lead.updated_at)}
              />
              {lead.converted_at && (
                <InfoRow
                  icon={TrendingUp}
                  label="Converted At"
                  value={formatDate(lead.converted_at)}
                />
              )}
            </div>
          </div>

          {/* Description Block */}
          {lead.description && (
            <div className="mt-6 pt-6 border-t border-zinc-800/60">
              <h3 className="text-xs text-zinc-500 font-semibold uppercase tracking-wider mb-2">
                Description
              </h3>
              <p className="text-sm text-zinc-350 leading-relaxed whitespace-pre-wrap">
                {lead.description}
              </p>
            </div>
          )}
        </div>

        {/* Right Column: Linked Contact & Linked Company Cards */}
        <div className="space-y-6">
          {/* Linked Contact Card */}
          <div className="bg-zinc-900/50 border border-zinc-800/60 rounded-xl p-5">
            <h2 className="text-xs text-zinc-500 font-semibold uppercase tracking-wider mb-4 flex items-center gap-1.5">
              <Users className="h-3.5 w-3.5 text-zinc-600" />
              Linked Contact
            </h2>

            {lead.contact_id && lead.contacts ? (
              <div className="space-y-4">
                <div className="flex items-center gap-3">
                  <div className="h-9 w-9 rounded-full bg-indigo-500/10 border border-indigo-500/20 text-indigo-400 flex items-center justify-center font-bold text-xs shrink-0">
                    {lead.contacts.first_name?.[0]?.toUpperCase() || '?'}
                  </div>
                  <div className="min-w-0">
                    <Link
                      href={`/contacts/${lead.contact_id}`}
                      className="text-sm font-semibold text-zinc-200 hover:text-indigo-400 transition-colors block truncate"
                    >
                      {contactName}
                    </Link>
                  </div>
                </div>

                <div className="space-y-2 border-t border-zinc-800/40 pt-3">
                  {lead.contacts.email && (
                    <div className="flex items-center gap-2 text-xs text-zinc-400">
                      <Mail className="h-3.5 w-3.5 text-zinc-650 shrink-0" />
                      <a href={`mailto:${lead.contacts.email}`} className="hover:text-indigo-300 transition-colors truncate">
                        {lead.contacts.email}
                      </a>
                    </div>
                  )}
                  {lead.contacts.phone && (
                    <div className="flex items-center gap-2 text-xs text-zinc-400">
                      <Phone className="h-3.5 w-3.5 text-zinc-650 shrink-0" />
                      <span>{lead.contacts.phone}</span>
                    </div>
                  )}
                </div>
              </div>
            ) : (
              <div className="text-center py-4 border border-dashed border-zinc-800/60 rounded-lg">
                <p className="text-xs text-zinc-600 italic">No contact linked</p>
              </div>
            )}
          </div>

          {/* Linked Company Card */}
          <div className="bg-zinc-900/50 border border-zinc-800/60 rounded-xl p-5">
            <h2 className="text-xs text-zinc-500 font-semibold uppercase tracking-wider mb-4 flex items-center gap-1.5">
              <Building2 className="h-3.5 w-3.5 text-zinc-600" />
              Linked Company
            </h2>

            {lead.company_id && lead.companies ? (
              <div className="space-y-3">
                <div className="flex items-center gap-3">
                  <div className="h-9 w-9 rounded-full bg-indigo-500/10 border border-indigo-500/20 text-indigo-400 flex items-center justify-center font-bold text-xs shrink-0">
                    {lead.companies.name?.[0]?.toUpperCase() || '?'}
                  </div>
                  <div className="min-w-0">
                    <Link
                      href={`/companies/${lead.company_id}`}
                      className="text-sm font-semibold text-zinc-200 hover:text-indigo-400 transition-colors block truncate"
                    >
                      {companyName}
                    </Link>
                    {lead.companies.industry && (
                      <p className="text-xs text-zinc-500 truncate mt-0.5">{lead.companies.industry}</p>
                    )}
                  </div>
                </div>
              </div>
            ) : (
              <div className="text-center py-4 border border-dashed border-zinc-800/60 rounded-lg">
                <p className="text-xs text-zinc-600 italic">No company linked</p>
              </div>
            )}
          </div>
        </div>
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
            Activities related to this lead opportunity will appear here.
          </p>
        </div>
      </div>
    </div>
  )
}

// ─── Page Export ─────────────────────────────────────────────────────────
export default function LeadDetailPage() {
  return (
    <ToastProvider>
      <LeadDetailContent />
    </ToastProvider>
  )
}
