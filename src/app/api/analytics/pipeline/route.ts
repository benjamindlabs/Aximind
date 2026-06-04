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

    // Get pipeline stages
    const { data: stages } = await supabase
      .from('pipeline_stages')
      .select('id, name, position')
      .eq('workspace_id', workspaceId)
      .order('position')

    // Get open deals
    const { data: deals } = await supabase
      .from('deals')
      .select('stage_id, value')
      .eq('workspace_id', workspaceId)
      .eq('status', 'open')

    if (!stages || !deals) {
      throw new Error('Failed to fetch pipeline data')
    }

    const pipelineData = stages.map(stage => {
      const stageDeals = deals.filter(d => d.stage_id === stage.id)
      return {
        stage: stage.name,
        count: stageDeals.length,
        value: stageDeals.reduce((sum, d) => sum + (d.value || 0), 0)
      }
    })

    return NextResponse.json(pipelineData)
  } catch (error: any) {
    console.error('Pipeline Analytics error:', error?.message || 'Unknown error')
    return NextResponse.json({ error: error.message }, { status: 500 })
  }
}
