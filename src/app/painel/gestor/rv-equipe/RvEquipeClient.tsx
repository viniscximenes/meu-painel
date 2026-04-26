'use client'

import { useState, useRef, useMemo } from 'react'
import { formatBRL } from '@/lib/rv-utils'
import type { ResultadoRV } from '@/lib/rv-utils'
import { PainelHeader, LinhaHorizontalDourada } from '@/components/painel/PainelHeader'
import { PainelSectionTitle } from '@/components/painel/PainelSectionTitle'

type RvResult = Omit<ResultadoRV, 'config'>

export interface OperadorRvData {
  id:        number
  nome:      string
  username:  string
  encontrado: boolean
  resultado: RvResult | null
}

type FilterKey = 'inelegivel' | 'deflator'

// ── Fontes ────────────────────────────────────────────────────────────────────

const FF_SYNE = "'Syne', sans-serif"
const FF_DM   = "'DM Sans', sans-serif"

// ── Cores por status ──────────────────────────────────────────────────────────

const COR_VERDE    = '#7DDB5B'
const COR_AMARELO  = '#FFB922'
const COR_VERMELHO = 'rgba(250,76,76,0.9)'
const COR_NEUTRO   = '#A6A2A2'
const COR_LAVANDA  = '#B0AAFF'

// ── Nome: dois primeiros tokens ───────────────────────────────────────────────

function nomeDisplay(nome: string): string {
  return nome.trim().split(/\s+/).slice(0, 2).join(' ').toUpperCase()
}

// ── Breakdown helpers (padrão CALCULO RV de /meu-rv) ─────────────────────────

function CalcLinha({ label, valor, destaque }: { label: string; valor: string; destaque?: boolean }) {
  return (
    <div style={{ display: 'flex', alignItems: 'baseline', padding: destaque ? '8px 0' : '5px 0' }}>
      <span style={{
        flex: '0 0 auto',
        fontFamily: FF_SYNE,
        fontWeight: 600,
        fontSize: '13px',
        textTransform: 'uppercase',
        color: destaque ? '#a1a3b8' : '#72708f',
      }}>
        {label}
      </span>
      {destaque
        ? <span style={{ flex: 1 }} />
        : <span style={{
            flex: 1,
            borderBottom: '1px dotted rgba(114,112,143,0.3)',
            marginLeft: '12px', marginRight: '12px', marginBottom: '4px',
            alignSelf: 'end',
          }} />
      }
      <span style={{
        flex: '0 0 auto',
        fontFamily: FF_DM,
        fontWeight: destaque ? 600 : 500,
        fontSize: destaque ? '14px' : '13px',
        color: destaque ? '#a1a3b8' : '#72708f',
        fontVariantNumeric: 'tabular-nums',
      }}>
        {valor}
      </span>
    </div>
  )
}

function DeflatorBox({ label, valor }: { label: string; valor: number }) {
  return (
    <div style={{
      background: 'rgba(242,96,96,0.08)',
      border: '1px solid rgba(227,57,57,0.4)',
      borderRadius: '6px',
      padding: '8px 14px',
      display: 'flex',
      justifyContent: 'space-between',
      alignItems: 'center',
      gap: '12px',
    }}>
      <span style={{ display: 'inline-flex', alignItems: 'baseline', gap: '5px', minWidth: 0 }}>
        <span style={{ fontFamily: FF_SYNE, fontWeight: 600, fontSize: '12px', color: '#E33939', textTransform: 'uppercase', whiteSpace: 'nowrap' }}>
          ⚠ {label}
        </span>
      </span>
      <span style={{ fontFamily: FF_DM, fontWeight: 600, fontSize: '12px', color: '#E33939', fontVariantNumeric: 'tabular-nums', flexShrink: 0 }}>
        {'−'}{formatBRL(valor)}
      </span>
    </div>
  )
}

function SectionGap() {
  return <div style={{ height: '12px' }} />
}

function ExpansionContent({ op }: { op: OperadorRvData }) {
  const noData = (
    <p style={{ fontFamily: FF_SYNE, fontSize: '12px', color: '#52525b', fontStyle: 'italic', padding: '2px 0' }}>
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
          <p style={{ fontFamily: FF_SYNE, fontSize: '10px', color: '#E33939', fontWeight: 700, marginBottom: '6px', textTransform: 'uppercase', letterSpacing: '0.06em' }}>
            Motivos da inelegibilidade
          </p>
          {r.motivosInelegivel.map((m, i) => (
            <p key={i} style={{ fontFamily: FF_DM, fontSize: '12px', color: '#fca5a5', margin: '2px 0' }}>
              ❌ {m}
            </p>
          ))}
        </div>
        <div style={{ borderTop: '1px solid rgba(255,255,255,0.05)', paddingTop: '8px' }}>
          <p style={{ fontFamily: FF_SYNE, fontSize: '10px', color: '#52525b', marginBottom: '6px', textTransform: 'uppercase', letterSpacing: '0.06em' }}>
            Valores no período
          </p>
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(2, 1fr)', gap: '3px 16px' }}>
            {r.componentes.filter(c => c.aplicavel).map(c => (
              <span key={c.id} style={{ fontFamily: FF_DM, fontSize: '12px', color: '#52525b' }}>
                <span style={{ color: '#a1a1aa' }}>{c.label}:</span> {c.valorDisplay}
              </span>
            ))}
          </div>
          <p style={{ fontFamily: FF_DM, fontSize: '11px', color: '#3f3f46', marginTop: '8px', fontStyle: 'italic' }}>
            RV não calculado neste mês.
          </p>
        </div>
      </div>
    )
  }

  const hasBonus      = r.bonus > 0
  const hasPenalidades = r.penalidades.length > 0
  const hasDesconto   = r.descontoIndividualAplicado !== null
  const hasDeductions = hasPenalidades || hasDesconto
  const showSubtotal  = hasDeductions && (hasBonus || r.rvAposPedidos !== r.rvTotal)

  const multLabel = `MULTIPLICADOR (${r.pedidosRealizados}/${r.pedidosMeta} PED.)`
  const multValor = `× ${r.multiplicador.toFixed(2).replace('.', ',')}`

  return (
    <div>
      {/* Bloco BASE */}
      <CalcLinha label="RV BASE" valor={formatBRL(r.rvBase)} />
      <CalcLinha label={multLabel} valor={multValor} />
      <CalcLinha label="RV APÓS PEDIDOS" valor={formatBRL(r.rvAposPedidos)} />

      {/* Bloco BÔNUS */}
      {hasBonus && (
        <>
          <SectionGap />
          <CalcLinha label="BÔNUS DE QUALIDADE" valor={`+ ${formatBRL(r.bonus)}`} />
        </>
      )}

      {/* SUBTOTAL */}
      {showSubtotal && (
        <>
          <SectionGap />
          <CalcLinha label="SUBTOTAL" valor={formatBRL(r.rvTotal)} destaque />
        </>
      )}

      {/* Bloco DEFLATORES */}
      <SectionGap />
      <span style={{ fontFamily: FF_SYNE, fontWeight: 600, fontSize: '11px', textTransform: 'uppercase', letterSpacing: '0.08em', color: '#a1a3b8' }}>
        DEFLATORES
      </span>
      {!hasDeductions ? (
        <p style={{ fontFamily: FF_SYNE, fontSize: '12px', color: 'rgba(114,112,143,0.7)', fontStyle: 'italic', padding: '6px 0 0' }}>
          Nenhum deflator aplicado
        </p>
      ) : (
        <div style={{ display: 'flex', flexDirection: 'column', gap: '6px', marginTop: '6px' }}>
          {r.penalidades.map((p, i) => (
            <DeflatorBox key={i} label={`Deflator ${p.metaLabel} (${p.percentual}%)`} valor={p.valorDeduzido} />
          ))}
          {hasDesconto && (
            <DeflatorBox label={`Desconto: ${r.descontoIndividualAplicado!.motivo}`} valor={r.descontoIndividualAplicado!.valor} />
          )}
        </div>
      )}

      {/* RV FINAL */}
      <SectionGap />
      <div style={{
        display: 'flex', alignItems: 'baseline', justifyContent: 'space-between',
        paddingTop: '10px', borderTop: '1px solid rgba(255,255,255,0.07)',
      }}>
        <span style={{
          fontFamily: FF_SYNE, fontWeight: 600, fontSize: '13px',
          textTransform: 'uppercase', letterSpacing: '0.08em', color: '#f4d47c',
        }}>
          RV FINAL
        </span>
        <span style={{
          fontFamily: FF_DM, fontWeight: 700, fontSize: '20px',
          fontVariantNumeric: 'tabular-nums',
          background: 'linear-gradient(135deg, #f4d47c 0%, #d4a935 100%)',
          WebkitBackgroundClip: 'text', WebkitTextFillColor: 'transparent', backgroundClip: 'text',
        }}>
          {formatBRL(r.rvFinal)}
        </span>
      </div>
    </div>
  )
}

// ── Props ─────────────────────────────────────────────────────────────────────

interface Props {
  operadores:      OperadorRvData[]
  dataAtualizacao: string | null
  mesLabel:        string
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
    inelegivel: 'Todos os operadores estão elegíveis este mês ✓',
    deflator:   'Nenhum operador com deflator aplicado ✓',
  }

  return (
    <>
      <style dangerouslySetInnerHTML={{ __html: `
        @keyframes rvEqRowIn {
          from { opacity: 0; transform: translateY(8px); }
          to   { opacity: 1; transform: translateY(0); }
        }
        .rv-eq-expand {
          display: grid;
          grid-template-rows: 0fr;
          transition: grid-template-rows 200ms cubic-bezier(0.4,0,0.2,1);
        }
        .rv-eq-expand.open { grid-template-rows: 1fr; }
        .rv-eq-expand-inner { overflow: hidden; min-height: 0; }
      `}} />

      <div className="halo-cards-bg" style={{ display: 'flex', flexDirection: 'column', gap: '14px' }}>

        {/* ── Header ── */}
        <PainelHeader titulo="RV EQUIPE" mesLabel={mesLabel} dataReferencia={dataAtualizacao} />
        <LinhaHorizontalDourada />

        {/* ── Título de seção ── */}
        <PainelSectionTitle>RV DA EQUIPE</PainelSectionTitle>

        {/* ── Filtros ── */}
        <div style={{
          background: '#070714',
          border: '1px solid rgba(244,212,124,0.15)',
          borderRadius: '12px',
          padding: '14px 24px',
          display: 'flex',
          alignItems: 'center',
          gap: '16px',
          flexWrap: 'wrap',
        }}>
          <span style={{
            fontFamily: FF_SYNE,
            fontWeight: 600,
            fontSize: '13px',
            color: '#72708F',
            textTransform: 'uppercase',
            letterSpacing: '1px',
            flexShrink: 0,
          }}>
            FILTRAR:
          </span>
          <div style={{ display: 'flex', gap: '8px', flexWrap: 'wrap' }}>
            {FILTERS.map(({ key, label }) => {
              const ativo = activeFilter === key
              return (
                <button
                  key={key}
                  type="button"
                  onClick={() => toggleFilter(key)}
                  aria-pressed={ativo}
                  style={{
                    fontFamily: FF_SYNE,
                    fontWeight: 600,
                    fontSize: '12px',
                    textTransform: 'uppercase',
                    letterSpacing: '0.5px',
                    padding: '6px 16px',
                    borderRadius: '14px',
                    border: ativo ? '1px solid rgba(227,57,57,0.7)' : '1px solid rgba(114,112,143,0.5)',
                    background: ativo ? 'rgba(227,57,57,0.08)' : 'transparent',
                    color: ativo ? '#E33939' : '#72708F',
                    cursor: 'pointer',
                    transition: 'all 200ms ease',
                  }}
                  onMouseEnter={e => {
                    if (!ativo) {
                      const el = e.currentTarget as HTMLElement
                      el.style.color = 'rgba(114,112,143,1)'
                      el.style.borderColor = 'rgba(114,112,143,0.8)'
                    }
                  }}
                  onMouseLeave={e => {
                    if (!ativo) {
                      const el = e.currentTarget as HTMLElement
                      el.style.color = '#72708F'
                      el.style.borderColor = 'rgba(114,112,143,0.5)'
                    }
                  }}
                >
                  {label}
                </button>
              )
            })}
          </div>
        </div>

        {/* ── Lista de operadores ── */}
        {filtered.length === 0 && activeFilter ? (
          <div style={{ padding: '40px 0', textAlign: 'center' }}>
            <p style={{
              fontFamily: FF_SYNE,
              fontSize: '13px',
              color: COR_VERDE,
              fontWeight: 500,
            }}>
              {EMPTY_MSG[activeFilter]}
            </p>
          </div>
        ) : (
          <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
            {filtered.map((op, idx) => {
              const r        = op.resultado
              const expanded = isExpanded(op.id)
              const isInelegivel  = r && !r.elegivel && !r.semDados
              const totalDeducao  = r
                ? r.totalPenalidade + (r.descontoIndividualAplicado?.valor ?? 0)
                : 0
              const semDados = !op.encontrado || !r || r.semDados

              // Cor do RV Final
              const corRv = semDados
                ? COR_NEUTRO
                : isInelegivel
                  ? COR_VERMELHO
                  : COR_LAVANDA

              // Cor da elegibilidade
              const corEleg = semDados ? COR_NEUTRO : isInelegivel ? COR_VERMELHO : COR_VERDE
              const labelEleg = semDados ? '—' : isInelegivel ? 'INELEGÍVEL' : 'ELEGÍVEL'

              // Cor da dedução
              const corDeducao = totalDeducao > 0 ? COR_VERMELHO : COR_NEUTRO
              const labelDeducao = totalDeducao > 0 ? `− ${formatBRL(totalDeducao)}` : '—'

              const METRICAS = [
                { label: 'ELEGIBILIDADE', value: labelEleg,                              color: corEleg   },
                { label: 'DESCONTO',      value: labelDeducao,                          color: corDeducao },
                { label: 'RV FINAL',      value: semDados ? '—' : formatBRL(r!.rvFinal), color: corRv     },
              ]

              return (
                <div
                  key={op.id}
                  style={{
                    background: '#070714',
                    border: `1px solid ${expanded ? 'rgba(255,185,34,0.5)' : 'rgba(255,185,34,0.25)'}`,
                    borderRadius: '0',
                    animation: 'rvEqRowIn 0.3s ease both',
                    animationDelay: `${idx * 30}ms`,
                    transition: 'border-color 0.2s ease',
                  }}
                  onMouseEnter={e => {
                    if (!expanded) (e.currentTarget as HTMLElement).style.borderColor = 'rgba(255,185,34,0.5)';
                    handleMouseEnter(op.id)
                  }}
                  onMouseLeave={e => {
                    if (!expanded) (e.currentTarget as HTMLElement).style.borderColor = 'rgba(255,185,34,0.25)';
                    handleMouseLeave(op.id)
                  }}
                  onClick={() => handleClick(op.id)}
                >
                  {/* Linha principal */}
                  <div style={{
                    padding: '16px 24px',
                    display: 'flex',
                    alignItems: 'center',
                    gap: '32px',
                    cursor: 'pointer',
                  }}>
                    {/* Nome */}
                    <span style={{
                      fontFamily: FF_SYNE,
                      fontWeight: 600,
                      fontSize: '20px',
                      color: COR_NEUTRO,
                      textTransform: 'uppercase',
                      letterSpacing: '0.5px',
                      whiteSpace: 'nowrap',
                      overflow: 'hidden',
                      textOverflow: 'ellipsis',
                      flex: 1,
                      minWidth: 0,
                    }}>
                      {nomeDisplay(op.nome)}
                    </span>

                    {/* Métricas */}
                    {METRICAS.map(({ label, value, color }) => (
                      <div key={label} style={{ display: 'flex', flexDirection: 'column', alignItems: 'flex-end', gap: '2px', flexShrink: 0 }}>
                        <span style={{
                          fontFamily: FF_SYNE,
                          fontWeight: 600,
                          fontSize: '20px',
                          color: '#474658',
                          textTransform: 'uppercase',
                          letterSpacing: '1px',
                          whiteSpace: 'nowrap',
                        }}>
                          {label}
                        </span>
                        <span style={{
                          fontFamily: FF_DM,
                          fontWeight: 500,
                          fontSize: '20px',
                          color,
                          fontFeatureSettings: "'tnum'",
                          lineHeight: 1,
                          whiteSpace: 'nowrap',
                        }}>
                          {value}
                        </span>
                      </div>
                    ))}
                  </div>

                  {/* Expansão */}
                  <div className={`rv-eq-expand${expanded ? ' open' : ''}`}>
                    <div className="rv-eq-expand-inner">
                      <div style={{
                        padding: '12px 24px 16px',
                        borderTop: '1px solid rgba(255,255,255,0.05)',
                      }}>
                        <ExpansionContent op={op} />
                      </div>
                    </div>
                  </div>
                </div>
              )
            })}
          </div>
        )}

      </div>
    </>
  )
}
