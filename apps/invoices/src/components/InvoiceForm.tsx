'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import Link from 'next/link'
import { createClient } from '@/lib/supabase/client'
import { es } from '@/i18n/es'

interface InvoiceFormProps {
    invoice?: any
    clients: any[]
    userId: string
    invoiceNumber?: string
}

interface FormItem {
    id?: string
    description: string
    qty: number
    unit_price: number
    line_total: number
    sort_order: number
}

export function InvoiceForm({ invoice, clients, userId, invoiceNumber }: InvoiceFormProps) {
    const router = useRouter()
    const isEditing = !!invoice

    const [loading, setLoading] = useState(false)
    const [error, setError] = useState('')

    const [formData, setFormData] = useState({
        client_id: invoice?.client_id || '',
        issue_date: invoice?.issue_date || new Date().toISOString().split('T')[0],
        due_date: invoice?.due_date || '',
        currency: invoice?.currency || 'USD',
        notes: invoice?.notes || '',
        status: invoice?.status || 'draft',
    })

    const [items, setItems] = useState<FormItem[]>(
        invoice?.items?.length
            ? invoice.items.map(item => ({
                id: item.id,
                description: item.description,
                qty: item.qty,
                unit_price: item.unit_price,
                line_total: item.line_total,
                sort_order: item.sort_order,
            }))
            : [{ description: '', qty: 1, unit_price: 0, line_total: 0, sort_order: 0 }]
    )

    // Calculate totals
    const subtotal = items.reduce((sum, item) => sum + item.line_total, 0)
    const tax = 0 // Could add tax rate input
    const total = subtotal + tax

    const handleFormChange = (e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement | HTMLTextAreaElement>) => {
        setFormData({ ...formData, [e.target.name]: e.target.value })
    }

    const handleItemChange = (index: number, field: string, value: string | number) => {
        const newItems = [...items]
        newItems[index] = { ...newItems[index], [field]: value }

        // Recalculate line total
        if (field === 'qty' || field === 'unit_price') {
            newItems[index].line_total = newItems[index].qty * newItems[index].unit_price
        }

        setItems(newItems)
    }

    const addItem = () => {
        setItems([...items, {
            description: '',
            qty: 1,
            unit_price: 0,
            line_total: 0,
            sort_order: items.length
        }])
    }

    const removeItem = (index: number) => {
        if (items.length === 1) return
        const newItems = items.filter((_, i) => i !== index)
        setItems(newItems)
    }

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault()

        if (!formData.client_id) {
            setError(es.invoices.selectClient)
            return
        }

        if (items.length === 0 || items.every(i => !i.description)) {
            setError(es.invoices.noItems)
            return
        }

        setLoading(true)
        setError('')

        const supabase = createClient()

        try {
            let invoiceId = invoice?.id

            if (isEditing) {
                // Update invoice
                const { error: updateError } = await supabase
                    .from('invoices')
                    .update({
                        client_id: formData.client_id,
                        issue_date: formData.issue_date,
                        due_date: formData.due_date || null,
                        currency: formData.currency,
                        notes: formData.notes || null,
                        subtotal,
                        tax,
                        total,
                    })
                    .eq('id', invoice.id)

                if (updateError) throw updateError

                // Delete existing items and re-insert
                await supabase.from('invoice_items').delete().eq('invoice_id', invoice.id)
            } else {
                // Get next invoice number
                const { data: numberData, error: numberError } = await supabase.rpc('generate_invoice_number')
                if (numberError) throw numberError

                // Create invoice
                const { data: newInvoice, error: insertError } = await supabase
                    .from('invoices')
                    .insert({
                        invoice_number: numberData,
                        client_id: formData.client_id,
                        issue_date: formData.issue_date,
                        due_date: formData.due_date || null,
                        currency: formData.currency,
                        notes: formData.notes || null,
                        subtotal,
                        tax,
                        total,
                        user_id: userId,
                    })
                    .select('id')
                    .single()

                if (insertError) throw insertError
                invoiceId = newInvoice.id
            }

            // Insert items
            const itemsToInsert = items
                .filter(item => item.description.trim())
                .map((item, index) => ({
                    invoice_id: invoiceId!,
                    description: item.description,
                    qty: item.qty,
                    unit_price: item.unit_price,
                    line_total: item.line_total,
                    sort_order: index,
                }))

            const { error: itemsError } = await supabase
                .from('invoice_items')
                .insert(itemsToInsert as any)

            if (itemsError) throw itemsError

            router.push(`/facturas/${invoiceId}`)
            router.refresh()
        } catch (err: any) {
            setError(err.message)
            setLoading(false)
        }
    }

    const formatCurrency = (amount: number) => {
        return new Intl.NumberFormat('es-CO', {
            style: 'currency',
            currency: formData.currency,
            minimumFractionDigits: 2
        }).format(amount)
    }

    return (
        <form onSubmit={handleSubmit}>
            <div className="card" style={{ marginBottom: 'var(--space-6)' }}>
                <h3 className="card-title" style={{ marginBottom: 'var(--space-4)' }}>Información General</h3>

                <div className="form-row form-row-2">
                    <div className="form-group">
                        <label htmlFor="client_id" className="form-label">{es.invoices.client} *</label>
                        <select
                            id="client_id"
                            name="client_id"
                            className="form-select"
                            value={formData.client_id}
                            onChange={handleFormChange}
                            required
                        >
                            <option value="">{es.invoices.selectClient}</option>
                            {clients.map((client) => (
                                <option key={client.id} value={client.id}>
                                    {client.name} {client.company ? `(${client.company})` : ''}
                                </option>
                            ))}
                        </select>
                    </div>

                    <div className="form-group">
                        <label htmlFor="currency" className="form-label">{es.invoices.currency}</label>
                        <select
                            id="currency"
                            name="currency"
                            className="form-select"
                            value={formData.currency}
                            onChange={handleFormChange}
                        >
                            <option value="USD">USD - Dólar</option>
                            <option value="COP">COP - Peso Colombiano</option>
                            <option value="EUR">EUR - Euro</option>
                        </select>
                    </div>
                </div>

                <div className="form-row form-row-2">
                    <div className="form-group">
                        <label htmlFor="issue_date" className="form-label">{es.invoices.issueDate}</label>
                        <input
                            id="issue_date"
                            name="issue_date"
                            type="date"
                            className="form-input"
                            value={formData.issue_date}
                            onChange={handleFormChange}
                        />
                    </div>

                    <div className="form-group">
                        <label htmlFor="due_date" className="form-label">{es.invoices.dueDate}</label>
                        <input
                            id="due_date"
                            name="due_date"
                            type="date"
                            className="form-input"
                            value={formData.due_date}
                            onChange={handleFormChange}
                        />
                    </div>
                </div>
            </div>

            {/* Items */}
            <div className="card" style={{ marginBottom: 'var(--space-6)' }}>
                <div className="card-header">
                    <h3 className="card-title">{es.invoices.items}</h3>
                    <button type="button" onClick={addItem} className="btn btn-secondary btn-sm">
                        + {es.invoices.addItem}
                    </button>
                </div>

                <div className="table-container">
                    <table className="table">
                        <thead>
                            <tr>
                                <th style={{ width: '50%' }}>{es.invoices.description}</th>
                                <th style={{ width: '10%' }}>{es.invoices.quantity}</th>
                                <th style={{ width: '15%' }}>{es.invoices.unitPrice}</th>
                                <th style={{ width: '15%' }}>{es.invoices.lineTotal}</th>
                                <th style={{ width: '10%' }}></th>
                            </tr>
                        </thead>
                        <tbody>
                            {items.map((item, index) => (
                                <tr key={index}>
                                    <td>
                                        <input
                                            type="text"
                                            className="form-input"
                                            placeholder="Descripción del servicio o producto"
                                            value={item.description}
                                            onChange={(e) => handleItemChange(index, 'description', e.target.value)}
                                        />
                                    </td>
                                    <td>
                                        <input
                                            type="number"
                                            className="form-input"
                                            min="0"
                                            step="0.01"
                                            value={item.qty}
                                            onChange={(e) => handleItemChange(index, 'qty', parseFloat(e.target.value) || 0)}
                                        />
                                    </td>
                                    <td>
                                        <input
                                            type="number"
                                            className="form-input"
                                            min="0"
                                            step="0.01"
                                            value={item.unit_price}
                                            onChange={(e) => handleItemChange(index, 'unit_price', parseFloat(e.target.value) || 0)}
                                        />
                                    </td>
                                    <td className="text-right font-medium">
                                        {formatCurrency(item.line_total)}
                                    </td>
                                    <td>
                                        <button
                                            type="button"
                                            onClick={() => removeItem(index)}
                                            className="btn btn-ghost btn-sm"
                                            style={{ color: 'var(--color-error)' }}
                                            disabled={items.length === 1}
                                        >
                                            ✕
                                        </button>
                                    </td>
                                </tr>
                            ))}
                        </tbody>
                    </table>
                </div>

                {/* Totals */}
                <div style={{ display: 'flex', justifyContent: 'flex-end', marginTop: 'var(--space-4)' }}>
                    <div style={{ width: '300px' }}>
                        <div className="flex justify-between" style={{ padding: 'var(--space-2) 0' }}>
                            <span className="text-muted">{es.invoices.subtotal}</span>
                            <span className="font-medium">{formatCurrency(subtotal)}</span>
                        </div>
                        <div className="flex justify-between" style={{ padding: 'var(--space-2) 0' }}>
                            <span className="text-muted">{es.invoices.tax}</span>
                            <span className="font-medium">{formatCurrency(tax)}</span>
                        </div>
                        <div
                            className="flex justify-between"
                            style={{
                                padding: 'var(--space-3) 0',
                                borderTop: '2px solid var(--color-primary)',
                                marginTop: 'var(--space-2)'
                            }}
                        >
                            <span className="font-semibold">{es.invoices.total}</span>
                            <span className="font-bold" style={{ fontSize: 'var(--text-xl)' }}>
                                {formatCurrency(total)}
                            </span>
                        </div>
                    </div>
                </div>
            </div>

            {/* Notes */}
            <div className="card" style={{ marginBottom: 'var(--space-6)' }}>
                <div className="form-group" style={{ marginBottom: 0 }}>
                    <label htmlFor="notes" className="form-label">{es.invoices.notes}</label>
                    <textarea
                        id="notes"
                        name="notes"
                        className="form-textarea"
                        value={formData.notes}
                        onChange={handleFormChange}
                        placeholder="Notas o términos adicionales para el cliente"
                        rows={3}
                    />
                </div>
            </div>

            {error && (
                <div className="form-error" style={{ marginBottom: 'var(--space-4)' }}>
                    {error}
                </div>
            )}

            <div className="flex gap-4">
                <button type="submit" className="btn btn-primary" disabled={loading}>
                    {loading ? es.common.loading : es.invoices.save}
                </button>
                <Link href="/facturas" className="btn btn-secondary">
                    {es.common.cancel}
                </Link>
            </div>
        </form>
    )
}
