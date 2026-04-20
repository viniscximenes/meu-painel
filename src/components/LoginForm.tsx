'use client'

import { useState } from 'react'
import { createClient } from '@/lib/supabase/client'
import { Eye, EyeOff, LogIn, User, Lock } from 'lucide-react'
import { HaloSpinner } from '@/components/HaloSpinner'

const TEAMS_URL =
  'https://teams.cloud.microsoft/l/chat/0/0?users=caio.vsilva@alloha.com&message=Ol%C3%A1%20Caio%2C%20preciso%20de%20ajuda%20com%20meu%20acesso%20ao%20HALO'

export default function LoginForm() {
  const [showPassword, setShowPassword] = useState(false)
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [rememberMe, setRememberMe] = useState(false)

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

      {/* ── Campo Usuário ── */}
      <div className="login-stagger-5">
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

      {/* ── Campo Senha ── */}
      <div className="login-stagger-6">
        <div className="flex items-center justify-between mb-2">
          <label
            htmlFor="password"
            className="block text-xs font-semibold uppercase"
            style={{ color: 'var(--text-muted)', letterSpacing: '0.08em' }}
          >
            Senha
          </label>
          <a
            href={TEAMS_URL}
            target="_blank"
            rel="noopener noreferrer"
            className="forgot-link"
          >
            Esqueci minha senha
          </a>
        </div>
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
            className="btn-eye-toggle absolute right-3 top-1/2 -translate-y-1/2 transition-colors p-1 rounded"
            style={{ color: 'var(--text-muted)' }}
            aria-label={showPassword ? 'Ocultar senha' : 'Mostrar senha'}
            onMouseEnter={(e) => { (e.currentTarget as HTMLElement).style.color = 'var(--gold-light)' }}
            onMouseLeave={(e) => { (e.currentTarget as HTMLElement).style.color = 'var(--text-muted)' }}
          >
            {showPassword ? <EyeOff size={17} /> : <Eye size={17} />}
          </button>
        </div>
      </div>

      {/* ── Mensagem de erro ── */}
      {error && (
        <div
          className="flex items-start gap-2.5 rounded-xl px-4 py-3 text-sm animate-shake"
          style={{
            background: 'rgba(239,68,68,0.08)',
            border: '1px solid rgba(239,68,68,0.25)',
            color: '#f87171',
          }}
          role="alert"
          aria-live="assertive"
        >
          <svg className="w-4 h-4 mt-0.5 shrink-0" fill="currentColor" viewBox="0 0 20 20" aria-hidden="true">
            <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zM8.707 7.293a1 1 0 00-1.414 1.414L8.586 10l-1.293 1.293a1 1 0 101.414 1.414L10 11.414l1.293 1.293a1 1 0 001.414-1.414L11.414 10l1.293-1.293a1 1 0 00-1.414-1.414L10 8.586 8.707 7.293z" clipRule="evenodd" />
          </svg>
          {error}
        </div>
      )}

      {/* ── Checkbox + Botão submit ── */}
      <div className="login-stagger-7 space-y-4 pt-1">

        {/* Checkbox manter conectado */}
        <label className="login-checkbox">
          <input
            type="checkbox"
            checked={rememberMe}
            onChange={(e) => setRememberMe(e.target.checked)}
          />
          <span className="login-checkbox-label">Manter conectado por 7 dias</span>
        </label>

        {/* Botão principal */}
        <button
          type="submit"
          disabled={loading}
          className="btn-login"
        >
          {loading ? (
            <>
              <HaloSpinner size="sm" />
              Entrando...
            </>
          ) : (
            <>
              <LogIn size={16} />
              Acessar
            </>
          )}
        </button>

      </div>
    </form>
  )
}
