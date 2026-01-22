import Link from 'next/link'
import { createClient } from '@/lib/supabase/server'
import { es } from '@/i18n/es'
import { ClientForm } from '@/components/ClientForm'

export default async function NewClientPage() {
    const supabase = await createClient()
    const { data: { user } } = await supabase.auth.getUser()

    return (
        <>
            <div className="page-header">
                <div>
                    <Link href="/clientes" className="text-muted text-sm" style={{ marginBottom: 'var(--space-2)', display: 'block' }}>
                        ← {es.common.back}
                    </Link>
                    <h1 className="page-title">{es.clients.newClient}</h1>
                </div>
            </div>

            <ClientForm userId={user!.id} />
        </>
    )
}
