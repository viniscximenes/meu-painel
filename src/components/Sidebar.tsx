'use client'

import Link from 'next/link'
import { usePathname } from 'next/navigation'
import { useState } from 'react'
import { Profile } from '@/types'
import { OPERADORES, getAvatarStyle, getIniciaisNome } from '@/lib/operadores'
import {
  LayoutDashboard, ChevronDown, BarChart2,
  Target, TableProperties, Database, Trophy, SlidersHorizontal, BookOpen, ClipboardList,
  CalendarDays, Ticket, User, CircleDollarSign,
} from 'lucide-react'
import clsx from 'clsx'
import { useSidebarBadges } from '@/context/sidebar-badges'

interface SidebarProps {
  profile: Profile
  isOpen: boolean
  onClose: () => void
}

const ROLE_LABEL: Record<string, string> = {
  gestor:   'Gestão',
  admin:    'Administração',
  aux:      'Auxiliar',
  operador: 'Operações',
}

const ROLE_BADGE_STYLE: Record<string, React.CSSProperties> = {
  gestor:   { background: 'rgba(201,168,76,0.12)',  color: 'var(--gold-light)',  letterSpacing: '0.08em' },
  admin:    { background: 'rgba(139,92,246,0.12)',  color: '#a78bfa',            letterSpacing: '0.08em' },
  aux:      { background: 'rgba(59,130,246,0.12)',  color: '#60a5fa',            letterSpacing: '0.08em' },
  operador: { background: 'rgba(16,185,129,0.10)',  color: '#34d399',            letterSpacing: '0.08em' },
}

export default function Sidebar({ profile, isOpen, onClose }: SidebarProps) {
  const pathname = usePathname()
  const role = profile.role

  function renderNav() {
    if (role === 'gestor')   return <GestorNav pathname={pathname} onClose={onClose} />
    if (role === 'admin')    return <AdminNav  pathname={pathname} onClose={onClose} />
    if (role === 'aux')      return <AuxNav    profile={profile} pathname={pathname} onClose={onClose} />
    return <OperadorNav profile={profile} pathname={pathname} onClose={onClose} />
  }

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
        {/* Logo */}
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
              {ROLE_LABEL[role] ?? 'Operações'}
            </p>
          </div>
        </div>

        {/* Nav */}
        <nav className="flex-1 px-2 py-3 sidebar-scroll">
          {renderNav()}
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
                  style={ROLE_BADGE_STYLE[role] ?? ROLE_BADGE_STYLE.operador}
                >
                  {role}
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
  const [registrosExpandidos, setRegistrosExpandidos] = useState(true)
  const [opsExpandidas,       setOpsExpandidas]       = useState(true)
  const { glpiPendentes } = useSidebarBadges()

  return (
    <div className="space-y-0.5">
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

      <NavLabelCollapsible expanded={registrosExpandidos} onToggle={() => setRegistrosExpandidos((v) => !v)}>
        Registros
      </NavLabelCollapsible>

      <div style={{ maxHeight: registrosExpandidos ? '300px' : '0px', overflow: 'hidden', transition: 'max-height 0.35s cubic-bezier(0.4,0,0.2,1)' }}>
        <div className="space-y-0.5">
          <Link href="/painel/diario" onClick={onClose}
            className={pathname.startsWith('/painel/diario') ? 'sidebar-item-active' : 'sidebar-item-inactive'}>
            <BookOpen size={15} /> Diário de Bordo
          </Link>
          <Link href="/painel/monitoria" onClick={onClose}
            className={pathname.startsWith('/painel/monitoria') ? 'sidebar-item-active' : 'sidebar-item-inactive'}>
            <ClipboardList size={15} /> Monitoria
          </Link>
          <Link href="/painel/abs" onClick={onClose}
            className={pathname.startsWith('/painel/abs') ? 'sidebar-item-active' : 'sidebar-item-inactive'}>
            <CalendarDays size={15} /> ABS
          </Link>
          <GLPILink pathname={pathname} onClose={onClose} glpiPendentes={glpiPendentes} />
        </div>
      </div>

      <NavLabelCollapsible expanded={opsExpandidas} onToggle={() => setOpsExpandidas((v) => !v)}>
        Operadores
      </NavLabelCollapsible>

      <div style={{ maxHeight: opsExpandidas ? '1200px' : '0px', overflow: 'hidden', transition: 'max-height 0.35s cubic-bezier(0.4,0,0.2,1)' }}>
        <OperadoresList />
      </div>
    </div>
  )
}

/* ── Admin nav ───────────────────────────────────────────────────────────────── */

function AdminNav({ pathname, onClose }: { pathname: string; onClose: () => void }) {
  const [registrosExpandidos,  setRegistrosExpandidos]  = useState(true)
  const [dadosGestaoExpandido, setDadosGestaoExpandido] = useState(false)
  const [configExpandida,      setConfigExpandida]      = useState(false)
  const { glpiPendentes } = useSidebarBadges()

  return (
    <div className="space-y-0.5">
      <NavLabel>Meus Dados</NavLabel>

      <Link href="/painel/meu-kpi" onClick={onClose}
        className={pathname === '/painel/meu-kpi' ? 'sidebar-item-active' : 'sidebar-item-inactive'}>
        <User size={15} /> Meu KPI
      </Link>
      <Link href="/painel/meu-rv" onClick={onClose}
        className={pathname === '/painel/meu-rv' ? 'sidebar-item-active' : 'sidebar-item-inactive'}>
        <CircleDollarSign size={15} /> Meu RV
      </Link>

      <NavLabelCollapsible expanded={registrosExpandidos} onToggle={() => setRegistrosExpandidos((v) => !v)}>
        Registros
      </NavLabelCollapsible>

      <div style={{ maxHeight: registrosExpandidos ? '300px' : '0px', overflow: 'hidden', transition: 'max-height 0.35s cubic-bezier(0.4,0,0.2,1)' }}>
        <div className="space-y-0.5">
          <Link href="/painel/diario" onClick={onClose}
            className={pathname.startsWith('/painel/diario') ? 'sidebar-item-active' : 'sidebar-item-inactive'}>
            <BookOpen size={15} /> Diário de Bordo
          </Link>
          <Link href="/painel/monitoria" onClick={onClose}
            className={pathname.startsWith('/painel/monitoria') ? 'sidebar-item-active' : 'sidebar-item-inactive'}>
            <ClipboardList size={15} /> Monitoria
          </Link>
          <Link href="/painel/abs" onClick={onClose}
            className={pathname.startsWith('/painel/abs') ? 'sidebar-item-active' : 'sidebar-item-inactive'}>
            <CalendarDays size={15} /> ABS
          </Link>
          <GLPILink pathname={pathname} onClose={onClose} glpiPendentes={glpiPendentes} />
        </div>
      </div>

      <NavLabelCollapsible expanded={dadosGestaoExpandido} onToggle={() => setDadosGestaoExpandido((v) => !v)}>
        Dados Gerais Gestão
      </NavLabelCollapsible>

      <div style={{ maxHeight: dadosGestaoExpandido ? '200px' : '0px', overflow: 'hidden', transition: 'max-height 0.35s cubic-bezier(0.4,0,0.2,1)' }}>
        <div className="space-y-0.5">
          <Link href="/painel/kpis-equipe" onClick={onClose}
            className={pathname === '/painel/kpis-equipe' ? 'sidebar-item-active' : 'sidebar-item-inactive'}>
            <TableProperties size={15} /> KPIs da Equipe
          </Link>
          <Link href="/painel/rv-equipe" onClick={onClose}
            className={pathname === '/painel/rv-equipe' ? 'sidebar-item-active' : 'sidebar-item-inactive'}>
            <Trophy size={15} style={{ color: pathname === '/painel/rv-equipe' ? 'var(--gold)' : undefined }} />
            RV da Equipe
          </Link>
          <Link href="/painel/gestor" onClick={onClose}
            className={pathname === '/painel/gestor' ? 'sidebar-item-active' : 'sidebar-item-inactive'}>
            <LayoutDashboard size={15} /> KPI Gestor & RV
          </Link>
        </div>
      </div>

      <NavLabelCollapsible expanded={configExpandida} onToggle={() => setConfigExpandida((v) => !v)}>
        Configurações
      </NavLabelCollapsible>

      <div style={{ maxHeight: configExpandida ? '200px' : '0px', overflow: 'hidden', transition: 'max-height 0.35s cubic-bezier(0.4,0,0.2,1)' }}>
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

/* ── Aux nav ─────────────────────────────────────────────────────────────────── */

function AuxNav({ profile, pathname, onClose }: { profile: Profile; pathname: string; onClose: () => void }) {
  const [registrosExpandidos, setRegistrosExpandidos] = useState(true)
  const { glpiPendentes } = useSidebarBadges()
  const kpiHref = `/painel/kpi/${profile.username}`

  return (
    <div className="space-y-0.5">
      <NavLabel>Meus Dados</NavLabel>

      <Link href="/painel/meu-kpi" onClick={onClose}
        className={pathname === '/painel/meu-kpi' ? 'sidebar-item-active' : 'sidebar-item-inactive'}>
        <User size={15} /> Meu KPI
      </Link>
      <Link href={kpiHref} onClick={onClose}
        className={pathname.startsWith('/painel/kpi') ? 'sidebar-item-active' : 'sidebar-item-inactive'}>
        <Target size={15} /> Meus KPIs
      </Link>
      <Link href="/painel/meu-rv" onClick={onClose}
        className={pathname === '/painel/meu-rv' ? 'sidebar-item-active' : 'sidebar-item-inactive'}>
        <CircleDollarSign size={15} /> Meu RV
      </Link>

      <NavLabelCollapsible expanded={registrosExpandidos} onToggle={() => setRegistrosExpandidos((v) => !v)}>
        Registros
      </NavLabelCollapsible>

      <div style={{ maxHeight: registrosExpandidos ? '300px' : '0px', overflow: 'hidden', transition: 'max-height 0.35s cubic-bezier(0.4,0,0.2,1)' }}>
        <div className="space-y-0.5">
          <Link href="/painel/diario" onClick={onClose}
            className={pathname.startsWith('/painel/diario') ? 'sidebar-item-active' : 'sidebar-item-inactive'}>
            <BookOpen size={15} /> Diário de Bordo
          </Link>
          <Link href="/painel/monitoria" onClick={onClose}
            className={pathname.startsWith('/painel/monitoria') ? 'sidebar-item-active' : 'sidebar-item-inactive'}>
            <ClipboardList size={15} /> Monitoria
          </Link>
          <Link href="/painel/abs" onClick={onClose}
            className={pathname.startsWith('/painel/abs') ? 'sidebar-item-active' : 'sidebar-item-inactive'}>
            <CalendarDays size={15} /> ABS
          </Link>
          <GLPILink pathname={pathname} onClose={onClose} glpiPendentes={glpiPendentes} />
        </div>
      </div>
    </div>
  )
}

/* ── Operador nav ────────────────────────────────────────────────────────────── */

function OperadorNav({ pathname, onClose }: { profile: Profile; pathname: string; onClose: () => void }) {
  const [meusRegExp, setMeusRegExp] = useState(false)

  return (
    <div className="space-y-0.5">
      <NavLabel>Meus Dados Gerais</NavLabel>

      <Link href="/painel/meu-kpi" onClick={onClose}
        className={pathname === '/painel/meu-kpi' ? 'sidebar-item-active' : 'sidebar-item-inactive'}>
        <User size={15} /> Meu KPI
      </Link>
      <Link href="/painel/meu-rv" onClick={onClose}
        className={pathname === '/painel/meu-rv' ? 'sidebar-item-active' : 'sidebar-item-inactive'}>
        <CircleDollarSign size={15} /> Meu RV
      </Link>

      <NavLabelCollapsible expanded={meusRegExp} onToggle={() => setMeusRegExp(v => !v)}>
        Meus Registros
      </NavLabelCollapsible>

      <div style={{ maxHeight: meusRegExp ? '200px' : '0px', overflow: 'hidden', transition: 'max-height 0.35s cubic-bezier(0.4,0,0.2,1)' }}>
        <div className="space-y-0.5">
          <Link href="/painel/meu-abs" onClick={onClose}
            className={pathname === '/painel/meu-abs' ? 'sidebar-item-active' : 'sidebar-item-inactive'}>
            <CalendarDays size={15} /> Meu ABS
          </Link>
        </div>
      </div>
    </div>
  )
}

/* ── Shared components ───────────────────────────────────────────────────────── */

function GLPILink({ pathname, onClose, glpiPendentes }: { pathname: string; onClose: () => void; glpiPendentes: number }) {
  return (
    <Link href="/painel/glpi" onClick={onClose}
      className={`${pathname.startsWith('/painel/glpi') ? 'sidebar-item-active' : 'sidebar-item-inactive'} flex items-center justify-between`}>
      <span className="flex items-center gap-2">
        <Ticket size={15} /> GLPI
      </span>
      {glpiPendentes > 0 && (
        <span style={{
          fontSize: '9px', fontWeight: 700,
          padding: '1px 6px', borderRadius: '99px',
          background: 'rgba(245,158,11,0.18)',
          border: '1px solid rgba(245,158,11,0.35)',
          color: '#fbbf24',
          lineHeight: '16px',
          flexShrink: 0,
        }}>
          {glpiPendentes}
        </span>
      )}
    </Link>
  )
}

function OperadoresList() {
  return (
    <div className="mt-1">
      {[...OPERADORES].sort((a, b) => {
        const pa = a.skills.includes('GESTOR') ? 0 : a.skills.includes('ADM') ? 1 : a.skills.includes('AUX') ? 2 : 3
        const pb = b.skills.includes('GESTOR') ? 0 : b.skills.includes('ADM') ? 1 : b.skills.includes('AUX') ? 2 : 3
        if (pa !== pb) return pa - pb
        return a.nome.localeCompare(b.nome)
      }).map((op) => {
        const nomeDisplay = op.nome.split(' ').slice(0, 2).join(' ').toUpperCase()
        return (
          <div key={op.id} style={{ padding: '6px 18px' }}>
            <span style={{ fontSize: '10px', fontWeight: 500, letterSpacing: '0.06em', color: 'var(--text-secondary)' }}>
              {nomeDisplay}
            </span>
            {' '}
            <span style={{ fontSize: '10px', letterSpacing: '0.06em', color: 'var(--text-muted)' }}>
              {op.skills.join(' · ')}
            </span>
          </div>
        )
      })}
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
