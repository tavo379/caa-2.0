// =============================================================================
// Export de cotización a markdown listo para pegar en Word o email (Regla 11).
// Por defecto NO muestra horas ni tarifa (Regla 12) — solo con toggles activos.
// =============================================================================

import type { Client, Quote, QuoteItem } from '../supabase/types'
import { computeItem, computeQuote, formatMoney, type QuoteContext } from './engine'

function formatDate(iso: string | null): string {
    if (!iso) return '—'
    return new Date(iso + 'T00:00:00').toLocaleDateString('es-CO', {
        year: 'numeric',
        month: 'long',
        day: 'numeric',
    })
}

export function exportMarkdown(
    quote: Quote,
    items: QuoteItem[],
    client: Client,
): string {
    const ctx: QuoteContext = {
        hourlyRate: quote.hourly_rate,
        currency: quote.currency,
        qaPct: quote.qa_pct,
        fixedFactor: quote.fixed_factor,
    }

    const billable = items.filter((i) => i.pricing_mode !== 'tbd')
    const tbd = items.filter((i) => i.pricing_mode === 'tbd')
    const totals = computeQuote(items, ctx)

    const lines: string[] = []

    lines.push(`# Cotización ${quote.quote_number}`)
    lines.push('')
    lines.push(`**Cliente:** ${client.company || client.name}`)
    lines.push(`**Proyecto:** ${quote.title}`)
    lines.push(`**Fecha:** ${formatDate(quote.issue_date)}`)
    lines.push(`**Válida hasta:** ${formatDate(quote.valid_until)}`)
    if (quote.show_rate) {
        lines.push(`**Tarifa:** ${formatMoney(quote.hourly_rate, quote.currency)}/hora`)
    }
    lines.push('')

    // Tabla de ítems
    if (quote.show_hours) {
        lines.push('| Ítem | Descripción | Horas | Precio |')
        lines.push('|---|---|---:|---:|')
    } else {
        lines.push('| Ítem | Descripción | Precio |')
        lines.push('|---|---|---:|')
    }

    for (const item of billable) {
        const c = computeItem(item, ctx)
        const qty = item.qty > 1 ? ` (x${item.qty})` : ''
        const desc = item.description || ''
        if (quote.show_hours) {
            lines.push(
                `| ${item.name}${qty} | ${desc} | ${c.lineHours.toFixed(1)} | ${formatMoney(c.lineTotal, quote.currency)} |`,
            )
        } else {
            lines.push(`| ${item.name}${qty} | ${desc} | ${formatMoney(c.lineTotal, quote.currency)} |`)
        }
    }

    if (quote.show_hours) {
        lines.push(`| **Total** | | **${totals.totalHours.toFixed(1)}** | **${formatMoney(totals.totalPrice, quote.currency)}** |`)
    } else {
        lines.push(`| **Total** | | **${formatMoney(totals.totalPrice, quote.currency)}** |`)
    }
    lines.push('')

    // Regla 9: ítems "A cotizar" listados aparte, sin inventar números
    if (tbd.length > 0) {
        lines.push('## Pendientes por cotizar')
        lines.push('')
        lines.push(
            'Los siguientes ítems dependen de información externa y se cotizarán por separado:',
        )
        lines.push('')
        for (const item of tbd) {
            const missing =
                item.missing_info.length > 0
                    ? ` — falta: ${item.missing_info.join(', ')}`
                    : ''
            lines.push(`- **${item.name}**${missing}`)
        }
        lines.push('')
    }

    if (quote.notes) {
        lines.push('## Notas')
        lines.push('')
        lines.push(quote.notes)
        lines.push('')
    }

    // Regla 11: condiciones comerciales estándar
    lines.push('## Condiciones comerciales')
    lines.push('')
    lines.push(`- **Forma de pago:** ${quote.payment_terms || totals.paymentTerms}.`)
    lines.push(`- **Vigencia de la cotización:** 30 días (hasta ${formatDate(quote.valid_until)}).`)
    lines.push(
        `- **Garantía:** corrección de bugs por ${totals.warrantyDays} días posteriores a la entrega. No cubre cambios de alcance.`,
    )
    lines.push(
        '- El cronograma inicia al recibir todos los entregables del cliente (diseño, contenidos, accesos).',
    )
    lines.push('- Cambios de alcance se cotizan por separado bajo las mismas condiciones.')
    lines.push('')
    lines.push('---')
    lines.push('')
    lines.push('*Cacao & Avocado — Gustavo Ramírez*')

    return lines.join('\n')
}
