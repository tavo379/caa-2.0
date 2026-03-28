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
