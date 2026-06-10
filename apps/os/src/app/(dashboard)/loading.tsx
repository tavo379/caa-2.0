import { Loader2 } from 'lucide-react'

export default function Loading() {
    return (
        <div className="loading" style={{ height: 'calc(100vh - 100px)' }}>
            <div className="text-center">
                <Loader2 className="spinner" style={{ width: '40px', height: '40px', margin: '0 auto var(--space-4)' }} />
                <p className="text-muted">Cargando...</p>
            </div>
        </div>
    )
}
