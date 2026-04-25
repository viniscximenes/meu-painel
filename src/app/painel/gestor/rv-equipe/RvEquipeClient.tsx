'use client'

import { useState, useRef, useMemo } from 'react'
import { getIniciaisNome } from '@/lib/operadores'
import { formatBRL } from '@/lib/rv-utils'
import type { ResultadoRV } from '@/lib/rv-utils'

type RvResult = Omit<ResultadoRV, 'config'>

export interface OperadorRvData {
  id: number
  nome: string
  username: string
  encontrado: boolean
  resultado: RvResult | null
}

type FilterKey = 'inelegivel' | 'deflator'

// ── Helpers ───────────────────────────────────────────────────────────────────

function avatarStyle(id: number): React.CSSProperties {
  return id % 2 !== 0
    ? { background: 'linear-gradient(135deg, #0f1729, #1a2540)', border: '1px solid rgba(66,139,255,0.25)', color: '#fff' }
    : { background: 'linear-gradient(135deg, #0a1020, #111830)', border: '1px solid rgba(66,139,255,0.15)', color: '#fff' }
}

// ── Expansion content ─────────────────────────────────────────────────────────

function BRow({
  label, value, color, icon, bold, topBorder,
}: {
  label: string; value: string; color?: string
  icon?: string; bold?: boolean; topBorder?: boolean
}) {
  return (
    <div style={{
      display: 'flex', justifyContent: 'space-between', alignItems: 'baseline',
      padding: topBorder ? '8px 0 2px' : '3px 0',
      borderTop: topBorder ? '1px solid rgba(255,255,255,0.07)' : undefined,
      marginTop: topBorder ? '6px' : undefined,
    }}>
      <span style={{ color: color ?? '#71717a', fontSize: '12px', fontWeight: bold ? 600 : 400 }}>
        {icon && <span style={{ marginRight: '5px' }}>{icon}</span>}
        {label}
      </span>
      <span style={{
        color: color ?? '#71717a', fontSize: '12px',
        fontWeight: bold ? 700 : 400,
      }}>
        {value}
      </span>
    </div>
  )
}

function ExpansionContent({ op, mesLabel }: { op: OperadorRvData; mesLabel: string }) {
  const noData = (
    <p style={{ fontSize: '12px', color: '#52525b', padding: '2px 0' }}>
      Sem dados na planilha para este período.
    </p>
  )

  if (!op.encontrado || !op.resultado || op.resultado.semDados) return noData

  const r = op.resultado
  const isInelegivel = !r.elegivel

  if (isInelegivel) {
    return (
      <div style={{ display: 'flex', flexDirection: 'column', gap: '10px' }}>
        <div>
          <p style={{ fontSize: '10px', color: '#f87171', fontWeight: 700, marginBottom: '5px', textTransform: 'uppercase', letterSpacing: '0.06em' }}>
            Motivos da inelegibilidade
          </p>
          {r.motivosInelegivel.map((m, i) => (
            <p key={i} style={{ fontSize: '12px', color: '#fca5a5', margin: '2px 0' }}>
              ❌ {m}
            </p>
          ))}
        </div>
        <div style={{ borderTop: '1px solid rgba(255,255,255,0.05)', paddingTop: '8px' }}>
          <p style={{ fontSize: '10px', color: '#52525b', marginBottom: '6px', textTransform: 'uppercase', letterSpacing: '0.06em' }}>
            Valores no período
          </p>
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(2, 1fr)', gap: '3px 16px' }}>
            {r.componentes.filter(c => c.aplicavel).map(c => (
              <span key={c.id} style={{ fontSize: '12px', color: '#52525b' }}>
                <span style={{ color: '#a1a1aa' }}>{c.label}:</span> {c.valorDisplay}
              </span>
            ))}
          </div>
          <p style={{ fontSize: '11px', color: '#3f3f46', marginTop: '8px', fontStyle: 'italic' }}>
            RV não calculado neste mês.
          </p>
        </div>
      </div>
    )
  }

  // Eligible
  const hasBonus = r.bonus > 0
  const hasPenalidades = r.penalidades.length > 0
  const hasDesconto = r.descontoIndividualAplicado !== null
  const hasDeductions = hasPenalidades || hasDesconto
  const showSubtotal = hasDeductions && (hasBonus || r.rvAposPedidos !== r.rvTotal)

  return (
    <div>
      <BRow label="RV Base" value={formatBRL(r.rvBase)} color="#a1a1aa" />
      <BRow
        label={`Multiplicador (${r.pedidosRealizados} / ${r.pedidosMeta} pedidos)`}
        value={`× ${r.multiplicador.toFixed(2).replace('.', ',')}`}
        color="#71717a"
      />
      <BRow label="RV após pedidos" value={formatBRL(r.rvAposPedidos)} color="#a1a1aa" />
      {hasBonus && (
        <BRow label="Bônus de Qualidade" value={`+ ${formatBRL(r.bonus)}`} color="#c9a84c" />
      )}
      {showSubtotal && (
        <BRow label="Subtotal" value={formatBRL(r.rvTotal)} color="#a1a1aa" />
      )}
      {r.penalidades.map((p, i) => (
        <BRow
          key={i}
          label={`Deflator ${p.metaLabel} (${p.percentual}%)`}
          value={`− ${formatBRL(p.valorDeduzido)}`}
          color="#f87171"
          icon="⚠"
        />
      ))}
      {hasDesconto && (
        <BRow
          label={`Desconto: ${r.descontoIndividualAplicado!.motivo}`}
          value={`− ${formatBRL(r.descontoIndividualAplicado!.valor)}`}
          color="#f87171"
          icon="⚠"
        />
      )}
      <BRow label="RV FINAL" value={formatBRL(r.rvFinal)} color="#f4d47c" bold topBorder />
    </div>
  )
}

// ── Props ─────────────────────────────────────────────────────────────────────

interface Props {
  operadores: OperadorRvData[]
  dataAtualizacao: string | null
  mesLabel: string
}

// ── Main component ────────────────────────────────────────────────────────────

export default function RvEquipeClient({ operadores, dataAtualizacao, mesLabel }: Props) {
  const [activeFilter, setActiveFilter] = useState<FilterKey | null>(null)
  const [pinnedId,     setPinnedId]     = useState<number | null>(null)
  const [hoveredId,    setHoveredId]    = useState<number | null>(null)
  const hoverTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null)

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
  function isExpanded(id: number) {
    return pinnedId === id || (pinnedId === null && hoveredId === id)
  }
  function toggleFilter(key: FilterKey) {
    setActiveFilter(prev => prev === key ? null : key)
    setPinnedId(null)
    setHoveredId(null)
  }

  const filtered = useMemo(() => {
    let list = [...operadores]
    if (activeFilter === 'inelegivel') {
      list = list.filter(o => o.resultado && !o.resultado.elegivel && !o.resultado.semDados)
      list.sort((a, b) => a.nome.localeCompare(b.nome, 'pt-BR'))
    } else if (activeFilter === 'deflator') {
      list = list.filter(o => {
        const r = o.resultado
        return r && (r.penalidades.length > 0 || r.descontoIndividualAplicado !== null)
      })
      list.sort((a, b) => {
        const dedA = (a.resultado?.totalPenalidade ?? 0) + (a.resultado?.descontoIndividualAplicado?.valor ?? 0)
        const dedB = (b.resultado?.totalPenalidade ?? 0) + (b.resultado?.descontoIndividualAplicado?.valor ?? 0)
        return dedB - dedA
      })
    } else {
      list.sort((a, b) => (b.resultado?.rvFinal ?? -1) - (a.resultado?.rvFinal ?? -1))
    }
    return list
  }, [operadores, activeFilter])

  const FILTERS: { key: FilterKey; label: string }[] = [
    { key: 'inelegivel', label: 'INELEGÍVEL' },
    { key: 'deflator',   label: 'COM DEFLATOR' },
  ]
  const EMPTY_MSG: Record<FilterKey, string> = {
    inelegivel: 'Todos os operadores estão elegíveis este mês ✨',
    deflator:   'Nenhum operador com deflator aplicado ✨',
  }

  return (
    <>
      <style dangerouslySetInnerHTML={{ __html: `
        .rv-eq-expand {
          display: grid;
          grid-template-rows: 0fr;
          transition: grid-template-rows 200ms cubic-bezier(0.4,0,0.2,1);
        }
        .rv-eq-expand.open { grid-template-rows: 1fr; }
        .rv-eq-expand-inner { overflow: hidden; min-height: 0; }
      `}} />

      <div className="login-grid-bg" style={{
        borderRadius: '16px', padding: '4px',
        display: 'flex', flexDirection: 'column', gap: '14px',
      }}>

        {/* ── Header ── */}
        <div style={{
          background: 'var(--void2)',
          border: '1px solid rgba(201,168,76,0.1)',
          borderRadius: '14px',
          padding: '14px 20px',
          display: 'flex', alignItems: 'center', justifyContent: 'space-between',
          flexWrap: 'wrap', gap: '12px',
        }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '14px', flexWrap: 'wrap' }}>
            <span style={{
              fontFamily: 'var(--ff-display)', fontSize: '16px', fontWeight: 700,
              textTransform: 'uppercase', letterSpacing: '0.06em',
              background: 'linear-gradient(135deg, #e8c96d 0%, #c9a84c 100%)',
              WebkitBackgroundClip: 'text', WebkitTextFillColor: 'transparent', backgroundClip: 'text',
            }}>
              RV da Equipe
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
                  <span style={{ fontSize: '11px', color: 'var(--text-muted)' }}>Sincronizado {dataAtualizacao}</span>
                </div>
              </>
            )}
          </div>
          <span style={{ fontSize: '12px', color: 'var(--text-muted)' }}>
            {operadores.length} operadores
          </span>
        </div>

        {/* ── Filters ── */}
        <div style={{
          background: 'var(--void2)',
          border: '1px solid rgba(201,168,76,0.08)',
          borderRadius: '14px',
          padding: '10px 16px',
          display: 'flex', alignItems: 'center', gap: '8px', flexWrap: 'wrap',
        }}>
          <span style={{ fontSize: '10px', color: '#52525b', textTransform: 'uppercase', letterSpacing: '0.07em', marginRight: '4px' }}>
            Filtrar:
          </span>
          {FILTERS.map(f => (
            <button
              key={f.key}
              onClick={() => toggleFilter(f.key)}
              style={{
                fontSize: '10px', fontWeight: 700, letterSpacing: '0.05em',
                padding: '4px 12px', borderRadius: '99px', border: '1px solid',
                cursor: 'pointer', transition: 'all 150ms',
                ...(activeFilter === f.key
                  ? { background: 'rgba(201,168,76,0.12)', borderColor: 'rgba(201,168,76,0.45)', color: '#e8c96d', boxShadow: '0 0 0 2px rgba(201,168,76,0.15)' }
                  : { background: 'transparent', borderColor: 'rgba(255,255,255,0.08)', color: '#71717a' }),
              }}
            >
              {f.label}
            </button>
          ))}
          {activeFilter && (
            <button
              onClick={() => toggleFilter(activeFilter)}
              style={{
                fontSize: '10px', padding: '4px 12px', borderRadius: '99px',
                border: '1px solid rgba(255,255,255,0.06)', background: 'transparent',
                color: '#52525b', cursor: 'pointer', marginLeft: 'auto',
              }}
            >
              LIMPAR
            </button>
          )}
        </div>

        {/* ── Operator list ── */}
        <div style={{
          background: 'var(--void2)',
          border: '1px solid rgba(201,168,76,0.08)',
          borderRadius: '14px',
          overflow: 'hidden',
        }}>
          {filtered.length === 0 && activeFilter ? (
            <div style={{ padding: '48px 20px', textAlign: 'center', color: '#52525b', fontSize: '13px' }}>
              {EMPTY_MSG[activeFilter]}
            </div>
          ) : (
            filtered.map((op, idx) => {
              const r = op.resultado
              const expanded = isExpanded(op.id)
              const isInelegivel = r && !r.elegivel && !r.semDados
              const hasDeflator = r && (r.penalidades.length > 0 || r.descontoIndividualAplicado !== null)
              const totalDeducao = r
                ? r.totalPenalidade + (r.descontoIndividualAplicado?.valor ?? 0)
                : 0

              let subtitulo: string
              if (!op.encontrado || !r || r.semDados) {
                subtitulo = 'Sem dados no período'
              } else if (isInelegivel) {
                subtitulo = `⚠ Inelegível: ${r.motivosInelegivel[0] ?? 'critério não atingido'}`
              } else {
                const mes = mesLabel.toLowerCase().replace(' de ', ' ')
                subtitulo = `RV estimado para ${mes}`
              }

              return (
                <div
                  key={op.id}
                  onMouseEnter={() => handleMouseEnter(op.id)}
                  onMouseLeave={() => handleMouseLeave(op.id)}
                  onClick={() => handleClick(op.id)}
                  style={{
                    borderBottom: idx < filtered.length - 1 ? '1px solid rgba(255,255,255,0.04)' : undefined,
                    cursor: 'pointer',
                    background: expanded ? 'rgba(201,168,76,0.025)' : 'transparent',
                    transition: 'background 150ms',
                  }}
                >
                  {/* Main row */}
                  <div style={{
                    display: 'flex', alignItems: 'center',
                    padding: '12px 20px', gap: '14px',
                  }}>
                    {/* Avatar */}
                    <div style={{
                      width: '36px', height: '36px', borderRadius: '50%', flexShrink: 0,
                      display: 'flex', alignItems: 'center', justifyContent: 'center',
                      fontSize: '12px', fontWeight: 700,
                      ...avatarStyle(op.id),
                    }}>
                      {getIniciaisNome(op.nome)}
                    </div>

                    {/* Name + subtitle */}
                    <div style={{ flex: 1, minWidth: 0 }}>
                      <p style={{ fontSize: '13px', fontWeight: 600, color: 'var(--text-primary)', margin: 0, lineHeight: 1.3 }}>
                        {op.nome}
                      </p>
                      <p style={{
                        fontSize: '11px', margin: 0, marginTop: '2px', lineHeight: 1.2,
                        color: isInelegivel ? '#f87171' : '#52525b',
                        whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis',
                      }}>
                        {subtitulo}
                      </p>
                    </div>

                    {/* Badges */}
                    <div style={{ display: 'flex', alignItems: 'center', gap: '6px', flexShrink: 0 }}>
                      {op.encontrado && r && !r.semDados && (
                        <span style={{
                          fontSize: '9px', fontWeight: 700, letterSpacing: '0.06em',
                          padding: '3px 8px', borderRadius: '6px',
                          ...(isInelegivel
                            ? { background: 'rgba(248,113,113,0.08)', color: '#f87171', border: '1px solid rgba(248,113,113,0.2)' }
                            : { background: 'rgba(74,222,128,0.07)', color: '#4ade80', border: '1px solid rgba(74,222,128,0.18)' }),
                        }}>
                          {isInelegivel ? 'INELEGÍVEL' : 'ELEGÍVEL'}
                        </span>
                      )}
                      {hasDeflator && totalDeducao > 0 && (
                        <span style={{
                          fontSize: '9px', fontWeight: 700, letterSpacing: '0.04em',
                          padding: '3px 7px', borderRadius: '6px',
                          background: 'rgba(248,113,113,0.08)', color: '#f87171',
                          border: '1px solid rgba(248,113,113,0.18)',
                        }}>
                          −{formatBRL(totalDeducao)}
                        </span>
                      )}
                    </div>

                    {/* RV value */}
                    <div style={{ flexShrink: 0, textAlign: 'right', minWidth: '110px' }}>
                      {r !== null ? (
                        <span style={{
                          fontSize: '15px', fontWeight: 700,
                          // #60a5fa → #93c5fd: mesmo gradiente do hero de Meu RV do gestor (MeuRVGestorClient.tsx:155)
                          // TODO: extrair pra token CSS quando o design system for formalizado
                          color: '#60a5fa',
                        }}>
                          {formatBRL(r.rvFinal)}
                        </span>
                      ) : (
                        <span style={{ fontSize: '14px', color: '#3f3f46' }}>R$ —</span>
                      )}
                    </div>
                  </div>

                  {/* Expansion */}
                  <div className={`rv-eq-expand${expanded ? ' open' : ''}`}>
                    <div className="rv-eq-expand-inner">
                      <div style={{
                        padding: '0 20px 14px',
                        paddingLeft: `${20 + 36 + 14}px`,
                        borderTop: '1px solid rgba(255,255,255,0.04)',
                        marginTop: '-1px',
                      }}>
                        <div style={{ paddingTop: '10px' }}>
                          <ExpansionContent op={op} mesLabel={mesLabel} />
                        </div>
                      </div>
                    </div>
                  </div>
                </div>
              )
            })
          )}
        </div>

      </div>
    </>
  )
}
