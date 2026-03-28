'use client'

import Link from 'next/link'
import { usePathname } from 'next/navigation'
import { es } from '@/i18n/es'
import { LayoutDashboard, Users, FileText, LogOut, Settings } from 'lucide-react'

interface SidebarProps {
    userEmail?: string
}

export function Sidebar({ userEmail }: SidebarProps) {
    const pathname = usePathname()

    const navItems = [
        { href: '/', label: es.nav.dashboard, icon: LayoutDashboard },
        { href: '/clientes', label: es.nav.clients, icon: Users },
        { href: '/facturas', label: es.nav.invoices, icon: FileText },
        { href: '/configuracion', label: 'Configuración', icon: Settings },
    ]

    return (
        <aside className="sidebar">
            <div className="sidebar-header">
                <Link href="/" style={{ display: 'flex', alignItems: 'center', gap: '0.75rem', textDecoration: 'none' }}>
                    <div style={{
                        width: '32px',
                        height: '32px',
                        background: 'linear-gradient(135deg, #3b82f6 0%, #2563eb 100%)',
                        borderRadius: '8px',
                        display: 'flex',
                        alignItems: 'center',
                        justifyContent: 'center',
                        color: 'white',
                        fontWeight: 'bold'
                    }}>C</div>
                    <span style={{ fontWeight: 700, color: 'var(--color-primary)', fontSize: 'var(--text-lg)', letterSpacing: '-0.02em' }}>
                        {es.app.name}
                    </span>
                </Link>
            </div>

            <nav className="sidebar-nav">
                <div style={{
                    fontSize: 'var(--text-xs)',
                    color: 'var(--color-text-muted)',
                    textTransform: 'uppercase',
                    letterSpacing: '0.05em',
                    marginBottom: 'var(--space-2)',
                    paddingLeft: 'var(--space-4)'
                }}>
                    Menu
                </div>
                {navItems.map((item) => {
                    const Icon = item.icon
                    const isActive = pathname === item.href
                    return (
                        <Link
                            key={item.href}
                            href={item.href}
                            className={`nav-link ${isActive ? 'active' : ''}`}
                        >
                            <Icon size={20} />
                            <span>{item.label}</span>
                        </Link>
                    )
                })}
            </nav>

            <div style={{
                padding: 'var(--space-4)',
                borderTop: '1px solid var(--color-border)',
                marginTop: 'auto'
            }}>
                {userEmail && (
                    <div style={{
                        fontSize: 'var(--text-xs)',
                        color: 'var(--color-text-muted)',
                        marginBottom: 'var(--space-4)',
                        overflow: 'hidden',
                        textOverflow: 'ellipsis',
                        whiteSpace: 'nowrap',
                        display: 'flex',
                        alignItems: 'center',
                        gap: '0.5rem'
                    }}>
                        <div style={{ width: '8px', height: '8px', borderRadius: '50%', background: 'var(--color-success)' }}></div>
                        {userEmail}
                    </div>
                )}
                <form action="/auth/logout" method="POST">
                    <button type="submit" className="btn btn-ghost btn-sm" style={{ width: '100%', justifyContent: 'flex-start' }}>
                        <LogOut size={16} />
                        {es.nav.logout}
                    </button>
                </form>
            </div>
        </aside>
    )
}
