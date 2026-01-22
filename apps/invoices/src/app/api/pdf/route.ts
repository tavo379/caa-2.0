import { NextRequest, NextResponse } from 'next/server'
import { createClient, createAdminClient } from '@/lib/supabase/server'

// Note: In production, you would use Playwright to render the invoice HTML to PDF
// For now, we'll generate a simple HTML-based PDF using a service or browser print

export async function POST(request: NextRequest) {
    try {
        const { invoiceId } = await request.json()

        if (!invoiceId) {
            return NextResponse.json({ error: 'Invoice ID required' }, { status: 400 })
        }

        // Verify user is authenticated
        const supabase = await createClient()
        const { data: { user } } = await supabase.auth.getUser()

        if (!user) {
            return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
        }

        // Fetch invoice with client and items
        const { data: invoice, error } = await supabase
            .from('invoices')
            .select(`
        *,
        client:clients(*),
        items:invoice_items(*)
      `)
            .eq('id', invoiceId)
            .single()

        if (error || !invoice) {
            return NextResponse.json({ error: 'Invoice not found' }, { status: 404 })
        }

        // Sort items
        const sortedItems = invoice.items?.sort((a: any, b: any) => a.sort_order - b.sort_order) || []

        // Generate HTML for the invoice
        const html = generateInvoiceHtml(invoice, sortedItems)

        // For a production implementation, you would:
        // 1. Use Playwright to render the HTML to PDF
        // 2. Upload the PDF to Supabase Storage
        // 3. Return the public URL

        // For now, we'll create a data URL that can be used for printing/downloading
        // In production, replace this with actual Playwright PDF generation

        // Store the invoice as ready for PDF (you can trigger browser print)
        const pdfUrl = `/i/${invoice.public_token}?print=true`

        // Update invoice with PDF URL indicator
        await supabase
            .from('invoices')
            .update({
                pdf_url: pdfUrl,
                status: invoice.status === 'draft' ? 'sent' : invoice.status
            })
            .eq('id', invoiceId)

        return NextResponse.json({
            success: true,
            pdfUrl,
            message: 'PDF ready for download'
        })

    } catch (error: any) {
        console.error('PDF generation error:', error)
        return NextResponse.json({ error: error.message }, { status: 500 })
    }
}

function generateInvoiceHtml(invoice: any, items: any[]): string {
    const formatCurrency = (amount: number) => {
        return new Intl.NumberFormat('es-CO', {
            style: 'currency',
            currency: invoice.currency,
            minimumFractionDigits: 2
        }).format(amount)
    }

    const itemRows = items.map(item => `
    <tr>
      <td style="padding: 12px; border-bottom: 1px solid #e2e8f0;">${item.description}</td>
      <td style="padding: 12px; border-bottom: 1px solid #e2e8f0; text-align: center;">${item.qty}</td>
      <td style="padding: 12px; border-bottom: 1px solid #e2e8f0; text-align: right;">${formatCurrency(item.unit_price)}</td>
      <td style="padding: 12px; border-bottom: 1px solid #e2e8f0; text-align: right;">${formatCurrency(item.line_total)}</td>
    </tr>
  `).join('')

    return `
    <!DOCTYPE html>
    <html>
    <head>
      <meta charset="UTF-8">
      <title>Factura ${invoice.invoice_number}</title>
      <style>
        @media print {
          body { margin: 0; }
          .no-print { display: none; }
        }
        body {
          font-family: -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif;
          color: #0f172a;
          line-height: 1.6;
          max-width: 800px;
          margin: 0 auto;
          padding: 40px;
        }
      </style>
    </head>
    <body>
      <div style="display: flex; justify-content: space-between; align-items: flex-start; margin-bottom: 40px; padding-bottom: 20px; border-bottom: 2px solid #0f172a;">
        <div>
          <h1 style="color: #0f172a; margin: 0; font-size: 24px;">Cacao & Avocado</h1>
          <p style="color: #64748b; margin: 4px 0 0 0;">gustavo.ramirez@cacaoandavocado.co</p>
        </div>
        <div style="text-align: right;">
          <div style="font-size: 24px; font-weight: bold; color: #0f172a;">${invoice.invoice_number}</div>
          <div style="color: #64748b;">Fecha: ${new Date(invoice.issue_date).toLocaleDateString('es-CO')}</div>
          ${invoice.due_date ? `<div style="color: #64748b;">Vence: ${new Date(invoice.due_date).toLocaleDateString('es-CO')}</div>` : ''}
        </div>
      </div>
      
      <div style="display: grid; grid-template-columns: 1fr 1fr; gap: 40px; margin-bottom: 40px;">
        <div>
          <div style="font-size: 11px; text-transform: uppercase; letter-spacing: 0.05em; color: #64748b; margin-bottom: 8px;">De</div>
          <div style="font-weight: 600; font-size: 18px;">Cacao & Avocado</div>
          <div style="color: #64748b;">gustavo.ramirez@cacaoandavocado.co</div>
        </div>
        <div>
          <div style="font-size: 11px; text-transform: uppercase; letter-spacing: 0.05em; color: #64748b; margin-bottom: 8px;">Facturar a</div>
          <div style="font-weight: 600; font-size: 18px;">${invoice.client?.name || ''}</div>
          ${invoice.client?.company ? `<div style="color: #64748b;">${invoice.client.company}</div>` : ''}
          ${invoice.client?.tax_id ? `<div style="color: #64748b;">NIT: ${invoice.client.tax_id}</div>` : ''}
          ${invoice.client?.email ? `<div style="color: #64748b;">${invoice.client.email}</div>` : ''}
          ${invoice.client?.address ? `<div style="color: #64748b;">${invoice.client.address}</div>` : ''}
        </div>
      </div>
      
      <table style="width: 100%; border-collapse: collapse; margin-bottom: 40px;">
        <thead>
          <tr style="background: #f8fafc;">
            <th style="padding: 12px; text-align: left; font-size: 12px; text-transform: uppercase; color: #64748b;">Descripción</th>
            <th style="padding: 12px; text-align: center; font-size: 12px; text-transform: uppercase; color: #64748b;">Cantidad</th>
            <th style="padding: 12px; text-align: right; font-size: 12px; text-transform: uppercase; color: #64748b;">Precio</th>
            <th style="padding: 12px; text-align: right; font-size: 12px; text-transform: uppercase; color: #64748b;">Total</th>
          </tr>
        </thead>
        <tbody>
          ${itemRows}
        </tbody>
      </table>
      
      <div style="display: flex; justify-content: flex-end;">
        <table style="width: 280px;">
          <tr>
            <td style="padding: 8px; color: #64748b;">Subtotal</td>
            <td style="padding: 8px; text-align: right;">${formatCurrency(invoice.subtotal)}</td>
          </tr>
          <tr>
            <td style="padding: 8px; color: #64748b;">Impuesto</td>
            <td style="padding: 8px; text-align: right;">${formatCurrency(invoice.tax)}</td>
          </tr>
          <tr style="border-top: 2px solid #0f172a;">
            <td style="padding: 12px 8px; font-weight: bold; font-size: 18px;">Total</td>
            <td style="padding: 12px 8px; text-align: right; font-weight: bold; font-size: 18px;">${formatCurrency(invoice.total)}</td>
          </tr>
        </table>
      </div>
      
      ${invoice.notes ? `
        <div style="margin-top: 40px; padding-top: 20px; border-top: 1px solid #e2e8f0;">
          <div style="font-size: 11px; text-transform: uppercase; letter-spacing: 0.05em; color: #64748b; margin-bottom: 8px;">Notas</div>
          <div style="color: #64748b; white-space: pre-wrap;">${invoice.notes}</div>
        </div>
      ` : ''}
      
      <div style="margin-top: 60px; text-align: center; color: #64748b;">
        <p>Gracias por su preferencia</p>
      </div>
    </body>
    </html>
  `
}
