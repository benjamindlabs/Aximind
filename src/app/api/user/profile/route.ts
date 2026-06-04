import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'

export async function GET(request: NextRequest) {
  try {
    const supabase = await createClient()
    const { data: { user }, error: authError } = await supabase.auth.getUser()
    
    if (authError || !user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const { data: profile, error: profileError } = await supabase
      .from('profiles')
      .select('id, full_name, email, avatar_url, role')
      .eq('id', user.id)
      .single()

    if (profileError && profileError.code !== 'PGRST116') {
      throw profileError
    }

    return NextResponse.json(profile || { 
      id: user.id, 
      email: user.email, 
      full_name: user.user_metadata?.full_name || '',
      avatar_url: user.user_metadata?.avatar_url || ''
    })
  } catch (error: any) {
    console.error('Profile GET error:', error?.message || 'Unknown error')
    return NextResponse.json({ error: error.message }, { status: 500 })
  }
}

export async function PUT(request: NextRequest) {
  try {
    const supabase = await createClient()
    const { data: { user }, error: authError } = await supabase.auth.getUser()
    
    if (authError || !user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const updates = await request.json()

    const { data: profile, error } = await supabase
      .from('profiles')
      .update({
        full_name: updates.full_name,
        avatar_url: updates.avatar_url,
        updated_at: new Date().toISOString(),
      })
      .eq('id', user.id)
      .select()
      .single()

    // If update fails because profile doesn't exist yet, insert it
    if (error && error.code === 'PGRST116') {
      const { data: newProfile, error: insertError } = await supabase
        .from('profiles')
        .insert({
          id: user.id,
          email: user.email!,
          full_name: updates.full_name,
          avatar_url: updates.avatar_url,
        })
        .select()
        .single()
        
      if (insertError) throw insertError
      return NextResponse.json(newProfile)
    } else if (error) {
      throw error
    }

    // Also update auth metadata
    await supabase.auth.updateUser({
      data: { 
        full_name: updates.full_name,
        avatar_url: updates.avatar_url
      }
    })

    return NextResponse.json(profile)
  } catch (error: any) {
    console.error('Profile PUT error:', error?.message || 'Unknown error')
    return NextResponse.json({ error: error.message }, { status: 500 })
  }
}
