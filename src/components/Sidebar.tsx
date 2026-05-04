'use client'

import Link from 'next/link'
import { usePathname } from 'next/navigation'
import { useState } from 'react'
import { Profile } from '@/types'
import { OPERADORES, getAvatarStyle, getIniciaisNome } from '@/lib/operadores'
import {
  ChevronDown, BarChart2,
  BookOpen, ClipboardList,
  CalendarDays, Ticket, Gauge, Wallet,
  BarChart3, Coins, Trophy, FileText, Settings,
} from 'lucide-react'
import clsx from 'clsx'
import { useSidebarBadges } from '@/context/sidebar-badges'
import { MeusDadosGeraisBlock } from '@/components/nav-blocks/MeusDadosGeraisBlock'
import { HistoricoBlock } from '@/components/nav-blocks/HistoricoBlock'
import { SeparadorPainel } from '@/components/nav-blocks/SeparadorPainel'

interface SidebarProps {
  profile: Profile
  isOpen: boolean
  onClose: () => void
}

const ROLE_LABEL: Record<string, string> = {
  gestor:   'Gestor',
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
    if (role === 'aux')      return <AuxNav    pathname={pathname} onClose={onClose} />
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
          fontFamily: "'Syne', sans-serif",
          textTransform: 'uppercase' as const,
          background: 'linear-gradient(180deg, #0a0e1f 0%, #06091a 50%, #04061a 100%)',
          borderRight: '1px solid rgba(244,212,124,0.08)',
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
              className="text-gold-gradient font-bold tracking-wide"
              style={{ fontFamily: 'var(--ff-syne)', fontSize: '18px', fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.08em' }}
            >
              HALO
            </span>
            <p
              className="mt-0.5 uppercase"
              style={{ fontFamily: 'var(--ff-syne)', fontSize: '11px', fontWeight: 500, color: '#72708f', letterSpacing: '0.14em' }}
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
        <div style={{
          padding: '12px',
          borderTop: '1px solid transparent',
          borderImage: 'linear-gradient(90deg, transparent 0%, rgba(244,212,124,0.12) 50%, transparent 100%) 1',
        }}>
          <div
            style={{
              background: 'rgba(244,212,124,0.04)',
              border: '1px solid rgba(244,212,124,0.15)',
              borderRadius: '10px',
              padding: '12px 14px',
              display: 'flex',
              alignItems: 'center',
              gap: '12px',
              cursor: 'pointer',
              transition: 'background 200ms ease, border-color 200ms ease',
            }}
            onMouseEnter={(e) => {
              const el = e.currentTarget as HTMLElement
              el.style.background = 'rgba(244,212,124,0.08)'
              el.style.borderColor = 'rgba(244,212,124,0.25)'
            }}
            onMouseLeave={(e) => {
              const el = e.currentTarget as HTMLElement
              el.style.background = 'rgba(244,212,124,0.04)'
              el.style.borderColor = 'rgba(244,212,124,0.15)'
            }}
          >
            {/* Avatar */}
            <div style={{
              width: '36px', height: '36px', flexShrink: 0,
              borderRadius: '8px',
              background: '#070714',
              border: '1.5px solid #f4d47c',
              color: '#f4d47c',
              fontFamily: 'var(--ff-syne)',
              fontSize: '13px', fontWeight: 600,
              letterSpacing: '0.04em',
              display: 'flex', alignItems: 'center', justifyContent: 'center',
            }}>
              {getIniciaisNome(profile.nome)}
            </div>
            {/* Info */}
            <div style={{ flex: 1, minWidth: 0 }}>
              <p style={{
                fontFamily: 'var(--ff-syne)', fontSize: '13px', fontWeight: 600,
                color: '#e8edf8', lineHeight: 1, margin: 0,
                overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap',
              }}>
                {profile.nome.split(' ').slice(0, 2).join(' ')}
              </p>
              <p style={{
                fontFamily: 'var(--ff-syne)', fontSize: '10px', fontWeight: 400,
                color: '#72708f', lineHeight: 1, margin: '4px 0 0',
                overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap',
              }}>
                {profile.username}
              </p>
              <div style={{ marginTop: '6px' }}>
                <span style={{
                  fontFamily: 'var(--ff-syne)', fontSize: '9px', fontWeight: 700,
                  textTransform: 'uppercase', letterSpacing: '0.12em',
                  padding: '3px 8px', borderRadius: '6px',
                  display: 'inline-flex', alignItems: 'center',
                  ...(ROLE_BADGE_STYLE[role] ?? ROLE_BADGE_STYLE.operador),
                  border: `1px solid ${role === 'gestor' ? 'rgba(244,212,124,0.4)' : role === 'admin' ? 'rgba(139,92,246,0.4)' : role === 'aux' ? 'rgba(59,130,246,0.4)' : 'rgba(16,185,129,0.4)'}`,
                }}>
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
  const [contestacaoExpandido, setContestacaoExpandido] = useState(true)
  const [registrosExpandidos,  setRegistrosExpandidos]  = useState(false)
  const { glpiPendentes } = useSidebarBadges()

  return (
    <div className="space-y-1">
      <NavLabel>Meus Dados Gerais</NavLabel>

      <Link href="/painel/gestor/meu-kpi" onClick={onClose}
        className={pathname === '/painel/gestor/meu-kpi' ? 'sidebar-item-active' : 'sidebar-item-inactive'}>
        <Gauge size={18} strokeWidth={1.5} /> Meu KPI
      </Link>
      <Link href="/painel/gestor/meu-rv" onClick={onClose}
        className={pathname === '/painel/gestor/meu-rv' ? 'sidebar-item-active' : 'sidebar-item-inactive'}>
        <Wallet size={18} strokeWidth={1.5} /> Meu RV
      </Link>

      <NavLabel>Dados da Equipe</NavLabel>

      <Link href="/painel/gestor/kpi-equipe" onClick={onClose}
        className={pathname === '/painel/gestor/kpi-equipe' ? 'sidebar-item-active' : 'sidebar-item-inactive'}>
        <BarChart3 size={18} strokeWidth={1.5} /> KPI Equipe
      </Link>
      <Link href="/painel/gestor/rv-equipe" onClick={onClose}
        className={pathname === '/painel/gestor/rv-equipe' ? 'sidebar-item-active' : 'sidebar-item-inactive'}>
        <Coins size={18} strokeWidth={1.5} /> RV Equipe
      </Link>
      <Link href="/painel/gestor/q4-equipe" onClick={onClose}
        className={pathname === '/painel/gestor/q4-equipe' ? 'sidebar-item-active' : 'sidebar-item-inactive'}>
        <Trophy size={18} strokeWidth={1.5} /> <span style={{ fontFamily: "'DM Sans', sans-serif", fontWeight: 500 }}>Q4</span>{' '}Equipe
      </Link>

      {/* ── PAINEL GESTOR separator ─────────────────────────────────────────── */}
      <div className="flex items-center gap-3 px-3" style={{ marginTop: '24px', marginBottom: '16px' }}>
        <div className="flex-1 h-px" style={{ background: 'rgba(123,163,217,0.3)' }} />
        <span className="shrink-0 uppercase" style={{ fontFamily: 'var(--ff-syne)', fontSize: '11px', fontWeight: 600, color: '#7ba3d9', letterSpacing: '0.12em' }}>
          PAINEL GESTOR
        </span>
        <div className="flex-1 h-px" style={{ background: 'rgba(123,163,217,0.3)' }} />
      </div>

      {/* ── CONTESTAÇÃO RV collapsible header ───────────────────────────────── */}
      <div className="px-3 pt-5 pb-1.5">
        <button
          type="button"
          onClick={() => setContestacaoExpandido(v => !v)}
          className="flex items-center gap-2 w-full"
          aria-expanded={contestacaoExpandido}
        >
          <span className="uppercase shrink-0" style={{ fontFamily: 'var(--ff-syne)', fontSize: '11px', fontWeight: 600, color: '#7ba3d9', letterSpacing: '0.12em' }}>
            Contestação RV
          </span>
          <div style={{ flex: 1, height: '1px', background: 'linear-gradient(90deg, rgba(123,163,217,0.2) 0%, transparent 100%)' }} />
          <ChevronDown
            size={11}
            style={{
              color: '#7ba3d9',
              flexShrink: 0,
              transition: 'transform 0.35s cubic-bezier(0.4,0,0.2,1)',
              transform: contestacaoExpandido ? 'rotate(0deg)' : 'rotate(-180deg)',
            }}
          />
        </button>
      </div>

      <div style={{ maxHeight: contestacaoExpandido ? '320px' : '0px', overflow: 'hidden', transition: 'max-height 0.35s cubic-bezier(0.4,0,0.2,1)' }}>
        <div className="space-y-1">

          {/* ── Sub-cabeçalho GESTOR ── */}
          <div style={{ display: 'flex', alignItems: 'center', gap: '8px', margin: '8px 12px 4px' }}>
            <div style={{ flex: 1, height: '1px', background: 'rgba(123,163,217,0.15)' }} />
            <span style={{ fontFamily: 'var(--ff-syne)', fontSize: '10px', fontWeight: 600, textTransform: 'uppercase', letterSpacing: '1.5px', color: 'rgba(123,163,217,0.55)' }}>
              Gestor
            </span>
            <div style={{ flex: 1, height: '1px', background: 'rgba(123,163,217,0.15)' }} />
          </div>

          {/* Exportar PDF — GESTOR (rota a definir) */}
          <div
            className="sidebar-item-inactive"
            style={{ color: '#7ba3d9' }}
          >
            <FileText size={18} strokeWidth={1.5} /> Exportar PDF
          </div>

          {/* ── Sub-cabeçalho OPERADOR ── */}
          <div style={{ display: 'flex', alignItems: 'center', gap: '8px', margin: '8px 12px 4px' }}>
            <div style={{ flex: 1, height: '1px', background: 'rgba(123,163,217,0.15)' }} />
            <span style={{ fontFamily: 'var(--ff-syne)', fontSize: '10px', fontWeight: 600, textTransform: 'uppercase', letterSpacing: '1.5px', color: 'rgba(123,163,217,0.55)' }}>
              Operador
            </span>
            <div style={{ flex: 1, height: '1px', background: 'rgba(123,163,217,0.15)' }} />
          </div>

          {/* Exportar PDF — funcional */}
          <Link href="/painel/gestor/contestacao-rv/exportar-pdf-op" onClick={onClose}
            className={pathname === '/painel/gestor/contestacao-rv/exportar-pdf-op' ? 'sidebar-item-active' : 'sidebar-item-inactive'}
            style={pathname !== '/painel/gestor/contestacao-rv/exportar-pdf-op' ? { color: '#7ba3d9' } : undefined}>
            <FileText size={18} strokeWidth={1.5} /> Exportar PDF
          </Link>

        </div>
      </div>

      {/* ── REGISTROS GERAIS collapsible header ─────────────────────────────── */}
      <div className="px-3 pt-5 pb-1.5">
        <button
          type="button"
          onClick={() => setRegistrosExpandidos(v => !v)}
          className="flex items-center gap-2 w-full"
          aria-expanded={registrosExpandidos}
        >
          <span className="uppercase shrink-0" style={{ fontFamily: 'var(--ff-syne)', fontSize: '11px', fontWeight: 600, color: '#7ba3d9', letterSpacing: '0.12em' }}>
            Registros Gerais
          </span>
          <div style={{ flex: 1, height: '1px', background: 'linear-gradient(90deg, rgba(123,163,217,0.2) 0%, transparent 100%)' }} />
          <ChevronDown
            size={11}
            style={{
              color: '#7ba3d9',
              flexShrink: 0,
              transition: 'transform 0.35s cubic-bezier(0.4,0,0.2,1)',
              transform: registrosExpandidos ? 'rotate(0deg)' : 'rotate(-180deg)',
            }}
          />
        </button>
      </div>

      <div style={{ maxHeight: registrosExpandidos ? '300px' : '0px', overflow: 'hidden', transition: 'max-height 0.35s cubic-bezier(0.4,0,0.2,1)' }}>
        <div className="space-y-1">
          <Link href="/painel/diario" onClick={onClose}
            className={pathname.startsWith('/painel/diario') ? 'sidebar-item-active' : 'sidebar-item-inactive'}
            style={!pathname.startsWith('/painel/diario') ? { color: '#7ba3d9' } : undefined}>
            <BookOpen size={18} strokeWidth={1.5} /> Diário de Bordo
          </Link>
          <Link href="/painel/monitoria" onClick={onClose}
            className={pathname.startsWith('/painel/monitoria') ? 'sidebar-item-active' : 'sidebar-item-inactive'}
            style={!pathname.startsWith('/painel/monitoria') ? { color: '#7ba3d9' } : undefined}>
            <ClipboardList size={18} strokeWidth={1.5} /> Monitoria
          </Link>
          <Link href="/painel/abs" onClick={onClose}
            className={pathname.startsWith('/painel/abs') ? 'sidebar-item-active' : 'sidebar-item-inactive'}
            style={!pathname.startsWith('/painel/abs') ? { color: '#7ba3d9' } : undefined}>
            <CalendarDays size={18} strokeWidth={1.5} /> ABS
          </Link>
          <GLPILink pathname={pathname} onClose={onClose} glpiPendentes={glpiPendentes} iconColor="#7ba3d9" textColor="#7ba3d9" />
        </div>
      </div>
    </div>
  )
}

/* ── Admin nav ───────────────────────────────────────────────────────────────── */

function AdminNav({ pathname, onClose }: { pathname: string; onClose: () => void }) {
  const [registrosExpandidos,  setRegistrosExpandidos]  = useState(false)
  const [configExpandida,      setConfigExpandida]      = useState(false)
  const { glpiPendentes } = useSidebarBadges()

  return (
    <div className="space-y-0.5">
      <MeusDadosGeraisBlock pathname={pathname} onClose={onClose} />
      <HistoricoBlock pathname={pathname} onClose={onClose} />

      <SeparadorPainel titulo="PAINEL ADMIN" cor="#7ba3d9" corLinha="rgba(123,163,217,0.3)" />

      <NavLabelCollapsible expanded={registrosExpandidos} onToggle={() => setRegistrosExpandidos((v) => !v)} cor="#7ba3d9">
        Registros Gerais
      </NavLabelCollapsible>

      <div style={{ maxHeight: registrosExpandidos ? '300px' : '0px', overflow: 'hidden', transition: 'max-height 0.35s cubic-bezier(0.4,0,0.2,1)' }}>
        <div className="space-y-0.5">
          <Link href="/painel/diario" onClick={onClose}
            className={pathname.startsWith('/painel/diario') ? 'sidebar-item-active' : 'sidebar-item-inactive'}
            style={!pathname.startsWith('/painel/diario') ? { color: '#7ba3d9' } : undefined}>
            <BookOpen size={15} /> Diário de Bordo
          </Link>
          <Link href="/painel/monitoria" onClick={onClose}
            className={pathname.startsWith('/painel/monitoria') ? 'sidebar-item-active' : 'sidebar-item-inactive'}
            style={!pathname.startsWith('/painel/monitoria') ? { color: '#7ba3d9' } : undefined}>
            <ClipboardList size={15} /> Monitoria
          </Link>
          <Link href="/painel/abs" onClick={onClose}
            className={pathname.startsWith('/painel/abs') ? 'sidebar-item-active' : 'sidebar-item-inactive'}
            style={!pathname.startsWith('/painel/abs') ? { color: '#7ba3d9' } : undefined}>
            <CalendarDays size={15} /> ABS
          </Link>
          <GLPILink pathname={pathname} onClose={onClose} glpiPendentes={glpiPendentes} iconColor="#7ba3d9" textColor="#7ba3d9" />
        </div>
      </div>

      <NavLabelCollapsible expanded={configExpandida} onToggle={() => setConfigExpandida((v) => !v)} cor="#7ba3d9">
        Configurações
      </NavLabelCollapsible>

      <div style={{ maxHeight: configExpandida ? '280px' : '0px', overflow: 'hidden', transition: 'max-height 0.35s cubic-bezier(0.4,0,0.2,1)' }}>
        <div className="space-y-0.5">
          <Link href="/painel/admin/configuracoes/planilhas" onClick={onClose}
            className={pathname === '/painel/admin/configuracoes/planilhas' ? 'sidebar-item-active' : 'sidebar-item-inactive'}
            style={pathname !== '/painel/admin/configuracoes/planilhas' ? { color: 'rgba(123,163,217,0.55)' } : undefined}>
            <Settings size={15} /> Ajus. Planilha
          </Link>
          <Link href="/painel/config/historico" onClick={onClose}
            className={pathname === '/painel/config/historico' ? 'sidebar-item-active' : 'sidebar-item-inactive'}
            style={pathname !== '/painel/config/historico' ? { color: 'rgba(123,163,217,0.55)' } : undefined}>
            <Settings size={15} /> Ajus. Histórico
          </Link>
          <Link href="/painel/config/operadores" onClick={onClose}
            className={pathname === '/painel/config/operadores' ? 'sidebar-item-active' : 'sidebar-item-inactive'}
            style={pathname !== '/painel/config/operadores' ? { color: 'rgba(123,163,217,0.55)' } : undefined}>
            <Settings size={15} /> Ajus. Op
          </Link>
          <Link href="/painel/metas" onClick={onClose}
            className={pathname === '/painel/metas' ? 'sidebar-item-active' : 'sidebar-item-inactive'}
            style={pathname !== '/painel/metas' ? { color: 'rgba(123,163,217,0.55)' } : undefined}>
            <Settings size={15} /> Ajus. KPI
          </Link>
          <Link href="/painel/rv-config" onClick={onClose}
            className={pathname === '/painel/rv-config' ? 'sidebar-item-active' : 'sidebar-item-inactive'}
            style={pathname !== '/painel/rv-config' ? { color: 'rgba(123,163,217,0.55)' } : undefined}>
            <Settings size={15} /> Ajus. RV
          </Link>
        </div>
      </div>
    </div>
  )
}

/* ── Aux nav ─────────────────────────────────────────────────────────────────── */

function AuxNav({ pathname, onClose }: { pathname: string; onClose: () => void }) {
  const [registrosExpandidos, setRegistrosExpandidos] = useState(false)
  const { glpiPendentes } = useSidebarBadges()

  return (
    <div className="space-y-0.5">
      <MeusDadosGeraisBlock pathname={pathname} onClose={onClose} />
      <HistoricoBlock pathname={pathname} onClose={onClose} />

      <SeparadorPainel titulo="PAINEL AUXILIAR" />

      <NavLabelCollapsible
        expanded={registrosExpandidos}
        onToggle={() => setRegistrosExpandidos((v) => !v)}
        cor="var(--halo-blue-aux)"
      >
        Registros Gerais
      </NavLabelCollapsible>

      <div style={{ maxHeight: registrosExpandidos ? '300px' : '0px', overflow: 'hidden', transition: 'max-height 0.35s cubic-bezier(0.4,0,0.2,1)' }}>
        <div className="space-y-0.5">
          <Link href="/painel/diario" onClick={onClose}
            className={pathname.startsWith('/painel/diario') ? 'sidebar-item-active' : 'sidebar-item-aux-inactive'}>
            <BookOpen size={15} /> Diário de Bordo
          </Link>
          <Link href="/painel/monitoria" onClick={onClose}
            className={pathname.startsWith('/painel/monitoria') ? 'sidebar-item-active' : 'sidebar-item-aux-inactive'}>
            <ClipboardList size={15} /> Monitoria
          </Link>
          <Link href="/painel/abs" onClick={onClose}
            className={pathname.startsWith('/painel/abs') ? 'sidebar-item-active' : 'sidebar-item-aux-inactive'}>
            <CalendarDays size={15} /> ABS
          </Link>
          <GLPILink pathname={pathname} onClose={onClose} glpiPendentes={glpiPendentes} iconColor="var(--halo-blue-aux-soft)" auxStyle />
        </div>
      </div>
    </div>
  )
}

/* ── Operador nav ────────────────────────────────────────────────────────────── */

function OperadorNav({ pathname, onClose }: { profile: Profile; pathname: string; onClose: () => void }) {
  return (
    <div className="space-y-0.5">
      <MeusDadosGeraisBlock pathname={pathname} onClose={onClose} />
      <HistoricoBlock pathname={pathname} onClose={onClose} />
    </div>
  )
}

/* ── Shared components ───────────────────────────────────────────────────────── */

function GLPILink({ pathname, onClose, glpiPendentes, iconColor, textColor, auxStyle }: { pathname: string; onClose: () => void; glpiPendentes: number; iconColor?: string; textColor?: string; auxStyle?: boolean }) {
  const isActive = pathname.startsWith('/painel/glpi')
  const inactiveClass = auxStyle ? 'sidebar-item-aux-inactive' : 'sidebar-item-inactive'
  return (
    <Link href="/painel/glpi" onClick={onClose}
      className={`${isActive ? 'sidebar-item-active' : inactiveClass} flex items-center justify-between`}
      style={!isActive && textColor ? { color: textColor } : undefined}>
      <span className="flex items-center gap-2">
        <Ticket size={18} strokeWidth={1.5} color={isActive ? undefined : iconColor} /> GLPI
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
          className="uppercase shrink-0"
          style={{ fontFamily: 'var(--ff-syne)', fontSize: '11px', fontWeight: 600, color: '#72708f', letterSpacing: '0.12em' }}
        >
          {children}
        </span>
        <div style={{
          flex: 1,
          height: '1px',
          background: 'linear-gradient(90deg, rgba(114,112,143,0.2) 0%, transparent 100%)',
        }} />
      </div>
    </div>
  )
}

function NavLabelCollapsible({
  children,
  expanded,
  onToggle,
  cor,
}: {
  children: React.ReactNode
  expanded: boolean
  onToggle: () => void
  cor?: string
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
          className="uppercase shrink-0"
          style={{ fontFamily: 'var(--ff-syne)', fontSize: '11px', fontWeight: 600, color: cor ?? '#72708f', letterSpacing: '0.12em' }}
        >
          {children}
        </span>
        <div style={{
          flex: 1,
          height: '1px',
          background: 'linear-gradient(90deg, rgba(114,112,143,0.2) 0%, transparent 100%)',
        }} />
        <ChevronDown
          size={11}
          style={{
            color: cor ?? '#72708f',
            flexShrink: 0,
            transition: 'transform 0.35s cubic-bezier(0.4,0,0.2,1)',
            transform: expanded ? 'rotate(0deg)' : 'rotate(-180deg)',
          }}
        />
      </button>
    </div>
  )
}
