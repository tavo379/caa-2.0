import Link from 'next/link'
import { redirect } from 'next/navigation'
import { ArrowLeft } from 'lucide-react'
import { createClient } from '@/lib/supabase/server'
import { getQuoteSettings } from '@/lib/quotes/data'
import { QuoteForm } from '@/components/QuoteForm'
import { es } from '@/i18n/es'

export default async function NewQuotePage() {
    const supabase = await createClient()
    const { data: { user } } = await supabase.auth.getUser()

    if (!user) {
        redirect('/login')
    }

    const [{ data: clients }, { data: presets }, settings] = await Promise.all([
        supabase.from('clients').select('*').order('name'),
        supabase.from('quote_presets').select('*').eq('active', true).order('sort_order'),
        getQuoteSettings(supabase, user.id),
    ])

    return (
        <>
            <div className="page-header">
                <div style={{ display: 'flex', alignItems: 'center', gap: 'var(--space-3)' }}>
                    <Link href="/cotizaciones" className="btn btn-ghost btn-sm">
                        <ArrowLeft size={16} />
                    </Link>
                    <h1 className="page-title">{es.quotes.newQuote}</h1>
                </div>
            </div>

            <QuoteForm
                clients={clients || []}
                presets={presets || []}
                settings={settings}
                userId={user.id}
            />
        </>
    )
}
