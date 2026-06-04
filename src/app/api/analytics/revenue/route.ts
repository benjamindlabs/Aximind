import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'

export async function GET(request: NextRequest) {
  try {
    const supabase = await createClient()
    const { data: { user } } = await supabase.auth.getUser()
    if (!user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const { data: membership } = await supabase
      .from('workspace_members')
      .select('workspace_id')
      .eq('user_id', user.id)
      .limit(1)
      .single()

    const workspaceId = membership?.workspace_id
    if (!workspaceId) {
      return NextResponse.json({ error: 'No workspace found' }, { status: 404 })
    }

    const { searchParams } = new URL(request.url)
    const daysParam = searchParams.get('days') || '365' // default 12 months (365 days)
    
    // Calculate start date
    const startDate = new Date()
    startDate.setDate(startDate.getDate() - parseInt(daysParam, 10))

    // Fetch won deals
    const { data: deals, error } = await supabase
      .from('deals')
      .select('value, expected_close_date, created_at')
      .eq('workspace_id', workspaceId)
      .eq('status', 'won')
      .gte('created_at', startDate.toISOString())

    if (error) throw error

    // Group by month
    const revenueByMonth = new Map<string, number>()
    
    // Initialize last 12 months with 0
    if (daysParam === '365') {
      for (let i = 11; i >= 0; i--) {
        const d = new Date()
        d.setMonth(d.getMonth() - i)
        const monthKey = d.toLocaleDateString('en-US', { month: 'short', year: 'numeric' })
        revenueByMonth.set(monthKey, 0)
      }
    } else {
      // For smaller ranges, just group by date or week, but since requirement says "month", 
      // let's do short date for small ranges, or just stick to month/day grouping depending on length.
      // To keep it simple and match requirements, we'll group by "Mon YY" or "Mon DD"
      const isShortRange = parseInt(daysParam, 10) <= 31;
      
      for (let i = parseInt(daysParam, 10); i >= 0; i--) {
        const d = new Date()
        d.setDate(d.getDate() - i)
        const key = isShortRange 
          ? d.toLocaleDateString('en-US', { month: 'short', day: 'numeric' })
          : d.toLocaleDateString('en-US', { month: 'short', year: 'numeric' });
        revenueByMonth.set(key, 0)
      }
    }

    deals.forEach(deal => {
      const d = new Date(deal.created_at)
      const isShortRange = parseInt(daysParam, 10) <= 31;
      const key = isShortRange 
        ? d.toLocaleDateString('en-US', { month: 'short', day: 'numeric' })
        : d.toLocaleDateString('en-US', { month: 'short', year: 'numeric' });
      
      if (revenueByMonth.has(key)) {
        revenueByMonth.set(key, (revenueByMonth.get(key) || 0) + (deal.value || 0))
      }
    })

    const chartData = Array.from(revenueByMonth.entries()).map(([label, revenue]) => ({
      label,
      revenue
    }))

    return NextResponse.json(chartData)
  } catch (error: any) {
    console.error('Revenue Analytics error:', error?.message || 'Unknown error')
    return NextResponse.json({ error: error.message }, { status: 500 })
  }
}
