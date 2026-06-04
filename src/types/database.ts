export type Json =
    | string
    | number
    | boolean
    | null
    | { [key: string]: Json | undefined }
    | Json[]

export interface Database {
    public: {
        Tables: {
            profiles: {
                Row: {
                    id: string
                    email: string
                    full_name: string | null
                    avatar_url: string | null
                    role: string
                    created_at: string
                    updated_at: string
                }
                Insert: {
                    id: string
                    email: string
                    full_name?: string | null
                    avatar_url?: string | null
                    role?: string
                }
                Update: {
                    full_name?: string | null
                    avatar_url?: string | null
                    role?: string
                }
            }
            workspaces: {
                Row: {
                    id: string
                    name: string
                    slug: string
                    logo_url: string | null
                    owner_id: string
                    created_at: string
                    updated_at: string
                }
                Insert: {
                    name: string
                    slug: string
                    owner_id: string
                    logo_url?: string | null
                }
                Update: {
                    name?: string
                    slug?: string
                    logo_url?: string | null
                }
            }
            contacts: {
                Row: {
                    id: string
                    workspace_id: string
                    company_id: string | null
                    first_name: string
                    last_name: string | null
                    email: string | null
                    phone: string | null
                    job_title: string | null
                    status: string
                    source: string | null
                    created_at: string
                    updated_at: string
                }
                Insert: {
                    workspace_id: string
                    first_name: string
                    last_name?: string | null
                    email?: string | null
                    phone?: string | null
                    job_title?: string | null
                    company_id?: string | null
                }
                Update: {
                    first_name?: string
                    last_name?: string | null
                    email?: string | null
                    phone?: string | null
                    job_title?: string | null
                    status?: string
                }
            }
            leads: {
                Row: {
                    id: string
                    workspace_id: string
                    contact_id: string | null
                    company_id: string | null
                    title: string
                    status: string
                    priority: string
                    estimated_value: number | null
                    assigned_to: string | null
                    created_at: string
                    updated_at: string
                }
                Insert: {
                    workspace_id: string
                    title: string
                    status?: string
                    priority?: string
                    contact_id?: string | null
                    company_id?: string | null
                    estimated_value?: number | null
                }
                Update: {
                    title?: string
                    status?: string
                    priority?: string
                    estimated_value?: number | null
                    assigned_to?: string | null
                }
            }
            deals: {
                Row: {
                    id: string
                    workspace_id: string
                    pipeline_id: string | null
                    stage_id: string | null
                    contact_id: string | null
                    company_id: string | null
                    title: string
                    value: number
                    status: string
                    probability: number
                    expected_close_date: string | null
                    created_at: string
                    updated_at: string
                }
                Insert: {
                    workspace_id: string
                    title: string
                    value?: number
                    status?: string
                    pipeline_id?: string | null
                    stage_id?: string | null
                    contact_id?: string | null
                    company_id?: string | null
                }
                Update: {
                    title?: string
                    value?: number
                    status?: string
                    stage_id?: string | null
                    probability?: number
                }
            }
            tasks: {
                Row: {
                    id: string
                    workspace_id: string
                    title: string
                    status: string
                    priority: string
                    due_date: string | null
                    assigned_to: string | null
                    contact_id: string | null
                    lead_id: string | null
                    deal_id: string | null
                    created_at: string
                    updated_at: string
                }
                Insert: {
                    workspace_id: string
                    title: string
                    status?: string
                    priority?: string
                    due_date?: string | null
                    contact_id?: string | null
                    lead_id?: string | null
                    deal_id?: string | null
                }
                Update: {
                    title?: string
                    status?: string
                    priority?: string
                    due_date?: string | null
                    assigned_to?: string | null
                }
            }
        }
    }
}