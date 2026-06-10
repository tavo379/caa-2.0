'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import { Plus, Save, Trash2 } from 'lucide-react'
import { createClient } from '@/lib/supabase/client'
import type { QuotePreset } from '@/lib/supabase/types'

interface QuotePresetsEditorProps {
    presets: QuotePreset[]
    userId: string
}

interface EditablePreset {
    id: string | null
    name: string
    kind: 'standalone' | 'bundle'
    currency: 'COP' | 'USD'
    price_min: string
    price_max: string
    hours_min: string
    hours_max: string
    market_floor: string
    hierarchy_rank: string
}

// Editor de anclas por entregable (Regla 6). Los pisos de mercado se
// revisan cada ~6 meses; por eso todo es editable sin tocar código.
export function QuotePresetsEditor({ presets, userId }: QuotePresetsEditorProps) {
    const router = useRouter()
    const [rows, setRows] = useState<EditablePreset[]>(
        presets.map((p) => ({
            id: p.id,
            name: p.name,
            kind: p.kind,
            currency: p.currency,
            price_min: p.price_min != null ? String(p.price_min) : '',
            price_max: p.price_max != null ? String(p.price_max) : '',
            hours_min: p.hours_min != null ? String(p.hours_min) : '',
            hours_max: p.hours_max != null ? String(p.hours_max) : '',
            market_floor: p.market_floor != null ? String(p.market_floor) : '',
            hierarchy_rank: String(p.hierarchy_rank),
        })),
    )
    const [saving, setSaving] = useState(false)
    const [error, setError] = useState('')

    const update = (index: number, patch: Partial<EditablePreset>) => {
        setRows((prev) => prev.map((r, i) => (i === index ? { ...r, ...patch } : r)))
    }

    const addRow = () => {
        setRows([
            ...rows,
            {
                id: null,
                name: '',
                kind: 'standalone',
                currency: 'COP',
                price_min: '',
                price_max: '',
                hours_min: '',
                hours_max: '',
                market_floor: '',
                hierarchy_rank: '0',
            },
        ])
    }

    const removeRow = async (index: number) => {
        const row = rows[index]
        if (row.id) {
            if (!confirm(`¿Eliminar el entregable "${row.name}"?`)) return
            const supabase = createClient()
            const { error: deleteError } = await supabase
                .from('quote_presets')
                .delete()
                .eq('id', row.id)
            if (deleteError) {
                setError(deleteError.message)
                return
            }
        }
        setRows(rows.filter((_, i) => i !== index))
        router.refresh()
    }

    const saveAll = async () => {
        setSaving(true)
        setError('')
        const supabase = createClient()
        const toNum = (v: string) => (v === '' ? null : parseFloat(v))

        try {
            for (const [index, row] of rows.entries()) {
                if (!row.name.trim()) continue
                const data = {
                    user_id: userId,
                    name: row.name,
                    kind: row.kind,
                    currency: row.currency,
                    price_min: toNum(row.price_min),
                    price_max: toNum(row.price_max),
                    hours_min: toNum(row.hours_min),
                    hours_max: toNum(row.hours_max),
                    market_floor: toNum(row.market_floor),
                    hierarchy_rank: parseInt(row.hierarchy_rank) || 0,
                    sort_order: index,
                }
                const result = row.id
                    ? await supabase.from('quote_presets').update(data).eq('id', row.id)
                    : await supabase.from('quote_presets').insert(data)
                if (result.error) throw result.error
            }
            router.refresh()
        } catch (err) {
            setError(err instanceof Error ? err.message : 'Error al guardar')
        } finally {
            setSaving(false)
        }
    }

    return (
        <div>
            <div className="table-container">
                <table className="table">
                    <thead>
                        <tr>
                            <th style={{ minWidth: '220px' }}>Entregable</th>
                            <th>Tipo</th>
                            <th>Moneda</th>
                            <th>Precio min</th>
                            <th>Precio max</th>
                            <th>Horas</th>
                            <th title="Alerta si cotizas por debajo">Piso mercado</th>
                            <th title="Jerarquía de esfuerzo: mayor número = más esfuerzo">Rank</th>
                            <th></th>
                        </tr>
                    </thead>
                    <tbody>
                        {rows.map((row, index) => (
                            <tr key={row.id || `new-${index}`}>
                                <td>
                                    <input
                                        type="text"
                                        className="form-input"
                                        value={row.name}
                                        onChange={(e) => update(index, { name: e.target.value })}
                                        placeholder="Nombre del entregable"
                                    />
                                </td>
                                <td>
                                    <select
                                        className="form-select"
                                        value={row.kind}
                                        onChange={(e) =>
                                            update(index, { kind: e.target.value as 'standalone' | 'bundle' })
                                        }
                                    >
                                        <option value="standalone">Suelto</option>
                                        <option value="bundle">Bundle</option>
                                    </select>
                                </td>
                                <td>
                                    <select
                                        className="form-select"
                                        value={row.currency}
                                        onChange={(e) =>
                                            update(index, { currency: e.target.value as 'COP' | 'USD' })
                                        }
                                    >
                                        <option value="COP">COP</option>
                                        <option value="USD">USD</option>
                                    </select>
                                </td>
                                <td>
                                    <input
                                        type="number"
                                        className="form-input"
                                        style={{ minWidth: '110px' }}
                                        value={row.price_min}
                                        onChange={(e) => update(index, { price_min: e.target.value })}
                                    />
                                </td>
                                <td>
                                    <input
                                        type="number"
                                        className="form-input"
                                        style={{ minWidth: '110px' }}
                                        value={row.price_max}
                                        onChange={(e) => update(index, { price_max: e.target.value })}
                                    />
                                </td>
                                <td>
                                    <div style={{ display: 'flex', gap: '4px', minWidth: '120px' }}>
                                        <input
                                            type="number"
                                            className="form-input"
                                            value={row.hours_min}
                                            onChange={(e) => update(index, { hours_min: e.target.value })}
                                            placeholder="min"
                                        />
                                        <input
                                            type="number"
                                            className="form-input"
                                            value={row.hours_max}
                                            onChange={(e) => update(index, { hours_max: e.target.value })}
                                            placeholder="max"
                                        />
                                    </div>
                                </td>
                                <td>
                                    <input
                                        type="number"
                                        className="form-input"
                                        style={{ minWidth: '110px' }}
                                        value={row.market_floor}
                                        onChange={(e) => update(index, { market_floor: e.target.value })}
                                    />
                                </td>
                                <td>
                                    <input
                                        type="number"
                                        className="form-input"
                                        style={{ width: '60px' }}
                                        value={row.hierarchy_rank}
                                        onChange={(e) => update(index, { hierarchy_rank: e.target.value })}
                                    />
                                </td>
                                <td>
                                    <button
                                        type="button"
                                        onClick={() => removeRow(index)}
                                        className="btn btn-ghost btn-sm"
                                        style={{ color: 'var(--color-error)' }}
                                        title="Eliminar"
                                    >
                                        <Trash2 size={14} />
                                    </button>
                                </td>
                            </tr>
                        ))}
                    </tbody>
                </table>
            </div>

            {error && (
                <div className="form-error" style={{ margin: 'var(--space-4) 0' }}>{error}</div>
            )}

            <div className="flex gap-4" style={{ marginTop: 'var(--space-4)', justifyContent: 'flex-end' }}>
                <button type="button" onClick={addRow} className="btn btn-secondary btn-sm">
                    <Plus size={14} />
                    Agregar entregable
                </button>
                <button type="button" onClick={saveAll} className="btn btn-primary btn-sm" disabled={saving}>
                    <Save size={14} />
                    {saving ? 'Guardando…' : 'Guardar entregables'}
                </button>
            </div>
        </div>
    )
}
