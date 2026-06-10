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

// Quotes module
export type RateProfile = 'international' | 'local_premium' | 'local_standard'
export type QuoteCurrency = 'USD' | 'COP'
export type QuoteStatus = 'draft' | 'sent' | 'approved' | 'rejected' | 'expired'
export type PricingMode = 'hourly' | 'fixed' | 'tbd'
export type Complexity = 'low' | 'medium' | 'high'
export type PresetKind = 'standalone' | 'bundle'

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
                    rate_profile: RateProfile | null
                    custom_rate: number | null
                    anchor_label: string | null
                    anchor_hours: number | null
                    anchor_price: number | null
                    anchor_currency: QuoteCurrency | null
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
                    rate_profile?: RateProfile | null
                    custom_rate?: number | null
                    anchor_label?: string | null
                    anchor_hours?: number | null
                    anchor_price?: number | null
                    anchor_currency?: QuoteCurrency | null
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
                    rate_profile?: RateProfile | null
                    custom_rate?: number | null
                    anchor_label?: string | null
                    anchor_hours?: number | null
                    anchor_price?: number | null
                    anchor_currency?: QuoteCurrency | null
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
            quote_settings: {
                Row: {
                    user_id: string
                    rate_international_usd: number
                    rate_local_premium_cop: number
                    rate_local_standard_cop: number
                    usd_cop_rate: number
                    fixed_price_factor: number
                    qa_pct: number
                    min_billable_hours: number
                    volume_discount_cap_pct: number
                    updated_at: string
                }
                Insert: {
                    user_id: string
                    rate_international_usd?: number
                    rate_local_premium_cop?: number
                    rate_local_standard_cop?: number
                    usd_cop_rate?: number
                    fixed_price_factor?: number
                    qa_pct?: number
                    min_billable_hours?: number
                    volume_discount_cap_pct?: number
                    updated_at?: string
                }
                Update: {
                    user_id?: string
                    rate_international_usd?: number
                    rate_local_premium_cop?: number
                    rate_local_standard_cop?: number
                    usd_cop_rate?: number
                    fixed_price_factor?: number
                    qa_pct?: number
                    min_billable_hours?: number
                    volume_discount_cap_pct?: number
                    updated_at?: string
                }
            }
            quote_presets: {
                Row: {
                    id: string
                    user_id: string
                    name: string
                    kind: PresetKind
                    currency: QuoteCurrency
                    price_min: number | null
                    price_max: number | null
                    hours_min: number | null
                    hours_max: number | null
                    market_floor: number | null
                    hierarchy_rank: number
                    active: boolean
                    sort_order: number
                    created_at: string
                }
                Insert: {
                    id?: string
                    user_id: string
                    name: string
                    kind?: PresetKind
                    currency?: QuoteCurrency
                    price_min?: number | null
                    price_max?: number | null
                    hours_min?: number | null
                    hours_max?: number | null
                    market_floor?: number | null
                    hierarchy_rank?: number
                    active?: boolean
                    sort_order?: number
                    created_at?: string
                }
                Update: {
                    id?: string
                    user_id?: string
                    name?: string
                    kind?: PresetKind
                    currency?: QuoteCurrency
                    price_min?: number | null
                    price_max?: number | null
                    hours_min?: number | null
                    hours_max?: number | null
                    market_floor?: number | null
                    hierarchy_rank?: number
                    active?: boolean
                    sort_order?: number
                    created_at?: string
                }
            }
            quotes: {
                Row: {
                    id: string
                    quote_number: string
                    client_id: string
                    title: string
                    project_type: string | null
                    rate_profile: RateProfile
                    hourly_rate: number
                    currency: QuoteCurrency
                    usd_cop_rate: number
                    qa_pct: number
                    fixed_factor: number
                    status: QuoteStatus
                    issue_date: string
                    valid_until: string | null
                    show_hours: boolean
                    show_rate: boolean
                    payment_terms: string | null
                    notes: string | null
                    total_hours: number
                    total_price: number
                    created_at: string
                    updated_at: string
                    user_id: string
                }
                Insert: {
                    id?: string
                    quote_number: string
                    client_id: string
                    title: string
                    project_type?: string | null
                    rate_profile: RateProfile
                    hourly_rate: number
                    currency: QuoteCurrency
                    usd_cop_rate?: number
                    qa_pct?: number
                    fixed_factor?: number
                    status?: QuoteStatus
                    issue_date?: string
                    valid_until?: string | null
                    show_hours?: boolean
                    show_rate?: boolean
                    payment_terms?: string | null
                    notes?: string | null
                    total_hours?: number
                    total_price?: number
                    created_at?: string
                    updated_at?: string
                    user_id: string
                }
                Update: {
                    id?: string
                    quote_number?: string
                    client_id?: string
                    title?: string
                    project_type?: string | null
                    rate_profile?: RateProfile
                    hourly_rate?: number
                    currency?: QuoteCurrency
                    usd_cop_rate?: number
                    qa_pct?: number
                    fixed_factor?: number
                    status?: QuoteStatus
                    issue_date?: string
                    valid_until?: string | null
                    show_hours?: boolean
                    show_rate?: boolean
                    payment_terms?: string | null
                    notes?: string | null
                    total_hours?: number
                    total_price?: number
                    created_at?: string
                    updated_at?: string
                    user_id?: string
                }
            }
            quote_items: {
                Row: {
                    id: string
                    quote_id: string
                    name: string
                    description: string | null
                    pricing_mode: PricingMode
                    components: string[]
                    complexity_suggested: Complexity | null
                    complexity: Complexity | null
                    reuse_pct: number
                    hours_suggested: number | null
                    hours: number | null
                    qty: number
                    volume_discount_pct: number
                    price_override: number | null
                    fixed_price: number | null
                    preset_id: string | null
                    missing_info: string[]
                    line_hours: number
                    line_total: number
                    sort_order: number
                    created_at: string
                }
                Insert: {
                    id?: string
                    quote_id: string
                    name: string
                    description?: string | null
                    pricing_mode?: PricingMode
                    components?: string[]
                    complexity_suggested?: Complexity | null
                    complexity?: Complexity | null
                    reuse_pct?: number
                    hours_suggested?: number | null
                    hours?: number | null
                    qty?: number
                    volume_discount_pct?: number
                    price_override?: number | null
                    fixed_price?: number | null
                    preset_id?: string | null
                    missing_info?: string[]
                    line_hours?: number
                    line_total?: number
                    sort_order?: number
                    created_at?: string
                }
                Update: {
                    id?: string
                    quote_id?: string
                    name?: string
                    description?: string | null
                    pricing_mode?: PricingMode
                    components?: string[]
                    complexity_suggested?: Complexity | null
                    complexity?: Complexity | null
                    reuse_pct?: number
                    hours_suggested?: number | null
                    hours?: number | null
                    qty?: number
                    volume_discount_pct?: number
                    price_override?: number | null
                    fixed_price?: number | null
                    preset_id?: string | null
                    missing_info?: string[]
                    line_hours?: number
                    line_total?: number
                    sort_order?: number
                    created_at?: string
                }
            }
            quote_sequence: {
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
        }
        Functions: {
            generate_invoice_number: {
                Args: Record<string, never>
                Returns: string
            }
            generate_quote_number: {
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

export type QuoteSettings = Database['public']['Tables']['quote_settings']['Row']
export type QuoteSettingsUpdate = Database['public']['Tables']['quote_settings']['Update']

export type QuotePreset = Database['public']['Tables']['quote_presets']['Row']
export type QuotePresetInsert = Database['public']['Tables']['quote_presets']['Insert']
export type QuotePresetUpdate = Database['public']['Tables']['quote_presets']['Update']

export type Quote = Database['public']['Tables']['quotes']['Row']
export type QuoteInsert = Database['public']['Tables']['quotes']['Insert']
export type QuoteUpdate = Database['public']['Tables']['quotes']['Update']

export type QuoteItem = Database['public']['Tables']['quote_items']['Row']
export type QuoteItemInsert = Database['public']['Tables']['quote_items']['Insert']
export type QuoteItemUpdate = Database['public']['Tables']['quote_items']['Update']

export type QuoteWithClient = Quote & {
    client: Client
}

export type QuoteFull = Quote & {
    client: Client
    items: QuoteItem[]
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
