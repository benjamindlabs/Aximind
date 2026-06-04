export type ContactStatus = 'active' | 'inactive' | 'blocked'
export type ContactSource = 'manual' | 'referral' | 'website' | 'social' | 'email' | 'other'

export interface Contact {
  id: string
  workspace_id: string
  company_id: string | null
  first_name: string
  last_name: string | null
  email: string | null
  phone: string | null
  job_title: string | null
  status: ContactStatus
  source: ContactSource | null
  notes: string | null
  created_at: string
  updated_at: string
}

export interface ContactFormData {
  first_name: string
  last_name: string
  email: string
  phone: string
  job_title: string
  status: ContactStatus
  source: ContactSource
  notes: string
}

export const STATUS_OPTIONS: { value: ContactStatus; label: string }[] = [
  { value: 'active', label: 'Active' },
  { value: 'inactive', label: 'Inactive' },
  { value: 'blocked', label: 'Blocked' },
]

export const SOURCE_OPTIONS: { value: ContactSource; label: string }[] = [
  { value: 'manual', label: 'Manual' },
  { value: 'referral', label: 'Referral' },
  { value: 'website', label: 'Website' },
  { value: 'social', label: 'Social' },
  { value: 'email', label: 'Email' },
  { value: 'other', label: 'Other' },
]

export const EMPTY_FORM_DATA: ContactFormData = {
  first_name: '',
  last_name: '',
  email: '',
  phone: '',
  job_title: '',
  status: 'active',
  source: 'manual',
  notes: '',
}
