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

    // Fetch all deals for this workspace
    const { data: deals, error } = await supabase
      .from('deals')
      .select('id, status, value')
      .eq('workspace_id', workspaceId)

    if (error) throw error

    const totalDeals = deals.length
    const wonDeals = deals.filter(d => d.status === 'won')
    const lostDeals = deals.filter(d => d.status === 'lost')

    const totalWonDeals = wonDeals.length
    const totalLostDeals = lostDeals.length

    const totalRevenue = wonDeals.reduce((sum, d) => sum + (d.value || 0), 0)
    const conversionRate = totalDeals > 0 ? (totalWonDeals / totalDeals) * 100 : 0
    const averageDealSize = totalWonDeals > 0 ? totalRevenue / totalWonDeals : 0

    return NextResponse.json({
      total_deals: totalDeals,
      total_won_deals: totalWonDeals,
      total_lost_deals: totalLostDeals,
      total_revenue: totalRevenue,
      conversion_rate: conversionRate,
      average_deal_size: averageDealSize
    })
  } catch (error: any) {
    console.error('Summary Analytics error:', error?.message || 'Unknown error')
    return NextResponse.json({ error: error.message }, { status: 500 })
  }
}
