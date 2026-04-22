'use client'

import Link from 'next/link'
import { History, LineChart, CalendarDays } from 'lucide-react'

function NavLabel({ children }: { children: React.ReactNode }) {
  return (
    <div className="px-3 pt-5 pb-1.5">
      <div className="flex items-center gap-2">
        <span className="text-[9px] font-bold uppercase" style={{ color: 'var(--text-muted)', letterSpacing: '0.12em' }}>
          {children}
        </span>
        <div style={{ flex: 1, height: '1px', background: 'linear-gradient(90deg, rgba(201,168,76,0.15) 0%, transparent 100%)' }} />
      </div>
    </div>
  )
}

export function HistoricoBlock({ pathname, onClose }: { pathname: string; onClose: () => void }) {
  return (
    <>
      <NavLabel>Histórico</NavLabel>
      <Link href="/painel/historico/ultimos-3-meses" onClick={onClose}
        className={pathname === '/painel/historico/ultimos-3-meses' ? 'sidebar-item-active' : 'sidebar-item-inactive'}>
        <History size={15} strokeWidth={1.5} /> Últimos 3 Meses
      </Link>
      <Link href="/painel/historico/evolucao" onClick={onClose}
        className={pathname === '/painel/historico/evolucao' ? 'sidebar-item-active' : 'sidebar-item-inactive'}>
        <LineChart size={15} strokeWidth={1.5} /> Evolução
      </Link>
      <Link href="/painel/historico/por-mes" onClick={onClose}
        className={pathname === '/painel/historico/por-mes' ? 'sidebar-item-active' : 'sidebar-item-inactive'}>
        <CalendarDays size={15} strokeWidth={1.5} /> Por Mês
      </Link>
    </>
  )
}
