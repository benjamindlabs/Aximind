'use client'

import * as React from 'react'
import { Edit, Trash2, Building, User, ChevronRight } from 'lucide-react'
import type { Deal, PipelineStage } from './types'
import { formatCurrency, formatDate, getProbabilityColor, getStatusColor } from './utils'

interface ListViewProps {
  deals: Deal[]
  stages: PipelineStage[]
  onEdit: (deal: Deal) => void
  onDelete: (deal: Deal) => void
}

export function ListView({ deals, stages, onEdit, onDelete }: ListViewProps) {
  const getStageName = (stageId: string) => {
    return stages.find(s => s.id === stageId)?.name || 'Unknown Stage'
  }

  if (deals.length === 0) {
    return (
      <div className="flex flex-col items-center justify-center py-16 bg-zinc-900/50 border border-zinc-800 rounded-2xl">
        <div className="w-16 h-16 bg-zinc-800/50 rounded-full flex items-center justify-center mb-4">
          <Building className="w-8 h-8 text-zinc-500" />
        </div>
        <h3 className="text-lg font-medium text-white mb-2">No deals found</h3>
        <p className="text-zinc-400 max-w-md text-center">
          Get started by adding a new deal to your pipeline.
        </p>
      </div>
    )
  }

  return (
    <div className="bg-zinc-900/50 border border-zinc-800 rounded-2xl overflow-hidden shadow-xl">
      <div className="overflow-x-auto hidden lg:block">
        <table className="w-full text-sm text-left">
          <thead className="text-xs text-zinc-400 bg-zinc-900/80 border-b border-zinc-800 uppercase">
            <tr>
              <th className="px-6 py-4 font-medium">Deal Title</th>
              <th className="px-6 py-4 font-medium">Value</th>
              <th className="px-6 py-4 font-medium">Stage</th>
              <th className="px-6 py-4 font-medium">Probability</th>
              <th className="px-6 py-4 font-medium">Status</th>
              <th className="px-6 py-4 font-medium">Expected Close</th>
              <th className="px-6 py-4 font-medium text-right">Actions</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-zinc-800/60">
            {deals.map((deal) => (
              <tr 
                key={deal.id} 
                className="hover:bg-zinc-800/30 transition-colors group"
              >
                <td className="px-6 py-4">
                  <a href={`/deals/${deal.id}`} className="block group/link">
                    <div className="font-medium text-zinc-200 group-hover/link:text-indigo-400 transition-colors">
                      {deal.title}
                    </div>
                    <div className="flex items-center gap-3 mt-1">
                      {deal.company && (
                        <div className="flex items-center text-xs text-zinc-500 gap-1 truncate max-w-[120px]">
                          <Building className="w-3 h-3 shrink-0" />
                          <span className="truncate">{deal.company.name}</span>
                        </div>
                      )}
                      {deal.contact && (
                        <div className="flex items-center text-xs text-zinc-500 gap-1 truncate max-w-[120px]">
                          <User className="w-3 h-3 shrink-0" />
                          <span className="truncate">{deal.contact.first_name} {deal.contact.last_name}</span>
                        </div>
                      )}
                    </div>
                  </a>
                </td>
                <td className="px-6 py-4 font-medium text-zinc-200">
                  {formatCurrency(deal.value, deal.currency)}
                </td>
                <td className="px-6 py-4">
                  <span className="inline-flex items-center px-2 py-1 rounded-md bg-zinc-800 text-zinc-300 text-xs font-medium">
                    {getStageName(deal.stage_id)}
                  </span>
                </td>
                <td className="px-6 py-4">
                  <span className={`font-medium ${getProbabilityColor(deal.probability)}`}>
                    {deal.probability}%
                  </span>
                </td>
                <td className="px-6 py-4">
                  <span className={`inline-flex items-center px-2 py-1 rounded-full text-xs font-medium border ${getStatusColor(deal.status)}`}>
                    {deal.status.replace('_', ' ').charAt(0).toUpperCase() + deal.status.replace('_', ' ').slice(1)}
                  </span>
                </td>
                <td className="px-6 py-4 text-zinc-400">
                  {formatDate(deal.expected_close_date)}
                </td>
                <td className="px-6 py-4 text-right">
                  <div className="flex items-center justify-end gap-2 opacity-0 group-hover:opacity-100 transition-opacity">
                    <button
                      onClick={() => onEdit(deal)}
                      className="p-1.5 text-zinc-400 hover:text-white rounded-md hover:bg-zinc-700 transition-colors"
                      title="Edit Deal"
                    >
                      <Edit className="w-4 h-4" />
                    </button>
                    <button
                      onClick={() => onDelete(deal)}
                      className="p-1.5 text-zinc-400 hover:text-red-400 rounded-md hover:bg-red-500/10 transition-colors"
                      title="Delete Deal"
                    >
                      <Trash2 className="w-4 h-4" />
                    </button>
                    <a
                      href={`/deals/${deal.id}`}
                      className="p-1.5 text-zinc-400 hover:text-indigo-400 rounded-md hover:bg-indigo-500/10 transition-colors"
                      title="View Details"
                    >
                      <ChevronRight className="w-4 h-4" />
                    </a>
                  </div>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      <div className="lg:hidden flex flex-col divide-y divide-zinc-800/60">
        {deals.map((deal) => (
          <div key={deal.id} className="p-4 flex flex-col gap-3">
            <div className="flex items-start justify-between gap-3">
              <a href={`/deals/${deal.id}`} className="flex-1 min-w-0">
                <h3 className="text-sm font-semibold text-zinc-200 truncate pr-2 hover:text-indigo-400">{deal.title}</h3>
                <div className="flex items-center gap-2 mt-1">
                  <span className="inline-flex items-center px-2 py-0.5 rounded-md bg-zinc-800 text-zinc-300 text-[10px] font-medium">
                    {getStageName(deal.stage_id)}
                  </span>
                  <span className={`inline-flex items-center px-1.5 py-0.5 rounded-full text-[10px] font-medium border ${getStatusColor(deal.status)}`}>
                    {deal.status.replace('_', ' ').charAt(0).toUpperCase() + deal.status.replace('_', ' ').slice(1)}
                  </span>
                </div>
              </a>
              
              <div className="flex items-center gap-1 shrink-0">
                <button
                  onClick={() => onEdit(deal)}
                  className="h-10 w-10 rounded-lg text-zinc-500 hover:bg-indigo-500/10 hover:text-indigo-400 flex items-center justify-center"
                >
                  <Edit className="h-4 w-4" />
                </button>
                <button
                  onClick={() => onDelete(deal)}
                  className="h-10 w-10 rounded-lg text-zinc-500 hover:bg-red-500/10 hover:text-red-400 flex items-center justify-center"
                >
                  <Trash2 className="h-4 w-4" />
                </button>
              </div>
            </div>
            
            <div className="flex items-center gap-3 text-xs">
              {deal.company && (
                <div className="flex items-center text-zinc-400 gap-1 truncate max-w-[120px]">
                  <Building className="w-3.5 h-3.5 shrink-0" />
                  <span className="truncate">{deal.company.name}</span>
                </div>
              )}
              {deal.contact && (
                <div className="flex items-center text-zinc-400 gap-1 truncate max-w-[120px]">
                  <User className="w-3.5 h-3.5 shrink-0" />
                  <span className="truncate">{deal.contact.first_name}</span>
                </div>
              )}
            </div>

            <div className="grid grid-cols-2 gap-2 text-xs">
              <div className="flex flex-col">
                <span className="text-zinc-500">Value</span>
                <span className="text-zinc-300 font-medium">{formatCurrency(deal.value, deal.currency)}</span>
              </div>
              <div className="flex flex-col text-right">
                <span className="text-zinc-500">Probability</span>
                <span className={`font-medium ${getProbabilityColor(deal.probability)}`}>{deal.probability}%</span>
              </div>
            </div>
          </div>
        ))}
      </div>
    </div>
  )
}
