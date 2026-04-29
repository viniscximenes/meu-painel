'use client'

import { useState, useRef, useEffect } from 'react'
import React from 'react'
import { ChevronDown, FileDown, Loader2, Minus, ArrowRight, AlertCircle } from 'lucide-react'
import type { OperadorContestacao } from '@/lib/contestacao-utils'
import { fmtPct, fmtDelta } from '@/lib/contestacao-utils'
import { PainelHeader, LinhaHorizontalDourada } from '@/components/painel/PainelHeader'
import { PainelSectionTitle } from '@/components/painel/PainelSectionTitle'

const FF_SYNE = "'Syne', sans-serif"
const FF_DM   = "'DM Sans', sans-serif"

interface Props {
  operadores: OperadorContestacao[]
  todosOperadores: OperadorContestacao[]
  mesLabel: string
  dataAtualizacao: string | null
}

export default function ExportarPdfClient({ operadores, todosOperadores, mesLabel, dataAtualizacao }: Props) {
  const [selectedId, setSelectedId] = useState<number | null>(
    operadores[0]?.operadorId ?? null,
  )
  const [btnHover, setBtnHover] = useState(false)
  const [loading,  setLoading]  = useState(false)

  const op = selectedId !== null
    ? (operadores.find(o => o.operadorId === selectedId) ?? null)
    : null

  const semRegistros = operadores.length === 0

  async function handleExport() {
    if (!op || loading) return
    setLoading(true)
    try {
      const [{ pdf }, { ContestacaoRVDocument }, { buildPdfData, buildFilename }] = await Promise.all([
        import('@react-pdf/renderer'),
        import('@/components/pdf/ContestacaoRVDocument'),
        import('@/lib/pdf-data-builder'),
      ])
      const data = buildPdfData(op, mesLabel, dataAtualizacao)
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      const blob = await pdf(React.createElement(ContestacaoRVDocument, { data }) as any).toBlob()
      const url  = URL.createObjectURL(blob)
      const link = document.createElement('a')
      link.href     = url
      link.download = buildFilename(op.operadorNome, mesLabel)
      link.click()
      URL.revokeObjectURL(url)
    } catch (err) {
      console.error('[PDF] Erro ao gerar:', err)
      alert('Erro ao gerar o PDF. Verifique o console para detalhes.')
    } finally {
      setLoading(false)
    }
  }

  return (
    <div className="halo-cards-bg" style={{ display: 'flex', flexDirection: 'column', gap: '14px' }}>

      <PainelHeader titulo="EXPORTAR PDF" mesLabel={mesLabel} dataReferencia={dataAtualizacao} />
      <LinhaHorizontalDourada />

      {/* Seletor de operador */}
      <OperadorSelect
        operadores={operadores}
        todosOperadores={todosOperadores}
        selectedId={selectedId}
        onSelect={setSelectedId}
      />

      {/* Estado vazio */}
      {semRegistros && (
        <EmptyCard icon={<AlertCircle size={20} style={{ color: '#f4d47c' }} />}>
          <p style={{ fontFamily: FF_SYNE, fontSize: '13px', fontWeight: 600, color: '#72708F', textTransform: 'uppercase', letterSpacing: '0.05em' }}>
            Nenhum operador com registros em {mesLabel}
          </p>
          <p style={{ fontFamily: FF_SYNE, fontSize: '12px', fontWeight: 500, color: '#A6A2A2', marginTop: '6px' }}>
            Adicione registros de Pausa justificada ou Fora da jornada no Diário de Bordo.
          </p>
        </EmptyCard>
      )}

      {/* Conteúdo do operador selecionado */}
      {op && (
        <div style={{ display: 'flex', flexDirection: 'column', gap: '20px' }}>

          {/* ── KPI ORIGINAL ── */}
          <div style={{ display: 'flex', flexDirection: 'column', gap: '10px' }}>
            <PainelSectionTitle>KPI ORIGINAL</PainelSectionTitle>
            <SectionCard>
              <div className="grid grid-cols-2 gap-6 sm:grid-cols-4">
                <MetricCell
                  label="TEMPO PROJETADO"
                  value={op.tempoProjetadoRaw !== '—' ? op.tempoProjetadoRaw : '—'}
                  sublabel="horas projetadas"
                />
                <MetricCell
                  label="TEMPO LOGIN"
                  value={op.tempoLoginRaw !== '—' ? op.tempoLoginRaw : '—'}
                  sublabel="horas logado"
                />
                <MetricCell
                  label="ABS ORIGINAL"
                  value={fmtPct(op.absPctOriginal)}
                  color={colorAbs(op.absPctOriginal)}
                  sublabelNode={<MetaSublabel meta="≤ 5%" />}
                />
                <MetricCell
                  label="INDISP ORIGINAL"
                  value={fmtPct(op.indispPctOriginal)}
                  color={colorIndisp(op.indispPctOriginal)}
                  sublabelNode={<MetaSublabel meta="≤ 14,5%" />}
                />
              </div>
              {!op.encontrado && (
                <p style={{ fontFamily: FF_SYNE, fontSize: '11px', fontWeight: 500, marginTop: '16px', color: '#72708F' }}>
                  * Operador não encontrado na planilha KPI CONSOLIDADO — valores de ABS e Indisp indisponíveis.
                </p>
              )}
            </SectionCard>
          </div>

          {/* ── REGISTROS DO DIÁRIO ── */}
          <div style={{ display: 'flex', flexDirection: 'column', gap: '10px' }}>
            <PainelSectionTitle>REGISTROS DO DIÁRIO</PainelSectionTitle>
            <SectionCard>
              <div className="grid grid-cols-2 gap-6 sm:grid-cols-4">
                <MetricCell
                  label="TOTAL DE REGISTROS"
                  value={String(op.registros.length)}
                  sublabel="no mês"
                />
                <MetricCell
                  label="PAUSA JUSTIFICADA"
                  value={op.pausasMin > 0 ? op.pausasFormatado : '—'}
                  sublabel="reduz Indisp"
                />
                <MetricCell
                  label="FORA DA JORNADA"
                  value={op.deficitMin > 0 ? op.deficitFormatado : '—'}
                  sublabel="reduz ABS"
                />
                <MetricCell
                  label="MÊS DE REFERÊNCIA"
                  sublabel="período base"
                  valueNode={
                    <span style={{ display: 'inline-flex', alignItems: 'baseline', gap: '5px', lineHeight: 1 }}>
                      <span style={{ fontFamily: FF_SYNE, fontSize: '32px', fontWeight: 600, color: '#72708F', textTransform: 'uppercase', whiteSpace: 'nowrap' }}>
                        {mesLabel.replace(/\s*\d{4}$/, '').trim()}
                      </span>
                      <span style={{ fontFamily: FF_DM, fontSize: '32px', fontWeight: 700, color: '#72708F', fontFeatureSettings: "'tnum'", whiteSpace: 'nowrap' }}>
                        {mesLabel.match(/\d{4}$/)?.[0] ?? ''}
                      </span>
                    </span>
                  }
                />
              </div>
            </SectionCard>
          </div>

          {/* ── SIMULAÇÃO DE CONTESTAÇÃO ── */}
          {(op.absPctContestado !== null || op.indispPctContestada !== null) && (
            <div style={{ display: 'flex', flexDirection: 'column', gap: '10px' }}>
              <PainelSectionTitle>SIMULAÇÃO DE CONTESTAÇÃO</PainelSectionTitle>
              <SectionCard>
                <div style={{ display: 'flex', alignItems: 'stretch' }}>
                  {op.absPctOriginal !== null && (
                    <div style={{ flex: 1, minWidth: 0 }}>
                      <MetricComparison
                        label="ABS"
                        metaMax={5}
                        original={op.absPctOriginal}
                        contestado={op.absPctContestado}
                        delta={op.absDelta}
                        nota={op.deficitMin > 0
                          ? <><span style={{ fontFamily: FF_DM, fontWeight: 500, fontSize: '13px', fontFeatureSettings: "'tnum'" }}>{op.deficitFormatado}</span>{' de déficit contestado aplicados'}</>
                          : 'Nenhum déficit contestado neste mês'}
                        semImpacto={op.deficitMin === 0}
                      />
                    </div>
                  )}
                  {op.absPctOriginal !== null && op.indispPctOriginal !== null && (
                    <DivisorVertical />
                  )}
                  {op.indispPctOriginal !== null && (
                    <div style={{ flex: 1, minWidth: 0 }}>
                      <MetricComparison
                        label="INDISP"
                        metaMax={14.5}
                        original={op.indispPctOriginal}
                        contestado={op.indispPctContestada}
                        delta={op.indispDelta}
                        nota={op.pausasMin > 0
                          ? <><span style={{ fontFamily: FF_DM, fontWeight: 500, fontSize: '13px', fontFeatureSettings: "'tnum'" }}>{op.pausasFormatado}</span>{' de Pausa justificada aplicados'}</>
                          : 'Nenhum registro de Pausa justificada neste mês'}
                        semImpacto={op.pausasMin === 0}
                      />
                    </div>
                  )}
                </div>
              </SectionCard>
            </div>
          )}

          {/* Botão Exportar PDF */}
          <div>
            <button
              type="button"
              onClick={handleExport}
              disabled={loading}
              onMouseEnter={() => { if (!loading) setBtnHover(true) }}
              onMouseLeave={() => setBtnHover(false)}
              style={{
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                gap: '8px',
                width: '100%',
                height: '52px',
                borderRadius: '10px',
                border: 'none',
                background: '#f4d47c',
                color: '#050508',
                fontFamily: FF_SYNE,
                fontSize: '14px',
                fontWeight: 600,
                textTransform: 'uppercase',
                letterSpacing: '0.05em',
                cursor: loading ? 'not-allowed' : 'pointer',
                opacity: loading ? 0.4 : 1,
                boxShadow: (!loading && btnHover) ? '0 0 20px rgba(244,212,124,0.30)' : 'none',
                transition: 'box-shadow 200ms ease, opacity 150ms ease',
              }}
            >
              {loading
                ? <><Loader2 size={18} strokeWidth={2} className="animate-spin" />Gerando PDF...</>
                : <><FileDown size={18} strokeWidth={2} />Exportar PDF</>
              }
            </button>
          </div>

        </div>
      )}

    </div>
  )
}

// ── Sub-componentes ──────────────────────────────────────────────────────────

function OperadorSelect({
  operadores, todosOperadores, selectedId, onSelect,
}: {
  operadores: OperadorContestacao[]
  todosOperadores: OperadorContestacao[]
  selectedId: number | null
  onSelect: (id: number | null) => void
}) {
  const [open, setOpen] = useState(false)
  const ref = useRef<HTMLDivElement>(null)

  const semRegistros = todosOperadores.filter(
    o => !operadores.some(r => r.operadorId === o.operadorId),
  )

  const selected = selectedId !== null
    ? operadores.find(o => o.operadorId === selectedId) ?? null
    : null

  useEffect(() => {
    function handle(e: MouseEvent) {
      if (ref.current && !ref.current.contains(e.target as Node)) setOpen(false)
    }
    document.addEventListener('mousedown', handle)
    return () => document.removeEventListener('mousedown', handle)
  }, [])

  const triggerStyle: React.CSSProperties = {
    width: '100%',
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'space-between',
    gap: '8px',
    padding: '10px 14px',
    borderRadius: '10px',
    border: open ? '1px solid rgba(255,185,34,0.55)' : '1px solid rgba(255,185,34,0.25)',
    background: '#070714',
    cursor: 'pointer',
    transition: 'border-color 0.15s',
    textAlign: 'left',
  }

  const dropdownStyle: React.CSSProperties = {
    position: 'absolute',
    top: 'calc(100% + 4px)',
    left: 0,
    right: 0,
    zIndex: 50,
    background: '#070714',
    border: '1px solid rgba(255,185,34,0.25)',
    borderRadius: '10px',
    overflow: 'hidden',
    boxShadow: '0 8px 32px rgba(0,0,0,0.5)',
    maxHeight: '320px',
    overflowY: 'auto',
  }

  const groupLabelStyle: React.CSSProperties = {
    padding: '12px 20px 6px',
    fontFamily: FF_SYNE,
    fontSize: '10px',
    fontWeight: 600,
    letterSpacing: '1.5px',
    textTransform: 'uppercase',
    color: 'rgba(123, 163, 217, 0.55)',
    borderTop: '1px solid rgba(244,212,124,0.08)',
  }

  function ItemRow({ op, disabled = false }: { op: OperadorContestacao; disabled?: boolean }) {
    const isSelected = op.operadorId === selectedId
    return (
      <button
        type="button"
        disabled={disabled}
        onClick={() => { onSelect(op.operadorId); setOpen(false) }}
        style={{
          width: '100%',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'space-between',
          gap: '10px',
          padding: '12px 20px',
          minHeight: '44px',
          background: isSelected ? 'rgba(244,212,124,0.08)' : 'transparent',
          color: disabled ? 'rgba(114,112,143,0.4)' : isSelected ? '#f4d47c' : '#A6A2A2',
          fontFamily: FF_SYNE,
          fontSize: '17px',
          fontWeight: 600,
          textTransform: 'uppercase',
          letterSpacing: '0.02em',
          textAlign: 'left',
          cursor: disabled ? 'default' : 'pointer',
          transition: 'background 150ms ease, color 150ms ease',
          border: 'none',
          borderLeft: isSelected ? '2px solid #f4d47c' : '2px solid transparent',
        }}
        onMouseEnter={e => {
          if (!disabled && !isSelected) {
            const el = e.currentTarget as HTMLButtonElement
            el.style.background = 'rgba(244,212,124,0.05)'
            el.style.color = '#f4d47c'
          }
        }}
        onMouseLeave={e => {
          if (!disabled && !isSelected) {
            const el = e.currentTarget as HTMLButtonElement
            el.style.background = 'transparent'
            el.style.color = '#A6A2A2'
          }
        }}
      >
        <span className="truncate">{op.operadorNome}</span>
        {isSelected && <span className="text-[10px] shrink-0" style={{ color: '#f4d47c' }}>✓</span>}
      </button>
    )
  }

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: '10px' }}>
      <PainelSectionTitle>OPERADOR</PainelSectionTitle>
      <div ref={ref} style={{ position: 'relative' }}>
        <button type="button" style={triggerStyle} onClick={() => setOpen(v => !v)}>
          <span className="truncate" style={selected ? {
            fontFamily: FF_SYNE,
            fontSize: '20px',
            fontWeight: 600,
            textTransform: 'uppercase',
            letterSpacing: '0.02em',
            color: '#A6A2A2',
          } : {
            fontFamily: FF_SYNE,
            fontSize: '13px',
            fontWeight: 400,
            color: '#72708F',
          }}>
            {selected ? selected.operadorNome : '— Selecione um operador —'}
          </span>
          <ChevronDown size={14} style={{
            color: '#72708F', flexShrink: 0,
            transform: open ? 'rotate(180deg)' : 'rotate(0deg)',
            transition: 'transform 0.15s',
          }} />
        </button>

        {open && (
          <div style={dropdownStyle}>
            {operadores.length > 0 && (
              <>
                <div style={{ ...groupLabelStyle, borderTop: 'none' }}>COM REGISTROS</div>
                {operadores.map(o => <ItemRow key={o.operadorId} op={o} />)}
              </>
            )}
            {semRegistros.length > 0 && (
              <>
                <div style={groupLabelStyle}>SEM REGISTROS</div>
                {semRegistros.map(o => <ItemRow key={o.operadorId} op={o} disabled />)}
              </>
            )}
          </div>
        )}
      </div>
    </div>
  )
}

// Container de card sem título próprio (título fica fora, via PainelSectionTitle)
function SectionCard({ children }: { children: React.ReactNode }) {
  return (
    <div style={{
      background: '#070714',
      border: '1px solid rgba(255,185,34,0.25)',
      borderRadius: '10px',
      padding: '20px 24px',
    }}>
      {children}
    </div>
  )
}

// Sublabel "meta ≤ X%" com "meta" em Syne e "≤ X%" em DM Sans (baseline aligned)
function MetaSublabel({ meta }: { meta: string }) {
  return (
    <span style={{ display: 'inline-flex', alignItems: 'baseline', gap: '4px' }}>
      <span style={{ fontFamily: FF_SYNE, fontSize: '13px', fontWeight: 600, color: '#72708F' }}>meta</span>
      <span style={{ fontFamily: FF_DM, fontSize: '13px', fontWeight: 500, color: '#72708F', fontFeatureSettings: "'tnum'" }}>{meta}</span>
    </span>
  )
}

function colorAbs(pct: number | null): string {
  if (pct === null) return '#72708F'
  return pct > 5 ? 'rgba(227, 57, 57, 0.74)' : 'rgba(106, 196, 73, 0.62)'
}

function colorIndisp(pct: number | null): string {
  if (pct === null) return '#72708F'
  return pct > 14.5 ? 'rgba(227, 57, 57, 0.74)' : 'rgba(106, 196, 73, 0.62)'
}

// label → Syne (texto)
// value → DM Sans (número tabular) OU Syne (textValue=true, para texto descritivo como "ABRIL DE 2026")
// sublabel → Syne (texto descritivo)
function MetricCell({ label, value, valueNode, sublabel, sublabelNode, color = '#72708F', textValue = false }: {
  label: string
  value?: string
  valueNode?: React.ReactNode
  sublabel?: string
  sublabelNode?: React.ReactNode
  color?: string
  textValue?: boolean
}) {
  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: '6px' }}>
      <p style={{
        fontFamily: FF_SYNE, fontSize: '16px', fontWeight: 600,
        textTransform: 'uppercase', letterSpacing: '0.05em',
        color: '#72708F', lineHeight: 1,
      }}>
        {label}
      </p>
      {valueNode ?? (
        <p style={{
          fontFamily: textValue ? FF_SYNE : FF_DM,
          fontSize: '40px',
          fontWeight: textValue ? 600 : 700,
          lineHeight: 1,
          color: textValue ? '#A6A2A2' : color,
          fontFeatureSettings: textValue ? undefined : "'tnum'",
          textTransform: textValue ? 'uppercase' : undefined,
        }}>
          {value}
        </p>
      )}
      {sublabelNode ?? (sublabel && (
        <p style={{ fontFamily: FF_SYNE, fontSize: '13px', fontWeight: 600, color: '#72708F' }}>
          {sublabel}
        </p>
      ))}
    </div>
  )
}

function MetricComparison({
  label, metaMax, original, contestado, delta, nota, semImpacto,
}: {
  label: string
  metaMax: number
  original: number
  contestado: number | null
  delta: number | null
  nota: React.ReactNode
  semImpacto: boolean
}) {
  const originalFora     = original > metaMax
  const contestadoDentro = contestado !== null && contestado <= metaMax
  const melhora          = delta !== null && delta < 0

  const originalColor   = originalFora ? 'rgba(227, 57, 57, 0.74)' : 'rgba(106, 196, 73, 0.62)'
  const contestadoColor = semImpacto
    ? '#72708F'
    : contestadoDentro
      ? 'rgba(106, 196, 73, 0.62)'
      : 'rgba(227, 57, 57, 0.74)'

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: '10px' }}>

      {/* LINHA 1 — Label + badge */}
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: '8px' }}>
        <span style={{
          fontFamily: FF_SYNE, fontSize: '16px', fontWeight: 600,
          letterSpacing: '0.05em', textTransform: 'uppercase', color: '#72708F',
        }}>
          {label}
        </span>
        {!semImpacto && delta !== null && (
          <span style={{
            fontFamily: FF_DM, fontSize: '13px', fontWeight: 500,
            padding: '3px 8px', borderRadius: '6px', flexShrink: 0,
            fontFeatureSettings: "'tnum'",
            background: melhora ? 'rgba(106, 196, 73, 0.18)' : 'rgba(227, 57, 57, 0.10)',
            color: melhora ? 'rgba(106, 196, 73, 0.62)' : 'rgba(227, 57, 57, 0.74)',
            border: `1px solid ${melhora ? 'rgba(106, 196, 73, 0.62)' : 'rgba(227, 57, 57, 0.25)'}`,
          }}>
            {fmtDelta(delta)}
          </span>
        )}
      </div>

      {/* LINHA 2 — Original → Contestado */}
      <div style={{ display: 'flex', alignItems: 'flex-end', gap: '12px' }}>
        <div>
          <p style={{ fontFamily: FF_SYNE, fontSize: '11px', fontWeight: 600, textTransform: 'uppercase', letterSpacing: '0.06em', color: '#72708F', marginBottom: '4px' }}>
            ORIGINAL
          </p>
          <p style={{ fontFamily: FF_DM, fontSize: '36px', fontWeight: 700, lineHeight: 1, fontFeatureSettings: "'tnum'", color: originalColor }}>
            {fmtPct(original)}
          </p>
        </div>

        <div style={{ color: '#72708F', flexShrink: 0, paddingBottom: '6px' }}>
          {semImpacto ? <Minus size={16} strokeWidth={1.5} /> : <ArrowRight size={16} strokeWidth={1.5} />}
        </div>

        <div>
          <p style={{ fontFamily: FF_SYNE, fontSize: '11px', fontWeight: 600, textTransform: 'uppercase', letterSpacing: '0.06em', color: '#72708F', marginBottom: '4px' }}>
            CONTESTADO
          </p>
          <p style={{ fontFamily: FF_DM, fontSize: '36px', fontWeight: 700, lineHeight: 1, fontFeatureSettings: "'tnum'", color: contestadoColor }}>
            {semImpacto ? '—' : fmtPct(contestado)}
          </p>
        </div>
      </div>

      {/* LINHA 3 — Nota */}
      <p style={{ fontFamily: FF_SYNE, fontSize: '13px', fontWeight: 600, color: '#72708F', lineHeight: 1.4 }}>
        {nota}
      </p>
    </div>
  )
}

function DivisorVertical() {
  return (
    <div style={{
      width: '1px',
      background: '#211F3C',
      alignSelf: 'stretch',
      margin: '8px 24px',
      flexShrink: 0,
    }} />
  )
}

function EmptyCard({ icon, children }: { icon: React.ReactNode; children: React.ReactNode }) {
  return (
    <div style={{
      display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center',
      gap: '12px', textAlign: 'center',
      background: '#070714',
      border: '1px solid rgba(255,185,34,0.25)',
      borderRadius: '10px',
      padding: '32px 24px',
    }}>
      {icon}
      <div>{children}</div>
    </div>
  )
}
