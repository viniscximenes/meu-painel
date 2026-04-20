import type { Metadata } from 'next'
import './globals.css'

export const metadata: Metadata = {
  title: 'HALO — Sistema de Gestão Angelicais',
  description: 'HALO — Sistema interno de gestão operacional e acompanhamento de metas.',
  icons: { icon: '/favicon.ico' },
}

export default function RootLayout({
  children,
}: {
  children: React.ReactNode
}) {
  return (
    <html lang="pt-BR">
      <body>
        <div className="noise-overlay" aria-hidden="true" />
        {children}
      </body>
    </html>
  )
}
