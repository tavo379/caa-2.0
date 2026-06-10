import Link from 'next/link'
import { notFound } from 'next/navigation'
import { createClient } from '@/lib/supabase/server'
import { es } from '@/i18n/es'
import { ProjectForm } from '@/components/ProjectForm'
import type { Project } from '@/lib/supabase/types'

interface EditProjectProps {
    params: Promise<{ id: string }>
}

export default async function EditProjectPage({ params }: EditProjectProps) {
    const { id } = await params
    const supabase = await createClient()
    const { data: { user } } = await supabase.auth.getUser()

    const { data: project } = await supabase.from('projects').select('*').eq('id', id).single()
    if (!project) notFound()

    const { data: clients } = await supabase
        .from('clients')
        .select('id, name')
        .order('name', { ascending: true })

    return (
        <>
            <div className="page-header">
                <div>
                    <Link href={`/proyectos/${id}`} className="text-muted text-sm" style={{ marginBottom: 'var(--space-2)', display: 'block' }}>
                        ← {es.common.back}
                    </Link>
                    <h1 className="page-title">{es.projects.editProject}</h1>
                </div>
            </div>

            <ProjectForm userId={user!.id} clients={clients || []} project={project as Project} />
        </>
    )
}
