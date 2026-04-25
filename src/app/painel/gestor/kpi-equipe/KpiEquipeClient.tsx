'use client'

import { useState, useRef, useMemo } from 'react'
import { getIniciaisNome } from '@/lib/operadores'
import type { OperadorKpiRow } from '@/lib/kpi-consolidado-sheets'

// ── Thresholds ────────────────────────────────────────────────────────────────

const META_TX_RET_VERDE  = 66
const META_TX_RET_AMARELO = 60
const META_TMA_SEG       = 731   // 12:11
const META_ABS_PCT       = 5
const META_INDISP_PCT    = 14.5

// ── Types ─────────────────────────────────────────────────────────────────────

type FilterKey = 'txret' | 'tma' | 'abs' | 'indisp'
type Status = 'verde' | 'amarelo' | 'vermelho' | 'neutro'

const STATUS_COLOR: Record<Status, string> = {
  verde:    '#4ade80',
  amarelo:  '#facc15',
  vermelho: '#f87171',
  neutro:   '#d4d4d8',
}

// ── Status helpers ────────────────────────────────────────────────────────────

function txRetStatus(v: number | null): Status {
  if (v === null) return 'neutro'
  if (v >= META_TX_RET_VERDE) return 'verde'
  if (v >= META_TX_RET_AMARELO) return 'amarelo'
  return 'vermelho'
}
function tmaStatus(v: number | null): Status {
  if (v === null) return 'neutro'
  return v <= META_TMA_SEG ? 'verde' : 'vermelho'
}
function absStatus(v: number | null): Status {
  if (v === null) return 'neutro'
  return v < META_ABS_PCT ? 'verde' : 'vermelho'
}
function indispStatus(v: number | null): Status {
  if (v === null) return 'neutro'
  return v < META_INDISP_PCT ? 'verde' : 'vermelho'
}

// ── Format helpers ────────────────────────────────────────────────────────────

function fmtInt(v: number | null): string {
  return v !== null ? v.toLocaleString('pt-BR') : '—'
}
function fmtPct(v: number | null): string {
  if (v === null) return '—'
  return v.toLocaleString('pt-BR', { minimumFractionDigits: 1, maximumFractionDigits: 1 }) + '%'
}
function fmtTma(v: number | null): string {
  if (v === null) return '—'
  const m = Math.floor(Math.abs(v) / 60)
  const s = Math.round(Math.abs(v) % 60)
  return `${String(m).padStart(2, '0')}:${String(s).padStart(2, '0')}`
}

// ── Avatar ────────────────────────────────────────────────────────────────────

function avatarStyle(id: number): React.CSSProperties {
  return id % 2 !== 0
    ? { background: 'linear-gradient(135deg, #0f1729, #1a2540)', border: '1px solid rgba(66,139,255,0.25)', color: '#fff' }
    : { background: 'linear-gradient(135deg, #0a1020, #111830)', border: '1px solid rgba(66,139,255,0.15)', color: '#fff' }
}

// ── Props ─────────────────────────────────────────────────────────────────────

interface Props {
  operadores:      OperadorKpiRow[]
  dataAtualizacao: string | null
  mesLabel:        string
}

// ── Main component ────────────────────────────────────────────────────────────

export default function KpiEquipeClient({ operadores, dataAtualizacao, mesLabel }: Props) {
  const [activeFilter, setActiveFilter] = useState<FilterKey | null>(null)
  const [pinnedId,     setPinnedId]     = useState<number | null>(null)
  const [hoveredId,    setHoveredId]    = useState<number | null>(null)
  const hoverTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null)

  // Hover with debounce (150ms) to prevent flicker
  function handleMouseEnter(id: number) {
    if (hoverTimerRef.current) clearTimeout(hoverTimerRef.current)
    setHoveredId(id)
  }
  function handleMouseLeave(id: number) {
    hoverTimerRef.current = setTimeout(() => {
      setHoveredId(prev => prev === id ? null : prev)
    }, 150)
  }
  function handleClick(id: number) {
    setPinnedId(prev => {
      if (prev === id) { setHoveredId(null); return null }
      setHoveredId(null)
      return id
    })
  }

  function isExpanded(id: number): boolean {
    return pinnedId === id || (pinnedId === null && hoveredId === id)
  }

  function toggleFilter(key: FilterKey) {
    setActiveFilter(prev => prev === key ? null : key)
    setPinnedId(null)
    setHoveredId(null)
  }

  // Filter + sort
  const filtered = useMemo(() => {
    let list = [...operadores]
    if (activeFilter === 'txret') {
      list = list.filter(o => o.txRetBrutaPct !== null && o.txRetBrutaPct < META_TX_RET_AMARELO)
      list.sort((a, b) => (a.txRetBrutaPct ?? 100) - (b.txRetBrutaPct ?? 100))
    } else if (activeFilter === 'tma') {
      list = list.filter(o => o.tmaSeg !== null && o.tmaSeg > META_TMA_SEG)
      list.sort((a, b) => (b.tmaSeg ?? 0) - (a.tmaSeg ?? 0))
    } else if (activeFilter === 'abs') {
      list = list.filter(o => o.absPct !== null && o.absPct >= META_ABS_PCT)
      list.sort((a, b) => (b.absPct ?? 0) - (a.absPct ?? 0))
    } else if (activeFilter === 'indisp') {
      list = list.filter(o => o.indispPct !== null && o.indispPct >= META_INDISP_PCT)
      list.sort((a, b) => (b.indispPct ?? 0) - (a.indispPct ?? 0))
    } else {
      list.sort((a, b) => a.nome.localeCompare(b.nome, 'pt-BR'))
    }
    return list
  }, [operadores, activeFilter])

  const FILTER_CHIPS: { key: FilterKey; label: string }[] = [
    { key: 'txret',  label: 'TX RETENÇÃO' },
    { key: 'tma',    label: 'TMA' },
    { key: 'abs',    label: 'ABS' },
    { key: 'indisp', label: 'INDISP' },
  ]

  const FILTER_EMPTY_MSG: Record<FilterKey, string> = {
    txret:  'Todos os operadores estão na meta de Tx. Retenção ✓',
    tma:    'Todos os operadores estão na meta de TMA ✓',
    abs:    'Todos os operadores estão na meta de ABS ✓',
    indisp: 'Todos os operadores estão na meta de Indisponibilidade ✓',
  }

  return (
    <>
      <style dangerouslySetInnerHTML={{ __html: `
        @keyframes kpiEquipeRowIn {
          from { opacity: 0; transform: translateY(8px); }
          to   { opacity: 1; transform: translateY(0); }
        }
        .kpi-eq-expand {
          display: grid;
          grid-template-rows: 0fr;
          transition: grid-template-rows 200ms cubic-bezier(0.4,0,0.2,1);
        }
        .kpi-eq-expand.open { grid-template-rows: 1fr; }
        .kpi-eq-expand-inner { overflow: hidden; min-height: 0; }
      `}} />

      <div className="login-grid-bg" style={{ borderRadius: '16px', padding: '4px', display: 'flex', flexDirection: 'column', gap: '14px' }}>

        {/* ── Header ── */}
        <div style={{
          background: 'var(--void2)',
          border: '1px solid rgba(201,168,76,0.1)',
          borderRadius: '14px',
          padding: '14px 20px',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'space-between',
          flexWrap: 'wrap',
          gap: '12px',
        }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '14px', flexWrap: 'wrap' }}>
            <span style={{
              fontFamily: 'var(--ff-display)',
              fontSize: '16px', fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.06em',
              background: 'linear-gradient(135deg, #e8c96d 0%, #c9a84c 100%)',
              WebkitBackgroundClip: 'text', WebkitTextFillColor: 'transparent', backgroundClip: 'text',
            }}>
              KPI da Equipe
            </span>
            <div style={{ width: '1px', height: '16px', background: 'rgba(201,168,76,0.2)', flexShrink: 0 }} />
            <span style={{ fontSize: '11px', color: 'var(--text-muted)', textTransform: 'uppercase', letterSpacing: '0.06em' }}>
              {mesLabel}
            </span>
            {dataAtualizacao && (
              <>
                <div style={{ width: '1px', height: '16px', background: 'rgba(201,168,76,0.2)', flexShrink: 0 }} />
                <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
                  <div className="animate-pulse" style={{ width: '6px', height: '6px', borderRadius: '50%', background: '#10b981', flexShrink: 0 }} />
                  <span style={{ fontSize: '11px', color: 'var(--text-muted)' }}>
                    Sincronizado <strong style={{ color: 'var(--text-secondary)', fontWeight: 600 }}>{dataAtualizacao}</strong>
                  </span>
                </div>
              </>
            )}
          </div>
          <span style={{ fontSize: '11px', color: 'var(--text-muted)' }}>
            {operadores.length} operadores
          </span>
        </div>

        {/* ── Filtros ── */}
        <div style={{
          background: 'var(--void2)',
          border: '1px solid rgba(201,168,76,0.08)',
          borderRadius: '12px',
          padding: '10px 16px',
          display: 'flex',
          alignItems: 'center',
          gap: '10px',
          flexWrap: 'wrap',
        }}>
          <span style={{ fontSize: '10px', textTransform: 'uppercase', letterSpacing: '0.1em', color: 'var(--text-muted)', flexShrink: 0 }}>
            Fora da meta:
          </span>
          {FILTER_CHIPS.map(({ key, label }) => {
            const ativo = activeFilter === key
            return (
              <button
                key={key}
                type="button"
                onClick={() => toggleFilter(key)}
                style={{
                  padding: '4px 12px',
                  borderRadius: '20px',
                  fontSize: '10px',
                  fontWeight: 700,
                  letterSpacing: '0.08em',
                  textTransform: 'uppercase',
                  border: ativo ? '1px solid #c9a84c' : '1px solid rgba(255,255,255,0.07)',
                  background: ativo ? 'rgba(201,168,76,0.12)' : 'rgba(255,255,255,0.03)',
                  color: ativo ? '#e8c96d' : 'var(--text-muted)',
                  cursor: 'pointer',
                  transition: 'all 0.15s',
                  outline: ativo ? '1px solid rgba(201,168,76,0.25)' : 'none',
                  outlineOffset: '1px',
                }}
              >
                {label}
              </button>
            )
          })}
          {activeFilter && (
            <button
              type="button"
              onClick={() => setActiveFilter(null)}
              style={{
                padding: '4px 10px',
                borderRadius: '20px',
                fontSize: '10px',
                fontWeight: 600,
                letterSpacing: '0.06em',
                border: '1px solid rgba(255,255,255,0.08)',
                background: 'transparent',
                color: 'var(--text-muted)',
                cursor: 'pointer',
                marginLeft: 'auto',
              }}
            >
              LIMPAR
            </button>
          )}
        </div>

        {/* ── Lista ── */}
        <div style={{
          background: 'var(--void2)',
          border: '1px solid rgba(201,168,76,0.08)',
          borderRadius: '14px',
          overflow: 'hidden',
        }}>

          {/* Empty state for active filter */}
          {activeFilter && filtered.length === 0 && (
            <div style={{ padding: '40px 24px', textAlign: 'center' }}>
              <p style={{ fontSize: '14px', color: '#4ade80', fontWeight: 500 }}>
                {FILTER_EMPTY_MSG[activeFilter]}
              </p>
            </div>
          )}

          {/* Rows */}
          {filtered.map((op, idx) => {
            const expanded = isExpanded(op.id)
            const isPinned = pinnedId === op.id
            const isLast   = idx === filtered.length - 1

            const metrics = [
              { label: 'Pedidos',      value: fmtInt(op.pedidos),        color: STATUS_COLOR.neutro },
              { label: 'Churn',        value: fmtInt(op.churn),          color: STATUS_COLOR.neutro },
              { label: 'Tx. Retenção', value: fmtPct(op.txRetBrutaPct),  color: STATUS_COLOR[txRetStatus(op.txRetBrutaPct)] },
              { label: 'TMA',          value: fmtTma(op.tmaSeg),         color: STATUS_COLOR[tmaStatus(op.tmaSeg)] },
              { label: 'ABS',          value: fmtPct(op.absPct),         color: STATUS_COLOR[absStatus(op.absPct)] },
              { label: 'Indisp',       value: fmtPct(op.indispPct),      color: STATUS_COLOR[indispStatus(op.indispPct)] },
            ]
            const FILTER_IDX: Record<FilterKey, number> = { txret: 2, tma: 3, abs: 4, indisp: 5 }
            const visibleMetrics = activeFilter ? [metrics[FILTER_IDX[activeFilter]]] : metrics

            const GRUPOS = [
              {
                titulo: 'Ganhos & Retenção',
                items: [
                  { label: '% Variação Ticket',   valor: op.varTicket },
                  { label: 'Tx. Ret. Líq. 15d',   valor: op.txRetLiq15d },
                ],
              },
              {
                titulo: 'Qualidade',
                items: [
                  { label: 'Atendidas',         valor: op.atendidas },
                  { label: 'Transfer (%)',      valor: op.transfer },
                  { label: 'Short Call (%)',    valor: op.shortCall },
                  { label: 'Rechamada D+7 (%)', valor: op.rechamadaD7 },
                  { label: 'Tx. Tabulação (%)', valor: op.txTabulacao },
                  { label: 'CSAT',              valor: op.csat },
                ],
              },
              {
                titulo: 'Comportamento',
                items: [
                  { label: 'Engajamento',       valor: op.engajamento },
                  { label: 'NR17 (%)',          valor: op.nr17 },
                  { label: 'Pessoal (%)',       valor: op.pessoal },
                  { label: 'Outras Pausas (%)', valor: op.outrasPausas },
                ],
              },
              {
                titulo: 'Presença',
                items: [
                  { label: 'Tempo Projetado', valor: op.tempoProjetado },
                  { label: 'Tempo de Login',  valor: op.tempoLogin },
                ],
              },
            ]

            return (
              <div
                key={op.id}
                style={{
                  borderBottom: isLast ? 'none' : '1px solid rgba(255,255,255,0.04)',
                  animation: `kpiEquipeRowIn 0.3s ease both`,
                  animationDelay: `${idx * 40}ms`,
                }}
              >
                {/* Main row */}
                <div
                  role="button"
                  tabIndex={0}
                  onMouseEnter={() => op.encontrado && handleMouseEnter(op.id)}
                  onMouseLeave={() => op.encontrado && handleMouseLeave(op.id)}
                  onClick={() => op.encontrado && handleClick(op.id)}
                  onKeyDown={e => e.key === 'Enter' && op.encontrado && handleClick(op.id)}
                  style={{
                    display: 'flex',
                    alignItems: 'center',
                    gap: '16px',
                    padding: '12px 16px',
                    cursor: op.encontrado ? 'pointer' : 'default',
                    background: isPinned ? 'rgba(201,168,76,0.05)' : 'transparent',
                    transition: 'background 0.15s',
                    borderLeft: isPinned ? '2px solid rgba(201,168,76,0.4)' : '2px solid transparent',
                    outline: 'none',
                  }}
                  onMouseOver={e => {
                    if (!isPinned && op.encontrado)
                      (e.currentTarget as HTMLElement).style.background = 'rgba(255,255,255,0.02)'
                  }}
                  onMouseOut={e => {
                    if (!isPinned)
                      (e.currentTarget as HTMLElement).style.background = isPinned ? 'rgba(201,168,76,0.05)' : 'transparent'
                  }}
                >
                  {/* Avatar + name */}
                  <div style={{ display: 'flex', alignItems: 'center', gap: '10px', width: '200px', flexShrink: 0 }}>
                    <div style={{
                      width: '32px', height: '32px', borderRadius: '8px',
                      display: 'flex', alignItems: 'center', justifyContent: 'center',
                      fontSize: '10px', fontWeight: 700, flexShrink: 0,
                      fontFamily: 'var(--ff-display)',
                      ...avatarStyle(op.id),
                    }}>
                      {getIniciaisNome(op.nome)}
                    </div>
                    <div style={{ minWidth: 0 }}>
                      <p style={{ fontSize: '12px', fontWeight: 600, color: 'var(--text-primary)', lineHeight: 1.2, whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>
                        {op.nome.split(' ').slice(0, 2).join(' ')}
                      </p>
                      {!op.encontrado && (
                        <p style={{ fontSize: '9px', color: 'var(--text-muted)', marginTop: '2px', letterSpacing: '0.04em' }}>
                          Sem dados no período
                        </p>
                      )}
                    </div>
                  </div>

                  {/* metric columns — all 6 sem filtro, só 1 com filtro ativo */}
                  <div style={{ flex: 1, display: 'flex', gap: '0', justifyContent: 'flex-end' }}>
                    {visibleMetrics.map(({ label, value, color }) => (
                      <div key={label} style={{ minWidth: '76px', textAlign: 'center', padding: '0 4px' }}>
                        <p style={{ fontSize: '9px', textTransform: 'uppercase', letterSpacing: '0.08em', color: 'var(--text-muted)', marginBottom: '4px', whiteSpace: 'nowrap' }}>
                          {label}
                        </p>
                        <p style={{ fontSize: '12px', fontWeight: 600, color, fontVariantNumeric: 'tabular-nums', lineHeight: 1 }}>
                          {value}
                        </p>
                      </div>
                    ))}
                  </div>
                </div>

                {/* Expandable complementary area */}
                {op.encontrado && (
                  <div className={`kpi-eq-expand${expanded ? ' open' : ''}`}>
                    <div className="kpi-eq-expand-inner">
                      <div style={{
                        display: 'grid',
                        gridTemplateColumns: 'repeat(4, 1fr)',
                        gap: '10px',
                        padding: '4px 16px 14px',
                        paddingLeft: '218px',
                        borderTop: '1px solid rgba(201,168,76,0.06)',
                        background: 'rgba(255,255,255,0.01)',
                      }}>
                        {GRUPOS.map(grupo => (
                          <div key={grupo.titulo}>
                            <p style={{
                              fontSize: '9px', fontWeight: 700, textTransform: 'uppercase',
                              letterSpacing: '0.1em', color: 'rgba(201,168,76,0.6)',
                              marginBottom: '6px', paddingTop: '4px',
                            }}>
                              {grupo.titulo}
                            </p>
                            <div style={{ display: 'flex', flexDirection: 'column', gap: '4px' }}>
                              {grupo.items.map(({ label, valor }) => {
                                const semDados = !valor || valor === '—'
                                return (
                                  <div key={label} style={{
                                    background: 'rgba(255,255,255,0.02)',
                                    border: '1px solid rgba(201,168,76,0.06)',
                                    borderRadius: '8px',
                                    padding: '7px 10px',
                                    display: 'flex',
                                    flexDirection: 'column',
                                    gap: '3px',
                                  }}>
                                    <p style={{ fontSize: '9px', textTransform: 'uppercase', letterSpacing: '0.05em', color: 'rgba(255,255,255,0.4)', lineHeight: 1 }}>
                                      {label}
                                    </p>
                                    <p style={{ fontSize: '13px', fontWeight: 600, fontVariantNumeric: 'tabular-nums', color: semDados ? 'rgba(255,255,255,0.2)' : 'rgba(255,255,255,0.9)', lineHeight: 1 }}>
                                      {valor}
                                    </p>
                                  </div>
                                )
                              })}
                            </div>
                          </div>
                        ))}
                      </div>
                    </div>
                  </div>
                )}
              </div>
            )
          })}

          {/* Empty list (no filter) */}
          {!activeFilter && filtered.length === 0 && (
            <div style={{ padding: '40px 24px', textAlign: 'center' }}>
              <p style={{ fontSize: '13px', color: 'var(--text-muted)' }}>Nenhum operador encontrado.</p>
            </div>
          )}
        </div>
      </div>
    </>
  )
}
