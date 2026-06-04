import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'

export async function PUT(request: NextRequest, { params }: { params: { id: string } }) {
  try {
    const targetUserId = params.id
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

    if (membership.role !== 'owner') {
      return NextResponse.json({ error: 'Only owners can change member roles' }, { status: 403 })
    }

    if (user.id === targetUserId) {
      return NextResponse.json({ error: 'Cannot change your own role' }, { status: 400 })
    }

    const { role } = await request.json()

    const { error } = await supabase
      .from('workspace_members')
      .update({ role })
      .eq('workspace_id', membership.workspace_id)
      .eq('user_id', targetUserId)

    if (error) throw error

    return NextResponse.json({ success: true })
  } catch (error: any) {
    console.error('Member update error:', error?.message || 'Unknown error')
    return NextResponse.json({ error: error.message }, { status: 500 })
  }
}

export async function DELETE(request: NextRequest, { params }: { params: { id: string } }) {
  try {
    const targetUserId = params.id
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
      return NextResponse.json({ error: 'Only admins or owners can remove members' }, { status: 403 })
    }

    if (user.id === targetUserId) {
      return NextResponse.json({ error: 'Cannot remove yourself from the workspace' }, { status: 400 })
    }

    const { error } = await supabase
      .from('workspace_members')
      .delete()
      .eq('workspace_id', membership.workspace_id)
      .eq('user_id', targetUserId)

    if (error) throw error

    return NextResponse.json({ success: true })
  } catch (error: any) {
    console.error('Member delete error:', error?.message || 'Unknown error')
    return NextResponse.json({ error: error.message }, { status: 500 })
  }
}
