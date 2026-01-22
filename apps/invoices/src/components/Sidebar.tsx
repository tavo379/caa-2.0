'use client'

import Link from 'next/link'
import { usePathname } from 'next/navigation'
import { es } from '@/i18n/es'

interface SidebarProps {
    userEmail?: string
}

export function Sidebar({ userEmail }: SidebarProps) {
    const pathname = usePathname()

    const navItems = [
        { href: '/', label: es.nav.dashboard, icon: '📊' },
        { href: '/clientes', label: es.nav.clients, icon: '👥' },
        { href: '/facturas', label: es.nav.invoices, icon: '📄' },
    ]

    return (
        <aside className="sidebar">
            <div className="sidebar-header">
                <Link href="/" style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', textDecoration: 'none' }}>
                    <img src="/logo.svg" alt="Logo" style={{ height: '32px', width: 'auto' }} />
                    <span style={{ fontWeight: 700, color: 'var(--color-primary)', fontSize: 'var(--text-lg)' }}>
                        {es.app.name}
                    </span>
                </Link>
            </div>

            <nav className="sidebar-nav">
                {navItems.map((item) => (
                    <Link
                        key={item.href}
                        href={item.href}
                        className={`nav-link ${pathname === item.href ? 'active' : ''}`}
                    >
                        <span>{item.icon}</span>
                        <span>{item.label}</span>
                    </Link>
                ))}
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
                        marginBottom: 'var(--space-2)',
                        overflow: 'hidden',
                        textOverflow: 'ellipsis',
                        whiteSpace: 'nowrap'
                    }}>
                        {userEmail}
                    </div>
                )}
                <form action="/auth/logout" method="POST">
                    <button type="submit" className="btn btn-ghost btn-sm" style={{ width: '100%' }}>
                        {es.nav.logout}
                    </button>
                </form>
            </div>
        </aside>
    )
}
