'use client'

import { useState, useMemo } from 'react'
import { PainelHeader, LinhaHorizontalDourada } from '@/components/painel/PainelHeader'

// ── Types ─────────────────────────────────────────────────────────────────────

export interface Q4MetricData {
  topicoId:         string
  nomeTopico:       string
  rankGlobal:       number
  totalOperadores:  number
  metricaFormatada: string
}

export interface OperadorQuartilData {
  id:       number
  nome:     string
  username: string
  q4:       Q4MetricData[]
}

interface Props {
  operadores:      OperadorQuartilData[]
  dataAtualizacao: string | null
  mesLabel:        string
}

// ── Constantes ────────────────────────────────────────────────────────────────

const TOPICO_ORDER = ['txretencao', 'tma', 'churn', 'indisp', 'abs']

const TOPICO_LABELS: Record<string, string> = {
  txretencao: 'TX RETENÇÃO',
  tma:        'TMA',
  churn:      'CANCELADOS',
  indisp:     'INDISP.',
  abs:        'ABS',
}

const NOMES_METRICA: Record<string, string> = {
  txretencao: 'TAXA DE RETENÇÃO',
  tma:        'TMA',
  churn:      'CANCELADOS',
  indisp:     'INDISPONIBILIDADE',
  abs:        'ABS',
}

// ── Fontes ────────────────────────────────────────────────────────────────────

const FF_SYNE = "'Syne', sans-serif"
const FF_DM   = "'DM Sans', sans-serif"

// ── Nome: dois primeiros tokens ───────────────────────────────────────────────

function nomeDisplay(nome: string): string {
  return nome.trim().split(/\s+/).slice(0, 2).join(' ').toUpperCase()
}

// ── Main component ────────────────────────────────────────────────────────────

export default function QuartilEquipeClient({ operadores, dataAtualizacao, mesLabel }: Props) {
  const [activeFilter, setActiveFilter] = useState<string | null>(null)

  const filtered = useMemo(() => {
    if (!activeFilter) return operadores
    return operadores.filter(op => op.q4.some(t => t.topicoId === activeFilter))
  }, [operadores, activeFilter])

  // Só exibir pills para métricas que têm algum Q4 real
  const topicosPresentes = useMemo(() => {
    const ids = new Set(operadores.flatMap(op => op.q4.map(t => t.topicoId)))
    return TOPICO_ORDER.filter(id => ids.has(id))
  }, [operadores])

  return (
    <>
      <style dangerouslySetInnerHTML={{ __html: `
        @keyframes q4RowIn {
          from { opacity: 0; transform: translateY(8px); }
          to   { opacity: 1; transform: translateY(0); }
        }
      `}} />

      <div className="halo-cards-bg" style={{ display: 'flex', flexDirection: 'column', gap: '14px' }}>

        {/* ── Header ── */}
        <PainelHeader
          titulo={<><span style={{ fontFamily: "'DM Sans', sans-serif", fontWeight: 500 }}>Q4</span>{' '}EQUIPE</>}
          mesLabel={mesLabel}
          dataReferencia={dataAtualizacao}
        />
        <LinhaHorizontalDourada />

        {/* ── Filtro por métrica ── */}
        {topicosPresentes.length > 1 && (
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
              color: '#474658',
              textTransform: 'uppercase',
              letterSpacing: '1px',
              flexShrink: 0,
            }}>
              FILTRAR POR MÉTRICA:
            </span>
            <div style={{ display: 'flex', gap: '8px', flexWrap: 'wrap' }}>
              {topicosPresentes.map(id => {
                const ativo = activeFilter === id
                return (
                  <button
                    key={id}
                    type="button"
                    onClick={() => setActiveFilter(prev => prev === id ? null : id)}
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
                    {TOPICO_LABELS[id] ?? id.toUpperCase()}
                  </button>
                )
              })}
            </div>
          </div>
        )}

        {/* ── Estado vazio total ── */}
        {operadores.length === 0 && (
          <div style={{ padding: '56px 24px', textAlign: 'center' }}>
            <p style={{ fontFamily: FF_SYNE, fontSize: '15px', fontWeight: 600, color: '#7DDB5B', marginBottom: '8px' }}>
              Nenhum operador da sua equipe está no pior quartil da empresa
            </p>
            <p style={{ fontFamily: FF_SYNE, fontSize: '13px', color: '#52525b' }}>
              Parabéns, seu time está acima da média!
            </p>
          </div>
        )}

        {/* ── Estado vazio de filtro ── */}
        {operadores.length > 0 && activeFilter && filtered.length === 0 && (
          <div style={{ padding: '40px 0', textAlign: 'center' }}>
            <p style={{ fontFamily: FF_SYNE, fontSize: '13px', color: '#7DDB5B', fontWeight: 500 }}>
              Nenhum operador da sua equipe está em Q4 de {TOPICO_LABELS[activeFilter] ?? activeFilter} ✓
            </p>
          </div>
        )}

        {/* ── Cards de operadores ── */}
        {filtered.length > 0 && (
          <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
            {filtered.map((op, idx) => {
              // Quando filtro ativo: só a linha dessa métrica; senão: pior rank primeiro
              const linhas = activeFilter
                ? op.q4.filter(t => t.topicoId === activeFilter)
                : [...op.q4].sort((a, b) =>
                    b.rankGlobal / (b.totalOperadores || 1) - a.rankGlobal / (a.totalOperadores || 1)
                  )

              return (
                <div
                  key={op.id}
                  style={{
                    background: '#070714',
                    border: '1px solid rgba(255,185,34,0.25)',
                    borderRadius: '0',
                    padding: '20px 24px',
                    display: 'flex',
                    flexDirection: 'row',
                    alignItems: 'center',
                    justifyContent: 'space-between',
                    gap: '24px',
                    animation: 'q4RowIn 0.3s ease both',
                    animationDelay: `${idx * 30}ms`,
                    transition: 'border-color 0.2s ease',
                  }}
                  onMouseEnter={e => { (e.currentTarget as HTMLElement).style.borderColor = 'rgba(255,185,34,0.55)' }}
                  onMouseLeave={e => { (e.currentTarget as HTMLElement).style.borderColor = 'rgba(255,185,34,0.25)' }}
                >
                  {/* Coluna esquerda: nome */}
                  <span style={{
                    fontFamily: FF_SYNE,
                    fontWeight: 600,
                    fontSize: '20px',
                    color: '#A6A2A2',
                    textTransform: 'uppercase',
                    letterSpacing: '0.5px',
                    flexShrink: 0,
                  }}>
                    {nomeDisplay(op.nome)}
                  </span>

                  {/* Coluna direita: linhas de métrica */}
                  <div style={{ display: 'flex', flexDirection: 'column', gap: '12px', alignItems: 'flex-end' }}>
                    {linhas.map(t => (
                      <div
                        key={t.topicoId}
                        style={{ display: 'flex', alignItems: 'baseline', justifyContent: 'flex-end', gap: '0' }}
                      >
                        {/* Q4 */}
                        <span style={{
                          fontFamily: FF_DM,
                          fontWeight: 500,
                          fontSize: '20px',
                          color: '#474658',
                          whiteSpace: 'nowrap',
                          lineHeight: 1,
                        }}>
                          Q4
                        </span>

                        {/* Label da métrica */}
                        <span style={{
                          fontFamily: FF_SYNE,
                          fontWeight: 600,
                          fontSize: '20px',
                          color: '#474658',
                          textTransform: 'uppercase',
                          letterSpacing: '1px',
                          whiteSpace: 'nowrap',
                          marginLeft: '8px',
                        }}>
                          {NOMES_METRICA[t.topicoId] ?? t.nomeTopico.toUpperCase()}
                        </span>

                        {/* Divisor vertical (padrão #211F3C de /meu-kpi) */}
                        <div style={{
                          width: '1px',
                          background: '#211F3C',
                          alignSelf: 'stretch',
                          flexShrink: 0,
                          margin: '0 14px',
                        }} />

                        {/* Valor */}
                        <span style={{
                          fontFamily: FF_DM,
                          fontWeight: 500,
                          fontSize: '20px',
                          color: 'rgba(227,57,57,0.74)',
                          fontFeatureSettings: "'tnum'",
                          whiteSpace: 'nowrap',
                          lineHeight: 1,
                        }}>
                          {t.metricaFormatada}
                        </span>

                        {/* En-dash separador */}
                        <span style={{
                          fontFamily: FF_DM,
                          fontWeight: 500,
                          fontSize: '20px',
                          color: '#474658',
                          margin: '0 8px',
                        }}>
                          {'–'}
                        </span>

                        {/* Rank */}
                        <span style={{
                          fontFamily: FF_DM,
                          fontWeight: 500,
                          fontSize: '20px',
                          color: '#474658',
                          whiteSpace: 'nowrap',
                        }}>
                          {t.rankGlobal}º de {t.totalOperadores}
                        </span>
                      </div>
                    ))}
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
