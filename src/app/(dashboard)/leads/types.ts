export type LeadStatus = 'new' | 'contacted' | 'qualified' | 'unqualified' | 'converted' | 'lost'
export type LeadSource = 'manual' | 'referral' | 'website' | 'social' | 'email' | 'other'
export type LeadPriority = 'low' | 'medium' | 'high'

export interface Lead {
  id: string
  workspace_id: string
  contact_id: string | null
  company_id: string | null
  title: string
  description: string | null
  status: LeadStatus
  source: LeadSource | null
  priority: LeadPriority
  estimated_value: number | null
  assigned_to: string | null
  converted_at: string | null
  created_by: string | null
  created_at: string
  updated_at: string

  // Joined fields (optional, loaded from client joins)
  contacts?: {
    first_name: string
    last_name: string | null
    email: string | null
    phone: string | null
  } | null
  companies?: {
    name: string
    industry: string | null
  } | null
}

export interface LeadFormData {
  title: string
  description: string
  status: LeadStatus
  priority: LeadPriority
  source: LeadSource
  estimated_value: string
  contact_id: string
  company_id: string
}

export const STATUS_OPTIONS: { value: LeadStatus; label: string }[] = [
  { value: 'new', label: 'New' },
  { value: 'contacted', label: 'Contacted' },
  { value: 'qualified', label: 'Qualified' },
  { value: 'unqualified', label: 'Unqualified' },
  { value: 'converted', label: 'Converted' },
  { value: 'lost', label: 'Lost' },
]

export const PRIORITY_OPTIONS: { value: LeadPriority; label: string }[] = [
  { value: 'low', label: 'Low' },
  { value: 'medium', label: 'Medium' },
  { value: 'high', label: 'High' },
]

export const SOURCE_OPTIONS: { value: LeadSource; label: string }[] = [
  { value: 'manual', label: 'Manual' },
  { value: 'referral', label: 'Referral' },
  { value: 'website', label: 'Website' },
  { value: 'social', label: 'Social' },
  { value: 'email', label: 'Email' },
  { value: 'other', label: 'Other' },
]

export const EMPTY_FORM_DATA: LeadFormData = {
  title: '',
  description: '',
  status: 'new',
  priority: 'medium',
  source: 'manual',
  estimated_value: '',
  contact_id: '',
  company_id: '',
}
