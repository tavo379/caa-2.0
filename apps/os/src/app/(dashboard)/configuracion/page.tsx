import { createClient } from '@/lib/supabase/server'
import { updateSettings, updateQuoteSettings } from './actions'
import { getQuoteSettings } from '@/lib/quotes/data'
import { QuotePresetsEditor } from '@/components/QuotePresetsEditor'
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

    const quoteSettings = await getQuoteSettings(supabase, user!.id)
    const { data: presets } = await supabase
        .from('quote_presets')
        .select('*')
        .order('sort_order')

    return (
        <div style={{ maxWidth: '1000px' }}>
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

            {/* Cotizador: tarifas, factores y conversión (Reglas 1, 4, 6, 7, 8, 12) */}
            <div className="card" style={{ marginTop: 'var(--space-6)' }}>
                <h2 className="card-title" style={{ marginBottom: 'var(--space-6)' }}>
                    Cotizador — Tarifas y Factores
                </h2>

                <form action={updateQuoteSettings}>
                    <div className="form-row form-row-3">
                        <div className="form-group">
                            <label className="form-label">Internacional (USD/h)</label>
                            <input
                                name="rateInternational"
                                type="number"
                                min="0"
                                step="0.5"
                                className="form-input"
                                defaultValue={quoteSettings.rate_international_usd}
                            />
                        </div>
                        <div className="form-group">
                            <label className="form-label">Local Premium (COP/h)</label>
                            <input
                                name="rateLocalPremium"
                                type="number"
                                min="0"
                                step="1000"
                                className="form-input"
                                defaultValue={quoteSettings.rate_local_premium_cop}
                            />
                        </div>
                        <div className="form-group">
                            <label className="form-label">Local Estándar (COP/h)</label>
                            <input
                                name="rateLocalStandard"
                                type="number"
                                min="0"
                                step="1000"
                                className="form-input"
                                defaultValue={quoteSettings.rate_local_standard_cop}
                            />
                        </div>
                    </div>

                    <div className="form-row form-row-3">
                        <div className="form-group">
                            <label className="form-label">Tasa USD → COP</label>
                            <input
                                name="usdCopRate"
                                type="number"
                                min="0"
                                step="50"
                                className="form-input"
                                defaultValue={quoteSettings.usd_cop_rate}
                            />
                        </div>
                        <div className="form-group">
                            <label className="form-label">Prima precio cerrado (factor)</label>
                            <input
                                name="fixedPriceFactor"
                                type="number"
                                min="1"
                                step="0.05"
                                className="form-input"
                                defaultValue={quoteSettings.fixed_price_factor}
                            />
                        </div>
                        <div className="form-group">
                            <label className="form-label">% QA embebido (10-15)</label>
                            <input
                                name="qaPct"
                                type="number"
                                min="0"
                                max="50"
                                className="form-input"
                                defaultValue={quoteSettings.qa_pct}
                            />
                        </div>
                    </div>

                    <div className="form-row form-row-3">
                        <div className="form-group">
                            <label className="form-label">Mínimo facturable (horas)</label>
                            <input
                                name="minBillableHours"
                                type="number"
                                min="0"
                                className="form-input"
                                defaultValue={quoteSettings.min_billable_hours}
                            />
                        </div>
                        <div className="form-group">
                            <label className="form-label">Tope dcto. volumen (%)</label>
                            <input
                                name="volumeDiscountCap"
                                type="number"
                                min="0"
                                max="100"
                                className="form-input"
                                defaultValue={quoteSettings.volume_discount_cap_pct}
                            />
                        </div>
                    </div>

                    <div style={{ display: 'flex', justifyContent: 'flex-end' }}>
                        <button type="submit" className="btn btn-primary">
                            <Save size={16} />
                            Guardar Cotizador
                        </button>
                    </div>
                </form>
            </div>

            {/* Anclas por entregable: revisar pisos de mercado cada ~6 meses */}
            <div className="card" style={{ marginTop: 'var(--space-6)' }}>
                <h2 className="card-title" style={{ marginBottom: 'var(--space-2)' }}>
                    Cotizador — Anclas por Entregable
                </h2>
                <p className="text-muted text-sm" style={{ marginBottom: 'var(--space-4)' }}>
                    Los pisos de mercado disparan la alerta &quot;estás cotizando bajo mercado&quot;.
                    Revísalos cada 6 meses.
                </p>
                <QuotePresetsEditor presets={presets || []} userId={user!.id} />
            </div>
        </div>
    )
}
