export type CompanySize = '1-10' | '11-50' | '51-200' | '201-500' | '500+'

export interface Company {
  id: string
  workspace_id: string
  name: string
  industry: string | null
  website: string | null
  phone: string | null
  email: string | null
  address: string | null
  city: string | null
  country: string | null
  size: CompanySize | null
  annual_revenue: number | null
  notes: string | null
  created_by: string | null
  created_at: string
  updated_at: string
}

export interface CompanyFormData {
  name: string
  industry: string
  website: string
  phone: string
  email: string
  address: string
  city: string
  country: string
  size: string
  annual_revenue: string
  notes: string
}

export const SIZE_OPTIONS: { value: string; label: string }[] = [
  { value: '', label: 'Not specified' },
  { value: '1-10', label: '1-10' },
  { value: '11-50', label: '11-50' },
  { value: '51-200', label: '51-200' },
  { value: '201-500', label: '201-500' },
  { value: '500+', label: '500+' },
]

export const EMPTY_FORM_DATA: CompanyFormData = {
  name: '',
  industry: '',
  website: '',
  phone: '',
  email: '',
  address: '',
  city: '',
  country: '',
  size: '',
  annual_revenue: '',
  notes: '',
}
