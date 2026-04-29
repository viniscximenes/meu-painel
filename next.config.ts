import type { NextConfig } from 'next'

const isDev = process.env.NODE_ENV === 'development'

const nextConfig: NextConfig = {
  serverExternalPackages: ['googleapis', '@react-pdf/renderer'],

  redirects: async () => [
    {
      source: '/painel/gestor/contestacao-rv/exportar-pdf',
      destination: '/painel/gestor/contestacao-rv/exportar-pdf-op',
      permanent: true,
    },
  ],

  ...(isDev && {
    headers: async () => [
      {
        source: '/(.*)',
        headers: [
          { key: 'Cache-Control', value: 'no-store, no-cache, must-revalidate' },
          { key: 'Pragma',        value: 'no-cache' },
          { key: 'Expires',       value: '0' },
        ],
      },
    ],
  }),
}

export default nextConfig
