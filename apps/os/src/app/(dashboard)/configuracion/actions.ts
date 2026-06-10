'use server'

import { createClient } from '@/lib/supabase/server'
import { revalidatePath } from 'next/cache'
import { redirect } from 'next/navigation'

export async function updateSettings(formData: FormData) {
    const supabase = await createClient()
    const { data: { user } } = await supabase.auth.getUser()

    if (!user) {
        throw new Error('Not authenticated')
    }

    const signatureUrl = formData.get('signatureUrl') as string
    const businessName = formData.get('businessName') as string
    const taxId = formData.get('taxId') as string

    // Upsert settings
    const { error } = await supabase
        .from('user_settings')
        .upsert({
            user_id: user.id,
            signature_url: signatureUrl,
            business_name: businessName,
            tax_id: taxId,
            updated_at: new Date().toISOString()
        })

    if (error) {
        console.error('Error updating settings:', error)
        throw new Error('Failed to update settings')
    }

    revalidatePath('/configuracion')
    redirect('/configuracion?saved=true')
}

export async function updateQuoteSettings(formData: FormData) {
    const supabase = await createClient()
    const { data: { user } } = await supabase.auth.getUser()

    if (!user) {
        throw new Error('Not authenticated')
    }

    const num = (key: string, fallback: number) => {
        const v = parseFloat(formData.get(key) as string)
        return Number.isFinite(v) ? v : fallback
    }

    const { error } = await supabase
        .from('quote_settings')
        .upsert({
            user_id: user.id,
            rate_international_usd: num('rateInternational', 30),
            rate_local_premium_cop: num('rateLocalPremium', 115000),
            rate_local_standard_cop: num('rateLocalStandard', 60000),
            usd_cop_rate: num('usdCopRate', 4000),
            fixed_price_factor: num('fixedPriceFactor', 1.3),
            qa_pct: num('qaPct', 12),
            min_billable_hours: num('minBillableHours', 4),
            volume_discount_cap_pct: num('volumeDiscountCap', 30),
            updated_at: new Date().toISOString(),
        })

    if (error) {
        console.error('Error updating quote settings:', error)
        throw new Error('Failed to update quote settings')
    }

    revalidatePath('/configuracion')
    redirect('/configuracion?saved=true')
}
