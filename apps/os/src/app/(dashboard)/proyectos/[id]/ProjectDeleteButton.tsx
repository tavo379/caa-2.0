'use client'

import { useRouter } from 'next/navigation'
import { createClient } from '@/lib/supabase/client'
import { es } from '@/i18n/es'
import { Trash2 } from 'lucide-react'

export function ProjectDeleteButton({ projectId }: { projectId: string }) {
    const router = useRouter()

    const handleDelete = async () => {
        if (!confirm(es.projects.deleteConfirm)) return
        const supabase = createClient()
        const { error } = await supabase.from('projects').delete().eq('id', projectId)
        if (error) {
            alert(error.message)
            return
        }
        router.push('/proyectos')
        router.refresh()
    }

    return (
        <button onClick={handleDelete} className="btn btn-ghost btn-sm" style={{ color: 'var(--color-error)' }}>
            <Trash2 size={14} />
            {es.common.delete}
        </button>
    )
}
