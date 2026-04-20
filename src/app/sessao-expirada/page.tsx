import Link from 'next/link'
import { BarChart2 } from 'lucide-react'

export const metadata = {
  title: 'Sessão expirada — HALO',
}

export default function SessaoExpiradaPage() {
  return (
    <main
      className="login-grid-bg min-h-screen flex items-center justify-center p-8"
      style={{ position: 'relative', isolation: 'isolate' }}
    >

      {/* ── Glow orbs decorativos ── */}
      <div
        aria-hidden="true"
        style={{
          position: 'absolute', inset: 0,
          pointerEvents: 'none',
          zIndex: 0,
          overflow: 'hidden',
        }}
      >
        <div style={{ position: 'absolute', top: '-15%', right: '-10%', width: '700px', height: '700px', background: 'radial-gradient(circle, rgba(234,179,8,0.06) 0%, transparent 70%)', borderRadius: '50%', animation: 'meshFloat 10s ease-in-out infinite' }} />
        <div style={{ position: 'absolute', bottom: '-20%', left: '-10%', width: '800px', height: '800px', background: 'radial-gradient(circle, rgba(201,168,76,0.05) 0%, transparent 70%)', borderRadius: '50%', animation: 'meshFloat 12s ease-in-out infinite reverse' }} />
      </div>

      {/* ── Coluna central ── */}
      <div
        className="relative"
        style={{ width: '100%', maxWidth: '440px', zIndex: 1 }}
      >

        {/* ── Logo + título ── */}
        <div className="text-center mb-8 login-stagger-1">
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

        {/* ── Card com halo animado ── */}
        <div className="login-halo-wrapper login-stagger-2">
          <div
            className="glass-premium rounded-3xl p-8 text-center"
            style={{ position: 'relative', zIndex: 1 }}
          >

            {/* Ícone de relógio */}
            <div className="login-stagger-3 flex justify-center mb-5">
              <div
                style={{
                  display: 'inline-flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  width: '56px',
                  height: '56px',
                  borderRadius: '16px',
                  background: 'rgba(234,179,8,0.08)',
                  border: '1px solid rgba(234,179,8,0.20)',
                }}
              >
                <svg
                  width="26" height="26"
                  viewBox="0 0 24 24" fill="none"
                  stroke="url(#clockGrad)" strokeWidth="1.75"
                  strokeLinecap="round" strokeLinejoin="round"
                  aria-hidden="true"
                >
                  <defs>
                    <linearGradient id="clockGrad" x1="0" y1="0" x2="1" y2="1">
                      <stop offset="0%" stopColor="#f4d47c" />
                      <stop offset="100%" stopColor="#d4a935" />
                    </linearGradient>
                  </defs>
                  <circle cx="12" cy="12" r="10" />
                  <polyline points="12 6 12 12 16 14" />
                </svg>
              </div>
            </div>

            {/* Título e mensagem */}
            <div className="login-stagger-4 mb-6">
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
                  marginBottom: '0.625rem',
                }}
              >
                Sessão expirada
              </h2>
              <p
                style={{
                  fontSize: '0.875rem',
                  color: 'var(--text-muted)',
                  lineHeight: 1.65,
                  maxWidth: '320px',
                  margin: '0 auto',
                }}
              >
                Por segurança, sua sessão foi encerrada após período de inatividade. Faça login novamente para continuar.
              </p>
            </div>

            {/* Botão */}
            <div className="login-stagger-5">
              <Link
                href="/login"
                className="btn-login btn-halo-action"
                style={{ textDecoration: 'none' }}
              >
                <svg
                  width="15" height="15"
                  viewBox="0 0 24 24" fill="none"
                  stroke="currentColor" strokeWidth="2.5"
                  strokeLinecap="round" strokeLinejoin="round"
                  aria-hidden="true"
                >
                  <path d="M15 3h4a2 2 0 0 1 2 2v14a2 2 0 0 1-2 2h-4" />
                  <polyline points="10 17 15 12 10 7" />
                  <line x1="15" y1="12" x2="3" y2="12" />
                </svg>
                Voltar ao Login
              </Link>
            </div>

          </div>
        </div>

        {/* ── Footer ── */}
        <p
          className="login-stagger-6 text-center mt-3"
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
