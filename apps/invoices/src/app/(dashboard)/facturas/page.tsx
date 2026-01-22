import Link from 'next/link'
import { createClient } from '@/lib/supabase/server'
import { es } from '@/i18n/es'

interface InvoicesPageProps {
    searchParams: Promise<{ status?: string; client?: string }>
}

export default async function InvoicesPage({ searchParams }: InvoicesPageProps) {
    const { status, client } = await searchParams
    const supabase = await createClient()

    // Build query with filters
    let query = supabase
        .from('invoices')
        .select(`
      id,
      invoice_number,
      issue_date,
      due_date,
      status,
      total,
      currency,
      client:clients(id, name)
    `)
        .order('created_at', { ascending: false })

    if (status && status !== 'all') {
        query = query.eq('status', status)
    }

    if (client) {
        query = query.eq('client_id', client)
    }

    const { data: invoices, error } = await query

    // Get clients for filter dropdown
    const { data: clients } = await supabase
        .from('clients')
        .select('id, name')
        .order('name')

    if (error) {
        console.error('Error fetching invoices:', error)
    }

    const getStatusLabel = (s: string) => {
        const labels: Record<string, string> = {
            draft: es.invoices.statusDraft,
            sent: es.invoices.statusSent,
            paid: es.invoices.statusPaid,
            void: es.invoices.statusVoid
        }
        return labels[s] || s
    }

    const formatCurrency = (amount: number, currency: string = 'USD') => {
        return new Intl.NumberFormat('es-CO', {
            style: 'currency',
            currency,
            minimumFractionDigits: 0,
            maximumFractionDigits: 0
        }).format(amount)
    }

    return (
        <>
            <div className="page-header">
                <h1 className="page-title">{es.invoices.title}</h1>
                <Link href="/facturas/nueva" className="btn btn-primary">
                    + {es.invoices.newInvoice}
                </Link>
            </div>

            {/* Filters */}
            <div className="card" style={{ marginBottom: 'var(--space-6)', padding: 'var(--space-4)' }}>
                <form className="flex gap-4 items-center" style={{ flexWrap: 'wrap' }}>
                    <div className="form-group" style={{ marginBottom: 0, minWidth: '150px' }}>
                        <label htmlFor="status" className="form-label">{es.filters.status}</label>
                        <select
                            id="status"
                            name="status"
                            className="form-select"
                            defaultValue={status || 'all'}
                        >
                            <option value="all">{es.filters.all}</option>
                            <option value="draft">{es.invoices.statusDraft}</option>
                            <option value="sent">{es.invoices.statusSent}</option>
                            <option value="paid">{es.invoices.statusPaid}</option>
                            <option value="void">{es.invoices.statusVoid}</option>
                        </select>
                    </div>

                    <div className="form-group" style={{ marginBottom: 0, minWidth: '200px' }}>
                        <label htmlFor="client" className="form-label">{es.filters.client}</label>
                        <select
                            id="client"
                            name="client"
                            className="form-select"
                            defaultValue={client || ''}
                        >
                            <option value="">{es.filters.all}</option>
                            {clients?.map((c) => (
                                <option key={c.id} value={c.id}>{c.name}</option>
                            ))}
                        </select>
                    </div>

                    <div style={{ alignSelf: 'flex-end' }}>
                        <button type="submit" className="btn btn-secondary">
                            Filtrar
                        </button>
                    </div>
                </form>
            </div>

            <div className="card">
                {invoices && invoices.length > 0 ? (
                    <div className="table-container">
                        <table className="table">
                            <thead>
                                <tr>
                                    <th>{es.invoices.invoiceNumber}</th>
                                    <th>{es.invoices.client}</th>
                                    <th>{es.invoices.issueDate}</th>
                                    <th>{es.invoices.dueDate}</th>
                                    <th>{es.invoices.status}</th>
                                    <th className="text-right">{es.invoices.total}</th>
                                    <th className="text-right">{es.invoices.actions}</th>
                                </tr>
                            </thead>
                            <tbody>
                                {invoices.map((invoice: any) => (
                                    <tr key={invoice.id}>
                                        <td>
                                            <Link href={`/facturas/${invoice.id}`} className="font-medium">
                                                {invoice.invoice_number}
                                            </Link>
                                        </td>
                                        <td>{invoice.client?.name || '-'}</td>
                                        <td className="text-sm">
                                            {new Date(invoice.issue_date).toLocaleDateString('es-CO')}
                                        </td>
                                        <td className="text-sm text-muted">
                                            {invoice.due_date
                                                ? new Date(invoice.due_date).toLocaleDateString('es-CO')
                                                : '-'
                                            }
                                        </td>
                                        <td>
                                            <span className={`badge badge-${invoice.status}`}>
                                                {getStatusLabel(invoice.status)}
                                            </span>
                                        </td>
                                        <td className="text-right font-medium">
                                            {formatCurrency(invoice.total, invoice.currency)}
                                        </td>
                                        <td>
                                            <div className="table-actions" style={{ justifyContent: 'flex-end' }}>
                                                <Link
                                                    href={`/facturas/${invoice.id}`}
                                                    className="btn btn-ghost btn-sm"
                                                >
                                                    Ver
                                                </Link>
                                            </div>
                                        </td>
                                    </tr>
                                ))}
                            </tbody>
                        </table>
                    </div>
                ) : (
                    <div className="empty-state">
                        <div className="empty-state-icon">📄</div>
                        <div className="empty-state-title">{es.invoices.noInvoices}</div>
                        <div className="empty-state-description">{es.invoices.noInvoicesDesc}</div>
                        <Link href="/facturas/nueva" className="btn btn-primary">
                            + {es.invoices.newInvoice}
                        </Link>
                    </div>
                )}
            </div>
        </>
    )
}
