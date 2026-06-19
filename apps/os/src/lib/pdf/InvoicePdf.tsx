import {
    Document,
    Page,
    View,
    Text,
    Image,
    StyleSheet,
} from '@react-pdf/renderer'

interface PdfItem {
    description: string
    qty: number
    unit_price: number
    line_total: number
}

interface PdfInvoice {
    invoice_number: string
    issue_date: string
    due_date?: string | null
    currency: string
    subtotal: number
    tax: number
    total: number
    notes?: string | null
    client?: {
        name?: string | null
        company?: string | null
        tax_id?: string | null
        email?: string | null
        address?: string | null
    } | null
}

interface PdfSettings {
    business_name?: string | null
    business_address?: string | null
    tax_id?: string | null
    logo_url?: string | null
    signature_url?: string | null
}

const INK = '#0f172a'
const MUTED = '#64748b'
const BORDER = '#e2e8f0'

const styles = StyleSheet.create({
    page: {
        paddingTop: 48,
        paddingBottom: 56,
        paddingHorizontal: 48,
        fontSize: 10,
        color: INK,
        fontFamily: 'Helvetica',
        lineHeight: 1.5,
    },
    header: {
        flexDirection: 'row',
        justifyContent: 'space-between',
        alignItems: 'flex-start',
        borderBottomWidth: 2,
        borderBottomColor: INK,
        paddingBottom: 16,
        marginBottom: 28,
    },
    logo: { maxHeight: 48, maxWidth: 180, objectFit: 'contain' },
    businessName: { fontSize: 18, fontFamily: 'Helvetica-Bold', color: INK },
    headerRight: { alignItems: 'flex-end' },
    invoiceNumber: { fontSize: 18, fontFamily: 'Helvetica-Bold' },
    metaLine: { color: MUTED, fontSize: 10 },
    parties: { flexDirection: 'row', gap: 32, marginBottom: 28 },
    party: { flex: 1 },
    partyLabel: {
        fontSize: 8,
        textTransform: 'uppercase',
        letterSpacing: 1,
        color: MUTED,
        marginBottom: 4,
    },
    partyName: { fontSize: 13, fontFamily: 'Helvetica-Bold' },
    partyDetail: { color: MUTED, fontSize: 10 },
    table: { marginBottom: 24 },
    tHead: {
        flexDirection: 'row',
        backgroundColor: '#f8fafc',
        paddingVertical: 8,
        paddingHorizontal: 8,
    },
    tRow: {
        flexDirection: 'row',
        paddingVertical: 8,
        paddingHorizontal: 8,
        borderBottomWidth: 1,
        borderBottomColor: BORDER,
    },
    th: {
        fontSize: 8,
        textTransform: 'uppercase',
        letterSpacing: 0.5,
        color: MUTED,
    },
    colDesc: { width: '46%' },
    colQty: { width: '14%', textAlign: 'center' },
    colPrice: { width: '20%', textAlign: 'right' },
    colTotal: { width: '20%', textAlign: 'right' },
    totals: { flexDirection: 'row', justifyContent: 'flex-end' },
    totalsTable: { width: 240 },
    totalsRow: {
        flexDirection: 'row',
        justifyContent: 'space-between',
        paddingVertical: 5,
    },
    totalsGrand: {
        flexDirection: 'row',
        justifyContent: 'space-between',
        paddingTop: 10,
        marginTop: 4,
        borderTopWidth: 2,
        borderTopColor: INK,
    },
    grandText: { fontSize: 14, fontFamily: 'Helvetica-Bold' },
    notes: {
        marginTop: 32,
        paddingTop: 16,
        borderTopWidth: 1,
        borderTopColor: BORDER,
    },
    signatureBlock: { marginTop: 48 },
    signatureImg: { maxHeight: 70, maxWidth: 200, objectFit: 'contain', marginBottom: 6 },
    signatureLine: {
        width: 200,
        borderTopWidth: 1,
        borderTopColor: INK,
        paddingTop: 4,
        fontSize: 10,
        fontFamily: 'Helvetica-Bold',
    },
    footer: {
        position: 'absolute',
        bottom: 28,
        left: 48,
        right: 48,
        textAlign: 'center',
        color: MUTED,
        fontSize: 9,
    },
})

export function InvoicePdf({
    invoice,
    items,
    settings,
}: {
    invoice: PdfInvoice
    items: PdfItem[]
    settings: PdfSettings | null
}) {
    const fmt = (amount: number) =>
        new Intl.NumberFormat('es-CO', {
            style: 'currency',
            currency: invoice.currency,
            minimumFractionDigits: 2,
        }).format(amount || 0)

    const fmtDate = (d: string) => new Date(d).toLocaleDateString('es-CO')

    const businessName = settings?.business_name || 'Cacao & Avocado'

    return (
        <Document>
            <Page size="A4" style={styles.page}>
                {/* Header */}
                <View style={styles.header}>
                    <View>
                        {settings?.logo_url ? (
                            // eslint-disable-next-line jsx-a11y/alt-text
                            <Image src={settings.logo_url} style={styles.logo} />
                        ) : (
                            <Text style={styles.businessName}>{businessName}</Text>
                        )}
                        {settings?.business_address ? (
                            <Text style={styles.metaLine}>{settings.business_address}</Text>
                        ) : null}
                    </View>
                    <View style={styles.headerRight}>
                        <Text style={styles.invoiceNumber}>{invoice.invoice_number}</Text>
                        <Text style={styles.metaLine}>Fecha: {fmtDate(invoice.issue_date)}</Text>
                        {invoice.due_date ? (
                            <Text style={styles.metaLine}>Vence: {fmtDate(invoice.due_date)}</Text>
                        ) : null}
                    </View>
                </View>

                {/* Parties */}
                <View style={styles.parties}>
                    <View style={styles.party}>
                        <Text style={styles.partyLabel}>De</Text>
                        <Text style={styles.partyName}>{businessName}</Text>
                        {settings?.tax_id ? (
                            <Text style={styles.partyDetail}>NIT: {settings.tax_id}</Text>
                        ) : null}
                        {settings?.business_address ? (
                            <Text style={styles.partyDetail}>{settings.business_address}</Text>
                        ) : null}
                    </View>
                    <View style={styles.party}>
                        <Text style={styles.partyLabel}>Facturar a</Text>
                        <Text style={styles.partyName}>{invoice.client?.name || ''}</Text>
                        {invoice.client?.company ? (
                            <Text style={styles.partyDetail}>{invoice.client.company}</Text>
                        ) : null}
                        {invoice.client?.tax_id ? (
                            <Text style={styles.partyDetail}>NIT: {invoice.client.tax_id}</Text>
                        ) : null}
                        {invoice.client?.email ? (
                            <Text style={styles.partyDetail}>{invoice.client.email}</Text>
                        ) : null}
                        {invoice.client?.address ? (
                            <Text style={styles.partyDetail}>{invoice.client.address}</Text>
                        ) : null}
                    </View>
                </View>

                {/* Items */}
                <View style={styles.table}>
                    <View style={styles.tHead}>
                        <Text style={[styles.th, styles.colDesc]}>Descripción</Text>
                        <Text style={[styles.th, styles.colQty]}>Cantidad</Text>
                        <Text style={[styles.th, styles.colPrice]}>Precio</Text>
                        <Text style={[styles.th, styles.colTotal]}>Total</Text>
                    </View>
                    {items.map((item, i) => (
                        <View style={styles.tRow} key={i} wrap={false}>
                            <Text style={styles.colDesc}>{item.description}</Text>
                            <Text style={styles.colQty}>{item.qty}</Text>
                            <Text style={styles.colPrice}>{fmt(item.unit_price)}</Text>
                            <Text style={styles.colTotal}>{fmt(item.line_total)}</Text>
                        </View>
                    ))}
                </View>

                {/* Totals */}
                <View style={styles.totals}>
                    <View style={styles.totalsTable}>
                        <View style={styles.totalsRow}>
                            <Text style={{ color: MUTED }}>Subtotal</Text>
                            <Text>{fmt(invoice.subtotal)}</Text>
                        </View>
                        <View style={styles.totalsRow}>
                            <Text style={{ color: MUTED }}>Impuesto</Text>
                            <Text>{fmt(invoice.tax)}</Text>
                        </View>
                        <View style={styles.totalsGrand}>
                            <Text style={styles.grandText}>Total</Text>
                            <Text style={styles.grandText}>{fmt(invoice.total)}</Text>
                        </View>
                    </View>
                </View>

                {/* Notes */}
                {invoice.notes ? (
                    <View style={styles.notes}>
                        <Text style={styles.partyLabel}>Notas</Text>
                        <Text style={{ color: MUTED }}>{invoice.notes}</Text>
                    </View>
                ) : null}

                {/* Signature */}
                {settings?.signature_url ? (
                    <View style={styles.signatureBlock} wrap={false}>
                        {/* eslint-disable-next-line jsx-a11y/alt-text */}
                        <Image src={settings.signature_url} style={styles.signatureImg} />
                        <Text style={styles.signatureLine}>Firma Autorizada</Text>
                    </View>
                ) : null}

                {/* Footer */}
                <Text style={styles.footer} fixed>
                    {businessName} — Gracias por su preferencia
                </Text>
            </Page>
        </Document>
    )
}
