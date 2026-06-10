import Link from 'next/link'
import { createClient } from '@/lib/supabase/server'
import { es } from '@/i18n/es'
import { ProjectForm } from '@/components/ProjectForm'

export default async function NewProjectPage() {
    const supabase = await createClient()
    const { data: { user } } = await supabase.auth.getUser()

    const { data: clients } = await supabase
        .from('clients')
        .select('id, name')
        .order('name', { ascending: true })

    return (
        <>
            <div className="page-header">
                <div>
                    <Link href="/proyectos" className="text-muted text-sm" style={{ marginBottom: 'var(--space-2)', display: 'block' }}>
                        ← {es.common.back}
                    </Link>
                    <h1 className="page-title">{es.projects.newProject}</h1>
                </div>
            </div>

            <ProjectForm userId={user!.id} clients={clients || []} />
        </>
    )
}
