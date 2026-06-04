// Labels y colores compartidos del módulo de proyectos
import type { ProjectStatus, ProjectServiceType, ProjectPriority } from '@/lib/supabase/types'

export const STATUS_LABEL: Record<ProjectStatus, string> = {
    lead: 'Prospecto',
    active: 'En progreso',
    on_hold: 'En pausa',
    completed: 'Completado',
    cancelled: 'Cancelado',
}

export const STATUS_COLOR: Record<ProjectStatus, string> = {
    lead: '#a78bfa', // violeta
    active: '#3b82f6', // azul
    on_hold: '#f59e0b', // ámbar
    completed: '#10b981', // verde
    cancelled: '#ef4444', // rojo
}

// Columnas del board (orden), excluye cancelados (quedan archivados)
export const BOARD_STATUSES: ProjectStatus[] = ['lead', 'active', 'on_hold', 'completed']
export const ALL_STATUSES: ProjectStatus[] = ['lead', 'active', 'on_hold', 'completed', 'cancelled']

export const SERVICE_LABEL: Record<ProjectServiceType, string> = {
    shopify: 'Shopify',
    hubspot: 'HubSpot',
    web: 'Desarrollo Web',
    other: 'Otro',
}

export const SERVICE_COLOR: Record<ProjectServiceType, string> = {
    shopify: '#95bf47', // verde Shopify
    hubspot: '#ff7a59', // naranja HubSpot
    web: '#d4d4d8',
    other: '#71717a',
}

export const SERVICE_TYPES: ProjectServiceType[] = ['shopify', 'hubspot', 'web', 'other']

export const PRIORITY_LABEL: Record<ProjectPriority, string> = {
    low: 'Baja',
    medium: 'Media',
    high: 'Alta',
}

export const PRIORITY_COLOR: Record<ProjectPriority, string> = {
    low: '#71717a',
    medium: '#d4d4d8',
    high: '#ef4444',
}

export const PRIORITIES: ProjectPriority[] = ['low', 'medium', 'high']

export function isOverdue(due: string | null, status: ProjectStatus): boolean {
    if (!due || status === 'completed' || status === 'cancelled') return false
    const d = new Date(due)
    const today = new Date()
    today.setHours(0, 0, 0, 0)
    return d < today
}

export function formatDate(d: string | null): string {
    if (!d) return '—'
    return new Date(d).toLocaleDateString('es-CO', { day: 'numeric', month: 'short', year: 'numeric' })
}

export function formatBudget(amount: number | null, currency: string): string {
    if (amount == null) return '—'
    try {
        return new Intl.NumberFormat('es-CO', {
            style: 'currency',
            currency,
            minimumFractionDigits: 0,
            maximumFractionDigits: 0,
        }).format(amount)
    } catch {
        return `${currency} ${Math.round(amount).toLocaleString('es-CO')}`
    }
}
