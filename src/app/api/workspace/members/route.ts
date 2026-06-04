import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'
import { createClient as createSupabaseClient } from '@supabase/supabase-js'

export async function GET(request: NextRequest) {
  try {
    const supabase = await createClient()
    const { data: { user } } = await supabase.auth.getUser()
    if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

    const { data: membership } = await supabase
      .from('workspace_members')
      .select('workspace_id')
      .eq('user_id', user.id)
      .limit(1)
      .single()

    if (!membership?.workspace_id) {
      return NextResponse.json({ error: 'No workspace found' }, { status: 404 })
    }

    const { data: members, error } = await supabase
      .from('workspace_members')
      .select(`
        id:user_id,
        role,
        created_at,
        profiles (
          full_name,
          email,
          avatar_url
        )
      `)
      .eq('workspace_id', membership.workspace_id)

    if (error) throw error

    const formattedMembers = members.map((m: any) => ({
      id: m.id,
      role: m.role,
      created_at: m.created_at,
      name: m.profiles?.full_name || 'Pending User',
      email: m.profiles?.email || '',
      avatar_url: m.profiles?.avatar_url || ''
    }))

    return NextResponse.json(formattedMembers)
  } catch (error: any) {
    console.error('Members GET error:', error?.message || 'Unknown error')
    return NextResponse.json({ error: error.message }, { status: 500 })
  }
}

export async function POST(request: NextRequest) {
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
      return NextResponse.json({ error: 'Only admins or owners can invite members' }, { status: 403 })
    }

    const { email, role } = await request.json()

    // Create admin client to invite user
    const adminAuthClient = createSupabaseClient(
      process.env.NEXT_PUBLIC_SUPABASE_URL!,
      process.env.SUPABASE_SERVICE_ROLE_KEY!
    ).auth.admin

    // Attempt to invite the user
    const { data: inviteData, error: inviteError } = await adminAuthClient.inviteUserByEmail(email)
    
    // User might already exist in the system but not in workspace
    let newUserId = inviteData?.user?.id

    if (inviteError) {
      if (inviteError.message.includes('already been registered')) {
        // User exists, find their ID
        const { data: existingUsers, error: listError } = await adminAuthClient.listUsers()
        if (!listError && existingUsers.users) {
          const found = existingUsers.users.find(u => u.email === email)
          if (found) newUserId = found.id
        }
      } else {
        throw inviteError
      }
    }

    if (!newUserId) {
      throw new Error('Failed to create or find user')
    }

    // Add to workspace_members
    const { error: insertError } = await supabase
      .from('workspace_members')
      .insert({
        workspace_id: membership.workspace_id,
        user_id: newUserId,
        role: role || 'member'
      })

    // It might throw a duplicate error if they are already in the workspace
    if (insertError) {
      if (insertError.code === '23505') {
        return NextResponse.json({ error: 'User is already a member of this workspace' }, { status: 400 })
      }
      throw insertError
    }

    return NextResponse.json({ success: true, message: 'User invited successfully' })
  } catch (error: any) {
    console.error('Members POST error:', error?.message || 'Unknown error')
    return NextResponse.json({ error: error.message }, { status: 500 })
  }
}
