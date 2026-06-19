import { NextRequest, NextResponse } from 'next/server'
import { renderToBuffer } from '@react-pdf/renderer'
import { createAdminClient } from '@/lib/supabase/server'
import { InvoicePdf } from '@/lib/pdf/InvoicePdf'

export const runtime = 'nodejs'
export const dynamic = 'force-dynamic'

// GET /api/pdf?token=<public_token>
// Renders a real PDF server-side (no browser print dialog).
// The public_token acts as the capability — same exposure as the /i/[token] page.
export async function GET(request: NextRequest) {
    try {
        const token = request.nextUrl.searchParams.get('token')

        if (!token) {
            return NextResponse.json({ error: 'Token required' }, { status: 400 })
        }

        const supabase = createAdminClient()

        const { data: invoice, error } = await supabase
            .from('invoices')
            .select(`
                *,
                client:clients(*),
                items:invoice_items(*)
            `)
            .eq('public_token', token)
            .single()

        if (error || !invoice) {
            return NextResponse.json({ error: 'Invoice not found' }, { status: 404 })
        }

        const sortedItems =
            invoice.items?.sort((a: any, b: any) => a.sort_order - b.sort_order) || []

        const { data: settings } = await supabase
            .from('user_settings')
            .select('*')
            .eq('user_id', invoice.user_id)
            .single()

        const buffer = await renderToBuffer(
            <InvoicePdf invoice={invoice} items={sortedItems} settings={settings} />
        )

        const filename = `Factura-${invoice.invoice_number}.pdf`

        return new NextResponse(buffer as any, {
            headers: {
                'Content-Type': 'application/pdf',
                'Content-Disposition': `attachment; filename="${filename}"`,
                'Cache-Control': 'no-store',
            },
        })
    } catch (error: any) {
        console.error('PDF generation error:', error)
        return NextResponse.json({ error: error.message }, { status: 500 })
    }
}
