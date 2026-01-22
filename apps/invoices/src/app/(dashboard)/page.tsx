import Link from 'next/link'
import { createClient } from '@/lib/supabase/server'
import { es } from '@/i18n/es'

export default async function DashboardPage() {
    const supabase = await createClient()
    const { data: { user } } = await supabase.auth.getUser()

    // Fetch stats
    const [
        { count: totalInvoices },
        { count: totalClients },
        { data: paidInvoices },
        { data: pendingInvoices },
        { data: recentInvoices }
    ] = await Promise.all([
        supabase.from('invoices').select('*', { count: 'exact', head: true }),
        supabase.from('clients').select('*', { count: 'exact', head: true }),
        supabase.from('invoices').select('total').eq('status', 'paid'),
        supabase.from('invoices').select('total').in('status', ['draft', 'sent']),
        supabase.from('invoices')
            .select(`
        id,
        invoice_number,
        total,
        status,
        issue_date,
        client:clients(name)
      `)
            .order('created_at', { ascending: false })
            .limit(5)
    ])

    const totalPaid = paidInvoices?.reduce((sum, inv) => sum + (inv.total || 0), 0) || 0
    const totalPending = pendingInvoices?.reduce((sum, inv) => sum + (inv.total || 0), 0) || 0

    const formatCurrency = (amount: number) => {
        return new Intl.NumberFormat('es-CO', {
            style: 'currency',
            currency: 'USD',
            minimumFractionDigits: 0,
            maximumFractionDigits: 0
        }).format(amount)
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

    return (
        <>
            <div className="page-header">
                <div>
                    <h1 className="page-title">{es.dashboard.title}</h1>
                    <p className="text-muted">{es.dashboard.welcome}, {user?.email}</p>
                </div>
                <Link href="/facturas/nueva" className="btn btn-primary">
                    + {es.invoices.newInvoice}
                </Link>
            </div>

            <div className="stats-grid">
                <div className="stat-card">
                    <div className="stat-label">{es.dashboard.totalInvoices}</div>
                    <div className="stat-value">{totalInvoices || 0}</div>
                </div>
                <div className="stat-card">
                    <div className="stat-label">{es.dashboard.totalClients}</div>
                    <div className="stat-value">{totalClients || 0}</div>
                </div>
                <div className="stat-card">
                    <div className="stat-label">{es.dashboard.pendingAmount}</div>
                    <div className="stat-value warning">{formatCurrency(totalPending)}</div>
                </div>
                <div className="stat-card">
                    <div className="stat-label">{es.dashboard.paidThisMonth}</div>
                    <div className="stat-value success">{formatCurrency(totalPaid)}</div>
                </div>
            </div>

            <div className="card">
                <div className="card-header">
                    <h3 className="card-title">{es.dashboard.recentInvoices}</h3>
                    <Link href="/facturas" className="btn btn-ghost btn-sm">
                        {es.dashboard.viewAll} →
                    </Link>
                </div>

                {recentInvoices && recentInvoices.length > 0 ? (
                    <div className="table-container">
                        <table className="table">
                            <thead>
                                <tr>
                                    <th>{es.invoices.invoiceNumber}</th>
                                    <th>{es.invoices.client}</th>
                                    <th>{es.invoices.issueDate}</th>
                                    <th>{es.invoices.status}</th>
                                    <th className="text-right">{es.invoices.total}</th>
                                </tr>
                            </thead>
                            <tbody>
                                {recentInvoices.map((invoice: any) => (
                                    <tr key={invoice.id}>
                                        <td>
                                            <Link href={`/facturas/${invoice.id}`} className="font-medium">
                                                {invoice.invoice_number}
                                            </Link>
                                        </td>
                                        <td>{invoice.client?.name || '-'}</td>
                                        <td>{new Date(invoice.issue_date).toLocaleDateString('es-CO')}</td>
                                        <td>
                                            <span className={`badge badge-${invoice.status}`}>
                                                {getStatusLabel(invoice.status)}
                                            </span>
                                        </td>
                                        <td className="text-right font-medium">
                                            {formatCurrency(invoice.total)}
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
