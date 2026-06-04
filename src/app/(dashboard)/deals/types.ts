export type DealStatus = 'open' | 'won' | 'lost' | 'on_hold'
export type DealCurrency = 'USD' | 'EUR' | 'GBP' | 'NGN'

export interface Pipeline {
  id: string
  workspace_id: string
  name: string
  is_default: boolean
  created_at: string
  updated_at: string
}

export interface PipelineStage {
  id: string
  pipeline_id: string
  name: string
  position: number
  probability: number
  created_at: string
  updated_at: string
}

export interface Deal {
  id: string
  workspace_id: string
  pipeline_id: string
  stage_id: string
  contact_id: string | null
  company_id: string | null
  title: string
  description: string | null
  value: number
  currency: DealCurrency
  status: DealStatus
  probability: number
  expected_close_date: string | null
  created_at: string
  updated_at: string

  // Joined properties for convenience if fetched with related data
  contact?: {
    first_name: string
    last_name: string | null
    email: string | null
  }
  company?: {
    name: string
  }
}

export interface DealFormData {
  title: string
  description: string
  value: string
  currency: DealCurrency
  probability: string
  status: DealStatus
  expected_close_date: string
  stage_id: string
  contact_id: string
  company_id: string
}

export const STATUS_OPTIONS: { value: DealStatus; label: string }[] = [
  { value: 'open', label: 'Open' },
  { value: 'won', label: 'Won' },
  { value: 'lost', label: 'Lost' },
  { value: 'on_hold', label: 'On Hold' },
]

export const CURRENCY_OPTIONS: { value: DealCurrency; label: string }[] = [
  { value: 'USD', label: 'USD ($)' },
  { value: 'EUR', label: 'EUR (€)' },
  { value: 'GBP', label: 'GBP (£)' },
  { value: 'NGN', label: 'NGN (₦)' },
]

export const EMPTY_FORM_DATA: DealFormData = {
  title: '',
  description: '',
  value: '',
  currency: 'USD',
  probability: '50',
  status: 'open',
  expected_close_date: '',
  stage_id: '',
  contact_id: '',
  company_id: '',
}
