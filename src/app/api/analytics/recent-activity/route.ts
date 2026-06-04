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

    const { data: activities, error } = await supabase
      .from('activities')
      .select(`
        id, type, title, occurred_at,
        contact:contacts(first_name, last_name),
        lead:leads(title),
        deal:deals(title)
      `)
      .eq('workspace_id', workspaceId)
      .order('occurred_at', { ascending: false })
      .limit(10)

    if (error) throw error

    return NextResponse.json(activities || [])
  } catch (error: any) {
    console.error('Recent Activity Analytics error:', error?.message || 'Unknown error')
    return NextResponse.json({ error: error.message }, { status: 500 })
  }
}
