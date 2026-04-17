'use client'

import { useState, useRef, useEffect, useTransition } from 'react'
import type { ABSSheetData, ABSStatus } from '@/lib/abs-utils'
import { ABS_STATUS_OPTIONS } from '@/lib/abs-utils'
import { atualizarStatusABSAction, aplicarStatusTodosAction } from './actions'
import { getIniciaisNome } from '@/lib/operadores'

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

// ── Estilo de cada status ─────────────────────────────────────────────────────

const STATUS_STYLE: Record<string, { bg: string; color: string; label: string }> = {
  P:   { bg: 'rgba(34,197,94,0.15)',   color: '#4ade80', label: 'P' },
  F:   { bg: 'rgba(239,68,68,0.18)',   color: '#f87171', label: 'F' },
  FO:  { bg: 'rgba(59,130,246,0.18)',  color: '#60a5fa', label: 'FO' },
  SC:  { bg: 'rgba(245,158,11,0.18)',  color: '#fbbf24', label: 'SC' },
  CT:  { bg: 'rgba(245,158,11,0.18)',  color: '#fbbf24', label: 'CT' },
  FE:  { bg: 'rgba(168,85,247,0.18)',  color: '#c084fc', label: 'FE' },
  LI:  { bg: 'rgba(249,115,22,0.18)',  color: '#fb923c', label: 'LI' },
  DS:  { bg: 'rgba(107,114,128,0.18)', color: '#9ca3af', label: 'DS' },
  AT:  { bg: 'rgba(56,189,248,0.18)',  color: '#38bdf8', label: 'AT' },
  '-': { bg: 'rgba(255,255,255,0.03)', color: '#374151', label: '·' },
  '':  { bg: 'rgba(255,255,255,0.03)', color: '#374151', label: '·' },
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
        style={{
          width: '34px',
          height: '26px',
          borderRadius: '5px',
          border: isHoje ? '1px solid rgba(201,168,76,0.6)' : '1px solid rgba(255,255,255,0.06)',
          background: st.bg,
          color: st.color,
          fontSize: '9px',
          fontWeight: 700,
          cursor: 'pointer',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          transition: 'opacity 0.1s',
          fontFamily: 'monospace',
        }}
      >
        {st.label}
      </button>

      {open && (
        <div style={{
          position: 'absolute',
          ...(openUp
            ? { bottom: '100%', marginBottom: '3px' }
            : { top: '100%', marginTop: '3px' }),
          left: '50%',
          transform: 'translateX(-50%)',
          zIndex: 100,
          background: '#0f1729',
          border: '1px solid rgba(201,168,76,0.25)',
          borderRadius: '10px',
          padding: '6px',
          minWidth: '120px',
          boxShadow: '0 8px 32px rgba(0,0,0,0.6)',
          display: 'flex',
          flexDirection: 'column',
          gap: '2px',
        }}>
          {ABS_STATUS_OPTIONS.map((opt) => (
            <button
              key={opt.value}
              onClick={() => {
                setOpen(false)
                onUpdate(rowIndex, colIndex, opt.value)
              }}
              style={{
                display: 'flex',
                alignItems: 'center',
                gap: '8px',
                padding: '5px 8px',
                borderRadius: '6px',
                border: 'none',
                background: status === opt.value ? 'rgba(255,255,255,0.08)' : 'transparent',
                cursor: 'pointer',
                textAlign: 'left',
                width: '100%',
                transition: 'background 0.1s',
              }}
              onMouseEnter={(e) => { (e.currentTarget as HTMLElement).style.background = 'rgba(255,255,255,0.06)' }}
              onMouseLeave={(e) => { (e.currentTarget as HTMLElement).style.background = status === opt.value ? 'rgba(255,255,255,0.08)' : 'transparent' }}
            >
              <span style={{
                width: '22px',
                height: '18px',
                borderRadius: '4px',
                background: STATUS_STYLE[opt.value]?.bg ?? 'transparent',
                color: STATUS_STYLE[opt.value]?.color ?? '#fff',
                fontSize: '8px',
                fontWeight: 700,
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                fontFamily: 'monospace',
                flexShrink: 0,
              }}>
                {STATUS_STYLE[opt.value]?.label ?? opt.value}
              </span>
              <span style={{ fontSize: '11px', color: '#94a3b8', whiteSpace: 'nowrap' }}>
                {opt.label}
              </span>
            </button>
          ))}
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
        style={{
          width: '34px',
          height: '26px',
          borderRadius: '5px',
          border: isHoje
            ? '1px solid rgba(201,168,76,0.7)'
            : '1px solid rgba(201,168,76,0.3)',
          background: 'rgba(201,168,76,0.06)',
          color: '#c9a84c',
          fontSize: '10px',
          fontWeight: 700,
          cursor: 'pointer',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          fontFamily: 'monospace',
        }}
      >
        ···
      </button>

      {open && (
        <div style={{
          position: 'absolute',
          bottom: '100%',
          marginBottom: '3px',
          left: '50%',
          transform: 'translateX(-50%)',
          zIndex: 100,
          background: '#0f1729',
          border: '1px solid rgba(201,168,76,0.35)',
          borderRadius: '10px',
          padding: '6px',
          minWidth: '130px',
          boxShadow: '0 8px 32px rgba(0,0,0,0.6)',
          display: 'flex',
          flexDirection: 'column',
          gap: '2px',
        }}>
          <div style={{ fontSize: '8px', fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.1em', color: '#c9a84c', padding: '3px 8px 5px', borderBottom: '1px solid rgba(201,168,76,0.15)', marginBottom: '2px' }}>
            Aplicar a todos
          </div>
          {ABS_STATUS_OPTIONS.map((opt) => (
            <button
              key={opt.value}
              onClick={() => {
                setOpen(false)
                onApplyAll(colIndex, opt.value)
              }}
              style={{
                display: 'flex',
                alignItems: 'center',
                gap: '8px',
                padding: '5px 8px',
                borderRadius: '6px',
                border: 'none',
                background: 'transparent',
                cursor: 'pointer',
                textAlign: 'left',
                width: '100%',
                transition: 'background 0.1s',
              }}
              onMouseEnter={(e) => { (e.currentTarget as HTMLElement).style.background = 'rgba(255,255,255,0.06)' }}
              onMouseLeave={(e) => { (e.currentTarget as HTMLElement).style.background = 'transparent' }}
            >
              <span style={{
                width: '22px',
                height: '18px',
                borderRadius: '4px',
                background: STATUS_STYLE[opt.value]?.bg ?? 'transparent',
                color: STATUS_STYLE[opt.value]?.color ?? '#fff',
                fontSize: '8px',
                fontWeight: 700,
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                fontFamily: 'monospace',
                flexShrink: 0,
              }}>
                {STATUS_STYLE[opt.value]?.label ?? opt.value}
              </span>
              <span style={{ fontSize: '11px', color: '#94a3b8', whiteSpace: 'nowrap' }}>
                {opt.label}
              </span>
            </button>
          ))}
        </div>
      )}
    </div>
  )
}

// ── Componente principal ──────────────────────────────────────────────────────

export default function ABSClient({ data: initialData, operadores, hoje }: Props) {
  const [data, setData] = useState<ABSSheetData>(initialData)
  const [, startTransition] = useTransition()
  const [saving, setSaving] = useState<string | null>(null) // "rowIndex-colIndex"
  const [savingAll, setSavingAll] = useState<number | null>(null) // colIndex

  const opMap = new Map(operadores.map((o) => [o.username, o]))

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
        alert(`Erro ao salvar: ${res.erro}`)
      }
      setSaving(null)
    })
  }

  function handleApplyAll(colIndex: number, status: ABSStatus) {
    const label = ABS_STATUS_OPTIONS.find((o) => o.value === status)?.label ?? status
    const confirmed = window.confirm(
      `Aplicar "${label}" para TODOS os operadores neste dia?`
    )
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
        alert(`Erro ao salvar: ${res.erro}`)
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
      {/* ── Cards de resumo ── */}
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(180px, 1fr))', gap: '12px' }}>
        {[
          { label: 'Faltas no mês', valor: totalFaltas, cor: totalFaltas > 0 ? '#f87171' : '#4ade80' },
          { label: 'Operadores ≥ 2 faltas', valor: opComFaltas2.length, cor: opComFaltas2.length > 0 ? '#f87171' : '#4ade80' },
          { label: 'Risco de RV', valor: opComFaltas2.length, cor: opComFaltas2.length > 0 ? '#f87171' : '#4ade80' },
          { label: 'Registrados hoje', valor: registradosHoje, cor: '#94a3b8' },
        ].map(({ label, valor, cor }) => (
          <div key={label} style={{
            background: '#0d0d1a',
            border: '1px solid rgba(255,255,255,0.06)',
            borderRadius: '12px',
            padding: '14px 16px',
          }}>
            <p style={{ fontSize: '9px', fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.12em', color: '#64748b' }}>
              {label}
            </p>
            <p style={{ fontSize: '28px', fontWeight: 700, color: cor, marginTop: '4px', lineHeight: 1, fontVariantNumeric: 'tabular-nums' }}>
              {valor}
            </p>
          </div>
        ))}
      </div>

      {/* ── Calendário / tabela ── */}
      <div style={{
        background: '#0a0e18',
        border: '1px solid rgba(201,168,76,0.10)',
        borderRadius: '14px',
        overflow: 'hidden',
      }}>
        <div style={{ overflowX: 'auto', WebkitOverflowScrolling: 'touch' }}>
          <table style={{ borderCollapse: 'collapse', width: '100%', minWidth: 'max-content' }}>
            {/* Cabeçalho com datas */}
            <thead>
              <tr>
                <th style={{
                  position: 'sticky', left: 0, zIndex: 10,
                  background: '#07070f',
                  padding: '10px 14px',
                  textAlign: 'left',
                  fontSize: '9px', fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.10em',
                  color: '#64748b',
                  borderBottom: '1px solid rgba(255,255,255,0.06)',
                  borderRight: '1px solid rgba(255,255,255,0.06)',
                  minWidth: '120px',
                }}>
                  Operador
                </th>
                {data.datas.map((data_str, i) => {
                  const isHoje = data_str === hoje
                  return (
                    <th key={i} style={{
                      padding: '6px 4px',
                      textAlign: 'center',
                      fontSize: '8px',
                      color: isHoje ? '#e8c96d' : '#64748b',
                      fontWeight: isHoje ? 700 : 600,
                      background: isHoje ? 'rgba(201,168,76,0.06)' : '#07070f',
                      borderBottom: '1px solid rgba(255,255,255,0.06)',
                      borderRight: '1px solid rgba(255,255,255,0.04)',
                      minWidth: '38px',
                    }}>
                      <div>{data.diasSemana[i] ?? ''}</div>
                      <div style={{ fontWeight: 700, fontSize: '9px', marginTop: '1px' }}>
                        {data_str.split('/')[0]}
                      </div>
                    </th>
                  )
                })}
                <th style={{
                  padding: '10px 10px',
                  textAlign: 'center',
                  fontSize: '9px', fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.08em',
                  color: '#64748b',
                  background: '#07070f',
                  borderBottom: '1px solid rgba(255,255,255,0.06)',
                  borderLeft: '1px solid rgba(255,255,255,0.06)',
                  minWidth: '80px',
                }}>
                  Resumo
                </th>
              </tr>
            </thead>

            {/* Linhas de operadores */}
            <tbody>
              {data.operadores.map((op, opIdx) => {
                const info = opMap.get(op.username)
                const faltas = op.status.filter((s) => s === 'F').length
                const ausencias = op.status.filter((s) => ['F', 'SC', 'CT', 'FE', 'LI', 'AT'].includes(s)).length
                const risco = faltas >= 2
                const zebra = opIdx % 2 === 0
                const openUp = opIdx >= totalOps - 2

                return (
                  <tr key={op.username} style={{ background: zebra ? 'rgba(255,255,255,0.01)' : 'transparent' }}>
                    {/* Nome do operador */}
                    <td style={{
                      position: 'sticky', left: 0, zIndex: 5,
                      background: zebra ? '#0b0f1c' : '#0a0e18',
                      padding: '6px 14px',
                      borderBottom: '1px solid rgba(255,255,255,0.04)',
                      borderRight: '1px solid rgba(255,255,255,0.06)',
                      minWidth: '120px',
                    }}>
                      <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                        <div style={{
                          width: '22px', height: '22px', borderRadius: '6px',
                          background: 'linear-gradient(135deg, #0f1729, #1a2540)',
                          border: '1px solid rgba(66,139,255,0.25)',
                          display: 'flex', alignItems: 'center', justifyContent: 'center',
                          fontSize: '7px', fontWeight: 700, color: '#ffffff', flexShrink: 0,
                        }}>
                          {info ? getIniciaisNome(info.nome) : op.username.substring(0, 2).toUpperCase()}
                        </div>
                        <span style={{ fontSize: '11px', color: '#cbd5e1', fontWeight: 500, whiteSpace: 'nowrap' }}>
                          {info ? info.nome.split(' ')[0] : op.username}
                        </span>
                      </div>
                    </td>

                    {/* Células de status */}
                    {op.status.map((st, dateIdx) => {
                      const isHoje = data.datas[dateIdx] === hoje
                      const isSaving = saving === `${op.rowIndex}-${dateIdx}`
                      return (
                        <td key={dateIdx} style={{
                          padding: '3px 2px',
                          textAlign: 'center',
                          borderBottom: '1px solid rgba(255,255,255,0.04)',
                          borderRight: '1px solid rgba(255,255,255,0.03)',
                          background: isHoje ? 'rgba(201,168,76,0.03)' : undefined,
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

                    {/* Coluna de resumo */}
                    <td style={{
                      padding: '6px 10px',
                      borderBottom: '1px solid rgba(255,255,255,0.04)',
                      borderLeft: '1px solid rgba(255,255,255,0.06)',
                      textAlign: 'center',
                    }}>
                      <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: '3px' }}>
                        <span style={{ fontSize: '12px', fontWeight: 700, color: faltas >= 2 ? '#f87171' : '#4ade80', fontVariantNumeric: 'tabular-nums' }}>
                          {faltas}F
                        </span>
                        <span style={{ fontSize: '9px', color: '#64748b' }}>{ausencias} aus.</span>
                        {risco && (
                          <span style={{
                            fontSize: '8px', fontWeight: 700, padding: '1px 5px',
                            borderRadius: '99px', background: 'rgba(239,68,68,0.15)',
                            border: '1px solid rgba(239,68,68,0.3)', color: '#f87171',
                            textTransform: 'uppercase', letterSpacing: '0.06em',
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
                borderTop: '2px solid rgba(201,168,76,0.4)',
                background: 'rgba(201,168,76,0.03)',
              }}>
                <td style={{
                  position: 'sticky', left: 0, zIndex: 5,
                  background: '#0a0d15',
                  padding: '6px 14px',
                  borderRight: '1px solid rgba(255,255,255,0.06)',
                  minWidth: '120px',
                }}>
                  <span style={{
                    fontSize: '10px',
                    fontWeight: 700,
                    color: '#c9a84c',
                    letterSpacing: '0.04em',
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
                      padding: '3px 2px',
                      textAlign: 'center',
                      borderRight: '1px solid rgba(255,255,255,0.03)',
                      background: isHoje ? 'rgba(201,168,76,0.05)' : undefined,
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
                  padding: '6px 10px',
                  borderLeft: '1px solid rgba(255,255,255,0.06)',
                }} />
              </tr>
            </tbody>
          </table>
        </div>
      </div>

      {/* ── Tabela resumo ── */}
      <div>
        <div style={{ display: 'flex', alignItems: 'center', gap: '10px', marginBottom: '12px' }}>
          <span style={{ fontSize: '9px', fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.14em', color: '#64748b' }}>
            Resumo por Operador
          </span>
          <div style={{ flex: 1, height: '1px', background: 'linear-gradient(90deg, rgba(255,255,255,0.06) 0%, transparent 100%)' }} />
        </div>

        <div style={{
          background: '#0a0e18',
          border: '1px solid rgba(255,255,255,0.06)',
          borderRadius: '12px',
          overflow: 'hidden',
        }}>
          <table style={{ width: '100%', borderCollapse: 'collapse' }}>
            <thead>
              <tr style={{ background: '#07070f' }}>
                {['Operador','F','FO','SC','CT','FE','LI','AT','Status RV'].map((h) => (
                  <th key={h} style={{
                    padding: '8px 12px', textAlign: h === 'Operador' ? 'left' : 'center',
                    fontSize: '9px', fontWeight: 700, textTransform: 'uppercase',
                    letterSpacing: '0.08em', color: '#64748b',
                    borderBottom: '1px solid rgba(255,255,255,0.06)',
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
                  F: op.status.filter((s) => s === 'F').length,
                  FO: op.status.filter((s) => s === 'FO').length,
                  SC: op.status.filter((s) => s === 'SC').length,
                  CT: op.status.filter((s) => s === 'CT').length,
                  FE: op.status.filter((s) => s === 'FE').length,
                  LI: op.status.filter((s) => s === 'LI').length,
                  AT: op.status.filter((s) => s === 'AT').length,
                }
                const risco = counts.F >= 2
                return (
                  <tr key={op.username} style={{ background: i % 2 === 0 ? 'rgba(255,255,255,0.01)' : 'transparent' }}>
                    <td style={{ padding: '8px 12px', borderBottom: '1px solid rgba(255,255,255,0.04)', fontSize: '11px', color: '#cbd5e1', fontWeight: 500 }}>
                      {info ? info.nome.split(' ').slice(0, 2).join(' ') : op.username}
                    </td>
                    {(['F','FO','SC','CT','FE','LI','AT'] as const).map((k) => (
                      <td key={k} style={{ padding: '8px 12px', textAlign: 'center', borderBottom: '1px solid rgba(255,255,255,0.04)', fontSize: '12px', fontWeight: 700, fontVariantNumeric: 'tabular-nums', color: k === 'F' && counts[k] >= 2 ? '#f87171' : counts[k] > 0 ? '#94a3b8' : '#374151' }}>
                        {counts[k] || '—'}
                      </td>
                    ))}
                    <td style={{ padding: '8px 12px', textAlign: 'center', borderBottom: '1px solid rgba(255,255,255,0.04)' }}>
                      {risco ? (
                        <span style={{ fontSize: '9px', fontWeight: 700, padding: '2px 8px', borderRadius: '99px', background: 'rgba(239,68,68,0.12)', border: '1px solid rgba(239,68,68,0.3)', color: '#f87171' }}>
                          RISCO
                        </span>
                      ) : (
                        <span style={{ fontSize: '9px', fontWeight: 700, padding: '2px 8px', borderRadius: '99px', background: 'rgba(34,197,94,0.10)', border: '1px solid rgba(34,197,94,0.25)', color: '#4ade80' }}>
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
    </div>
  )
}
