'use client'

import { logout } from '@/app/login/actions'
import { setCursorStyle } from '@/components/CursorProvider'
import { Profile } from '@/types'
import {
  Menu, LogOut, BarChart2, BarChart3, UserCircle, Users, Banknote,
  CircleDollarSign, TrendingUp, CalendarDays, Ticket,
  Calculator, Link2, ClipboardCopy, Gauge, Target, Wallet, History, LineChart,
} from 'lucide-react'
import { getIniciaisNome } from '@/lib/operadores'

// eslint-disable-next-line @typescript-eslint/no-explicit-any
const ICON_MAP: Record<string, React.ElementType> = {
  UserCircle,
  Users,
  BarChart2,
  BarChart3,
  Banknote,
  CircleDollarSign,
  TrendingUp,
  CalendarDays,
  Ticket,
  Calculator,
  Link2,
  ClipboardCopy,
  Gauge,
  Target,
  Wallet,
  History,
  LineChart,
}

interface HeaderProps {
  profile: Profile
  title: string
  onMenuClick: () => void
  iconName?: string
}

const AVATAR_STYLE_HALO: React.CSSProperties = {
  fontFamily: 'var(--ff-syne)',
  background: '#070714',
  border: '1.5px solid #f4d47c',
  color: '#f4d47c',
  fontSize: '11px',
  fontWeight: 600,
  letterSpacing: '0.05em',
}

export default function Header({ profile, title, onMenuClick, iconName }: HeaderProps) {
  const Icon = (iconName && ICON_MAP[iconName]) ? ICON_MAP[iconName] : BarChart2
  return (
    <header
      className="header-border-shimmer h-14 flex items-center px-4 lg:px-6 gap-4 sticky top-0 z-10"
      style={{
        background: 'linear-gradient(180deg, #0a0e1f 0%, #06091a 100%)',
        borderBottom: '1px solid rgba(244,212,124,0.08)',
        boxShadow: '0 4px 32px rgba(0,0,0,0.4)',
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
          <Icon size={14} strokeWidth={1.5} className="text-[#050508]" />
        </div>
        <h1
          style={{
            fontFamily: 'var(--ff-syne)',
            fontSize: '16px',
            fontWeight: 600,
            color: '#e8edf8',
            textTransform: 'uppercase',
            letterSpacing: '0.5px',
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
            <p style={{ fontFamily: 'var(--ff-syne)', fontSize: '12px', fontWeight: 600, color: 'rgba(255,255,255,0.95)', lineHeight: 1 }}>
              {profile.nome.split(' ')[0]}
            </p>
            <p style={{ fontFamily: 'var(--ff-syne)', fontSize: '11px', fontWeight: 400, color: '#72708f', marginTop: '3px' }}>
              {profile.username}
            </p>
          </div>

          {/* Avatar HALO: fundo preto + borda dourada */}
          <div
            className="w-8 h-8 rounded-full flex items-center justify-center shrink-0"
            style={AVATAR_STYLE_HALO}
          >
            {getIniciaisNome(profile.nome)}
          </div>

          <span className={`badge ${{ admin: 'badge-admin', gestor: 'badge-gestor', aux: 'badge-aux', operador: 'badge-operador' }[(profile.role ?? '').toLowerCase()] ?? 'badge-operador'}`}>
            {{ admin: 'Admin', gestor: 'Gestor', aux: 'Auxiliar', operador: 'Operador' }[(profile.role ?? '').toLowerCase()] ?? 'Operador'}
          </span>
        </div>

        <form action={logout}>
          <button
            type="submit"
            className="flex items-center gap-1.5 px-2.5 py-2 rounded-xl text-xs font-medium transition-all"
            style={{ color: 'var(--text-muted)' }}
            aria-label="Sair da conta"
            onClick={() => setCursorStyle(null)}
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
