import LoginForm from '@/components/LoginForm'
import { BarChart2 } from 'lucide-react'

interface Props {
  searchParams: Promise<{ erro?: string }>
}

export default async function LoginPage({ searchParams }: Props) {
  const { erro } = await searchParams

  return (
    <main
      className="login-grid-bg min-h-screen flex items-center justify-center p-4"
      style={{ position: 'relative', isolation: 'isolate' }}
    >

      {/* Glow orbs — decorativos, nunca bloqueiam interação */}
      <div
        aria-hidden="true"
        style={{
          position: 'absolute', inset: 0,
          pointerEvents: 'none',
          zIndex: 0,
          overflow: 'hidden',
        }}
      >
        <div
          style={{
            position: 'absolute',
            top: '-15%', right: '-10%',
            width: '600px', height: '600px',
            background: 'radial-gradient(circle, rgba(59,130,246,0.07) 0%, transparent 70%)',
            borderRadius: '50%',
            animation: 'meshFloat 10s ease-in-out infinite',
          }}
        />
        <div
          style={{
            position: 'absolute',
            bottom: '-20%', left: '-10%',
            width: '700px', height: '700px',
            background: 'radial-gradient(circle, rgba(201,168,76,0.05) 0%, transparent 70%)',
            borderRadius: '50%',
            animation: 'meshFloat 12s ease-in-out infinite reverse',
          }}
        />
        <div
          style={{
            position: 'absolute',
            top: '40%', left: '50%', transform: 'translate(-50%,-50%)',
            width: '400px', height: '400px',
            background: 'radial-gradient(circle, rgba(16,185,129,0.04) 0%, transparent 70%)',
            borderRadius: '50%',
            animation: 'meshFloat 8s ease-in-out infinite 2s',
          }}
        />
      </div>

      {/* Conteúdo — sempre acima dos orbs */}
      <div
        className="relative w-full max-w-md animate-fadeInUp"
        style={{ zIndex: 1 }}
      >

        {/* Logo + título */}
        <div className="text-center mb-8">
          <div
            className="logo-shimmer inline-flex items-center justify-center w-16 h-16 rounded-2xl mb-5"
            style={{
              boxShadow: '0 8px 32px rgba(201,168,76,0.35), 0 0 60px rgba(201,168,76,0.10)',
            }}
          >
            <BarChart2 size={28} className="text-[#050508]" />
          </div>
          <h1
            className="text-3xl font-extrabold tracking-tight"
            style={{
              background: 'linear-gradient(135deg, var(--text-primary) 0%, var(--text-secondary) 100%)',
              WebkitBackgroundClip: 'text',
              WebkitTextFillColor: 'transparent',
              backgroundClip: 'text',
              letterSpacing: '-0.03em',
            }}
          >
            Meu Painel
          </h1>
          <p
            className="text-[11px] mt-2 tracking-widest uppercase font-semibold"
            style={{ color: 'var(--text-muted)', letterSpacing: '0.18em' }}
          >
            Sistema de Gestão Operacional
          </p>
        </div>

        {/* Card glassmorphism */}
        <div
          className="glass-premium rounded-3xl p-8"
          style={{ position: 'relative', zIndex: 2 }}
        >
          <div className="mb-6">
            <h2
              className="text-xl font-bold"
              style={{
                background: 'linear-gradient(135deg, var(--text-primary) 0%, var(--gold-light) 100%)',
                WebkitBackgroundClip: 'text',
                WebkitTextFillColor: 'transparent',
                backgroundClip: 'text',
                letterSpacing: '-0.02em',
              }}
            >
              Entrar
            </h2>
            <p className="text-sm mt-1" style={{ color: 'var(--text-muted)' }}>
              Acesse sua conta para continuar
            </p>
          </div>

          {erro === 'perfil' && (
            <div
              className="mb-5 flex items-start gap-2.5 rounded-xl px-4 py-3 text-sm"
              style={{
                background: 'rgba(245,158,11,0.08)',
                border: '1px solid rgba(245,158,11,0.25)',
                color: '#fbbf24',
              }}
            >
              <svg className="w-4 h-4 mt-0.5 shrink-0" fill="currentColor" viewBox="0 0 20 20">
                <path fillRule="evenodd" d="M8.257 3.099c.765-1.36 2.722-1.36 3.486 0l5.58 9.92c.75 1.334-.213 2.98-1.742 2.98H4.42c-1.53 0-2.493-1.646-1.743-2.98l5.58-9.92zM11 13a1 1 0 11-2 0 1 1 0 012 0zm-1-8a1 1 0 00-1 1v3a1 1 0 002 0V6a1 1 0 00-1-1z" clipRule="evenodd" />
              </svg>
              <span>Perfil não encontrado. Verifique se o schema e o seed foram executados no Supabase.</span>
            </div>
          )}

          <LoginForm />
        </div>

        <p className="text-center text-xs mt-6" style={{ color: 'var(--text-muted)' }}>
          Problemas de acesso? Contate o administrador.
        </p>
      </div>
    </main>
  )
}
