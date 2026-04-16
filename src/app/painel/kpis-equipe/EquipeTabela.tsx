'use client'

import Link from 'next/link'
import { ArrowRight } from 'lucide-react'
import { getAvatarStyle, getIniciaisNome } from '@/lib/operadores'
import type { KPIItem, Status, Meta } from '@/lib/kpi-utils'
import { formatarExibicao, normalizarChave } from '@/lib/kpi-utils'
import type { DadosOperador } from './page'
import clsx from 'clsx'

const STATUS_COR: Record<Status, string> = {
  verde:    '#10b981',
  amarelo:  '#f59e0b',
  vermelho: '#ef4444',
  neutro:   'var(--text-muted)',
}

const STATUS_DOT: Record<Status, string> = {
  verde: 'bg-emerald-400', amarelo: 'bg-amber-400',
  vermelho: 'bg-rose-400', neutro: 'bg-slate-600',
}

const STATUS_GLOW: Record<Status, string> = {
  verde:    'rgba(16,185,129,0.30)',
  amarelo:  'rgba(245,158,11,0.30)',
  vermelho: 'rgba(239,68,68,0.30)',
  neutro:   'transparent',
}

function globalStatus(kpis: KPIItem[]): Status {
  const com = kpis.filter((k) => k.status !== 'neutro')
  if (com.some((k) => k.status === 'vermelho')) return 'vermelho'
  if (com.some((k) => k.status === 'amarelo')) return 'amarelo'
  if (com.some((k) => k.status === 'verde')) return 'verde'
  return 'neutro'
}

interface Props {
  dadosEquipe: DadosOperador[]
  basicos: Meta[]
}

export default function EquipeTabela({ dadosEquipe, basicos }: Props) {
  return (
    <>
      {/* Tabela desktop */}
      <div
        className="hidden lg:block rounded-2xl border overflow-hidden"
        style={{
          background: 'rgba(255,255,255,0.02)',
          backdropFilter: 'blur(20px)',
          borderColor: 'rgba(255,255,255,0.06)',
          boxShadow: '0 8px 40px rgba(0,0,0,0.4)',
        }}
      >
        <div className="overflow-x-auto">
        <table className="w-full text-sm">
          <thead style={{ position: 'sticky', top: 0, zIndex: 4 }}>
            <tr
              style={{
                background: 'linear-gradient(180deg, rgba(10,14,24,0.98) 0%, rgba(17,24,39,0.95) 100%)',
                borderBottom: '1px solid rgba(201,168,76,0.12)',
              }}
            >
              <th
                className="text-left px-5 py-4 w-52"
                style={{
                  color: 'var(--text-muted)',
                  fontSize: '0.65rem',
                  fontWeight: 700,
                  textTransform: 'uppercase',
                  letterSpacing: '0.10em',
                }}
              >
                Operador
              </th>
              {basicos.map((m) => (
                <th
                  key={m.id}
                  className="text-center px-3 py-4 whitespace-nowrap"
                  style={{
                    color: 'var(--gold)',
                    fontSize: '0.65rem',
                    fontWeight: 700,
                    textTransform: 'uppercase',
                    letterSpacing: '0.10em',
                  }}
                >
                  {m.label}
                </th>
              ))}
              <th
                className="text-center px-4 py-4"
                style={{
                  color: 'var(--text-muted)',
                  fontSize: '0.65rem',
                  fontWeight: 700,
                  textTransform: 'uppercase',
                  letterSpacing: '0.10em',
                  minWidth: '110px',
                }}
              >
                Status
              </th>
              <th className="px-4 py-4 w-10" />
            </tr>
          </thead>
          <tbody>
            {dadosEquipe.map(({ op, kpis, encontrado }, idx) => {
              const gs = globalStatus(kpis)
              const com      = kpis.filter((k) => k.status !== 'neutro')
              const verde    = com.filter((k) => k.status === 'verde').length
              const amarelo  = com.filter((k) => k.status === 'amarelo').length
              const vermelho = com.filter((k) => k.status === 'vermelho').length

              const rowBg = idx % 2 === 0 ? 'rgba(5,5,8,0.6)' : 'rgba(12,16,24,0.4)'

              return (
                <tr
                  key={op.id}
                  className="group transition-all duration-200"
                  style={{
                    background: rowBg,
                    borderBottom: idx < dadosEquipe.length - 1 ? '1px solid rgba(255,255,255,0.03)' : 'none',
                  }}
                  onMouseEnter={(e) => {
                    const el = e.currentTarget as HTMLElement
                    el.style.background = 'rgba(201,168,76,0.05)'
                    el.style.boxShadow = `inset 3px 0 0 ${STATUS_GLOW[gs]}, inset -1px 0 0 transparent`
                  }}
                  onMouseLeave={(e) => {
                    const el = e.currentTarget as HTMLElement
                    el.style.background = rowBg
                    el.style.boxShadow = 'none'
                  }}
                >
                  <td className="px-5 py-3.5">
                    <div className="flex items-center gap-3">
                      <div
                        className="w-8 h-8 rounded-lg flex items-center justify-center text-xs font-bold shrink-0 border-2"
                        style={getAvatarStyle(op.id)}
                      >
                        {getIniciaisNome(op.nome)}
                      </div>
                      <div>
                        <p className="font-semibold text-sm leading-none" style={{ color: 'var(--text-primary)' }}>
                          {op.nome}
                        </p>
                        <p className="text-xs mt-0.5" style={{ color: '#4a90d9' }}>
                          {op.username}
                        </p>
                      </div>
                    </div>
                  </td>

                  {basicos.map((m) => {
                    const kpi = kpis.find((k) => normalizarChave(k.nome_coluna) === normalizarChave(m.nome_coluna))
                    return (
                      <td key={m.id} className="px-3 py-3.5 text-center">
                        {kpi ? (
                          <span
                            className="text-sm font-bold tabular-nums"
                            style={{
                              color: STATUS_COR[kpi.status],
                              textShadow: kpi.status !== 'neutro'
                                ? `0 0 12px ${STATUS_GLOW[kpi.status]}`
                                : 'none',
                            }}
                          >
                            {formatarExibicao(kpi.valor, kpi.unidade)}
                          </span>
                        ) : (
                          <span className="text-sm" style={{ color: 'var(--text-muted)' }}>—</span>
                        )}
                      </td>
                    )
                  })}

                  <td className="px-4 py-3.5 text-center">
                    {!encontrado ? (
                      <span
                        className="status-badge"
                        style={{ background: 'rgba(255,255,255,0.04)', color: 'var(--text-muted)', borderColor: 'rgba(255,255,255,0.08)' }}
                        role="status"
                      >
                        sem dados
                      </span>
                    ) : (
                      <div className="flex items-center justify-center gap-2">
                        <span
                          className={clsx('w-2 h-2 rounded-full shrink-0 animate-dotPulse', STATUS_DOT[gs])}
                          style={{ boxShadow: `0 0 6px ${STATUS_GLOW[gs]}` }}
                        />
                        <span className="text-xs tabular-nums" style={{ color: 'var(--text-muted)', fontVariantNumeric: 'tabular-nums' }}>
                          <span className="font-bold" style={{ color: '#10b981' }}>{verde}</span>
                          <span style={{ color: 'rgba(255,255,255,0.15)' }}>/</span>
                          <span className="font-bold" style={{ color: '#f59e0b' }}>{amarelo}</span>
                          <span style={{ color: 'rgba(255,255,255,0.15)' }}>/</span>
                          <span className="font-bold" style={{ color: '#ef4444' }}>{vermelho}</span>
                        </span>
                      </div>
                    )}
                  </td>

                  <td className="px-4 py-3.5 text-right">
                    <Link
                      href={`/painel/kpi/${op.username}`}
                      aria-label={`Ver KPI de ${op.nome}`}
                      className="transition-all opacity-30 group-hover:opacity-100 w-7 h-7 rounded-lg flex items-center justify-center border ml-auto"
                      style={{
                        color: 'var(--gold)',
                        background: 'rgba(201,168,76,0.08)',
                        borderColor: 'rgba(201,168,76,0.20)',
                        transition: 'opacity 200ms ease, transform 200ms ease',
                      }}
                      onMouseEnter={(e) => { (e.currentTarget as HTMLElement).style.transform = 'translateX(2px)' }}
                      onMouseLeave={(e) => { (e.currentTarget as HTMLElement).style.transform = 'translateX(0)' }}
                    >
                      <ArrowRight size={13} />
                    </Link>
                  </td>
                </tr>
              )
            })}
          </tbody>
        </table>
        </div>
      </div>

      {/* Cards mobile */}
      <div className="lg:hidden grid grid-cols-1 sm:grid-cols-2 gap-3">
        {dadosEquipe.map(({ op, kpis, encontrado }) => {
          const gs = globalStatus(kpis)
          return (
            <Link
              key={op.id}
              href={`/painel/kpi/${op.username}`}
              className="card group"
              onMouseEnter={(e) => {
                const el = e.currentTarget as HTMLElement
                el.style.transform = 'translateY(-3px)'
                el.style.borderColor = 'rgba(201,168,76,0.35)'
              }}
              onMouseLeave={(e) => {
                const el = e.currentTarget as HTMLElement
                el.style.transform = 'translateY(0)'
                el.style.borderColor = 'rgba(255,255,255,0.06)'
              }}
            >
              <div className="flex items-center gap-3 mb-3">
                <div
                  className="w-9 h-9 rounded-xl flex items-center justify-center text-xs font-bold shrink-0 border-2"
                  style={getAvatarStyle(op.id)}
                >
                  {getIniciaisNome(op.nome)}
                </div>
                <div className="flex-1 min-w-0">
                  <p className="font-semibold truncate text-sm" style={{ color: 'var(--text-primary)' }}>
                    {op.nome}
                  </p>
                  <p className="text-xs" style={{ color: '#4a90d9' }}>{op.username}</p>
                </div>
                <span
                  className={clsx('w-2.5 h-2.5 rounded-full shrink-0 animate-dotPulse', STATUS_DOT[gs])}
                  style={{ boxShadow: `0 0 8px ${STATUS_GLOW[gs]}` }}
                />
              </div>

              {encontrado && basicos.length > 0 ? (
                <div className="grid grid-cols-3 gap-1.5">
                  {basicos.slice(0, 6).map((m) => {
                    const kpi = kpis.find((k) => normalizarChave(k.nome_coluna) === normalizarChave(m.nome_coluna))
                    return (
                      <div
                        key={m.id}
                        className="rounded-xl p-2"
                        style={{ background: 'rgba(5,5,8,0.6)', border: '1px solid rgba(255,255,255,0.04)' }}
                      >
                        <p className="text-[9px] truncate uppercase" style={{ color: 'var(--text-muted)', letterSpacing: '0.05em' }}>
                          {m.label}
                        </p>
                        <p
                          className="text-sm font-bold mt-0.5 tabular-nums"
                          style={{ color: kpi ? STATUS_COR[kpi.status] : 'var(--text-muted)' }}
                        >
                          {kpi ? formatarExibicao(kpi.valor, kpi.unidade) : '—'}
                        </p>
                      </div>
                    )
                  })}
                </div>
              ) : (
                <p className="text-xs text-center py-2" style={{ color: 'var(--text-muted)' }}>
                  {encontrado ? 'Configure metas básicas' : 'Sem dados na planilha'}
                </p>
              )}
            </Link>
          )
        })}
      </div>
    </>
  )
}
