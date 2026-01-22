import Link from 'next/link'
import { notFound } from 'next/navigation'
import { createClient } from '@/lib/supabase/server'
import { es } from '@/i18n/es'
import { InvoiceActions } from './InvoiceActions'

interface InvoiceDetailPageProps {
    params: Promise<{ id: string }>
}

export default async function InvoiceDetailPage({ params }: InvoiceDetailPageProps) {
    const { id } = await params
    const supabase = await createClient()

    const { data: invoice } = await supabase
        .from('invoices')
        .select(`
      *,
      client:clients(*),
      items:invoice_items(*)
    `)
        .eq('id', id)
        .single()

    if (!invoice) {
        notFound()
    }

    const getStatusLabel = (status: string) => {
        const labels: Record<string, string> = {
            draft: es.invoices.statusDraft,
            sent: es.invoices.statusSent,
            paid: es.invoices.statusPaid,
            void: es.invoices.statusVoid
        }
        return labels[status] || status
    }

    const formatCurrency = (amount: number) => {
        return new Intl.NumberFormat('es-CO', {
            style: 'currency',
            currency: invoice.currency,
            minimumFractionDigits: 2
        }).format(amount)
    }

    // Sort items by sort_order
    const sortedItems = invoice.items?.sort((a: any, b: any) => a.sort_order - b.sort_order) || []

    return (
        <>
            <div className="page-header">
                <div>
                    <Link href="/facturas" className="text-muted text-sm" style={{ marginBottom: 'var(--space-2)', display: 'block' }}>
                        ← {es.common.back}
                    </Link>
                    <div className="flex items-center gap-4">
                        <h1 className="page-title">{invoice.invoice_number}</h1>
                        <span className={`badge badge-${invoice.status}`}>
                            {getStatusLabel(invoice.status)}
                        </span>
                    </div>
                </div>
                <InvoiceActions invoice={invoice} />
            </div>

            {/* Invoice Preview */}
            <div className="invoice-preview">
                <div className="invoice-header">
                    <div className="invoice-logo">
                        <img src="/logo.svg" alt="Cacao & Avocado" />
                    </div>
                    <div className="invoice-meta">
                        <div className="invoice-number">{invoice.invoice_number}</div>
                        <div className="invoice-date">
                            {es.pdf.invoiceDate}: {new Date(invoice.issue_date).toLocaleDateString('es-CO')}
                        </div>
                        {invoice.due_date && (
                            <div className="invoice-date">
                                {es.pdf.dueDate}: {new Date(invoice.due_date).toLocaleDateString('es-CO')}
                            </div>
                        )}
                    </div>
                </div>

                <div className="invoice-parties">
                    <div>
                        <div className="invoice-party-label">{es.pdf.from}</div>
                        <div className="invoice-party-name">Cacao & Avocado</div>
                        <div className="text-muted text-sm">
                            gustavo.ramirez@cacaoandavocado.co
                        </div>
                    </div>
                    <div>
                        <div className="invoice-party-label">{es.pdf.billTo}</div>
                        <div className="invoice-party-name">{invoice.client?.name}</div>
                        {invoice.client?.company && (
                            <div className="text-muted text-sm">{invoice.client.company}</div>
                        )}
                        {invoice.client?.tax_id && (
                            <div className="text-muted text-sm">NIT: {invoice.client.tax_id}</div>
                        )}
                        {invoice.client?.email && (
                            <div className="text-muted text-sm">{invoice.client.email}</div>
                        )}
                        {invoice.client?.address && (
                            <div className="text-muted text-sm">{invoice.client.address}</div>
                        )}
                    </div>
                </div>

                <table className="invoice-items-table">
                    <thead>
                        <tr>
                            <th style={{ width: '50%' }}>{es.invoices.description}</th>
                            <th style={{ width: '15%', textAlign: 'center' }}>{es.invoices.quantity}</th>
                            <th style={{ width: '17%', textAlign: 'right' }}>{es.invoices.unitPrice}</th>
                            <th style={{ width: '18%', textAlign: 'right' }}>{es.invoices.lineTotal}</th>
                        </tr>
                    </thead>
                    <tbody>
                        {sortedItems.map((item: any) => (
                            <tr key={item.id}>
                                <td>{item.description}</td>
                                <td style={{ textAlign: 'center' }}>{item.qty}</td>
                                <td style={{ textAlign: 'right' }}>{formatCurrency(item.unit_price)}</td>
                                <td style={{ textAlign: 'right' }}>{formatCurrency(item.line_total)}</td>
                            </tr>
                        ))}
                    </tbody>
                </table>

                <div className="invoice-totals">
                    <table className="invoice-totals-table">
                        <tbody>
                            <tr>
                                <td className="text-muted">{es.invoices.subtotal}</td>
                                <td style={{ textAlign: 'right' }}>{formatCurrency(invoice.subtotal)}</td>
                            </tr>
                            <tr>
                                <td className="text-muted">{es.invoices.tax}</td>
                                <td style={{ textAlign: 'right' }}>{formatCurrency(invoice.tax)}</td>
                            </tr>
                            <tr className="total-row">
                                <td>{es.invoices.total}</td>
                                <td style={{ textAlign: 'right' }}>{formatCurrency(invoice.total)}</td>
                            </tr>
                        </tbody>
                    </table>
                </div>

                {invoice.notes && (
                    <div className="invoice-notes">
                        <div className="invoice-notes-label">{es.invoices.notes}</div>
                        <div className="text-muted text-sm" style={{ whiteSpace: 'pre-wrap' }}>
                            {invoice.notes}
                        </div>
                    </div>
                )}

                <div style={{ marginTop: 'var(--space-10)', textAlign: 'center' }}>
                    <p className="text-muted text-sm">{es.pdf.thankYou}</p>
                </div>
            </div>
        </>
    )
}
