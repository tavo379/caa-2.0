'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import { Trash2 } from 'lucide-react'
import { createClient } from '@/lib/supabase/client'
import { es } from '@/i18n/es'

export function QuoteDeleteButton({ quoteId }: { quoteId: string }) {
    const router = useRouter()
    const [loading, setLoading] = useState(false)

    const handleDelete = async () => {
        if (!confirm(es.quotes.deleteConfirm)) return
        setLoading(true)
        const supabase = createClient()
        const { error } = await supabase.from('quotes').delete().eq('id', quoteId)
        if (error) {
            alert(error.message)
            setLoading(false)
            return
        }
        router.push('/cotizaciones')
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
            {es.quotes.delete}
        </button>
    )
}
