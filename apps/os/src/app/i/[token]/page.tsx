import { notFound } from 'next/navigation'
import { createAdminClient } from '@/lib/supabase/server'
import { es } from '@/i18n/es'

export const dynamic = 'force-dynamic'

interface PublicInvoicePageProps {
    params: Promise<{ token: string }>
}

export default async function PublicInvoicePage({ params }: PublicInvoicePageProps) {
    const { token } = await params

    // Use admin client to bypass RLS for public access
    const supabase = createAdminClient()

    // Solo validamos el token y leemos lo mínimo para el título.
    // El documento se renderiza con el MISMO PDF que se descarga (/api/pdf),
    // así el visor es idéntico a la descarga byte por byte.
    const { data: invoice, error } = await supabase
        .from('invoices')
        .select('invoice_number, user_id, public_token')
        .eq('public_token', token)
        .single()

    if (error || !invoice) {
        notFound()
    }

    const inv = invoice as any

    const { data: settings } = await supabase
        .from('user_settings')
        .select('business_name')
        .eq('user_id', inv.user_id)
        .single()
    const businessName = settings?.business_name || 'Cacao & Avocado'

    const pdfInline = `/api/pdf?token=${inv.public_token}&disposition=inline`
    const pdfDownload = `/api/pdf?token=${inv.public_token}`

    return (
        <html lang="es">
            <head>
                <meta charSet="UTF-8" />
                <meta name="viewport" content="width=device-width, initial-scale=1.0" />
                <meta name="robots" content="noindex, nofollow" />
                <title>{es.public.invoice} {inv.invoice_number} - {businessName}</title>
                <style dangerouslySetInnerHTML={{
                    __html: `
          * { box-sizing: border-box; }
          html, body { height: 100%; margin: 0; }
          body {
            font-family: -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif;
            color: #0f172a;
            background: #f8fafc;
            display: flex;
            flex-direction: column;
          }
          .topbar {
            display: flex;
            align-items: center;
            justify-content: space-between;
            gap: 16px;
            padding: 12px 20px;
            background: white;
            border-bottom: 1px solid #e2e8f0;
            flex-shrink: 0;
          }
          .title { font-size: 14px; font-weight: 600; }
          .title span { color: #64748b; font-weight: 400; }
          .btn {
            display: inline-flex;
            align-items: center;
            gap: 6px;
            padding: 8px 16px;
            font-size: 14px;
            font-weight: 500;
            border-radius: 6px;
            border: none;
            cursor: pointer;
            text-decoration: none;
            background: #3b82f6;
            color: white;
          }
          .btn:hover { background: #2563eb; }
          .viewer { flex: 1; border: none; width: 100%; background: #525659; }
        `}} />
            </head>
            <body>
                <div className="topbar">
                    <div className="title">
                        {businessName} <span>· {inv.invoice_number}</span>
                    </div>
                    <a href={pdfDownload} className="btn">
                        📥 {es.public.downloadPdf}
                    </a>
                </div>
                <iframe
                    className="viewer"
                    src={pdfInline}
                    title={`${es.public.invoice} ${inv.invoice_number}`}
                />
            </body>
        </html>
    )
}
