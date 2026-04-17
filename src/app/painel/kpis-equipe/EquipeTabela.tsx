'use client'

import { useState } from 'react'
import Link from 'next/link'
import { ArrowRight } from 'lucide-react'
import { getIniciaisNome } from '@/lib/operadores'
import type { KPIItem, Status, Meta } from '@/lib/kpi-utils'
import { formatarExibicao, normalizarChave } from '@/lib/kpi-utils'
import type { DadosOperador } from './page'

// ── Avatares dourados padronizados ─────────────────────────────────────────────

function avatarDourado(id: number): { background: string; border: string; color: string } {
  const impar = id % 2 !== 0
  return {
    background: impar
      ? 'linear-gradient(135deg, #2a1f08, #3d2e0d)'
      : 'linear-gradient(135deg, #1a1308, #261c08)',
    border: impar
      ? '1px solid rgba(201,168,76,0.3)'
      : '1px solid rgba(201,168,76,0.15)',
    color: impar ? '#c9a84c' : '#a07830',
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

// ── Filtros ────────────────────────────────────────────────────────────────────

type Filtro = 'todos' | 'verde' | 'amarelo' | 'vermelho'

const FILTROS: { key: Filtro; label: string }[] = [
  { key: 'todos',    label: 'TODOS' },
  { key: 'verde',    label: 'VERDES' },
  { key: 'amarelo',  label: 'ATENÇÃO' },
  { key: 'vermelho', label: 'CRÍTICOS' },
]

// ── Hover state ────────────────────────────────────────────────────────────────

interface HoverState {
  opId: number
  x: number
  y: number
}

// ── Props ──────────────────────────────────────────────────────────────────────

interface Props {
  dadosEquipe: DadosOperador[]
  basicos: Meta[]
}

export default function EquipeTabela({ dadosEquipe, basicos }: Props) {
  const [filtro,  setFiltro]  = useState<Filtro>('todos')
  const [hovered, setHovered] = useState<HoverState | null>(null)

  const counts: Record<Filtro, number> = {
    todos:    dadosEquipe.length,
    verde:    dadosEquipe.filter(({ kpis, encontrado }) => encontrado && globalStatus(kpis) === 'verde').length,
    amarelo:  dadosEquipe.filter(({ kpis, encontrado }) => encontrado && globalStatus(kpis) === 'amarelo').length,
    vermelho: dadosEquipe.filter(({ kpis, encontrado }) => encontrado && globalStatus(kpis) === 'vermelho').length,
  }

  const filtered = dadosEquipe.filter(({ kpis, encontrado }) => {
    if (filtro === 'todos') return true
    if (!encontrado) return false
    return globalStatus(kpis) === filtro
  })

  function handleOpEnter(e: React.MouseEvent<HTMLTableCellElement>, opId: number) {
    const rect = (e.currentTarget as HTMLElement).getBoundingClientRect()
    const POPUP_H = 255
    const above = rect.bottom + POPUP_H > window.innerHeight
    setHovered({
      opId,
      x: Math.min(rect.left, window.innerWidth - 276),
      y: above ? rect.top - POPUP_H - 4 : rect.bottom + 4,
    })
  }

  const cssVars = {
    '--void3': '#0d0d1a',
    '--gold2': '#e8c96d',
    '--gold4': 'rgba(201,168,76,0.15)',
  } as React.CSSProperties

  // Dados do operador em hover (para o popup)
  const hovData = hovered ? dadosEquipe.find((d) => d.op.id === hovered.opId) : null

  return (
    <div style={cssVars} className="space-y-4">

      {/* Keyframe para o popup */}
      <style>{`
        @keyframes tooltipIn {
          from { opacity: 0; transform: translateY(4px); }
          to   { opacity: 1; transform: translateY(0); }
        }
      `}</style>

      {/* ── Filtros pill ── */}
      <div style={{ display: 'flex', alignItems: 'center', gap: '8px', flexWrap: 'wrap' }}>
        {FILTROS.map(({ key, label }) => {
          const ativo = filtro === key
          return (
            <button
              key={key}
              type="button"
              onClick={() => setFiltro(key)}
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
                display: 'inline-flex',
                alignItems: 'center',
                gap: '5px',
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
              {label}
              <span style={{ opacity: ativo ? 0.7 : 0.45, fontWeight: 400, fontSize: '10px' }}>
                {counts[key]}
              </span>
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
                <th style={{ textAlign: 'left', padding: '12px 20px', width: '200px', fontSize: '9px', fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.14em', color: 'var(--text-muted)', whiteSpace: 'nowrap' }}>
                  Operador
                </th>
                {basicos.map((m) => (
                  <th key={m.id} style={{ textAlign: 'center', padding: '12px 12px', whiteSpace: 'nowrap', fontSize: '9px', fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.14em', color: isTxRetMeta(m) ? '#c9a84c' : 'var(--text-muted)' }}>
                    {m.label}
                  </th>
                ))}
                <th style={{ textAlign: 'center', padding: '12px 16px', fontSize: '9px', fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.14em', color: 'var(--text-muted)', minWidth: '60px', whiteSpace: 'nowrap' }}>
                  Status
                </th>
                <th style={{ width: '44px' }} />
              </tr>
            </thead>

            <tbody>
              {filtered.map(({ op, kpis, encontrado }, idx) => {
                const gs  = globalStatus(kpis)
                const av  = avatarDourado(op.id)

                return (
                  <tr
                    key={op.id}
                    style={{
                      borderBottom: idx < filtered.length - 1 ? '1px solid rgba(255,255,255,0.03)' : 'none',
                      boxShadow: `inset 3px 0 0 ${STATUS_COR[gs]}`,
                      cursor: 'pointer',
                      transition: 'background 0.15s',
                    }}
                    onMouseEnter={(e) => {
                      (e.currentTarget as HTMLElement).style.background = 'rgba(201,168,76,0.04)'
                    }}
                    onMouseLeave={(e) => {
                      (e.currentTarget as HTMLElement).style.background = 'transparent'
                    }}
                  >
                    {/* ── Operador — com hover card ── */}
                    <td
                      style={{ padding: '10px 20px' }}
                      onMouseEnter={(e) => handleOpEnter(e, op.id)}
                      onMouseLeave={() => setHovered(null)}
                    >
                      <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
                        <div style={{
                          width: '30px', height: '30px', borderRadius: '8px',
                          display: 'flex', alignItems: 'center', justifyContent: 'center',
                          fontSize: '10px', fontWeight: 700, flexShrink: 0,
                          fontFamily: 'var(--ff-display)',
                          ...av,
                        }}>
                          {getIniciaisNome(op.nome)}
                        </div>
                        <div>
                          <p style={{ fontSize: '12px', fontWeight: 500, color: 'var(--text-primary)', lineHeight: 1.25 }}>
                            {op.nome.split(' ').slice(0, 2).join(' ')}
                          </p>
                          <p style={{ fontSize: '10px', color: 'var(--text-muted)', marginTop: '1px' }}>
                            {op.username}
                          </p>
                        </div>
                      </div>
                    </td>

                    {/* KPIs */}
                    {basicos.map((m) => {
                      const kpi    = kpis.find((k) => normalizarChave(k.nome_coluna) === normalizarChave(m.nome_coluna))
                      const isTxRet = isTxRetMeta(m)
                      const cor    = kpi ? STATUS_COR[kpi.status] : 'var(--text-muted)'
                      const rgb    = kpi ? STATUS_RGB[kpi.status] : '255,255,255'
                      const val    = kpi ? formatarExibicao(kpi.valor, kpi.unidade) : '—'

                      return (
                        <td key={m.id} style={{ padding: '10px 12px', textAlign: 'center' }}>
                          {kpi && isTxRet ? (
                            <span style={{
                              display: 'inline-block',
                              padding: '3px 10px',
                              borderRadius: '20px',
                              fontSize: '12px',
                              fontWeight: 700,
                              fontVariantNumeric: 'tabular-nums',
                              background: `rgba(${rgb},0.1)`,
                              border: `1px solid rgba(${rgb},0.2)`,
                              color: cor,
                            }}>
                              {val}
                            </span>
                          ) : (
                            <span style={{ fontSize: '12px', fontWeight: 600, fontVariantNumeric: 'tabular-nums', color: cor }}>
                              {val}
                            </span>
                          )}
                        </td>
                      )
                    })}

                    {/* Status dot */}
                    <td style={{ padding: '10px 16px', textAlign: 'center' }}>
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
                    <td style={{ padding: '10px 14px', textAlign: 'right' }}>
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

              {filtered.length === 0 && (
                <tr>
                  <td colSpan={basicos.length + 3} style={{ padding: '32px', textAlign: 'center', color: 'var(--text-muted)', fontSize: '13px' }}>
                    Nenhum operador neste filtro.
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      </div>

      {/* ── Cards mobile ── */}
      <div className="lg:hidden grid grid-cols-1 sm:grid-cols-2 gap-3">
        {filtered.map(({ op, kpis, encontrado }) => {
          const gs = globalStatus(kpis)
          const av = avatarDourado(op.id)

          return (
            <Link
              key={op.id}
              href={`/painel/kpi/${op.username}`}
              style={{
                display: 'block',
                background: 'var(--void3)',
                border: '1px solid rgba(201,168,76,0.08)',
                borderLeft: `3px solid ${STATUS_COR[gs]}`,
                borderRadius: '12px',
                padding: '14px 16px',
                transition: 'background 0.15s',
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

              {encontrado && basicos.length > 0 ? (
                <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: '6px' }}>
                  {basicos.slice(0, 6).map((m) => {
                    const kpi = kpis.find((k) => normalizarChave(k.nome_coluna) === normalizarChave(m.nome_coluna))
                    const cor = kpi ? STATUS_COR[kpi.status] : 'var(--text-muted)'
                    return (
                      <div key={m.id} style={{ background: 'rgba(255,255,255,0.03)', border: '1px solid rgba(255,255,255,0.04)', borderRadius: '8px', padding: '7px 8px' }}>
                        <p style={{ fontSize: '9px', textTransform: 'uppercase', letterSpacing: '0.05em', color: 'var(--text-muted)', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                          {m.label}
                        </p>
                        <p style={{ fontSize: '13px', fontWeight: 700, marginTop: '2px', fontVariantNumeric: 'tabular-nums', color: cor }}>
                          {kpi ? formatarExibicao(kpi.valor, kpi.unidade) : '—'}
                        </p>
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

      {/* ── Popup hover card ── */}
      {hovered && hovData && (() => {
        const { op, kpis } = hovData
        const gs       = globalStatus(kpis)
        const av       = avatarDourado(op.id)
        const verde    = kpis.filter((k) => k.status === 'verde').length
        const amarelo  = kpis.filter((k) => k.status === 'amarelo').length
        const vermelho = kpis.filter((k) => k.status === 'vermelho').length

        return (
          <div
            style={{
              position: 'fixed',
              top: `${hovered.y}px`,
              left: `${hovered.x}px`,
              width: '260px',
              background: '#0d0d1a',
              border: '1px solid rgba(201,168,76,0.25)',
              boxShadow: '0 20px 60px rgba(0,0,0,0.6), 0 0 0 1px rgba(201,168,76,0.1)',
              borderRadius: '14px',
              padding: '16px',
              zIndex: 9999,
              pointerEvents: 'none',
              animation: 'tooltipIn 150ms ease forwards',
            }}
          >
            {/* Header */}
            <div style={{ display: 'flex', alignItems: 'center', gap: '12px', marginBottom: '12px' }}>
              <div style={{
                width: '40px', height: '40px', borderRadius: '10px',
                display: 'flex', alignItems: 'center', justifyContent: 'center',
                fontSize: '13px', fontWeight: 700, flexShrink: 0,
                fontFamily: 'var(--ff-display)',
                ...av,
              }}>
                {getIniciaisNome(op.nome)}
              </div>
              <div style={{ minWidth: 0 }}>
                <p style={{ fontSize: '13px', fontWeight: 600, color: 'var(--text-primary)', lineHeight: 1.3, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                  {op.nome}
                </p>
                <p style={{ fontSize: '10px', color: 'var(--text-muted)', marginTop: '2px' }}>
                  {op.username}
                </p>
              </div>
            </div>

            {/* Separador dourado */}
            <div style={{ height: '1px', background: 'linear-gradient(90deg, rgba(201,168,76,0.35) 0%, transparent 100%)', marginBottom: '12px' }} />

            {/* Grid 2×3 KPIs */}
            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '10px', marginBottom: '12px' }}>
              {basicos.slice(0, 6).map((m) => {
                const kpi      = kpis.find((k) => normalizarChave(k.nome_coluna) === normalizarChave(m.nome_coluna))
                const cor      = kpi ? STATUS_COR[kpi.status] : 'var(--text-muted)'
                const progresso = kpi?.progresso ?? 0

                return (
                  <div key={m.id}>
                    <p style={{ fontSize: '10px', color: 'var(--text-muted)', textTransform: 'uppercase', letterSpacing: '0.05em', marginBottom: '3px', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                      {m.label}
                    </p>
                    <p style={{ fontSize: '14px', fontWeight: 700, color: cor, fontVariantNumeric: 'tabular-nums', lineHeight: 1 }}>
                      {kpi ? formatarExibicao(kpi.valor, kpi.unidade) : '—'}
                    </p>
                    <div style={{ width: '100%', height: '3px', background: 'rgba(255,255,255,0.07)', borderRadius: '2px', marginTop: '5px', overflow: 'hidden' }}>
                      <div style={{ width: `${progresso}%`, height: '100%', background: cor, borderRadius: '2px' }} />
                    </div>
                  </div>
                )
              })}
            </div>

            {/* Separador rodapé */}
            <div style={{ height: '1px', background: 'rgba(255,255,255,0.05)', marginBottom: '10px' }} />

            {/* Rodapé status */}
            <div style={{ display: 'flex', alignItems: 'center', gap: '6px', flexWrap: 'wrap' }}>
              <div style={{ width: '7px', height: '7px', borderRadius: '50%', background: STATUS_COR[gs], boxShadow: `0 0 5px ${STATUS_COR[gs]}`, flexShrink: 0 }} />
              {verde    > 0 && <span style={{ fontSize: '10px', color: '#10b981' }}>{verde} verde{verde    !== 1 ? 's' : ''}</span>}
              {verde    > 0 && (amarelo > 0 || vermelho > 0) && <span style={{ color: 'rgba(255,255,255,0.15)', fontSize: '10px' }}>·</span>}
              {amarelo  > 0 && <span style={{ fontSize: '10px', color: '#f59e0b' }}>{amarelo} amarelo{amarelo !== 1 ? 's' : ''}</span>}
              {amarelo  > 0 && vermelho > 0 && <span style={{ color: 'rgba(255,255,255,0.15)', fontSize: '10px' }}>·</span>}
              {vermelho > 0 && <span style={{ fontSize: '10px', color: '#ef4444' }}>{vermelho} vermelho{vermelho !== 1 ? 's' : ''}</span>}
              {verde === 0 && amarelo === 0 && vermelho === 0 && (
                <span style={{ fontSize: '10px', color: 'var(--text-muted)' }}>sem dados</span>
              )}
            </div>
          </div>
        )
      })()}
    </div>
  )
}
