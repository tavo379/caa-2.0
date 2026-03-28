import { createClient } from '@/lib/supabase/server'
import { updateSettings } from './actions'
import { Save } from 'lucide-react'

interface SettingsPageProps {
    searchParams: Promise<{ saved?: string }>
}

export default async function SettingsPage({ searchParams }: SettingsPageProps) {
    const { saved } = await searchParams
    const supabase = await createClient()
    const { data: { user } } = await supabase.auth.getUser()

    // Fetch existing settings
    const { data: settings } = await supabase
        .from('user_settings')
        .select('*')
        .eq('user_id', user?.id)
        .single()

    return (
        <div style={{ maxWidth: '800px' }}>
            <div className="page-header">
                <h1 className="page-title">Configuración</h1>
            </div>

            {saved === 'true' && (
                <div style={{
                    marginBottom: 'var(--space-6)',
                    padding: 'var(--space-4)',
                    backgroundColor: 'rgba(16, 185, 129, 0.1)',
                    border: '1px solid var(--color-success)',
                    borderRadius: 'var(--radius-md)',
                    color: 'var(--color-success)',
                    display: 'flex',
                    alignItems: 'center',
                    gap: '0.5rem'
                }}>
                    ✓ Configuración guardada correctamente.
                </div>
            )}

            <div className="card">
                <h2 className="card-title" style={{ marginBottom: 'var(--space-6)' }}>Datos de Facturación & Firma</h2>

                <form action={updateSettings}>
                    <div className="form-group">
                        <label className="form-label">Nombre del Negocio / Razón Social</label>
                        <input
                            name="businessName"
                            type="text"
                            className="form-input"
                            defaultValue={settings?.business_name || ''}
                            placeholder="Ej. Cacao & Avocado SAS"
                        />
                    </div>

                    <div className="form-group">
                        <label className="form-label">NIT / Identificación Tributaria</label>
                        <input
                            name="taxId"
                            type="text"
                            className="form-input"
                            defaultValue={settings?.tax_id || ''}
                            placeholder="Ej. 900.123.456-7"
                        />
                    </div>

                    <div className="form-group">
                        <label className="form-label">URL de la Firma (Imagen)</label>
                        <div style={{ marginBottom: 'var(--space-2)' }}>
                            <input
                                name="signatureUrl"
                                type="url"
                                className="form-input"
                                defaultValue={settings?.signature_url || ''}
                                placeholder="https://ejemplo.com/mi-firma.png"
                            />
                        </div>
                        <p className="text-muted" style={{ fontSize: 'var(--text-xs)' }}>
                            Por ahora, por favor ingrese la URL directa de su imagen de firma alojada públicamente (Dropbox, Google Drive direct link, o hosting propio).
                        </p>
                    </div>

                    {settings?.signature_url && (
                        <div className="form-group" style={{ marginTop: 'var(--space-4)', padding: 'var(--space-4)', border: '1px solid var(--color-border)', borderRadius: 'var(--radius-md)' }}>
                            <label className="form-label" style={{ marginBottom: 'var(--space-2)' }}>Vista Previa de Firma:</label>
                            <img
                                src={settings.signature_url}
                                alt="Firma Actual"
                                style={{ maxHeight: '100px', objectFit: 'contain' }}
                            />
                        </div>
                    )}

                    <div style={{ marginTop: 'var(--space-6)', display: 'flex', justifyContent: 'flex-end' }}>
                        <button type="submit" className="btn btn-primary">
                            <Save size={16} />
                            Guardar Cambios
                        </button>
                    </div>
                </form>
            </div>
        </div>
    )
}
