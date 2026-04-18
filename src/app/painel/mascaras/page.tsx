import { getProfile } from '@/lib/auth'
import { redirect } from 'next/navigation'
import { listarMascarasAtivas } from '@/lib/mascaras'
import type { Mascara } from '@/lib/mascaras'
import PainelShell from '@/components/PainelShell'
import MascarasClient from './MascarasClient'

export const dynamic = 'force-dynamic'

function GoldLine() {
  return (
    <div style={{
      height: '1px',
      background: 'linear-gradient(90deg, transparent 0%, #c9a84c 25%, #e8c96d 50%, #c9a84c 75%, transparent 100%)',
    }} />
  )
}

export default async function MascarasPage() {
  const profile = await getProfile()
  if (!profile) redirect('/login')

  const mascaras = await listarMascarasAtivas().catch(() => [] as Mascara[])

  return (
    <PainelShell profile={profile} title="Máscaras" iconName="ClipboardCopy">
      <div className="space-y-4" style={{ '--void2': '#07070f', '--void3': '#0d0d1a' } as React.CSSProperties}>
        <GoldLine />

        <div style={{
          background: 'var(--void2)',
          border: '1px solid rgba(201,168,76,0.1)',
          borderRadius: '14px',
          padding: '14px 20px',
        }}>
          <span style={{
            fontFamily: 'var(--ff-display)',
            fontSize: '16px', fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.06em',
            background: 'linear-gradient(135deg, #e8c96d 0%, #c9a84c 100%)',
            WebkitBackgroundClip: 'text', WebkitTextFillColor: 'transparent', backgroundClip: 'text',
            display: 'block',
          }}>
            Máscaras
          </span>
          <p style={{ fontSize: '12px', color: 'var(--text-muted)', marginTop: '4px' }}>
            Textos prontos para abertura de chamados no AIR
          </p>
        </div>

        <MascarasClient mascaras={mascaras} />
      </div>
    </PainelShell>
  )
}
