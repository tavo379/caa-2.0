// Database types generated from Supabase schema
// Run: npx supabase gen types typescript --project-id <project-id> > src/lib/supabase/types.ts

export type Json =
    | string
    | number
    | boolean
    | null
    | { [key: string]: Json | undefined }
    | Json[]

export type InvoiceStatus = 'draft' | 'sent' | 'paid' | 'void'
export type ProjectStatus = 'lead' | 'active' | 'on_hold' | 'completed' | 'cancelled'
export type ProjectServiceType = 'shopify' | 'hubspot' | 'web' | 'other'
export type ProjectPriority = 'low' | 'medium' | 'high'

export interface Database {
    public: {
        Tables: {
            clients: {
                Row: {
                    id: string
                    name: string
                    email: string | null
                    company: string | null
                    tax_id: string | null
                    address: string | null
                    notes: string | null
                    created_at: string
                    user_id: string
                }
                Insert: {
                    id?: string
                    name: string
                    email?: string | null
                    company?: string | null
                    tax_id?: string | null
                    address?: string | null
                    notes?: string | null
                    created_at?: string
                    user_id: string
                }
                Update: {
                    id?: string
                    name?: string
                    email?: string | null
                    company?: string | null
                    tax_id?: string | null
                    address?: string | null
                    notes?: string | null
                    created_at?: string
                    user_id?: string
                }
            }
            invoices: {
                Row: {
                    id: string
                    invoice_number: string
                    client_id: string
                    issue_date: string
                    due_date: string | null
                    currency: string
                    status: InvoiceStatus
                    subtotal: number
                    tax: number
                    total: number
                    notes: string | null
                    pdf_url: string | null
                    public_token: string
                    created_at: string
                    user_id: string
                }
                Insert: {
                    id?: string
                    invoice_number: string
                    client_id: string
                    issue_date?: string
                    due_date?: string | null
                    currency?: string
                    status?: InvoiceStatus
                    subtotal?: number
                    tax?: number
                    total?: number
                    notes?: string | null
                    pdf_url?: string | null
                    public_token?: string
                    created_at?: string
                    user_id: string
                }
                Update: {
                    id?: string
                    invoice_number?: string
                    client_id?: string
                    issue_date?: string
                    due_date?: string | null
                    currency?: string
                    status?: InvoiceStatus
                    subtotal?: number
                    tax?: number
                    total?: number
                    notes?: string | null
                    pdf_url?: string | null
                    public_token?: string
                    created_at?: string
                    user_id?: string
                }
            }
            invoice_items: {
                Row: {
                    id: string
                    invoice_id: string
                    description: string
                    qty: number
                    unit_price: number
                    line_total: number
                    sort_order: number
                }
                Insert: {
                    id?: string
                    invoice_id: string
                    description: string
                    qty?: number
                    unit_price?: number
                    line_total?: number
                    sort_order?: number
                }
                Update: {
                    id?: string
                    invoice_id?: string
                    description?: string
                    qty?: number
                    unit_price?: number
                    line_total?: number
                    sort_order?: number
                }
            }
            invoice_sequence: {
                Row: {
                    year: number
                    last_number: number
                }
                Insert: {
                    year: number
                    last_number?: number
                }
                Update: {
                    year?: number
                    last_number?: number
                }
            }
            projects: {
                Row: {
                    id: string
                    name: string
                    client_id: string | null
                    service_type: ProjectServiceType
                    status: ProjectStatus
                    priority: ProjectPriority
                    start_date: string | null
                    due_date: string | null
                    budget: number | null
                    currency: string
                    description: string | null
                    created_at: string
                    user_id: string
                }
                Insert: {
                    id?: string
                    name: string
                    client_id?: string | null
                    service_type?: ProjectServiceType
                    status?: ProjectStatus
                    priority?: ProjectPriority
                    start_date?: string | null
                    due_date?: string | null
                    budget?: number | null
                    currency?: string
                    description?: string | null
                    created_at?: string
                    user_id: string
                }
                Update: {
                    id?: string
                    name?: string
                    client_id?: string | null
                    service_type?: ProjectServiceType
                    status?: ProjectStatus
                    priority?: ProjectPriority
                    start_date?: string | null
                    due_date?: string | null
                    budget?: number | null
                    currency?: string
                    description?: string | null
                    created_at?: string
                    user_id?: string
                }
            }
            project_tasks: {
                Row: {
                    id: string
                    project_id: string
                    title: string
                    done: boolean
                    due_date: string | null
                    sort_order: number
                    created_at: string
                }
                Insert: {
                    id?: string
                    project_id: string
                    title: string
                    done?: boolean
                    due_date?: string | null
                    sort_order?: number
                    created_at?: string
                }
                Update: {
                    id?: string
                    project_id?: string
                    title?: string
                    done?: boolean
                    due_date?: string | null
                    sort_order?: number
                    created_at?: string
                }
            }
        }
        Functions: {
            generate_invoice_number: {
                Args: Record<string, never>
                Returns: string
            }
        }
    }
}

// Utility types
export type Client = Database['public']['Tables']['clients']['Row']
export type ClientInsert = Database['public']['Tables']['clients']['Insert']
export type ClientUpdate = Database['public']['Tables']['clients']['Update']

export type Invoice = Database['public']['Tables']['invoices']['Row']
export type InvoiceInsert = Database['public']['Tables']['invoices']['Insert']
export type InvoiceUpdate = Database['public']['Tables']['invoices']['Update']

export type InvoiceItem = Database['public']['Tables']['invoice_items']['Row']
export type InvoiceItemInsert = Database['public']['Tables']['invoice_items']['Insert']
export type InvoiceItemUpdate = Database['public']['Tables']['invoice_items']['Update']

export type Project = Database['public']['Tables']['projects']['Row']
export type ProjectInsert = Database['public']['Tables']['projects']['Insert']
export type ProjectUpdate = Database['public']['Tables']['projects']['Update']

export type ProjectTask = Database['public']['Tables']['project_tasks']['Row']
export type ProjectTaskInsert = Database['public']['Tables']['project_tasks']['Insert']
export type ProjectTaskUpdate = Database['public']['Tables']['project_tasks']['Update']

export type ProjectWithClient = Project & {
    client: Client | null
}

// Extended types with relations
export type InvoiceWithClient = Invoice & {
    client: Client
}

export type InvoiceWithItems = Invoice & {
    items: InvoiceItem[]
}

export type InvoiceFull = Invoice & {
    client: Client
    items: InvoiceItem[]
}
