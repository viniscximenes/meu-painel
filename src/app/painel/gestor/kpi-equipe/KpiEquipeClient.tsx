'use client'

import { useState, useMemo, useEffect, useCallback } from 'react'
import { X } from 'lucide-react'
import type { OperadorKpiRow } from '@/lib/kpi-consolidado-sheets'
import { PainelHeader, LinhaHorizontalDourada } from '@/components/painel/PainelHeader'
import { PainelSectionTitle } from '@/components/painel/PainelSectionTitle'

// ── Thresholds ────────────────────────────────────────────────────────────────

const META_TX_RET_VERDE   = 66
const META_TX_RET_AMARELO = 60
const META_TMA_SEG        = 731
const META_ABS_PCT        = 5
const META_INDISP_PCT     = 14.5

// ── Types ─────────────────────────────────────────────────────────────────────

type FilterKey = 'txret' | 'tma' | 'abs' | 'indisp'
type Status    = 'verde' | 'amarelo' | 'vermelho' | 'neutro'

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

// ── Nome display ──────────────────────────────────────────────────────────────

function nomeDisplay(nome: string): string {
  return nome.trim().split(/\s+/).slice(0, 2).join(' ').toUpperCase()
}

// ── Fontes e cores ────────────────────────────────────────────────────────────

const FF_SYNE_KE = "'Syne', sans-serif"
const FF_DM_KE   = "'DM Sans', sans-serif"

const STATUS_TABLE: Record<Status, string> = {
  verde:    '#7DDB5B',
  amarelo:  '#FFB922',
  vermelho: 'rgba(250,76,76,0.9)',
  neutro:   '#A6A2A2',
}

// ── Filtragem por deflator ────────────────────────────────────────────────────

function filtrarPorDeflator(lista: OperadorKpiRow[], filtro: FilterKey): OperadorKpiRow[] {
  let result: OperadorKpiRow[]
  if (filtro === 'txret') {
    result = lista.filter(o => o.txRetBrutaPct !== null && o.txRetBrutaPct < META_TX_RET_AMARELO)
    result.sort((a, b) => (a.txRetBrutaPct ?? 100) - (b.txRetBrutaPct ?? 100))
  } else if (filtro === 'tma') {
    result = lista.filter(o => o.tmaSeg !== null && o.tmaSeg > META_TMA_SEG)
    result.sort((a, b) => (b.tmaSeg ?? 0) - (a.tmaSeg ?? 0))
  } else if (filtro === 'abs') {
    result = lista.filter(o => o.absPct !== null && o.absPct >= META_ABS_PCT)
    result.sort((a, b) => (b.absPct ?? 0) - (a.absPct ?? 0))
  } else {
    result = lista.filter(o => o.indispPct !== null && o.indispPct >= META_INDISP_PCT)
    result.sort((a, b) => (b.indispPct ?? 0) - (a.indispPct ?? 0))
  }
  return result
}

// ── Mapa FilterKey → índice na lista de métricas ─────────────────────────────

const FILTER_METRICA_IDX: Record<FilterKey, number> = {
  txret:  2,
  tma:    3,
  abs:    4,
  indisp: 5,
}

// ── Categorias complementares (reusadas de /meu-kpi) ─────────────────────────

const SUBSECOES_COMPLEMENTARES = [
  {
    titulo: 'GANHOS & RETENÇÃO',
    items: (op: OperadorKpiRow) => [
      { label: '% Variação Ticket',     valor: op.varTicket },
      { label: 'Tx. Retenção Liq. 15d', valor: op.txRetLiq15d },
    ],
  },
  {
    titulo: 'QUALIDADE DO ATENDIMENTO',
    items: (op: OperadorKpiRow) => [
      { label: 'Atendidas',          valor: op.atendidas },
      { label: 'Transfer (%)',        valor: op.transfer },
      { label: 'Short Call (%)',      valor: op.shortCall },
      { label: 'Rechamada D+7 (%)',  valor: op.rechamadaD7 },
      { label: 'Tx. Tabulação (%)', valor: op.txTabulacao },
      { label: 'CSAT',               valor: op.csat },
    ],
  },
  {
    titulo: 'COMPORTAMENTO E PAUSAS',
    items: (op: OperadorKpiRow) => [
      { label: 'Engajamento',       valor: op.engajamento },
      { label: 'NR17 (%)',          valor: op.nr17 },
      { label: 'Pessoal (%)',       valor: op.pessoal },
      { label: 'Outras Pausas (%)', valor: op.outrasPausas },
    ],
  },
  {
    titulo: 'PRESENÇA',
    items: (op: OperadorKpiRow) => [
      { label: 'Tempo Projetado', valor: op.tempoProjetado },
      { label: 'Tempo de Login',  valor: op.tempoLogin },
    ],
  },
]

// ── Props ─────────────────────────────────────────────────────────────────────

interface Props {
  operadores:      OperadorKpiRow[]
  dataAtualizacao: string | null
  mesLabel:        string
}

// ── Main component ────────────────────────────────────────────────────────────

export default function KpiEquipeClient({ operadores, dataAtualizacao, mesLabel }: Props) {
  const [activeFilter,        setActiveFilter]        = useState<FilterKey | null>(null)
  const [operadorSelecionado, setOperadorSelecionado] = useState<OperadorKpiRow | null>(null)

  function applyFilter(key: FilterKey) {
    setActiveFilter(prev => prev === key ? null : key)
  }

  const listaExibida = useMemo(() => {
    if (!activeFilter) {
      return [...operadores].sort((a, b) => a.nome.localeCompare(b.nome, 'pt-BR'))
    }
    return filtrarPorDeflator(operadores, activeFilter)
  }, [operadores, activeFilter])

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
        @keyframes modalEntra {
          from { opacity: 0; transform: scale(0.96) translateY(8px); }
          to   { opacity: 1; transform: scale(1) translateY(0); }
        }
      `}} />

      <div className="halo-cards-bg" style={{ display: 'flex', flexDirection: 'column', gap: '14px' }}>

        {/* ── Header ── */}
        <PainelHeader titulo="KPI EQUIPE" mesLabel={mesLabel} dataReferencia={dataAtualizacao} />
        <LinhaHorizontalDourada />

        {/* ── KPIs PRINCIPAIS ── */}
        <PainelSectionTitle>KPIs PRINCIPAIS</PainelSectionTitle>

        {/* ── Filtro de Deflatores ── */}
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
            fontFamily: FF_SYNE_KE,
            fontWeight: 600,
            fontSize: '13px',
            color: '#72708F',
            textTransform: 'uppercase',
            letterSpacing: '1px',
            flexShrink: 0,
          }}>
            DEFLATORES:
          </span>
          <div style={{ display: 'flex', gap: '8px', flexWrap: 'wrap' }}>
            {([
              { key: 'txret',  label: 'TX. RETENÇÃO' },
              { key: 'tma',    label: 'TMA' },
              { key: 'abs',    label: 'ABS' },
              { key: 'indisp', label: 'INDISP.' },
            ] as { key: FilterKey; label: string }[]).map(({ key, label }) => {
              const ativo = activeFilter === key
              return (
                <button
                  key={key}
                  type="button"
                  onClick={() => applyFilter(key)}
                  aria-pressed={ativo}
                  style={{
                    fontFamily: FF_SYNE_KE,
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

        {/* Lista unificada */}
        <ListaOperadores
          operadores={listaExibida}
          activeFilter={activeFilter}
          emptyMsg={activeFilter ? FILTER_EMPTY_MSG[activeFilter] : undefined}
          onSelect={setOperadorSelecionado}
        />

      </div>

      {/* Modal */}
      {operadorSelecionado && (
        <ModalDetalhesOperador
          operador={operadorSelecionado}
          onClose={() => setOperadorSelecionado(null)}
        />
      )}
    </>
  )
}

// ── Lista de operadores ───────────────────────────────────────────────────────

interface ListaProps {
  operadores:   OperadorKpiRow[]
  activeFilter: FilterKey | null
  emptyMsg?:    string
  onSelect:     (op: OperadorKpiRow) => void
}

function ListaOperadores({ operadores, activeFilter, emptyMsg, onSelect }: ListaProps) {
  if (operadores.length === 0) {
    return (
      <div style={{ padding: '40px 0', textAlign: 'center' }}>
        <p style={{
          fontFamily: FF_SYNE_KE,
          fontSize: '13px',
          color: emptyMsg ? '#7DDB5B' : '#72708f',
          fontWeight: emptyMsg ? 500 : 400,
        }}>
          {emptyMsg ?? 'Nenhum operador encontrado.'}
        </p>
      </div>
    )
  }

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
      {operadores.map((op, idx) => {
        const todasMetricas: { label: string; value: string; color: string }[] = [
          { label: 'PEDIDOS',      value: fmtInt(op.pedidos),       color: STATUS_TABLE.neutro },
          { label: 'CHURN',        value: fmtInt(op.churn),         color: STATUS_TABLE.neutro },
          { label: 'TX. RETENÇÃO', value: fmtPct(op.txRetBrutaPct), color: STATUS_TABLE[txRetStatus(op.txRetBrutaPct)] },
          { label: 'TMA',          value: fmtTma(op.tmaSeg),        color: STATUS_TABLE[tmaStatus(op.tmaSeg)] },
          { label: 'ABS',          value: fmtPct(op.absPct),        color: STATUS_TABLE[absStatus(op.absPct)] },
          { label: 'INDISP.',      value: fmtPct(op.indispPct),     color: STATUS_TABLE[indispStatus(op.indispPct)] },
        ]

        const metricasVisiveis = activeFilter
          ? [todasMetricas[FILTER_METRICA_IDX[activeFilter]]]
          : todasMetricas

        return (
          <div
            key={op.id}
            role="button"
            tabIndex={0}
            onClick={() => onSelect(op)}
            onKeyDown={e => { if (e.key === 'Enter' || e.key === ' ') { e.preventDefault(); onSelect(op) } }}
            style={{
              background: '#070714',
              border: '1px solid rgba(255,185,34,0.25)',
              borderRadius: '0',
              padding: '16px 24px',
              display: 'flex',
              alignItems: 'center',
              gap: '32px',
              animation: 'kpiEquipeRowIn 0.3s ease both',
              animationDelay: `${idx * 30}ms`,
              transition: 'border-color 0.2s ease',
              cursor: 'pointer',
              outline: 'none',
            }}
            onMouseEnter={e => { (e.currentTarget as HTMLElement).style.borderColor = 'rgba(255,185,34,0.55)' }}
            onMouseLeave={e => { (e.currentTarget as HTMLElement).style.borderColor = 'rgba(255,185,34,0.25)' }}
            onFocus={e => { (e.currentTarget as HTMLElement).style.borderColor = 'rgba(255,185,34,0.55)' }}
            onBlur={e => { (e.currentTarget as HTMLElement).style.borderColor = 'rgba(255,185,34,0.25)' }}
          >
            {/* Nome */}
            <span style={{
              fontFamily: FF_SYNE_KE,
              fontWeight: 600,
              fontSize: '20px',
              color: '#A6A2A2',
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

            {/* Métricas visíveis */}
            {metricasVisiveis.map(({ label, value, color }) => (
              <div key={label} style={{ display: 'flex', flexDirection: 'column', alignItems: 'flex-end', gap: '2px', flexShrink: 0 }}>
                <span style={{
                  fontFamily: FF_SYNE_KE,
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
                  fontFamily: FF_DM_KE,
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
        )
      })}
    </div>
  )
}

// ── Modal de detalhes do operador ─────────────────────────────────────────────

function ModalDetalhesOperador({ operador, onClose }: { operador: OperadorKpiRow; onClose: () => void }) {
  const handleKey = useCallback((e: KeyboardEvent) => {
    if (e.key === 'Escape') onClose()
  }, [onClose])

  useEffect(() => {
    window.addEventListener('keydown', handleKey)
    return () => window.removeEventListener('keydown', handleKey)
  }, [handleKey])

  return (
    <div
      role="dialog"
      aria-modal="true"
      aria-labelledby="modal-operador-titulo"
      onClick={onClose}
      style={{
        position: 'fixed',
        inset: 0,
        background: 'rgba(0,0,0,0.75)',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        zIndex: 100,
        backdropFilter: 'blur(4px)',
        WebkitBackdropFilter: 'blur(4px)',
      }}
    >
      <div
        onClick={e => e.stopPropagation()}
        style={{
          background: '#070714',
          border: '1px solid rgba(244,212,124,0.2)',
          borderRadius: '12px',
          padding: '32px',
          width: '90vw',
          maxWidth: '720px',
          maxHeight: '85vh',
          overflowY: 'auto',
          boxShadow: '0 20px 60px rgba(0,0,0,0.5)',
          animation: 'modalEntra 200ms ease-out',
          position: 'relative',
        }}
      >
        {/* Botão fechar */}
        <button
          type="button"
          onClick={onClose}
          aria-label="Fechar modal"
          style={{
            position: 'absolute',
            top: '20px',
            right: '20px',
            background: 'transparent',
            border: 'none',
            color: '#72708F',
            cursor: 'pointer',
            padding: '8px',
            borderRadius: '6px',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            transition: 'all 200ms ease',
          }}
          onMouseEnter={e => {
            const el = e.currentTarget as HTMLElement
            el.style.color = '#f4d47c'
            el.style.background = 'rgba(244,212,124,0.08)'
          }}
          onMouseLeave={e => {
            const el = e.currentTarget as HTMLElement
            el.style.color = '#72708F'
            el.style.background = 'transparent'
          }}
        >
          <X size={20} />
        </button>

        {/* Header */}
        <div style={{ marginBottom: '24px', paddingRight: '40px' }}>
          <h2
            id="modal-operador-titulo"
            style={{
              fontFamily: FF_SYNE_KE,
              fontWeight: 700,
              fontSize: '24px',
              color: '#f4d47c',
              textTransform: 'uppercase',
              letterSpacing: '0.5px',
              margin: 0,
              lineHeight: 1.2,
            }}
          >
            {operador.nome}
          </h2>
          <p style={{
            fontFamily: FF_SYNE_KE,
            fontWeight: 500,
            fontSize: '13px',
            color: '#72708f',
            textTransform: 'uppercase',
            letterSpacing: '1.5px',
            margin: '6px 0 0',
          }}>
            Detalhes complementares
          </p>
        </div>

        {/* Linha divisória */}
        <div style={{
          height: '1px',
          background: 'rgba(244,212,124,0.15)',
          marginBottom: '24px',
        }} />

        {/* Categorias */}
        {!operador.encontrado ? (
          <p style={{ fontFamily: FF_SYNE_KE, fontSize: '13px', color: '#72708f', textAlign: 'center', padding: '24px 0' }}>
            Sem dados disponíveis para este operador no período.
          </p>
        ) : (
          <div style={{ display: 'flex', flexDirection: 'column', gap: '24px' }}>
            {SUBSECOES_COMPLEMENTARES.map(sub => (
              <div key={sub.titulo}>
                <div style={{ marginBottom: '12px' }}>
                  <PainelSectionTitle>{sub.titulo}</PainelSectionTitle>
                </div>
                <div style={{ display: 'flex', flexDirection: 'column' }}>
                  {sub.items(operador).map(({ label, valor }) => {
                    const vazio = !valor || valor === '—'
                    return (
                      <div
                        key={label}
                        style={{
                          display: 'flex',
                          justifyContent: 'space-between',
                          alignItems: 'baseline',
                          padding: '9px 0',
                          borderBottom: '1px solid rgba(255,255,255,0.04)',
                        }}
                      >
                        <span style={{
                          fontFamily: FF_SYNE_KE,
                          fontWeight: 600,
                          fontSize: '14px',
                          color: '#72708f',
                          textTransform: 'uppercase',
                          letterSpacing: '1px',
                        }}>
                          {label}
                        </span>
                        <span style={{
                          fontFamily: FF_DM_KE,
                          fontWeight: 500,
                          fontSize: '16px',
                          color: vazio ? 'rgba(114,112,143,0.35)' : '#A6A2A2',
                          fontFeatureSettings: "'tnum'",
                        }}>
                          {vazio ? '—' : valor}
                        </span>
                      </div>
                    )
                  })}
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  )
}
