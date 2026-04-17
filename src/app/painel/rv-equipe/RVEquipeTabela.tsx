'use client'

import { useState } from 'react'
import { getIniciaisNome } from '@/lib/operadores'
import { formatBRL } from '@/lib/rv-utils'
import type { Status } from '@/lib/kpi-utils'
import type { ResultadoRV } from '@/lib/rv-utils'
import { CheckCircle, XCircle, Minus, ChevronDown, Trophy, TrendingUp, TrendingDown, Clock, Ticket, ShoppingCart } from 'lucide-react'

export type OpRV = {
  id: number
  nome: string
  username: string
  gs: Status
  encontrado: boolean
  motivosVermelhos: string[]
  rv: ResultadoRV | null
}

type Filtro = 'todos' | 'elegiveis' | 'inelegiveis'

const FILTROS: { key: Filtro; label: string }[] = [
  { key: 'todos',       label: 'Todos' },
  { key: 'elegiveis',   label: 'Elegíveis' },
  { key: 'inelegiveis', label: 'Inelegíveis' },
]

function avatarEstilo(id: number): { background: string; border: string; color: string } {
  const impar = id % 2 !== 0
  return {
    background: impar
      ? 'linear-gradient(135deg, #0f1729, #1a2540)'
      : 'linear-gradient(135deg, #0a1020, #111830)',
    border: impar
      ? '1px solid rgba(66,139,255,0.25)'
      : '1px solid rgba(66,139,255,0.15)',
    color: '#ffffff',
  }
}

const ICONE_COMP: Record<string, React.ReactNode> = {
  retracao: <TrendingUp  size={11} />,
  indisp:   <TrendingDown size={11} />,
  tma:      <Clock       size={11} />,
  ticket:   <Ticket      size={11} />,
}

// ── Breakdown expandível ──────────────────────────────────────────────────────
function BreakdownCompacto({ rv }: { rv: ResultadoRV }) {
  return (
    <div
      className="px-5 py-4 space-y-3"
      style={{
        borderTop: '1px solid rgba(201,168,76,0.08)',
        background: '#0d0d1a',
      }}
    >
      {/* Componentes */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-2">
        {rv.componentes.map((c) => {
          const cor   = !c.aplicavel ? 'var(--text-muted)'
                      : c.ganhou    ? '#34d399'
                      : '#f87171'
          const bg    = !c.aplicavel ? 'rgba(255,255,255,0.02)'
                      : c.ganhou    ? 'rgba(16,185,129,0.06)'
                      : 'rgba(239,68,68,0.06)'
          const borda = !c.aplicavel ? 'rgba(255,255,255,0.06)'
                      : c.ganhou    ? 'rgba(16,185,129,0.18)'
                      : 'rgba(239,68,68,0.18)'
          return (
            <div key={c.id} className="rounded-xl border px-3 py-2.5"
              style={{ background: bg, borderColor: borda }}>
              <div className="flex items-center gap-1 mb-1" style={{ color: cor }}>
                {ICONE_COMP[c.id] ?? <Trophy size={11} />}
                <span className="text-[9px] font-bold uppercase" style={{ letterSpacing: '0.07em' }}>
                  {c.label}
                </span>
              </div>
              <p className="text-sm font-extrabold tabular-nums" style={{ color: cor }}>
                {c.valorDisplay}
              </p>
              <p className="text-[9px] mt-0.5" style={{ color: 'var(--text-secondary)' }}>
                {formatBRL(c.premio)}
              </p>
            </div>
          )
        })}
      </div>

      {/* Linha de totais */}
      <div className="flex items-center gap-4 text-xs flex-wrap" style={{ color: 'var(--text-muted)' }}>
        <span>Base: <b style={{ color: 'var(--text-secondary)' }}>{formatBRL(rv.rvBase)}</b></span>
        {rv.pedidosMeta > 0 && (
          <span>
            <ShoppingCart size={10} className="inline mr-1" />
            {rv.pedidosRealizados}/{rv.pedidosMeta} pedidos →{' '}
            <b style={{ color: '#93c5fd' }}>{formatBRL(rv.rvAposPedidos)}</b>
          </span>
        )}
        {rv.bonus > 0 && (
          <span>+ Bônus <b style={{ color: 'var(--gold-light)' }}>{formatBRL(rv.bonus)}</b></span>
        )}
        <span className="ml-auto font-bold" style={{ color: rv.elegivel ? 'var(--gold-light)' : 'var(--text-muted)' }}>
          Subtotal: {formatBRL(rv.rvTotal)}
        </span>
      </div>

      {/* Penalidades */}
      {rv.penalidades && rv.penalidades.length > 0 && (
        <div className="rounded-xl border px-3 py-2.5 space-y-1.5"
          style={{ background: 'rgba(239,68,68,0.04)', borderColor: 'rgba(201,168,76,0.08)' }}>
          <p className="text-[9px] font-bold uppercase" style={{ color: '#f87171', letterSpacing: '0.07em' }}>
            Penalidades
          </p>
          {rv.penalidades.map((p) => (
            <div key={p.metaLabel} className="flex items-center justify-between text-xs">
              <span style={{ color: 'var(--text-muted)' }}>{p.metaLabel} (vermelho)</span>
              <span style={{ color: '#f87171' }}>−{p.percentual}% = −{formatBRL(p.valorDeduzido)}</span>
            </div>
          ))}
        </div>
      )}

      {/* Desconto individual */}
      {rv.descontoIndividualAplicado && (
        <div className="flex items-center justify-between text-xs rounded-xl border px-3 py-2.5"
          style={{ background: 'rgba(239,68,68,0.04)', borderColor: 'rgba(201,168,76,0.08)' }}>
          <span style={{ color: 'var(--text-muted)' }}>
            Desconto:{' '}
            <span style={{ color: '#fca5a5' }}>{rv.descontoIndividualAplicado.motivo}</span>
          </span>
          <span className="font-bold" style={{ color: '#f87171' }}>
            −{formatBRL(rv.descontoIndividualAplicado.valor)}
          </span>
        </div>
      )}

      {/* RV Final */}
      <div className="flex items-center justify-end text-xs font-bold"
        style={{ color: rv.elegivel ? 'var(--gold-light)' : 'var(--text-muted)' }}>
        RV Final: {formatBRL(rv.rvFinal)}
      </div>
    </div>
  )
}

// ── Tabela principal ──────────────────────────────────────────────────────────
export default function RVEquipeTabela({ operadores }: { operadores: OpRV[] }) {
  const [filtro,      setFiltro]   = useState<Filtro>('todos')
  const [expandidoId, setExpanded] = useState<number | null>(null)

  const filtered = operadores.filter((op) => {
    if (filtro === 'elegiveis')   return op.rv?.elegivel === true
    if (filtro === 'inelegiveis') return op.rv?.elegivel === false && !op.rv?.semDados
    return true
  })

  const cntEleg   = operadores.filter(o => o.rv?.elegivel).length
  const cntInelig = operadores.filter(o => o.rv?.elegivel === false && !o.rv?.semDados).length

  return (
    <div className="space-y-4">
      {/* ── Pills de filtro ── */}
      <div className="flex items-center gap-2 flex-wrap">
        {FILTROS.map(({ key, label }) => {
          const active = filtro === key
          return (
            <button
              key={key}
              onClick={() => setFiltro(key)}
              className={active ? 'pill-filter pill-filter-active' : 'pill-filter pill-filter-inactive'}
              aria-pressed={active}
            >
              {label}
              {key === 'elegiveis' && (
                <span
                  className="tabular-nums text-[9px] font-bold px-1.5 py-0.5 rounded-full"
                  style={{ background: active ? 'rgba(34,197,94,0.20)' : 'rgba(34,197,94,0.12)', color: '#34d399' }}
                >
                  {cntEleg}
                </span>
              )}
              {key === 'inelegiveis' && (
                <span
                  className="tabular-nums text-[9px] font-bold px-1.5 py-0.5 rounded-full"
                  style={{ background: active ? 'rgba(239,68,68,0.20)' : 'rgba(239,68,68,0.12)', color: '#f87171' }}
                >
                  {cntInelig}
                </span>
              )}
            </button>
          )
        })}
      </div>

      {/* ── Tabela ── */}
      <div
        style={{
          background: '#0d0d1a',
          border: '1px solid rgba(201,168,76,0.08)',
          borderRadius: '16px',
          overflow: 'hidden',
        }}
      >
        {/* Cabeçalho */}
        <div
          style={{
            display: 'grid',
            gridTemplateColumns: '1fr 160px 1fr 44px',
            padding: '11px 20px',
            background: 'rgba(201,168,76,0.03)',
            borderBottom: '1px solid rgba(201,168,76,0.08)',
          }}
        >
          {(['Operador', 'RV Total', 'Elegibilidade', ''] as const).map((h, i) => (
            <span
              key={i}
              style={{
                fontSize: '9px',
                fontWeight: 700,
                textTransform: 'uppercase',
                letterSpacing: '0.14em',
                color: h === 'RV Total' ? '#c9a84c' : 'var(--text-muted)',
                textAlign: i === 1 ? 'center' : 'left',
              }}
            >
              {h}
            </span>
          ))}
        </div>

        {/* Linhas */}
        {filtered.length === 0 ? (
          <div className="py-12 text-center" style={{ color: 'var(--text-muted)', fontSize: '0.875rem' }}>
            Nenhum operador neste filtro.
          </div>
        ) : (
          filtered.map((op, idx) => {
            const rv       = op.rv
            const elegivel = rv?.elegivel ?? false
            const semDados = rv?.semDados ?? !op.encontrado
            const isOpen   = expandidoId === op.id
            const av       = avatarEstilo(op.id)

            const borderLeft = semDados
              ? '3px solid rgba(255,255,255,0.06)'
              : elegivel
                ? '3px solid var(--verde)'
                : '3px solid var(--vermelho)'

            // Badge elegibilidade
            let badgeBg: string, badgeColor: string, badgeBorder: string, badgeLabel: string
            let BadgeIcon: React.ElementType = Minus
            if (semDados) {
              badgeBg = 'rgba(255,255,255,0.04)'; badgeColor = 'var(--text-muted)'
              badgeBorder = 'rgba(255,255,255,0.08)'; badgeLabel = 'Sem dados'
            } else if (elegivel) {
              badgeBg = 'rgba(34,197,94,0.10)'; badgeColor = '#34d399'
              badgeBorder = 'rgba(34,197,94,0.25)'; badgeLabel = 'Elegível'; BadgeIcon = CheckCircle
            } else {
              badgeBg = 'rgba(239,68,68,0.10)'; badgeColor = '#f87171'
              badgeBorder = 'rgba(239,68,68,0.25)'; badgeLabel = 'Inelegível'; BadgeIcon = XCircle
            }

            return (
              <div
                key={op.id}
                style={{ borderBottom: idx < filtered.length - 1 ? '1px solid rgba(255,255,255,0.03)' : 'none' }}
              >
                {/* Linha principal */}
                <div
                  className="transition-colors"
                  style={{
                    display: 'grid',
                    gridTemplateColumns: '1fr 160px 1fr 44px',
                    alignItems: 'center',
                    padding: '10px 20px',
                    borderLeft,
                    cursor: rv && !semDados ? 'pointer' : 'default',
                  }}
                  onMouseEnter={(e) => {
                    (e.currentTarget as HTMLElement).style.background = 'rgba(201,168,76,0.04)'
                  }}
                  onMouseLeave={(e) => {
                    (e.currentTarget as HTMLElement).style.background = 'transparent'
                  }}
                  onClick={() => {
                    if (rv && !semDados) setExpanded(isOpen ? null : op.id)
                  }}
                >
                  {/* Avatar + Nome */}
                  <div className="flex items-center gap-3 min-w-0">
                    <div style={{
                      width: '30px',
                      height: '30px',
                      borderRadius: '8px',
                      display: 'flex',
                      alignItems: 'center',
                      justifyContent: 'center',
                      fontSize: '10px',
                      fontWeight: 700,
                      flexShrink: 0,
                      fontFamily: 'var(--ff-display)',
                      ...av,
                    }}>
                      {getIniciaisNome(op.nome)}
                    </div>
                    <div className="min-w-0">
                      <p style={{ fontSize: '12px', fontWeight: 500, color: 'var(--text-primary)', lineHeight: 1.3, whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>
                        {op.nome.split(' ').slice(0, 2).join(' ')}
                      </p>
                      <p style={{ fontSize: '10px', color: 'var(--text-muted)', marginTop: '1px' }}>
                        {op.username}
                      </p>
                    </div>
                  </div>

                  {/* RV Total */}
                  <div className="text-center">
                    {rv && !semDados ? (
                      <div className="flex flex-col items-center gap-0.5">
                        {elegivel ? (
                          <span style={{
                            display: 'inline-block',
                            padding: '3px 10px',
                            borderRadius: '20px',
                            fontSize: '12px',
                            fontWeight: 700,
                            fontVariantNumeric: 'tabular-nums',
                            background: 'rgba(34,197,94,0.10)',
                            border: '1px solid rgba(34,197,94,0.30)',
                            color: '#34d399',
                          }}>
                            {formatBRL(rv.rvFinal)}
                          </span>
                        ) : (
                          <span style={{ fontSize: '16px', fontWeight: 700, color: 'var(--text-muted)', fontVariantNumeric: 'tabular-nums' }}>—</span>
                        )}
                        {rv.totalPenalidade > 0 && (
                          <p className="text-[9px]" style={{ color: '#f87171', fontVariantNumeric: 'tabular-nums' }}>
                            −{formatBRL(rv.totalPenalidade)} pen.
                          </p>
                        )}
                        {rv.bonus > 0 && rv.totalPenalidade === 0 && elegivel && (
                          <p className="text-[9px]" style={{ color: 'var(--gold)', fontVariantNumeric: 'tabular-nums' }}>
                            + bônus {formatBRL(rv.bonus)}
                          </p>
                        )}
                      </div>
                    ) : (
                      <span style={{ fontSize: '16px', fontWeight: 700, color: 'var(--text-muted)' }}>—</span>
                    )}
                  </div>

                  {/* Elegibilidade + motivos */}
                  <div className="flex items-center gap-2 flex-wrap">
                    <span className="inline-flex items-center gap-1.5 text-[10px] font-bold px-2.5 py-1 rounded-full border uppercase shrink-0"
                      style={{ background: badgeBg, color: badgeColor, borderColor: badgeBorder, letterSpacing: '0.06em' }}>
                      <BadgeIcon size={10} />
                      {badgeLabel}
                    </span>
                    {!semDados && !elegivel && rv?.motivosInelegivel && rv.motivosInelegivel.length > 0 && (
                      rv.motivosInelegivel.slice(0, 2).map((m) => (
                        <span key={m} className="text-[9px] px-1.5 py-0.5 rounded font-medium"
                          style={{ background: 'rgba(239,68,68,0.08)', color: '#f87171', border: '1px solid rgba(239,68,68,0.18)' }}>
                          {m}
                        </span>
                      ))
                    )}
                  </div>

                  {/* Expandir */}
                  {rv && !semDados ? (
                    <button
                      type="button"
                      onClick={(e) => { e.stopPropagation(); setExpanded(isOpen ? null : op.id) }}
                      className="p-1.5 rounded-lg transition-all flex items-center justify-center"
                      aria-label={isOpen ? 'Recolher detalhes' : 'Ver detalhes'}
                      aria-expanded={isOpen}
                      style={{
                        color: isOpen ? 'var(--gold-light)' : 'var(--text-muted)',
                        background: isOpen ? 'rgba(201,168,76,0.10)' : 'transparent',
                        border: isOpen ? '1px solid rgba(201,168,76,0.20)' : '1px solid transparent',
                        transition: 'all 200ms cubic-bezier(0.4,0,0.2,1)',
                      }}
                    >
                      <ChevronDown size={14} style={{
                        transition: 'transform 0.30s cubic-bezier(0.4,0,0.2,1)',
                        transform: isOpen ? 'rotate(180deg)' : 'rotate(0deg)',
                      }} />
                    </button>
                  ) : (
                    <div className="w-8" />
                  )}
                </div>

                {/* Breakdown expandível */}
                {rv && !semDados && isOpen && (
                  <BreakdownCompacto rv={rv} />
                )}
              </div>
            )
          })
        )}
      </div>
    </div>
  )
}
