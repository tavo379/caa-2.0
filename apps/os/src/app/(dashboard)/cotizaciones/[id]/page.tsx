import Link from 'next/link'
import { notFound, redirect } from 'next/navigation'
import { ArrowLeft } from 'lucide-react'
import { createClient } from '@/lib/supabase/server'
import { getQuoteSettings } from '@/lib/quotes/data'
import { QuoteForm } from '@/components/QuoteForm'
import { QuoteExport } from '@/components/QuoteExport'
import { QuoteDeleteButton } from './QuoteDeleteButton'
import { es } from '@/i18n/es'
import type { Client, QuoteItem } from '@/lib/supabase/types'

interface QuoteDetailPageProps {
    params: Promise<{ id: string }>
}

export default async function QuoteDetailPage({ params }: QuoteDetailPageProps) {
    const { id } = await params
    const supabase = await createClient()
    const { data: { user } } = await supabase.auth.getUser()

    if (!user) {
        redirect('/login')
    }

    const { data: quote } = await supabase
        .from('quotes')
        .select(`*, client:clients(*), items:quote_items(*)`)
        .eq('id', id)
        .single()

    if (!quote) {
        notFound()
    }

    const client = quote.client as Client
    const items = ((quote.items || []) as QuoteItem[]).sort(
        (a, b) => a.sort_order - b.sort_order,
    )

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
                    <h1 className="page-title">{quote.quote_number}</h1>
                    <span className={`badge badge-${quote.status}`}>
                        {
                            {
                                draft: es.quotes.statusDraft,
                                sent: es.quotes.statusSent,
                                approved: es.quotes.statusApproved,
                                rejected: es.quotes.statusRejected,
                                expired: es.quotes.statusExpired,
                            }[quote.status]
                        }
                    </span>
                </div>
                <QuoteDeleteButton quoteId={quote.id} />
            </div>

            {/* Export primero: lo más frecuente al volver a una cotización */}
            <div style={{ marginBottom: 'var(--space-6)' }}>
                <QuoteExport quote={quote} items={items} client={client} />
            </div>

            <QuoteForm
                quote={{ ...quote, client, items }}
                clients={clients || []}
                presets={presets || []}
                settings={settings}
                userId={user.id}
            />
        </>
    )
}
