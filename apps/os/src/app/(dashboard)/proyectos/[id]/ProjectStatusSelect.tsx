'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import { createClient } from '@/lib/supabase/client'
import type { ProjectStatus } from '@/lib/supabase/types'
import { ALL_STATUSES, STATUS_LABEL, STATUS_COLOR } from '@/lib/projects'

export function ProjectStatusSelect({ projectId, status }: { projectId: string; status: ProjectStatus }) {
    const router = useRouter()
    const supabase = createClient()
    const [value, setValue] = useState<ProjectStatus>(status)
    const [saving, setSaving] = useState(false)

    const onChange = async (e: React.ChangeEvent<HTMLSelectElement>) => {
        const next = e.target.value as ProjectStatus
        setValue(next)
        setSaving(true)
        const { error } = await supabase.from('projects').update({ status: next }).eq('id', projectId)
        setSaving(false)
        if (error) {
            setValue(status)
            alert(error.message)
            return
        }
        router.refresh()
    }

    return (
        <div style={{ display: 'inline-flex', alignItems: 'center', gap: '0.5rem' }}>
            <span className="board-dot" style={{ background: STATUS_COLOR[value] }} />
            <select
                value={value}
                onChange={onChange}
                disabled={saving}
                className="form-select"
                style={{ width: 'auto', minWidth: 150 }}
            >
                {ALL_STATUSES.map((s) => (
                    <option key={s} value={s}>{STATUS_LABEL[s]}</option>
                ))}
            </select>
        </div>
    )
}
