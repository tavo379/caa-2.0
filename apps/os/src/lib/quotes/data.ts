// Helpers de datos del cotizador (server-side).
import type { SupabaseClient } from '@supabase/supabase-js'
import type { Database, QuoteSettings } from '../supabase/types'

// Defaults espejo de la migración 004: cubren el caso de un usuario
// creado después de correr el seed.
export const DEFAULT_QUOTE_SETTINGS: Omit<QuoteSettings, 'user_id' | 'updated_at'> = {
    rate_international_usd: 30,
    rate_local_premium_cop: 115000,
    rate_local_standard_cop: 60000,
    usd_cop_rate: 4000,
    fixed_price_factor: 1.3,
    qa_pct: 12,
    min_billable_hours: 4,
    volume_discount_cap_pct: 30,
}

export async function getQuoteSettings(
    supabase: SupabaseClient<Database>,
    userId: string,
): Promise<QuoteSettings> {
    const { data } = await supabase
        .from('quote_settings')
        .select('*')
        .eq('user_id', userId)
        .single()

    return (
        data ?? {
            ...DEFAULT_QUOTE_SETTINGS,
            user_id: userId,
            updated_at: new Date().toISOString(),
        }
    )
}
