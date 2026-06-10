import { notFound } from 'next/navigation'
import { createAdminClient } from '@/lib/supabase/server'
import { es } from '@/i18n/es'

interface PublicInvoicePageProps {
    params: Promise<{ token: string }>
    searchParams: Promise<{ print?: string }>
}

export default async function PublicInvoicePage({ params, searchParams }: PublicInvoicePageProps) {
    const { token } = await params
    const { print } = await searchParams

    // Use admin client to bypass RLS for public access
    const supabase = createAdminClient()

    const { data: invoice, error } = await supabase
        .from('invoices')
        .select(`
      id,
      invoice_number,
      issue_date,
      due_date,
      currency,
      status,
      subtotal,
      tax,
      total,
      notes,
      public_token,
      client:clients(name, company, tax_id, email, address),
      items:invoice_items(id, description, qty, unit_price, line_total, sort_order)
    `)
        .eq('public_token', token)
        .single()

    if (error || !invoice) {
        notFound()
    }

    // Cast to any to avoid TypeScript issues with Supabase untyped client
    const inv = invoice as any

    const formatCurrency = (amount: number) => {
        return new Intl.NumberFormat('es-CO', {
            style: 'currency',
            currency: inv.currency,
            minimumFractionDigits: 2
        }).format(amount)
    }

    const getStatusLabel = (status: string) => {
        const labels: Record<string, string> = {
            draft: es.invoices.statusDraft,
            sent: es.invoices.statusSent,
            paid: es.invoices.statusPaid,
            void: es.invoices.statusVoid
        }
        return labels[status] || status
    }

    // Sort items
    const sortedItems = inv.items?.sort((a: any, b: any) => a.sort_order - b.sort_order) || []

    return (
        <html lang="es">
            <head>
                <meta charSet="UTF-8" />
                <meta name="viewport" content="width=device-width, initial-scale=1.0" />
                <meta name="robots" content="noindex, nofollow" />
                <title>Factura {inv.invoice_number} - Cacao & Avocado</title>
                <style dangerouslySetInnerHTML={{
                    __html: `
          @media print {
            body { margin: 0; padding: 20px; }
            .no-print { display: none !important; }
            .invoice-container { box-shadow: none !important; }
          }
          * { box-sizing: border-box; }
          body {
            font-family: -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif;
            color: #0f172a;
            line-height: 1.6;
            background: #f8fafc;
            margin: 0;
            padding: 40px 20px;
          }
          .invoice-container {
            max-width: 800px;
            margin: 0 auto;
            background: white;
            padding: 40px;
            border-radius: 8px;
            box-shadow: 0 4px 6px -1px rgba(0, 0, 0, 0.1);
          }
          .actions {
            max-width: 800px;
            margin: 0 auto 20px;
            display: flex;
            gap: 10px;
          }
          .btn {
            display: inline-flex;
            align-items: center;
            padding: 8px 16px;
            font-size: 14px;
            font-weight: 500;
            border-radius: 6px;
            border: none;
            cursor: pointer;
            text-decoration: none;
          }
          .btn-primary {
            background: #3b82f6;
            color: white;
          }
          .btn-primary:hover { background: #2563eb; }
          .header {
            display: flex;
            justify-content: space-between;
            align-items: flex-start;
            margin-bottom: 40px;
            padding-bottom: 20px;
            border-bottom: 2px solid #0f172a;
          }
          .logo { font-size: 24px; font-weight: bold; }
          .invoice-number { font-size: 24px; font-weight: bold; }
          .invoice-date { color: #64748b; font-size: 14px; }
          .parties {
            display: grid;
            grid-template-columns: 1fr 1fr;
            gap: 40px;
            margin-bottom: 40px;
          }
          .party-label {
            font-size: 11px;
            text-transform: uppercase;
            letter-spacing: 0.05em;
            color: #64748b;
            margin-bottom: 8px;
          }
          .party-name { font-weight: 600; font-size: 18px; }
          .party-detail { color: #64748b; font-size: 14px; }
          table { width: 100%; border-collapse: collapse; margin-bottom: 40px; }
          th {
            padding: 12px;
            text-align: left;
            font-size: 12px;
            text-transform: uppercase;
            color: #64748b;
            background: #f8fafc;
          }
          td { padding: 12px; border-bottom: 1px solid #e2e8f0; }
          .text-center { text-align: center; }
          .text-right { text-align: right; }
          .totals { display: flex; justify-content: flex-end; }
          .totals-table { width: 280px; }
          .totals-table td { padding: 8px; }
          .total-row { border-top: 2px solid #0f172a; }
          .total-row td { padding-top: 12px; font-weight: bold; font-size: 18px; }
          .notes {
            margin-top: 40px;
            padding-top: 20px;
            border-top: 1px solid #e2e8f0;
          }
          .notes-label {
            font-size: 11px;
            text-transform: uppercase;
            color: #64748b;
            margin-bottom: 8px;
          }
          .footer {
            margin-top: 60px;
            text-align: center;
            color: #64748b;
          }
          .badge {
            display: inline-block;
            padding: 4px 8px;
            font-size: 12px;
            font-weight: 500;
            border-radius: 4px;
            margin-left: 10px;
          }
          .badge-draft { background: #f1f5f9; color: #64748b; }
          .badge-sent { background: #eff6ff; color: #3b82f6; }
          .badge-paid { background: #ecfdf5; color: #10b981; }
          .badge-void { background: #fef2f2; color: #ef4444; }
          @media (max-width: 600px) {
            .parties { grid-template-columns: 1fr; gap: 20px; }
            .header { flex-direction: column; gap: 20px; }
          }
        `}} />
                {print && (
                    <script dangerouslySetInnerHTML={{ __html: `window.onload = function() { window.print(); }` }} />
                )}
            </head>
            <body>
                <div className="actions no-print">
                    <button id="print-btn" className="btn btn-primary">
                        📥 {es.public.downloadPdf}
                    </button>
                </div>
                <script dangerouslySetInnerHTML={{ __html: `document.getElementById('print-btn').onclick = function() { window.print(); };` }} />

                <div className="invoice-container">
                    <div className="header">
                        <div className="logo">Cacao & Avocado</div>
                        <div style={{ textAlign: 'right' }}>
                            <div className="invoice-number">
                                {inv.invoice_number}
                                <span className={`badge badge-${inv.status}`}>
                                    {getStatusLabel(inv.status)}
                                </span>
                            </div>
                            <div className="invoice-date">
                                Fecha: {new Date(inv.issue_date).toLocaleDateString('es-CO')}
                            </div>
                            {inv.due_date && (
                                <div className="invoice-date">
                                    Vence: {new Date(inv.due_date).toLocaleDateString('es-CO')}
                                </div>
                            )}
                        </div>
                    </div>

                    <div className="parties">
                        <div>
                            <div className="party-label">De</div>
                            <div className="party-name">Cacao & Avocado</div>
                            <div className="party-detail">gustavo.ramirez@cacaoandavocado.co</div>
                        </div>
                        <div>
                            <div className="party-label">Facturar a</div>
                            <div className="party-name">{inv.client?.name}</div>
                            {inv.client?.company && <div className="party-detail">{inv.client.company}</div>}
                            {inv.client?.tax_id && <div className="party-detail">NIT: {inv.client.tax_id}</div>}
                            {inv.client?.email && <div className="party-detail">{inv.client.email}</div>}
                            {inv.client?.address && <div className="party-detail">{inv.client.address}</div>}
                        </div>
                    </div>

                    <table>
                        <thead>
                            <tr>
                                <th style={{ width: '50%' }}>Descripción</th>
                                <th className="text-center" style={{ width: '15%' }}>Cantidad</th>
                                <th className="text-right" style={{ width: '17%' }}>Precio</th>
                                <th className="text-right" style={{ width: '18%' }}>Total</th>
                            </tr>
                        </thead>
                        <tbody>
                            {sortedItems.map((item: any) => (
                                <tr key={item.id}>
                                    <td>{item.description}</td>
                                    <td className="text-center">{item.qty}</td>
                                    <td className="text-right">{formatCurrency(item.unit_price)}</td>
                                    <td className="text-right">{formatCurrency(item.line_total)}</td>
                                </tr>
                            ))}
                        </tbody>
                    </table>

                    <div className="totals">
                        <table className="totals-table">
                            <tbody>
                                <tr>
                                    <td style={{ color: '#64748b' }}>Subtotal</td>
                                    <td className="text-right">{formatCurrency(inv.subtotal)}</td>
                                </tr>
                                <tr>
                                    <td style={{ color: '#64748b' }}>Impuesto</td>
                                    <td className="text-right">{formatCurrency(inv.tax)}</td>
                                </tr>
                                <tr className="total-row">
                                    <td>Total</td>
                                    <td className="text-right">{formatCurrency(inv.total)}</td>
                                </tr>
                            </tbody>
                        </table>
                    </div>

                    {inv.notes && (
                        <div className="notes">
                            <div className="notes-label">Notas</div>
                            <div style={{ color: '#64748b', whiteSpace: 'pre-wrap' }}>{inv.notes}</div>
                        </div>
                    )}

                    <div className="footer">
                        <p>Gracias por su preferencia</p>
                    </div>
                </div>
            </body>
        </html>
    )
}
