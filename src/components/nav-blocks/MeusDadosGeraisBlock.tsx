'use client'

import Link from 'next/link'
import { Gauge, BarChart3, Wallet, TrendingUp } from 'lucide-react'

function NavLabel({ children }: { children: React.ReactNode }) {
  return (
    <div className="px-3 pt-5 pb-1.5 first:pt-1">
      <div className="flex items-center gap-2">
        <span className="text-[9px] font-bold uppercase" style={{ color: 'var(--text-muted)', letterSpacing: '0.12em' }}>
          {children}
        </span>
        <div style={{ flex: 1, height: '1px', background: 'linear-gradient(90deg, rgba(201,168,76,0.15) 0%, transparent 100%)' }} />
      </div>
    </div>
  )
}

export function MeusDadosGeraisBlock({ pathname, onClose }: { pathname: string; onClose: () => void }) {
  return (
    <>
      <NavLabel>Meus Dados Gerais</NavLabel>
      <Link href="/painel/meu-kpi" onClick={onClose}
        className={pathname === '/painel/meu-kpi' ? 'sidebar-item-active' : 'sidebar-item-inactive'}>
        <Gauge size={15} strokeWidth={1.5} /> Meu KPI
      </Link>
      <Link href="/painel/meu-quartil" onClick={onClose}
        className={pathname === '/painel/meu-quartil' ? 'sidebar-item-active' : 'sidebar-item-inactive'}>
        <BarChart3 size={15} strokeWidth={1.5} /> Meu Quartil
      </Link>
      <Link href="/painel/meu-rv" onClick={onClose}
        className={pathname === '/painel/meu-rv' ? 'sidebar-item-active' : 'sidebar-item-inactive'}>
        <Wallet size={15} strokeWidth={1.5} /> Meu RV
      </Link>
      <Link href="/painel/meu-d1" onClick={onClose}
        className={pathname === '/painel/meu-d1' ? 'sidebar-item-active' : 'sidebar-item-inactive'}>
        <TrendingUp size={15} strokeWidth={1.5} /> D-1
      </Link>
    </>
  )
}
