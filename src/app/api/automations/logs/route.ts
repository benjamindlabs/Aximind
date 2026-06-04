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
      return NextResponse.json({ error: 'No workspace found' }, { status: 400 })
    }
    
    const { searchParams } = new URL(request.url)
    const automationId = searchParams.get('automationId')
    const limit = parseInt(searchParams.get('limit') || '50')
    
    let query = supabase
      .from('automation_logs')
      .select('*')
      .eq('workspace_id', workspaceId)
      .order('executed_at', { ascending: false })
      .limit(limit)
    
    if (automationId) {
      query = query.eq('automation_id', automationId)
    }
    
    const { data: logs } = await query
    
    return NextResponse.json(logs || [])
  } catch (error: any) {
    return NextResponse.json({ error: error.message }, { status: 500 })
  }
}
