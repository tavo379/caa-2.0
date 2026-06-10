'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import { createClient } from '@/lib/supabase/client'
import { es } from '@/i18n/es'
import type { Invoice, Client, InvoiceItem } from '@/lib/supabase/types'

interface InvoiceActionsProps {
    invoice: Invoice & { client: Client | null; items: InvoiceItem[] }
}

export function InvoiceActions({ invoice }: InvoiceActionsProps) {
    const router = useRouter()
    const [loading, setLoading] = useState<string | null>(null)
    const [copied, setCopied] = useState(false)

    const publicUrl = `${process.env.NEXT_PUBLIC_APP_URL || ''}/i/${invoice.public_token}`

    const handleGeneratePdf = async () => {
        setLoading('pdf')
        try {
            const response = await fetch('/api/pdf', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ invoiceId: invoice.id }),
            })

            if (!response.ok) {
                const error = await response.json()
                throw new Error(error.message || 'Error al generar PDF')
            }

            const { pdfUrl } = await response.json()

            // Open PDF in new tab
            window.open(pdfUrl, '_blank')
            router.refresh()
        } catch (err: any) {
            alert(err.message)
        } finally {
            setLoading(null)
        }
    }

    const handleSendEmail = async () => {
        if (!invoice.client?.email) {
            alert('El cliente no tiene email configurado')
            return
        }

        setLoading('email')
        try {
            const response = await fetch('/api/send', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ invoiceId: invoice.id }),
            })

            if (!response.ok) {
                const error = await response.json()
                throw new Error(error.message || 'Error al enviar email')
            }

            alert(es.email.sent)
            router.refresh()
        } catch (err: any) {
            alert(err.message)
        } finally {
            setLoading(null)
        }
    }

    const handleMarkPaid = async () => {
        setLoading('paid')
        try {
            const supabase = createClient()
            const { error } = await supabase
                .from('invoices')
                .update({ status: 'paid' })
                .eq('id', invoice.id)

            if (error) throw error
            router.refresh()
        } catch (err: any) {
            alert(err.message)
        } finally {
            setLoading(null)
        }
    }

    const handleMarkVoid = async () => {
        if (!confirm('¿Estás seguro de anular esta factura?')) return

        setLoading('void')
        try {
            const supabase = createClient()
            const { error } = await supabase
                .from('invoices')
                .update({ status: 'void' })
                .eq('id', invoice.id)

            if (error) throw error
            router.refresh()
        } catch (err: any) {
            alert(err.message)
        } finally {
            setLoading(null)
        }
    }

    const handleCopyLink = () => {
        navigator.clipboard.writeText(publicUrl)
        setCopied(true)
        setTimeout(() => setCopied(false), 2000)
    }

    return (
        <div className="flex gap-2" style={{ flexWrap: 'wrap' }}>
            {/* PDF Button */}
            {invoice.pdf_url ? (
                <a
                    href={invoice.pdf_url}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="btn btn-secondary"
                >
                    📥 {es.invoices.downloadPdf}
                </a>
            ) : (
                <button
                    onClick={handleGeneratePdf}
                    className="btn btn-secondary"
                    disabled={loading === 'pdf'}
                >
                    {loading === 'pdf' ? es.pdf.generating : `📄 ${es.invoices.generatePdf}`}
                </button>
            )}

            {/* Send Email Button */}
            {invoice.client?.email && (
                <button
                    onClick={handleSendEmail}
                    className="btn btn-secondary"
                    disabled={loading === 'email'}
                >
                    {loading === 'email' ? '...' : `✉️ ${es.invoices.sendEmail}`}
                </button>
            )}

            {/* Copy Link Button */}
            <button
                onClick={handleCopyLink}
                className="btn btn-ghost"
            >
                {copied ? `✓ ${es.invoices.linkCopied}` : `🔗 ${es.invoices.copyLink}`}
            </button>

            {/* Status Actions */}
            {invoice.status === 'draft' || invoice.status === 'sent' ? (
                <button
                    onClick={handleMarkPaid}
                    className="btn btn-success"
                    disabled={loading === 'paid'}
                >
                    {loading === 'paid' ? '...' : `✓ ${es.invoices.markPaid}`}
                </button>
            ) : null}

            {invoice.status !== 'void' && invoice.status !== 'paid' && (
                <button
                    onClick={handleMarkVoid}
                    className="btn btn-ghost"
                    style={{ color: 'var(--color-error)' }}
                    disabled={loading === 'void'}
                >
                    {loading === 'void' ? '...' : es.invoices.markVoid}
                </button>
            )}
        </div>
    )
}
