import { NextRequest, NextResponse } from 'next/server'
import { Resend } from 'resend'
import { createClient } from '@/lib/supabase/server'

export async function POST(request: NextRequest) {
  try {
    // Initialize Resend lazily to avoid build-time errors
    const resend = new Resend(process.env.RESEND_API_KEY)

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

    // Fetch invoice with client
    const { data: invoice, error } = await supabase
      .from('invoices')
      .select(`
        *,
        client:clients(*)
      `)
      .eq('id', invoiceId)
      .single()

    if (error || !invoice) {
      return NextResponse.json({ error: 'Invoice not found' }, { status: 404 })
    }

    if (!invoice.client?.email) {
      return NextResponse.json({ error: 'Client has no email address' }, { status: 400 })
    }

    const publicUrl = `${process.env.NEXT_PUBLIC_APP_URL}/i/${invoice.public_token}`

    const formatCurrency = (amount: number) => {
      return new Intl.NumberFormat('es-CO', {
        style: 'currency',
        currency: invoice.currency,
        minimumFractionDigits: 2
      }).format(amount)
    }

    // Send email
    const { data, error: emailError } = await resend.emails.send({
      from: 'Cacao & Avocado <facturas@cacaoandavocado.co>',
      to: [invoice.client.email],
      subject: `Factura ${invoice.invoice_number} - Cacao & Avocado`,
      html: `
        <!DOCTYPE html>
        <html>
        <head>
          <meta charset="UTF-8">
        </head>
        <body style="font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif; color: #0f172a; line-height: 1.6; max-width: 600px; margin: 0 auto; padding: 20px;">
          <div style="text-align: center; margin-bottom: 30px;">
            <h1 style="color: #0f172a; margin: 0;">Cacao & Avocado</h1>
          </div>
          
          <p>Hola ${invoice.client.name},</p>
          
          <p>Te enviamos la factura <strong>${invoice.invoice_number}</strong> por un total de <strong>${formatCurrency(invoice.total)}</strong>.</p>
          
          <div style="background: #f8fafc; border-radius: 8px; padding: 20px; margin: 30px 0;">
            <table style="width: 100%;">
              <tr>
                <td style="color: #64748b;">Número de factura:</td>
                <td style="text-align: right; font-weight: 600;">${invoice.invoice_number}</td>
              </tr>
              <tr>
                <td style="color: #64748b;">Fecha de emisión:</td>
                <td style="text-align: right;">${new Date(invoice.issue_date).toLocaleDateString('es-CO')}</td>
              </tr>
              ${invoice.due_date ? `
              <tr>
                <td style="color: #64748b;">Fecha de vencimiento:</td>
                <td style="text-align: right;">${new Date(invoice.due_date).toLocaleDateString('es-CO')}</td>
              </tr>
              ` : ''}
              <tr>
                <td style="color: #64748b; padding-top: 10px; border-top: 1px solid #e2e8f0;">Total a pagar:</td>
                <td style="text-align: right; font-weight: bold; font-size: 18px; padding-top: 10px; border-top: 1px solid #e2e8f0;">${formatCurrency(invoice.total)}</td>
              </tr>
            </table>
          </div>
          
          <div style="text-align: center; margin: 30px 0;">
            <a href="${publicUrl}" style="display: inline-block; background: #3b82f6; color: white; padding: 12px 24px; border-radius: 6px; text-decoration: none; font-weight: 600;">
              Ver Factura Completa
            </a>
          </div>
          
          <p>Si tienes alguna pregunta sobre esta factura, no dudes en contactarnos.</p>
          
          <p style="margin-top: 30px;">
            Saludos,<br>
            <strong>Gustavo Ramírez</strong><br>
            Cacao & Avocado
          </p>
          
          <div style="margin-top: 40px; padding-top: 20px; border-top: 1px solid #e2e8f0; color: #64748b; font-size: 12px; text-align: center;">
            <p>Cacao & Avocado • gustavo.ramirez@cacaoandavocado.co</p>
          </div>
        </body>
        </html>
      `,
    })

    if (emailError) {
      console.error('Email error:', emailError)
      return NextResponse.json({ error: emailError.message }, { status: 500 })
    }

    // Update invoice status to sent
    if (invoice.status === 'draft') {
      await supabase
        .from('invoices')
        .update({ status: 'sent' })
        .eq('id', invoiceId)
    }

    return NextResponse.json({
      success: true,
      message: 'Email sent successfully',
      emailId: data?.id
    })

  } catch (error: any) {
    console.error('Send email error:', error)
    return NextResponse.json({ error: error.message }, { status: 500 })
  }
}
