// =============================================================================
// Motor de reglas del cotizador (Reglas 1-12 del modelo de precios).
// Funciones puras: sin React, sin Supabase. Todo lo que entra y sale es data.
// =============================================================================

import type {
    Client,
    Complexity,
    QuoteCurrency,
    QuoteItem,
    QuotePreset,
    QuoteSettings,
    RateProfile,
} from '../supabase/types'

// -----------------------------------------------------------------------------
// Constantes del modelo
// -----------------------------------------------------------------------------

// Regla 3: puntos de toque que clasifican la complejidad de una tarea
export const COMPONENT_KEYS = [
    'ui',
    'db',
    'payments',
    'emails',
    'admin',
    'third_party',
    'concurrency',
] as const

export type ComponentKey = (typeof COMPONENT_KEYS)[number]

export const COMPONENT_LABELS: Record<ComponentKey, string> = {
    ui: 'UI / Frontend',
    db: 'Base de datos',
    payments: 'Pasarela de pago',
    emails: 'Emails',
    admin: 'Panel admin',
    third_party: 'App de terceros',
    concurrency: 'Concurrencia / aforo',
}

// Regla 2: matriz de complejidad calibrada para stacks rápidos.
// El gap 4-8h es intencional: una tarea de 5-7h está mal clasificada.
export const COMPLEXITY_HOURS: Record<
    Complexity,
    { min: number; max: number; suggested: number }
> = {
    low: { min: 1, max: 4, suggested: 3 },
    medium: { min: 8, max: 15, suggested: 12 },
    high: { min: 20, max: 40, suggested: 30 },
}

export const COMPLEXITY_LABELS: Record<Complexity, string> = {
    low: 'Baja',
    medium: 'Media',
    high: 'Alta',
}

export const PROFILE_LABELS: Record<RateProfile, string> = {
    international: 'Internacional (USD)',
    local_premium: 'Local Premium (COP)',
    local_standard: 'Local Estándar (COP)',
}

// Contexto de cálculo: snapshot de tarifa y factores que vive en la cotización
export interface QuoteContext {
    hourlyRate: number
    currency: QuoteCurrency
    qaPct: number
    fixedFactor: number
}

// Subconjunto editable de un ítem que el motor necesita para calcular.
// (QuoteItem completo también cumple esta forma.)
export type ItemInput = Pick<
    QuoteItem,
    | 'pricing_mode'
    | 'components'
    | 'complexity'
    | 'reuse_pct'
    | 'hours'
    | 'hours_suggested'
    | 'qty'
    | 'volume_discount_pct'
    | 'price_override'
    | 'fixed_price'
>

export interface ItemComputation {
    /** Horas base post-reúso, sin QA (lo que se edita) */
    baseHours: number
    /** Horas facturables con QA embebido, por unidad (Regla 4) */
    unitHours: number
    /** Precio unitario redondeado, antes de descuento por volumen */
    unitPrice: number
    /** Horas totales de la línea (unitHours x qty) */
    lineHours: number
    /** Total de la línea, redondeado, con descuento por volumen y overrides */
    lineTotal: number
}

export type AlertSeverity = 'warn' | 'block'

export interface QuoteAlert {
    severity: AlertSeverity
    code:
        | 'dead_zone_hours'
        | 'below_minimum'
        | 'fixed_below_factor'
        | 'below_market_floor'
        | 'hierarchy_violation'
        | 'anchor_incoherence'
        | 'bundle_misuse'
        | 'currency_mismatch'
    message: string
    /** Índice del ítem al que aplica, si es por ítem */
    itemIndex?: number
}

// -----------------------------------------------------------------------------
// Regla 1: perfiles de tarifa. El custom_rate del cliente manda sobre el
// default del perfil (coherencia: cada cliente conserva su tarifa heredada).
// -----------------------------------------------------------------------------

export function profileCurrency(profile: RateProfile): QuoteCurrency {
    return profile === 'international' ? 'USD' : 'COP'
}

export function resolveRate(
    profile: RateProfile,
    settings: Pick<
        QuoteSettings,
        'rate_international_usd' | 'rate_local_premium_cop' | 'rate_local_standard_cop'
    >,
    customRate?: number | null,
): number {
    if (customRate != null && customRate > 0) return customRate
    switch (profile) {
        case 'international':
            return settings.rate_international_usd
        case 'local_premium':
            return settings.rate_local_premium_cop
        case 'local_standard':
            return settings.rate_local_standard_cop
    }
}

// -----------------------------------------------------------------------------
// Regla 3: heurística de puntos de toque
// -----------------------------------------------------------------------------

export function suggestComplexity(components: string[]): Complexity {
    const count = components.length
    if (count >= 4) return 'high'
    if (count >= 2) return 'medium'
    return 'low'
}

export function suggestedHours(complexity: Complexity): number {
    return COMPLEXITY_HOURS[complexity].suggested
}

// -----------------------------------------------------------------------------
// Regla 5: reúso de código — descuenta solo la porción no-UI de las horas
// -----------------------------------------------------------------------------

export function applyReuse(
    hours: number,
    reusePct: number,
    components: string[],
): number {
    if (reusePct <= 0) return hours
    const total = components.length
    // Sin componentes marcados se asume que todo el ítem es reutilizable
    const nonUiShare =
        total === 0 ? 1 : components.filter((c) => c !== 'ui').length / total
    return hours * (1 - (reusePct / 100) * nonUiShare)
}

// -----------------------------------------------------------------------------
// Regla 12: redondeo hacia arriba (COP a $10.000, USD a $5)
// -----------------------------------------------------------------------------

export function roundPrice(amount: number, currency: QuoteCurrency): number {
    if (amount <= 0) return 0
    const step = currency === 'COP' ? 10000 : 5
    return Math.ceil(amount / step) * step
}

export function formatMoney(amount: number, currency: QuoteCurrency): string {
    const formatted =
        currency === 'COP'
            ? '$' + Math.round(amount).toLocaleString('es-CO')
            : '$' + amount.toLocaleString('en-US')
    return `${formatted} ${currency}`
}

// -----------------------------------------------------------------------------
// Cálculo de un ítem (Reglas 2, 4, 5, 6, 8 y overrides manuales)
// -----------------------------------------------------------------------------

export function computeItem(item: ItemInput, ctx: QuoteContext): ItemComputation {
    const qty = item.qty || 1

    // "A cotizar" (Regla 9): nunca se inventa un número
    if (item.pricing_mode === 'tbd') {
        return { baseHours: 0, unitHours: 0, unitPrice: 0, lineHours: 0, lineTotal: 0 }
    }

    const rawHours =
        item.hours ??
        item.hours_suggested ??
        (item.complexity ? suggestedHours(item.complexity) : 0)
    const baseHours = applyReuse(rawHours, item.reuse_pct || 0, item.components || [])
    // Regla 4: QA y garantía embebidos en las horas de cada ítem
    const unitHours = baseHours * (1 + (ctx.qaPct || 0) / 100)
    const lineHours = unitHours * qty

    // Precio cerrado (Regla 6): el precio es el pactado, las horas solo informan
    if (item.pricing_mode === 'fixed') {
        const unitPrice = item.fixed_price || 0
        const discounted = unitPrice * (1 - (item.volume_discount_pct || 0) / 100)
        const lineTotal =
            item.price_override ?? roundPrice(discounted * qty, ctx.currency)
        return { baseHours, unitHours, unitPrice, lineHours, lineTotal }
    }

    // Por horas
    const unitPrice = roundPrice(unitHours * ctx.hourlyRate, ctx.currency)
    const discounted = unitPrice * (1 - (item.volume_discount_pct || 0) / 100)
    const lineTotal = item.price_override ?? roundPrice(discounted * qty, ctx.currency)
    return { baseHours, unitHours, unitPrice, lineHours, lineTotal }
}

// -----------------------------------------------------------------------------
// Cálculo de la cotización completa (Reglas 7 y 11)
// -----------------------------------------------------------------------------

export interface QuoteTotals {
    totalHours: number
    totalPrice: number
    paymentTerms: string
    warrantyDays: number
    /** Ítems "A cotizar" no entran al total */
    tbdCount: number
}

export function computeQuote(items: ItemInput[], ctx: QuoteContext): QuoteTotals {
    let totalHours = 0
    let totalPrice = 0
    let tbdCount = 0

    for (const item of items) {
        if (item.pricing_mode === 'tbd') {
            tbdCount++
            continue
        }
        const c = computeItem(item, ctx)
        totalHours += c.lineHours
        totalPrice += c.lineTotal
    }

    // Regla 11: forma de pago según tamaño del proyecto
    const paymentTerms =
        totalHours < 15
            ? '50% al inicio / 50% contra entrega'
            : '50% al inicio / 30% en hito intermedio / 20% contra entrega'

    // Regla 11: garantía 15 días (<20h) o 30 días (>=20h)
    const warrantyDays = totalHours >= 20 ? 30 : 15

    return {
        totalHours: Math.round(totalHours * 100) / 100,
        totalPrice,
        paymentTerms,
        warrantyDays,
        tbdCount,
    }
}

// -----------------------------------------------------------------------------
// Validaciones y alertas (Reglas 2, 6, 7, 10)
// -----------------------------------------------------------------------------

export interface ValidateArgs {
    items: ItemInput[]
    ctx: QuoteContext
    settings: Pick<QuoteSettings, 'min_billable_hours'>
    client?: Pick<Client, 'anchor_hours' | 'anchor_price' | 'anchor_currency'> | null
    /** Presets ligados por ítem (mismo índice que items; null si no aplica) */
    presets?: (QuotePreset | null)[]
}

export function validateQuote(args: ValidateArgs): QuoteAlert[] {
    const { items, ctx, settings, client, presets } = args
    const alerts: QuoteAlert[] = []
    const totals = computeQuote(items, ctx)

    items.forEach((item, i) => {
        if (item.pricing_mode === 'tbd') return
        const c = computeItem(item, ctx)
        const preset = presets?.[i] ?? null

        // Regla 2: zona muerta 5-7h — o es Baja mal entendida o Media subestimada
        if (c.baseHours > 4 && c.baseHours < 8) {
            alerts.push({
                severity: 'warn',
                code: 'dead_zone_hours',
                itemIndex: i,
                message: `"${(item as QuoteItem).name ?? `Ítem ${i + 1}`}" quedó en ${c.baseHours.toFixed(1)}h: ¿es Baja mal entendida o Media subestimada?`,
            })
        }

        // Regla 6: precio cerrado debe cubrir horas x tarifa x factor
        if (item.pricing_mode === 'fixed' && item.fixed_price != null) {
            const minimum = c.unitHours * ctx.hourlyRate * ctx.fixedFactor
            if (item.fixed_price < minimum) {
                alerts.push({
                    severity: 'block',
                    code: 'fixed_below_factor',
                    itemIndex: i,
                    message: `Precio cerrado ${formatMoney(item.fixed_price, ctx.currency)} por debajo del mínimo ${formatMoney(roundPrice(minimum, ctx.currency), ctx.currency)} (horas × tarifa × ${ctx.fixedFactor}).`,
                })
            }
        }

        if (preset) {
            // Moneda del preset vs. moneda de la cotización (nunca mezclar)
            if (preset.currency !== ctx.currency) {
                alerts.push({
                    severity: 'block',
                    code: 'currency_mismatch',
                    itemIndex: i,
                    message: `El entregable "${preset.name}" está en ${preset.currency} pero la cotización es en ${ctx.currency}. No se mezclan monedas.`,
                })
            }

            // Regla 6: alerta de piso de mercado
            const effectiveUnit =
                item.pricing_mode === 'fixed' ? (item.fixed_price ?? 0) : c.unitPrice
            if (
                preset.market_floor != null &&
                preset.currency === ctx.currency &&
                effectiveUnit > 0 &&
                effectiveUnit < preset.market_floor
            ) {
                alerts.push({
                    severity: 'warn',
                    code: 'below_market_floor',
                    itemIndex: i,
                    message: `Estás cotizando bajo mercado: ${formatMoney(effectiveUnit, ctx.currency)} < piso ${formatMoney(preset.market_floor, ctx.currency)} de "${preset.name}". ¿Es intencional?`,
                })
            }

            // Regla 6: la tarifa bundle solo vale dentro de un paquete (>=10 páginas)
            if (preset.kind === 'bundle' && (item.qty || 1) < 10) {
                alerts.push({
                    severity: 'warn',
                    code: 'bundle_misuse',
                    itemIndex: i,
                    message: `"${preset.name}" usa tarifa bundle pero solo hay ${item.qty || 1} unidad(es). Una página suelta se cotiza con tarifa standalone.`,
                })
            }
        }
    })

    // Regla 6: jerarquía de esfuerzo — mayor rank nunca puede ser más barato
    const ranked = items
        .map((item, i) => {
            const preset = presets?.[i] ?? null
            if (!preset || item.pricing_mode === 'tbd') return null
            const c = computeItem(item, ctx)
            const unit =
                item.pricing_mode === 'fixed' ? (item.fixed_price ?? 0) : c.unitPrice
            return { i, preset, unit }
        })
        .filter((x): x is NonNullable<typeof x> => x !== null && x.unit > 0)

    for (const a of ranked) {
        for (const b of ranked) {
            if (a.preset.hierarchy_rank > b.preset.hierarchy_rank && a.unit < b.unit) {
                alerts.push({
                    severity: 'warn',
                    code: 'hierarchy_violation',
                    itemIndex: a.i,
                    message: `"${a.preset.name}" (${formatMoney(a.unit, ctx.currency)}) no puede costar menos que "${b.preset.name}" (${formatMoney(b.unit, ctx.currency)}): viola la jerarquía de esfuerzo.`,
                })
            }
        }
    }

    // Regla 7: mínimo facturable
    const billableItems = items.filter((i) => i.pricing_mode !== 'tbd')
    if (billableItems.length > 0 && totals.totalHours < settings.min_billable_hours) {
        alerts.push({
            severity: 'warn',
            code: 'below_minimum',
            message: `Total de ${totals.totalHours}h por debajo del mínimo facturable de ${settings.min_billable_hours}h. Agrupa en paquete o canaliza a mantenimiento mensual.`,
        })
    }

    // Regla 10: coherencia con el proyecto ancla del cliente
    if (
        client?.anchor_hours &&
        client?.anchor_price &&
        client.anchor_currency === ctx.currency &&
        totals.totalHours > 0
    ) {
        const hoursPct = (totals.totalHours / client.anchor_hours) * 100
        const pricePct = (totals.totalPrice / client.anchor_price) * 100
        if (Math.abs(hoursPct - pricePct) > 10) {
            alerts.push({
                severity: 'warn',
                code: 'anchor_incoherence',
                message: `Esta cotización equivale al ${hoursPct.toFixed(0)}% del proyecto ancla en horas pero al ${pricePct.toFixed(0)}% en precio. Revisa la coherencia con lo que el cliente ya pagó.`,
            })
        }
    }

    return alerts
}
