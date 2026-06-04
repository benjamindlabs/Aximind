export type ActivityType = 'call' | 'email' | 'meeting' | 'note' | 'task' | 'deal_change' | 'stage_change' | 'lead_change' | 'system'

export interface Activity {
  id: string
  workspace_id: string
  type: ActivityType
  title: string
  description: string | null
  outcome: string | null
  duration_minutes: number | null
  occurred_at: string
  created_by: string | null
  contact_id: string | null
  lead_id: string | null
  deal_id: string | null
  task_id: string | null
  created_at: string

  // Joined properties for convenience when fetched with related data
  contact?: {
    id: string
    first_name: string
    last_name: string | null
  }
  lead?: {
    id: string
    title: string
  }
  deal?: {
    id: string
    title: string
  }
}

export interface ActivityFormData {
  type: ActivityType
  title: string
  description: string
  outcome: string
  duration_minutes: string
  occurred_at_date: string
  occurred_at_time: string
  contact_id: string
  lead_id: string
  deal_id: string
}

export const TYPE_OPTIONS: { value: ActivityType; label: string }[] = [
  { value: 'call', label: 'Call' },
  { value: 'email', label: 'Email' },
  { value: 'meeting', label: 'Meeting' },
  { value: 'note', label: 'Note' },
  { value: 'task', label: 'Task' },
  // Exclude system and change types from manual logging
]

export const EMPTY_FORM_DATA: ActivityFormData = {
  type: 'call',
  title: '',
  description: '',
  outcome: '',
  duration_minutes: '',
  occurred_at_date: '',
  occurred_at_time: '',
  contact_id: '',
  lead_id: '',
  deal_id: '',
}
