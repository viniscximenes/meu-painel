'use client'

import { useState } from 'react'
import { createClient } from '@/lib/supabase/client'
import { Eye, EyeOff, LogIn, User, Lock } from 'lucide-react'

export default function LoginForm() {
  const [showPassword, setShowPassword] = useState(false)
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)

  async function handleSubmit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault()
    setLoading(true)
    setError(null)

    const form = e.currentTarget
    const username = (form.username.value as string).trim().toLowerCase()
    const password = form.password.value as string
    const email = `${username}@painel.app`

    const supabase = createClient()
    const { error: authError } = await supabase.auth.signInWithPassword({ email, password })

    if (authError) {
      setError('Usuário ou senha inválidos. Verifique suas credenciais.')
      setLoading(false)
      return
    }

    window.location.href = '/painel'
  }

  return (
    <form onSubmit={handleSubmit} className="space-y-5">
      {/* Usuário */}
      <div>
        <label
          htmlFor="username"
          className="block text-xs font-semibold mb-2 uppercase"
          style={{ color: 'var(--text-muted)', letterSpacing: '0.08em' }}
        >
          Usuário
        </label>
        <div className="relative">
          <User
            size={15}
            className="absolute left-3.5 top-1/2 -translate-y-1/2 pointer-events-none"
            style={{ color: 'var(--text-muted)' }}
          />
          <input
            id="username"
            name="username"
            type="text"
            autoComplete="username"
            autoCapitalize="none"
            autoCorrect="off"
            spellCheck={false}
            required
            placeholder="seu.usuario"
            className="input pl-10"
            disabled={loading}
          />
        </div>
      </div>

      {/* Senha */}
      <div>
        <label
          htmlFor="password"
          className="block text-xs font-semibold mb-2 uppercase"
          style={{ color: 'var(--text-muted)', letterSpacing: '0.08em' }}
        >
          Senha
        </label>
        <div className="relative">
          <Lock
            size={15}
            className="absolute left-3.5 top-1/2 -translate-y-1/2 pointer-events-none"
            style={{ color: 'var(--text-muted)' }}
          />
          <input
            id="password"
            name="password"
            type={showPassword ? 'text' : 'password'}
            autoComplete="current-password"
            required
            placeholder="••••••••"
            className="input pl-10 pr-12"
            disabled={loading}
          />
          <button
            type="button"
            onClick={() => setShowPassword(!showPassword)}
            className="absolute right-3 top-1/2 -translate-y-1/2 transition-colors p-1 rounded"
            style={{ color: 'var(--text-muted)' }}
            aria-label={showPassword ? 'Ocultar senha' : 'Mostrar senha'}
            onMouseEnter={(e) => { (e.currentTarget as HTMLElement).style.color = 'var(--gold-light)' }}
            onMouseLeave={(e) => { (e.currentTarget as HTMLElement).style.color = 'var(--text-muted)' }}
          >
            {showPassword ? <EyeOff size={17} /> : <Eye size={17} />}
          </button>
        </div>
      </div>

      {/* Erro */}
      {error && (
        <div
          className="flex items-start gap-2.5 rounded-xl px-4 py-3 text-sm animate-shake"
          style={{
            background: 'rgba(239,68,68,0.08)',
            border: '1px solid rgba(239,68,68,0.25)',
            color: '#f87171',
          }}
          role="alert"
        >
          <svg className="w-4 h-4 mt-0.5 shrink-0" fill="currentColor" viewBox="0 0 20 20" aria-hidden="true">
            <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zM8.707 7.293a1 1 0 00-1.414 1.414L8.586 10l-1.293 1.293a1 1 0 101.414 1.414L10 11.414l1.293 1.293a1 1 0 001.414-1.414L11.414 10l1.293-1.293a1 1 0 00-1.414-1.414L10 8.586 8.707 7.293z" clipRule="evenodd" />
          </svg>
          {error}
        </div>
      )}

      {/* Botão */}
      <button
        type="submit"
        disabled={loading}
        className="btn-primary w-full mt-2"
        style={{ padding: '0.75rem 1.5rem', fontSize: '0.9rem' }}
      >
        {loading ? (
          <>
            <span className="spinner-premium" style={{ width: '18px', height: '18px' }} />
            Entrando...
          </>
        ) : (
          <>
            <LogIn size={17} />
            Entrar
          </>
        )}
      </button>
    </form>
  )
}
