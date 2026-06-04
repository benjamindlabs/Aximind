import { createClient } from '@/lib/supabase/server'
import { Queue } from 'bullmq'
import Redis from 'ioredis'

const redisConnection = new Redis({
  url: process.env.UPSTASH_REDIS_URL,
  token: process.env.UPSTASH_REDIS_TOKEN,
  maxRetriesPerRequest: null,
} as any)

const automationQueue = new Queue('automation-queue', { connection: redisConnection as any })

export interface Automation {
  id: string
  workspace_id: string
  name: string
  trigger_type: string
  trigger_config: any
  action_type: string
  action_config: any
  is_active: boolean
}

// Check triggers and queue actions
export async function checkTriggers(triggerType: string, data: any) {
  const supabase = await createClient()
  
  const { data: automations } = await supabase
    .from('automations')
    .select('*')
    .eq('trigger_type', triggerType)
    .eq('is_active', true)
  
  if (!automations || automations.length === 0) return
  
  for (const automation of automations) {
    // Check if trigger condition matches
    let shouldTrigger = true
    
    if (automation.trigger_config) {
      const config = automation.trigger_config
      
      switch (triggerType) {
        case 'deal_stage_changed':
          if (config.stage_name && data.stage_name !== config.stage_name) {
            shouldTrigger = false
          }
          break
        case 'lead_created':
          if (config.priority && data.priority !== config.priority) {
            shouldTrigger = false
          }
          break
        case 'task_overdue':
          if (config.days && data.days_overdue < config.days) {
            shouldTrigger = false
          }
          break
      }
    }
    
    if (shouldTrigger) {
      // Add to queue
      await automationQueue.add('execute-automation', {
        automationId: automation.id,
        workspaceId: automation.workspace_id,
        triggerType: triggerType,
        triggerData: data,
        actionType: automation.action_type,
        actionConfig: automation.action_config,
      })
    }
  }
}

// Execute an automation action
export async function executeAutomation(params: {
  automationId: string
  workspaceId: string
  triggerType: string
  triggerData: any
  actionType: string
  actionConfig: any
}) {
  const supabase = await createClient()
  const { automationId, workspaceId, triggerType, triggerData, actionType, actionConfig } = params
  
  let success = false
  let result = null
  let error = null
  
  try {
    switch (actionType) {
      case 'create_task':
        result = await createTaskAction(workspaceId, actionConfig, triggerData)
        success = true
        break
      case 'send_notification':
        result = await sendNotificationAction(workspaceId, actionConfig, triggerData)
        success = true
        break
      case 'update_status':
        result = await updateStatusAction(workspaceId, actionConfig, triggerData)
        success = true
        break
    }
  } catch (err: any) {
    error = err.message
    success = false
  }
  
  // Log the execution
  await supabase.from('automation_logs').insert({
    automation_id: automationId,
    workspace_id: workspaceId,
    trigger_type: triggerType,
    trigger_data: triggerData,
    action_type: actionType,
    action_result: result,
    status: success ? 'success' : 'failed',
    error_message: error,
  })
  
  return { success, result, error }
}

// Action: Create Task
async function createTaskAction(workspaceId: string, config: any, triggerData: any) {
  const supabase = await createClient()
  
  const title = config.title_template?.replace(/\{(.*?)\}/g, (_: string, key: string) => triggerData[key] || '') || config.title
  const dueDate = config.due_days ? new Date(Date.now() + config.due_days * 86400000).toISOString() : null
  
  const { data, error } = await supabase
    .from('tasks')
    .insert({
      workspace_id: workspaceId,
      title: title,
      description: config.description || null,
      priority: config.priority || 'medium',
      status: 'pending',
      due_date: dueDate,
    })
    .select()
    .single()
  
  if (error) throw error
  return { task: data, message: `Task "${title}" created` }
}

// Action: Send Notification (in-app)
async function sendNotificationAction(workspaceId: string, config: any, triggerData: any) {
  const supabase = await createClient()
  
  const message = config.message_template?.replace(/\{(.*?)\}/g, (_: string, key: string) => triggerData[key] || '') || config.message
  
  // Store notification (you can create a notifications table later)
  console.log(`[NOTIFICATION] Workspace ${workspaceId}: ${message}`)
  
  return { notification: message, sent: true }
}

// Action: Update Status
async function updateStatusAction(workspaceId: string, config: any, triggerData: any) {
  const supabase = await createClient()
  
  const { entity_type, entity_id_field, status_field, status_value } = config
  
  if (!entity_type || !entity_id_field || !triggerData[entity_id_field]) {
    throw new Error('Missing entity info for status update')
  }
  
  const { error } = await supabase
    .from(entity_type)
    .update({ [status_field]: status_value })
    .eq('id', triggerData[entity_id_field])
    .eq('workspace_id', workspaceId)
  
  if (error) throw error
  
  return { message: `Updated ${entity_type} status to ${status_value}` }
}

export { automationQueue, redisConnection }
