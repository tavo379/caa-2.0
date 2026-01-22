'use client'

import { useRouter } from 'next/navigation'
import { createClient } from '@/lib/supabase/client'
import { es } from '@/i18n/es'

export function ClientDeleteButton({ clientId }: { clientId: string }) {
    const router = useRouter()

    const handleDelete = async () => {
        if (!confirm(es.clients.deleteConfirm)) return

        const supabase = createClient()
        const { error } = await supabase
            .from('clients')
            .delete()
            .eq('id', clientId)

        if (error) {
            alert(error.message)
            return
        }

        router.refresh()
    }

    return (
        <button onClick={handleDelete} className="btn btn-ghost btn-sm" style={{ color: 'var(--color-error)' }}>
            {es.common.delete}
        </button>
    )
}
