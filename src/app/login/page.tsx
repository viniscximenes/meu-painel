import LoginForm from '@/components/LoginForm'
import { BarChart2 } from 'lucide-react'

interface Props {
  searchParams: Promise<{ erro?: string }>
}

export default async function LoginPage({ searchParams }: Props) {
  const { erro } = await searchParams

  return (
    <main
      className="login-grid-bg min-h-screen flex items-center justify-center p-8"
      style={{ position: 'relative', isolation: 'isolate' }}
    >

      {/* ── Indicador de ambiente — discreto, canto superior esquerdo ── */}
      <div
        className="login-stagger-1"
        style={{
          position: 'fixed',
          top: '1.25rem',
          left: '1.5rem',
          display: 'inline-flex',
          alignItems: 'center',
          gap: '0.5rem',
          padding: '0.25rem 0.625rem',
          borderRadius: '9999px',
          background: 'rgba(34,197,94,0.04)',
          border: '1px solid rgba(34,197,94,0.12)',
          zIndex: 50,
          opacity: 0.6,
        }}
      >
        <span
          className="status-dot-pulse"
          style={{
            display: 'inline-block',
            width: '5px',
            height: '5px',
            borderRadius: '50%',
            background: '#22c55e',
            boxShadow: '0 0 5px rgba(34,197,94,0.9)',
            flexShrink: 0,
          }}
        />
        <span
          style={{
            fontSize: '10px',
            fontWeight: 500,
            letterSpacing: '0.06em',
            textTransform: 'uppercase',
            color: 'rgba(255,255,255,0.5)',
            whiteSpace: 'nowrap',
          }}
        >
          Produção · v2.4.1
        </span>
      </div>

      {/* ── Glow orbs decorativos — nunca bloqueiam interação ── */}
      <div
        aria-hidden="true"
        style={{
          position: 'absolute', inset: 0,
          pointerEvents: 'none',
          zIndex: 0,
          overflow: 'hidden',
        }}
      >
        <div style={{ position: 'absolute', top: '-15%', right: '-10%', width: '700px', height: '700px', background: 'radial-gradient(circle, rgba(59,130,246,0.07) 0%, transparent 70%)', borderRadius: '50%', animation: 'meshFloat 10s ease-in-out infinite' }} />
        <div style={{ position: 'absolute', bottom: '-20%', left: '-10%', width: '800px', height: '800px', background: 'radial-gradient(circle, rgba(201,168,76,0.06) 0%, transparent 70%)', borderRadius: '50%', animation: 'meshFloat 12s ease-in-out infinite reverse' }} />
        <div style={{ position: 'absolute', top: '40%', left: '50%', transform: 'translate(-50%,-50%)', width: '500px', height: '500px', background: 'radial-gradient(circle, rgba(16,185,129,0.04) 0%, transparent 70%)', borderRadius: '50%', animation: 'meshFloat 8s ease-in-out infinite 2s' }} />
      </div>

      {/* ── Coluna central ── */}
      <div
        className="relative"
        style={{ width: '100%', maxWidth: '440px', zIndex: 1 }}
      >

        {/* ── Logo + título ── */}
        <div className="text-center mb-8 login-stagger-2">
          <div className="logo-shimmer logo-breath inline-flex items-center justify-center w-16 h-16 rounded-2xl mb-5">
            <BarChart2 size={28} color="#050508" />
          </div>
          <h1
            style={{
              fontFamily: 'var(--ff-display)',
              fontSize: '1.875rem',
              fontWeight: 800,
              letterSpacing: '0.3em',
              textTransform: 'uppercase',
              background: 'linear-gradient(135deg, #f4d47c 0%, #d4a935 55%, #e8c96d 100%)',
              WebkitBackgroundClip: 'text',
              WebkitTextFillColor: 'transparent',
              backgroundClip: 'text',
              lineHeight: 1.1,
            }}
          >
            HALO
          </h1>
          <p
            style={{
              fontSize: '0.575rem',
              marginTop: '0.5rem',
              letterSpacing: '0.26em',
              textTransform: 'uppercase',
              fontWeight: 700,
              color: 'var(--text-muted)',
            }}
          >
            Sistema de Gestão Angelicais
          </p>
        </div>

        {/* ── Card com halo dourado animado ── */}
        <div className="login-halo-wrapper login-stagger-3">
          <div
            className="glass-premium rounded-3xl p-8"
            style={{ position: 'relative', zIndex: 1 }}
          >

            {/* Heading do card */}
            <div className="mb-6 login-stagger-4">
              <h2
                style={{
                  fontFamily: 'var(--ff-display)',
                  fontSize: '1.25rem',
                  fontWeight: 700,
                  background: 'linear-gradient(135deg, var(--text-primary) 0%, var(--gold-light) 100%)',
                  WebkitBackgroundClip: 'text',
                  WebkitTextFillColor: 'transparent',
                  backgroundClip: 'text',
                  letterSpacing: '-0.02em',
                }}
              >
                Entrar
              </h2>
              <p style={{ fontSize: '0.875rem', marginTop: '0.25rem', color: 'var(--text-muted)' }}>
                Acesse sua conta para continuar
              </p>
            </div>

            {/* Alerta de perfil não encontrado */}
            {erro === 'perfil' && (
              <div
                className="mb-5 flex items-start gap-2.5 rounded-xl px-4 py-3 text-sm"
                style={{
                  background: 'rgba(245,158,11,0.08)',
                  border: '1px solid rgba(245,158,11,0.25)',
                  color: '#fbbf24',
                }}
              >
                <svg className="w-4 h-4 mt-0.5 shrink-0" fill="currentColor" viewBox="0 0 20 20" aria-hidden="true">
                  <path fillRule="evenodd" d="M8.257 3.099c.765-1.36 2.722-1.36 3.486 0l5.58 9.92c.75 1.334-.213 2.98-1.742 2.98H4.42c-1.53 0-2.493-1.646-1.743-2.98l5.58-9.92zM11 13a1 1 0 11-2 0 1 1 0 012 0zm-1-8a1 1 0 00-1 1v3a1 1 0 002 0V6a1 1 0 00-1-1z" clipRule="evenodd" />
                </svg>
                <span>Perfil não encontrado. Verifique se o schema e o seed foram executados no Supabase.</span>
              </div>
            )}

            {/* Formulário */}
            <LoginForm />

            {/* Divisor */}
            <div className="divider my-5" />

            {/* ── Bloco de contato com administrador ── */}
            <div
              className="login-stagger-8 flex flex-col items-center text-center rounded-xl px-4 py-3 gap-1"
              style={{
                background: 'rgba(201,168,76,0.035)',
                border: '1px solid rgba(201,168,76,0.10)',
              }}
            >
              <p style={{ fontSize: '0.8125rem', color: 'var(--text-muted)', lineHeight: 1.65 }}>
                Esqueceu a senha? Mande mensagem para o administrador,{' '}
                <a
                  href="https://teams.cloud.microsoft/l/chat/0/0?users=caio.vsilva@alloha.com&message=Ol%C3%A1%20Caio%2C%20preciso%20de%20ajuda%20com%20meu%20acesso%20ao%20HALO"
                  target="_blank"
                  rel="noopener noreferrer"
                  className="teams-link"
                >
                  <svg
                    width="12" height="12"
                    viewBox="0 0 24 24" fill="none"
                    stroke="currentColor" strokeWidth="2"
                    strokeLinecap="round" strokeLinejoin="round"
                    style={{ display: 'inline', verticalAlign: 'middle', marginBottom: '1px' }}
                    aria-hidden="true"
                  >
                    <path d="M21 15a2 2 0 0 1-2 2H7l-4 4V5a2 2 0 0 1 2-2h14a2 2 0 0 1 2 2z" />
                  </svg>
                  {' '}clique aqui
                </a>
              </p>
              <span
                style={{
                  fontSize: '11px',
                  color: 'rgba(212,175,55,0.55)',
                  fontWeight: 400,
                  letterSpacing: 'normal',
                }}
              >
                Abre no Teams Web
              </span>
            </div>

          </div>
        </div>

        {/* ── Footer ── */}
        <p
          className="login-stagger-9 text-center mt-3"
          style={{
            fontSize: '0.7rem',
            color: 'var(--text-muted)',
            letterSpacing: '0.04em',
            opacity: 0.75,
          }}
        >
          © 2026 HALO · Desenvolvido por Caio Ximenes
        </p>

      </div>
    </main>
  )
}
