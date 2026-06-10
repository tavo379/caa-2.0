import Link from 'next/link'
import { createClient } from '@/lib/supabase/server'
import { es } from '@/i18n/es'
import { Calculator, Eye, Filter, Plus } from 'lucide-react'

interface QuotesPageProps {
    searchParams: Promise<{ status?: string; client?: string }>
}

export default async function QuotesPage({ searchParams }: QuotesPageProps) {
    const { status, client } = await searchParams
    const supabase = await createClient()

    let query = supabase
        .from('quotes')
        .select(`
      id,
      quote_number,
      title,
      issue_date,
      valid_until,
      status,
      total_price,
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

    const { data: quotes, error } = await query

    const { data: clients } = await supabase
        .from('clients')
        .select('id, name')
        .order('name')

    if (error) {
        console.error('Error fetching quotes:', error)
    }

    const statusLabels: Record<string, string> = {
        draft: es.quotes.statusDraft,
        sent: es.quotes.statusSent,
        approved: es.quotes.statusApproved,
        rejected: es.quotes.statusRejected,
        expired: es.quotes.statusExpired,
    }

    const formatCurrency = (amount: number, currency: string = 'COP') => {
        return new Intl.NumberFormat('es-CO', {
            style: 'currency',
            currency,
            minimumFractionDigits: 0,
            maximumFractionDigits: 0,
        }).format(amount)
    }

    return (
        <>
            <div className="page-header">
                <h1 className="page-title">{es.quotes.title}</h1>
                <Link href="/cotizaciones/nueva" className="btn btn-primary">
                    <Plus size={16} />
                    {es.quotes.newQuote}
                </Link>
            </div>

            {/* Filtros */}
            <div className="card" style={{ marginBottom: 'var(--space-6)', padding: 'var(--space-4)' }}>
                <form style={{ display: 'flex', flexDirection: 'row', alignItems: 'flex-end', gap: '1rem', flexWrap: 'nowrap' }}>
                    <div className="form-group" style={{ marginBottom: 0, width: '180px', minWidth: '180px' }}>
                        <label htmlFor="status" className="form-label">{es.filters.status}</label>
                        <select id="status" name="status" className="form-select" defaultValue={status || 'all'}>
                            <option value="all">{es.filters.all}</option>
                            <option value="draft">{es.quotes.statusDraft}</option>
                            <option value="sent">{es.quotes.statusSent}</option>
                            <option value="approved">{es.quotes.statusApproved}</option>
                            <option value="rejected">{es.quotes.statusRejected}</option>
                            <option value="expired">{es.quotes.statusExpired}</option>
                        </select>
                    </div>

                    <div className="form-group" style={{ marginBottom: 0, width: '250px', minWidth: '250px' }}>
                        <label htmlFor="client" className="form-label">{es.filters.client}</label>
                        <select id="client" name="client" className="form-select" defaultValue={client || ''}>
                            <option value="">{es.filters.all}</option>
                            {clients?.map((c) => (
                                <option key={c.id} value={c.id}>{c.name}</option>
                            ))}
                        </select>
                    </div>

                    <div style={{ marginBottom: 0 }}>
                        <label className="form-label" style={{ opacity: 0, pointerEvents: 'none' }}>&nbsp;</label>
                        <button type="submit" className="btn btn-secondary" style={{ width: '100%' }}>
                            <Filter size={14} />
                            Filtrar
                        </button>
                    </div>
                </form>
            </div>

            <div className="card">
                {quotes && quotes.length > 0 ? (
                    <div className="table-container">
                        <table className="table">
                            <thead>
                                <tr>
                                    <th>{es.quotes.quoteNumber}</th>
                                    <th>{es.quotes.client}</th>
                                    <th>Proyecto</th>
                                    <th>{es.quotes.issueDate}</th>
                                    <th>{es.quotes.status}</th>
                                    <th className="text-right">{es.quotes.total}</th>
                                    <th className="text-right"></th>
                                </tr>
                            </thead>
                            <tbody>
                                {quotes.map((quote: any) => (
                                    <tr key={quote.id}>
                                        <td>
                                            <Link
                                                href={`/cotizaciones/${quote.id}`}
                                                className="font-medium hover:text-accent"
                                                style={{ display: 'flex', alignItems: 'center', gap: '0.75rem' }}
                                            >
                                                <Calculator size={16} className="text-muted" />
                                                {quote.quote_number}
                                            </Link>
                                        </td>
                                        <td>{quote.client?.name || '-'}</td>
                                        <td className="text-sm">{quote.title}</td>
                                        <td className="text-sm">
                                            {new Date(quote.issue_date).toLocaleDateString('es-CO')}
                                        </td>
                                        <td>
                                            <span className={`badge badge-${quote.status}`}>
                                                {statusLabels[quote.status] || quote.status}
                                            </span>
                                        </td>
                                        <td className="text-right font-medium">
                                            {formatCurrency(quote.total_price, quote.currency)}
                                        </td>
                                        <td>
                                            <div className="table-actions" style={{ justifyContent: 'flex-end' }}>
                                                <Link
                                                    href={`/cotizaciones/${quote.id}`}
                                                    className="btn btn-ghost btn-sm"
                                                    title="Ver detalle"
                                                >
                                                    <Eye size={14} />
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
                        <div className="empty-state-icon">
                            <Calculator size={48} strokeWidth={1} />
                        </div>
                        <div className="empty-state-title">{es.quotes.noQuotes}</div>
                        <div className="empty-state-description">{es.quotes.noQuotesDesc}</div>
                        <Link href="/cotizaciones/nueva" className="btn btn-primary">
                            <Plus size={16} />
                            {es.quotes.newQuote}
                        </Link>
                    </div>
                )}
            </div>
        </>
    )
}
