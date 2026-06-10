import Link from 'next/link'
import { createClient } from '@/lib/supabase/server'
import { es } from '@/i18n/es'
import { FolderKanban, Plus, Calendar, ListChecks } from 'lucide-react'
import {
    BOARD_STATUSES,
    STATUS_LABEL,
    STATUS_COLOR,
    SERVICE_LABEL,
    SERVICE_COLOR,
    PRIORITY_COLOR,
    isOverdue,
    formatDate,
    formatBudget,
} from '@/lib/projects'
import type { ProjectStatus } from '@/lib/supabase/types'

export default async function ProjectsPage() {
    const supabase = await createClient()

    const { data: projects, error } = await supabase
        .from('projects')
        .select('*, client:clients(id, name)')
        .order('created_at', { ascending: false })

    if (error) {
        console.error('Error fetching projects:', error)
    }

    const all = (projects || []) as any[]

    // Conteo de tareas por proyecto
    const projectIds = all.map((p) => p.id)
    const taskMap = new Map<string, { total: number; done: number }>()
    if (projectIds.length > 0) {
        const { data: tasks } = await supabase
            .from('project_tasks')
            .select('project_id, done')
            .in('project_id', projectIds)
        for (const t of tasks || []) {
            const cur = taskMap.get(t.project_id) || { total: 0, done: 0 }
            cur.total += 1
            if (t.done) cur.done += 1
            taskMap.set(t.project_id, cur)
        }
    }

    const cancelledCount = all.filter((p) => p.status === 'cancelled').length

    return (
        <>
            <div className="page-header" style={{ marginBottom: 'var(--space-6)' }}>
                <div>
                    <h1 className="page-title" style={{ lineHeight: 1, marginBottom: 8 }}>{es.projects.title}</h1>
                    <p className="text-muted" style={{ margin: 0, fontSize: 'var(--text-sm)' }}>
                        Gestiona entregas y estados de cada proyecto
                    </p>
                </div>
                <Link href="/proyectos/nuevo" className="btn btn-primary">
                    <Plus size={16} />
                    {es.projects.newProject}
                </Link>
            </div>

            {all.length === 0 ? (
                <div className="card">
                    <div className="empty-state">
                        <div className="empty-state-icon">
                            <FolderKanban size={48} strokeWidth={1} />
                        </div>
                        <div className="empty-state-title">{es.projects.noProjects}</div>
                        <div className="empty-state-description">{es.projects.noProjectsDesc}</div>
                        <Link href="/proyectos/nuevo" className="btn btn-primary">
                            <Plus size={16} />
                            {es.projects.newProject}
                        </Link>
                    </div>
                </div>
            ) : (
                <>
                    <div className="board">
                        {BOARD_STATUSES.map((status) => {
                            const col = all.filter((p) => p.status === status)
                            return (
                                <div key={status} className="board-col">
                                    <div className="board-col-head">
                                        <span style={{ display: 'inline-flex', alignItems: 'center', gap: '0.5rem' }}>
                                            <span className="board-dot" style={{ background: STATUS_COLOR[status as ProjectStatus] }} />
                                            {STATUS_LABEL[status as ProjectStatus]}
                                        </span>
                                        <span className="board-count">{col.length}</span>
                                    </div>
                                    <div className="board-col-body">
                                        {col.map((p) => {
                                            const t = taskMap.get(p.id)
                                            const overdue = isOverdue(p.due_date, p.status)
                                            return (
                                                <Link key={p.id} href={`/proyectos/${p.id}`} className="board-card">
                                                    <div className="board-card-top">
                                                        <span className="board-card-title">{p.name}</span>
                                                        <span className="prio-dot" style={{ background: PRIORITY_COLOR[p.priority] }} title={`Prioridad ${p.priority}`} />
                                                    </div>
                                                    <div className="board-card-client">{p.client?.name || es.projects.noClient}</div>
                                                    <div className="board-card-meta">
                                                        <span className="svc-badge" style={{ color: SERVICE_COLOR[p.service_type], borderColor: SERVICE_COLOR[p.service_type] }}>
                                                            {SERVICE_LABEL[p.service_type]}
                                                        </span>
                                                        {p.budget != null && (
                                                            <span className="text-muted" style={{ fontSize: 'var(--text-xs)' }}>
                                                                {formatBudget(p.budget, p.currency)}
                                                            </span>
                                                        )}
                                                    </div>
                                                    <div className="board-card-foot">
                                                        {p.due_date && (
                                                            <span className={overdue ? 'foot-overdue' : 'text-muted'} style={{ display: 'inline-flex', alignItems: 'center', gap: '0.3rem', fontSize: 'var(--text-xs)' }}>
                                                                <Calendar size={12} />
                                                                {formatDate(p.due_date)}
                                                            </span>
                                                        )}
                                                        {t && t.total > 0 && (
                                                            <span className="text-muted" style={{ display: 'inline-flex', alignItems: 'center', gap: '0.3rem', fontSize: 'var(--text-xs)' }}>
                                                                <ListChecks size={12} />
                                                                {t.done}/{t.total}
                                                            </span>
                                                        )}
                                                    </div>
                                                </Link>
                                            )
                                        })}
                                        {col.length === 0 && <div className="board-empty">—</div>}
                                    </div>
                                </div>
                            )
                        })}
                    </div>
                    {cancelledCount > 0 && (
                        <p className="text-muted" style={{ fontSize: 'var(--text-xs)', marginTop: 'var(--space-4)' }}>
                            {cancelledCount} proyecto{cancelledCount === 1 ? '' : 's'} cancelado{cancelledCount === 1 ? '' : 's'} (archivado{cancelledCount === 1 ? '' : 's'})
                        </p>
                    )}
                </>
            )}
        </>
    )
}
