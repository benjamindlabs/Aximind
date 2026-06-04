'use client'

import * as React from 'react'
import {
  LineChart,
  Line,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
  BarChart,
  Bar,
} from 'recharts'
import { 
  DollarSign, 
  Target, 
  TrendingUp, 
  Activity,
  Calendar,
  AlertCircle,
  Loader2
} from 'lucide-react'

// Types
type SummaryData = {
  total_deals: number
  total_won_deals: number
  total_lost_deals: number
  total_revenue: number
  conversion_rate: number
  average_deal_size: number
}

type RevenueData = {
  label: string
  revenue: number
}

type PipelineData = {
  stage: string
  count: number
  value: number
}

type DealData = {
  id: string
  title: string
  value: number
  status: string
  expected_close_date: string
}

type ActivityData = {
  id: string
  type: string
  title: string
  occurred_at: string
  contact: { first_name: string; last_name: string } | null
  lead: { title: string } | null
  deal: { title: string } | null
}

const formatCurrency = (amount: number) => {
  return new Intl.NumberFormat('en-US', {
    style: 'currency',
    currency: 'USD',
    maximumFractionDigits: 0,
  }).format(amount)
}

const formatDate = (dateStr: string) => {
  return new Date(dateStr).toLocaleDateString('en-US', {
    month: 'short',
    day: 'numeric',
    year: 'numeric'
  })
}

// Custom tooltip for Revenue Chart
const CustomTooltip = ({ active, payload, label }: any) => {
  if (active && payload && payload.length) {
    return (
      <div className="bg-zinc-900 border border-zinc-800 p-3 rounded-lg shadow-xl">
        <p className="text-zinc-400 text-sm mb-1">{label}</p>
        <p className="text-indigo-400 font-bold">
          {formatCurrency(payload[0].value)}
        </p>
      </div>
    )
  }
  return null
}

// Custom tooltip for Pipeline Chart
const PipelineTooltip = ({ active, payload, label }: any) => {
  if (active && payload && payload.length) {
    return (
      <div className="bg-zinc-900 border border-zinc-800 p-3 rounded-lg shadow-xl">
        <p className="text-zinc-400 text-sm mb-1">{label}</p>
        <p className="text-zinc-200 font-medium">
          Deals: <span className="font-bold">{payload[0].value}</span>
        </p>
      </div>
    )
  }
  return null
}

export default function AnalyticsDashboard() {
  const [dateRange, setDateRange] = React.useState('365')
  
  const [summary, setSummary] = React.useState<SummaryData | null>(null)
  const [revenue, setRevenue] = React.useState<RevenueData[]>([])
  const [pipeline, setPipeline] = React.useState<PipelineData[]>([])
  const [topDeals, setTopDeals] = React.useState<DealData[]>([])
  const [activities, setActivities] = React.useState<ActivityData[]>([])
  
  const [isLoading, setIsLoading] = React.useState(true)
  const [error, setError] = React.useState<string | null>(null)

  const fetchData = React.useCallback(async () => {
    setIsLoading(true)
    setError(null)
    
    try {
      const [sumRes, revRes, pipeRes, dealsRes, actRes] = await Promise.all([
        fetch('/api/analytics/summary'),
        fetch(`/api/analytics/revenue?days=${dateRange}`),
        fetch('/api/analytics/pipeline'),
        fetch('/api/analytics/top-deals'),
        fetch('/api/analytics/recent-activity')
      ])

      if (!sumRes.ok || !revRes.ok || !pipeRes.ok || !dealsRes.ok || !actRes.ok) {
        throw new Error('Failed to fetch analytics data')
      }

      setSummary(await sumRes.json())
      setRevenue(await revRes.json())
      setPipeline(await pipeRes.json())
      setTopDeals(await dealsRes.json())
      setActivities(await actRes.json())
    } catch (err: any) {
      console.error(err)
      setError(err.message || 'An error occurred while loading analytics')
    } finally {
      setIsLoading(false)
    }
  }, [dateRange])

  React.useEffect(() => {
    fetchData()
  }, [fetchData])

  if (error) {
    return (
      <div className="h-full flex flex-col items-center justify-center text-center p-8">
        <AlertCircle className="h-12 w-12 text-red-500 mb-4" />
        <h2 className="text-xl font-bold text-white mb-2">Failed to load analytics</h2>
        <p className="text-zinc-400 mb-6">{error}</p>
        <button 
          onClick={() => fetchData()}
          className="px-4 py-2 bg-indigo-600 hover:bg-indigo-500 text-white rounded-lg transition-colors"
        >
          Try Again
        </button>
      </div>
    )
  }

  return (
    <div className="space-y-6 max-w-7xl mx-auto pb-12">
      {/* Header */}
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
        <div>
          <h1 className="text-2xl font-bold text-white">Analytics Dashboard</h1>
          <p className="text-zinc-400 text-sm mt-1">Track your business intelligence and pipeline trends.</p>
        </div>
        <div className="flex items-center gap-2 bg-zinc-900 border border-zinc-800 rounded-lg px-3 py-2">
          <Calendar className="h-4 w-4 text-zinc-400" />
          <select 
            value={dateRange}
            onChange={(e) => setDateRange(e.target.value)}
            className="bg-transparent text-sm text-zinc-200 focus:outline-none cursor-pointer"
          >
            <option value="7" className="bg-zinc-900 text-zinc-200">Last 7 Days</option>
            <option value="30" className="bg-zinc-900 text-zinc-200">Last 30 Days</option>
            <option value="90" className="bg-zinc-900 text-zinc-200">Last 90 Days</option>
            <option value="365" className="bg-zinc-900 text-zinc-200">Last 12 Months</option>
          </select>
        </div>
      </div>

      {isLoading && !summary ? (
        <div className="h-64 flex items-center justify-center">
          <Loader2 className="h-8 w-8 text-indigo-500 animate-spin" />
        </div>
      ) : (
        <>
          {/* KPI Cards */}
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
            <div className="bg-zinc-900 border border-zinc-800 rounded-xl p-5 shadow-sm">
              <div className="flex items-center justify-between mb-4">
                <p className="text-sm font-medium text-zinc-400">Total Revenue</p>
                <div className="h-8 w-8 rounded-lg bg-indigo-500/10 flex items-center justify-center">
                  <DollarSign className="h-4 w-4 text-indigo-400" />
                </div>
              </div>
              <h3 className="text-2xl font-bold text-white mb-1">
                {formatCurrency(summary?.total_revenue || 0)}
              </h3>
              <p className="text-xs text-emerald-400 flex items-center gap-1">
                <TrendingUp className="h-3 w-3" />
                From won deals
              </p>
            </div>

            <div className="bg-zinc-900 border border-zinc-800 rounded-xl p-5 shadow-sm">
              <div className="flex items-center justify-between mb-4">
                <p className="text-sm font-medium text-zinc-400">Won Deals</p>
                <div className="h-8 w-8 rounded-lg bg-emerald-500/10 flex items-center justify-center">
                  <Target className="h-4 w-4 text-emerald-400" />
                </div>
              </div>
              <h3 className="text-2xl font-bold text-white mb-1">
                {summary?.total_won_deals || 0}
              </h3>
              <p className="text-xs text-zinc-500">
                Out of {summary?.total_deals || 0} total deals
              </p>
            </div>

            <div className="bg-zinc-900 border border-zinc-800 rounded-xl p-5 shadow-sm">
              <div className="flex items-center justify-between mb-4">
                <p className="text-sm font-medium text-zinc-400">Conversion Rate</p>
                <div className="h-8 w-8 rounded-lg bg-violet-500/10 flex items-center justify-center">
                  <Activity className="h-4 w-4 text-violet-400" />
                </div>
              </div>
              <h3 className="text-2xl font-bold text-white mb-1">
                {(summary?.conversion_rate || 0).toFixed(1)}%
              </h3>
              <p className="text-xs text-zinc-500">
                Win percentage
              </p>
            </div>

            <div className="bg-zinc-900 border border-zinc-800 rounded-xl p-5 shadow-sm">
              <div className="flex items-center justify-between mb-4">
                <p className="text-sm font-medium text-zinc-400">Avg Deal Size</p>
                <div className="h-8 w-8 rounded-lg bg-blue-500/10 flex items-center justify-center">
                  <TrendingUp className="h-4 w-4 text-blue-400" />
                </div>
              </div>
              <h3 className="text-2xl font-bold text-white mb-1">
                {formatCurrency(summary?.average_deal_size || 0)}
              </h3>
              <p className="text-xs text-zinc-500">
                Per won deal
              </p>
            </div>
          </div>

          {/* Charts Row */}
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
            {/* Revenue Line Chart */}
            <div className="bg-zinc-900 border border-zinc-800 rounded-xl p-5 shadow-sm flex flex-col">
              <div className="mb-6">
                <h3 className="text-base font-semibold text-white">Revenue Over Time</h3>
                <p className="text-xs text-zinc-400 mt-1">
                  {dateRange === '365' ? 'Monthly revenue from won deals' : `Revenue trend for the last ${dateRange} days`}
                </p>
              </div>
              <div className="h-[300px] w-full">
                {isLoading ? (
                  <div className="w-full h-full flex items-center justify-center bg-zinc-900/50 rounded-lg animate-pulse">
                     <Loader2 className="h-6 w-6 text-zinc-600 animate-spin" />
                  </div>
                ) : revenue.length > 0 ? (
                  <ResponsiveContainer width="100%" height="100%" minHeight={0} minWidth={0}>
                    <LineChart data={revenue} margin={{ top: 5, right: 10, left: 10, bottom: 0 }}>
                      <CartesianGrid strokeDasharray="3 3" stroke="#27272a" vertical={false} />
                      <XAxis 
                        dataKey="label" 
                        stroke="#52525b" 
                        fontSize={12} 
                        tickLine={false}
                        axisLine={false}
                        dy={10}
                      />
                      <YAxis 
                        stroke="#52525b" 
                        fontSize={12} 
                        tickLine={false}
                        axisLine={false}
                        tickFormatter={(value) => `$${value >= 1000 ? (value / 1000).toFixed(0) + 'k' : value}`}
                        dx={-10}
                      />
                      <Tooltip content={<CustomTooltip />} cursor={{ stroke: '#3f3f46', strokeWidth: 1, strokeDasharray: '4 4' }} />
                      <Line 
                        type="monotone" 
                        dataKey="revenue" 
                        stroke="#818cf8" 
                        strokeWidth={3}
                        dot={{ r: 4, fill: '#818cf8', strokeWidth: 0 }}
                        activeDot={{ r: 6, fill: '#6366f1', stroke: '#c7d2fe', strokeWidth: 2 }}
                        animationDuration={1500}
                      />
                    </LineChart>
                  </ResponsiveContainer>
                ) : (
                  <div className="w-full h-full flex flex-col items-center justify-center text-zinc-500">
                    <DollarSign className="h-8 w-8 mb-2 opacity-20" />
                    <p className="text-sm">No revenue data for this period</p>
                  </div>
                )}
              </div>
            </div>

            {/* Pipeline Bar Chart */}
            <div className="bg-zinc-900 border border-zinc-800 rounded-xl p-5 shadow-sm flex flex-col">
              <div className="mb-6">
                <h3 className="text-base font-semibold text-white">Pipeline Funnel</h3>
                <p className="text-xs text-zinc-400 mt-1">Number of open deals per pipeline stage</p>
              </div>
              <div className="h-[300px] w-full">
                {isLoading ? (
                  <div className="w-full h-full flex items-center justify-center bg-zinc-900/50 rounded-lg animate-pulse">
                     <Loader2 className="h-6 w-6 text-zinc-600 animate-spin" />
                  </div>
                ) : pipeline.length > 0 ? (
                  <ResponsiveContainer width="100%" height="100%" minHeight={0} minWidth={0}>
                    <BarChart 
                      data={pipeline} 
                      layout="vertical"
                      margin={{ top: 5, right: 30, left: 20, bottom: 5 }}
                    >
                      <CartesianGrid strokeDasharray="3 3" stroke="#27272a" horizontal={false} />
                      <XAxis 
                        type="number" 
                        stroke="#52525b" 
                        fontSize={12} 
                        tickLine={false}
                        axisLine={false}
                        allowDecimals={false}
                      />
                      <YAxis 
                        type="category" 
                        dataKey="stage" 
                        stroke="#a1a1aa" 
                        fontSize={12} 
                        tickLine={false}
                        axisLine={false}
                        width={90}
                      />
                      <Tooltip content={<PipelineTooltip />} cursor={{ fill: '#27272a', opacity: 0.4 }} />
                      <Bar 
                        dataKey="count" 
                        fill="#6366f1" 
                        radius={[0, 4, 4, 0]}
                        animationDuration={1500}
                      />
                    </BarChart>
                  </ResponsiveContainer>
                ) : (
                  <div className="w-full h-full flex flex-col items-center justify-center text-zinc-500">
                    <Target className="h-8 w-8 mb-2 opacity-20" />
                    <p className="text-sm">No active pipeline data</p>
                  </div>
                )}
              </div>
            </div>
          </div>

          {/* Tables Row */}
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
            {/* Top Deals */}
            <div className="bg-zinc-900 border border-zinc-800 rounded-xl p-5 shadow-sm">
              <h3 className="text-base font-semibold text-white mb-4">Top 5 Deals</h3>
              <div className="overflow-x-auto">
                <table className="w-full text-sm text-left">
                  <thead className="text-xs text-zinc-400 bg-zinc-950/50 border-y border-zinc-800">
                    <tr>
                      <th className="px-4 py-3 font-medium">Deal Title</th>
                      <th className="px-4 py-3 font-medium">Value</th>
                      <th className="px-4 py-3 font-medium text-right">Status</th>
                    </tr>
                  </thead>
                  <tbody>
                    {topDeals.length > 0 ? topDeals.map((deal) => (
                      <tr key={deal.id} className="border-b border-zinc-800/60 last:border-0 hover:bg-zinc-800/30 transition-colors">
                        <td className="px-4 py-3 text-zinc-200 font-medium">{deal.title}</td>
                        <td className="px-4 py-3 text-emerald-400">{formatCurrency(deal.value || 0)}</td>
                        <td className="px-4 py-3 text-right">
                          <span className={`px-2 py-1 rounded-md text-[10px] font-medium uppercase tracking-wider ${
                            deal.status === 'won' ? 'bg-emerald-500/10 text-emerald-400 border border-emerald-500/20' : 
                            deal.status === 'open' ? 'bg-indigo-500/10 text-indigo-400 border border-indigo-500/20' : 
                            'bg-zinc-800 text-zinc-400 border border-zinc-700'
                          }`}>
                            {deal.status}
                          </span>
                        </td>
                      </tr>
                    )) : (
                      <tr>
                        <td colSpan={3} className="px-4 py-8 text-center text-zinc-500">No deals found</td>
                      </tr>
                    )}
                  </tbody>
                </table>
              </div>
            </div>

            {/* Recent Activity */}
            <div className="bg-zinc-900 border border-zinc-800 rounded-xl p-5 shadow-sm">
              <h3 className="text-base font-semibold text-white mb-4">Recent Activity</h3>
              <div className="space-y-4">
                {activities.length > 0 ? activities.map((activity) => (
                  <div key={activity.id} className="flex gap-4 p-3 rounded-lg hover:bg-zinc-800/30 transition-colors border border-transparent hover:border-zinc-800/60">
                    <div className="h-10 w-10 shrink-0 rounded-full bg-zinc-800 flex items-center justify-center">
                      <Activity className="h-4 w-4 text-zinc-400" />
                    </div>
                    <div className="flex-1 min-w-0">
                      <p className="text-sm font-medium text-zinc-200 truncate">
                        {activity.title}
                      </p>
                      <p className="text-xs text-zinc-400 truncate mt-0.5">
                        {activity.type.charAt(0).toUpperCase() + activity.type.slice(1)}
                        {activity.contact && ` • ${activity.contact.first_name} ${activity.contact.last_name}`}
                        {activity.deal && ` • ${activity.deal.title}`}
                      </p>
                    </div>
                    <div className="shrink-0 text-xs text-zinc-500">
                      {formatDate(activity.occurred_at)}
                    </div>
                  </div>
                )) : (
                  <div className="py-8 text-center text-zinc-500">No recent activity</div>
                )}
              </div>
            </div>
          </div>
        </>
      )}
    </div>
  )
}
