'use client'

import * as React from 'react'
import { Plus, LayoutGrid, List, Search, TrendingUp, DollarSign, Target, Award } from 'lucide-react'
import { createClient } from '@/lib/supabase/client'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { KanbanBoard } from './kanban-board'
import { ListView } from './list-view'
import { DealFormModal } from './deal-form-modal'
import { DeleteConfirmation } from './delete-confirmation'
import { ToastProvider, useToast } from './toast'
import type { Deal, PipelineStage } from './types'
import { formatCurrency } from './utils'

type ViewMode = 'board' | 'list'

function DealsContent() {
  const { showToast } = useToast()
  
  const [deals, setDeals] = React.useState<Deal[]>([])
  const [stages, setStages] = React.useState<PipelineStage[]>([])
  const [loading, setLoading] = React.useState(true)
  
  const [viewMode, setViewMode] = React.useState<ViewMode>('board')
  const [searchQuery, setSearchQuery] = React.useState('')
  
  const [isFormOpen, setIsFormOpen] = React.useState(false)
  const [formMode, setFormMode] = React.useState<'add' | 'edit'>('add')
  const [selectedDeal, setSelectedDeal] = React.useState<Deal | null>(null)
  
  const [isDeleteOpen, setIsDeleteOpen] = React.useState(false)
  const [dealToDelete, setDealToDelete] = React.useState<Deal | null>(null)
  const [isDeleting, setIsDeleting] = React.useState(false)

  const fetchDealsAndStages = React.useCallback(async () => {
    try {
      setLoading(true)
      const supabase = createClient()
      
      let workspaceId: string | null = null
      const { data: membership } = await supabase
        .from('workspace_members')
        .select('workspace_id')
        .limit(1)
        .single()

      if (membership?.workspace_id) {
        workspaceId = membership.workspace_id
      } else {
        showToast('error', 'No workspace found.')
        return
      }

      // 1. Fetch Pipelines (to find default)
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
      } else {
        const { data: firstPipeline } = await supabase
          .from('pipelines')
          .select('id')
          .eq('workspace_id', workspaceId)
          .limit(1)
          .single()
        if (firstPipeline) currentPipelineId = firstPipeline.id
      }

      if (!currentPipelineId) {
        setLoading(false)
        return
      }

      // 2. Fetch Stages for this pipeline
      const { data: stageData } = await supabase
        .from('pipeline_stages')
        .select('*')
        .eq('pipeline_id', currentPipelineId)
        .order('position', { ascending: true })
      
      if (stageData) setStages(stageData)

      // 3. Fetch Deals for this pipeline with related company and contact
      const { data: dealData } = await supabase
        .from('deals')
        .select(`
          *,
          company:companies(name),
          contact:contacts(first_name, last_name, email)
        `)
        .eq('pipeline_id', currentPipelineId)
      
      if (dealData) setDeals(dealData as Deal[])

    } catch (error: any) {
      console.error('Error fetching deals:', error?.message || 'Unknown error')
      showToast('error', 'Failed to load deals.')
    } finally {
      setLoading(false)
    }
  }, [showToast])

  React.useEffect(() => {
    fetchDealsAndStages()
  }, [fetchDealsAndStages])

  const handleDealMove = async (dealId: string, newStageId: string) => {
    try {
      const supabase = createClient()
      const { error } = await supabase
        .from('deals')
        .update({ stage_id: newStageId })
        .eq('id', dealId)

      if (error) throw error
      
      // Update local state is mostly handled by KanbanBoard optimistically,
      // but we should refresh to get exact DB state or just trust the optimistic update
      // Let's do a quiet background refresh
      const { data: dealData } = await supabase
        .from('deals')
        .select(`*, company:companies(name), contact:contacts(first_name, last_name, email)`)
        .eq('id', dealId)
        .single()

      if (dealData) {
        setDeals(prev => prev.map(d => d.id === dealId ? (dealData as Deal) : d))
      }
      
    } catch (error: any) {
      console.error('Error moving deal:', error?.message || 'Unknown error')
      showToast('error', 'Failed to update deal stage.')
      fetchDealsAndStages() // revert on error
    }
  }

  const handleDelete = async () => {
    if (!dealToDelete) return
    setIsDeleting(true)
    try {
      const supabase = createClient()
      const { error } = await supabase
        .from('deals')
        .delete()
        .eq('id', dealToDelete.id)

      if (error) throw error

      showToast('success', 'Deal deleted successfully.')
      fetchDealsAndStages()
    } catch (error: any) {
      console.error('Error deleting deal:', error?.message || 'Unknown error')
      showToast('error', 'Failed to delete deal.')
    } finally {
      setIsDeleting(false)
      setIsDeleteOpen(false)
      setDealToDelete(null)
    }
  }

  const filteredDeals = React.useMemo(() => {
    if (!searchQuery) return deals
    const lowerQ = searchQuery.toLowerCase()
    return deals.filter(d => 
      d.title.toLowerCase().includes(lowerQ) ||
      d.company?.name.toLowerCase().includes(lowerQ) ||
      d.contact?.first_name.toLowerCase().includes(lowerQ)
    )
  }, [deals, searchQuery])

  // Stats
  const totalValue = deals.reduce((sum, d) => sum + (d.value || 0), 0)
  const wonDeals = deals.filter(d => d.status === 'won')
  const wonValue = wonDeals.reduce((sum, d) => sum + (d.value || 0), 0)
  const winRate = deals.length > 0 ? Math.round((wonDeals.length / deals.length) * 100) : 0

  return (
    <div className="flex flex-col h-[calc(100vh-2rem)] overflow-hidden">
      {/* Header & Stats */}
      <div className="shrink-0 mb-6 space-y-6">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
          <div>
            <h1 className="text-2xl font-bold text-white tracking-tight">Deals</h1>
            <p className="text-sm text-zinc-400 mt-1">Manage your sales pipeline and track opportunities.</p>
          </div>
          <Button 
            onClick={() => {
              setFormMode('add')
              setSelectedDeal(null)
              setIsFormOpen(true)
            }}
            className="w-full sm:w-auto bg-indigo-600 hover:bg-indigo-700 text-white shadow-lg shadow-indigo-500/20"
          >
            <Plus className="w-4 h-4 mr-2" />
            Add Deal
          </Button>
        </div>

        {/* Stats Ribbon */}
        <div className="grid grid-cols-1 sm:grid-cols-2 xl:grid-cols-4 gap-4">
          <div className="bg-zinc-900/50 border border-zinc-800/80 rounded-2xl p-4 flex items-center gap-4">
            <div className="w-12 h-12 rounded-xl bg-blue-500/10 flex items-center justify-center shrink-0">
              <Target className="w-6 h-6 text-blue-500" />
            </div>
            <div>
              <p className="text-sm font-medium text-zinc-400">Total Deals</p>
              <h3 className="text-2xl font-bold text-white">{deals.length}</h3>
            </div>
          </div>
          <div className="bg-zinc-900/50 border border-zinc-800/80 rounded-2xl p-4 flex items-center gap-4">
            <div className="w-12 h-12 rounded-xl bg-indigo-500/10 flex items-center justify-center shrink-0">
              <DollarSign className="w-6 h-6 text-indigo-500" />
            </div>
            <div>
              <p className="text-sm font-medium text-zinc-400">Pipeline Value</p>
              <h3 className="text-2xl font-bold text-white">{formatCurrency(totalValue)}</h3>
            </div>
          </div>
          <div className="bg-zinc-900/50 border border-zinc-800/80 rounded-2xl p-4 flex items-center gap-4">
            <div className="w-12 h-12 rounded-xl bg-emerald-500/10 flex items-center justify-center shrink-0">
              <Award className="w-6 h-6 text-emerald-500" />
            </div>
            <div>
              <p className="text-sm font-medium text-zinc-400">Won Revenue</p>
              <h3 className="text-2xl font-bold text-white">{formatCurrency(wonValue)}</h3>
            </div>
          </div>
          <div className="bg-zinc-900/50 border border-zinc-800/80 rounded-2xl p-4 flex items-center gap-4">
            <div className="w-12 h-12 rounded-xl bg-amber-500/10 flex items-center justify-center shrink-0">
              <TrendingUp className="w-6 h-6 text-amber-500" />
            </div>
            <div>
              <p className="text-sm font-medium text-zinc-400">Win Rate</p>
              <h3 className="text-2xl font-bold text-white">{winRate}%</h3>
            </div>
          </div>
        </div>

        {/* Toolbar */}
        <div className="flex flex-col sm:flex-row items-stretch sm:items-center justify-between gap-4">
          <div className="relative flex-1 max-w-sm min-w-[260px]">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-zinc-500" />
            <Input 
              placeholder="Search deals..." 
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="pl-9 bg-zinc-900/50 border-zinc-800"
            />
          </div>
          
          <div className="flex items-center bg-zinc-900/50 p-1 rounded-lg border border-zinc-800/80 self-start sm:self-auto shrink-0">
            <button
              onClick={() => setViewMode('board')}
              className={`p-2 rounded-md flex items-center gap-2 text-sm font-medium transition-colors ${
                viewMode === 'board' ? 'bg-zinc-800 text-white shadow-sm' : 'text-zinc-400 hover:text-zinc-200 hover:bg-zinc-800/50'
              }`}
            >
              <LayoutGrid className="w-4 h-4" />
              <span className="hidden sm:inline">Board</span>
            </button>
            <button
              onClick={() => setViewMode('list')}
              className={`p-2 rounded-md flex items-center gap-2 text-sm font-medium transition-colors ${
                viewMode === 'list' ? 'bg-zinc-800 text-white shadow-sm' : 'text-zinc-400 hover:text-zinc-200 hover:bg-zinc-800/50'
              }`}
            >
              <List className="w-4 h-4" />
              <span className="hidden sm:inline">List</span>
            </button>
          </div>
        </div>
      </div>

      {/* Main Content Area */}
      <div className="flex-1 overflow-hidden min-h-0">
        {loading ? (
          <div className="h-full flex items-center justify-center">
            <div className="flex flex-col items-center gap-4">
              <div className="w-8 h-8 border-4 border-indigo-500/30 border-t-indigo-500 rounded-full animate-spin" />
              <p className="text-sm text-zinc-500 font-medium animate-pulse">Loading deals...</p>
            </div>
          </div>
        ) : viewMode === 'board' ? (
          <KanbanBoard 
            stages={stages} 
            deals={filteredDeals} 
            onDealMove={handleDealMove}
            onEdit={(deal) => {
              setSelectedDeal(deal)
              setFormMode('edit')
              setIsFormOpen(true)
            }}
            onDelete={(deal) => {
              setDealToDelete(deal)
              setIsDeleteOpen(true)
            }}
          />
        ) : (
          <ListView 
            stages={stages} 
            deals={filteredDeals}
            onEdit={(deal) => {
              setSelectedDeal(deal)
              setFormMode('edit')
              setIsFormOpen(true)
            }}
            onDelete={(deal) => {
              setDealToDelete(deal)
              setIsDeleteOpen(true)
            }}
          />
        )}
      </div>

      {/* Modals */}
      {isFormOpen && (
        <DealFormModal
          mode={formMode}
          deal={selectedDeal}
          onClose={() => setIsFormOpen(false)}
          onSuccess={() => {
            setIsFormOpen(false)
            fetchDealsAndStages()
            showToast('success', formMode === 'add' ? 'Deal added successfully.' : 'Deal updated successfully.')
          }}
        />
      )}

      <DeleteConfirmation
        isOpen={isDeleteOpen}
        onClose={() => setIsDeleteOpen(false)}
        onConfirm={handleDelete}
        isDeleting={isDeleting}
        itemName={dealToDelete?.title}
      />
    </div>
  )
}

export default function DealsPage() {
  return (
    <ToastProvider>
      <DealsContent />
    </ToastProvider>
  )
}
