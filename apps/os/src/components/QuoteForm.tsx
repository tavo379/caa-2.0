'use client'

import { useMemo, useState } from 'react'
import { useRouter } from 'next/navigation'
import Link from 'next/link'
import { AlertTriangle, Ban, CheckCircle2, Plus, Trash2 } from 'lucide-react'
import { createClient } from '@/lib/supabase/client'
import { es } from '@/i18n/es'
import type {
    Client,
    Complexity,
    PricingMode,
    QuoteFull,
    QuotePreset,
    QuoteSettings,
    QuoteStatus,
    RateProfile,
} from '@/lib/supabase/types'
import {
    COMPLEXITY_LABELS,
    COMPONENT_KEYS,
    COMPONENT_LABELS,
    PROFILE_LABELS,
    computeItem,
    computeQuote,
    formatMoney,
    profileCurrency,
    resolveRate,
    suggestComplexity,
    suggestedHours,
    validateQuote,
    type QuoteContext,
} from '@/lib/quotes/engine'

interface QuoteFormProps {
    quote?: QuoteFull
    clients: Client[]
    presets: QuotePreset[]
    settings: QuoteSettings
    userId: string
}

interface FormItem {
    name: string
    description: string
    pricing_mode: PricingMode
    components: string[]
    complexity: Complexity | null
    complexityOverridden: boolean
    reuse_pct: number
    hours_suggested: number | null
    hours: number | null
    qty: number
    volume_discount_pct: number
    price_override: number | null
    fixed_price: number | null
    preset_id: string | null
    missing_info: string[]
}

function emptyItem(): FormItem {
    return {
        name: '',
        description: '',
        pricing_mode: 'hourly',
        components: [],
        complexity: null,
        complexityOverridden: false,
        reuse_pct: 0,
        hours_suggested: null,
        hours: null,
        qty: 1,
        volume_discount_pct: 0,
        price_override: null,
        fixed_price: null,
        preset_id: null,
        missing_info: [],
    }
}

export function QuoteForm({ quote, clients, presets, settings, userId }: QuoteFormProps) {
    const router = useRouter()
    const isEditing = !!quote

    const [loading, setLoading] = useState(false)
    const [error, setError] = useState('')

    const [formData, setFormData] = useState({
        client_id: quote?.client_id || '',
        title: quote?.title || '',
        project_type: quote?.project_type || '',
        rate_profile: (quote?.rate_profile || 'local_premium') as RateProfile,
        hourly_rate: quote?.hourly_rate ?? settings.rate_local_premium_cop,
        currency: quote?.currency || 'COP',
        status: (quote?.status || 'draft') as QuoteStatus,
        issue_date: quote?.issue_date || new Date().toISOString().split('T')[0],
        valid_until: quote?.valid_until || '',
        notes: quote?.notes || '',
    })

    const [items, setItems] = useState<FormItem[]>(
        quote?.items?.length
            ? quote.items.map((it) => ({
                  name: it.name,
                  description: it.description || '',
                  pricing_mode: it.pricing_mode,
                  components: it.components || [],
                  complexity: it.complexity,
                  complexityOverridden: it.complexity !== it.complexity_suggested,
                  reuse_pct: it.reuse_pct,
                  hours_suggested: it.hours_suggested,
                  hours: it.hours,
                  qty: it.qty,
                  volume_discount_pct: it.volume_discount_pct,
                  price_override: it.price_override,
                  fixed_price: it.fixed_price,
                  preset_id: it.preset_id,
                  missing_info: it.missing_info || [],
              }))
            : [emptyItem()],
    )

    const selectedClient = clients.find((c) => c.id === formData.client_id) || null

    // Contexto de cálculo: snapshot vivo mientras se edita
    const ctx: QuoteContext = {
        hourlyRate: formData.hourly_rate,
        currency: formData.currency as 'USD' | 'COP',
        qaPct: quote?.qa_pct ?? settings.qa_pct,
        fixedFactor: quote?.fixed_factor ?? settings.fixed_price_factor,
    }

    const totals = useMemo(() => computeQuote(items, ctx), [items, ctx.hourlyRate, ctx.currency, ctx.qaPct])

    const alerts = useMemo(
        () =>
            validateQuote({
                items,
                ctx,
                settings,
                client: selectedClient,
                presets: items.map((it) => presets.find((p) => p.id === it.preset_id) || null),
            }),
        [items, ctx.hourlyRate, ctx.currency, selectedClient, presets, settings],
    )

    // Regla 1: al elegir cliente se hereda su perfil y tarifa
    const handleClientChange = (clientId: string) => {
        const client = clients.find((c) => c.id === clientId)
        if (client?.rate_profile) {
            const profile = client.rate_profile
            setFormData((f) => ({
                ...f,
                client_id: clientId,
                rate_profile: profile,
                hourly_rate: resolveRate(profile, settings, client.custom_rate),
                currency: profileCurrency(profile),
            }))
        } else {
            setFormData((f) => ({ ...f, client_id: clientId }))
        }
    }

    const handleProfileChange = (profile: RateProfile) => {
        setFormData((f) => ({
            ...f,
            rate_profile: profile,
            hourly_rate: resolveRate(
                profile,
                settings,
                selectedClient?.rate_profile === profile ? selectedClient?.custom_rate : null,
            ),
            currency: profileCurrency(profile),
        }))
    }

    const updateItem = (index: number, patch: Partial<FormItem>) => {
        setItems((prev) => prev.map((it, i) => (i === index ? { ...it, ...patch } : it)))
    }

    // Regla 3: marcar componentes recalcula la complejidad sugerida
    const toggleComponent = (index: number, key: string) => {
        const item = items[index]
        const components = item.components.includes(key)
            ? item.components.filter((c) => c !== key)
            : [...item.components, key]
        const suggested = suggestComplexity(components)
        updateItem(index, {
            components,
            complexity: item.complexityOverridden ? item.complexity : suggested,
        })
    }

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault()

        if (!formData.client_id) {
            setError(es.quotes.selectClient)
            return
        }
        if (!formData.title.trim()) {
            setError('Ponle nombre al proyecto')
            return
        }
        if (items.every((i) => !i.name.trim())) {
            setError('Agrega al menos un ítem con nombre')
            return
        }

        setLoading(true)
        setError('')
        const supabase = createClient()

        try {
            let quoteId = quote?.id

            const quoteData = {
                client_id: formData.client_id,
                title: formData.title,
                project_type: formData.project_type || null,
                rate_profile: formData.rate_profile,
                hourly_rate: formData.hourly_rate,
                currency: formData.currency as 'USD' | 'COP',
                usd_cop_rate: settings.usd_cop_rate,
                qa_pct: ctx.qaPct,
                fixed_factor: ctx.fixedFactor,
                status: formData.status,
                issue_date: formData.issue_date,
                valid_until: formData.valid_until || null,
                payment_terms: totals.paymentTerms,
                notes: formData.notes || null,
                total_hours: totals.totalHours,
                total_price: totals.totalPrice,
            }

            if (isEditing) {
                const { error: updateError } = await supabase
                    .from('quotes')
                    .update(quoteData)
                    .eq('id', quote.id)
                if (updateError) throw updateError
                await supabase.from('quote_items').delete().eq('quote_id', quote.id)
            } else {
                const { data: numberData, error: numberError } =
                    await supabase.rpc('generate_quote_number')
                if (numberError) throw numberError

                const { data: newQuote, error: insertError } = await supabase
                    .from('quotes')
                    .insert({ ...quoteData, quote_number: numberData, user_id: userId })
                    .select('id')
                    .single()
                if (insertError) throw insertError
                quoteId = newQuote.id
            }

            const itemsToInsert = items
                .filter((it) => it.name.trim())
                .map((it, index) => {
                    const c = computeItem(it, ctx)
                    return {
                        quote_id: quoteId!,
                        name: it.name,
                        description: it.description || null,
                        pricing_mode: it.pricing_mode,
                        components: it.components,
                        complexity_suggested: it.components.length
                            ? suggestComplexity(it.components)
                            : null,
                        complexity: it.complexity,
                        reuse_pct: it.reuse_pct,
                        hours_suggested: it.complexity ? suggestedHours(it.complexity) : null,
                        hours: it.hours,
                        qty: it.qty,
                        volume_discount_pct: it.volume_discount_pct,
                        price_override: it.price_override,
                        fixed_price: it.fixed_price,
                        preset_id: it.preset_id,
                        missing_info: it.missing_info,
                        line_hours: c.lineHours,
                        line_total: c.lineTotal,
                        sort_order: index,
                    }
                })

            const { error: itemsError } = await supabase
                .from('quote_items')
                .insert(itemsToInsert)
            if (itemsError) throw itemsError

            router.push(`/cotizaciones/${quoteId}`)
            router.refresh()
        } catch (err) {
            setError(err instanceof Error ? err.message : 'Error al guardar')
            setLoading(false)
        }
    }

    return (
        <form onSubmit={handleSubmit}>
            {/* Información general */}
            <div className="card" style={{ marginBottom: 'var(--space-6)' }}>
                <h3 className="card-title" style={{ marginBottom: 'var(--space-4)' }}>
                    Información General
                </h3>

                <div className="form-row form-row-2">
                    <div className="form-group">
                        <label htmlFor="client_id" className="form-label">{es.quotes.client} *</label>
                        <select
                            id="client_id"
                            className="form-select"
                            value={formData.client_id}
                            onChange={(e) => handleClientChange(e.target.value)}
                            required
                        >
                            <option value="">{es.quotes.selectClient}</option>
                            {clients.map((client) => (
                                <option key={client.id} value={client.id}>
                                    {client.name} {client.company ? `(${client.company})` : ''}
                                    {client.rate_profile ? ` — ${PROFILE_LABELS[client.rate_profile]}` : ''}
                                </option>
                            ))}
                        </select>
                        {selectedClient?.anchor_price != null && selectedClient?.anchor_hours != null && (
                            <div className="text-xs text-muted" style={{ marginTop: 'var(--space-1)' }}>
                                {es.quotes.anchor}: {selectedClient.anchor_label || '—'} ·{' '}
                                {selectedClient.anchor_hours}h ·{' '}
                                {formatMoney(selectedClient.anchor_price, selectedClient.anchor_currency || 'COP')}
                            </div>
                        )}
                    </div>

                    <div className="form-group">
                        <label htmlFor="title" className="form-label">{es.quotes.projectTitle} *</label>
                        <input
                            id="title"
                            type="text"
                            className="form-input"
                            value={formData.title}
                            onChange={(e) => setFormData({ ...formData, title: e.target.value })}
                            placeholder="Ej: Módulo Coworking"
                            required
                        />
                    </div>
                </div>

                <div className="form-row form-row-3">
                    <div className="form-group">
                        <label htmlFor="rate_profile" className="form-label">{es.quotes.profile}</label>
                        <select
                            id="rate_profile"
                            className="form-select"
                            value={formData.rate_profile}
                            onChange={(e) => handleProfileChange(e.target.value as RateProfile)}
                        >
                            {(Object.keys(PROFILE_LABELS) as RateProfile[]).map((p) => (
                                <option key={p} value={p}>{PROFILE_LABELS[p]}</option>
                            ))}
                        </select>
                    </div>

                    <div className="form-group">
                        <label htmlFor="hourly_rate" className="form-label">
                            {es.quotes.rate} ({formData.currency})
                        </label>
                        <input
                            id="hourly_rate"
                            type="number"
                            className="form-input"
                            min="0"
                            value={formData.hourly_rate || ''}
                            onChange={(e) =>
                                setFormData({ ...formData, hourly_rate: parseFloat(e.target.value) || 0 })
                            }
                        />
                    </div>

                    <div className="form-group">
                        <label htmlFor="status" className="form-label">{es.quotes.status}</label>
                        <select
                            id="status"
                            className="form-select"
                            value={formData.status}
                            onChange={(e) => setFormData({ ...formData, status: e.target.value as QuoteStatus })}
                        >
                            <option value="draft">{es.quotes.statusDraft}</option>
                            <option value="sent">{es.quotes.statusSent}</option>
                            <option value="approved">{es.quotes.statusApproved}</option>
                            <option value="rejected">{es.quotes.statusRejected}</option>
                            <option value="expired">{es.quotes.statusExpired}</option>
                        </select>
                    </div>
                </div>

                <div className="form-row form-row-2">
                    <div className="form-group">
                        <label htmlFor="issue_date" className="form-label">{es.quotes.issueDate}</label>
                        <input
                            id="issue_date"
                            type="date"
                            className="form-input"
                            value={formData.issue_date}
                            onChange={(e) => setFormData({ ...formData, issue_date: e.target.value })}
                        />
                    </div>
                    <div className="form-group">
                        <label htmlFor="valid_until" className="form-label">{es.quotes.validUntil}</label>
                        <input
                            id="valid_until"
                            type="date"
                            className="form-input"
                            value={formData.valid_until}
                            onChange={(e) => setFormData({ ...formData, valid_until: e.target.value })}
                        />
                    </div>
                </div>
            </div>

            {/* Ítems */}
            <div className="card" style={{ marginBottom: 'var(--space-6)' }}>
                <div className="card-header">
                    <h3 className="card-title">{es.quotes.items}</h3>
                    <button
                        type="button"
                        onClick={() => setItems([...items, emptyItem()])}
                        className="btn btn-secondary btn-sm"
                    >
                        <Plus size={14} />
                        {es.quotes.addItem}
                    </button>
                </div>

                {items.map((item, index) => {
                    const c = computeItem(item, ctx)
                    const suggested = item.components.length
                        ? suggestComplexity(item.components)
                        : null
                    return (
                        <div
                            key={index}
                            style={{
                                border: '1px solid var(--color-border)',
                                borderRadius: 'var(--radius-md)',
                                padding: 'var(--space-4)',
                                marginBottom: 'var(--space-4)',
                            }}
                        >
                            <div className="form-row form-row-3">
                                <div className="form-group" style={{ gridColumn: 'span 2' }}>
                                    <label className="form-label">{es.quotes.itemName} *</label>
                                    <input
                                        type="text"
                                        className="form-input"
                                        value={item.name}
                                        onChange={(e) => updateItem(index, { name: e.target.value })}
                                        placeholder="Ej: Sistema de reservas"
                                    />
                                </div>
                                <div className="form-group">
                                    <label className="form-label">{es.quotes.pricingMode}</label>
                                    <div style={{ display: 'flex', gap: 'var(--space-2)' }}>
                                        <select
                                            className="form-select"
                                            value={item.pricing_mode}
                                            onChange={(e) =>
                                                updateItem(index, { pricing_mode: e.target.value as PricingMode })
                                            }
                                        >
                                            <option value="hourly">{es.quotes.modeHourly}</option>
                                            <option value="fixed">{es.quotes.modeFixed}</option>
                                            <option value="tbd">{es.quotes.modeTbd}</option>
                                        </select>
                                        <button
                                            type="button"
                                            onClick={() => setItems(items.filter((_, i) => i !== index))}
                                            className="btn btn-ghost btn-sm"
                                            style={{ color: 'var(--color-error)' }}
                                            disabled={items.length === 1}
                                            title={es.quotes.delete}
                                        >
                                            <Trash2 size={14} />
                                        </button>
                                    </div>
                                </div>
                            </div>

                            <div className="form-group">
                                <label className="form-label">Descripción</label>
                                <input
                                    type="text"
                                    className="form-input"
                                    value={item.description}
                                    onChange={(e) => updateItem(index, { description: e.target.value })}
                                    placeholder="Visible en el export"
                                />
                            </div>

                            {item.pricing_mode === 'tbd' ? (
                                // Regla 9: "A cotizar" — solo se documenta qué falta
                                <div className="form-group" style={{ marginBottom: 0 }}>
                                    <label className="form-label">{es.quotes.missingInfo}</label>
                                    <textarea
                                        className="form-textarea"
                                        rows={2}
                                        value={item.missing_info.join('\n')}
                                        onChange={(e) =>
                                            updateItem(index, {
                                                missing_info: e.target.value.split('\n').filter(Boolean),
                                            })
                                        }
                                        placeholder={'Ej: documentación de la API\naccesos al sistema legado'}
                                    />
                                </div>
                            ) : (
                                <>
                                    {/* Regla 3: puntos de toque */}
                                    <div className="form-group">
                                        <label className="form-label">{es.quotes.components}</label>
                                        <div style={{ display: 'flex', flexWrap: 'wrap', gap: 'var(--space-2)' }}>
                                            {COMPONENT_KEYS.map((key) => (
                                                <label
                                                    key={key}
                                                    style={{
                                                        display: 'flex',
                                                        alignItems: 'center',
                                                        gap: '0.35rem',
                                                        padding: '0.25rem 0.6rem',
                                                        borderRadius: 'var(--radius-sm)',
                                                        border: '1px solid var(--color-border)',
                                                        background: item.components.includes(key)
                                                            ? 'rgba(59, 130, 246, 0.15)'
                                                            : 'transparent',
                                                        cursor: 'pointer',
                                                        fontSize: 'var(--text-sm)',
                                                    }}
                                                >
                                                    <input
                                                        type="checkbox"
                                                        checked={item.components.includes(key)}
                                                        onChange={() => toggleComponent(index, key)}
                                                    />
                                                    {COMPONENT_LABELS[key]}
                                                </label>
                                            ))}
                                        </div>
                                    </div>

                                    <div className="form-row form-row-3">
                                        <div className="form-group">
                                            <label className="form-label">
                                                {es.quotes.complexity}
                                                {suggested && (
                                                    <span className="text-xs text-muted">
                                                        {' '}({es.quotes.suggested}: {COMPLEXITY_LABELS[suggested]})
                                                    </span>
                                                )}
                                            </label>
                                            <select
                                                className="form-select"
                                                value={item.complexity || ''}
                                                onChange={(e) =>
                                                    updateItem(index, {
                                                        complexity: (e.target.value || null) as Complexity | null,
                                                        complexityOverridden:
                                                            e.target.value !== '' && e.target.value !== suggested,
                                                    })
                                                }
                                            >
                                                <option value="">—</option>
                                                <option value="low">Baja (1-4h)</option>
                                                <option value="medium">Media (8-15h)</option>
                                                <option value="high">Alta (20-40h)</option>
                                            </select>
                                        </div>

                                        <div className="form-group">
                                            <label className="form-label">
                                                {es.quotes.hours}
                                                {item.complexity && (
                                                    <span className="text-xs text-muted">
                                                        {' '}({es.quotes.suggested}: {suggestedHours(item.complexity)}h)
                                                    </span>
                                                )}
                                            </label>
                                            <input
                                                type="number"
                                                className="form-input"
                                                min="0"
                                                step="0.5"
                                                value={item.hours ?? ''}
                                                placeholder={item.complexity ? String(suggestedHours(item.complexity)) : '0'}
                                                onChange={(e) =>
                                                    updateItem(index, {
                                                        hours: e.target.value === '' ? null : parseFloat(e.target.value),
                                                    })
                                                }
                                            />
                                        </div>

                                        <div className="form-group">
                                            <label className="form-label">{es.quotes.reuse}</label>
                                            <input
                                                type="number"
                                                className="form-input"
                                                min="0"
                                                max="100"
                                                value={item.reuse_pct || ''}
                                                placeholder="0"
                                                onChange={(e) =>
                                                    updateItem(index, { reuse_pct: parseFloat(e.target.value) || 0 })
                                                }
                                            />
                                        </div>
                                    </div>

                                    <div className="form-row form-row-3">
                                        <div className="form-group">
                                            <label className="form-label">{es.quotes.qty}</label>
                                            <input
                                                type="number"
                                                className="form-input"
                                                min="1"
                                                value={item.qty || ''}
                                                onChange={(e) =>
                                                    updateItem(index, { qty: parseFloat(e.target.value) || 1 })
                                                }
                                            />
                                        </div>
                                        <div className="form-group">
                                            <label className="form-label">{es.quotes.volumeDiscount} (máx 30)</label>
                                            <input
                                                type="number"
                                                className="form-input"
                                                min="0"
                                                max="30"
                                                value={item.volume_discount_pct || ''}
                                                placeholder="0"
                                                onChange={(e) =>
                                                    updateItem(index, {
                                                        volume_discount_pct: Math.min(parseFloat(e.target.value) || 0, 30),
                                                    })
                                                }
                                            />
                                        </div>
                                        <div className="form-group">
                                            <label className="form-label">{es.quotes.preset}</label>
                                            <select
                                                className="form-select"
                                                value={item.preset_id || ''}
                                                onChange={(e) =>
                                                    updateItem(index, { preset_id: e.target.value || null })
                                                }
                                            >
                                                <option value="">{es.quotes.noPreset}</option>
                                                {presets.filter((p) => p.active).map((p) => (
                                                    <option key={p.id} value={p.id}>{p.name}</option>
                                                ))}
                                            </select>
                                        </div>
                                    </div>

                                    <div className="form-row form-row-3">
                                        {item.pricing_mode === 'fixed' && (
                                            <div className="form-group">
                                                <label className="form-label">
                                                    {es.quotes.fixedPrice} ({formData.currency})
                                                </label>
                                                <input
                                                    type="number"
                                                    className="form-input"
                                                    min="0"
                                                    value={item.fixed_price ?? ''}
                                                    onChange={(e) =>
                                                        updateItem(index, {
                                                            fixed_price:
                                                                e.target.value === '' ? null : parseFloat(e.target.value),
                                                        })
                                                    }
                                                />
                                            </div>
                                        )}
                                        <div className="form-group">
                                            <label className="form-label">
                                                {es.quotes.priceOverride} ({formData.currency})
                                            </label>
                                            <input
                                                type="number"
                                                className="form-input"
                                                min="0"
                                                value={item.price_override ?? ''}
                                                placeholder="auto"
                                                onChange={(e) =>
                                                    updateItem(index, {
                                                        price_override:
                                                            e.target.value === '' ? null : parseFloat(e.target.value),
                                                    })
                                                }
                                            />
                                        </div>
                                        <div className="form-group" style={{ justifyContent: 'flex-end', display: 'flex', flexDirection: 'column' }}>
                                            <div className="text-sm text-muted">
                                                {c.lineHours.toFixed(1)}h con QA
                                            </div>
                                            <div className="font-semibold" style={{ fontSize: 'var(--text-lg)' }}>
                                                {formatMoney(c.lineTotal, ctx.currency)}
                                                {item.price_override != null && (
                                                    <span className="text-xs text-muted"> (manual)</span>
                                                )}
                                            </div>
                                        </div>
                                    </div>
                                </>
                            )}
                        </div>
                    )
                })}
            </div>

            {/* Alertas del motor de reglas */}
            <div className="card" style={{ marginBottom: 'var(--space-6)' }}>
                <h3 className="card-title" style={{ marginBottom: 'var(--space-4)' }}>{es.quotes.alerts}</h3>
                {alerts.length === 0 ? (
                    <div className="text-sm text-muted" style={{ display: 'flex', alignItems: 'center', gap: 'var(--space-2)' }}>
                        <CheckCircle2 size={16} style={{ color: 'var(--color-success)' }} />
                        {es.quotes.noAlerts}
                    </div>
                ) : (
                    alerts.map((alert, i) => (
                        <div key={i} className={`quote-alert quote-alert-${alert.severity}`}>
                            {alert.severity === 'block' ? <Ban size={16} /> : <AlertTriangle size={16} />}
                            <span>{alert.message}</span>
                        </div>
                    ))
                )}
            </div>

            {/* Notas + totales */}
            <div className="card" style={{ marginBottom: 'var(--space-6)' }}>
                <div className="form-group">
                    <label htmlFor="notes" className="form-label">{es.quotes.notes}</label>
                    <textarea
                        id="notes"
                        className="form-textarea"
                        rows={3}
                        value={formData.notes}
                        onChange={(e) => setFormData({ ...formData, notes: e.target.value })}
                    />
                </div>

                <div style={{ display: 'flex', justifyContent: 'flex-end' }}>
                    <div style={{ width: '320px' }}>
                        <div className="flex justify-between" style={{ padding: 'var(--space-2) 0' }}>
                            <span className="text-muted">{es.quotes.totalHours}</span>
                            <span className="font-medium">{totals.totalHours.toFixed(1)}h</span>
                        </div>
                        <div className="flex justify-between" style={{ padding: 'var(--space-2) 0' }}>
                            <span className="text-muted">Forma de pago</span>
                            <span className="font-medium text-sm">{totals.paymentTerms.split(' / ').join(' · ')}</span>
                        </div>
                        {totals.tbdCount > 0 && (
                            <div className="flex justify-between" style={{ padding: 'var(--space-2) 0' }}>
                                <span className="text-muted">{es.quotes.tbdSection}</span>
                                <span className="font-medium">{totals.tbdCount}</span>
                            </div>
                        )}
                        <div
                            className="flex justify-between"
                            style={{
                                padding: 'var(--space-3) 0',
                                borderTop: '2px solid var(--color-primary)',
                                marginTop: 'var(--space-2)',
                            }}
                        >
                            <span className="font-semibold">{es.quotes.total}</span>
                            <span className="font-bold" style={{ fontSize: 'var(--text-xl)' }}>
                                {formatMoney(totals.totalPrice, ctx.currency)}
                            </span>
                        </div>
                    </div>
                </div>
            </div>

            {error && (
                <div className="form-error" style={{ marginBottom: 'var(--space-4)' }}>{error}</div>
            )}

            <div className="flex gap-4">
                <button type="submit" className="btn btn-primary" disabled={loading}>
                    {loading ? es.common.loading : es.quotes.save}
                </button>
                <Link href="/cotizaciones" className="btn btn-secondary">
                    {es.common.cancel}
                </Link>
            </div>
        </form>
    )
}
