import Link from 'next/link'
import { createClient } from '@/lib/supabase/server'
import { es } from '@/i18n/es'
import { ClientDeleteButton } from './ClientDeleteButton'
import { Users, Plus, Pencil, Search, Building2, Mail, CreditCard } from 'lucide-react'

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
                    <Plus size={16} />
                    {es.clients.newClient}
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
                                        <td className="font-medium">
                                            <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem' }}>
                                                <Users size={16} className="text-muted" />
                                                {client.name}
                                            </div>
                                        </td>
                                        <td className="text-muted">{client.email || '-'}</td>
                                        <td>
                                            {client.company ? (
                                                <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem' }}>
                                                    <Building2 size={16} className="text-muted" />
                                                    {client.company}
                                                </div>
                                            ) : '-'}
                                        </td>
                                        <td className="text-sm text-muted">{client.tax_id || '-'}</td>
                                        <td className="text-sm text-muted">
                                            {new Date(client.created_at).toLocaleDateString('es-CO')}
                                        </td>
                                        <td>
                                            <div className="table-actions" style={{ display: 'flex', justifyContent: 'flex-end', width: '100%', gap: '0.5rem' }}>
                                                <Link
                                                    href={`/clientes/${client.id}`}
                                                    className="btn btn-ghost btn-sm"
                                                    title={es.common.edit}
                                                >
                                                    <Pencil size={14} />
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
                        <div className="empty-state-icon">
                            <Users size={48} strokeWidth={1} />
                        </div>
                        <div className="empty-state-title">{es.clients.noClients}</div>
                        <div className="empty-state-description">{es.clients.noClientsDesc}</div>
                        <Link href="/clientes/nuevo" className="btn btn-primary">
                            <Plus size={16} />
                            {es.clients.newClient}
                        </Link>
                    </div>
                )}
            </div>
        </>
    )
}
