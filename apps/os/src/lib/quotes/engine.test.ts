// Tests del motor de reglas: una sección por regla del modelo de precios.
import { describe, expect, it } from 'vitest'

import type { QuoteItem, QuotePreset } from '../supabase/types'
import {
    applyReuse,
    computeItem,
    computeQuote,
    formatMoney,
    profileCurrency,
    resolveRate,
    roundPrice,
    suggestComplexity,
    suggestedHours,
    validateQuote,
    type ItemInput,
    type QuoteContext,
} from './engine'
import { exportMarkdown } from './export'

const SETTINGS = {
    rate_international_usd: 30,
    rate_local_premium_cop: 115000,
    rate_local_standard_cop: 60000,
    min_billable_hours: 4,
}

const COP_CTX: QuoteContext = {
    hourlyRate: 115000,
    currency: 'COP',
    qaPct: 12,
    fixedFactor: 1.3,
}

const USD_CTX: QuoteContext = {
    hourlyRate: 30,
    currency: 'USD',
    qaPct: 12,
    fixedFactor: 1.3,
}

function item(overrides: Partial<ItemInput> = {}): ItemInput {
    return {
        pricing_mode: 'hourly',
        components: [],
        complexity: null,
        reuse_pct: 0,
        hours: null,
        hours_suggested: null,
        qty: 1,
        volume_discount_pct: 0,
        price_override: null,
        fixed_price: null,
        ...overrides,
    }
}

function preset(overrides: Partial<QuotePreset> = {}): QuotePreset {
    return {
        id: 'p1',
        user_id: 'u1',
        name: 'Preset',
        kind: 'standalone',
        currency: 'COP',
        price_min: null,
        price_max: null,
        hours_min: null,
        hours_max: null,
        market_floor: null,
        hierarchy_rank: 0,
        active: true,
        sort_order: 0,
        created_at: '',
        ...overrides,
    }
}

describe('Regla 1 — perfiles de tarifa', () => {
    it('resuelve la tarifa default de cada perfil', () => {
        expect(resolveRate('international', SETTINGS)).toBe(30)
        expect(resolveRate('local_premium', SETTINGS)).toBe(115000)
        expect(resolveRate('local_standard', SETTINGS)).toBe(60000)
    })

    it('el custom_rate del cliente manda sobre el default (tarifa heredada)', () => {
        expect(resolveRate('local_standard', SETTINGS, 60000)).toBe(60000)
        expect(resolveRate('local_premium', SETTINGS, 120000)).toBe(120000)
    })

    it('asigna la moneda según perfil', () => {
        expect(profileCurrency('international')).toBe('USD')
        expect(profileCurrency('local_premium')).toBe('COP')
        expect(profileCurrency('local_standard')).toBe('COP')
    })
})

describe('Regla 2 — matriz de complejidad y zona muerta 5-7h', () => {
    it('sugiere horas por complejidad', () => {
        expect(suggestedHours('low')).toBe(3)
        expect(suggestedHours('medium')).toBe(12)
        expect(suggestedHours('high')).toBe(30)
    })

    it('alerta cuando un ítem cae en la zona muerta 5-7h', () => {
        const alerts = validateQuote({
            items: [item({ hours: 6 })],
            ctx: COP_CTX,
            settings: SETTINGS,
        })
        expect(alerts.some((a) => a.code === 'dead_zone_hours')).toBe(true)
    })

    it('no alerta en 4h ni en 8h', () => {
        const alerts = validateQuote({
            items: [item({ hours: 4 }), item({ hours: 8 })],
            ctx: COP_CTX,
            settings: SETTINGS,
        })
        expect(alerts.some((a) => a.code === 'dead_zone_hours')).toBe(false)
    })
})

describe('Regla 3 — puntos de toque', () => {
    it('1 punto = Baja, 2-3 = Media, 4+ = Alta', () => {
        expect(suggestComplexity(['ui'])).toBe('low')
        expect(suggestComplexity(['ui', 'db'])).toBe('medium')
        expect(suggestComplexity(['ui', 'db', 'emails'])).toBe('medium')
        expect(suggestComplexity(['ui', 'db', 'payments', 'emails'])).toBe('high')
    })
})

describe('Regla 4 — QA embebido en horas', () => {
    it('suma el % de QA a las horas del ítem, no como línea aparte', () => {
        const c = computeItem(item({ hours: 10 }), COP_CTX)
        expect(c.unitHours).toBeCloseTo(11.2)
        // y el precio sale de las horas con QA
        expect(c.unitPrice).toBe(roundPrice(11.2 * 115000, 'COP'))
    })
})

describe('Regla 5 — reúso de código', () => {
    it('descuenta horas proporcional al reúso cuando todo es backend', () => {
        expect(applyReuse(10, 70, ['db', 'payments'])).toBeCloseTo(3)
    })

    it('no descuenta la porción de UI nueva', () => {
        // 2 de 3 componentes son no-UI: 70% de reúso solo aplica a 2/3 de las horas
        expect(applyReuse(9, 70, ['ui', 'db', 'payments'])).toBeCloseTo(9 * (1 - 0.7 * (2 / 3)))
    })

    it('sin componentes marcados aplica al total', () => {
        expect(applyReuse(10, 50, [])).toBeCloseTo(5)
    })
})

describe('Regla 6 — precio cerrado, piso de mercado y jerarquía', () => {
    it('bloquea precio fijo por debajo de horas x tarifa x 1.3', () => {
        const it6 = item({ pricing_mode: 'fixed', hours: 8, fixed_price: 900000 })
        const alerts = validateQuote({
            items: [it6],
            ctx: COP_CTX,
            settings: SETTINGS,
        })
        // mínimo: 8h * 1.12 QA * 115000 * 1.3 = ~1.34M > 900K
        expect(alerts.some((a) => a.code === 'fixed_below_factor' && a.severity === 'block')).toBe(true)
    })

    it('alerta cuando el precio queda bajo el piso de mercado del preset', () => {
        const alerts = validateQuote({
            items: [item({ pricing_mode: 'fixed', hours: 2, fixed_price: 500000 })],
            ctx: COP_CTX,
            settings: SETTINGS,
            presets: [preset({ name: 'Landing Elementor', market_floor: 600000 })],
        })
        expect(alerts.some((a) => a.code === 'below_market_floor')).toBe(true)
    })

    it('alerta cuando se viola la jerarquía de esfuerzo', () => {
        const elementor = item({ pricing_mode: 'fixed', hours: 4, fixed_price: 1400000 })
        const shopify = item({ pricing_mode: 'fixed', hours: 8, fixed_price: 1300000 })
        const alerts = validateQuote({
            items: [elementor, shopify],
            ctx: COP_CTX,
            settings: SETTINGS,
            presets: [
                preset({ name: 'Landing Elementor', hierarchy_rank: 1 }),
                preset({ name: 'Página Shopify custom', hierarchy_rank: 3 }),
            ],
        })
        expect(alerts.some((a) => a.code === 'hierarchy_violation')).toBe(true)
    })

    it('alerta cuando se usa tarifa bundle para pocas páginas', () => {
        const alerts = validateQuote({
            items: [item({ pricing_mode: 'fixed', hours: 4, fixed_price: 650000, qty: 1 })],
            ctx: COP_CTX,
            settings: SETTINGS,
            presets: [preset({ name: 'Página Shopify bundle', kind: 'bundle' })],
        })
        expect(alerts.some((a) => a.code === 'bundle_misuse')).toBe(true)
    })

    it('bloquea presets en otra moneda (nunca mezclar monedas)', () => {
        const alerts = validateQuote({
            items: [item({ hours: 10 })],
            ctx: USD_CTX,
            settings: SETTINGS,
            presets: [preset({ currency: 'COP' })],
        })
        expect(alerts.some((a) => a.code === 'currency_mismatch' && a.severity === 'block')).toBe(true)
    })
})

describe('Regla 7 — mínimo facturable de 4h', () => {
    it('alerta cuando el total queda por debajo del mínimo', () => {
        const alerts = validateQuote({
            items: [item({ hours: 2 })],
            ctx: COP_CTX,
            settings: SETTINGS,
        })
        expect(alerts.some((a) => a.code === 'below_minimum')).toBe(true)
    })
})

describe('Regla 8 — descuento por volumen (manual, tope 30%)', () => {
    it('aplica el descuento solo cuando yo lo activo', () => {
        const sin = computeItem(item({ hours: 4, qty: 10 }), COP_CTX)
        const con = computeItem(item({ hours: 4, qty: 10, volume_discount_pct: 30 }), COP_CTX)
        expect(con.lineTotal).toBeLessThan(sin.lineTotal)
        expect(con.lineTotal).toBe(roundPrice(sin.unitPrice * 0.7 * 10, 'COP'))
    })
})

describe('Regla 9 — "A cotizar" no inventa números', () => {
    it('un ítem tbd vale 0 y no entra al total', () => {
        const tbd = item({ pricing_mode: 'tbd', hours: 99 })
        expect(computeItem(tbd, COP_CTX).lineTotal).toBe(0)
        const totals = computeQuote([tbd, item({ hours: 10 })], COP_CTX)
        expect(totals.tbdCount).toBe(1)
        expect(totals.totalHours).toBeCloseTo(11.2)
    })
})

describe('Regla 10 — coherencia con el proyecto ancla', () => {
    // Ancla tipo Loda: 73h / $4.000.000 COP
    const anchor = { anchor_hours: 73, anchor_price: 4000000, anchor_currency: 'COP' as const }

    it('alerta cuando % de horas y % de precio difieren más de 10 puntos', () => {
        // 25h con QA ≈ 38% del ancla en horas; precio_override lo infla a 50%+
        const alerts = validateQuote({
            items: [item({ hours: 25, price_override: 2400000 })],
            ctx: { ...COP_CTX, hourlyRate: 55000 },
            settings: SETTINGS,
            client: anchor,
        })
        expect(alerts.some((a) => a.code === 'anchor_incoherence')).toBe(true)
    })

    it('no alerta cuando la proporción es coherente', () => {
        // tarifa implícita del ancla: 4M/73h ≈ 54.8K/h
        const alerts = validateQuote({
            items: [item({ hours: 25, price_override: 1540000 })],
            ctx: { ...COP_CTX, hourlyRate: 55000 },
            settings: SETTINGS,
            client: anchor,
        })
        expect(alerts.some((a) => a.code === 'anchor_incoherence')).toBe(false)
    })
})

describe('Regla 11 — condiciones comerciales', () => {
    it('proyectos < 15h pagan 50/50; mayores 50/30/20', () => {
        const chico = computeQuote([item({ hours: 8 })], COP_CTX)
        expect(chico.paymentTerms).toContain('50% al inicio / 50%')
        const grande = computeQuote([item({ hours: 30 })], COP_CTX)
        expect(grande.paymentTerms).toContain('30% en hito intermedio')
    })

    it('garantía de 15 días (<20h) o 30 días (>=20h)', () => {
        expect(computeQuote([item({ hours: 10 })], COP_CTX).warrantyDays).toBe(15)
        expect(computeQuote([item({ hours: 20 })], COP_CTX).warrantyDays).toBe(30)
    })
})

describe('Regla 12 — redondeo y formato', () => {
    it('redondea COP hacia arriba al múltiplo de 10.000', () => {
        expect(roundPrice(1234567, 'COP')).toBe(1240000)
        expect(roundPrice(1240000, 'COP')).toBe(1240000)
    })

    it('redondea USD hacia arriba al múltiplo de 5', () => {
        expect(roundPrice(333, 'USD')).toBe(335)
        expect(roundPrice(335, 'USD')).toBe(335)
    })

    it('formatea moneda con su código', () => {
        expect(formatMoney(1240000, 'COP')).toBe('$1.240.000 COP')
        expect(formatMoney(335, 'USD')).toBe('$335 USD')
    })
})

describe('Export markdown', () => {
    const client = {
        id: 'c1', name: 'Loda Taller', email: null, company: null, tax_id: null,
        address: null, notes: null, rate_profile: 'local_standard', custom_rate: 60000,
        anchor_label: 'Loda v1', anchor_hours: 73, anchor_price: 4000000,
        anchor_currency: 'COP', created_at: '', user_id: 'u1',
    } as const

    const quote = {
        id: 'q1', quote_number: 'COT-2026-001', client_id: 'c1', title: 'Módulo Coworking',
        project_type: 'modulo', rate_profile: 'local_standard', hourly_rate: 60000,
        currency: 'COP', usd_cop_rate: 4000, qa_pct: 12, fixed_factor: 1.3,
        status: 'draft', issue_date: '2026-06-10', valid_until: '2026-07-10',
        show_hours: false, show_rate: false, payment_terms: null, notes: null,
        total_hours: 0, total_price: 0, created_at: '', updated_at: '', user_id: 'u1',
    } as const

    function qItem(overrides: Partial<QuoteItem>): QuoteItem {
        return {
            id: 'i1', quote_id: 'q1', name: 'Ítem', description: null,
            pricing_mode: 'hourly', components: [], complexity_suggested: null,
            complexity: null, reuse_pct: 0, hours_suggested: null, hours: null,
            qty: 1, volume_discount_pct: 0, price_override: null, fixed_price: null,
            preset_id: null, missing_info: [], line_hours: 0, line_total: 0,
            sort_order: 0, created_at: '',
            ...overrides,
        }
    }

    it('por defecto no muestra horas ni tarifa', () => {
        const md = exportMarkdown(quote as never, [qItem({ name: 'Reservas', hours: 20 })], client as never)
        expect(md).not.toContain('Horas')
        expect(md).not.toContain('/hora')
        expect(md).toContain('COT-2026-001')
        expect(md).toContain('Condiciones comerciales')
    })

    it('muestra horas solo con el toggle activo', () => {
        const md = exportMarkdown(
            { ...quote, show_hours: true } as never,
            [qItem({ name: 'Reservas', hours: 20 })],
            client as never,
        )
        expect(md).toContain('| Ítem | Descripción | Horas | Precio |')
    })

    it('lista los ítems "A cotizar" con su información faltante', () => {
        const md = exportMarkdown(
            quote as never,
            [
                qItem({ name: 'Reservas', hours: 20 }),
                qItem({ name: 'Integración ERP', pricing_mode: 'tbd', missing_info: ['documentación de la API', 'accesos al sistema'] }),
            ],
            client as never,
        )
        expect(md).toContain('Pendientes por cotizar')
        expect(md).toContain('documentación de la API')
    })
})
