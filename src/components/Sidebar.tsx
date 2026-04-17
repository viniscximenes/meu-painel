'use client'

import Link from 'next/link'
import { usePathname } from 'next/navigation'
import { useState } from 'react'
import { Profile } from '@/types'
import { OPERADORES_DISPLAY, getAvatarStyle, getIniciaisNome } from '@/lib/operadores'
import {
  LayoutDashboard, Users, ChevronRight, ChevronDown, BarChart2,
  Target, TableProperties, Database, Trophy, SlidersHorizontal, BookOpen, ClipboardList,
} from 'lucide-react'
import clsx from 'clsx'

interface SidebarProps {
  profile: Profile
  isOpen: boolean
  onClose: () => void
}

export default function Sidebar({ profile, isOpen, onClose }: SidebarProps) {
  const pathname = usePathname()
  const isGestor = profile.role === 'gestor'

  return (
    <>
      {isOpen && (
        <div
          className="fixed inset-0 bg-black/75 z-20 lg:hidden"
          style={{ backdropFilter: 'blur(4px)' }}
          onClick={onClose}
        />
      )}

      <aside
        className={clsx(
          'fixed top-0 left-0 h-full w-60 z-30 flex flex-col',
          'transition-transform duration-300 ease-in-out',
          'lg:translate-x-0 lg:static lg:z-auto',
          isOpen ? 'translate-x-0' : '-translate-x-full'
        )}
        style={{
          background: 'linear-gradient(180deg, #0a0e18 0%, #080c14 40%, #050508 100%)',
          borderRight: '1px solid rgba(201,168,76,0.08)',
          boxShadow: '4px 0 40px rgba(0,0,0,0.6), 1px 0 0 rgba(255,255,255,0.02)',
        }}
      >
        {/* Logo com shimmer */}
        <div
          className="flex items-center gap-3 px-4 py-4"
          style={{
            borderBottom: '1px solid transparent',
            borderImage: 'linear-gradient(90deg, transparent 0%, rgba(201,168,76,0.15) 50%, transparent 100%) 1',
          }}
        >
          <div
            className="logo-shimmer w-9 h-9 rounded-xl flex items-center justify-center shrink-0"
            style={{ boxShadow: '0 4px 20px rgba(201,168,76,0.35), 0 0 40px rgba(201,168,76,0.10)' }}
          >
            <BarChart2 size={18} className="text-[#050508]" />
          </div>
          <div>
            <span
              className="text-gold-gradient font-bold text-sm tracking-wide"
              style={{ fontFamily: 'var(--ff-display)', textTransform: 'uppercase', letterSpacing: '0.08em' }}
            >
              Meu Painel
            </span>
            <p
              className="text-[10px] mt-0.5 tracking-widest uppercase"
              style={{ color: 'var(--text-muted)', letterSpacing: '0.12em' }}
            >
              {isGestor ? 'Gestão' : 'Operações'}
            </p>
          </div>
        </div>

        {/* Nav */}
        <nav className="flex-1 px-2 py-3 sidebar-scroll">
          {isGestor
            ? <GestorNav pathname={pathname} onClose={onClose} />
            : <OperadorNav profile={profile} pathname={pathname} onClose={onClose} />
          }
        </nav>

        {/* Perfil */}
        <div
          className="px-2 py-3"
          style={{
            borderTop: '1px solid transparent',
            borderImage: 'linear-gradient(90deg, transparent 0%, rgba(201,168,76,0.12) 50%, transparent 100%) 1',
          }}
        >
          <div
            className="flex items-center gap-2.5 px-3 py-2.5 rounded-xl transition-all"
            style={{
              background: 'rgba(201,168,76,0.03)',
              border: '1px solid rgba(201,168,76,0.10)',
            }}
            onMouseEnter={(e) => {
              const el = e.currentTarget as HTMLElement
              el.style.background = 'rgba(201,168,76,0.06)'
              el.style.borderColor = 'rgba(201,168,76,0.18)'
            }}
            onMouseLeave={(e) => {
              const el = e.currentTarget as HTMLElement
              el.style.background = 'rgba(201,168,76,0.03)'
              el.style.borderColor = 'rgba(201,168,76,0.10)'
            }}
          >
            <div
              className="w-8 h-8 rounded-lg flex items-center justify-center text-xs font-bold shrink-0 border-2 avatar-ring-gold"
              style={getAvatarStyle(profile.operador_id ?? 14)}
            >
              {getIniciaisNome(profile.nome)}
            </div>
            <div className="flex-1 min-w-0">
              <p className="text-xs font-semibold truncate" style={{ color: 'var(--text-primary)' }}>
                {profile.nome.split(' ').slice(0, 2).join(' ')}
              </p>
              <div className="flex items-center gap-1.5 mt-0.5">
                <span
                  className="text-[9px] px-1.5 py-0.5 rounded-full font-bold uppercase"
                  style={isGestor
                    ? { background: 'rgba(201,168,76,0.12)', color: 'var(--gold-light)', letterSpacing: '0.08em' }
                    : { background: 'rgba(16,185,129,0.10)', color: '#34d399', letterSpacing: '0.08em' }
                  }
                >
                  {isGestor ? 'Gestor' : 'Operador'}
                </span>
              </div>
            </div>
          </div>
        </div>
      </aside>
    </>
  )
}

/* ── Gestor nav ──────────────────────────────────────────────────────────────── */

function GestorNav({ pathname, onClose }: { pathname: string; onClose: () => void }) {
  const [opsExpandidas,    setOpsExpandidas]    = useState(false)
  const [configExpandida,  setConfigExpandida]  = useState(false)

  return (
    <div className="space-y-0.5">
      {/* ── Geral ── */}
      <NavLabel>Dados Gerais</NavLabel>

      <Link href="/painel/gestor" onClick={onClose}
        className={pathname === '/painel/gestor' ? 'sidebar-item-active' : 'sidebar-item-inactive'}>
        <LayoutDashboard size={15} /> KPI Gestor & RV
      </Link>
      <Link href="/painel/kpis-equipe" onClick={onClose}
        className={pathname === '/painel/kpis-equipe' ? 'sidebar-item-active' : 'sidebar-item-inactive'}>
        <TableProperties size={15} /> KPIs da Equipe
      </Link>
      <Link href="/painel/rv-equipe" onClick={onClose}
        className={pathname === '/painel/rv-equipe' ? 'sidebar-item-active' : 'sidebar-item-inactive'}>
        <Trophy size={15} style={{ color: pathname === '/painel/rv-equipe' ? 'var(--gold)' : undefined }} />
        RV da Equipe
      </Link>
      {/* ── Registros ── */}
      <NavLabel>Registros</NavLabel>

      <Link href="/painel/diario" onClick={onClose}
        className={pathname.startsWith('/painel/diario') ? 'sidebar-item-active' : 'sidebar-item-inactive'}>
        <BookOpen size={15} /> Diário de Bordo
      </Link>
      <Link href="/painel/monitoria" onClick={onClose}
        className={pathname.startsWith('/painel/monitoria') ? 'sidebar-item-active' : 'sidebar-item-inactive'}>
        <ClipboardList size={15} /> Monitoria
      </Link>

      {/* ── Operadores — recolhível (fechado por padrão) ── */}
      <NavLabelCollapsible
        expanded={opsExpandidas}
        onToggle={() => setOpsExpandidas((v) => !v)}
      >
        Operadores
      </NavLabelCollapsible>

      <Link href="/painel/operadores" onClick={onClose}
        className={pathname === '/painel/operadores' ? 'sidebar-item-active' : 'sidebar-item-inactive'}>
        <Users size={15} /> Todos os Operadores
      </Link>

      <div
        style={{
          maxHeight: opsExpandidas ? '1200px' : '0px',
          overflow: 'hidden',
          transition: 'max-height 0.35s cubic-bezier(0.4,0,0.2,1)',
        }}
      >
        <div className="space-y-0.5 mt-1">
          {OPERADORES_DISPLAY.map((op) => {
            const href = `/painel/operadores/${op.id}`
            const active = pathname === href
            return (
              <Link
                key={op.id}
                href={href}
                onClick={onClose}
                className="flex items-center gap-2 px-3 py-1.5 rounded-xl text-xs transition-all"
                style={{
                  color: active ? 'var(--gold-light)' : 'var(--text-muted)',
                  background: active
                    ? 'linear-gradient(90deg, rgba(201,168,76,0.10) 0%, transparent 100%)'
                    : 'transparent',
                  borderLeft: active ? '2px solid rgba(201,168,76,0.5)' : '2px solid transparent',
                  paddingLeft: 'calc(0.75rem - 2px)',
                }}
                onMouseEnter={(e) => {
                  if (!active) {
                    const el = e.currentTarget as HTMLElement
                    el.style.color = 'var(--text-secondary)'
                    el.style.background = 'rgba(255,255,255,0.03)'
                  }
                }}
                onMouseLeave={(e) => {
                  if (!active) {
                    const el = e.currentTarget as HTMLElement
                    el.style.color = 'var(--text-muted)'
                    el.style.background = 'transparent'
                  }
                }}
              >
                <span
                  className="w-5 h-5 rounded-md flex items-center justify-center text-[9px] font-bold shrink-0 border"
                  style={getAvatarStyle(op.id)}
                >
                  {getIniciaisNome(op.nome)}
                </span>
                <span className="truncate">{op.nome.split(' ')[0]} {op.nome.split(' ')[1]}</span>
                {active && <ChevronRight size={10} className="ml-auto shrink-0" style={{ color: 'var(--gold)' }} />}
              </Link>
            )
          })}
        </div>
      </div>

      {/* ── Configurações — recolhível (fechado por padrão) ── */}
      <NavLabelCollapsible
        expanded={configExpandida}
        onToggle={() => setConfigExpandida((v) => !v)}
      >
        Configurações
      </NavLabelCollapsible>

      <div
        style={{
          maxHeight: configExpandida ? '200px' : '0px',
          overflow: 'hidden',
          transition: 'max-height 0.35s cubic-bezier(0.4,0,0.2,1)',
        }}
      >
        <div className="space-y-0.5">
          <Link href="/painel/metas" onClick={onClose}
            className={pathname === '/painel/metas' ? 'sidebar-item-active' : 'sidebar-item-inactive'}>
            <Target size={15} /> Metas KPI
          </Link>
          <Link href="/painel/rv-config" onClick={onClose}
            className={pathname === '/painel/rv-config' ? 'sidebar-item-active' : 'sidebar-item-inactive'}>
            <SlidersHorizontal size={15} /> Config. RV
          </Link>
          <Link href="/painel/config" onClick={onClose}
            className={pathname === '/painel/config' ? 'sidebar-item-active' : 'sidebar-item-inactive'}>
            <Database size={15} /> Planilhas
          </Link>
        </div>
      </div>
    </div>
  )
}

/* ── Operador nav ────────────────────────────────────────────────────────────── */

function OperadorNav({ profile, pathname, onClose }: { profile: Profile; pathname: string; onClose: () => void }) {
  const dadosHref = `/painel/operadores/${profile.operador_id}`

  return (
    <div className="space-y-0.5">
      <NavLabel>Meu Painel</NavLabel>

      <Link href="/painel" onClick={onClose}
        className={pathname === '/painel' ? 'sidebar-item-active' : 'sidebar-item-inactive'}>
        <LayoutDashboard size={15} /> Início
      </Link>
      <Link href="/painel/kpi" onClick={onClose}
        className={pathname.startsWith('/painel/kpi') ? 'sidebar-item-active' : 'sidebar-item-inactive'}>
        <Target size={15} /> Meus KPIs
      </Link>
      <Link href={dadosHref} onClick={onClose}
        className={pathname === dadosHref ? 'sidebar-item-active' : 'sidebar-item-inactive'}>
        <BarChart2 size={15} /> Meus Dados
      </Link>
      <Link href="/painel/rv" onClick={onClose}
        className={pathname === '/painel/rv' ? 'sidebar-item-active' : 'sidebar-item-inactive'}>
        <Trophy size={15} style={{ color: pathname === '/painel/rv' ? 'var(--gold)' : undefined }} />
        RV Estimada
      </Link>

      <NavLabel>Registros</NavLabel>

      <Link href="/painel/meu-diario" onClick={onClose}
        className={pathname.startsWith('/painel/meu-diario') ? 'sidebar-item-active' : 'sidebar-item-inactive'}>
        <BookOpen size={15} /> Meu Diário
      </Link>
    </div>
  )
}

function NavLabel({ children }: { children: React.ReactNode }) {
  return (
    <div className="px-3 pt-5 pb-1.5 first:pt-1">
      <div className="flex items-center gap-2">
        <span
          className="text-[9px] font-bold uppercase"
          style={{ color: 'var(--text-muted)', letterSpacing: '0.12em' }}
        >
          {children}
        </span>
        <div style={{
          flex: 1,
          height: '1px',
          background: 'linear-gradient(90deg, rgba(201,168,76,0.15) 0%, transparent 100%)',
        }} />
      </div>
    </div>
  )
}

function NavLabelCollapsible({
  children,
  expanded,
  onToggle,
}: {
  children: React.ReactNode
  expanded: boolean
  onToggle: () => void
}) {
  return (
    <div className="px-3 pt-5 pb-1.5">
      <button
        type="button"
        onClick={onToggle}
        className="flex items-center gap-2 w-full"
        aria-expanded={expanded}
      >
        <span
          className="text-[9px] font-bold uppercase"
          style={{ color: 'var(--text-muted)', letterSpacing: '0.12em' }}
        >
          {children}
        </span>
        <div style={{
          flex: 1,
          height: '1px',
          background: 'linear-gradient(90deg, rgba(201,168,76,0.15) 0%, transparent 100%)',
        }} />
        <ChevronDown
          size={11}
          style={{
            color: 'var(--text-muted)',
            flexShrink: 0,
            transition: 'transform 0.35s cubic-bezier(0.4,0,0.2,1)',
            transform: expanded ? 'rotate(0deg)' : 'rotate(-180deg)',
          }}
        />
      </button>
    </div>
  )
}
