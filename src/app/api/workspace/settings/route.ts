import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'

export async function GET(request: NextRequest) {
  try {
    const supabase = await createClient()
    const { data: { user } } = await supabase.auth.getUser()
    if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

    const { data: membership } = await supabase
      .from('workspace_members')
      .select('workspace_id, role')
      .eq('user_id', user.id)
      .limit(1)
      .single()

    if (!membership?.workspace_id) {
      return NextResponse.json({ error: 'No workspace found' }, { status: 404 })
    }

    const { data: workspace, error } = await supabase
      .from('workspaces')
      .select('*')
      .eq('id', membership.workspace_id)
      .single()

    if (error) throw error

    return NextResponse.json({ ...workspace, userRole: membership.role })
  } catch (error: any) {
    console.error('Workspace GET error:', error?.message || 'Unknown error')
    return NextResponse.json({ error: error.message }, { status: 500 })
  }
}

export async function PUT(request: NextRequest) {
  try {
    const supabase = await createClient()
    const { data: { user } } = await supabase.auth.getUser()
    if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

    const { data: membership } = await supabase
      .from('workspace_members')
      .select('workspace_id, role')
      .eq('user_id', user.id)
      .limit(1)
      .single()

    if (!membership?.workspace_id) {
      return NextResponse.json({ error: 'No workspace found' }, { status: 404 })
    }

    if (membership.role !== 'owner' && membership.role !== 'admin') {
      return NextResponse.json({ error: 'Only admins or owners can update workspace settings' }, { status: 403 })
    }

    const updates = await request.json()

    const { data: workspace, error } = await supabase
      .from('workspaces')
      .update({
        name: updates.name,
        slug: updates.slug,
        logo_url: updates.logo_url,
        updated_at: new Date().toISOString()
      })
      .eq('id', membership.workspace_id)
      .select()
      .single()

    if (error) throw error

    return NextResponse.json(workspace)
  } catch (error: any) {
    console.error('Workspace PUT error:', error?.message || 'Unknown error')
    return NextResponse.json({ error: error.message }, { status: 500 })
  }
}
