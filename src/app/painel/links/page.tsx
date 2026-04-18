import { getProfile } from '@/lib/auth'
import { redirect } from 'next/navigation'
import { listarLinksAtivos, CATEGORIAS_LINKS, type LinkUtil } from '@/lib/links'
import PainelShell from '@/components/PainelShell'
import { ExternalLink } from 'lucide-react'

export const dynamic = 'force-dynamic'

export default async function LinksPage() {
  const profile = await getProfile()
  if (!profile) redirect('/login')

  const links = await listarLinksAtivos().catch(() => [] as LinkUtil[])

  const porCategoria = CATEGORIAS_LINKS.map(cat => ({
    categoria: cat,
    items: links.filter(l => l.categoria === cat),
  }))

  return (
    <PainelShell profile={profile} title="Links Úteis" iconName="Link2">
      <div className="max-w-4xl space-y-8">
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
            Links Úteis
          </span>
          <p style={{ fontSize: '12px', color: 'var(--text-muted)', marginTop: '4px' }}>
            Acesso rápido às ferramentas e sistemas utilizados no dia a dia
          </p>
        </div>

        {links.length === 0 ? (
          <div style={{
            textAlign: 'center', padding: '48px 0',
            color: 'var(--text-muted)', fontSize: '14px',
          }}>
            Nenhum link cadastrado ainda.
          </div>
        ) : (
          porCategoria.map(({ categoria, items }) =>
            items.length === 0 ? null : (
              <section key={categoria}>
                <p style={{
                  fontSize: '9px', fontWeight: 700, textTransform: 'uppercase',
                  letterSpacing: '0.14em', color: 'var(--text-muted)', marginBottom: '12px',
                }}>
                  {categoria}
                </p>
                <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(220px, 1fr))', gap: '10px' }}>
                  {items.map(link => (
                    <a
                      key={link.id}
                      href={link.url}
                      target="_blank"
                      rel="noopener noreferrer"
                      style={{
                        display: 'flex', flexDirection: 'column', gap: '6px',
                        padding: '14px 16px', borderRadius: '12px',
                        background: '#0d0d1a',
                        border: '1px solid rgba(201,168,76,0.08)',
                        textDecoration: 'none',
                        transition: 'border-color 0.2s, background 0.2s',
                      }}
                      onMouseEnter={e => {
                        const el = e.currentTarget as HTMLAnchorElement
                        el.style.borderColor = 'rgba(201,168,76,0.25)'
                        el.style.background = 'rgba(201,168,76,0.04)'
                      }}
                      onMouseLeave={e => {
                        const el = e.currentTarget as HTMLAnchorElement
                        el.style.borderColor = 'rgba(201,168,76,0.08)'
                        el.style.background = '#0d0d1a'
                      }}
                    >
                      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
                        <span style={{
                          fontSize: '13px', fontWeight: 600,
                          color: 'var(--text-primary)',
                        }}>
                          {link.nome}
                        </span>
                        <ExternalLink size={12} style={{ color: 'var(--text-muted)', flexShrink: 0 }} />
                      </div>
                      {link.descricao && (
                        <span style={{ fontSize: '11px', color: 'var(--text-muted)', lineHeight: 1.4 }}>
                          {link.descricao}
                        </span>
                      )}
                    </a>
                  ))}
                </div>
              </section>
            )
          )
        )}
      </div>
    </PainelShell>
  )
}
