import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'
import { createClient as createSupabaseAdmin } from '@supabase/supabase-js'

export async function GET(request: NextRequest) {
  try {
    const supabase = await createClient()
    const { data: { user }, error: authError } = await supabase.auth.getUser()

    if (authError || !user) {
      return NextResponse.json({ success: false, error: 'Unauthorized' }, { status: 401 })
    }

    const supabaseAdmin = createSupabaseAdmin(
      process.env.NEXT_PUBLIC_SUPABASE_URL!,
      process.env.SUPABASE_SERVICE_ROLE_KEY!
    )

    // 1. Check if a profile exists for this user
    try {
      const { data: existingProfile, error: profileCheckError } = await supabaseAdmin
        .from('profiles')
        .select('id')
        .eq('id', user.id)
        .maybeSingle()

      if (profileCheckError) {
        console.error('Error checking profile:', profileCheckError)
        return NextResponse.json({ success: false, error: 'Failed to check profile existence' }, { status: 500 })
      }

      // 2. If profile does NOT exist, create it
      if (!existingProfile) {
        const fullName = user.user_metadata?.full_name || user.email?.split('@')[0] || 'User'
        
        const { error: profileCreateError } = await supabaseAdmin
          .from('profiles')
          .upsert({
            id: user.id,
            email: user.email,
            full_name: fullName,
            role: 'member'
          }, { onConflict: 'id', ignoreDuplicates: true })

        if (profileCreateError) {
          console.error('Failed to create profile:', profileCreateError)
          return NextResponse.json({ success: false, error: 'Failed to create user profile' }, { status: 500 })
        }
      }
    } catch (profileError: any) {
      console.error('Profile creation exception:', profileError)
      return NextResponse.json({ success: false, error: 'Exception occurred during profile creation' }, { status: 500 })
    }

    // 3. Check if user already has a workspace
    try {
      const { data: membership, error: membershipError } = await supabaseAdmin
        .from('workspace_members')
        .select('workspace_id')
        .eq('user_id', user.id)
        .limit(1)
        .maybeSingle()

      if (membershipError) {
        console.error('Error checking membership:', membershipError)
        return NextResponse.json({ success: false, error: 'Failed to check workspace membership' }, { status: 500 })
      }

      if (membership?.workspace_id) {
        // Fetch the workspace details
        const { data: workspace, error: workspaceError } = await supabaseAdmin
          .from('workspaces')
          .select('id, name, slug')
          .eq('id', membership.workspace_id)
          .single()

        if (workspaceError) {
          console.error('Error fetching existing workspace:', workspaceError)
          return NextResponse.json({ success: false, error: 'Failed to fetch existing workspace details' }, { status: 500 })
        }

        return NextResponse.json({
          success: true,
          message: 'Workspace already exists',
          workspace: workspace
        }, { status: 200 })
      }
    } catch (membershipCheckError: any) {
      console.error('Membership check exception:', membershipCheckError)
      return NextResponse.json({ success: false, error: 'Exception occurred while checking workspace membership' }, { status: 500 })
    }

    // 4. If no workspace exists: Create it
    let newWorkspace;
    try {
      const slug = `workspace-${user.id.slice(0, 8)}`.toLowerCase()

      const { data, error: createError } = await supabaseAdmin
        .from('workspaces')
        .insert({
          name: 'My Workspace',
          slug: slug,
          owner_id: user.id
        })
        .select('id, name, slug')
        .single()

      if (createError) {
        console.error('Failed to create workspace:', createError)
        return NextResponse.json({ success: false, error: 'Failed to create workspace' }, { status: 500 })
      }
      
      newWorkspace = data;
    } catch (workspaceCreateError: any) {
      console.error('Workspace creation exception:', workspaceCreateError)
      return NextResponse.json({ success: false, error: 'Exception occurred during workspace creation' }, { status: 500 })
    }

    // 5. Add user to workspace_members as 'owner'
    try {
      const { error: joinError } = await supabaseAdmin
        .from('workspace_members')
        .insert({
          workspace_id: newWorkspace.id,
          user_id: user.id,
          role: 'owner'
        })

      if (joinError) {
        console.error('Failed to add user to workspace:', joinError)
        return NextResponse.json({ success: false, error: 'Workspace created but failed to add member' }, { status: 500 })
      }
    } catch (joinException: any) {
      console.error('Workspace join exception:', joinException)
      return NextResponse.json({ success: false, error: 'Exception occurred while adding member to workspace' }, { status: 500 })
    }

    // 6. Return success message
    return NextResponse.json({
      success: true,
      message: 'Workspace created successfully',
      workspace: newWorkspace
    }, { status: 201 })

  } catch (error: any) {
    console.error('Setup workspace unhandled error:', error?.message || 'Unknown error')
    return NextResponse.json({ success: false, error: error.message || 'Internal server error' }, { status: 500 })
  }
}
