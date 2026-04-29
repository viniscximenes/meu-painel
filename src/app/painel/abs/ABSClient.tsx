'use client'

import { useState, useRef, useEffect, useTransition } from 'react'
import type { ABSSheetData, ABSStatus } from '@/lib/abs-utils'
import { ABS_STATUS_OPTIONS } from '@/lib/abs-utils'
import { atualizarStatusABSAction, aplicarStatusTodosAction } from './actions'
import { PainelSectionTitle } from '@/components/painel/PainelSectionTitle'
import { AlertTriangle } from 'lucide-react'

const FF_SYNE = "'Syne', sans-serif"
const FF_DM   = "'DM Sans', sans-serif"

interface OperadorInfo {
  id: number
  nome: string
  username: string
}

interface Props {
  data: ABSSheetData
  operadores: OperadorInfo[]
  hoje: string // "DD/MM"
}

// ── Títulos para tooltip ──────────────────────────────────────────────────────

const STATUS_TITLE: Record<string, string> = {
  P:   'Presente',
  F:   'Falta',
  FO:  'Folga',
  SC:  'Saiu Cedo',
  CT:  'Chegou Tarde',
  FE:  'Férias',
  LI:  'Licença',
  DS:  'Desligado',
  AT:  'Atestado',
  '-': 'Não registrado',
  '':  'Não registrado',
}

// ── Estilo HALO de cada status ────────────────────────────────────────────────

const STATUS_STYLE: Record<string, { bg: string; color: string; border: string; label: string }> = {
  P:   { bg: 'rgba(106,196,73,0.18)',  color: 'rgba(106,196,73,0.95)',  border: 'rgba(106,196,73,0.30)',  label: 'P'  },
  F:   { bg: 'rgba(227,57,57,0.18)',   color: 'rgba(227,57,57,0.95)',   border: 'rgba(227,57,57,0.30)',   label: 'F'  },
  FO:  { bg: 'rgba(123,163,217,0.15)', color: '#7ba3d9',                border: 'rgba(123,163,217,0.25)', label: 'FO' },
  SC:  { bg: 'rgba(255,185,34,0.15)',  color: '#FFB922',                border: 'rgba(255,185,34,0.30)',  label: 'SC' },
  CT:  { bg: 'rgba(255,185,34,0.15)',  color: '#FFB922',                border: 'rgba(255,185,34,0.30)',  label: 'CT' },
  FE:  { bg: 'rgba(176,170,255,0.15)', color: '#B0AAFF',                border: 'rgba(176,170,255,0.25)', label: 'FE' },
  LI:  { bg: 'rgba(176,170,255,0.15)', color: '#B0AAFF',                border: 'rgba(176,170,255,0.25)', label: 'LI' },
  AT:  { bg: 'rgba(232,201,109,0.15)', color: '#e8c96d',                border: 'rgba(232,201,109,0.25)', label: 'AT' },
  DS:  { bg: 'rgba(114,112,143,0.10)', color: '#72708F',                border: 'rgba(114,112,143,0.20)', label: 'DS' },
  '-': { bg: 'transparent',            color: '#474658',                border: '#211F3C',                label: '—'  },
  '':  { bg: 'transparent',            color: '#474658',                border: '#211F3C',                label: '—'  },
}

// ── Célula interativa ─────────────────────────────────────────────────────────

function ABSCell({
  status,
  rowIndex,
  colIndex,
  onUpdate,
  isHoje,
  openUp,
}: {
  status: ABSStatus
  rowIndex: number
  colIndex: number
  onUpdate: (rowIndex: number, colIndex: number, status: ABSStatus) => void
  isHoje: boolean
  openUp?: boolean
}) {
  const [open, setOpen] = useState(false)
  const ref = useRef<HTMLDivElement>(null)
  const st = STATUS_STYLE[status] ?? STATUS_STYLE['-']
  const normalBorder = isHoje ? 'rgba(244,212,124,0.40)' : st.border

  useEffect(() => {
    if (!open) return
    function handler(e: MouseEvent) {
      if (ref.current && !ref.current.contains(e.target as Node)) setOpen(false)
    }
    document.addEventListener('mousedown', handler)
    return () => document.removeEventListener('mousedown', handler)
  }, [open])

  return (
    <div ref={ref} style={{ position: 'relative' }}>
      <button
        onClick={() => setOpen((v) => !v)}
        onKeyDown={(e) => {
          if (e.key === 'Escape' && open) {
            e.stopPropagation()
            setOpen(false)
          }
        }}
        title={STATUS_TITLE[status] ?? status}
        aria-haspopup="listbox"
        aria-expanded={open}
        aria-label={STATUS_TITLE[status] ?? status}
        onMouseEnter={(e) => { (e.currentTarget as HTMLElement).style.borderColor = 'rgba(244,212,124,0.50)' }}
        onMouseLeave={(e) => { (e.currentTarget as HTMLElement).style.borderColor = normalBorder }}
        style={{
          width: '38px',
          height: '28px',
          borderRadius: '5px',
          border: `1px solid ${normalBorder}`,
          background: st.bg,
          color: st.color,
          fontSize: '9px',
          fontWeight: 700,
          fontFamily: FF_DM,
          letterSpacing: '0.05em',
          cursor: 'pointer',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          transition: 'border-color 150ms ease',
        }}
      >
        {st.label}
      </button>

      {open && (
        <div
          role="listbox"
          style={{
            position: 'absolute',
            ...(openUp
              ? { bottom: '100%', marginBottom: '4px' }
              : { top: '100%', marginTop: '4px' }),
            left: '50%',
            transform: 'translateX(-50%)',
            zIndex: 100,
            background: '#070714',
            border: '1px solid rgba(244,212,124,0.20)',
            borderRadius: '10px',
            padding: '6px',
            minWidth: '140px',
            boxShadow: '0 12px 32px rgba(0,0,0,0.6)',
            display: 'flex',
            flexDirection: 'column',
            gap: '2px',
          }}
        >
          {ABS_STATUS_OPTIONS.map((opt) => {
            const isActive = status === opt.value
            const optSt = STATUS_STYLE[opt.value] ?? STATUS_STYLE['-']
            return (
              <button
                key={opt.value}
                role="option"
                aria-selected={isActive}
                onClick={() => {
                  setOpen(false)
                  onUpdate(rowIndex, colIndex, opt.value)
                }}
                onMouseEnter={(e) => { (e.currentTarget as HTMLElement).style.background = 'rgba(244,212,124,0.06)' }}
                onMouseLeave={(e) => { (e.currentTarget as HTMLElement).style.background = isActive ? 'rgba(244,212,124,0.10)' : 'transparent' }}
                style={{
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'space-between',
                  gap: '8px',
                  padding: '8px 10px',
                  borderRadius: '6px',
                  border: 'none',
                  background: isActive ? 'rgba(244,212,124,0.10)' : 'transparent',
                  cursor: 'pointer',
                  textAlign: 'left',
                  width: '100%',
                  transition: 'background 100ms ease',
                }}
              >
                <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                  <span style={{
                    width: '24px',
                    height: '20px',
                    borderRadius: '4px',
                    background: optSt.bg,
                    color: optSt.color,
                    border: `1px solid ${optSt.border}`,
                    fontSize: '8px',
                    fontWeight: 700,
                    fontFamily: FF_DM,
                    letterSpacing: '0.05em',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    flexShrink: 0,
                  }}>
                    {optSt.label}
                  </span>
                  <span style={{
                    fontFamily: FF_SYNE,
                    fontSize: '11px',
                    fontWeight: 600,
                    color: '#A6A2A2',
                    whiteSpace: 'nowrap',
                  }}>
                    {opt.label}
                  </span>
                </div>
                {isActive && (
                  <span style={{ color: '#f4d47c', fontSize: '11px', fontWeight: 700, flexShrink: 0 }}>✓</span>
                )}
              </button>
            )
          })}
        </div>
      )}
    </div>
  )
}

// ── Célula "Aplicar a todos" ──────────────────────────────────────────────────

function AllDayCell({
  colIndex,
  isHoje,
  onApplyAll,
}: {
  colIndex: number
  isHoje: boolean
  onApplyAll: (colIndex: number, status: ABSStatus) => void
}) {
  const [open, setOpen] = useState(false)
  const ref = useRef<HTMLDivElement>(null)
  const normalBorder = isHoje ? 'rgba(244,212,124,0.60)' : 'rgba(244,212,124,0.30)'

  useEffect(() => {
    if (!open) return
    function handler(e: MouseEvent) {
      if (ref.current && !ref.current.contains(e.target as Node)) setOpen(false)
    }
    document.addEventListener('mousedown', handler)
    return () => document.removeEventListener('mousedown', handler)
  }, [open])

  return (
    <div ref={ref} style={{ position: 'relative' }}>
      <button
        onClick={() => setOpen((v) => !v)}
        title="Aplicar a todos"
        onMouseEnter={(e) => { (e.currentTarget as HTMLElement).style.borderColor = 'rgba(244,212,124,0.60)' }}
        onMouseLeave={(e) => { (e.currentTarget as HTMLElement).style.borderColor = normalBorder }}
        style={{
          width: '38px',
          height: '28px',
          borderRadius: '5px',
          border: `1px solid ${normalBorder}`,
          background: 'rgba(244,212,124,0.06)',
          color: '#e8c96d',
          fontSize: '10px',
          fontWeight: 700,
          fontFamily: FF_DM,
          cursor: 'pointer',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          transition: 'border-color 150ms ease',
        }}
      >
        ···
      </button>

      {open && (
        <div style={{
          position: 'absolute',
          bottom: '100%',
          marginBottom: '4px',
          left: '50%',
          transform: 'translateX(-50%)',
          zIndex: 100,
          background: '#070714',
          border: '1px solid rgba(244,212,124,0.20)',
          borderRadius: '10px',
          padding: '6px',
          minWidth: '140px',
          boxShadow: '0 12px 32px rgba(0,0,0,0.6)',
          display: 'flex',
          flexDirection: 'column',
          gap: '2px',
        }}>
          <div style={{
            fontFamily: FF_SYNE,
            fontSize: '9px',
            fontWeight: 600,
            textTransform: 'uppercase',
            letterSpacing: '0.10em',
            color: '#e8c96d',
            padding: '4px 10px 6px',
            borderBottom: '1px solid #211F3C',
            marginBottom: '2px',
          }}>
            Aplicar a todos
          </div>
          {ABS_STATUS_OPTIONS.map((opt) => {
            const optSt = STATUS_STYLE[opt.value] ?? STATUS_STYLE['-']
            return (
              <button
                key={opt.value}
                onClick={() => {
                  setOpen(false)
                  onApplyAll(colIndex, opt.value)
                }}
                onMouseEnter={(e) => { (e.currentTarget as HTMLElement).style.background = 'rgba(244,212,124,0.06)' }}
                onMouseLeave={(e) => { (e.currentTarget as HTMLElement).style.background = 'transparent' }}
                style={{
                  display: 'flex',
                  alignItems: 'center',
                  gap: '8px',
                  padding: '8px 10px',
                  borderRadius: '6px',
                  border: 'none',
                  background: 'transparent',
                  cursor: 'pointer',
                  textAlign: 'left',
                  width: '100%',
                  transition: 'background 100ms ease',
                }}
              >
                <span style={{
                  width: '24px',
                  height: '20px',
                  borderRadius: '4px',
                  background: optSt.bg,
                  color: optSt.color,
                  border: `1px solid ${optSt.border}`,
                  fontSize: '8px',
                  fontWeight: 700,
                  fontFamily: FF_DM,
                  letterSpacing: '0.05em',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  flexShrink: 0,
                }}>
                  {optSt.label}
                </span>
                <span style={{
                  fontFamily: FF_SYNE,
                  fontSize: '11px',
                  fontWeight: 600,
                  color: '#A6A2A2',
                  whiteSpace: 'nowrap',
                }}>
                  {opt.label}
                </span>
              </button>
            )
          })}
        </div>
      )}
    </div>
  )
}

// ── Componente principal ──────────────────────────────────────────────────────

export default function ABSClient({ data: initialData, operadores, hoje }: Props) {
  const [data, setData] = useState<ABSSheetData>(initialData)
  const [, startTransition] = useTransition()
  const [saving, setSaving] = useState<string | null>(null)
  const [savingAll, setSavingAll] = useState<number | null>(null)
  const [toast, setToast] = useState<string | null>(null)

  const opMap = new Map(operadores.map((o) => [o.username, o]))

  function showToast(msg: string) {
    setToast(msg)
    setTimeout(() => setToast(null), 3000)
  }

  function handleUpdate(rowIndex: number, colIndex: number, status: ABSStatus) {
    const key = `${rowIndex}-${colIndex}`
    setSaving(key)

    setData((prev) => ({
      ...prev,
      operadores: prev.operadores.map((op) =>
        op.rowIndex === rowIndex
          ? { ...op, status: op.status.map((s, i) => (i === colIndex ? status : s)) }
          : op
      ),
    }))

    startTransition(async () => {
      const res = await atualizarStatusABSAction(rowIndex, colIndex, status)
      if (!res.ok) {
        setData(initialData)
        showToast(`Erro ao salvar: ${res.erro}`)
      }
      setSaving(null)
    })
  }

  function handleApplyAll(colIndex: number, status: ABSStatus) {
    const label = ABS_STATUS_OPTIONS.find((o) => o.value === status)?.label ?? status
    const confirmed = window.confirm(`Aplicar "${label}" para TODOS os operadores neste dia?`)
    if (!confirmed) return

    setSavingAll(colIndex)

    const rowIndexes = data.operadores.map((op) => op.rowIndex)

    setData((prev) => ({
      ...prev,
      operadores: prev.operadores.map((op) => ({
        ...op,
        status: op.status.map((s, i) => (i === colIndex ? status : s)),
      })),
    }))

    startTransition(async () => {
      const res = await aplicarStatusTodosAction(colIndex, status, rowIndexes)
      if (!res.ok) {
        setData(initialData)
        showToast(`Erro ao salvar: ${res.erro}`)
      }
      setSavingAll(null)
    })
  }

  // Resumo
  const totalFaltas = data.operadores.reduce((s, op) => s + op.status.filter((x) => x === 'F').length, 0)
  const opComFaltas2 = data.operadores.filter((op) => op.status.filter((x) => x === 'F').length >= 2)
  const hojeIdx = data.datas.indexOf(hoje)
  const registradosHoje = hojeIdx >= 0
    ? data.operadores.filter((op) => {
        const s = op.status[hojeIdx]
        return s && s !== '-' && (s as string) !== ''
      }).length
    : 0

  const totalOps = data.operadores.length

  return (
    <div className="space-y-6">

      {/* ── Cards de KPI ── */}
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4, 1fr)', gap: '16px' }}>
        {([
          {
            label: 'FALTAS NO MÊS',
            valor: totalFaltas,
            cor: totalFaltas > 0 ? 'rgba(227,57,57,0.74)' : 'rgba(106,196,73,0.62)',
          },
          {
            label: 'OPERADORES ≥ 2 FALTAS',
            valor: opComFaltas2.length,
            cor: opComFaltas2.length > 0 ? 'rgba(227,57,57,0.74)' : 'rgba(106,196,73,0.62)',
          },
          {
            label: 'RISCO DE RV',
            valor: opComFaltas2.length,
            cor: opComFaltas2.length > 0 ? 'rgba(227,57,57,0.74)' : 'rgba(106,196,73,0.62)',
          },
          {
            label: 'REGISTRADOS HOJE',
            valor: registradosHoje,
            cor: '#e8c96d',
          },
        ] as const).map(({ label, valor, cor }) => (
          <div key={label} style={{
            background: '#070714',
            border: '1px solid rgba(244,212,124,0.10)',
            borderRadius: '10px',
            padding: '18px 20px',
          }}>
            <p style={{
              fontFamily: FF_SYNE,
              fontSize: '10px',
              fontWeight: 600,
              textTransform: 'uppercase',
              letterSpacing: '0.10em',
              color: '#474658',
              margin: 0,
            }}>
              {label}
            </p>
            <p style={{
              fontFamily: FF_DM,
              fontSize: '36px',
              fontWeight: 900,
              color: cor,
              lineHeight: 1,
              fontVariantNumeric: 'tabular-nums',
              margin: '10px 0 0',
            }}>
              {valor}
            </p>
          </div>
        ))}
      </div>

      {/* ── Calendário / tabela ── */}
      <div style={{
        background: '#070714',
        border: '1px solid rgba(244,212,124,0.10)',
        borderRadius: '10px',
        overflow: 'hidden',
      }}>
        <div style={{ overflowX: 'auto', WebkitOverflowScrolling: 'touch' }}>
          <table style={{ borderCollapse: 'collapse', width: '100%', minWidth: 'max-content' }}>
            <thead>
              <tr>
                {/* Coluna OPERADOR — sticky left */}
                <th style={{
                  position: 'sticky', left: 0, zIndex: 10,
                  background: '#03040C',
                  padding: '12px 16px',
                  textAlign: 'left',
                  fontFamily: FF_SYNE,
                  fontSize: '10px',
                  fontWeight: 600,
                  textTransform: 'uppercase',
                  letterSpacing: '0.10em',
                  color: '#474658',
                  borderBottom: '1px solid #211F3C',
                  borderRight: '1px solid #211F3C',
                  minWidth: '140px',
                  whiteSpace: 'nowrap',
                }}>
                  Operador
                </th>

                {/* Colunas de data */}
                {data.datas.map((data_str, i) => {
                  const isHoje = data_str === hoje
                  return (
                    <th key={i} style={{
                      padding: '8px 4px',
                      textAlign: 'center',
                      background: isHoje ? 'rgba(244,212,124,0.06)' : '#03040C',
                      borderBottom: '1px solid #211F3C',
                      borderRight: '1px solid rgba(33,31,60,0.4)',
                      minWidth: '40px',
                    }}>
                      <div style={{
                        fontFamily: FF_SYNE,
                        fontSize: '9px',
                        fontWeight: 600,
                        textTransform: 'uppercase',
                        color: isHoje ? '#e8c96d' : '#474658',
                        lineHeight: 1,
                      }}>
                        {data.diasSemana[i] ?? ''}
                      </div>
                      <div style={{
                        fontFamily: FF_DM,
                        fontSize: '11px',
                        fontWeight: 700,
                        color: isHoje ? '#e8c96d' : '#72708F',
                        fontVariantNumeric: 'tabular-nums',
                        marginTop: '2px',
                        lineHeight: 1,
                      }}>
                        {data_str.split('/')[0]}
                      </div>
                    </th>
                  )
                })}

                {/* Coluna RESUMO — sticky right */}
                <th style={{
                  padding: '12px 12px',
                  textAlign: 'center',
                  fontFamily: FF_SYNE,
                  fontSize: '10px',
                  fontWeight: 600,
                  textTransform: 'uppercase',
                  letterSpacing: '0.10em',
                  color: '#474658',
                  background: '#03040C',
                  borderBottom: '1px solid #211F3C',
                  borderLeft: '1px solid #211F3C',
                  minWidth: '90px',
                  whiteSpace: 'nowrap',
                }}>
                  Resumo
                </th>
              </tr>
            </thead>

            <tbody>
              {data.operadores.map((op, opIdx) => {
                const info = opMap.get(op.username)
                const faltas = op.status.filter((s) => s === 'F').length
                const ausencias = op.status.filter((s) => ['F', 'SC', 'CT', 'FE', 'LI', 'AT'].includes(s)).length
                const risco = faltas >= 2
                const zebra = opIdx % 2 === 0
                const openUp = opIdx >= totalOps - 2

                return (
                  <tr
                    key={op.username}
                    style={{ background: zebra ? 'rgba(244,212,124,0.015)' : 'transparent' }}
                  >
                    {/* Nome do operador */}
                    <td style={{
                      position: 'sticky', left: 0, zIndex: 5,
                      background: zebra ? 'rgba(244,212,124,0.015)' : '#070714',
                      padding: '8px 16px',
                      borderBottom: '1px solid rgba(33,31,60,0.5)',
                      borderRight: '1px solid #211F3C',
                      minWidth: '110px',
                    }}>
                      <span style={{
                        fontFamily: FF_SYNE,
                        fontSize: '12px',
                        fontWeight: 600,
                        textTransform: 'uppercase',
                        letterSpacing: '0.04em',
                        color: '#A6A2A2',
                        whiteSpace: 'nowrap',
                      }}>
                        {info ? info.nome.split(' ')[0] : op.username}
                      </span>
                    </td>

                    {/* Células de status */}
                    {op.status.map((st, dateIdx) => {
                      const isHoje = data.datas[dateIdx] === hoje
                      const isSaving = saving === `${op.rowIndex}-${dateIdx}`
                      return (
                        <td key={dateIdx} style={{
                          padding: '3px 1px',
                          textAlign: 'center',
                          borderBottom: '1px solid rgba(33,31,60,0.5)',
                          borderRight: '1px solid rgba(33,31,60,0.4)',
                          background: isHoje ? 'rgba(244,212,124,0.04)' : undefined,
                          opacity: isSaving ? 0.5 : 1,
                        }}>
                          <ABSCell
                            status={st}
                            rowIndex={op.rowIndex}
                            colIndex={dateIdx}
                            onUpdate={handleUpdate}
                            isHoje={isHoje}
                            openUp={openUp}
                          />
                        </td>
                      )
                    })}

                    {/* Coluna resumo */}
                    <td style={{
                      padding: '8px 12px',
                      borderBottom: '1px solid rgba(33,31,60,0.5)',
                      borderLeft: '1px solid #211F3C',
                      textAlign: 'center',
                    }}>
                      <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: '3px' }}>
                        {/* Faltas: número DM Sans + "F" Syne, baseline */}
                        <div style={{ display: 'flex', alignItems: 'baseline', gap: '2px' }}>
                          <span style={{
                            fontFamily: FF_DM,
                            fontSize: '14px',
                            fontWeight: 700,
                            color: faltas >= 2 ? 'rgba(227,57,57,0.95)' : 'rgba(106,196,73,0.95)',
                            fontVariantNumeric: 'tabular-nums',
                          }}>
                            {faltas}
                          </span>
                          <span style={{
                            fontFamily: FF_SYNE,
                            fontSize: '10px',
                            fontWeight: 600,
                            textTransform: 'uppercase',
                            color: '#474658',
                          }}>
                            F
                          </span>
                        </div>
                        {/* Ausências: número DM Sans + " aus." Syne, baseline */}
                        <div style={{ display: 'flex', alignItems: 'baseline', gap: '2px' }}>
                          <span style={{
                            fontFamily: FF_DM,
                            fontSize: '10px',
                            fontWeight: 500,
                            color: '#72708F',
                            fontVariantNumeric: 'tabular-nums',
                          }}>
                            {ausencias}
                          </span>
                          <span style={{
                            fontFamily: FF_SYNE,
                            fontSize: '9px',
                            fontWeight: 600,
                            color: '#474658',
                          }}>
                            {' '}aus.
                          </span>
                        </div>
                        {/* Badge RISCO */}
                        {risco && (
                          <span style={{
                            fontFamily: FF_SYNE,
                            fontSize: '9px',
                            fontWeight: 600,
                            textTransform: 'uppercase',
                            letterSpacing: '0.04em',
                            padding: '2px 8px',
                            borderRadius: '99px',
                            background: 'rgba(227,57,57,0.10)',
                            border: '1px solid rgba(227,57,57,0.50)',
                            color: 'rgba(227,57,57,0.95)',
                            whiteSpace: 'nowrap',
                          }}>
                            RISCO
                          </span>
                        )}
                      </div>
                    </td>
                  </tr>
                )
              })}

              {/* Linha "Aplicar a todos" */}
              <tr style={{
                borderTop: '2px solid rgba(244,212,124,0.30)',
                background: 'rgba(244,212,124,0.03)',
              }}>
                <td style={{
                  position: 'sticky', left: 0, zIndex: 5,
                  background: '#070714',
                  padding: '6px 16px',
                  borderRight: '1px solid #211F3C',
                  minWidth: '140px',
                }}>
                  <span style={{
                    fontFamily: FF_SYNE,
                    fontSize: '10px',
                    fontWeight: 600,
                    textTransform: 'uppercase',
                    letterSpacing: '0.08em',
                    color: '#e8c96d',
                    whiteSpace: 'nowrap',
                  }}>
                    Aplicar a todos →
                  </span>
                </td>

                {data.datas.map((data_str, dateIdx) => {
                  const isHoje = data_str === hoje
                  const isSavingCol = savingAll === dateIdx
                  return (
                    <td key={dateIdx} style={{
                      padding: '3px 1px',
                      textAlign: 'center',
                      borderRight: '1px solid rgba(33,31,60,0.4)',
                      background: isHoje ? 'rgba(244,212,124,0.05)' : undefined,
                      opacity: isSavingCol ? 0.5 : 1,
                    }}>
                      <AllDayCell
                        colIndex={dateIdx}
                        isHoje={isHoje}
                        onApplyAll={handleApplyAll}
                      />
                    </td>
                  )
                })}

                <td style={{
                  padding: '6px 12px',
                  borderLeft: '1px solid #211F3C',
                }} />
              </tr>
            </tbody>
          </table>
        </div>
      </div>

      {/* ── Tabela resumo por operador ── */}
      <div>
        <div style={{ marginBottom: '16px' }}>
          <PainelSectionTitle>RESUMO POR OPERADOR</PainelSectionTitle>
        </div>

        <div style={{
          background: '#070714',
          border: '1px solid rgba(244,212,124,0.10)',
          borderRadius: '10px',
          overflow: 'hidden',
        }}>
          <table style={{ width: '100%', borderCollapse: 'collapse' }}>
            <thead>
              <tr style={{ background: '#03040C' }}>
                {['Operador', 'FALTA', 'FOLGA', 'S. CEDO', 'C. TARDE', 'FÉRIAS', 'LICENÇA', 'ATESTADO', 'STATUS RV'].map((h) => (
                  <th key={h} style={{
                    padding: '14px 16px',
                    textAlign: h === 'Operador' ? 'left' : 'center',
                    fontFamily: FF_SYNE,
                    fontSize: '11px',
                    fontWeight: 600,
                    textTransform: 'uppercase',
                    letterSpacing: '0.10em',
                    color: '#A6A2A2',
                    borderBottom: '1px solid #211F3C',
                    whiteSpace: 'nowrap',
                  }}>
                    {h}
                  </th>
                ))}
              </tr>
            </thead>
            <tbody>
              {data.operadores.map((op, i) => {
                const info = opMap.get(op.username)
                const counts = {
                  F:  op.status.filter((s) => s === 'F').length,
                  FO: op.status.filter((s) => s === 'FO').length,
                  SC: op.status.filter((s) => s === 'SC').length,
                  CT: op.status.filter((s) => s === 'CT').length,
                  FE: op.status.filter((s) => s === 'FE').length,
                  LI: op.status.filter((s) => s === 'LI').length,
                  AT: op.status.filter((s) => s === 'AT').length,
                }
                const risco = counts.F >= 2
                return (
                  <tr key={op.username} style={{ background: i % 2 === 0 ? 'rgba(244,212,124,0.015)' : 'transparent' }}>
                    <td style={{
                      padding: '12px 16px',
                      borderBottom: '1px solid rgba(33,31,60,0.5)',
                      fontFamily: FF_SYNE,
                      fontSize: '12px',
                      fontWeight: 600,
                      textTransform: 'uppercase',
                      letterSpacing: '0.04em',
                      color: '#A6A2A2',
                    }}>
                      {info ? info.nome.split(' ').slice(0, 2).join(' ') : op.username}
                    </td>
                    {(['F', 'FO', 'SC', 'CT', 'FE', 'LI', 'AT'] as const).map((k) => (
                      <td key={k} style={{
                        padding: '12px 16px',
                        textAlign: 'center',
                        borderBottom: '1px solid rgba(33,31,60,0.5)',
                        fontFamily: FF_DM,
                        fontSize: '13px',
                        fontWeight: 700,
                        fontVariantNumeric: 'tabular-nums',
                        color: k === 'F' && counts[k] >= 2
                          ? 'rgba(227,57,57,0.95)'
                          : counts[k] > 0
                            ? '#A6A2A2'
                            : '#474658',
                      }}>
                        {counts[k] || '—'}
                      </td>
                    ))}
                    <td style={{
                      padding: '12px 16px',
                      textAlign: 'center',
                      borderBottom: '1px solid rgba(33,31,60,0.5)',
                    }}>
                      {risco ? (
                        <span style={{
                          fontFamily: FF_SYNE,
                          fontSize: '9px',
                          fontWeight: 600,
                          textTransform: 'uppercase',
                          letterSpacing: '0.04em',
                          padding: '3px 10px',
                          borderRadius: '99px',
                          background: 'rgba(227,57,57,0.10)',
                          border: '1px solid rgba(227,57,57,0.40)',
                          color: 'rgba(227,57,57,0.95)',
                          whiteSpace: 'nowrap',
                        }}>
                          RISCO
                        </span>
                      ) : (
                        <span style={{
                          fontFamily: FF_SYNE,
                          fontSize: '9px',
                          fontWeight: 600,
                          textTransform: 'uppercase',
                          letterSpacing: '0.04em',
                          padding: '3px 10px',
                          borderRadius: '99px',
                          background: 'rgba(106,196,73,0.10)',
                          border: '1px solid rgba(106,196,73,0.30)',
                          color: 'rgba(106,196,73,0.95)',
                          whiteSpace: 'nowrap',
                        }}>
                          OK
                        </span>
                      )}
                    </td>
                  </tr>
                )
              })}
            </tbody>
          </table>
        </div>
      </div>

      {/* ── Toast de erro ── */}
      {toast && (
        <div
          className="animate-fadeInScale"
          role="alert"
          style={{
            position: 'fixed',
            bottom: '24px',
            right: '24px',
            zIndex: 9999,
            background: '#070714',
            border: '1px solid rgba(227,57,57,0.50)',
            borderRadius: '10px',
            padding: '14px 18px',
            display: 'flex',
            alignItems: 'flex-start',
            gap: '10px',
            boxShadow: '0 12px 32px rgba(0,0,0,0.6)',
            maxWidth: '360px',
          }}
        >
          <AlertTriangle size={16} style={{ color: 'rgba(227,57,57,0.90)', flexShrink: 0, marginTop: '1px' }} />
          <span style={{
            fontFamily: FF_SYNE,
            fontSize: '13px',
            fontWeight: 600,
            color: 'rgba(227,57,57,0.90)',
          }}>
            {toast}
          </span>
        </div>
      )}
    </div>
  )
}
