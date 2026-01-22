import Link from 'next/link'
import { createClient } from '@/lib/supabase/server'
import { es } from '@/i18n/es'
import { ClientDeleteButton } from './ClientDeleteButton'

export default async function ClientsPage() {
    const supabase = await createClient()

    const { data: clients, error } = await supabase
        .from('clients')
        .select('*')
        .order('name', { ascending: true })

    if (error) {
        console.error('Error fetching clients:', error)
    }

    return (
        <>
            <div className="page-header">
                <h1 className="page-title">{es.clients.title}</h1>
                <Link href="/clientes/nuevo" className="btn btn-primary">
                    + {es.clients.newClient}
                </Link>
            </div>

            <div className="card">
                {clients && clients.length > 0 ? (
                    <div className="table-container">
                        <table className="table">
                            <thead>
                                <tr>
                                    <th>{es.clients.name}</th>
                                    <th>{es.clients.email}</th>
                                    <th>{es.clients.company}</th>
                                    <th>{es.clients.taxId}</th>
                                    <th>{es.clients.createdAt}</th>
                                    <th className="text-right">{es.clients.actions}</th>
                                </tr>
                            </thead>
                            <tbody>
                                {clients.map((client: any) => (
                                    <tr key={client.id}>
                                        <td className="font-medium">{client.name}</td>
                                        <td className="text-muted">{client.email || '-'}</td>
                                        <td>{client.company || '-'}</td>
                                        <td className="text-sm">{client.tax_id || '-'}</td>
                                        <td className="text-sm text-muted">
                                            {new Date(client.created_at).toLocaleDateString('es-CO')}
                                        </td>
                                        <td>
                                            <div className="table-actions" style={{ justifyContent: 'flex-end' }}>
                                                <Link
                                                    href={`/clientes/${client.id}`}
                                                    className="btn btn-ghost btn-sm"
                                                >
                                                    {es.common.edit}
                                                </Link>
                                                <ClientDeleteButton clientId={client.id} />
                                            </div>
                                        </td>
                                    </tr>
                                ))}
                            </tbody>
                        </table>
                    </div>
                ) : (
                    <div className="empty-state">
                        <div className="empty-state-icon">👥</div>
                        <div className="empty-state-title">{es.clients.noClients}</div>
                        <div className="empty-state-description">{es.clients.noClientsDesc}</div>
                        <Link href="/clientes/nuevo" className="btn btn-primary">
                            + {es.clients.newClient}
                        </Link>
                    </div>
                )}
            </div>
        </>
    )
}
