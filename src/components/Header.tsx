'use client'

import { logout } from '@/app/login/actions'
import { Profile } from '@/types'
import { Menu, LogOut, BarChart2, UserCircle, Users, Banknote } from 'lucide-react'
import { getAvatarStyle, getIniciaisNome } from '@/lib/operadores'

// eslint-disable-next-line @typescript-eslint/no-explicit-any
const ICON_MAP: Record<string, React.ElementType> = {
  UserCircle,
  Users,
  BarChart2,
  Banknote,
}

interface HeaderProps {
  profile: Profile
  title: string
  onMenuClick: () => void
  iconName?: string
}

export default function Header({ profile, title, onMenuClick, iconName }: HeaderProps) {
  const Icon = (iconName && ICON_MAP[iconName]) ? ICON_MAP[iconName] : BarChart2
  return (
    <header
      className="header-border-shimmer h-14 flex items-center px-4 lg:px-6 gap-4 sticky top-0 z-10"
      style={{
        background: 'rgba(12, 16, 24, 0.85)',
        backdropFilter: 'blur(20px) saturate(180%)',
        WebkitBackdropFilter: 'blur(20px) saturate(180%)',
        boxShadow: '0 4px 32px rgba(0,0,0,0.4), 0 1px 0 rgba(201,168,76,0.06)',
      }}
    >
      {/* Menu mobile */}
      <button
        onClick={onMenuClick}
        className="lg:hidden p-2 rounded-xl transition-all"
        style={{ color: 'var(--text-muted)' }}
        aria-label="Abrir menu"
        onMouseEnter={(e) => {
          const el = e.currentTarget as HTMLElement
          el.style.color = 'var(--gold-light)'
          el.style.background = 'rgba(201,168,76,0.08)'
        }}
        onMouseLeave={(e) => {
          const el = e.currentTarget as HTMLElement
          el.style.color = 'var(--text-muted)'
          el.style.background = 'transparent'
        }}
      >
        <Menu size={18} />
      </button>

      {/* Logo + Título */}
      <div className="flex items-center gap-3">
        <div
          className="logo-shimmer w-7 h-7 rounded-lg flex items-center justify-center shrink-0"
          style={{ boxShadow: '0 4px 16px rgba(201,168,76,0.30)' }}
        >
          <Icon size={14} className="text-[#050508]" />
        </div>
        <h1
          className="font-semibold tracking-tight"
          style={{
            fontFamily: 'var(--ff-display)',
            fontSize: '15px',
            fontWeight: 600,
            color: 'var(--text-primary)',
          }}
        >
          {title}
        </h1>
      </div>

      <div className="flex-1" />

      {/* Perfil + sair */}
      <div className="flex items-center gap-3">
        <div
          className="hidden sm:flex items-center gap-3 pl-3"
          style={{ borderLeft: '1px solid rgba(201,168,76,0.10)' }}
        >
          <div className="text-right">
            <p
              className="text-xs font-semibold leading-none"
              style={{
                background: 'linear-gradient(135deg, var(--gold-light) 0%, var(--gold-bright) 100%)',
                WebkitBackgroundClip: 'text',
                WebkitTextFillColor: 'transparent',
                backgroundClip: 'text',
              }}
            >
              {profile.nome.split(' ')[0]}
            </p>
            <p className="text-[10px] mt-0.5" style={{ color: 'var(--text-muted)' }}>
              {profile.username}
            </p>
          </div>

          {/* Avatar com ring dourado pulsante */}
          <div
            className="w-8 h-8 rounded-lg flex items-center justify-center text-xs font-bold shrink-0 border-2 avatar-ring-gold"
            style={getAvatarStyle(profile.operador_id ?? 14)}
          >
            {getIniciaisNome(profile.nome)}
          </div>

          <span className={`badge ${profile.role === 'gestor' ? 'badge-gestor' : 'badge-operador'}`}>
            {profile.role === 'gestor' ? 'Gestor' : 'Op.'}
          </span>
        </div>

        <form action={logout}>
          <button
            type="submit"
            className="flex items-center gap-1.5 px-2.5 py-2 rounded-xl text-xs font-medium transition-all"
            style={{ color: 'var(--text-muted)' }}
            aria-label="Sair da conta"
            onMouseEnter={(e) => {
              const el = e.currentTarget as HTMLElement
              el.style.color = '#f87171'
              el.style.background = 'rgba(239,68,68,0.08)'
            }}
            onMouseLeave={(e) => {
              const el = e.currentTarget as HTMLElement
              el.style.color = 'var(--text-muted)'
              el.style.background = 'transparent'
            }}
          >
            <LogOut size={14} />
            <span className="hidden sm:inline">Sair</span>
          </button>
        </form>
      </div>
    </header>
  )
}
