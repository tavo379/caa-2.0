'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import Link from 'next/link'
import { createClient } from '@/lib/supabase/client'
import { es } from '@/i18n/es'
import type { Client, QuoteCurrency, RateProfile } from '@/lib/supabase/types'
import { PROFILE_LABELS } from '@/lib/quotes/engine'
import { Save } from 'lucide-react'

interface ClientFormProps {
    client?: Client
    userId: string
}

export function ClientForm({ client, userId }: ClientFormProps) {
    const router = useRouter()
    const isEditing = !!client

    const [loading, setLoading] = useState(false)
    const [error, setError] = useState('')

    const [formData, setFormData] = useState({
        name: client?.name || '',
        email: client?.email || '',
        company: client?.company || '',
        tax_id: client?.tax_id || '',
        address: client?.address || '',
        notes: client?.notes || '',
        // Cotizador (Reglas 1 y 10): perfil de tarifa y proyecto ancla
        rate_profile: client?.rate_profile || '',
        custom_rate: client?.custom_rate != null ? String(client.custom_rate) : '',
        anchor_label: client?.anchor_label || '',
        anchor_hours: client?.anchor_hours != null ? String(client.anchor_hours) : '',
        anchor_price: client?.anchor_price != null ? String(client.anchor_price) : '',
        anchor_currency: client?.anchor_currency || 'COP',
    })

    const handleChange = (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement | HTMLSelectElement>) => {
        setFormData({ ...formData, [e.target.name]: e.target.value })
    }

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault()
        setLoading(true)
        setError('')

        const supabase = createClient()

        const data = {
            name: formData.name,
            email: formData.email || null,
            company: formData.company || null,
            tax_id: formData.tax_id || null,
            address: formData.address || null,
            notes: formData.notes || null,
            rate_profile: (formData.rate_profile || null) as RateProfile | null,
            custom_rate: formData.custom_rate ? parseFloat(formData.custom_rate) : null,
            anchor_label: formData.anchor_label || null,
            anchor_hours: formData.anchor_hours ? parseFloat(formData.anchor_hours) : null,
            anchor_price: formData.anchor_price ? parseFloat(formData.anchor_price) : null,
            anchor_currency: (formData.anchor_price
                ? formData.anchor_currency
                : null) as QuoteCurrency | null,
            user_id: userId,
        }

        let result
        if (isEditing) {
            result = await supabase
                .from('clients')
                .update(data)
                .eq('id', client.id)
        } else {
            result = await supabase
                .from('clients')
                .insert(data)
        }

        if (result.error) {
            setError(result.error.message)
            setLoading(false)
            return
        }

        router.push('/clientes')
        router.refresh()
    }

    return (
        <form onSubmit={handleSubmit}>
            <div className="card">
                <div className="form-row form-row-2">
                    <div className="form-group">
                        <label htmlFor="name" className="form-label">{es.clients.name} *</label>
                        <input
                            id="name"
                            name="name"
                            type="text"
                            className="form-input"
                            value={formData.name}
                            onChange={handleChange}
                            required
                            autoFocus
                        />
                    </div>

                    <div className="form-group">
                        <label htmlFor="email" className="form-label">{es.clients.email}</label>
                        <input
                            id="email"
                            name="email"
                            type="email"
                            className="form-input"
                            value={formData.email}
                            onChange={handleChange}
                        />
                    </div>
                </div>

                <div className="form-row form-row-2">
                    <div className="form-group">
                        <label htmlFor="company" className="form-label">{es.clients.company}</label>
                        <input
                            id="company"
                            name="company"
                            type="text"
                            className="form-input"
                            value={formData.company}
                            onChange={handleChange}
                        />
                    </div>

                    <div className="form-group">
                        <label htmlFor="tax_id" className="form-label">{es.clients.taxId}</label>
                        <input
                            id="tax_id"
                            name="tax_id"
                            type="text"
                            className="form-input"
                            value={formData.tax_id}
                            onChange={handleChange}
                        />
                    </div>
                </div>

                <div className="form-group">
                    <label htmlFor="address" className="form-label">{es.clients.address}</label>
                    <textarea
                        id="address"
                        name="address"
                        className="form-textarea"
                        value={formData.address}
                        onChange={handleChange}
                        rows={2}
                    />
                </div>

                <div className="form-group">
                    <label htmlFor="notes" className="form-label">{es.clients.notes}</label>
                    <textarea
                        id="notes"
                        name="notes"
                        className="form-textarea"
                        value={formData.notes}
                        onChange={handleChange}
                        rows={3}
                    />
                </div>

                {/* Cotizador: el perfil se hereda en cada cotización nueva (Regla 1) */}
                <h3 className="card-title" style={{ margin: 'var(--space-6) 0 var(--space-4)' }}>
                    Cotizador
                </h3>

                <div className="form-row form-row-2">
                    <div className="form-group">
                        <label htmlFor="rate_profile" className="form-label">Perfil de tarifa</label>
                        <select
                            id="rate_profile"
                            name="rate_profile"
                            className="form-select"
                            value={formData.rate_profile}
                            onChange={handleChange}
                        >
                            <option value="">Sin perfil asignado</option>
                            {(Object.keys(PROFILE_LABELS) as RateProfile[]).map((p) => (
                                <option key={p} value={p}>{PROFILE_LABELS[p]}</option>
                            ))}
                        </select>
                    </div>

                    <div className="form-group">
                        <label htmlFor="custom_rate" className="form-label">
                            Tarifa heredada (opcional, manda sobre el default del perfil)
                        </label>
                        <input
                            id="custom_rate"
                            name="custom_rate"
                            type="number"
                            min="0"
                            className="form-input"
                            value={formData.custom_rate}
                            onChange={handleChange}
                            placeholder="Ej: 60000"
                        />
                    </div>
                </div>

                <div className="form-row form-row-2">
                    <div className="form-group">
                        <label htmlFor="anchor_label" className="form-label">Proyecto ancla (nombre)</label>
                        <input
                            id="anchor_label"
                            name="anchor_label"
                            type="text"
                            className="form-input"
                            value={formData.anchor_label}
                            onChange={handleChange}
                            placeholder="Ej: Loda Taller v1"
                        />
                    </div>

                    <div className="form-group">
                        <label htmlFor="anchor_hours" className="form-label">Horas del ancla</label>
                        <input
                            id="anchor_hours"
                            name="anchor_hours"
                            type="number"
                            min="0"
                            className="form-input"
                            value={formData.anchor_hours}
                            onChange={handleChange}
                            placeholder="Ej: 73"
                        />
                    </div>
                </div>

                <div className="form-row form-row-2">
                    <div className="form-group">
                        <label htmlFor="anchor_price" className="form-label">Precio del ancla</label>
                        <input
                            id="anchor_price"
                            name="anchor_price"
                            type="number"
                            min="0"
                            className="form-input"
                            value={formData.anchor_price}
                            onChange={handleChange}
                            placeholder="Ej: 4000000"
                        />
                    </div>

                    <div className="form-group">
                        <label htmlFor="anchor_currency" className="form-label">Moneda del ancla</label>
                        <select
                            id="anchor_currency"
                            name="anchor_currency"
                            className="form-select"
                            value={formData.anchor_currency}
                            onChange={handleChange}
                        >
                            <option value="COP">COP</option>
                            <option value="USD">USD</option>
                        </select>
                    </div>
                </div>

                {error && (
                    <div className="form-error" style={{ marginBottom: 'var(--space-4)' }}>
                        {error}
                    </div>
                )}

                <div className="flex gap-4" style={{ marginTop: 'var(--space-6)', justifyContent: 'flex-end' }}>
                    <Link href="/clientes" className="btn btn-secondary">
                        {es.common.cancel}
                    </Link>
                    <button type="submit" className="btn btn-primary" disabled={loading}>
                        <Save size={16} />
                        {loading ? es.common.loading : es.clients.save}
                    </button>
                </div>
            </div>
        </form>
    )
}
