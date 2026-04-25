'use client'

import { useState, useRef, useEffect } from 'react'
import React from 'react'
import { ChevronDown, FileText, FileDown, Loader2, Minus, ArrowRight, Calendar, Clock, AlertCircle } from 'lucide-react'
import type { OperadorContestacao } from '@/lib/contestacao-utils'
import { fmtPct, fmtDelta } from '@/lib/contestacao-utils'

interface Props {
  operadores: OperadorContestacao[]       // com registros no mês
  todosOperadores: OperadorContestacao[]  // todos (para o select)
  mesLabel: string
  dataAtualizacao: string | null
}

export default function ExportarPdfClient({ operadores, todosOperadores, mesLabel, dataAtualizacao }: Props) {
  const [selectedId, setSelectedId] = useState<number | null>(
    operadores[0]?.operadorId ?? null,
  )
  const [btnHover,  setBtnHover]  = useState(false)
  const [loading,   setLoading]   = useState(false)

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
    <div className="space-y-5">
      {/* Header — mesmo padrão do Meu KPI */}
      <div style={{
        background: 'var(--void2)',
        border: '1px solid rgba(201,168,76,0.1)',
        borderRadius: '14px',
        padding: '14px 20px',
        display: 'flex',
        alignItems: 'center',
        gap: '16px',
        flexWrap: 'wrap',
      }}>
        <span style={{
          fontFamily: 'var(--ff-display)',
          fontSize: '16px', fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.06em',
          background: 'linear-gradient(135deg, #e8c96d 0%, #c9a84c 100%)',
          WebkitBackgroundClip: 'text', WebkitTextFillColor: 'transparent', backgroundClip: 'text',
        }}>
          Exportar PDF
        </span>
        <div style={{ width: '1px', height: '16px', background: 'rgba(201,168,76,0.2)' }} />
        <span style={{ fontSize: '11px', color: 'var(--text-muted)' }}>{mesLabel}</span>
        {dataAtualizacao && (
          <>
            <div style={{ width: '1px', height: '16px', background: 'rgba(201,168,76,0.2)' }} />
            <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
              <div className="animate-pulse" style={{ width: '6px', height: '6px', borderRadius: '50%', background: '#10b981' }} />
              <span style={{ fontSize: '11px', color: 'var(--text-muted)' }}>
                KPI atualizado até <strong style={{ color: 'var(--text-secondary)', fontWeight: 600 }}>{dataAtualizacao}</strong>
              </span>
            </div>
          </>
        )}
      </div>

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
          <p className="text-sm font-medium" style={{ color: 'var(--text-secondary)' }}>
            Nenhum operador com registros em {mesLabel}
          </p>
          <p className="text-xs mt-1" style={{ color: 'var(--text-muted)' }}>
            Adicione registros de Pausa justificada ou Fora da jornada no Diário de Bordo.
          </p>
        </EmptyCard>
      )}

      {/* Conteúdo do operador selecionado */}
      {op && (
        <div className="space-y-4">
          {/* KPI original */}
          <SectionCard title="KPI Original" icon={<FileText size={14} style={{ color: '#f4d47c' }} />}>
            <div className="grid grid-cols-2 gap-6 sm:grid-cols-4">
              <MetricCell label="Tempo Projetado" value={op.tempoProjetadoRaw !== '—' ? op.tempoProjetadoRaw : '—'} sublabel="horas projetadas" />
              <MetricCell label="Tempo Login" value={op.tempoLoginRaw !== '—' ? op.tempoLoginRaw : '—'} sublabel="horas logado" />
              <MetricCell label="ABS Original" value={fmtPct(op.absPctOriginal)} sublabel="meta ≤ 5%" color={colorAbs(op.absPctOriginal)} />
              <MetricCell label="Indisp Original" value={fmtPct(op.indispPctOriginal)} sublabel="meta ≤ 14,5%" color={colorIndisp(op.indispPctOriginal)} />
            </div>
            {!op.encontrado && (
              <p className="text-[11px] mt-4" style={{ color: 'var(--text-muted)' }}>
                * Operador não encontrado na planilha KPI CONSOLIDADO — valores de ABS e Indisp indisponíveis.
              </p>
            )}
          </SectionCard>

          {/* Registros do Diário — resumo consolidado */}
          <SectionCard title={`Registros do Diário — ${mesLabel}`} icon={<Calendar size={14} style={{ color: '#f4d47c' }} />}>
            <div className="grid grid-cols-2 gap-6 sm:grid-cols-4">
              <MetricCell
                label="Total de Registros"
                value={String(op.registros.length)}
                sublabel="no mês"
              />
              <MetricCell
                label="Pausa Justificada"
                value={op.pausasMin > 0 ? op.pausasFormatado : '—'}
                sublabel="reduz Indisp"
                color="#60a5fa"
              />
              <MetricCell
                label="Fora da Jornada"
                value={op.deficitMin > 0 ? op.deficitFormatado : '—'}
                sublabel="reduz ABS"
                color="#facc15"
              />
              <MetricCell
                label="Mês de Referência"
                value={mesLabel}
                sublabel="período base"
                color="var(--text-secondary)"
              />
            </div>
          </SectionCard>

          {/* Simulação */}
          {(op.absPctContestado !== null || op.indispPctContestada !== null) && (
            <SectionCard title="Simulação de Contestação" icon={<Clock size={14} style={{ color: '#f4d47c' }} />}>
              <div className="grid grid-cols-1 gap-6 sm:grid-cols-2">
                {op.absPctOriginal !== null && (
                  <MetricComparison
                    label="ABS"
                    original={op.absPctOriginal}
                    contestado={op.absPctContestado}
                    delta={op.absDelta}
                    nota={op.deficitMin > 0
                      ? `${op.deficitFormatado} de déficit contestado aplicados`
                      : 'Nenhum déficit contestado neste mês'}
                    semImpacto={op.deficitMin === 0}
                  />
                )}
                {op.indispPctOriginal !== null && (
                  <MetricComparison
                    label="Indisp"
                    original={op.indispPctOriginal}
                    contestado={op.indispPctContestada}
                    delta={op.indispDelta}
                    nota={op.pausasMin > 0
                      ? `${op.pausasFormatado} de Pausa justificada aplicados`
                      : 'Nenhum registro de Pausa justificada neste mês'}
                    semImpacto={op.pausasMin === 0}
                  />
                )}
              </div>
            </SectionCard>
          )}

          {/* Botão Exportar PDF */}
          <div style={{ marginTop: '36px' }}>
            <div style={{ height: '1px', background: 'rgba(244,212,124,0.15)', marginBottom: '32px' }} />
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
                gap: '10px',
                width: '100%',
                height: '52px',
                borderRadius: '10px',
                border: 'none',
                background: '#f4d47c',
                color: '#0a0a0a',
                fontSize: '15px',
                fontWeight: 600,
                cursor: loading ? 'not-allowed' : 'pointer',
                opacity: loading ? 0.7 : 1,
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

  // Fechar ao clicar fora
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
    borderRadius: '8px',
    border: open ? '1px solid rgba(244,212,124,0.35)' : '1px solid rgba(244,212,124,0.15)',
    background: '#0d1117',
    color: selected ? '#e2e8f0' : '#526a85',
    fontSize: '13px',
    fontWeight: selected ? 500 : 400,
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
    background: '#0d1117',
    border: '1px solid rgba(244,212,124,0.2)',
    borderRadius: '8px',
    overflow: 'hidden',
    boxShadow: '0 8px 32px rgba(0,0,0,0.5)',
    maxHeight: '320px',
    overflowY: 'auto',
  }

  const groupLabelStyle: React.CSSProperties = {
    padding: '8px 14px 4px',
    fontSize: '10px',
    fontWeight: 600,
    letterSpacing: '0.1em',
    textTransform: 'uppercase',
    color: '#526a85',
    borderTop: '1px solid rgba(255,255,255,0.05)',
  }

  function ItemRow({
    op, disabled = false,
  }: {
    op: OperadorContestacao
    disabled?: boolean
  }) {
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
          padding: '8px 14px',
          background: isSelected ? 'rgba(244,212,124,0.1)' : 'transparent',
          color: disabled ? '#374151' : isSelected ? '#f4d47c' : '#e2e8f0',
          fontSize: '13px',
          fontWeight: isSelected ? 600 : 400,
          textAlign: 'left',
          cursor: disabled ? 'default' : 'pointer',
          transition: 'background 0.1s',
          border: 'none',
        }}
        onMouseEnter={e => {
          if (!disabled && !isSelected)
            (e.currentTarget as HTMLButtonElement).style.background = 'rgba(255,255,255,0.04)'
        }}
        onMouseLeave={e => {
          if (!disabled && !isSelected)
            (e.currentTarget as HTMLButtonElement).style.background = 'transparent'
        }}
      >
        <span className="truncate">{op.operadorNome}</span>
        {isSelected && (
          <span className="text-[10px] shrink-0" style={{ color: '#f4d47c' }}>✓</span>
        )}
      </button>
    )
  }

  return (
    <div className="space-y-1.5">
      <label className="text-[11px] font-semibold uppercase tracking-wider" style={{ color: 'var(--text-muted)' }}>
        Operador
      </label>
      <div ref={ref} style={{ position: 'relative' }}>
        {/* Trigger */}
        <button type="button" style={triggerStyle} onClick={() => setOpen(v => !v)}>
          <span className="truncate">
            {selected ? selected.operadorNome : '— Selecione um operador —'}
          </span>
          <ChevronDown size={14} style={{
            color: '#526a85', flexShrink: 0,
            transform: open ? 'rotate(180deg)' : 'rotate(0deg)',
            transition: 'transform 0.15s',
          }} />
        </button>

        {/* Dropdown */}
        {open && (
          <div style={dropdownStyle}>
            {operadores.length > 0 && (
              <>
                <div style={{ ...groupLabelStyle, borderTop: 'none' }}>— Com registros —</div>
                {operadores.map(o => <ItemRow key={o.operadorId} op={o} />)}
              </>
            )}
            {semRegistros.length > 0 && (
              <>
                <div style={groupLabelStyle}>— Sem registros —</div>
                {semRegistros.map(o => <ItemRow key={o.operadorId} op={o} disabled />)}
              </>
            )}
          </div>
        )}
      </div>
    </div>
  )
}

function SectionCard({ title, icon, children }: { title: string; icon: React.ReactNode; children: React.ReactNode }) {
  return (
    <div style={{
      background: '#0d1117',
      border: '1px solid rgba(244,212,124,0.10)',
      borderRadius: '12px',
      padding: '20px 24px',
    }}>
      <div className="flex items-center gap-2" style={{ marginBottom: '20px' }}>
        {icon}
        <span className="text-[11px] font-semibold uppercase tracking-wider" style={{ color: 'var(--text-muted)' }}>
          {title}
        </span>
      </div>
      {children}
    </div>
  )
}

function colorAbs(pct: number | null): string {
  if (pct === null) return 'var(--text-primary)'
  return pct > 5 ? '#f87171' : '#ffffff'
}

function colorIndisp(pct: number | null): string {
  if (pct === null) return 'var(--text-primary)'
  return pct > 14.5 ? '#f87171' : '#ffffff'
}

function MetricCell({ label, value, sublabel, color = 'var(--text-primary)' }: {
  label: string
  value: string
  sublabel?: string
  color?: string
}) {
  return (
    <div className="space-y-1.5">
      <p className="text-[10px] font-semibold uppercase tracking-wider" style={{ color: 'var(--text-muted)' }}>
        {label}
      </p>
      <p className="font-bold tabular-nums" style={{ fontSize: '24px', lineHeight: 1, color }}>
        {value}
      </p>
      {sublabel && (
        <p className="text-[11px]" style={{ color: 'var(--text-muted)' }}>{sublabel}</p>
      )}
    </div>
  )
}

function MetricComparison({
  label, original, contestado, delta, nota, semImpacto,
}: {
  label: string
  original: number
  contestado: number | null
  delta: number | null
  nota: string
  semImpacto: boolean
}) {
  const melhora = delta !== null && delta < 0
  const arrowColor      = semImpacto ? '#374151' : melhora ? '#4ade80' : '#f87171'
  const contestadoColor = semImpacto ? '#374151' : melhora ? '#4ade80' : '#f87171'

  return (
    <div style={{
      background: '#0f1520',
      border: '1px solid rgba(255,255,255,0.05)',
      borderRadius: '10px',
      padding: '20px',
      display: 'flex',
      flexDirection: 'column',
      gap: '14px',
    }}>
      {/* Label + badge delta no mesmo row */}
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: '8px' }}>
        <span style={{
          fontSize: '13px', fontWeight: 600, letterSpacing: '0.08em',
          textTransform: 'uppercase', color: '#f4d47c',
        }}>
          {label}
        </span>
        {!semImpacto && delta !== null && (
          <span style={{
            fontSize: '11px', fontWeight: 600, padding: '3px 8px', borderRadius: '999px',
            flexShrink: 0,
            background: melhora ? 'rgba(74,222,128,0.10)' : 'rgba(248,113,113,0.10)',
            color: melhora ? '#4ade80' : '#f87171',
            border: `1px solid ${melhora ? 'rgba(74,222,128,0.22)' : 'rgba(248,113,113,0.22)'}`,
          }}>
            {fmtDelta(delta)}
          </span>
        )}
      </div>

      {/* Fluxo: Original → seta → Contestado */}
      <div style={{ display: 'flex', alignItems: 'center', gap: '14px' }}>
        {/* Original */}
        <div>
          <p style={{ fontSize: '10px', textTransform: 'uppercase', letterSpacing: '0.06em', color: '#526a85', marginBottom: '5px' }}>
            Original
          </p>
          <p style={{ fontSize: '24px', fontWeight: 700, lineHeight: 1, fontVariantNumeric: 'tabular-nums', color: 'rgba(255,255,255,0.50)' }}>
            {fmtPct(original)}
          </p>
        </div>

        {/* Seta */}
        <div style={{ color: arrowColor, flexShrink: 0, marginTop: '14px' }}>
          {semImpacto ? <Minus size={18} strokeWidth={1.5} /> : <ArrowRight size={18} strokeWidth={1.5} />}
        </div>

        {/* Contestado */}
        <div>
          <p style={{ fontSize: '10px', textTransform: 'uppercase', letterSpacing: '0.06em', color: '#526a85', marginBottom: '5px' }}>
            Contestado
          </p>
          <p style={{ fontSize: '24px', fontWeight: 700, lineHeight: 1, fontVariantNumeric: 'tabular-nums', color: contestadoColor }}>
            {semImpacto ? '—' : fmtPct(contestado)}
          </p>
        </div>
      </div>

      {/* Nota */}
      <p style={{ fontSize: '11px', color: '#9ca3af', lineHeight: 1.4 }}>{nota}</p>
    </div>
  )
}


function EmptyCard({ icon, children }: { icon: React.ReactNode; children: React.ReactNode }) {
  return (
    <div className="flex flex-col items-center justify-center gap-3 rounded-xl py-12 text-center"
      style={{ background: 'rgba(255,255,255,0.02)', border: '1px solid rgba(255,255,255,0.05)' }}>
      {icon}
      <div>{children}</div>
    </div>
  )
}
