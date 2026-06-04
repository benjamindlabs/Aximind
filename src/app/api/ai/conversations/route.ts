import { NextResponse } from 'next/server';
import { createClient } from '@/lib/supabase/server';

export async function GET(request: Request) {
  try {
    const supabase = await createClient();
    const { data: { user }, error: userError } = await supabase.auth.getUser();

    if (userError || !user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const { data: membership } = await supabase
      .from('workspace_members')
      .select('workspace_id')
      .limit(1)
      .single();

    if (!membership) {
      return NextResponse.json({ error: 'No workspace found' }, { status: 400 });
    }

    const { data, error } = await supabase
      .from('ai_conversations')
      .select('*')
      .eq('workspace_id', membership.workspace_id)
      .eq('user_id', user.id)
      .order('updated_at', { ascending: false });

    if (error) throw error;

    return NextResponse.json(data);
  } catch (error: any) {
    console.error('Error fetching conversations:', error?.message || 'Unknown error');
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}

export async function POST(request: Request) {
  try {
    const supabase = await createClient();
    const { data: { user }, error: userError } = await supabase.auth.getUser();

    if (userError || !user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const { data: membership } = await supabase
      .from('workspace_members')
      .select('workspace_id')
      .limit(1)
      .single();

    if (!membership) {
      return NextResponse.json({ error: 'No workspace found' }, { status: 400 });
    }

    const body = await request.json().catch(() => ({}));
    const title = body.title || 'New Conversation';

    const { data, error } = await supabase
      .from('ai_conversations')
      .insert([
        {
          workspace_id: membership.workspace_id,
          user_id: user.id,
          title: title,
        }
      ])
      .select()
      .single();

    if (error) throw error;

    return NextResponse.json(data);
  } catch (error: any) {
    console.error('Error creating conversation:', error?.message || 'Unknown error');
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}
