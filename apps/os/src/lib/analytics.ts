// =============================================================================
// ANALYTICS - Cálculo de métricas estándar de facturación (KPIs, AR, aging, DSO)
// Funciones puras: reciben las filas de invoices y devuelven métricas listas
// para renderizar. Sin dependencias externas.
// =============================================================================

export type InvoiceStatus = 'draft' | 'sent' | 'paid' | 'void'

export interface InvoiceRow {
    id: string
    invoice_number: string | null
    status: InvoiceStatus
    total: number | null
    currency: string | null
    issue_date: string | null
    due_date: string | null
    client: { id: string; name: string } | { id: string; name: string }[] | null
}

export type Period = 'mes' | '3m' | 'ytd' | '12m' | 'all'

export const PERIOD_OPTIONS: { value: Period; label: string }[] = [
    { value: 'mes', label: 'Este mes' },
    { value: '3m', label: 'Últimos 3 meses' },
    { value: 'ytd', label: 'Este año' },
    { value: '12m', label: 'Últimos 12 meses' },
    { value: 'all', label: 'Todo el historial' },
]

const DAY_MS = 1000 * 60 * 60 * 24

function startOfDay(d: Date): Date {
    return new Date(d.getFullYear(), d.getMonth(), d.getDate())
}

/** Fecha de inicio de la ventana del periodo (null = sin límite). */
export function periodStart(period: Period, now: Date): Date | null {
    switch (period) {
        case 'mes':
            return new Date(now.getFullYear(), now.getMonth(), 1)
        case '3m': {
            const d = new Date(now.getFullYear(), now.getMonth() - 2, 1)
            return d
        }
        case 'ytd':
            return new Date(now.getFullYear(), 0, 1)
        case '12m':
            return new Date(now.getFullYear(), now.getMonth() - 11, 1)
        case 'all':
        default:
            return null
    }
}

function clientName(c: InvoiceRow['client']): string {
    if (!c) return '—'
    if (Array.isArray(c)) return c[0]?.name ?? '—'
    return c.name ?? '—'
}

function parseDate(s: string | null): Date | null {
    if (!s) return null
    const d = new Date(s)
    return isNaN(d.getTime()) ? null : d
}

export interface StatusSlice {
    status: InvoiceStatus
    label: string
    color: string
    count: number
    amount: number
}

export interface AgingBucket {
    key: string
    label: string
    count: number
    amount: number
}

export interface MonthPoint {
    ym: string
    label: string
    billed: number
    collected: number
}

export interface TopClient {
    name: string
    amount: number
    count: number
}

export interface Analytics {
    currency: string
    currencies: string[]
    // KPIs de periodo
    billed: number
    collected: number
    avgTicket: number
    collectionRate: number // 0..1
    invoiceCount: number
    // KPIs snapshot (estado actual)
    outstanding: number
    overdue: number
    dso: number
    // Desgloses
    statusDist: StatusSlice[]
    aging: AgingBucket[]
    monthly: MonthPoint[]
    topClients: TopClient[]
}

const STATUS_META: Record<InvoiceStatus, { label: string; color: string }> = {
    draft: { label: 'Borrador', color: '#71717a' },
    sent: { label: 'Enviada', color: '#d4d4d8' },
    paid: { label: 'Pagada', color: '#10b981' },
    void: { label: 'Anulada', color: '#ef4444' },
}

const MONTH_LABELS = ['Ene', 'Feb', 'Mar', 'Abr', 'May', 'Jun', 'Jul', 'Ago', 'Sep', 'Oct', 'Nov', 'Dic']

/** Lista de monedas presentes, ordenadas por frecuencia (la dominante primero). */
export function detectCurrencies(rows: InvoiceRow[]): string[] {
    const counts = new Map<string, number>()
    for (const r of rows) {
        const cur = r.currency || 'USD'
        counts.set(cur, (counts.get(cur) || 0) + 1)
    }
    return [...counts.entries()].sort((a, b) => b[1] - a[1]).map(([c]) => c)
}

export function computeAnalytics(
    allRows: InvoiceRow[],
    currency: string,
    period: Period,
    now: Date,
): Analytics {
    const currencies = detectCurrencies(allRows)
    const rows = allRows.filter((r) => (r.currency || 'USD') === currency)

    const start = periodStart(period, now)
    const today = startOfDay(now)
    const inPeriod = (r: InvoiceRow) => {
        if (!start) return true
        const d = parseDate(r.issue_date)
        return d ? d >= start : false
    }

    // --- KPIs de periodo (excluye anuladas) ---
    const periodRows = rows.filter((r) => r.status !== 'void' && inPeriod(r))
    const billed = periodRows.reduce((s, r) => s + (r.total || 0), 0)
    const collected = periodRows
        .filter((r) => r.status === 'paid')
        .reduce((s, r) => s + (r.total || 0), 0)
    const invoiceCount = periodRows.length
    const avgTicket = invoiceCount > 0 ? billed / invoiceCount : 0

    const paidCount = periodRows.filter((r) => r.status === 'paid').length
    const sentCount = periodRows.filter((r) => r.status === 'sent').length
    const collectionRate = paidCount + sentCount > 0 ? paidCount / (paidCount + sentCount) : 0

    // --- KPIs snapshot (estado actual, no acotado al periodo) ---
    const openInvoices = rows.filter((r) => r.status === 'sent')
    const outstanding = openInvoices.reduce((s, r) => s + (r.total || 0), 0)
    const overdue = openInvoices
        .filter((r) => {
            const due = parseDate(r.due_date) || parseDate(r.issue_date)
            return due ? startOfDay(due) < today : false
        })
        .reduce((s, r) => s + (r.total || 0), 0)

    // DSO = (Cuentas por cobrar / Facturado en periodo) × días del periodo
    let periodDays: number
    if (start) {
        periodDays = Math.max(1, Math.round((today.getTime() - startOfDay(start).getTime()) / DAY_MS))
    } else {
        const firstIssue = rows
            .map((r) => parseDate(r.issue_date))
            .filter((d): d is Date => !!d)
            .sort((a, b) => a.getTime() - b.getTime())[0]
        periodDays = firstIssue
            ? Math.max(1, Math.round((today.getTime() - startOfDay(firstIssue).getTime()) / DAY_MS))
            : 365
    }
    const dso = billed > 0 ? (outstanding / billed) * periodDays : 0

    // --- Distribución por estado (todas las facturas del periodo, incl. anuladas) ---
    const statusDist: StatusSlice[] = (['paid', 'sent', 'draft', 'void'] as InvoiceStatus[]).map((st) => {
        const subset = rows.filter((r) => r.status === st && inPeriod(r))
        return {
            status: st,
            label: STATUS_META[st].label,
            color: STATUS_META[st].color,
            count: subset.length,
            amount: subset.reduce((s, r) => s + (r.total || 0), 0),
        }
    })

    // --- Aging report (facturas abiertas, snapshot) ---
    const agingDefs: { key: string; label: string; min: number; max: number }[] = [
        { key: 'current', label: 'Por vencer', min: -Infinity, max: -1 },
        { key: '0-30', label: '1 – 30 días', min: 0, max: 30 },
        { key: '31-60', label: '31 – 60 días', min: 31, max: 60 },
        { key: '61-90', label: '61 – 90 días', min: 61, max: 90 },
        { key: '90+', label: '+90 días', min: 91, max: Infinity },
    ]
    const aging: AgingBucket[] = agingDefs.map((b) => ({ key: b.key, label: b.label, count: 0, amount: 0 }))
    for (const r of openInvoices) {
        const due = parseDate(r.due_date) || parseDate(r.issue_date)
        if (!due) continue
        const daysOverdue = Math.floor((today.getTime() - startOfDay(due).getTime()) / DAY_MS)
        const idx = agingDefs.findIndex((b) => daysOverdue >= b.min && daysOverdue <= b.max)
        if (idx >= 0) {
            aging[idx].count += 1
            aging[idx].amount += r.total || 0
        }
    }

    // --- Serie mensual (últimos 12 meses hasta hoy) ---
    const monthly: MonthPoint[] = []
    const monthIndex = new Map<string, number>()
    for (let i = 11; i >= 0; i--) {
        const d = new Date(now.getFullYear(), now.getMonth() - i, 1)
        const ym = `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}`
        monthIndex.set(ym, monthly.length)
        monthly.push({ ym, label: MONTH_LABELS[d.getMonth()], billed: 0, collected: 0 })
    }
    for (const r of rows) {
        if (r.status === 'void') continue
        const d = parseDate(r.issue_date)
        if (!d) continue
        const ym = `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}`
        const idx = monthIndex.get(ym)
        if (idx === undefined) continue
        monthly[idx].billed += r.total || 0
        if (r.status === 'paid') monthly[idx].collected += r.total || 0
    }

    // --- Top clientes (por facturado en periodo, excl. anuladas) ---
    const byClient = new Map<string, { amount: number; count: number }>()
    for (const r of periodRows) {
        const name = clientName(r.client)
        const cur = byClient.get(name) || { amount: 0, count: 0 }
        cur.amount += r.total || 0
        cur.count += 1
        byClient.set(name, cur)
    }
    const topClients: TopClient[] = [...byClient.entries()]
        .map(([name, v]) => ({ name, amount: v.amount, count: v.count }))
        .sort((a, b) => b.amount - a.amount)
        .slice(0, 6)

    return {
        currency,
        currencies,
        billed,
        collected,
        avgTicket,
        collectionRate,
        invoiceCount,
        outstanding,
        overdue,
        dso,
        statusDist,
        aging,
        monthly,
        topClients,
    }
}

export function formatCurrency(amount: number, currency: string): string {
    try {
        return new Intl.NumberFormat('es-CO', {
            style: 'currency',
            currency,
            minimumFractionDigits: 0,
            maximumFractionDigits: 0,
        }).format(amount)
    } catch {
        return `${currency} ${Math.round(amount).toLocaleString('es-CO')}`
    }
}

export function formatNumber(n: number, decimals = 0): string {
    return new Intl.NumberFormat('es-CO', {
        minimumFractionDigits: decimals,
        maximumFractionDigits: decimals,
    }).format(n)
}
