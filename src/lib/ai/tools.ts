import { createClient } from '@/lib/supabase/server'
import { z } from 'zod'
import { checkTriggers } from '@/lib/automation/engine'

// Get workspace ID helper
async function getWorkspaceId(): Promise<string | null> {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return null

  const { data: membership } = await supabase
    .from('workspace_members')
    .select('workspace_id')
    .eq('user_id', user.id)
    .limit(1)
    .single()

  return membership?.workspace_id || null
}

// ── TOOL HANDLERS ────────────────────────────────────────────

export async function getContacts(args: {
  status?: string
  search?: string
  limit?: number
}) {
  const supabase = await createClient()
  const workspaceId = await getWorkspaceId()
  if (!workspaceId) return { error: 'No workspace found' }

  let query = supabase
    .from('contacts')
    .select('id, first_name, last_name, email, phone, job_title, status, source, created_at')
    .eq('workspace_id', workspaceId)
    .limit(args.limit || 20)

  if (args.status) query = query.eq('status', args.status)
  if (args.search) query = query.or(`first_name.ilike.%${args.search}%,last_name.ilike.%${args.search}%,email.ilike.%${args.search}%`)

  const { data, error } = await query
  if (error) return { error: error.message }
  return { contacts: data, count: data?.length || 0 }
}

export async function getLeads(args: {
  status?: string
  priority?: string
  search?: string
  limit?: number
}) {
  const supabase = await createClient()
  const workspaceId = await getWorkspaceId()
  if (!workspaceId) return { error: 'No workspace found' }

  let query = supabase
    .from('leads')
    .select('id, title, status, priority, estimated_value, source, created_at')
    .eq('workspace_id', workspaceId)
    .limit(args.limit || 20)

  if (args.status) query = query.eq('status', args.status)
  if (args.priority) query = query.eq('priority', args.priority)
  if (args.search) query = query.ilike('title', `%${args.search}%`)

  const { data, error } = await query
  if (error) return { error: error.message }
  return { leads: data, count: data?.length || 0 }
}

export async function getDeals(args: {
  status?: string
  stage_id?: string
  search?: string
  limit?: number
}) {
  const supabase = await createClient()
  const workspaceId = await getWorkspaceId()
  if (!workspaceId) return { error: 'No workspace found' }

  let query = supabase
    .from('deals')
    .select('id, title, value, currency, status, probability, expected_close_date, created_at')
    .eq('workspace_id', workspaceId)
    .limit(args.limit || 20)

  if (args.status) query = query.eq('status', args.status)
  if (args.search) query = query.ilike('title', `%${args.search}%`)

  const { data, error } = await query
  if (error) return { error: error.message }

  const totalValue = data?.reduce((sum, d) => sum + (d.value || 0), 0) || 0
  return { deals: data, count: data?.length || 0, total_value: totalValue }
}

export async function getTasks(args: {
  status?: string
  priority?: string
  due_today?: boolean
  overdue?: boolean
  limit?: number
}) {
  const supabase = await createClient()
  const workspaceId = await getWorkspaceId()
  if (!workspaceId) return { error: 'No workspace found' }

  let query = supabase
    .from('tasks')
    .select('id, title, status, priority, due_date, created_at')
    .eq('workspace_id', workspaceId)
    .limit(args.limit || 20)

  if (args.status) query = query.eq('status', args.status)
  if (args.priority) query = query.eq('priority', args.priority)

  if (args.due_today) {
    const today = new Date().toISOString().split('T')[0]
    query = query.gte('due_date', `${today}T00:00:00`).lte('due_date', `${today}T23:59:59`)
  }

  if (args.overdue) {
    query = query.lt('due_date', new Date().toISOString())
      .not('status', 'in', '("completed","cancelled")')
  }

  const { data, error } = await query
  if (error) return { error: error.message }
  return { tasks: data, count: data?.length || 0 }
}

export async function getActivities(args: {
  type?: string
  limit?: number
}) {
  const supabase = await createClient()
  const workspaceId = await getWorkspaceId()
  if (!workspaceId) return { error: 'No workspace found' }

  let query = supabase
    .from('activities')
    .select(`
      id, type, title, description, outcome, duration_minutes, occurred_at,
      contact:contacts(first_name, last_name),
      lead:leads(title),
      deal:deals(title)
    `)
    .eq('workspace_id', workspaceId)
    .order('occurred_at', { ascending: false })
    .limit(args.limit || 10)

  if (args.type) query = query.eq('type', args.type)

  const { data, error } = await query
  if (error) return { error: error.message }
  return { activities: data, count: data?.length || 0 }
}

export async function getPipelineStats() {
  const supabase = await createClient()
  const workspaceId = await getWorkspaceId()
  if (!workspaceId) return { error: 'No workspace found' }

  const { data: stages } = await supabase
    .from('pipeline_stages')
    .select('id, name, color, position')
    .eq('workspace_id', workspaceId)
    .order('position')

  const { data: deals } = await supabase
    .from('deals')
    .select('stage_id, value, status')
    .eq('workspace_id', workspaceId)
    .eq('status', 'open')

  if (!stages || !deals) return { error: 'Failed to fetch pipeline data' }

  const pipeline = stages.map(stage => {
    const stageDeals = deals.filter(d => d.stage_id === stage.id)
    return {
      stage: stage.name,
      deal_count: stageDeals.length,
      total_value: stageDeals.reduce((sum, d) => sum + (d.value || 0), 0)
    }
  })

  const totalValue = deals.reduce((sum, d) => sum + (d.value || 0), 0)
  const wonDeals = await supabase
    .from('deals')
    .select('id', { count: 'exact' })
    .eq('workspace_id', workspaceId)
    .eq('status', 'won')

  return {
    pipeline,
    total_open_value: totalValue,
    won_deals_count: wonDeals.count || 0
  }
}

export async function getContactSummary(args: { name: string }) {
  const supabase = await createClient()
  const workspaceId = await getWorkspaceId()
  if (!workspaceId) return { error: 'No workspace found' }

  const { data: contacts } = await supabase
    .from('contacts')
    .select('*')
    .eq('workspace_id', workspaceId)
    .or(`first_name.ilike.%${args.name}%,last_name.ilike.%${args.name}%`)
    .limit(1)

  if (!contacts || contacts.length === 0) {
    return { error: `No contact found with name "${args.name}"` }
  }

  const contact = contacts[0]

  const { data: activities } = await supabase
    .from('activities')
    .select('type, title, occurred_at')
    .eq('contact_id', contact.id)
    .order('occurred_at', { ascending: false })
    .limit(5)

  const { data: tasks } = await supabase
    .from('tasks')
    .select('title, status, due_date')
    .eq('contact_id', contact.id)
    .limit(5)

  return {
    contact,
    recent_activities: activities || [],
    tasks: tasks || []
  }
}

// ── WRITE TOOL HANDLERS ────────────────────────────────────────────

export async function createContact(args: { first_name: string; last_name?: string; email?: string; phone?: string; job_title?: string; status?: string; source?: string }) {
  args.first_name = args.first_name?.trim().substring(0, 255) || '';
  if (!args.first_name) return { error: 'first_name is required and cannot be empty' };
  if (args.last_name) args.last_name = args.last_name.trim().substring(0, 255);
  if (args.email) args.email = args.email.trim().substring(0, 255);
  if (args.phone) args.phone = args.phone.trim().substring(0, 255);
  if (args.job_title) args.job_title = args.job_title.trim().substring(0, 255);
  if (args.status) args.status = args.status.trim().substring(0, 255);
  if (args.source) args.source = args.source.trim().substring(0, 255);

  const supabase = await createClient()
  const workspaceId = await getWorkspaceId()
  if (!workspaceId) return { error: 'No workspace found' }
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return { error: 'Not authenticated' }
  try {
    const { data, error } = await supabase.from('contacts').insert({ workspace_id: workspaceId, first_name: args.first_name, last_name: args.last_name || null, email: args.email || null, phone: args.phone || null, job_title: args.job_title || null, status: args.status || 'active', source: args.source || 'manual', created_by: user.id }).select('id, first_name, last_name, email').single()
    if (error) throw error
    
    // 🔁 Trigger automation for contact_created
    try {
      const { data: automations } = await supabase
        .from('automations')
        .select('*')
        .eq('trigger_type', 'contact_created')
        .eq('is_active', true)

      if (automations && automations.length > 0) {
        for (const automation of automations) {
          let actionSuccess = false
          let actionResult = null
          let actionError = null

          try {
            if (automation.action_type === 'create_task') {
              const actionConfig = automation.action_config || {}
              const taskTitle = (actionConfig.title_template || actionConfig.title || `Follow up with ${args.first_name} ${args.last_name || ''}`)
                .replace(/\{first_name\}/g, args.first_name)
                .replace(/\{last_name\}/g, args.last_name || '')

              const dueDate = actionConfig.due_days 
                ? new Date(Date.now() + actionConfig.due_days * 86400000).toISOString() 
                : null

              await supabase.from('tasks').insert({
                workspace_id: workspaceId,
                title: taskTitle,
                description: actionConfig.description || `Auto-created from new contact: ${args.first_name} ${args.last_name || ''}`,
                priority: actionConfig.priority || 'medium',
                status: 'pending',
                due_date: dueDate,
              })
              actionResult = { task_title: taskTitle }
              actionSuccess = true
            }
            
            else if (automation.action_type === 'send_notification') {
              const actionConfig = automation.action_config || {}
              const message = (actionConfig.message_template || actionConfig.message || `New contact created: ${args.first_name} ${args.last_name || ''}`)
                .replace(/\{first_name\}/g, args.first_name)
                .replace(/\{last_name\}/g, args.last_name || '')
              
              // Notification logged in automation_logs instead of console
              actionResult = { notification: message }
              actionSuccess = true
            }
            
          } catch (err: any) {
            actionError = err.message
            actionSuccess = false
          }
          
          await supabase.from('automation_logs').insert({
            automation_id: automation.id,
            workspace_id: workspaceId,
            trigger_type: 'contact_created',
            trigger_data: { contact_id: data.id, first_name: args.first_name, last_name: args.last_name },
            action_type: automation.action_type,
            action_result: actionResult,
            status: actionSuccess ? 'success' : 'failed',
            error_message: actionError,
          })
        }
      }
    } catch (err) {
      console.error('Contact creation automation error:', err?.message || 'Unknown error')
    }

    return { success: true, contact: data, message: 'Contact created successfully' }
  } catch (error: any) { return { error: error.message } }
}

export async function createLead(args: { title: string; description?: string; status?: string; priority?: string; source?: string; estimated_value?: number }) {
  args.title = args.title?.trim().substring(0, 255) || '';
  if (!args.title) return { error: 'title is required and cannot be empty' };
  if (args.description) args.description = args.description.trim().substring(0, 2000);
  if (args.status) args.status = args.status.trim().substring(0, 255);
  if (args.priority) args.priority = args.priority.trim().substring(0, 255);
  if (args.source) args.source = args.source.trim().substring(0, 255);

  const supabase = await createClient()
  const workspaceId = await getWorkspaceId()
  if (!workspaceId) return { error: 'No workspace found' }
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return { error: 'Not authenticated' }
  try {
    const { data, error } = await supabase.from('leads').insert({ workspace_id: workspaceId, title: args.title, description: args.description || null, status: args.status || 'new', priority: args.priority || 'medium', source: args.source || 'manual', estimated_value: args.estimated_value || null, created_by: user.id }).select('id, title, status, priority').single()
    if (error) throw error

    // 🔁 SIMPLE DIRECT AUTOMATION - No queue, no Redis
    try {
      // Fetch all active automations for lead_created
      const { data: automations } = await supabase
        .from('automations')
        .select('*')
        .eq('trigger_type', 'lead_created')
        .eq('is_active', true)

      if (automations && automations.length > 0) {
        for (const automation of automations) {
          let actionSuccess = false
          let actionResult = null
          let actionError = null

          try {
            // Execute based on action_type
            if (automation.action_type === 'create_task') {
              const config = automation.action_config || {}
              
              // Replace variables like {title} with actual values from the lead
              const taskTitle = (config.title_template || config.title || `Follow up with ${args.title}`)
                .replace(/\{title\}/g, args.title)
                .replace(/\{priority\}/g, args.priority || 'medium')
              
              const dueDate = config.due_days 
                ? new Date(Date.now() + config.due_days * 86400000).toISOString() 
                : null

              const { data: task, error: taskError } = await supabase
                .from('tasks')
                .insert({
                  workspace_id: workspaceId,
                  title: taskTitle,
                  description: config.description || `Auto-created from lead: ${args.title}`,
                  priority: config.priority || 'medium',
                  status: 'pending',
                  due_date: dueDate,
                })
                .select()
                .single()

              if (taskError) throw taskError
              actionResult = { task_id: task.id, task_title: taskTitle }
              actionSuccess = true
            }
            
            else if (automation.action_type === 'send_notification') {
              const config = automation.action_config || {}
              const message = (config.message_template || config.message || `New lead created: ${args.title}`)
                .replace(/\{title\}/g, args.title)
              
              // Just log to console for now (can be expanded to real notifications later)
              // Notification logged in automation_logs instead of console
              actionResult = { notification: message, sent: true }
              actionSuccess = true
            }
            
            else if (automation.action_type === 'update_status') {
              const config = automation.action_config || {}
              // Update the lead's status
              const { error: updateError } = await supabase
                .from('leads')
                .update({ status: config.status_value || 'contacted' })
                .eq('id', data.id)
              
              if (updateError) throw updateError
              actionResult = { message: `Lead status updated to ${config.status_value || 'contacted'}` }
              actionSuccess = true
            }
            
          } catch (err: any) {
            actionError = err.message
            actionSuccess = false
          }
          
          // Log the automation execution
          await supabase.from('automation_logs').insert({
            automation_id: automation.id,
            workspace_id: workspaceId,
            trigger_type: 'lead_created',
            trigger_data: { id: data.id, title: args.title, priority: args.priority },
            action_type: automation.action_type,
            action_result: actionResult,
            status: actionSuccess ? 'success' : 'failed',
            error_message: actionError,
          })
        }
      }
    } catch (err) {
      console.error('Simple automation error:', err?.message || 'Unknown error')
      // Do NOT fail the lead creation if automation fails
    }

    return { success: true, lead: data, message: 'Lead created successfully' }
  } catch (error: any) { return { error: error.message } }
}

export async function createTask(args: { title: string; description?: string; priority?: string; status?: string; due_date?: string }) {
  args.title = args.title?.trim().substring(0, 255) || '';
  if (!args.title) return { error: 'title is required and cannot be empty' };
  if (args.description) args.description = args.description.trim().substring(0, 2000);
  if (args.priority) args.priority = args.priority.trim().substring(0, 255);
  if (args.status) args.status = args.status.trim().substring(0, 255);

  const supabase = await createClient()
  const workspaceId = await getWorkspaceId()
  if (!workspaceId) return { error: 'No workspace found' }
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return { error: 'Not authenticated' }
  try {
    const { data, error } = await supabase.from('tasks').insert({ workspace_id: workspaceId, title: args.title, description: args.description || null, priority: args.priority || 'medium', status: args.status || 'pending', due_date: args.due_date || null, assigned_to: user.id, created_by: user.id }).select('id, title, priority, due_date').single()
    if (error) throw error
    return { success: true, task: data, message: 'Task created successfully' }
  } catch (error: any) { return { error: error.message } }
}

export async function createActivity(args: { type: string; title: string; description?: string; outcome?: string; duration_minutes?: number }) {
  args.type = args.type?.trim().substring(0, 255) || '';
  args.title = args.title?.trim().substring(0, 255) || '';
  if (!args.type) return { error: 'type is required and cannot be empty' };
  if (!args.title) return { error: 'title is required and cannot be empty' };
  if (args.description) args.description = args.description.trim().substring(0, 2000);
  if (args.outcome) args.outcome = args.outcome.trim().substring(0, 255);

  const supabase = await createClient()
  const workspaceId = await getWorkspaceId()
  if (!workspaceId) return { error: 'No workspace found' }
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return { error: 'Not authenticated' }
  try {
    const { data, error } = await supabase.from('activities').insert({ workspace_id: workspaceId, type: args.type, title: args.title, description: args.description || null, outcome: args.outcome || null, duration_minutes: args.duration_minutes || null, occurred_at: new Date().toISOString(), created_by: user.id }).select('id, type, title').single()
    if (error) throw error
    return { success: true, activity: data, message: 'Activity logged successfully' }
  } catch (error: any) { return { error: error.message } }
}

export async function updateDealStage(args: { deal_title: string; stage_name: string }) {
  args.deal_title = args.deal_title?.trim().substring(0, 255) || '';
  args.stage_name = args.stage_name?.trim().substring(0, 255) || '';
  if (!args.deal_title) return { error: 'deal_title is required and cannot be empty' };
  if (!args.stage_name) return { error: 'stage_name is required and cannot be empty' };

  const supabase = await createClient()
  const workspaceId = await getWorkspaceId()
  if (!workspaceId) return { error: 'No workspace found' }
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return { error: 'Not authenticated' }
  try {
    const { data: deal } = await supabase.from('deals').select('id, title').eq('workspace_id', workspaceId).ilike('title', `%${args.deal_title}%`).limit(1).single()
    if (!deal) return { error: `Deal "${args.deal_title}" not found` }
    const { data: stage } = await supabase.from('pipeline_stages').select('id').ilike('name', `%${args.stage_name}%`).limit(1).single()
    if (!stage) return { error: `Stage "${args.stage_name}" not found` }
    await supabase.from('deals').update({ stage_id: stage.id, updated_at: new Date().toISOString() }).eq('id', deal.id)
    await supabase.from('activities').insert({ workspace_id: workspaceId, type: 'stage_change', title: `Deal moved to ${args.stage_name}`, description: `Deal "${deal.title}" was moved to ${args.stage_name}`, occurred_at: new Date().toISOString(), created_by: user.id })
    
    // 🔁 Trigger automation for deal_stage_changed
    try {
      const { data: automations } = await supabase
        .from('automations')
        .select('*')
        .eq('trigger_type', 'deal_stage_changed')
        .eq('is_active', true)

      if (automations && automations.length > 0) {
        for (const automation of automations) {
          let actionSuccess = false
          let actionResult = null
          let actionError = null

          // Check if stage matches the automation config
          const config = automation.trigger_config || {}
          if (config.stage_name && args.stage_name !== config.stage_name) {
            continue // Skip if stage doesn't match
          }

          try {
            if (automation.action_type === 'create_task') {
              const actionConfig = automation.action_config || {}
              const taskTitle = (actionConfig.title_template || actionConfig.title || `Follow up on deal: ${deal.title}`)
                .replace(/\{title\}/g, deal.title)
                .replace(/\{stage\}/g, args.stage_name)

              const dueDate = actionConfig.due_days 
                ? new Date(Date.now() + actionConfig.due_days * 86400000).toISOString() 
                : null

              await supabase.from('tasks').insert({
                workspace_id: workspaceId,
                title: taskTitle,
                description: actionConfig.description || `Auto-created from deal stage change to ${args.stage_name}`,
                priority: actionConfig.priority || 'medium',
                status: 'pending',
                due_date: dueDate,
              })
              actionResult = { task_title: taskTitle }
              actionSuccess = true
            }
            
            else if (automation.action_type === 'send_notification') {
              const actionConfig = automation.action_config || {}
              const message = (actionConfig.message_template || actionConfig.message || `Deal "${deal.title}" moved to ${args.stage_name}`)
                .replace(/\{title\}/g, deal.title)
                .replace(/\{stage\}/g, args.stage_name)
              
              // Notification logged in automation_logs instead of console
              actionResult = { notification: message }
              actionSuccess = true
            }
            
          } catch (err: any) {
            actionError = err.message
            actionSuccess = false
          }
          
          await supabase.from('automation_logs').insert({
            automation_id: automation.id,
            workspace_id: workspaceId,
            trigger_type: 'deal_stage_changed',
            trigger_data: { deal_id: deal.id, deal_title: deal.title, stage_name: args.stage_name },
            action_type: automation.action_type,
            action_result: actionResult,
            status: actionSuccess ? 'success' : 'failed',
            error_message: actionError,
          })
        }
      }
    } catch (err) {
      console.error('Deal stage automation error:', err?.message || 'Unknown error')
    }

    return { success: true, message: `Deal "${deal.title}" moved to ${args.stage_name}` }
  } catch (error: any) { return { error: error.message } }
}

export async function markTaskComplete(args: { task_title: string }) {
  args.task_title = args.task_title?.trim().substring(0, 255) || '';
  if (!args.task_title) return { error: 'task_title is required and cannot be empty' };

  const supabase = await createClient()
  const workspaceId = await getWorkspaceId()
  if (!workspaceId) return { error: 'No workspace found' }
  try {
    const { data: task } = await supabase.from('tasks').select('id, title').eq('workspace_id', workspaceId).ilike('title', `%${args.task_title}%`).limit(1).single()
    if (!task) return { error: `Task "${args.task_title}" not found` }
    await supabase.from('tasks').update({ status: 'completed', completed_at: new Date().toISOString() }).eq('id', task.id)
    
    // 🔁 Trigger automation for task_completed
    try {
      const { data: automations } = await supabase
        .from('automations')
        .select('*')
        .eq('trigger_type', 'task_completed')
        .eq('is_active', true)

      if (automations && automations.length > 0) {
        for (const automation of automations) {
          let actionSuccess = false
          let actionResult = null
          let actionError = null

          try {
            if (automation.action_type === 'send_notification') {
              const actionConfig = automation.action_config || {}
              const message = (actionConfig.message_template || actionConfig.message || `Task "${task.title}" has been completed`)
                .replace(/\{title\}/g, task.title)
              
              // Notification logged in automation_logs instead of console
              actionResult = { notification: message }
              actionSuccess = true
            }
            
            else if (automation.action_type === 'create_task') {
              const actionConfig = automation.action_config || {}
              const nextTaskTitle = (actionConfig.title_template || actionConfig.title || `Next step after: ${task.title}`)
                .replace(/\{title\}/g, task.title)

              const dueDate = actionConfig.due_days 
                ? new Date(Date.now() + actionConfig.due_days * 86400000).toISOString() 
                : null

              await supabase.from('tasks').insert({
                workspace_id: workspaceId,
                title: nextTaskTitle,
                description: actionConfig.description || `Auto-created after completing "${task.title}"`,
                priority: actionConfig.priority || 'medium',
                status: 'pending',
                due_date: dueDate,
              })
              actionResult = { task_title: nextTaskTitle }
              actionSuccess = true
            }
            
          } catch (err: any) {
            actionError = err.message
            actionSuccess = false
          }
          
          await supabase.from('automation_logs').insert({
            automation_id: automation.id,
            workspace_id: workspaceId,
            trigger_type: 'task_completed',
            trigger_data: { task_id: task.id, task_title: task.title },
            action_type: automation.action_type,
            action_result: actionResult,
            status: actionSuccess ? 'success' : 'failed',
            error_message: actionError,
          })
        }
      }
    } catch (err) {
      console.error('Task completion automation error:', err?.message || 'Unknown error')
    }

    return { success: true, message: `Task "${task.title}" marked as complete` }
  } catch (error: any) { return { error: error.message } }
}

export async function updateLeadStatus(args: { lead_title: string; status: string }) {
  args.lead_title = args.lead_title?.trim().substring(0, 255) || '';
  args.status = args.status?.trim().substring(0, 255) || '';
  if (!args.lead_title) return { error: 'lead_title is required and cannot be empty' };
  if (!args.status) return { error: 'status is required and cannot be empty' };

  const supabase = await createClient()
  const workspaceId = await getWorkspaceId()
  if (!workspaceId) return { error: 'No workspace found' }
  try {
    const { data: lead } = await supabase.from('leads').select('id, title').eq('workspace_id', workspaceId).ilike('title', `%${args.lead_title}%`).limit(1).single()
    if (!lead) return { error: `Lead "${args.lead_title}" not found` }
    await supabase.from('leads').update({ status: args.status, updated_at: new Date().toISOString() }).eq('id', lead.id)
    return { success: true, message: `Lead "${lead.title}" status updated to ${args.status}` }
  } catch (error: any) { return { error: error.message } }
}

// ── MEMORY TOOL HANDLERS ────────────────────────────────────────────

export async function rememberFact(args: {
  key: string
  value: string
}) {
  const supabase = await createClient()
  const workspaceId = await getWorkspaceId()
  if (!workspaceId) return { error: 'No workspace found' }

  try {
    const { data, error } = await supabase
      .from('ai_memory')
      .upsert({
        workspace_id: workspaceId,
        key: args.key,
        value: args.value,
        updated_at: new Date().toISOString(),
      })
      .select()
      .single()

    if (error) throw error
    return { success: true, message: `I'll remember that: ${args.key} = ${args.value}` }
  } catch (error: any) {
    return { error: error.message }
  }
}

export async function recallFacts(args: {
  search?: string
  limit?: number
}) {
  const supabase = await createClient()
  const workspaceId = await getWorkspaceId()
  if (!workspaceId) return { error: 'No workspace found' }

  try {
    let query = supabase
      .from('ai_memory')
      .select('key, value, updated_at')
      .eq('workspace_id', workspaceId)
      .order('updated_at', { ascending: false })
      .limit(args.limit || 20)

    if (args.search) {
      query = query.or(`key.ilike.%${args.search}%,value.ilike.%${args.search}%`)
    }

    const { data, error } = await query
    if (error) throw error
    return { success: true, memories: data, count: data?.length || 0 }
  } catch (error: any) {
    return { error: error.message }
  }
}

// ── EXPORT ALL HANDLERS ────────────────────────────────────────────

export const toolHandlers = {
  // Read handlers
  getContacts,
  getLeads,
  getDeals,
  getTasks,
  getActivities,
  getPipelineStats,
  getContactSummary,
  // Write handlers
  createContact,
  createLead,
  createTask,
  createActivity,
  updateDealStage,
  markTaskComplete,
  updateLeadStatus,
  // Memory handlers
  rememberFact,
  recallFacts,
}

// ── TOOL DEFINITIONS FOR GROQ ──────────────────────────────
import Groq from 'groq-sdk'

export const toolDefinitions: Groq.Chat.ChatCompletionTool[] = [
  {
    type: 'function',
    function: {
      name: 'get_contacts',
      description: 'Fetch contacts from the CRM. Use this to answer questions about contacts, find specific people, or get contact counts.',
      parameters: {
        type: 'object',
        properties: {
          status: { type: 'string', description: 'Filter by contact status: active, inactive, blocked' },
          search: { type: 'string', description: 'Search by name or email' },
          limit: { type: 'string', description: 'Maximum number of results (default 20)' }
        }
      }
    }
  },
  {
    type: 'function',
    function: {
      name: 'get_leads',
      description: 'Fetch leads from the CRM. Use this for questions about leads, their status, priority, or estimated values.',
      parameters: {
        type: 'object',
        properties: {
          status: { type: 'string', description: 'Filter by lead status: new, contacted, qualified, unqualified, converted, lost' },
          priority: { type: 'string', description: 'Filter by priority: low, medium, high' },
          search: { type: 'string', description: 'Search by title' },
          limit: { type: 'string', description: 'Maximum number of results' }
        }
      }
    }
  },
  {
    type: 'function',
    function: {
      name: 'get_deals', 
      description: 'Fetch deals from the CRM. Use this for questions about deals, pipeline value, or deal status.',
      parameters: {
        type: 'object',
        properties: {
          status: { type: 'string', description: 'Filter by deal status: open, won, lost, on_hold' },
          search: { type: 'string', description: 'Search by title' },
          limit: { type: 'string', description: 'Maximum number of results' }
        }
      }
    }
  },
  {
    type: 'function',
    function: {
      name: 'get_tasks',
      description: 'Fetch tasks from the CRM. Use this for questions about tasks, due dates, or task status.',
      parameters: {
        type: 'object',
        properties: {
          status: { type: 'string', description: 'Filter by status: pending, in_progress, completed, cancelled' },
          priority: { type: 'string', description: 'Filter by priority: low, medium, high, urgent' },
          due_today: { type: 'boolean', description: 'Only return tasks due today' },
          overdue: { type: 'boolean', description: 'Only return overdue tasks' },
          limit: { type: 'string', description: 'Maximum number of results' }
        }
      }
    }
  },
  {
    type: 'function',
    function: {
      name: 'get_activities',
      description: 'Fetch recent activities from the CRM. Use this for questions about calls, emails, meetings, or notes.',
      parameters: {
        type: 'object',
        properties: {
          type: { type: 'string', description: 'Filter by activity type: call, email, meeting, note, task' },
          limit: { type: 'string', description: 'Maximum number of results' }
        }
      }
    }
  },
  {
    type: 'function',
    function: {
      name: 'get_pipeline_stats',
      description: 'Get pipeline overview and deal statistics. Use this for questions about the sales pipeline, total value, win rate, or stage breakdown.',
      parameters: {
        type: 'object',
        properties: {}
      }
    }
  },
  {
    type: 'function',
    function: {
      name: 'get_contact_summary',
      description: 'Get a full summary of a specific contact including their activities and tasks. Use this when asked to summarize or get details about a specific person.',
      parameters: {
        type: 'object',
        properties: {
          name: { type: 'string', description: 'The name of the contact to look up' }
        },
        required: ['name']
      }
    }
  },
  {
    type: 'function',
    function: { name: 'create_contact', description: 'Create a new contact in the CRM', parameters: { type: 'object', properties: { first_name: { type: 'string' }, last_name: { type: 'string' }, email: { type: 'string' }, phone: { type: 'string' }, job_title: { type: 'string' }, status: { type: 'string' }, source: { type: 'string' } }, required: ['first_name'] } }
  },
  {
    type: 'function',
    function: { name: 'create_lead', description: 'Create a new lead in the CRM', parameters: { type: 'object', properties: { title: { type: 'string' }, description: { type: 'string' }, status: { type: 'string' }, priority: { type: 'string' }, source: { type: 'string' }, estimated_value: { type: 'string' } }, required: ['title'] } }
  },
  {
    type: 'function',
    function: { name: 'create_task', description: 'Create a new task in the CRM', parameters: { type: 'object', properties: { title: { type: 'string' }, description: { type: 'string' }, priority: { type: 'string' }, status: { type: 'string' }, due_date: { type: 'string' } }, required: ['title'] } }
  },
  {
    type: 'function',
    function: { name: 'create_activity', description: 'Log an activity in the CRM', parameters: { type: 'object', properties: { type: { type: 'string' }, title: { type: 'string' }, description: { type: 'string' }, outcome: { type: 'string' }, duration_minutes: { type: 'string' } }, required: ['type', 'title'] } }
  },
  {
    type: 'function',
    function: { name: 'update_deal_stage', description: 'Move a deal to a different pipeline stage', parameters: { type: 'object', properties: { deal_title: { type: 'string' }, stage_name: { type: 'string' } }, required: ['deal_title', 'stage_name'] } }
  },
  {
    type: 'function',
    function: { name: 'mark_task_complete', description: 'Mark an existing task as completed', parameters: { type: 'object', properties: { task_title: { type: 'string' } }, required: ['task_title'] } }
  },
  {
    type: 'function',
    function: { name: 'update_lead_status', description: 'Update the status of a lead', parameters: { type: 'object', properties: { lead_title: { type: 'string' }, status: { type: 'string' } }, required: ['lead_title', 'status'] } }
  },
  {
    type: 'function',
    function: {
      name: 'remember_fact',
      description: 'Store a fact or piece of information that the user wants the AI to remember for future conversations. Use this when the user says things like "Remember that..." or "Take note that..."',
      parameters: {
        type: 'object',
        properties: {
          key: { type: 'string', description: 'The key/category of the fact (e.g., "client_preference", "meeting_note", "deadline")' },
          value: { type: 'string', description: 'The actual fact or information to remember' },
        },
        required: ['key', 'value'],
      },
    },
  },
  {
    type: 'function',
    function: {
      name: 'recall_facts',
      description: 'Retrieve stored facts or information that the user previously asked the AI to remember. Use this when the user asks "What did I tell you about..." or "What do you remember about..."',
      parameters: {
        type: 'object',
        properties: {
          search: { type: 'string', description: 'Optional search term to filter memories by key or value' },
          limit: { type: 'string', description: 'Maximum number of memories to return (default 20)' },
        },
      },
    },
  }
]
