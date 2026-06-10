import type { Metadata } from 'next'
import '@/styles/globals.css'

export const metadata: Metadata = {
    title: 'Facturas - Cacao & Avocado',
    description: 'Sistema de facturación de Cacao & Avocado',
}

export default function RootLayout({
    children,
}: {
    children: React.ReactNode
}) {
    return (
        <html lang="es">
            <head>
                <link rel="preconnect" href="https://fonts.googleapis.com" />
                <link rel="preconnect" href="https://fonts.gstatic.com" crossOrigin="anonymous" />
                <link href="https://fonts.googleapis.com/css2?family=Space+Grotesk:wght@300;400;500;600;700&display=swap" rel="stylesheet" />
            </head>
            <body>{children}</body>
        </html>
    )
}
