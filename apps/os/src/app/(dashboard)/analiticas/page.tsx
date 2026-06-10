import Link from 'next/link'
import { createClient } from '@/lib/supabase/server'
import { es } from '@/i18n/es'
import {
    TrendingUp,
    Wallet,
    Receipt,
    AlertTriangle,
    Timer,
    Percent,
    BarChart3,
    Users,
    AlertCircle,
    Plus,
} from 'lucide-react'
import {
    computeAnalytics,
    detectCurrencies,
    formatCurrency,
    formatNumber,
    PERIOD_OPTIONS,
    type InvoiceRow,
    type Period,
} from '@/lib/analytics'

interface AnaliticasPageProps {
    searchParams: Promise<{ period?: string; currency?: string }>
}

const VALID_PERIODS: Period[] = ['mes', '3m', 'ytd', '12m', 'all']

export default async function AnaliticasPage({ searchParams }: AnaliticasPageProps) {
    const params = await searchParams
    const period: Period = VALID_PERIODS.includes(params.period as Period)
        ? (params.period as Period)
        : '12m'

    const supabase = await createClient()

    const { data, error } = await supabase
        .from('invoices')
        .select('id, invoice_number, status, total, currency, issue_date, due_date, client:clients(id, name)')
        .order('issue_date', { ascending: false })

    const rows = (data || []) as unknown as InvoiceRow[]
    const currencies = detectCurrencies(rows)
    const currency =
        params.currency && currencies.includes(params.currency)
            ? params.currency
            : currencies[0] || 'USD'

    const periodLabel = PERIOD_OPTIONS.find((p) => p.value === period)?.label ?? ''

    // Empty state — sin facturas todavía
    if (!error && rows.length === 0) {
        return (
            <>
                <Header period={period} currency={currency} currencies={currencies} />
                <div className="card">
                    <div className="empty-state">
                        <div className="empty-state-icon">
                            <BarChart3 size={48} strokeWidth={1} />
                        </div>
                        <div className="empty-state-title">Aún no hay datos para analizar</div>
                        <div className="empty-state-description">
                            Crea y cobra tus primeras facturas para ver las métricas aquí.
                        </div>
                        <Link href="/facturas/nueva" className="btn btn-primary">
                            <Plus size={18} />
                            {es.invoices.newInvoice}
                        </Link>
                    </div>
                </div>
            </>
        )
    }

    const a = computeAnalytics(rows, currency, period, new Date())
    const fmt = (n: number) => formatCurrency(n, currency)

    const totalAging = a.aging.reduce((s, b) => s + b.amount, 0)
    const maxBilled = Math.max(...a.monthly.map((m) => m.billed), 1)

    return (
        <>
            <Header period={period} currency={currency} currencies={currencies} />

            {/* ---- KPIs principales (rendimiento del periodo) ---- */}
            <div className="section-label">Rendimiento · {periodLabel}</div>
            <div className="analytics-grid" style={{ marginBottom: 'var(--space-6)' }}>
                <KpiCard
                    icon={<Receipt size={18} />}
                    label="Facturado"
                    value={fmt(a.billed)}
                    sub={`${formatNumber(a.invoiceCount)} factura${a.invoiceCount === 1 ? '' : 's'}`}
                />
                <KpiCard
                    icon={<TrendingUp size={18} />}
                    label="Cobrado"
                    value={fmt(a.collected)}
                    sub="Facturas pagadas"
                    accent="#10b981"
                />
                <KpiCard
                    icon={<Wallet size={18} />}
                    label="Ticket promedio"
                    value={fmt(a.avgTicket)}
                    sub="Por factura"
                />
                <KpiCard
                    icon={<Percent size={18} />}
                    label="Tasa de cobro"
                    value={`${formatNumber(a.collectionRate * 100, 0)}%`}
                    sub="Pagadas vs emitidas"
                    accent={a.collectionRate >= 0.7 ? '#10b981' : a.collectionRate >= 0.4 ? '#d4d4d8' : '#ef4444'}
                />
            </div>

            {/* ---- KPIs de cartera (estado actual) ---- */}
            <div className="section-label">Cartera · Estado actual</div>
            <div className="analytics-grid" style={{ marginBottom: 'var(--space-6)' }}>
                <KpiCard
                    icon={<Wallet size={18} />}
                    label="Por cobrar (AR)"
                    value={fmt(a.outstanding)}
                    sub="Facturas enviadas sin pagar"
                />
                <KpiCard
                    icon={<AlertTriangle size={18} />}
                    label="Vencido"
                    value={fmt(a.overdue)}
                    sub="Pasada la fecha de pago"
                    accent={a.overdue > 0 ? '#ef4444' : undefined}
                />
                <KpiCard
                    icon={<Timer size={18} />}
                    label="DSO"
                    value={`${formatNumber(a.dso, 0)} días`}
                    sub="Días promedio de cobro"
                />
            </div>

            {/* ---- Gráficas ---- */}
            <div className="chart-grid" style={{ marginBottom: 'var(--space-6)' }}>
                {/* Barras mensuales */}
                <div className="card">
                    <div className="card-header">
                        <h3 className="card-title">Facturación mensual</h3>
                        <span className="text-muted" style={{ fontSize: 'var(--text-xs)' }}>
                            Últimos 12 meses · {currency}
                        </span>
                    </div>
                    <div className="bar-chart">
                        {a.monthly.map((m) => {
                            const billedH = (m.billed / maxBilled) * 100
                            const collectedH = m.billed > 0 ? (m.collected / m.billed) * billedH : 0
                            return (
                                <div key={m.ym} className="bar-col" title={`${m.label}: ${fmt(m.billed)} facturado · ${fmt(m.collected)} cobrado`}>
                                    <div className="bar-track">
                                        <div className="bar-billed" style={{ height: `${billedH}%` }}>
                                            <div className="bar-collected" style={{ height: `${collectedH ? (m.collected / m.billed) * 100 : 0}%` }} />
                                        </div>
                                    </div>
                                    <span className="bar-label">{m.label}</span>
                                </div>
                            )
                        })}
                    </div>
                    <div className="chart-legend">
                        <LegendDot color="#10b981" label="Cobrado" />
                        <LegendDot color="#3f3f46" label="Facturado (sin cobrar)" />
                    </div>
                </div>

                {/* Donut estados */}
                <div className="card">
                    <div className="card-header">
                        <h3 className="card-title">Por estado</h3>
                        <span className="text-muted" style={{ fontSize: 'var(--text-xs)' }}>
                            {periodLabel}
                        </span>
                    </div>
                    <StatusDonut slices={a.statusDist} currency={currency} />
                </div>
            </div>

            {/* ---- Aging + Top clientes ---- */}
            <div className="chart-grid">
                {/* Aging report */}
                <div className="card">
                    <div className="card-header">
                        <h3 className="card-title">Antigüedad de saldos (Aging)</h3>
                        <span className="text-muted" style={{ fontSize: 'var(--text-xs)' }}>
                            Total: {fmt(totalAging)}
                        </span>
                    </div>
                    <div className="table-container">
                        <table className="table">
                            <thead>
                                <tr>
                                    <th>Tramo</th>
                                    <th className="text-right">Facturas</th>
                                    <th className="text-right">Monto</th>
                                    <th className="text-right">%</th>
                                </tr>
                            </thead>
                            <tbody>
                                {a.aging.map((b) => {
                                    const pct = totalAging > 0 ? (b.amount / totalAging) * 100 : 0
                                    const danger = b.key === '61-90' || b.key === '90+'
                                    return (
                                        <tr key={b.key}>
                                            <td>
                                                <span style={{ display: 'inline-flex', alignItems: 'center', gap: '0.5rem' }}>
                                                    <span style={{
                                                        width: 8, height: 8, borderRadius: '50%',
                                                        background: b.key === 'current' ? '#71717a' : danger ? '#ef4444' : '#d4d4d8',
                                                    }} />
                                                    {b.label}
                                                </span>
                                            </td>
                                            <td className="text-right text-muted">{b.count}</td>
                                            <td className="text-right font-medium">{fmt(b.amount)}</td>
                                            <td className="text-right text-muted">{formatNumber(pct, 0)}%</td>
                                        </tr>
                                    )
                                })}
                            </tbody>
                        </table>
                    </div>
                </div>

                {/* Top clientes */}
                <div className="card">
                    <div className="card-header">
                        <h3 className="card-title">Top clientes</h3>
                        <Users size={16} className="text-muted" />
                    </div>
                    {a.topClients.length > 0 ? (
                        <div className="table-container">
                            <table className="table">
                                <thead>
                                    <tr>
                                        <th>Cliente</th>
                                        <th className="text-right">Facturas</th>
                                        <th className="text-right">Facturado</th>
                                    </tr>
                                </thead>
                                <tbody>
                                    {a.topClients.map((c, i) => (
                                        <tr key={c.name}>
                                            <td>
                                                <span style={{ display: 'inline-flex', alignItems: 'center', gap: '0.75rem' }}>
                                                    <span className="rank-badge">{i + 1}</span>
                                                    {c.name}
                                                </span>
                                            </td>
                                            <td className="text-right text-muted">{c.count}</td>
                                            <td className="text-right font-medium">{fmt(c.amount)}</td>
                                        </tr>
                                    ))}
                                </tbody>
                            </table>
                        </div>
                    ) : (
                        <div className="empty-state">
                            <div className="empty-state-description">Sin facturación en este periodo.</div>
                        </div>
                    )}
                </div>
            </div>
        </>
    )
}

// =============================================================================
// Subcomponentes (server components, sin estado)
// =============================================================================

function Header({ period, currency, currencies }: { period: Period; currency: string; currencies: string[] }) {
    return (
        <div className="page-header" style={{ marginBottom: 'var(--space-6)' }}>
            <div>
                <h1 className="page-title" style={{ lineHeight: 1, marginBottom: 8 }}>Analíticas</h1>
                <p className="text-muted" style={{ margin: 0, fontSize: 'var(--text-sm)' }}>
                    Salud financiera y rendimiento de cobro
                </p>
            </div>
            <form method="GET" style={{ display: 'flex', gap: '0.75rem', alignItems: 'flex-end', flexWrap: 'wrap' }}>
                <div className="form-group" style={{ marginBottom: 0 }}>
                    <label htmlFor="period" className="form-label">Periodo</label>
                    <select id="period" name="period" className="form-select" defaultValue={period}>
                        {PERIOD_OPTIONS.map((p) => (
                            <option key={p.value} value={p.value}>{p.label}</option>
                        ))}
                    </select>
                </div>
                {currencies.length > 1 && (
                    <div className="form-group" style={{ marginBottom: 0 }}>
                        <label htmlFor="currency" className="form-label">Moneda</label>
                        <select id="currency" name="currency" className="form-select" defaultValue={currency}>
                            {currencies.map((c) => (
                                <option key={c} value={c}>{c}</option>
                            ))}
                        </select>
                    </div>
                )}
                <button type="submit" className="btn btn-secondary">Aplicar</button>
            </form>
        </div>
    )
}

function KpiCard({
    icon,
    label,
    value,
    sub,
    accent,
}: {
    icon: React.ReactNode
    label: string
    value: string
    sub?: string
    accent?: string
}) {
    return (
        <div className="kpi-card">
            <div className="kpi-head">
                <span className="kpi-label">{label}</span>
                <span className="kpi-icon" style={accent ? { color: accent } : undefined}>{icon}</span>
            </div>
            <div className="kpi-value" style={accent ? { color: accent } : undefined}>{value}</div>
            {sub && <div className="kpi-sub">{sub}</div>}
        </div>
    )
}

function LegendDot({ color, label }: { color: string; label: string }) {
    return (
        <span style={{ display: 'inline-flex', alignItems: 'center', gap: '0.4rem', fontSize: 'var(--text-xs)', color: 'var(--color-text-muted)' }}>
            <span style={{ width: 10, height: 10, borderRadius: 2, background: color }} />
            {label}
        </span>
    )
}

function StatusDonut({ slices, currency }: { slices: { status: string; label: string; color: string; count: number; amount: number }[]; currency: string }) {
    const total = slices.reduce((s, x) => s + x.amount, 0)
    const R = 15.9155 // radio para circunferencia = 100
    const C = 2 * Math.PI * R
    let offset = 0

    return (
        <div className="donut-wrap">
            <svg viewBox="0 0 42 42" className="donut-svg" role="img" aria-label="Distribución por estado">
                <circle cx="21" cy="21" r={R} fill="none" stroke="var(--color-border)" strokeWidth="4" />
                {total > 0 &&
                    slices.map((s) => {
                        const frac = s.amount / total
                        if (frac <= 0) return null
                        const dash = frac * C
                        const seg = (
                            <circle
                                key={s.status}
                                cx="21"
                                cy="21"
                                r={R}
                                fill="none"
                                stroke={s.color}
                                strokeWidth="4"
                                strokeDasharray={`${dash} ${C - dash}`}
                                strokeDashoffset={-offset}
                                transform="rotate(-90 21 21)"
                            />
                        )
                        offset += dash
                        return seg
                    })}
                <text x="21" y="20" textAnchor="middle" className="donut-total-label">Total</text>
                <text x="21" y="25" textAnchor="middle" className="donut-total-value">
                    {formatCurrency(total, currency).replace(/\s/g, '')}
                </text>
            </svg>
            <div className="donut-legend">
                {slices.map((s) => (
                    <div key={s.status} className="donut-legend-row">
                        <span style={{ display: 'inline-flex', alignItems: 'center', gap: '0.5rem' }}>
                            <span style={{ width: 10, height: 10, borderRadius: 2, background: s.color }} />
                            {s.label}
                        </span>
                        <span className="text-muted">{s.count} · {formatCurrency(s.amount, currency)}</span>
                    </div>
                ))}
            </div>
        </div>
    )
}
