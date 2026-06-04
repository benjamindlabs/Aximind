'use client'

import * as React from 'react'
import { ArrowLeft, Building, Calendar, DollarSign, Target, User, Clock, ChevronRight, Check } from 'lucide-react'
import { createClient } from '@/lib/supabase/client'
import { Button } from '@/components/ui/button'
import { ToastProvider, useToast } from '../toast'
import type { Deal, PipelineStage, DealStatus } from '../types'
import { formatCurrency, formatDate, getProbabilityColor, getStatusColor } from '../utils'

function DealDetailContent({ dealId }: { dealId: string }) {
  const { showToast } = useToast()
  
  const [deal, setDeal] = React.useState<Deal | null>(null)
  const [stages, setStages] = React.useState<PipelineStage[]>([])
  const [loading, setLoading] = React.useState(true)
  const [updating, setUpdating] = React.useState(false)

  const fetchDealData = React.useCallback(async () => {
    try {
      setLoading(true)
      const supabase = createClient()
      
      const { data: dealData, error: dealError } = await supabase
        .from('deals')
        .select(`
          *,
          company:companies(id, name, industry, website),
          contact:contacts(id, first_name, last_name, email, phone)
        `)
        .eq('id', dealId)
        .single()

      if (dealError) throw dealError
      setDeal(dealData as Deal)

      if (dealData?.pipeline_id) {
        const { data: stageData } = await supabase
          .from('pipeline_stages')
          .select('*')
          .eq('pipeline_id', dealData.pipeline_id)
          .order('position', { ascending: true })
        
        if (stageData) setStages(stageData)
      }
    } catch (error) {
      console.error('Error fetching deal:', error?.message || 'Unknown error')
      showToast('error', 'Failed to load deal details.')
    } finally {
      setLoading(false)
    }
  }, [dealId, showToast])

  React.useEffect(() => {
    fetchDealData()
  }, [fetchDealData])

  const handleStatusChange = async (newStatus: DealStatus) => {
    if (!deal) return
    try {
      setUpdating(true)
      const supabase = createClient()
      const { error } = await supabase
        .from('deals')
        .update({ status: newStatus })
        .eq('id', deal.id)

      if (error) throw error
      
      showToast('success', `Deal marked as ${newStatus}.`)
      fetchDealData()
    } catch (error) {
      console.error('Error updating status:', error?.message || 'Unknown error')
      showToast('error', 'Failed to update deal status.')
    } finally {
      setUpdating(false)
    }
  }

  if (loading) {
    return (
      <div className="flex-1 flex items-center justify-center">
        <div className="flex flex-col items-center gap-4">
          <div className="w-8 h-8 border-4 border-indigo-500/30 border-t-indigo-500 rounded-full animate-spin" />
          <p className="text-sm text-zinc-500 font-medium animate-pulse">Loading details...</p>
        </div>
      </div>
    )
  }

  if (!deal) {
    return (
      <div className="flex-1 flex items-center justify-center">
        <div className="text-center space-y-4">
          <p className="text-zinc-400">Deal not found.</p>
          <a href="/deals" className="text-indigo-400 hover:text-indigo-300">Return to Deals</a>
        </div>
      </div>
    )
  }

  const currentStageIndex = stages.findIndex(s => s.id === deal.stage_id)

  return (
    <div className="flex flex-col h-[calc(100vh-2rem)] overflow-y-auto pb-10">
      {/* Header */}
      <div className="mb-6 space-y-4">
        <a href="/deals" className="inline-flex items-center text-sm text-zinc-400 hover:text-white transition-colors">
          <ArrowLeft className="w-4 h-4 mr-2" />
          Back to Deals
        </a>
        
        <div className="flex items-start justify-between">
          <div>
            <h1 className="text-3xl font-bold text-white tracking-tight mb-2">{deal.title}</h1>
            <div className="flex items-center gap-4 text-sm">
              <span className={`inline-flex items-center px-2.5 py-1 rounded-full border ${getStatusColor(deal.status)}`}>
                {deal.status.replace('_', ' ').toUpperCase()}
              </span>
              <span className={`font-medium ${getProbabilityColor(deal.probability)} flex items-center gap-1.5`}>
                <Target className="w-4 h-4" />
                {deal.probability}% Probability
              </span>
              {deal.expected_close_date && (
                <span className="text-zinc-400 flex items-center gap-1.5">
                  <Calendar className="w-4 h-4" />
                  Expected Close: {formatDate(deal.expected_close_date)}
                </span>
              )}
            </div>
          </div>
          <div className="text-right">
            <div className="text-sm font-medium text-zinc-400 mb-1">Deal Value</div>
            <div className="text-4xl font-bold text-emerald-400">{formatCurrency(deal.value, deal.currency)}</div>
          </div>
        </div>

        {/* Quick Actions */}
        <div className="flex items-center gap-3 pt-2">
          {deal.status !== 'won' && (
            <Button 
              onClick={() => handleStatusChange('won')}
              disabled={updating}
              className="bg-emerald-500 hover:bg-emerald-600 text-white"
            >
              Mark as Won
            </Button>
          )}
          {deal.status !== 'lost' && (
            <Button 
              onClick={() => handleStatusChange('lost')}
              disabled={updating}
              variant="outline"
              className="border-red-500/20 text-red-400 hover:bg-red-500/10"
            >
              Mark as Lost
            </Button>
          )}
          {deal.status !== 'on_hold' && deal.status !== 'open' && (
             <Button 
             onClick={() => handleStatusChange('open')}
             disabled={updating}
             variant="outline"
             className="border-zinc-700 text-zinc-300 hover:bg-zinc-800"
           >
             Reopen Deal
           </Button>
          )}
        </div>
      </div>

      {/* Stage Progress Bar */}
      <div className="bg-zinc-900/50 border border-zinc-800/80 rounded-2xl p-6 mb-6">
        <h3 className="text-sm font-medium text-zinc-400 mb-6 uppercase tracking-wider">Pipeline Progress</h3>
        <div className="flex items-center w-full">
          {stages.map((stage, idx) => {
            const isCompleted = currentStageIndex > idx
            const isCurrent = currentStageIndex === idx
            
            return (
              <React.Fragment key={stage.id}>
                <div className="flex flex-col items-center relative z-10 w-32">
                  <div className={`w-8 h-8 rounded-full flex items-center justify-center border-2 transition-colors duration-300 ${
                    isCompleted ? 'bg-indigo-500 border-indigo-500 text-white' :
                    isCurrent ? 'bg-zinc-900 border-indigo-500 text-indigo-400 shadow-[0_0_15px_rgba(99,102,241,0.3)]' :
                    'bg-zinc-900 border-zinc-700 text-zinc-500'
                  }`}>
                    {isCompleted ? <Check className="w-4 h-4" /> : <span className="text-sm font-medium">{idx + 1}</span>}
                  </div>
                  <div className={`text-xs font-medium mt-3 text-center transition-colors duration-300 ${
                    isCurrent ? 'text-indigo-400' : 
                    isCompleted ? 'text-zinc-300' : 'text-zinc-500'
                  }`}>
                    {stage.name}
                  </div>
                </div>
                {idx < stages.length - 1 && (
                  <div className={`flex-1 h-1 -mx-8 z-0 transition-colors duration-300 ${
                    isCompleted ? 'bg-indigo-500' : 'bg-zinc-800'
                  }`} />
                )}
              </React.Fragment>
            )
          })}
        </div>
      </div>

      <div className="grid grid-cols-3 gap-6">
        {/* Deal Info */}
        <div className="col-span-2 space-y-6">
          <div className="bg-zinc-900/50 border border-zinc-800/80 rounded-2xl p-6">
            <h3 className="text-lg font-semibold text-white mb-4 flex items-center gap-2">
              <DollarSign className="w-5 h-5 text-indigo-400" />
              Deal Details
            </h3>
            
            <div className="space-y-4">
              <div>
                <div className="text-sm font-medium text-zinc-500 mb-1">Description / Notes</div>
                <div className="text-zinc-300 bg-zinc-900/50 p-4 rounded-xl border border-zinc-800/50 whitespace-pre-wrap">
                  {deal.description || 'No description provided.'}
                </div>
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div className="bg-zinc-900/50 p-4 rounded-xl border border-zinc-800/50 flex items-center gap-3">
                  <div className="w-10 h-10 rounded-lg bg-zinc-800 flex items-center justify-center shrink-0">
                    <Clock className="w-5 h-5 text-zinc-400" />
                  </div>
                  <div>
                    <div className="text-xs text-zinc-500 font-medium">Created On</div>
                    <div className="text-sm text-zinc-200">{formatDate(deal.created_at)}</div>
                  </div>
                </div>
                <div className="bg-zinc-900/50 p-4 rounded-xl border border-zinc-800/50 flex items-center gap-3">
                  <div className="w-10 h-10 rounded-lg bg-zinc-800 flex items-center justify-center shrink-0">
                    <Clock className="w-5 h-5 text-zinc-400" />
                  </div>
                  <div>
                    <div className="text-xs text-zinc-500 font-medium">Last Updated</div>
                    <div className="text-sm text-zinc-200">{formatDate(deal.updated_at)}</div>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>

        {/* Relations */}
        <div className="col-span-1 space-y-6">
          {/* Linked Company */}
          <div className="bg-zinc-900/50 border border-zinc-800/80 rounded-2xl p-6">
            <h3 className="text-sm font-medium text-zinc-400 uppercase tracking-wider mb-4 flex items-center justify-between">
              Linked Company
            </h3>
            {deal.company ? (
              <div className="group block bg-zinc-900 border border-zinc-800 hover:border-indigo-500/50 rounded-xl p-4 transition-colors">
                <div className="flex items-center gap-3 mb-3">
                  <div className="w-10 h-10 rounded-lg bg-indigo-500/10 flex items-center justify-center text-indigo-400 shrink-0">
                    <Building className="w-5 h-5" />
                  </div>
                  <div className="flex-1 min-w-0">
                    <h4 className="font-semibold text-white truncate">{deal.company.name}</h4>
                    {/*@ts-ignore*/}
                    <div className="text-xs text-zinc-500 truncate">{deal.company.industry || 'No industry set'}</div>
                  </div>
                </div>
                <a 
                  /*@ts-ignore*/
                  href={`/companies/${deal.company.id}`}
                  className="flex items-center justify-center w-full py-2 text-sm text-indigo-400 font-medium bg-indigo-500/10 rounded-lg group-hover:bg-indigo-500/20 transition-colors"
                >
                  View Company Profile
                  <ChevronRight className="w-4 h-4 ml-1" />
                </a>
              </div>
            ) : (
              <div className="text-center p-6 border border-dashed border-zinc-800 rounded-xl text-zinc-500 text-sm">
                No company linked to this deal.
              </div>
            )}
          </div>

          {/* Linked Contact */}
          <div className="bg-zinc-900/50 border border-zinc-800/80 rounded-2xl p-6">
            <h3 className="text-sm font-medium text-zinc-400 uppercase tracking-wider mb-4 flex items-center justify-between">
              Primary Contact
            </h3>
            {deal.contact ? (
              <div className="group block bg-zinc-900 border border-zinc-800 hover:border-indigo-500/50 rounded-xl p-4 transition-colors">
                <div className="flex items-center gap-3 mb-3">
                  <div className="w-10 h-10 rounded-lg bg-blue-500/10 flex items-center justify-center text-blue-400 shrink-0">
                    <User className="w-5 h-5" />
                  </div>
                  <div className="flex-1 min-w-0">
                    <h4 className="font-semibold text-white truncate">
                      {/*@ts-ignore*/}
                      {deal.contact.first_name} {deal.contact.last_name}
                    </h4>
                    {/*@ts-ignore*/}
                    <div className="text-xs text-zinc-500 truncate">{deal.contact.email || deal.contact.phone || 'No contact info'}</div>
                  </div>
                </div>
                <a 
                  /*@ts-ignore*/
                  href={`/contacts/${deal.contact.id}`}
                  className="flex items-center justify-center w-full py-2 text-sm text-indigo-400 font-medium bg-indigo-500/10 rounded-lg group-hover:bg-indigo-500/20 transition-colors"
                >
                  View Contact Profile
                  <ChevronRight className="w-4 h-4 ml-1" />
                </a>
              </div>
            ) : (
              <div className="text-center p-6 border border-dashed border-zinc-800 rounded-xl text-zinc-500 text-sm">
                No contact linked to this deal.
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  )
}

export default function DealDetailPage({ params }: { params: { id: string } }) {
  // Use React.use() to unwrap params if needed in newer Next.js versions, but for simplicity we'll just pass it
  // Actually Next.js 14/15 recommends not accessing params synchronously if it's dynamic, 
  // but in a client component we can just read it. Wait, params is a Promise in Next.js 15.
  // Better to unwrap it in a wrapper or pass it directly if we are sure of the Next version.
  // We'll use React.use() just in case.
  const resolvedParams = React.use(params as any) as { id: string }

  return (
    <ToastProvider>
      <DealDetailContent dealId={resolvedParams.id} />
    </ToastProvider>
  )
}
