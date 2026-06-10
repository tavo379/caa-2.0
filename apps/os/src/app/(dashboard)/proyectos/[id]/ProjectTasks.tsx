'use client'

import { useState } from 'react'
import { createClient } from '@/lib/supabase/client'
import { es } from '@/i18n/es'
import type { ProjectTask } from '@/lib/supabase/types'
import { Plus, Trash2, Check } from 'lucide-react'

export function ProjectTasks({ projectId, initialTasks }: { projectId: string; initialTasks: ProjectTask[] }) {
    const supabase = createClient()
    const [tasks, setTasks] = useState<ProjectTask[]>(initialTasks)
    const [newTitle, setNewTitle] = useState('')
    const [adding, setAdding] = useState(false)

    const total = tasks.length
    const done = tasks.filter((t) => t.done).length
    const pct = total > 0 ? Math.round((done / total) * 100) : 0

    const addTask = async (e: React.FormEvent) => {
        e.preventDefault()
        const title = newTitle.trim()
        if (!title) return
        setAdding(true)
        const { data, error } = await supabase
            .from('project_tasks')
            .insert({ project_id: projectId, title, sort_order: tasks.length })
            .select()
            .single()
        setAdding(false)
        if (error) {
            alert(error.message)
            return
        }
        if (data) setTasks([...tasks, data as ProjectTask])
        setNewTitle('')
    }

    const toggle = async (task: ProjectTask) => {
        const next = !task.done
        setTasks(tasks.map((t) => (t.id === task.id ? { ...t, done: next } : t)))
        const { error } = await supabase.from('project_tasks').update({ done: next }).eq('id', task.id)
        if (error) {
            // revertir
            setTasks(tasks.map((t) => (t.id === task.id ? { ...t, done: task.done } : t)))
            alert(error.message)
        }
    }

    const remove = async (task: ProjectTask) => {
        const prev = tasks
        setTasks(tasks.filter((t) => t.id !== task.id))
        const { error } = await supabase.from('project_tasks').delete().eq('id', task.id)
        if (error) {
            setTasks(prev)
            alert(error.message)
        }
    }

    return (
        <div className="card">
            <div className="card-header">
                <h3 className="card-title">{es.projects.tasks}</h3>
                {total > 0 && (
                    <span className="text-muted" style={{ fontSize: 'var(--text-sm)' }}>{done}/{total} · {pct}%</span>
                )}
            </div>

            {total > 0 && (
                <div className="progress-bar" style={{ marginBottom: 'var(--space-4)' }}>
                    <div className="progress-fill" style={{ width: `${pct}%` }} />
                </div>
            )}

            <div className="task-list">
                {tasks.map((t) => (
                    <div key={t.id} className="task-row">
                        <button
                            type="button"
                            onClick={() => toggle(t)}
                            className={`task-check ${t.done ? 'done' : ''}`}
                            aria-label={t.done ? 'Marcar pendiente' : 'Marcar hecha'}
                        >
                            {t.done && <Check size={12} strokeWidth={3} />}
                        </button>
                        <span className={`task-title ${t.done ? 'done' : ''}`}>{t.title}</span>
                        <button type="button" onClick={() => remove(t)} className="task-del" aria-label={es.common.delete}>
                            <Trash2 size={14} />
                        </button>
                    </div>
                ))}
                {total === 0 && <div className="text-muted" style={{ fontSize: 'var(--text-sm)', padding: 'var(--space-2) 0' }}>{es.projects.noTasks}</div>}
            </div>

            <form onSubmit={addTask} className="task-add">
                <input
                    type="text"
                    className="form-input"
                    placeholder={es.projects.taskPlaceholder}
                    value={newTitle}
                    onChange={(e) => setNewTitle(e.target.value)}
                />
                <button type="submit" className="btn btn-secondary" disabled={adding || !newTitle.trim()}>
                    <Plus size={16} />
                    {es.projects.addTask}
                </button>
            </form>
        </div>
    )
}
