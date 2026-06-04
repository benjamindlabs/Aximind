export type TaskStatus = 'pending' | 'in_progress' | 'completed' | 'cancelled'
export type TaskPriority = 'low' | 'medium' | 'high' | 'urgent'

export interface Task {
  id: string
  workspace_id: string
  title: string
  description: string | null
  status: TaskStatus
  priority: TaskPriority
  due_date: string | null
  completed_at: string | null
  assigned_to: string | null
  created_by: string | null
  contact_id: string | null
  lead_id: string | null
  deal_id: string | null
  is_recurring: boolean
  created_at: string
  updated_at: string

  // Joined properties for convenience when fetched with related data
  contact?: {
    id: string
    first_name: string
    last_name: string | null
  }
  lead?: {
    id: string
    title?: string
    first_name?: string
    last_name?: string | null
    company_name?: string | null
  }
  deal?: {
    id: string
    title: string
  }
}

export interface TaskFormData {
  title: string
  description: string
  status: TaskStatus
  priority: TaskPriority
  due_date: string
  due_time: string // Stored separately for UI convenience, combined for DB
  contact_id: string
  lead_id: string
  deal_id: string
}

export const STATUS_OPTIONS: { value: TaskStatus; label: string }[] = [
  { value: 'pending', label: 'Pending' },
  { value: 'in_progress', label: 'In Progress' },
  { value: 'completed', label: 'Completed' },
  { value: 'cancelled', label: 'Cancelled' },
]

export const PRIORITY_OPTIONS: { value: TaskPriority; label: string }[] = [
  { value: 'low', label: 'Low' },
  { value: 'medium', label: 'Medium' },
  { value: 'high', label: 'High' },
  { value: 'urgent', label: 'Urgent' },
]

export const EMPTY_FORM_DATA: TaskFormData = {
  title: '',
  description: '',
  status: 'pending',
  priority: 'medium',
  due_date: '',
  due_time: '',
  contact_id: '',
  lead_id: '',
  deal_id: '',
}
