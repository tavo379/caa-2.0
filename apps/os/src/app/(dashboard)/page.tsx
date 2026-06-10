import Link from 'next/link'
import { createClient } from '@/lib/supabase/server'
import { es } from '@/i18n/es'
import {
    Users,
    FileText,
    Clock,
    CheckCircle2,
    AlertCircle,
    Plus,
    ArrowRight
} from 'lucide-react'

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
            currency: 'COP', // CHANGED: Force COP
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
            <div className="page-header" style={{ marginBottom: '2rem' }}>
                <div>
                    <h1 className="page-title" style={{ lineHeight: '1', marginBottom: '8px' }}>{es.dashboard.title}</h1>
                    <p className="text-muted" style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', margin: 0, fontSize: 'var(--text-sm)' }}>
                        <span style={{ width: '6px', height: '6px', borderRadius: '50%', background: 'var(--color-success)' }}></span>
                        {user?.email}
                    </p>
                </div>
                <Link href="/facturas/nueva" className="btn btn-primary">
                    <Plus size={18} />
                    {es.invoices.newInvoice}
                </Link>
            </div>

            {/* FORCE HORIZONTAL GRID WITH INLINE STYLES */}
            <div style={{
                display: 'grid',
                gridTemplateColumns: 'repeat(4, 1fr)',
                gap: '1rem',
                marginBottom: '2rem'
            }}>
                <div className="stat-card">
                    <div className="flex justify-between items-center mb-4">
                        <div className="stat-label">{es.dashboard.totalInvoices}</div>
                        <FileText size={20} className="text-muted" />
                    </div>
                    <div className="stat-value">{totalInvoices || 0}</div>
                </div>
                <div className="stat-card">
                    <div className="flex justify-between items-center mb-4">
                        <div className="stat-label">{es.dashboard.totalClients}</div>
                        <Users size={20} className="text-muted" />
                    </div>
                    <div className="stat-value">{totalClients || 0}</div>
                </div>
                <div className="stat-card">
                    <div className="flex justify-between items-center mb-4">
                        <div className="stat-label">{es.dashboard.pendingAmount}</div>
                        <Clock size={20} color="var(--color-warning)" />
                    </div>
                    <div className="stat-value warning">{formatCurrency(totalPending)}</div>
                </div>
                <div className="stat-card">
                    <div className="flex justify-between items-center mb-4">
                        <div className="stat-label">{es.dashboard.paidThisMonth}</div>
                        <CheckCircle2 size={20} color="var(--color-success)" />
                    </div>
                    <div className="stat-value success">{formatCurrency(totalPaid)}</div>
                </div>
            </div>

            <div className="card">
                <div className="card-header">
                    <h3 className="card-title">{es.dashboard.recentInvoices}</h3>
                    <Link href="/facturas" className="btn btn-ghost btn-sm">
                        {es.dashboard.viewAll} <ArrowRight size={16} />
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
                                            <Link
                                                href={`/facturas/${invoice.id}`}
                                                className="font-medium hover:text-accent"
                                                style={{ display: 'flex', alignItems: 'center', gap: '0.75rem' }}
                                            >
                                                <FileText size={16} className="text-muted" />
                                                {invoice.invoice_number}
                                            </Link>
                                        </td>
                                        <td>{invoice.client?.name || '-'}</td>
                                        <td>{new Date(invoice.issue_date).toLocaleDateString('es-CO', { year: 'numeric', month: 'short', day: 'numeric' })}</td>
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
                        <div className="empty-state-icon">
                            <AlertCircle size={48} strokeWidth={1} />
                        </div>
                        <div className="empty-state-title">{es.invoices.noInvoices}</div>
                        <div className="empty-state-description">{es.invoices.noInvoicesDesc}</div>
                        <Link href="/facturas/nueva" className="btn btn-primary">
                            <Plus size={18} />
                            {es.invoices.newInvoice}
                        </Link>
                    </div>
                )}
            </div>
        </>
    )
}
