'use client'

import { useState, useEffect, useRef, useId, forwardRef } from 'react'
import { useRouter } from 'next/navigation'
import { ClipboardList, Plus, Search, Pencil, Trash2, Check, Clock, AlertTriangle, ChevronDown, Play } from 'lucide-react'
import type { Monitoria, StatusMonitoria } from '@/lib/monitoria-utils'
import { STATUS_INFO, mesDeData, parseDateDMY } from '@/lib/monitoria-utils'
import { PainelHeader, LinhaHorizontalDourada } from '@/components/painel/PainelHeader'
import { PainelSectionTitle } from '@/components/painel/PainelSectionTitle'
import NovaMonitoriaModal from './NovaMonitoriaModal'
import EditarMonitoriaModal from './EditarMonitoriaModal'
import ConfirmDeleteMonitoriaModal from './ConfirmDeleteMonitoriaModal'

const FF_SYNE = "'Syne', sans-serif"
const FF_DM   = "'DM Sans', sans-serif"

interface Operador { id: number; nome: string; username: string }

interface Props {
  initialMonitorias: Monitoria[]
  operadores:        Operador[]
  metaMonitorias:    number
  mesAtual:          string
  role:              string
}

// ── SelectHalo ────────────────────────────────────────────────────────────────

interface SelectHaloOption { value: string; label: string }

interface SelectHaloProps {
  value:                string
  onChange:             (val: string) => void
  options:              SelectHaloOption[]
  ariaLabel?:           string
  disabled?:            boolean
  showDividerAfterFirst?: boolean
}

const SelectHalo = forwardRef<HTMLButtonElement, SelectHaloProps>(
  ({ value, onChange, options, ariaLabel, disabled = false, showDividerAfterFirst = false }, ref) => {
    const [aberto, setAberto] = useState(false)
    const [highlighted, setHighlighted] = useState(-1)
    const containerRef = useRef<HTMLDivElement>(null)
    const uid = useId()
    const listboxId = `listbox-${uid}`

    const selectedLabel = options.find(o => o.value === value)?.label ?? ''

    useEffect(() => {
      if (!aberto) return
      function onDown(e: MouseEvent) {
        if (!containerRef.current?.contains(e.target as Node)) {
          setAberto(false)
          setHighlighted(-1)
        }
      }
      document.addEventListener('mousedown', onDown)
      return () => document.removeEventListener('mousedown', onDown)
    }, [aberto])

    function open() {
      if (disabled) return
      setAberto(true)
      const idx = options.findIndex(o => o.value === value)
      setHighlighted(idx >= 0 ? idx : 0)
    }

    function close() {
      setAberto(false)
      setHighlighted(-1)
    }

    function select(val: string) {
      onChange(val)
      close()
    }

    function handleKeyDown(e: React.KeyboardEvent) {
      if (disabled) return
      if (e.key === 'ArrowDown') {
        e.preventDefault()
        if (!aberto) { open(); return }
        setHighlighted(p => Math.min(p + 1, options.length - 1))
      } else if (e.key === 'ArrowUp') {
        e.preventDefault()
        if (!aberto) { open(); return }
        setHighlighted(p => Math.max(p - 1, 0))
      } else if (e.key === 'Enter') {
        e.preventDefault()
        if (aberto && highlighted >= 0) select(options[highlighted].value)
        else if (!aberto) open()
      } else if (e.key === 'Escape') {
        if (aberto) {
          e.nativeEvent.stopPropagation()
          close()
        }
      } else if (e.key === 'Tab') {
        close()
      }
    }

    const triggerBorder = aberto ? 'rgba(244,212,124,0.5)' : 'rgba(114,112,143,0.5)'

    return (
      <div ref={containerRef} style={{ position: 'relative' }}>
        <button
          ref={ref}
          type="button"
          role="combobox"
          aria-haspopup="listbox"
          aria-expanded={aberto}
          aria-controls={listboxId}
          aria-label={ariaLabel}
          disabled={disabled}
          onClick={() => aberto ? close() : open()}
          onKeyDown={handleKeyDown}
          style={{
            width: '100%',
            display: 'flex', alignItems: 'center', justifyContent: 'space-between',
            backgroundColor: '#03040C',
            border: `1px solid ${triggerBorder}`,
            borderRadius: '10px',
            padding: '10px 14px',
            fontFamily: FF_SYNE, fontSize: '13px', fontWeight: 600,
            color: '#A6A2A2',
            cursor: 'pointer', outline: 'none',
            boxShadow: aberto ? '0 0 0 3px rgba(244,212,124,0.08)' : 'none',
            transition: 'border-color 150ms ease, box-shadow 150ms ease',
            textAlign: 'left', boxSizing: 'border-box',
          }}
          onMouseEnter={e => {
            if (!aberto) (e.currentTarget as HTMLElement).style.borderColor = 'rgba(244,212,124,0.35)'
          }}
          onMouseLeave={e => {
            if (!aberto) (e.currentTarget as HTMLElement).style.borderColor = triggerBorder
          }}
        >
          <span style={{ overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap', flex: 1 }}>
            {selectedLabel}
          </span>
          <ChevronDown
            size={16}
            style={{
              color: '#f4d47c', flexShrink: 0, marginLeft: '8px',
              transform: aberto ? 'rotate(180deg)' : 'none',
              transition: 'transform 200ms ease',
            }}
          />
        </button>

        {aberto && (
          <div
            role="listbox"
            id={listboxId}
            style={{
              position: 'absolute', top: 'calc(100% + 4px)', left: 0, right: 0,
              background: '#070714',
              border: '1px solid rgba(244,212,124,0.20)',
              borderRadius: '10px',
              boxShadow: '0 12px 32px rgba(0,0,0,0.6)',
              padding: '4px',
              maxHeight: '280px', overflowY: 'auto',
              zIndex: 200,
            }}
          >
            {options.map((opt, idx) => {
              const isSelected   = opt.value === value
              const isHighlighted = highlighted === idx
              return (
                <div key={opt.value || `__opt_${idx}`}>
                  <div
                    role="option"
                    aria-selected={isSelected}
                    onMouseDown={(e) => { e.preventDefault(); select(opt.value) }}
                    onMouseEnter={() => setHighlighted(idx)}
                    style={{
                      display: 'flex', alignItems: 'center', justifyContent: 'space-between',
                      padding: '8px 12px', borderRadius: '6px',
                      fontFamily: FF_SYNE, fontSize: '13px', fontWeight: 600,
                      color: isSelected ? '#f4d47c' : isHighlighted ? '#e8c96d' : '#A6A2A2',
                      background: isSelected ? 'rgba(244,212,124,0.10)' : isHighlighted ? 'rgba(244,212,124,0.06)' : 'transparent',
                      cursor: 'pointer',
                      transition: 'background 100ms ease, color 100ms ease',
                    }}
                  >
                    <span>{opt.label}</span>
                    {isSelected && <Check size={14} style={{ color: '#f4d47c', flexShrink: 0 }} />}
                  </div>
                  {showDividerAfterFirst && idx === 0 && (
                    <div style={{ height: '1px', background: '#211F3C', margin: '4px 2px' }} />
                  )}
                </div>
              )
            })}
          </div>
        )}
      </div>
    )
  }
)
SelectHalo.displayName = 'SelectHalo'

// ── ProgressCard ──────────────────────────────────────────────────────────────

function ProgressCard({ nome, count, meta }: { nome: string; count: number; meta: number }) {
  const [hovered, setHovered] = useState(false)
  const pct = Math.min((count / meta) * 100, 100)
  const semanticColor = count >= meta
    ? 'rgba(106,196,73,0.95)'
    : count > 0
      ? '#FFB922'
      : 'rgba(227,57,57,0.95)'

  return (
    <div
      style={{
        background: '#03040C',
        border: `1px solid ${hovered ? 'rgba(244,212,124,0.30)' : 'rgba(244,212,124,0.10)'}`,
        borderRadius: '10px',
        padding: '14px 16px',
        transition: 'border-color 150ms ease',
        cursor: 'default',
      }}
      onMouseEnter={() => setHovered(true)}
      onMouseLeave={() => setHovered(false)}
    >
      <p style={{
        fontFamily: FF_SYNE, fontSize: '12px', fontWeight: 600,
        textTransform: 'uppercase', letterSpacing: '0.04em',
        color: '#A6A2A2', marginBottom: '12px', marginTop: 0,
        overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap',
      }}>
        {nome.split(' ')[0]}
      </p>
      <div style={{ display: 'flex', alignItems: 'baseline' }}>
        <span style={{
          fontFamily: FF_DM, fontSize: '28px', fontWeight: 900,
          fontVariantNumeric: 'tabular-nums',
          color: semanticColor, lineHeight: 1,
        }}>
          {count}
        </span>
        <span style={{
          fontFamily: FF_DM, fontSize: '13px', fontWeight: 500,
          fontVariantNumeric: 'tabular-nums',
          color: '#474658', marginLeft: '4px',
        }}>
          /{meta}
        </span>
      </div>
      <div style={{
        width: '100%', height: '3px', borderRadius: '2px',
        background: 'rgba(33,31,60,0.6)', marginTop: '10px', overflow: 'hidden',
      }}>
        <div style={{
          height: '100%', borderRadius: '2px',
          width: `${pct}%`, background: semanticColor,
          transition: 'width 0.5s ease',
        }} />
      </div>
    </div>
  )
}

// ── Main ──────────────────────────────────────────────────────────────────────

export default function MonitoriaClient({
  initialMonitorias, operadores, metaMonitorias, mesAtual, role,
}: Props) {
  const canDelete = role !== 'aux'
  const router = useRouter()

  const [monitorias,        setMonitorias]        = useState<Monitoria[]>(initialMonitorias)
  const [filtroMes,         setFiltroMes]         = useState(mesAtual)
  const [filtroColaborador, setFiltroColaborador] = useState('')
  const [filtroStatus,      setFiltroStatus]      = useState<'' | StatusMonitoria>('')
  const [busca,             setBusca]             = useState('')
  const [novaAberta,        setNovaAberta]        = useState(false)
  const [editando,          setEditando]          = useState<Monitoria | null>(null)
  const [confirmarDeletar,  setConfirmarDeletar]  = useState<Monitoria | null>(null)
  const [toast,             setToast]             = useState<{ message: string; type: 'success' | 'error' } | null>(null)

  useEffect(() => { setMonitorias(initialMonitorias) }, [initialMonitorias])

  useEffect(() => {
    if (!toast) return
    const t = setTimeout(() => setToast(null), 3000)
    return () => clearTimeout(t)
  }, [toast])

  const meses = Array.from(
    new Set(monitorias.map((m) => mesDeData(m.dataAtendimento)).filter(Boolean))
  ).sort((a, b) => {
    const [ma, ya] = a.split('/').map(Number)
    const [mb, yb] = b.split('/').map(Number)
    return ya !== yb ? yb - ya : mb - ma
  })
  if (!meses.includes(mesAtual)) meses.unshift(mesAtual)

  const monitoriasMes = monitorias.filter((m) => mesDeData(m.dataAtendimento) === filtroMes)

  const filtradas = monitorias
    .filter((m) => {
      if (filtroMes && mesDeData(m.dataAtendimento) !== filtroMes) return false
      if (filtroColaborador && m.colaborador !== filtroColaborador) return false
      if (filtroStatus && m.status !== filtroStatus) return false
      if (busca) {
        const q = busca.toLowerCase()
        if (
          !m.colaborador.toLowerCase().includes(q) &&
          !m.idChamada.toLowerCase().includes(q) &&
          !m.contratoCliente.toLowerCase().includes(q)
        ) return false
      }
      return true
    })
    .sort((a, b) => {
      const dt = parseDateDMY(b.dataAtendimento).getTime() - parseDateDMY(a.dataAtendimento).getTime()
      return dt !== 0 ? dt : b.sheetRowIndex - a.sheetRowIndex
    })

  const mesOptions = meses.map(m => ({ value: m, label: m }))
  const colaboradorOptions = [
    { value: '', label: 'Todos os colaboradores' },
    ...operadores.map(op => ({
      value: op.nome,
      label: `${op.nome.split(' ')[0]} ${op.nome.split(' ').slice(-1)[0]}`,
    })),
  ]
  const statusOptions = [
    { value: '',         label: 'Todos os status' },
    { value: 'verde',    label: 'Enviado'          },
    { value: 'amarelo',  label: 'Pendente'         },
    { value: 'vermelho', label: 'Incompleto'       },
  ]

  return (
    <>
      <div className="space-y-5 regiao-cards-painel">

        {/* ── Header ── */}
        <PainelHeader titulo="MONITORIA DE QUALIDADE" mesLabel={filtroMes} />

        {/* ── Linha dourada ── */}
        <LinhaHorizontalDourada />

        {/* ── Título seção progresso + botão nova monitoria ── */}
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: '12px' }}>
          <div style={{ flex: 1 }}>
            <PainelSectionTitle>PROGRESSO DO MÊS</PainelSectionTitle>
          </div>
          <button
            type="button"
            onClick={() => setNovaAberta(true)}
            className="btn-primary flex items-center gap-2"
            style={{
              fontFamily: FF_SYNE, fontWeight: 700,
              letterSpacing: '0.06em', fontSize: '11px',
              textTransform: 'uppercase', flexShrink: 0,
            }}
          >
            <Plus size={15} />
            Nova Monitoria
          </button>
        </div>

        {/* ── Grid de progresso ── */}
        <div style={{
          background: '#070714',
          border: '1px solid rgba(244,212,124,0.10)',
          borderRadius: '10px',
          padding: '20px',
        }}>
          <div style={{
            display: 'grid',
            gridTemplateColumns: 'repeat(auto-fill, minmax(150px, 1fr))',
            gap: '12px',
          }}>
            {operadores.map((op) => {
              const count = monitoriasMes.filter((m) => m.colaborador === op.nome && m.status === 'verde').length
              return <ProgressCard key={op.id} nome={op.nome} count={count} meta={metaMonitorias} />
            })}
          </div>
        </div>

        {/* ── Título seção registros ── */}
        <PainelSectionTitle contador={filtradas.length}>REGISTROS DO MÊS</PainelSectionTitle>

        {/* ── Filtros ── */}
        <div style={{
          background: '#070714',
          border: '1px solid rgba(244,212,124,0.10)',
          borderRadius: '10px',
          padding: '14px 18px',
          display: 'flex', gap: '12px', flexWrap: 'wrap', alignItems: 'center',
        }}>
          <div style={{ minWidth: '140px', flex: '0 0 140px' }}>
            <SelectHalo
              value={filtroMes}
              onChange={setFiltroMes}
              options={mesOptions}
              ariaLabel="Filtrar por mês"
            />
          </div>
          <div style={{ minWidth: '180px', flex: '0 0 180px' }}>
            <SelectHalo
              value={filtroColaborador}
              onChange={setFiltroColaborador}
              options={colaboradorOptions}
              ariaLabel="Filtrar por colaborador"
            />
          </div>
          <div style={{ minWidth: '150px', flex: '0 0 150px' }}>
            <SelectHalo
              value={filtroStatus}
              onChange={(v) => setFiltroStatus(v as '' | StatusMonitoria)}
              options={statusOptions}
              ariaLabel="Filtrar por status"
            />
          </div>
          <div style={{ position: 'relative', flex: 1, minWidth: '180px' }}>
            <Search
              size={14}
              style={{
                position: 'absolute', left: '12px', top: '50%',
                transform: 'translateY(-50%)',
                color: '#f4d47c', pointerEvents: 'none',
              }}
            />
            <input
              type="text"
              value={busca}
              onChange={(e) => setBusca(e.target.value)}
              placeholder="Buscar colaborador, chamada, contrato…"
              style={{
                width: '100%', boxSizing: 'border-box',
                backgroundColor: '#03040C',
                border: '1px solid rgba(114,112,143,0.5)',
                borderRadius: '10px',
                padding: '10px 14px 10px 36px',
                fontFamily: FF_SYNE, fontSize: '13px', fontWeight: 600,
                color: '#A6A2A2', outline: 'none',
                transition: 'border-color 150ms ease, box-shadow 150ms ease',
              }}
              onFocus={e => {
                e.currentTarget.style.borderColor = 'rgba(244,212,124,0.5)'
                e.currentTarget.style.boxShadow   = '0 0 0 3px rgba(244,212,124,0.08)'
              }}
              onBlur={e => {
                e.currentTarget.style.borderColor = 'rgba(114,112,143,0.5)'
                e.currentTarget.style.boxShadow   = 'none'
              }}
            />
          </div>
        </div>

        {/* ── Tabela ── */}
        <div style={{
          background: '#070714',
          border: '1px solid rgba(244,212,124,0.10)',
          borderRadius: '10px',
          overflow: 'hidden',
        }}>
          <div style={{ overflowX: 'auto' }}>
            <table style={{ width: '100%', borderCollapse: 'collapse', minWidth: '700px' }}>
              <caption style={{
                position: 'absolute', width: '1px', height: '1px',
                padding: 0, margin: '-1px', overflow: 'hidden',
                clip: 'rect(0,0,0,0)', whiteSpace: 'nowrap', border: 0,
              }}>
                Registros de monitoria
              </caption>
              <thead>
                <tr style={{ background: '#03040C', borderBottom: '1px solid #211F3C' }}>
                  {['STATUS', 'COLABORADOR', 'CONTRATO', 'DATA', 'SINALIZAÇÃO', 'ANEXO', 'FORMS', 'AÇÕES'].map((col) => (
                    <th
                      key={col}
                      scope="col"
                      style={{
                        textAlign: 'left',
                        padding: '14px 16px',
                        fontFamily: FF_SYNE, fontSize: '11px', fontWeight: 600,
                        textTransform: 'uppercase', letterSpacing: '0.10em',
                        color: '#A6A2A2', whiteSpace: 'nowrap',
                      }}
                    >
                      {col}
                    </th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {filtradas.length === 0 ? (
                  <tr>
                    <td colSpan={8} style={{ padding: '64px 24px', textAlign: 'center' }}>
                      <ClipboardList size={32} style={{ color: '#474658', margin: '0 auto 12px', display: 'block' }} />
                      <p style={{
                        fontFamily: FF_SYNE, fontSize: '13px', fontWeight: 600,
                        color: '#72708F', margin: 0,
                      }}>
                        Nenhuma monitoria encontrada
                      </p>
                    </td>
                  </tr>
                ) : (
                  filtradas.map((m, idx) => {
                    const si     = STATUS_INFO[m.status]
                    const isEven = idx % 2 === 0
                    return (
                      <tr
                        key={m.sheetRowIndex}
                        style={{
                          background: isEven ? 'transparent' : 'rgba(244,212,124,0.015)',
                          borderBottom: '1px solid rgba(33,31,60,0.5)',
                        }}
                        onMouseEnter={(e) => { (e.currentTarget as HTMLElement).style.background = 'rgba(244,212,124,0.04)' }}
                        onMouseLeave={(e) => { (e.currentTarget as HTMLElement).style.background = isEven ? 'transparent' : 'rgba(244,212,124,0.015)' }}
                      >
                        {/* STATUS */}
                        <td style={{ padding: '14px 16px', whiteSpace: 'nowrap' }}>
                          <span style={{
                            display: 'inline-flex', alignItems: 'center', gap: '5px',
                            padding: '4px 10px', borderRadius: '99px',
                            fontFamily: FF_SYNE, fontSize: '10px', fontWeight: 600,
                            textTransform: 'uppercase', letterSpacing: '0.06em',
                            background: si.bg, color: si.color, border: `1px solid ${si.border}`,
                          }}>
                            {m.status === 'verde'
                              ? <Check size={11} />
                              : m.status === 'amarelo'
                                ? <Clock size={11} />
                                : <AlertTriangle size={11} />}
                            {si.label}
                          </span>
                        </td>
                        {/* COLABORADOR */}
                        <td style={{ padding: '14px 16px' }}>
                          <span style={{
                            fontFamily: FF_SYNE, fontSize: '13px', fontWeight: 600,
                            textTransform: 'uppercase', letterSpacing: '0.04em', color: '#A6A2A2',
                          }}>
                            {m.colaborador || '—'}
                          </span>
                        </td>
                        {/* CONTRATO */}
                        <td style={{ padding: '14px 16px' }}>
                          <span style={{
                            fontFamily: FF_DM, fontSize: '12px', fontWeight: 500,
                            fontVariantNumeric: 'tabular-nums', color: '#A6A2A2',
                          }}>
                            {m.contratoCliente || '—'}
                          </span>
                        </td>
                        {/* DATA */}
                        <td style={{ padding: '14px 16px', whiteSpace: 'nowrap' }}>
                          <span style={{
                            fontFamily: FF_DM, fontSize: '12px', fontWeight: 500,
                            fontVariantNumeric: 'tabular-nums', color: '#72708F',
                          }}>
                            {m.dataAtendimento || '—'}
                          </span>
                        </td>
                        {/* SINALIZAÇÃO */}
                        <td style={{ padding: '14px 16px', maxWidth: '220px' }}>
                          <span
                            title={m.sinalizacao || undefined}
                            style={{
                              fontFamily: FF_SYNE, fontSize: '12px', fontWeight: 600,
                              color: '#72708F',
                              display: 'block', overflow: 'hidden',
                              textOverflow: 'ellipsis', whiteSpace: 'nowrap',
                            }}
                          >
                            {m.sinalizacao || '—'}
                          </span>
                        </td>
                        {/* ANEXO */}
                        <td style={{ padding: '14px 16px' }}>
                          {m.anexo ? (
                            <a
                              href={m.anexo}
                              target="_blank"
                              rel="noopener noreferrer"
                              aria-label="Abrir anexo"
                              title="Abrir anexo"
                              style={{
                                display: 'inline-flex', alignItems: 'center', justifyContent: 'center',
                                width: '24px', height: '24px', borderRadius: '99px',
                                background: 'rgba(244,212,124,0.10)',
                                border: '1px solid rgba(244,212,124,0.30)',
                                color: '#e8c96d', lineHeight: 0,
                                transition: 'border-color 150ms ease, background 150ms ease',
                              }}
                              onMouseEnter={e => {
                                const el = e.currentTarget as HTMLElement
                                el.style.borderColor = 'rgba(244,212,124,0.60)'
                                el.style.background  = 'rgba(244,212,124,0.18)'
                              }}
                              onMouseLeave={e => {
                                const el = e.currentTarget as HTMLElement
                                el.style.borderColor = 'rgba(244,212,124,0.30)'
                                el.style.background  = 'rgba(244,212,124,0.10)'
                              }}
                            >
                              <Play size={11} />
                            </a>
                          ) : (
                            <span style={{ color: '#474658' }}>—</span>
                          )}
                        </td>
                        {/* FORMS */}
                        <td style={{ padding: '14px 16px', whiteSpace: 'nowrap' }}>
                          {m.enviadoForms?.toLowerCase() === 'sim' ? (
                            <span style={{
                              display: 'inline-block',
                              padding: '4px 8px', borderRadius: '99px',
                              fontFamily: FF_SYNE, fontSize: '10px', fontWeight: 600,
                              textTransform: 'uppercase',
                              color: 'rgba(106,196,73,0.95)',
                              background: 'rgba(106,196,73,0.10)',
                              border: '1px solid rgba(106,196,73,0.30)',
                            }}>
                              Sim
                            </span>
                          ) : (
                            <span style={{ color: '#474658' }}>—</span>
                          )}
                        </td>
                        {/* AÇÕES */}
                        <td style={{ padding: '14px 16px' }}>
                          <div style={{ display: 'flex', alignItems: 'center', gap: '4px' }}>
                            <button
                              type="button"
                              onClick={() => setEditando(m)}
                              aria-label={`Editar monitoria de ${m.colaborador}`}
                              title="Editar"
                              style={{
                                display: 'flex', alignItems: 'center', justifyContent: 'center',
                                width: '28px', height: '28px', borderRadius: '8px',
                                background: 'transparent',
                                border: '1px solid transparent',
                                color: '#72708F', cursor: 'pointer',
                                transition: 'border-color 150ms ease, color 150ms ease',
                              }}
                              onMouseEnter={e => {
                                const el = e.currentTarget as HTMLElement
                                el.style.borderColor = 'rgba(244,212,124,0.50)'
                                el.style.color       = '#e8c96d'
                              }}
                              onMouseLeave={e => {
                                const el = e.currentTarget as HTMLElement
                                el.style.borderColor = 'transparent'
                                el.style.color       = '#72708F'
                              }}
                            >
                              <Pencil size={14} />
                            </button>
                            {canDelete && (
                              <button
                                type="button"
                                onClick={() => setConfirmarDeletar(m)}
                                aria-label={`Deletar monitoria de ${m.colaborador}`}
                                title="Deletar"
                                style={{
                                  display: 'flex', alignItems: 'center', justifyContent: 'center',
                                  width: '28px', height: '28px', borderRadius: '8px',
                                  background: 'transparent',
                                  border: '1px solid transparent',
                                  color: '#72708F', cursor: 'pointer',
                                  transition: 'border-color 150ms ease, color 150ms ease',
                                }}
                                onMouseEnter={e => {
                                  const el = e.currentTarget as HTMLElement
                                  el.style.borderColor = 'rgba(227,57,57,0.50)'
                                  el.style.color       = 'rgba(227,57,57,0.95)'
                                }}
                                onMouseLeave={e => {
                                  const el = e.currentTarget as HTMLElement
                                  el.style.borderColor = 'transparent'
                                  el.style.color       = '#72708F'
                                }}
                              >
                                <Trash2 size={14} />
                              </button>
                            )}
                          </div>
                        </td>
                      </tr>
                    )
                  })
                )}
              </tbody>
            </table>
          </div>
        </div>
      </div>

      {/* ── Modais ── */}
      <NovaMonitoriaModal
        aberto={novaAberta}
        operadores={operadores}
        onFechar={() => setNovaAberta(false)}
        onSalvo={() => {
          setNovaAberta(false)
          setToast({ message: 'Monitoria criada com sucesso.', type: 'success' })
          router.refresh()
        }}
      />

      {editando && (
        <EditarMonitoriaModal
          monitoria={editando}
          operadores={operadores}
          onFechar={() => setEditando(null)}
          onSalvo={() => {
            setEditando(null)
            setToast({ message: 'Monitoria atualizada.', type: 'success' })
            router.refresh()
          }}
        />
      )}

      <ConfirmDeleteMonitoriaModal
        monitoria={confirmarDeletar}
        onFechar={() => setConfirmarDeletar(null)}
        onApagado={() => {
          setConfirmarDeletar(null)
          setToast({ message: 'Monitoria removida.', type: 'success' })
          router.refresh()
        }}
        onErro={(msg) => setToast({ message: msg, type: 'error' })}
      />

      {/* ── Toast ── */}
      {toast && (
        <div
          role="alert"
          style={{
            position: 'fixed', bottom: '24px', right: '24px', zIndex: 60,
            display: 'flex', alignItems: 'center', gap: '10px',
            padding: '12px 16px', borderRadius: '10px',
            fontFamily: FF_DM, fontSize: '13px', fontWeight: 600,
            background: '#070714',
            border: `1px solid ${toast.type === 'success' ? 'rgba(106,196,73,0.35)' : 'rgba(227,57,57,0.35)'}`,
            color: toast.type === 'success' ? 'rgba(106,196,73,0.95)' : 'rgba(227,57,57,0.95)',
            boxShadow: '0 8px 32px rgba(0,0,0,0.60)',
            animation: 'fadeInScale 200ms ease',
            maxWidth: '320px',
          }}
        >
          <div style={{
            width: '6px', height: '6px', borderRadius: '50%', flexShrink: 0,
            background: toast.type === 'success' ? 'rgba(106,196,73,0.95)' : 'rgba(227,57,57,0.95)',
          }} />
          {toast.message}
        </div>
      )}
    </>
  )
}
