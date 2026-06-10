'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import Link from 'next/link'
import { createClient } from '@/lib/supabase/client'
import { es } from '@/i18n/es'
import type { Project, Client } from '@/lib/supabase/types'
import { SERVICE_TYPES, SERVICE_LABEL, ALL_STATUSES, STATUS_LABEL, PRIORITIES, PRIORITY_LABEL } from '@/lib/projects'
import { Save } from 'lucide-react'

interface ProjectFormProps {
    project?: Project
    clients: Pick<Client, 'id' | 'name'>[]
    userId: string
}

export function ProjectForm({ project, clients, userId }: ProjectFormProps) {
    const router = useRouter()
    const isEditing = !!project

    const [loading, setLoading] = useState(false)
    const [error, setError] = useState('')

    const [formData, setFormData] = useState({
        name: project?.name || '',
        client_id: project?.client_id || '',
        service_type: project?.service_type || 'shopify',
        status: project?.status || 'active',
        priority: project?.priority || 'medium',
        start_date: project?.start_date || '',
        due_date: project?.due_date || '',
        budget: project?.budget != null ? String(project.budget) : '',
        currency: project?.currency || 'USD',
        description: project?.description || '',
    })

    const handleChange = (
        e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement | HTMLSelectElement>,
    ) => {
        setFormData({ ...formData, [e.target.name]: e.target.value })
    }

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault()
        setLoading(true)
        setError('')

        const supabase = createClient()

        const data = {
            name: formData.name,
            client_id: formData.client_id || null,
            service_type: formData.service_type,
            status: formData.status,
            priority: formData.priority,
            start_date: formData.start_date || null,
            due_date: formData.due_date || null,
            budget: formData.budget ? Number(formData.budget) : null,
            currency: formData.currency || 'USD',
            description: formData.description || null,
            user_id: userId,
        }

        const result = isEditing
            ? await supabase.from('projects').update(data).eq('id', project.id)
            : await supabase.from('projects').insert(data)

        if (result.error) {
            setError(result.error.message)
            setLoading(false)
            return
        }

        router.push('/proyectos')
        router.refresh()
    }

    return (
        <form onSubmit={handleSubmit}>
            <div className="card">
                <div className="form-group">
                    <label htmlFor="name" className="form-label">{es.projects.name} *</label>
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

                <div className="form-row form-row-2">
                    <div className="form-group">
                        <label htmlFor="client_id" className="form-label">{es.projects.client}</label>
                        <select id="client_id" name="client_id" className="form-select" value={formData.client_id} onChange={handleChange}>
                            <option value="">{es.projects.noClient}</option>
                            {clients.map((c) => (
                                <option key={c.id} value={c.id}>{c.name}</option>
                            ))}
                        </select>
                    </div>

                    <div className="form-group">
                        <label htmlFor="service_type" className="form-label">{es.projects.serviceType}</label>
                        <select id="service_type" name="service_type" className="form-select" value={formData.service_type} onChange={handleChange}>
                            {SERVICE_TYPES.map((s) => (
                                <option key={s} value={s}>{SERVICE_LABEL[s]}</option>
                            ))}
                        </select>
                    </div>
                </div>

                <div className="form-row form-row-2">
                    <div className="form-group">
                        <label htmlFor="status" className="form-label">{es.projects.status}</label>
                        <select id="status" name="status" className="form-select" value={formData.status} onChange={handleChange}>
                            {ALL_STATUSES.map((s) => (
                                <option key={s} value={s}>{STATUS_LABEL[s]}</option>
                            ))}
                        </select>
                    </div>

                    <div className="form-group">
                        <label htmlFor="priority" className="form-label">{es.projects.priority}</label>
                        <select id="priority" name="priority" className="form-select" value={formData.priority} onChange={handleChange}>
                            {PRIORITIES.map((p) => (
                                <option key={p} value={p}>{PRIORITY_LABEL[p]}</option>
                            ))}
                        </select>
                    </div>
                </div>

                <div className="form-row form-row-2">
                    <div className="form-group">
                        <label htmlFor="start_date" className="form-label">{es.projects.startDate}</label>
                        <input id="start_date" name="start_date" type="date" className="form-input" value={formData.start_date} onChange={handleChange} />
                    </div>

                    <div className="form-group">
                        <label htmlFor="due_date" className="form-label">{es.projects.dueDate}</label>
                        <input id="due_date" name="due_date" type="date" className="form-input" value={formData.due_date} onChange={handleChange} />
                    </div>
                </div>

                <div className="form-row form-row-2">
                    <div className="form-group">
                        <label htmlFor="budget" className="form-label">{es.projects.budget}</label>
                        <input id="budget" name="budget" type="number" min="0" step="1" className="form-input" value={formData.budget} onChange={handleChange} placeholder="0" />
                    </div>

                    <div className="form-group">
                        <label htmlFor="currency" className="form-label">{es.projects.currency}</label>
                        <select id="currency" name="currency" className="form-select" value={formData.currency} onChange={handleChange}>
                            <option value="USD">USD</option>
                            <option value="COP">COP</option>
                            <option value="EUR">EUR</option>
                        </select>
                    </div>
                </div>

                <div className="form-group">
                    <label htmlFor="description" className="form-label">{es.projects.description}</label>
                    <textarea id="description" name="description" className="form-textarea" value={formData.description} onChange={handleChange} rows={3} />
                </div>

                {error && (
                    <div className="form-error" style={{ marginBottom: 'var(--space-4)' }}>{error}</div>
                )}

                <div className="flex gap-4" style={{ marginTop: 'var(--space-6)', justifyContent: 'flex-end' }}>
                    <Link href="/proyectos" className="btn btn-secondary">{es.common.cancel}</Link>
                    <button type="submit" className="btn btn-primary" disabled={loading}>
                        <Save size={16} />
                        {loading ? es.common.loading : es.projects.save}
                    </button>
                </div>
            </div>
        </form>
    )
}
