'use client'

import * as React from 'react'
import { DragDropContext, Droppable, Draggable, DropResult } from '@hello-pangea/dnd'
import { MoreHorizontal, Edit, Trash2, Calendar, Building, User } from 'lucide-react'
import type { Deal, PipelineStage } from './types'
import { formatCurrency, formatDate, getProbabilityColor } from './utils'
import { createClient } from '@/lib/supabase/client'
import { useToast } from './toast'

interface KanbanBoardProps {
  stages: PipelineStage[]
  deals: Deal[]
  onDealMove: (dealId: string, newStageId: string) => void
  onEdit: (deal: Deal) => void
  onDelete: (deal: Deal) => void
}

export function KanbanBoard({ stages, deals, onDealMove, onEdit, onDelete }: KanbanBoardProps) {
  const { showToast } = useToast()
  
  // Group deals by stage locally for rendering
  const [boardData, setBoardData] = React.useState<Record<string, Deal[]>>({})

  React.useEffect(() => {
    const grouped = stages.reduce((acc, stage) => {
      acc[stage.id] = deals
        .filter(d => d.stage_id === stage.id)
        .sort((a, b) => new Date(b.created_at).getTime() - new Date(a.created_at).getTime())
      return acc
    }, {} as Record<string, Deal[]>)
    setBoardData(grouped)
  }, [stages, deals])

  const handleDragEnd = async (result: DropResult) => {
    const { source, destination, draggableId } = result

    // Dropped outside the board
    if (!destination) return

    // Dropped in the same position
    if (source.droppableId === destination.droppableId && source.index === destination.index) return

    const sourceStageId = source.droppableId
    const destStageId = destination.droppableId

    // Move locally first for optimistic UI
    const sourceDeals = [...(boardData[sourceStageId] || [])]
    const destDeals = sourceStageId === destStageId ? sourceDeals : [...(boardData[destStageId] || [])]
    
    const [movedDeal] = sourceDeals.splice(source.index, 1)
    movedDeal.stage_id = destStageId
    destDeals.splice(destination.index, 0, movedDeal)

    setBoardData(prev => ({
      ...prev,
      [sourceStageId]: sourceDeals,
      [destStageId]: destDeals
    }))

    // If stage changed, trigger the callback to save to DB
    if (sourceStageId !== destStageId) {
      onDealMove(draggableId, destStageId)
    }
  }

  const getStageTotal = (stageId: string) => {
    const stageDeals = boardData[stageId] || []
    return stageDeals.reduce((sum, d) => sum + (d.value || 0), 0)
  }

  if (stages.length === 0) {
    return (
      <div className="flex flex-col items-center justify-center h-64 bg-zinc-900/50 border border-zinc-800 rounded-xl">
        <p className="text-zinc-400">No pipeline stages found.</p>
        <p className="text-sm text-zinc-500 mt-2">Please set up a pipeline first.</p>
      </div>
    )
  }

  return (
    <div className="flex gap-4 overflow-x-auto pb-4 pt-2 h-[calc(100vh-280px)] min-h-[500px]">
      <DragDropContext onDragEnd={handleDragEnd}>
        {stages.map((stage) => (
          <div key={stage.id} className="flex flex-col min-w-[320px] max-w-[320px] bg-zinc-900/30 rounded-xl border border-zinc-800/60 shrink-0">
            {/* Stage Header */}
            <div className="p-4 border-b border-zinc-800/60 bg-zinc-900/50 rounded-t-xl shrink-0">
              <div className="flex items-center justify-between mb-1">
                <h3 className="font-semibold text-zinc-200">{stage.name}</h3>
                <span className="text-xs font-medium bg-zinc-800 text-zinc-400 px-2 py-0.5 rounded-full">
                  {boardData[stage.id]?.length || 0}
                </span>
              </div>
              <div className="flex items-center justify-between text-sm">
                <span className="text-zinc-500 font-medium">
                  {formatCurrency(getStageTotal(stage.id), 'USD')}
                </span>
                {stage.probability > 0 && (
                  <span className="text-zinc-600 text-xs">{stage.probability}% win</span>
                )}
              </div>
            </div>

            {/* Droppable Area */}
            <Droppable droppableId={stage.id}>
              {(provided, snapshot) => (
                <div
                  ref={provided.innerRef}
                  {...provided.droppableProps}
                  className={`flex-1 p-3 overflow-y-auto min-h-[150px] transition-colors ${
                    snapshot.isDraggingOver ? 'bg-zinc-800/30' : ''
                  }`}
                >
                  {(boardData[stage.id] || []).map((deal, index) => (
                    <Draggable key={deal.id} draggableId={deal.id} index={index}>
                      {(provided, snapshot) => (
                        <div
                          ref={provided.innerRef}
                          {...provided.draggableProps}
                          {...provided.dragHandleProps}
                          className={`mb-3 group relative bg-zinc-900 border rounded-xl p-4 shadow-sm hover:border-indigo-500/50 transition-all ${
                            snapshot.isDragging ? 'border-indigo-500 shadow-indigo-500/10 shadow-xl' : 'border-zinc-800'
                          }`}
                        >
                          {/* Actions menu hover */}
                          <div className="absolute top-3 right-3 opacity-0 group-hover:opacity-100 transition-opacity flex gap-1 bg-zinc-900/80 backdrop-blur p-1 rounded-lg border border-zinc-700">
                            <button
                              onClick={(e) => { e.stopPropagation(); onEdit(deal); }}
                              className="p-1 text-zinc-400 hover:text-white rounded hover:bg-zinc-700 transition-colors"
                              title="Edit Deal"
                            >
                              <Edit className="w-3.5 h-3.5" />
                            </button>
                            <button
                              onClick={(e) => { e.stopPropagation(); onDelete(deal); }}
                              className="p-1 text-red-400 hover:text-red-300 rounded hover:bg-red-500/20 transition-colors"
                              title="Delete Deal"
                            >
                              <Trash2 className="w-3.5 h-3.5" />
                            </button>
                          </div>

                          <div className="mb-3">
                            <h4 className="font-medium text-zinc-100 leading-tight mb-1 pr-8 truncate">
                              <a href={`/deals/${deal.id}`} className="hover:text-indigo-400 transition-colors block">
                                {deal.title}
                              </a>
                            </h4>
                            <div className="text-lg font-semibold text-zinc-200">
                              {formatCurrency(deal.value, deal.currency)}
                            </div>
                          </div>
                          
                          <div className="space-y-2 mt-4 pt-4 border-t border-zinc-800/50">
                            {deal.company && (
                              <div className="flex items-center text-xs text-zinc-400 gap-1.5 truncate">
                                <Building className="w-3.5 h-3.5 shrink-0" />
                                <span className="truncate">{deal.company.name}</span>
                              </div>
                            )}
                            {deal.contact && (
                              <div className="flex items-center text-xs text-zinc-400 gap-1.5 truncate">
                                <User className="w-3.5 h-3.5 shrink-0" />
                                <span className="truncate">{deal.contact.first_name} {deal.contact.last_name}</span>
                              </div>
                            )}
                            <div className="flex items-center justify-between text-xs mt-2">
                              {deal.expected_close_date ? (
                                <div className="flex items-center text-zinc-500 gap-1.5">
                                  <Calendar className="w-3.5 h-3.5 shrink-0" />
                                  <span>{formatDate(deal.expected_close_date)}</span>
                                </div>
                              ) : <span />}
                              <div className={getProbabilityColor(deal.probability)}>
                                {deal.probability}%
                              </div>
                            </div>
                          </div>
                        </div>
                      )}
                    </Draggable>
                  ))}
                  {provided.placeholder}
                </div>
              )}
            </Droppable>
          </div>
        ))}
      </DragDropContext>
    </div>
  )
}
