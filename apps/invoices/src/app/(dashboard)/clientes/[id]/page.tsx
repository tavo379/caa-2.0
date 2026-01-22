import Link from 'next/link'
import { notFound } from 'next/navigation'
import { createClient } from '@/lib/supabase/server'
import { es } from '@/i18n/es'
import { ClientForm } from '@/components/ClientForm'

interface EditClientPageProps {
    params: Promise<{ id: string }>
}

export default async function EditClientPage({ params }: EditClientPageProps) {
    const { id } = await params
    const supabase = await createClient()
    const { data: { user } } = await supabase.auth.getUser()

    const { data: client } = await supabase
        .from('clients')
        .select('*')
        .eq('id', id)
        .single()

    if (!client) {
        notFound()
    }

    return (
        <>
            <div className="page-header">
                <div>
                    <Link href="/clientes" className="text-muted text-sm" style={{ marginBottom: 'var(--space-2)', display: 'block' }}>
                        ← {es.common.back}
                    </Link>
                    <h1 className="page-title">{es.clients.editClient}</h1>
                </div>
            </div>

            <ClientForm client={client} userId={user!.id} />
        </>
    )
}
