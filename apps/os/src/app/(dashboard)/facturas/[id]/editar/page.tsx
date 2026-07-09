import Link from 'next/link'
import { notFound } from 'next/navigation'
import { createClient } from '@/lib/supabase/server'
import { es } from '@/i18n/es'
import { InvoiceForm } from '@/components/InvoiceForm'

interface EditInvoicePageProps {
    params: Promise<{ id: string }>
}

export default async function EditInvoicePage({ params }: EditInvoicePageProps) {
    const { id } = await params
    const supabase = await createClient()
    const { data: { user } } = await supabase.auth.getUser()

    const { data: invoice } = await supabase
        .from('invoices')
        .select(`
            *,
            items:invoice_items(*)
        `)
        .eq('id', id)
        .single()

    if (!invoice) {
        notFound()
    }

    // Sort items so they show in the same order in the form
    if (invoice.items) {
        invoice.items.sort((a: any, b: any) => a.sort_order - b.sort_order)
    }

    const { data: clients } = await supabase
        .from('clients')
        .select('*')
        .order('name')

    return (
        <>
            <div className="page-header">
                <div>
                    <Link href={`/facturas/${id}`} className="text-muted text-sm" style={{ marginBottom: 'var(--space-2)', display: 'block' }}>
                        ← {es.common.back}
                    </Link>
                    <h1 className="page-title">{es.invoices.editInvoice} · {invoice.invoice_number}</h1>
                </div>
            </div>

            <InvoiceForm invoice={invoice} clients={clients || []} userId={user!.id} />
        </>
    )
}
