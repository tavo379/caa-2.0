'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import { Trash2 } from 'lucide-react'
import { createClient } from '@/lib/supabase/client'
import { es } from '@/i18n/es'

export function InvoiceDeleteButton({ invoiceId }: { invoiceId: string }) {
    const router = useRouter()
    const [loading, setLoading] = useState(false)

    const handleDelete = async () => {
        if (!confirm(es.invoices.deleteConfirm)) return
        setLoading(true)
        const supabase = createClient()
        // invoice_items are removed via the ON DELETE CASCADE FK
        const { error } = await supabase.from('invoices').delete().eq('id', invoiceId)
        if (error) {
            alert(error.message)
            setLoading(false)
            return
        }
        router.push('/facturas')
        router.refresh()
    }

    return (
        <button
            type="button"
            onClick={handleDelete}
            className="btn btn-ghost btn-sm"
            style={{ color: 'var(--color-error)' }}
            disabled={loading}
        >
            <Trash2 size={14} />
            {loading ? '...' : es.invoices.delete}
        </button>
    )
}
