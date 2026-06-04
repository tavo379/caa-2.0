import Link from 'next/link'
import { notFound } from 'next/navigation'
import { createClient } from '@/lib/supabase/server'
import { es } from '@/i18n/es'
import { Pencil, Calendar, DollarSign, Flag, User, FileText, ArrowRight } from 'lucide-react'
import {
    SERVICE_LABEL,
    SERVICE_COLOR,
    PRIORITY_LABEL,
    PRIORITY_COLOR,
    isOverdue,
    formatDate,
    formatBudget,
} from '@/lib/projects'
import type { ProjectTask } from '@/lib/supabase/types'
import { ProjectTasks } from './ProjectTasks'
import { ProjectStatusSelect } from './ProjectStatusSelect'
import { ProjectDeleteButton } from './ProjectDeleteButton'

interface ProjectDetailProps {
    params: Promise<{ id: string }>
}

export default async function ProjectDetailPage({ params }: ProjectDetailProps) {
    const { id } = await params
    const supabase = await createClient()

    const { data: project } = await supabase
        .from('projects')
        .select('*, client:clients(id, name, email, company)')
        .eq('id', id)
        .single()

    if (!project) notFound()

    const { data: tasks } = await supabase
        .from('project_tasks')
        .select('*')
        .eq('project_id', id)
        .order('sort_order', { ascending: true })
        .order('created_at', { ascending: true })

    const client = (project as any).client

    // Facturas del cliente (contexto financiero)
    let invoices: any[] = []
    if (project.client_id) {
        const { data: inv } = await supabase
            .from('invoices')
            .select('id, invoice_number, status, total, currency, issue_date')
            .eq('client_id', project.client_id)
            .order('issue_date', { ascending: false })
            .limit(5)
        invoices = inv || []
    }

    const overdue = isOverdue(project.due_date, project.status)

    return (
        <>
            <div className="page-header" style={{ marginBottom: 'var(--space-6)' }}>
                <div>
                    <Link href="/proyectos" className="text-muted text-sm" style={{ marginBottom: 'var(--space-2)', display: 'block' }}>
                        ← {es.common.back}
                    </Link>
                    <h1 className="page-title" style={{ marginBottom: 8 }}>{project.name}</h1>
                    <span className="svc-badge" style={{ color: SERVICE_COLOR[project.service_type], borderColor: SERVICE_COLOR[project.service_type] }}>
                        {SERVICE_LABEL[project.service_type]}
                    </span>
                </div>
                <div style={{ display: 'flex', gap: '0.5rem', alignItems: 'center', flexWrap: 'wrap' }}>
                    <ProjectStatusSelect projectId={project.id} status={project.status} />
                    <Link href={`/proyectos/${project.id}/editar`} className="btn btn-secondary btn-sm">
                        <Pencil size={14} />
                        {es.common.edit}
                    </Link>
                    <ProjectDeleteButton projectId={project.id} />
                </div>
            </div>

            {/* Meta */}
            <div className="analytics-grid" style={{ marginBottom: 'var(--space-6)' }}>
                <MetaCard icon={<User size={16} />} label={es.projects.client} value={client?.name || es.projects.noClient} />
                <MetaCard
                    icon={<Calendar size={16} />}
                    label={es.projects.dueDate}
                    value={formatDate(project.due_date)}
                    valueColor={overdue ? 'var(--color-error)' : undefined}
                    badge={overdue ? es.projects.overdue : undefined}
                />
                <MetaCard icon={<DollarSign size={16} />} label={es.projects.budget} value={formatBudget(project.budget, project.currency)} />
                <MetaCard
                    icon={<Flag size={16} />}
                    label={es.projects.priority}
                    value={PRIORITY_LABEL[project.priority]}
                    valueColor={PRIORITY_COLOR[project.priority]}
                />
            </div>

            {project.description && (
                <div className="card" style={{ marginBottom: 'var(--space-6)' }}>
                    <div className="card-header"><h3 className="card-title">{es.projects.description}</h3></div>
                    <p style={{ margin: 0, whiteSpace: 'pre-wrap', color: 'var(--color-text)' }}>{project.description}</p>
                </div>
            )}

            <div className="chart-grid">
                <ProjectTasks projectId={project.id} initialTasks={(tasks || []) as ProjectTask[]} />

                <div className="card">
                    <div className="card-header">
                        <h3 className="card-title">{es.projects.relatedInvoices}</h3>
                        {project.client_id && (
                            <Link href={`/facturas?client=${project.client_id}`} className="btn btn-ghost btn-sm">
                                Ver todas <ArrowRight size={14} />
                            </Link>
                        )}
                    </div>
                    {invoices.length > 0 ? (
                        <div className="table-container">
                            <table className="table">
                                <thead>
                                    <tr>
                                        <th>{es.invoices.invoiceNumber}</th>
                                        <th>{es.invoices.status}</th>
                                        <th className="text-right">{es.invoices.total}</th>
                                    </tr>
                                </thead>
                                <tbody>
                                    {invoices.map((inv) => (
                                        <tr key={inv.id}>
                                            <td>
                                                <Link href={`/facturas/${inv.id}`} className="font-medium" style={{ display: 'inline-flex', alignItems: 'center', gap: '0.5rem' }}>
                                                    <FileText size={14} className="text-muted" />
                                                    {inv.invoice_number}
                                                </Link>
                                            </td>
                                            <td><span className={`badge badge-${inv.status}`}>{statusLabel(inv.status)}</span></td>
                                            <td className="text-right font-medium">{formatBudget(inv.total, inv.currency)}</td>
                                        </tr>
                                    ))}
                                </tbody>
                            </table>
                        </div>
                    ) : (
                        <div className="text-muted" style={{ fontSize: 'var(--text-sm)', padding: 'var(--space-2) 0' }}>
                            {es.projects.noRelatedInvoices}
                        </div>
                    )}
                </div>
            </div>
        </>
    )
}

function statusLabel(s: string): string {
    const map: Record<string, string> = {
        draft: es.invoices.statusDraft,
        sent: es.invoices.statusSent,
        paid: es.invoices.statusPaid,
        void: es.invoices.statusVoid,
    }
    return map[s] || s
}

function MetaCard({
    icon,
    label,
    value,
    valueColor,
    badge,
}: {
    icon: React.ReactNode
    label: string
    value: string
    valueColor?: string
    badge?: string
}) {
    return (
        <div className="kpi-card">
            <div className="kpi-head">
                <span className="kpi-label">{label}</span>
                <span className="kpi-icon">{icon}</span>
            </div>
            <div style={{ fontSize: 'var(--text-lg)', fontWeight: 'var(--font-semibold)', color: valueColor || 'var(--color-text)' }}>
                {value}
                {badge && (
                    <span style={{ marginLeft: '0.5rem', fontSize: 'var(--text-xs)', color: 'var(--color-error)', textTransform: 'uppercase' }}>
                        {badge}
                    </span>
                )}
            </div>
        </div>
    )
}
