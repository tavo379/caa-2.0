'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import Link from 'next/link'
import { createClient } from '@/lib/supabase/client'
import { es } from '@/i18n/es'
import type { Client } from '@/lib/supabase/types'

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
    })

    const handleChange = (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement>) => {
        setFormData({ ...formData, [e.target.name]: e.target.value })
    }

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault()
        setLoading(true)
        setError('')

        const supabase = createClient()

        const data = {
            ...formData,
            email: formData.email || null,
            company: formData.company || null,
            tax_id: formData.tax_id || null,
            address: formData.address || null,
            notes: formData.notes || null,
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

                {error && (
                    <div className="form-error" style={{ marginBottom: 'var(--space-4)' }}>
                        {error}
                    </div>
                )}

                <div className="flex gap-4" style={{ marginTop: 'var(--space-6)' }}>
                    <button type="submit" className="btn btn-primary" disabled={loading}>
                        {loading ? es.common.loading : es.clients.save}
                    </button>
                    <Link href="/clientes" className="btn btn-secondary">
                        {es.common.cancel}
                    </Link>
                </div>
            </div>
        </form>
    )
}
