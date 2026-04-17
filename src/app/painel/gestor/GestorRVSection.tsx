'use client'

import { useState } from 'react'
import type { ResultadoRVGestor, RVGestorConfig } from '@/lib/rv-gestor-utils'
import { formatBRLGestor, segParaMMSSGestor } from '@/lib/rv-gestor-utils'
import { AlertTriangle, CheckCircle, Users, Info } from 'lucide-react'
import { getIniciaisNome } from '@/lib/operadores'

export type OpKpiData = {
  id: number
  nome: string
  retencaoVal: number
  indispVal: number
  tmaValSeg: number
  ticketVal: number
  absVal: number
}

type HoverLine = 'retracao' | 'indisp' | 'tma' | 'ticket' | 'abs-deflator' | null

interface Props {
  rv: ResultadoRVGestor
  config: RVGestorConfig
  opKpis: OpKpiData[]
  absVal: number
}

const GOLD_GRAD = 'linear-gradient(135deg, #e8c96d 0%, #c9a84c 100%)'

function segParaDisplay(seg: number): string {
  const m = Math.floor(seg / 60)
  const s = Math.round(seg % 60)
  return `${String(m).padStart(2, '0')}:${String(s).padStart(2, '0')}`
}

// ── Popup de operadores fora da meta ─────────────────────────────────────────

function OpPopup({ line, config, opKpis }: { line: HoverLine; config: RVGestorConfig; opKpis: OpKpiData[] }) {
  if (!line || line === 'abs-deflator') return null

  type OpEntry = { op: OpKpiData; valor: string; cor: string }
  let title = ''
  let metaLabel = ''
  let entries: OpEntry[] = []

  if (line === 'retracao') {
    title = 'TX Retenção'
    metaLabel = 'Meta ≥ 60%'
    entries = opKpis
      .filter(o => o.retencaoVal > 0 && o.retencaoVal < 60)
      .sort((a, b) => a.retencaoVal - b.retencaoVal)
      .map(o => ({ op: o, valor: `${o.retencaoVal.toFixed(1)}%`, cor: '#ef4444' }))
  } else if (line === 'indisp') {
    title = 'Indisponibilidade'
    metaLabel = `Meta ≤ ${config.indispMeta}%`
    entries = opKpis
      .filter(o => o.indispVal > config.indispMeta)
      .sort((a, b) => b.indispVal - a.indispVal)
      .map(o => ({ op: o, valor: `${o.indispVal.toFixed(1)}%`, cor: '#ef4444' }))
  } else if (line === 'tma') {
    title = 'TMA'
    metaLabel = `Meta ≤ ${segParaDisplay(config.tmaMetaSeg)}`
    entries = opKpis
      .filter(o => o.tmaValSeg > config.tmaMetaSeg)
      .sort((a, b) => b.tmaValSeg - a.tmaValSeg)
      .map(o => ({ op: o, valor: segParaDisplay(o.tmaValSeg), cor: '#ef4444' }))
  } else if (line === 'ticket') {
    return null
  }

  return (
    <div style={{
      background: '#0d0d1a',
      border: '1px solid rgba(201,168,76,0.20)',
      borderRadius: '12px',
      padding: '14px',
      minWidth: '220px',
      maxWidth: '260px',
    }}>
      <div style={{ display: 'flex', alignItems: 'center', gap: '6px', marginBottom: '10px' }}>
        <Users size={12} style={{ color: 'var(--gold)', flexShrink: 0 }} />
        <span style={{ fontSize: '10px', fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.10em', color: 'var(--gold-light)' }}>
          {title}
        </span>
      </div>
      <p style={{ fontSize: '9px', color: 'var(--text-muted)', marginBottom: '8px', letterSpacing: '0.06em' }}>
        {metaLabel} · {entries.length} fora da meta
      </p>

      {entries.length === 0 ? (
        <p style={{ fontSize: '11px', color: '#34d399', textAlign: 'center', padding: '8px 0' }}>
          Todos dentro da meta ✓
        </p>
      ) : (
        <div style={{ display: 'flex', flexDirection: 'column', gap: '5px', maxHeight: '260px', overflowY: 'auto' }}>
          {entries.map(({ op, valor, cor }) => (
            <div key={op.id} style={{
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'space-between',
              gap: '8px',
              padding: '5px 8px',
              borderRadius: '7px',
              background: 'rgba(255,255,255,0.02)',
              border: '1px solid rgba(255,255,255,0.04)',
            }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: '6px', minWidth: 0 }}>
                <div
                  style={{
                    width: '20px',
                    height: '20px',
                    borderRadius: '5px',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    fontSize: '7px',
                    fontWeight: 700,
                    flexShrink: 0,
                    color: '#ffffff',
                    background: op.id % 2 !== 0
                      ? 'linear-gradient(135deg, #0f1729, #1a2540)'
                      : 'linear-gradient(135deg, #0a1020, #111830)',
                    border: op.id % 2 !== 0
                      ? '1px solid rgba(66,139,255,0.25)'
                      : '1px solid rgba(66,139,255,0.15)',
                  }}
                >
                  {getIniciaisNome(op.nome)}
                </div>
                <span style={{ fontSize: '10px', color: 'var(--text-secondary)', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                  {op.nome.split(' ')[0]}
                </span>
              </div>
              <span style={{ fontSize: '11px', fontWeight: 700, color: cor, fontVariantNumeric: 'tabular-nums', flexShrink: 0 }}>
                {valor}
              </span>
            </div>
          ))}
        </div>
      )}
    </div>
  )
}

// ── Popup de faixas ABS ───────────────────────────────────────────────────────

function AbsPopup({ config, absVal }: { config: RVGestorConfig; absVal: number }) {
  const faixas = [
    { label: '0 – 5%',   perda: 0  },
    { label: '5 – 6%',   perda: 10 },
    { label: '6 – 8%',   perda: 20 },
    { label: '8 – 10%',  perda: 30 },
    { label: '> 10%',    perda: 50 },
  ]

  // Determine which faixa the gestor is in
  let currentFaixa = 0
  if (absVal > 10) currentFaixa = 4
  else if (absVal > 8) currentFaixa = 3
  else if (absVal > 6) currentFaixa = 2
  else if (absVal > 5) currentFaixa = 1

  return (
    <div style={{
      background: '#0d0d1a',
      border: '1px solid rgba(201,168,76,0.20)',
      borderRadius: '12px',
      padding: '14px',
      minWidth: '200px',
    }}>
      <div style={{ display: 'flex', alignItems: 'center', gap: '6px', marginBottom: '10px' }}>
        <Info size={12} style={{ color: 'var(--gold)', flexShrink: 0 }} />
        <span style={{ fontSize: '10px', fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.10em', color: 'var(--gold-light)' }}>
          Faixas ABS
        </span>
      </div>

      <div style={{ display: 'flex', flexDirection: 'column', gap: '4px' }}>
        {faixas.map((f, i) => {
          const isActive = i === currentFaixa
          return (
            <div key={i} style={{
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'space-between',
              gap: '12px',
              padding: '5px 8px',
              borderRadius: '7px',
              background: isActive ? 'rgba(239,68,68,0.10)' : 'rgba(255,255,255,0.02)',
              border: isActive ? '1px solid rgba(239,68,68,0.25)' : '1px solid rgba(255,255,255,0.04)',
            }}>
              <span style={{ fontSize: '10px', color: isActive ? '#fca5a5' : 'var(--text-muted)', fontVariantNumeric: 'tabular-nums' }}>
                {f.label}
              </span>
              <span style={{
                fontSize: '10px',
                fontWeight: 700,
                color: f.perda === 0 ? '#34d399' : isActive ? '#f87171' : 'var(--text-muted)',
              }}>
                {f.perda === 0 ? 'sem desconto' : `−${f.perda}%`}
              </span>
            </div>
          )
        })}
      </div>

      <p style={{ fontSize: '9px', color: 'var(--text-muted)', marginTop: '8px', letterSpacing: '0.04em' }}>
        Atual: <strong style={{ color: '#f87171' }}>{absVal.toFixed(1)}%</strong>
      </p>
    </div>
  )
}

// ── Componente principal ──────────────────────────────────────────────────────

export default function GestorRVSection({ rv, config, opKpis, absVal }: Props) {
  const [hoveredLine, setHoveredLine] = useState<HoverLine>(null)

  if (rv.semDados) {
    return (
      <div style={{ background: '#0d0d1a', border: '1px solid rgba(201,168,76,0.08)', borderRadius: '16px', padding: '24px', textAlign: 'center' }}>
        <p style={{ color: 'var(--text-muted)', fontSize: '14px' }}>Sem dados na planilha.</p>
      </div>
    )
  }

  const showPopup = hoveredLine !== null
  const isAbsPopup = hoveredLine === 'abs-deflator'

  // Breakdown lines
  const breakdownLines: Array<{
    key: HoverLine
    label: string
    detail: string
    valor: number
  }> = [
    {
      key: 'retracao',
      label: 'TX Retenção',
      detail: rv.retencaoFaixa ? `≥${rv.retencaoFaixa.min}%` : '<58%',
      valor: rv.retencaoBase,
    },
    {
      key: 'indisp',
      label: 'Indisponibilidade',
      detail: rv.indispBonus > 0 ? `≤${config.indispMeta}%` : `>${config.indispMeta}%`,
      valor: rv.indispBonus,
    },
    {
      key: 'tma',
      label: 'TMA',
      detail: rv.tmaBonus > 0 ? `≤${segParaMMSSGestor(config.tmaMetaSeg)}` : `>${segParaMMSSGestor(config.tmaMetaSeg)}`,
      valor: rv.tmaBonus,
    },
    ...(rv.ticketAplicavel ? [{
      key: 'ticket' as HoverLine,
      label: 'Variação Ticket',
      detail: rv.ticketFaixa ? `≥${rv.ticketFaixa.min}%` : '<-18%',
      valor: rv.ticketBonus,
    }] : []),
  ]

  return (
    <div style={{ display: 'flex', alignItems: 'flex-start', gap: '16px' }}>
      {/* ── RV Card ── */}
      <div style={{ flex: '0 0 auto', maxWidth: '480px', width: '100%' }}>
        <div style={{
          background: '#1e2d45',
          border: '1px solid rgba(201,168,76,0.5)',
          borderRadius: '14px',
          padding: '20px 24px',
        }}>
          {/* Header do card */}
          <div style={{
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'space-between',
            gap: '12px',
            flexWrap: 'wrap',
            marginBottom: '16px',
          }}>
            <span style={{
              fontFamily: 'var(--ff-display)',
              fontSize: '13px',
              fontWeight: 700,
              textTransform: 'uppercase',
              letterSpacing: '0.08em',
              background: GOLD_GRAD,
              WebkitBackgroundClip: 'text',
              WebkitTextFillColor: 'transparent',
              backgroundClip: 'text',
            }}>
              RV Calculada
            </span>

            <span style={{
              display: 'inline-flex',
              alignItems: 'center',
              gap: '5px',
              fontSize: '10px',
              fontWeight: 700,
              letterSpacing: '0.06em',
              textTransform: 'uppercase',
              padding: '4px 12px',
              borderRadius: '99px',
              background: rv.elegivel ? 'rgba(34,197,94,0.10)' : 'rgba(239,68,68,0.08)',
              border: rv.elegivel ? '1px solid rgba(34,197,94,0.30)' : '1px solid rgba(239,68,68,0.20)',
              color: rv.elegivel ? '#34d399' : '#f87171',
            }}>
              {rv.elegivel ? <CheckCircle size={11} /> : <AlertTriangle size={11} />}
              {rv.elegivel ? 'Elegível' : 'Estimativa (inelegível)'}
            </span>
          </div>

          <div className="space-y-3">
            {/* Breakdown lines */}
            {breakdownLines.map(({ key, label, detail, valor }) => {
              const isZero = valor === 0
              const isHovered = hoveredLine === key
              return (
                <div
                  key={label}
                  onMouseEnter={() => setHoveredLine(key)}
                  onMouseLeave={() => setHoveredLine(null)}
                  style={{
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'space-between',
                    padding: '8px 12px',
                    borderRadius: '10px',
                    background: isZero ? 'rgba(239,68,68,0.06)' : isHovered ? 'rgba(201,168,76,0.06)' : 'rgba(255,255,255,0.04)',
                    borderBottom: '1px solid rgba(255,255,255,0.08)',
                    borderTop: '1px solid transparent',
                    borderRight: '1px solid transparent',
                    borderLeft: isZero ? '3px solid #ef4444' : isHovered ? '3px solid rgba(201,168,76,0.4)' : '3px solid transparent',
                    cursor: 'default',
                    transition: 'background 0.15s ease, border-left-color 0.15s ease',
                  }}
                >
                  <div>
                    <p style={{ fontSize: '11px', fontWeight: 600, color: '#cbd5e1' }}>{label}</p>
                    <p style={{ fontSize: '10px', color: '#64748b', marginTop: '1px' }}>{detail}</p>
                  </div>
                  <span style={{
                    fontSize: '13px',
                    fontWeight: 700,
                    fontVariantNumeric: 'tabular-nums',
                    color: isZero ? '#ef4444' : '#34d399',
                  }}>
                    {formatBRLGestor(valor)}
                  </span>
                </div>
              )
            })}

            {/* RV Base subtotal */}
            <div style={{
              display: 'flex', justifyContent: 'space-between', alignItems: 'center',
              padding: '8px 12px', borderTop: '1px solid rgba(255,255,255,0.06)',
            }}>
              <span style={{ fontSize: '11px', fontWeight: 600, color: '#e2e8f0' }}>Subtotal (RV Base)</span>
              <span style={{ fontSize: '13px', fontWeight: 700, fontVariantNumeric: 'tabular-nums', color: '#e2e8f0' }}>
                {formatBRLGestor(rv.rvBase)}
              </span>
            </div>

            {/* Bônus */}
            {rv.bonusAplicado && (
              <div style={{
                display: 'flex', justifyContent: 'space-between', alignItems: 'center',
                padding: '8px 12px', borderRadius: '10px',
                background: 'rgba(201,168,76,0.06)', border: '1px solid rgba(201,168,76,0.15)',
              }}>
                <span style={{ fontSize: '11px', color: 'var(--gold-light)' }}>
                  Bônus {config.bonusPercentual}% (Retenção ≥{config.bonusRetencaoMin}% e ABS ≤{config.bonusAbsMax}%)
                </span>
                <span style={{ fontSize: '13px', fontWeight: 700, color: 'var(--gold-light)', fontVariantNumeric: 'tabular-nums' }}>
                  +{formatBRLGestor(rv.bonusValor)}
                </span>
              </div>
            )}

            {/* Deflatores */}
            {rv.deflatores.length > 0 && (
              <div className="space-y-2">
                <p style={{ fontSize: '9px', fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.10em', color: '#f87171' }}>
                  Deflatores
                </p>
                {rv.deflatores.map((d, i) => {
                  const isAbs = d.motivo.startsWith('ABS')
                  const isHovered = hoveredLine === 'abs-deflator' && isAbs
                  return (
                    <div
                      key={i}
                      onMouseEnter={() => isAbs ? setHoveredLine('abs-deflator') : undefined}
                      onMouseLeave={() => isAbs ? setHoveredLine(null) : undefined}
                      style={{
                        display: 'flex', justifyContent: 'space-between', alignItems: 'center',
                        padding: '7px 12px', borderRadius: '10px',
                        background: isHovered ? 'rgba(239,68,68,0.08)' : 'rgba(239,68,68,0.05)',
                        border: '1px solid rgba(239,68,68,0.12)',
                        cursor: isAbs ? 'default' : undefined,
                      }}
                    >
                      <span style={{ fontSize: '11px', color: 'var(--text-muted)', display: 'flex', alignItems: 'center', gap: '5px' }}>
                        {d.motivo} (−{d.perda}%)
                        {isAbs && <Info size={10} style={{ color: 'rgba(248,113,113,0.5)', flexShrink: 0 }} />}
                      </span>
                      <span style={{ fontSize: '12px', fontWeight: 600, color: '#f87171', fontVariantNumeric: 'tabular-nums' }}>
                        −{formatBRLGestor(d.valorDeduzido)}
                      </span>
                    </div>
                  )
                })}
              </div>
            )}

            {/* RV FINAL — sempre gold */}
            <div style={{
              display: 'flex', justifyContent: 'space-between', alignItems: 'center',
              padding: '14px 16px', borderRadius: '10px',
              background: 'rgba(201,168,76,0.12)',
              border: '1px solid rgba(201,168,76,0.4)',
              marginTop: '4px',
            }}>
              <span style={{
                fontFamily: 'var(--ff-display)',
                fontSize: '13px',
                fontWeight: 700,
                textTransform: 'uppercase',
                letterSpacing: '0.08em',
                background: GOLD_GRAD,
                WebkitBackgroundClip: 'text',
                WebkitTextFillColor: 'transparent',
                backgroundClip: 'text',
              }}>
                RV Final
              </span>
              <span style={{
                fontFamily: 'var(--ff-display)',
                fontSize: '22px',
                fontWeight: 700,
                fontVariantNumeric: 'tabular-nums',
                background: GOLD_GRAD,
                WebkitBackgroundClip: 'text',
                WebkitTextFillColor: 'transparent',
                backgroundClip: 'text',
              }}>
                {formatBRLGestor(rv.rvFinal)}
              </span>
            </div>
          </div>
        </div>
      </div>

      {/* ── Popup lateral ── */}
      {showPopup && (
        <div style={{ paddingTop: '52px', flexShrink: 0 }}>
          {isAbsPopup
            ? <AbsPopup config={config} absVal={absVal} />
            : <OpPopup line={hoveredLine} config={config} opKpis={opKpis} />}

        </div>
      )}
    </div>
  )
}
