import { getProfile } from '@/lib/auth'
import { redirect } from 'next/navigation'
import { listarLinksAtivos, type LinkUtil } from '@/lib/links'
import PainelShell from '@/components/PainelShell'
import LinksClient from './LinksClient'

export const dynamic = 'force-dynamic'

export default async function LinksPage() {
  const profile = await getProfile()
  if (!profile) redirect('/login')

  const links = await listarLinksAtivos().catch(() => [] as LinkUtil[])

  return (
    <PainelShell profile={profile} title="Links" iconName="Link2">
      <div className="max-w-4xl space-y-6">
        <div style={{
          background: 'rgba(201,168,76,0.04)',
          border: '1px solid rgba(201,168,76,0.10)',
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
            Links
          </span>
          <p style={{ fontSize: '12px', color: 'var(--text-muted)', marginTop: '4px' }}>
            Acesso rápido às ferramentas e sistemas utilizados no dia a dia
          </p>
        </div>

        <LinksClient links={links} />
      </div>
    </PainelShell>
  )
}
