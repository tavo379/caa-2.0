'use client'

import { useMemo, useState } from 'react'
import { Check, Copy } from 'lucide-react'
import { es } from '@/i18n/es'
import type { Client, Quote, QuoteItem } from '@/lib/supabase/types'
import { exportMarkdown } from '@/lib/quotes/export'

interface QuoteExportProps {
    quote: Quote
    items: QuoteItem[]
    client: Client
}

// Preview + copia del markdown. Los toggles son locales: por defecto
// NUNCA se muestran horas ni tarifa (Regla 12).
export function QuoteExport({ quote, items, client }: QuoteExportProps) {
    const [showHours, setShowHours] = useState(quote.show_hours)
    const [showRate, setShowRate] = useState(quote.show_rate)
    const [copied, setCopied] = useState(false)

    const markdown = useMemo(
        () => exportMarkdown({ ...quote, show_hours: showHours, show_rate: showRate }, items, client),
        [quote, items, client, showHours, showRate],
    )

    const handleCopy = async () => {
        await navigator.clipboard.writeText(markdown)
        setCopied(true)
        setTimeout(() => setCopied(false), 2000)
    }

    return (
        <div className="card">
            <div className="card-header">
                <h3 className="card-title">{es.quotes.export}</h3>
                <div style={{ display: 'flex', alignItems: 'center', gap: 'var(--space-4)' }}>
                    <label className="text-sm" style={{ display: 'flex', alignItems: 'center', gap: '0.4rem', cursor: 'pointer' }}>
                        <input
                            type="checkbox"
                            checked={showHours}
                            onChange={(e) => setShowHours(e.target.checked)}
                        />
                        {es.quotes.showHours}
                    </label>
                    <label className="text-sm" style={{ display: 'flex', alignItems: 'center', gap: '0.4rem', cursor: 'pointer' }}>
                        <input
                            type="checkbox"
                            checked={showRate}
                            onChange={(e) => setShowRate(e.target.checked)}
                        />
                        {es.quotes.showRate}
                    </label>
                    <button type="button" onClick={handleCopy} className="btn btn-primary btn-sm">
                        {copied ? <Check size={14} /> : <Copy size={14} />}
                        {copied ? es.quotes.copied : es.quotes.copyMarkdown}
                    </button>
                </div>
            </div>

            <pre
                style={{
                    background: 'var(--color-bg)',
                    border: '1px solid var(--color-border)',
                    borderRadius: 'var(--radius-md)',
                    padding: 'var(--space-4)',
                    fontSize: 'var(--text-sm)',
                    whiteSpace: 'pre-wrap',
                    wordBreak: 'break-word',
                    maxHeight: '480px',
                    overflowY: 'auto',
                }}
            >
                {markdown}
            </pre>
        </div>
    )
}
