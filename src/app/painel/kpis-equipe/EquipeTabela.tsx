'use client'

import { useState } from 'react'
import Link from 'next/link'
import { ArrowRight } from 'lucide-react'
import { getIniciaisNome } from '@/lib/operadores'
import type { KPIItem, Status, Meta } from '@/lib/kpi-utils'
import { formatarExibicao, normalizarChave } from '@/lib/kpi-utils'
import type { DadosOperador } from './page'

// ── Avatares azul escuro ────────────────────────────────────────────────────────

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

// ── Helpers de status ──────────────────────────────────────────────────────────

const STATUS_COR: Record<Status, string> = {
  verde:    '#10b981',
  amarelo:  '#f59e0b',
  vermelho: '#ef4444',
  neutro:   'rgba(255,255,255,0.25)',
}

const STATUS_RGB: Record<Status, string> = {
  verde:    '16,185,129',
  amarelo:  '245,158,11',
  vermelho: '239,68,68',
  neutro:   '255,255,255',
}

function globalStatus(kpis: KPIItem[]): Status {
  const com = kpis.filter((k) => k.status !== 'neutro')
  if (com.some((k) => k.status === 'vermelho')) return 'vermelho'
  if (com.some((k) => k.status === 'amarelo'))  return 'amarelo'
  if (com.some((k) => k.status === 'verde'))    return 'verde'
  return 'neutro'
}

function isTxRetMeta(m: Meta) {
  const k = normalizarChave(m.nome_coluna)
  return k.includes('retenc') || k.includes('retenç')
}

// ── Props ──────────────────────────────────────────────────────────────────────

interface Props {
  dadosEquipe: DadosOperador[]
  basicos: Meta[]
}

export default function EquipeTabela({ dadosEquipe, basicos }: Props) {
  // null = TODOS, string = nome_coluna do KPI selecionado
  const [kpiFiltro,   setKpiFiltro]   = useState<string | null>(null)
  const [hoveredOpId, setHoveredOpId] = useState<number | null>(null)

  const cssVars = {
    '--void3': '#0d0d1a',
    '--gold2': '#e8c96d',
    '--gold4': 'rgba(201,168,76,0.15)',
  } as React.CSSProperties

  // Meta do KPI selecionado
  const metaSelecionada = kpiFiltro
    ? basicos.find((m) => normalizarChave(m.nome_coluna) === normalizarChave(kpiFiltro)) ?? null
    : null

  function toggleKpi(nomeColuna: string) {
    setKpiFiltro((prev) =>
      prev !== null && normalizarChave(prev) === normalizarChave(nomeColuna) ? null : nomeColuna
    )
  }

  return (
    <div style={cssVars} className="space-y-4">

      {/* ── Pills de KPI ── */}
      <div style={{ display: 'flex', alignItems: 'center', gap: '8px', flexWrap: 'wrap' }}>

        {/* TODOS */}
        {(() => {
          const ativo = kpiFiltro === null
          return (
            <button
              type="button"
              onClick={() => setKpiFiltro(null)}
              style={{
                padding: '5px 14px',
                borderRadius: '20px',
                fontSize: '11px',
                fontWeight: 600,
                letterSpacing: '0.06em',
                textTransform: 'uppercase',
                border: ativo ? '1px solid #c9a84c' : '1px solid rgba(255,255,255,0.06)',
                background: ativo ? 'var(--gold4)' : 'var(--void3)',
                color: ativo ? 'var(--gold2)' : 'var(--text-muted)',
                cursor: 'pointer',
                transition: 'all 0.15s',
              }}
            >
              TODOS
            </button>
          )
        })()}

        {/* Um pill por KPI básico */}
        {basicos.map((m) => {
          const ativo = kpiFiltro !== null && normalizarChave(kpiFiltro) === normalizarChave(m.nome_coluna)
          return (
            <button
              key={m.id}
              type="button"
              onClick={() => toggleKpi(m.nome_coluna)}
              style={{
                padding: '5px 14px',
                borderRadius: '20px',
                fontSize: '11px',
                fontWeight: 600,
                letterSpacing: '0.06em',
                textTransform: 'uppercase',
                border: ativo ? '1px solid #c9a84c' : '1px solid rgba(255,255,255,0.06)',
                background: ativo ? 'var(--gold4)' : 'var(--void3)',
                color: ativo ? 'var(--gold2)' : 'var(--text-muted)',
                cursor: 'pointer',
                transition: 'all 0.15s',
              }}
              onMouseEnter={(e) => {
                if (!ativo) {
                  e.currentTarget.style.borderColor = 'rgba(201,168,76,0.2)'
                  e.currentTarget.style.color = 'var(--text-secondary)'
                }
              }}
              onMouseLeave={(e) => {
                if (!ativo) {
                  e.currentTarget.style.borderColor = 'rgba(255,255,255,0.06)'
                  e.currentTarget.style.color = 'var(--text-muted)'
                }
              }}
            >
              {m.label}
            </button>
          )
        })}
      </div>

      {/* ── Tabela desktop ── */}
      <div
        className="hidden lg:block"
        style={{
          background: 'var(--void3)',
          border: '1px solid rgba(201,168,76,0.08)',
          borderRadius: '16px',
          overflow: 'hidden',
        }}
      >
        <div style={{ overflowX: 'auto' }}>
          <table style={{ width: '100%', borderCollapse: 'collapse' }}>
            <thead>
              <tr style={{
                background: 'rgba(201,168,76,0.04)',
                borderBottom: '1px solid rgba(201,168,76,0.08)',
              }}>
                <th style={{ textAlign: 'left', padding: '12px 20px', width: '220px', fontSize: '9px', fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.14em', color: 'var(--text-muted)', whiteSpace: 'nowrap' }}>
                  Operador
                </th>

                {basicos.map((m) => {
                  const isSelected = kpiFiltro !== null && normalizarChave(kpiFiltro) === normalizarChave(m.nome_coluna)
                  // Oculta colunas não selecionadas quando há filtro ativo
                  if (kpiFiltro !== null && !isSelected) return null
                  return (
                    <th
                      key={m.id}
                      style={{
                        textAlign: 'center',
                        padding: isSelected ? '10px 16px 6px' : '12px 12px',
                        whiteSpace: 'nowrap',
                        fontSize: '9px',
                        fontWeight: 700,
                        textTransform: 'uppercase',
                        letterSpacing: '0.14em',
                        color: isSelected ? '#c9a84c' : isTxRetMeta(m) ? '#c9a84c' : 'var(--text-muted)',
                        minWidth: isSelected ? '140px' : undefined,
                      }}
                    >
                      {m.label}
                      {isSelected && metaSelecionada && (
                        <div style={{ fontSize: '9px', fontWeight: 400, color: 'var(--text-muted)', marginTop: '3px', letterSpacing: '0.04em', textTransform: 'none' }}>
                          Meta: {formatarExibicao(String(metaSelecionada.valor_meta), metaSelecionada.unidade)}
                        </div>
                      )}
                    </th>
                  )
                })}

                <th style={{ textAlign: 'center', padding: '12px 16px', fontSize: '9px', fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.14em', color: 'var(--text-muted)', minWidth: '60px', whiteSpace: 'nowrap' }}>
                  Status
                </th>
                <th style={{ width: '44px' }} />
              </tr>
            </thead>

            <tbody>
              {dadosEquipe.map(({ op, kpis, encontrado }, idx) => {
                const gs      = globalStatus(kpis)
                const av      = avatarEstilo(op.id)
                const isHov   = hoveredOpId === op.id

                // Opacidade e filtro visual por KPI selecionado
                let isCritico = false
                if (kpiFiltro !== null) {
                  const kpiAtivo = kpis.find((k) => normalizarChave(k.nome_coluna) === normalizarChave(kpiFiltro))
                  isCritico = kpiAtivo?.status === 'vermelho'
                }
                const rowOpacity  = kpiFiltro === null ? 1 : isCritico ? 1 : 0.2
                const rowFilter   = kpiFiltro === null ? 'none' : isCritico ? 'none' : 'grayscale(60%)'
                const rowShadow   = kpiFiltro !== null && isCritico
                  ? 'inset 3px 0 0 #ff3b3b'
                  : `inset 3px 0 0 ${STATUS_COR[gs]}`

                const nVerde    = kpis.filter((k) => k.status === 'verde').length
                const nAmarelo  = kpis.filter((k) => k.status === 'amarelo').length
                const nVermelho = kpis.filter((k) => k.status === 'vermelho').length

                return (
                  <tr
                    key={op.id}
                    style={{
                      borderBottom: idx < dadosEquipe.length - 1 ? '1px solid rgba(255,255,255,0.03)' : 'none',
                      boxShadow: rowShadow,
                      cursor: 'pointer',
                      transition: 'background 0.15s, opacity 0.2s, filter 0.2s',
                      opacity: rowOpacity,
                      filter: rowFilter,
                    }}
                    onMouseEnter={(e) => {
                      (e.currentTarget as HTMLElement).style.background = 'rgba(201,168,76,0.04)'
                    }}
                    onMouseLeave={(e) => {
                      (e.currentTarget as HTMLElement).style.background = 'transparent'
                    }}
                  >
                    {/* ── Operador — hover inline ── */}
                    <td
                      style={{ padding: '10px 20px', verticalAlign: 'top' }}
                      onMouseEnter={() => setHoveredOpId(op.id)}
                      onMouseLeave={() => setHoveredOpId(null)}
                    >
                      <div style={{
                        width: isHov ? '320px' : '220px',
                        transition: 'width 0.25s ease',
                        overflow: 'hidden',
                      }}>
                        <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
                          <div style={{
                            width:  isHov ? '42px' : '30px',
                            height: isHov ? '42px' : '30px',
                            borderRadius: '8px',
                            display: 'flex', alignItems: 'center', justifyContent: 'center',
                            fontSize: isHov ? '13px' : '10px',
                            fontWeight: 700, flexShrink: 0,
                            fontFamily: 'var(--ff-display)',
                            transition: 'width 0.25s ease, height 0.25s ease, font-size 0.25s ease',
                            ...av,
                          }}>
                            {getIniciaisNome(op.nome)}
                          </div>
                          <div style={{ minWidth: 0 }}>
                            <p style={{ fontSize: '12px', fontWeight: 500, color: 'var(--text-primary)', lineHeight: 1.25, whiteSpace: 'nowrap' }}>
                              {op.nome.split(' ').slice(0, 2).join(' ')}
                            </p>
                            <p style={{ fontSize: '10px', color: 'var(--text-muted)', marginTop: '1px', whiteSpace: 'nowrap' }}>
                              {op.username}
                            </p>
                          </div>
                        </div>

                        {isHov && (
                          <>
                            <div style={{ height: '1px', background: 'rgba(66,139,255,0.15)', margin: '8px 0' }} />
                            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '6px 10px', marginBottom: '8px' }}>
                              {basicos.slice(0, 6).map((m) => {
                                const kpi = kpis.find((k) => normalizarChave(k.nome_coluna) === normalizarChave(m.nome_coluna))
                                const cor = kpi ? STATUS_COR[kpi.status] : 'var(--text-muted)'
                                return (
                                  <div key={m.id}>
                                    <p style={{ fontSize: '9px', textTransform: 'uppercase', letterSpacing: '0.05em', color: 'var(--text-muted)', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap', marginBottom: '2px' }}>
                                      {m.label}
                                    </p>
                                    <p style={{ fontSize: '13px', fontWeight: 700, color: cor, fontVariantNumeric: 'tabular-nums', lineHeight: 1 }}>
                                      {kpi ? formatarExibicao(kpi.valor, kpi.unidade) : '—'}
                                    </p>
                                  </div>
                                )
                              })}
                            </div>
                            <div style={{ display: 'flex', alignItems: 'center', gap: '5px', flexWrap: 'wrap' }}>
                              <div style={{ width: '6px', height: '6px', borderRadius: '50%', background: STATUS_COR[gs], boxShadow: `0 0 4px ${STATUS_COR[gs]}`, flexShrink: 0 }} />
                              {nVerde    > 0 && <span style={{ fontSize: '10px', color: '#10b981' }}>{nVerde}v</span>}
                              {nVerde    > 0 && (nAmarelo > 0 || nVermelho > 0) && <span style={{ color: 'rgba(255,255,255,0.2)', fontSize: '10px' }}>·</span>}
                              {nAmarelo  > 0 && <span style={{ fontSize: '10px', color: '#f59e0b' }}>{nAmarelo}a</span>}
                              {nAmarelo  > 0 && nVermelho > 0 && <span style={{ color: 'rgba(255,255,255,0.2)', fontSize: '10px' }}>·</span>}
                              {nVermelho > 0 && <span style={{ fontSize: '10px', color: '#ef4444' }}>{nVermelho}vm</span>}
                              {nVerde === 0 && nAmarelo === 0 && nVermelho === 0 && (
                                <span style={{ fontSize: '10px', color: 'var(--text-muted)' }}>sem dados</span>
                              )}
                            </div>
                          </>
                        )}
                      </div>
                    </td>

                    {/* ── KPIs — oculta os não selecionados quando há filtro ── */}
                    {basicos.map((m) => {
                      const isSelected = kpiFiltro !== null && normalizarChave(kpiFiltro) === normalizarChave(m.nome_coluna)
                      if (kpiFiltro !== null && !isSelected) return null

                      const kpi     = kpis.find((k) => normalizarChave(k.nome_coluna) === normalizarChave(m.nome_coluna))
                      const isTxRet = isTxRetMeta(m)
                      const cor     = kpi ? STATUS_COR[kpi.status] : 'var(--text-muted)'
                      const rgb     = kpi ? STATUS_RGB[kpi.status] : '255,255,255'
                      const val     = kpi ? formatarExibicao(kpi.valor, kpi.unidade) : '—'
                      const fontSize = isSelected ? '14px' : '12px'

                      return (
                        <td key={m.id} style={{ padding: '10px 12px', textAlign: 'center', verticalAlign: 'top' }}>
                          {kpi && isTxRet ? (
                            <span style={{
                              display: 'inline-block',
                              padding: '3px 10px',
                              borderRadius: '20px',
                              fontSize,
                              fontWeight: 700,
                              fontVariantNumeric: 'tabular-nums',
                              background: `rgba(${rgb},0.1)`,
                              border: `1px solid rgba(${rgb},0.2)`,
                              color: cor,
                            }}>
                              {val}
                            </span>
                          ) : (
                            <span style={{ fontSize, fontWeight: 600, fontVariantNumeric: 'tabular-nums', color: cor }}>
                              {val}
                            </span>
                          )}
                        </td>
                      )
                    })}

                    {/* Status dot */}
                    <td style={{ padding: '10px 16px', textAlign: 'center', verticalAlign: 'top' }}>
                      {encontrado ? (
                        <div style={{
                          width: '8px', height: '8px', borderRadius: '50%',
                          background: STATUS_COR[gs],
                          boxShadow: `0 0 6px ${STATUS_COR[gs]}`,
                          margin: '0 auto',
                        }} />
                      ) : (
                        <span style={{ fontSize: '10px', color: 'var(--text-muted)' }}>—</span>
                      )}
                    </td>

                    {/* Arrow */}
                    <td style={{ padding: '10px 14px', textAlign: 'right', verticalAlign: 'top' }}>
                      <Link
                        href={`/painel/kpi/${op.username}`}
                        aria-label={`Ver KPI de ${op.nome}`}
                        style={{
                          display: 'inline-flex', alignItems: 'center', justifyContent: 'center',
                          width: '28px', height: '28px', borderRadius: '8px',
                          border: '1px solid rgba(201,168,76,0.2)',
                          background: 'rgba(201,168,76,0.08)',
                          color: '#c9a84c',
                          opacity: 0.35,
                          transition: 'opacity 0.15s, transform 0.15s',
                        }}
                        onMouseEnter={(e) => {
                          const el = e.currentTarget as HTMLElement
                          el.style.opacity = '1'
                          el.style.transform = 'translateX(2px)'
                        }}
                        onMouseLeave={(e) => {
                          const el = e.currentTarget as HTMLElement
                          el.style.opacity = '0.35'
                          el.style.transform = 'translateX(0)'
                        }}
                      >
                        <ArrowRight size={12} />
                      </Link>
                    </td>
                  </tr>
                )
              })}

              {dadosEquipe.length === 0 && (
                <tr>
                  <td colSpan={basicos.length + 3} style={{ padding: '32px', textAlign: 'center', color: 'var(--text-muted)', fontSize: '13px' }}>
                    Nenhum operador encontrado.
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      </div>

      {/* ── Cards mobile ── */}
      <div className="lg:hidden grid grid-cols-1 sm:grid-cols-2 gap-3">
        {dadosEquipe.map(({ op, kpis, encontrado }) => {
          const gs = globalStatus(kpis)
          const av = avatarEstilo(op.id)

          // Opacidade e filtro visual por KPI selecionado (mobile)
          let isCriticoMobile = false
          if (kpiFiltro !== null) {
            const kpiAtivo = kpis.find((k) => normalizarChave(k.nome_coluna) === normalizarChave(kpiFiltro))
            isCriticoMobile = kpiAtivo?.status === 'vermelho'
          }
          const cardOpacity = kpiFiltro === null ? 1 : isCriticoMobile ? 1 : 0.2
          const cardFilter  = kpiFiltro === null ? 'none' : isCriticoMobile ? 'none' : 'grayscale(60%)'
          const cardBorderLeft = kpiFiltro !== null && isCriticoMobile
            ? `3px solid #ff3b3b`
            : `3px solid ${STATUS_COR[gs]}`

          // KPIs visíveis no mobile: apenas selecionado ou todos
          const kpisVisiveis = kpiFiltro !== null
            ? basicos.filter((m) => normalizarChave(m.nome_coluna) === normalizarChave(kpiFiltro))
            : basicos.slice(0, 6)

          return (
            <Link
              key={op.id}
              href={`/painel/kpi/${op.username}`}
              style={{
                display: 'block',
                background: 'var(--void3)',
                border: '1px solid rgba(201,168,76,0.08)',
                borderLeft: cardBorderLeft,
                borderRadius: '12px',
                padding: '14px 16px',
                transition: 'background 0.15s, opacity 0.2s, filter 0.2s',
                opacity: cardOpacity,
                filter: cardFilter,
              }}
              onMouseEnter={(e) => {
                (e.currentTarget as HTMLElement).style.background = 'rgba(201,168,76,0.04)'
              }}
              onMouseLeave={(e) => {
                (e.currentTarget as HTMLElement).style.background = 'var(--void3)'
              }}
            >
              <div style={{ display: 'flex', alignItems: 'center', gap: '10px', marginBottom: '12px' }}>
                <div style={{
                  width: '32px', height: '32px', borderRadius: '8px',
                  display: 'flex', alignItems: 'center', justifyContent: 'center',
                  fontSize: '10px', fontWeight: 700, flexShrink: 0,
                  fontFamily: 'var(--ff-display)',
                  ...av,
                }}>
                  {getIniciaisNome(op.nome)}
                </div>
                <div style={{ flex: 1, minWidth: 0 }}>
                  <p style={{ fontSize: '12px', fontWeight: 500, color: 'var(--text-primary)', lineHeight: 1.25, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                    {op.nome.split(' ').slice(0, 2).join(' ')}
                  </p>
                  <p style={{ fontSize: '10px', color: 'var(--text-muted)', marginTop: '1px' }}>
                    {op.username}
                  </p>
                </div>
                <div style={{
                  width: '8px', height: '8px', borderRadius: '50%',
                  background: STATUS_COR[gs],
                  boxShadow: `0 0 6px ${STATUS_COR[gs]}`,
                  flexShrink: 0,
                }} />
              </div>

              {encontrado && kpisVisiveis.length > 0 ? (
                <div style={{ display: 'grid', gridTemplateColumns: kpiFiltro ? '1fr' : 'repeat(3, 1fr)', gap: '6px' }}>
                  {kpisVisiveis.map((m) => {
                    const kpi = kpis.find((k) => normalizarChave(k.nome_coluna) === normalizarChave(m.nome_coluna))
                    const cor = kpi ? STATUS_COR[kpi.status] : 'var(--text-muted)'
                    return (
                      <div key={m.id} style={{ background: 'rgba(255,255,255,0.03)', border: '1px solid rgba(255,255,255,0.04)', borderRadius: '8px', padding: '7px 8px' }}>
                        <p style={{ fontSize: '9px', textTransform: 'uppercase', letterSpacing: '0.05em', color: 'var(--text-muted)', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                          {m.label}
                        </p>
                        <p style={{ fontSize: kpiFiltro ? '16px' : '13px', fontWeight: 700, marginTop: '2px', fontVariantNumeric: 'tabular-nums', color: cor }}>
                          {kpi ? formatarExibicao(kpi.valor, kpi.unidade) : '—'}
                        </p>
                        {kpiFiltro && metaSelecionada && (
                          <p style={{ fontSize: '9px', color: 'var(--text-muted)', marginTop: '2px' }}>
                            Meta: {formatarExibicao(String(metaSelecionada.valor_meta), metaSelecionada.unidade)}
                          </p>
                        )}
                      </div>
                    )
                  })}
                </div>
              ) : (
                <p style={{ fontSize: '12px', textAlign: 'center', padding: '8px 0', color: 'var(--text-muted)' }}>
                  {encontrado ? 'Configure metas básicas' : 'Sem dados na planilha'}
                </p>
              )}
            </Link>
          )
        })}
      </div>
    </div>
  )
}
