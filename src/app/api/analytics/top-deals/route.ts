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

    const { data: deals, error } = await supabase
      .from('deals')
      .select('id, title, value, status, expected_close_date')
      .eq('workspace_id', workspaceId)
      .order('value', { ascending: false, nullsFirst: false })
      .limit(5)

    if (error) throw error

    return NextResponse.json(deals || [])
  } catch (error: any) {
    console.error('Top Deals error:', error?.message || 'Unknown error')
    return NextResponse.json({ error: error.message }, { status: 500 })
  }
}
