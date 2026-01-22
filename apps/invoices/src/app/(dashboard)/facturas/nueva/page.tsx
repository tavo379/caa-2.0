import Link from 'next/link'
import { createClient } from '@/lib/supabase/server'
import { es } from '@/i18n/es'
import { InvoiceForm } from '@/components/InvoiceForm'

export default async function NewInvoicePage() {
    const supabase = await createClient()
    const { data: { user } } = await supabase.auth.getUser()

    // Get clients for dropdown
    const { data: clients } = await supabase
        .from('clients')
        .select('*')
        .order('name')

    return (
        <>
            <div className="page-header">
                <div>
                    <Link href="/facturas" className="text-muted text-sm" style={{ marginBottom: 'var(--space-2)', display: 'block' }}>
                        ← {es.common.back}
                    </Link>
                    <h1 className="page-title">{es.invoices.newInvoice}</h1>
                </div>
            </div>

            {clients && clients.length > 0 ? (
                <InvoiceForm clients={clients} userId={user!.id} />
            ) : (
                <div className="card">
                    <div className="empty-state">
                        <div className="empty-state-icon">👥</div>
                        <div className="empty-state-title">Primero crea un cliente</div>
                        <div className="empty-state-description">
                            Necesitas tener al menos un cliente para crear una factura
                        </div>
                        <Link href="/clientes/nuevo" className="btn btn-primary">
                            + {es.clients.newClient}
                        </Link>
                    </div>
                </div>
            )}
        </>
    )
}
