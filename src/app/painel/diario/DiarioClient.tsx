'use client'

import { useState, useMemo, useEffect } from 'react'
import { BookOpen, Plus, Hash, ChevronRight, Trash2 } from 'lucide-react'
import type { DiarioRegistro, TipoRegistro } from '@/lib/diario-utils'
import {
  formatarDataCurta,
  parseTempoSeg, formatHHMMSS,
  calcularDeficitForaJornada,
} from '@/lib/diario-utils'
import { OPERADORES_DISPLAY } from '@/lib/operadores'
import { PainelHeader, LinhaHorizontalDourada } from '@/components/painel/PainelHeader'
import { PainelSectionTitle } from '@/components/painel/PainelSectionTitle'
import NovoRegistroModal from './NovoRegistroModal'
import EditarRegistroModal from './EditarRegistroModal'
import RegistroModal from './RegistroModal'
import ConfirmDeleteModal from './ConfirmDeleteModal'

const FF_SYNE = "'Syne', sans-serif"
const FF_DM   = "'DM Sans', sans-serif"

const TIPO_CORES: Record<TipoRegistro, { bg: string; color: string; border: string }> = {
  'Pausa justificada': { bg: 'rgba(245,158,11,0.10)',  color: '#f59e0b', border: 'rgba(245,158,11,0.25)' },
  'Fora da jornada':   { bg: 'rgba(96,165,250,0.10)',  color: '#60a5fa', border: 'rgba(96,165,250,0.25)' },
  'Geral':             { bg: 'rgba(167,139,250,0.10)', color: '#a78bfa', border: 'rgba(167,139,250,0.25)' },
  'Outros':            { bg: 'rgba(148,163,184,0.10)', color: '#94a3b8', border: 'rgba(148,163,184,0.20)' },
}

interface Props {
  registros: DiarioRegistro[]
  mesLabel: string
  role: string
}

interface Toast {
  message: string
  type: 'success' | 'error'
}

export default function DiarioClient({ registros, mesLabel, role }: Props) {
  const canDelete = role !== 'aux'

  const [novoAberto,          setNovoAberto]          = useState(false)
  const [registroAberto,      setRegistroAberto]      = useState<DiarioRegistro | null>(null)
  const [registroParaEditar,  setRegistroParaEditar]  = useState<DiarioRegistro | null>(null)
  const [registroParaDeletar, setRegistroParaDeletar] = useState<DiarioRegistro | null>(null)
  const [filtroOp,            setFiltroOp]            = useState('')
  const [filtroTipo,          setFiltroTipo]          = useState<TipoRegistro | ''>('')
  const [expandidos,          setExpandidos]          = useState<Set<number>>(new Set())
  const [hoveredCard,         setHoveredCard]         = useState<number | null>(null)
  const [toast,               setToast]               = useState<Toast | null>(null)

  useEffect(() => {
    if (!toast) return
    const t = setTimeout(() => setToast(null), 3000)
    return () => clearTimeout(t)
  }, [toast])

  const filtrados = useMemo(() => {
    return registros.filter((r) => {
      if (filtroOp) {
        if (filtroOp === '__geral__') { if (r.colaborador) return false }
        else { if (!r.colaborador.toLowerCase().includes(filtroOp.toLowerCase())) return false }
      }
      if (filtroTipo && r.tipo !== filtroTipo) return false
      return true
    })
  }, [registros, filtroOp, filtroTipo])

  const grupos = useMemo(() => {
    const map = new Map<string, DiarioRegistro[]>()
    for (const r of filtrados) {
      const key = r.data || 'Sem data'
      if (!map.has(key)) map.set(key, [])
      map.get(key)!.push(r)
    }
    return Array.from(map.entries())
  }, [filtrados])

  // Pre-compute tempo display outside render to avoid re-running parseTempoSeg on every re-render
  const tempoDisplayMap = useMemo(() => {
    const map = new Map<number, string | null>()
    for (const r of registros) {
      let display: string | null = null
      if (r.tipo === 'Fora da jornada') {
        display = calcularDeficitForaJornada(r.tempo).deficitFormatado
      } else {
        const seg = parseTempoSeg(r.tempo)
        display = seg > 0 ? formatHHMMSS(seg) : (r.tempo || null)
      }
      map.set(r.sheetRowIndex, display)
    }
    return map
  }, [registros])

  function toggleExpand(idx: number) {
    setExpandidos((prev) => {
      const next = new Set(prev)
      if (next.has(idx)) next.delete(idx)
      else next.add(idx)
      return next
    })
  }

  const hasFilters = filtroOp !== '' || filtroTipo !== ''

  return (
    <>
      <div className="space-y-5 regiao-cards-painel">

        {/* ── Header ── */}
        <PainelHeader titulo="Diário de Bordo" mesLabel={mesLabel} />

        {/* ── Linha dourada ── */}
        <LinhaHorizontalDourada />

        {/* ── Filter bar ── */}
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
            color: '#72708F',
            textTransform: 'uppercase',
            letterSpacing: '1px',
            flexShrink: 0,
          }}>
            Filtros:
          </span>

          <select
            value={filtroOp}
            onChange={(e) => setFiltroOp(e.target.value)}
            style={{
              fontFamily: FF_SYNE,
              fontSize: '12px',
              fontWeight: 600,
              textTransform: 'uppercase',
              letterSpacing: '0.5px',
              padding: '6px 12px',
              borderRadius: '14px',
              background: '#070714',
              border: '1px solid rgba(114,112,143,0.5)',
              color: '#72708F',
              cursor: 'pointer',
              outline: 'none',
              maxWidth: '200px',
            }}
          >
            <option value="">Todos os operadores</option>
            <option value="__geral__">Geral — Setor inteiro</option>
            {OPERADORES_DISPLAY.map((op) => (
              <option key={op.id} value={op.nome}>{op.nome.split(' ')[0]} {op.nome.split(' ').slice(-1)[0]}</option>
            ))}
          </select>

          <div style={{ display: 'flex', gap: '8px', flexWrap: 'wrap', alignItems: 'center' }}>
            {(['', 'Pausa justificada', 'Fora da jornada', 'Geral', 'Outros'] as const).map((t) => {
              const active = filtroTipo === t
              const tc = t ? TIPO_CORES[t] : null
              return (
                <button
                  key={t || 'todos'}
                  type="button"
                  onClick={() => setFiltroTipo(t)}
                  aria-pressed={active}
                  style={{
                    fontFamily: FF_SYNE,
                    fontWeight: 600,
                    fontSize: '12px',
                    textTransform: 'uppercase',
                    letterSpacing: '0.5px',
                    padding: '6px 16px',
                    borderRadius: '14px',
                    border: active
                      ? (tc ? `1px solid ${tc.border}` : '1px solid rgba(244,212,124,0.5)')
                      : '1px solid rgba(114,112,143,0.5)',
                    background: active
                      ? (tc ? tc.bg : 'rgba(244,212,124,0.10)')
                      : 'transparent',
                    color: active
                      ? (tc ? tc.color : '#f4d47c')
                      : '#72708F',
                    cursor: 'pointer',
                    whiteSpace: 'nowrap',
                    transition: 'all 200ms ease',
                  }}
                  onMouseEnter={e => { if (!active) { const el = e.currentTarget as HTMLElement; el.style.color = 'rgba(114,112,143,1)'; el.style.borderColor = 'rgba(114,112,143,0.8)' } }}
                  onMouseLeave={e => { if (!active) { const el = e.currentTarget as HTMLElement; el.style.color = '#72708F'; el.style.borderColor = 'rgba(114,112,143,0.5)' } }}
                >
                  {t || 'Todos'}
                </button>
              )
            })}
          </div>

          {hasFilters && (
            <button
              type="button"
              onClick={() => { setFiltroOp(''); setFiltroTipo('') }}
              style={{
                fontFamily: FF_DM,
                fontSize: '11px', marginLeft: 'auto',
                color: '#72708f', cursor: 'pointer',
                background: 'none', border: 'none',
              }}
            >
              Limpar filtros
            </button>
          )}
        </div>

        {/* ── Section title + button ── */}
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: '12px' }}>
          <div style={{ flex: 1 }}>
            <PainelSectionTitle contador={filtrados.length}>
              REGISTROS DO DIÁRIO
            </PainelSectionTitle>
          </div>
          <button
            type="button"
            onClick={() => setNovoAberto(true)}
            className="btn-primary flex items-center gap-2"
            style={{
              fontFamily: FF_SYNE, fontWeight: 700,
              letterSpacing: '0.06em', fontSize: '11px',
              textTransform: 'uppercase', flexShrink: 0,
            }}
          >
            <Plus size={15} />
            Novo Registro
          </button>
        </div>

        {/* ── List ── */}
        {grupos.length === 0 ? (
          <div style={{
            display: 'flex', flexDirection: 'column', alignItems: 'center',
            justifyContent: 'center', padding: '80px 0', gap: '12px',
          }}>
            <div style={{
              padding: '16px', borderRadius: '10px',
              background: '#070714',
              border: '1px solid rgba(244,212,124,0.08)',
            }}>
              <BookOpen size={28} style={{ color: '#72708f' }} />
            </div>
            <p style={{ fontFamily: FF_DM, fontSize: '14px', color: '#72708f' }}>
              {hasFilters ? 'Nenhum registro encontrado para este filtro.' : 'Nenhum registro no diário ainda.'}
            </p>
          </div>
        ) : (
          <div className="space-y-6">
            {grupos.map(([data, regs]) => (
              <div key={data}>
                <div style={{ display: 'flex', alignItems: 'center', gap: '12px', marginBottom: '10px' }}>
                  <span style={{
                    fontFamily: FF_DM,
                    fontSize: '12px', fontWeight: 700,
                    padding: '4px 10px', borderRadius: '4px',
                    fontVariantNumeric: 'tabular-nums',
                    background: 'rgba(201,168,76,0.08)',
                    color: '#e8c96d',
                    border: '1px solid rgba(201,168,76,0.20)',
                  }}>
                    {formatarDataCurta(data)}
                  </span>
                  <div style={{ flex: 1, height: '1px', background: 'rgba(255,255,255,0.05)' }} />
                  <span style={{ fontFamily: FF_DM, fontSize: '10px', color: '#72708f' }}>
                    {regs.length} {regs.length === 1 ? 'registro' : 'registros'}
                  </span>
                </div>

                <div className="space-y-2">
                  {regs.map((r, i) => {
                    const cardKey = r.sheetRowIndex
                    const tc = TIPO_CORES[r.tipo]
                    const expanded = expandidos.has(cardKey)
                    const hovered = hoveredCard === cardKey
                    const label = r.colaborador || 'Geral — Setor inteiro'
                    const borderColor = expanded
                      ? tc.border
                      : hovered
                        ? 'rgba(255,185,34,0.5)'
                        : 'rgba(244,212,124,0.12)'

                    const tempoDisplay = tempoDisplayMap.get(r.sheetRowIndex) ?? null

                    return (
                      <div
                        key={i}
                        style={{
                          position: 'relative',
                          borderRadius: '0 10px 10px 0',
                          borderTop: `1px solid ${borderColor}`,
                          borderRight: `1px solid ${borderColor}`,
                          borderBottom: `1px solid ${borderColor}`,
                          borderLeft: `3px solid ${tc.color}`,
                          background: '#070714',
                          transition: 'border-color 150ms ease',
                        }}
                        onMouseEnter={() => setHoveredCard(cardKey)}
                        onMouseLeave={() => setHoveredCard(null)}
                      >
                        {canDelete && (
                          <button
                            type="button"
                            aria-label="Apagar registro"
                            onClick={(e) => { e.stopPropagation(); setRegistroParaDeletar(r) }}
                            style={{
                              position: 'absolute', top: '8px', right: '8px',
                              opacity: hovered ? 1 : 0,
                              transition: 'opacity 150ms ease, background 150ms ease',
                              padding: '5px', borderRadius: '8px',
                              color: 'rgba(227,57,57,0.74)',
                              background: hovered ? 'rgba(227,57,57,0.10)' : 'transparent',
                              border: hovered ? '1px solid rgba(227,57,57,0.20)' : '1px solid transparent',
                              zIndex: 2, cursor: 'pointer', lineHeight: 0,
                            }}
                            onMouseEnter={(e) => { (e.currentTarget as HTMLElement).style.background = 'rgba(227,57,57,0.20)' }}
                            onMouseLeave={(e) => { (e.currentTarget as HTMLElement).style.background = hovered ? 'rgba(227,57,57,0.10)' : 'transparent' }}
                          >
                            <Trash2 size={13} />
                          </button>
                        )}

                        <div
                          style={{ display: 'flex', alignItems: 'flex-start', gap: '12px', padding: '12px 16px 12px 14px', cursor: 'pointer' }}
                          onClick={() => toggleExpand(cardKey)}
                        >
                          <div style={{ flex: 1, minWidth: 0 }}>
                            <div style={{ display: 'flex', alignItems: 'center', gap: '8px', flexWrap: 'wrap', marginBottom: '4px' }}>
                              <span style={{
                                fontFamily: FF_SYNE,
                                fontSize: '9px', fontWeight: 700, textTransform: 'uppercase',
                                padding: '2px 6px', borderRadius: '4px', flexShrink: 0,
                                letterSpacing: '0.06em',
                                background: tc.bg, color: tc.color, border: `1px solid ${tc.border}`,
                              }}>
                                {r.tipo.split(' ')[0]}
                              </span>
                              <span style={{
                                fontFamily: FF_SYNE,
                                fontSize: '14px', fontWeight: 600,
                                textTransform: 'uppercase',
                                letterSpacing: '0.04em',
                                color: '#A6A2A2',
                                overflow: 'hidden', textOverflow: 'ellipsis',
                                whiteSpace: 'nowrap', maxWidth: 'calc(100% - 80px)',
                              }}>
                                {label}
                              </span>
                              {r.glpi && (
                                <span style={{
                                  fontFamily: FF_DM,
                                  fontSize: '9px', fontWeight: 700,
                                  padding: '2px 6px', borderRadius: '99px', flexShrink: 0,
                                  fontVariantNumeric: 'tabular-nums',
                                  background: 'rgba(96,165,250,0.10)',
                                  color: '#60a5fa',
                                  border: '1px solid rgba(96,165,250,0.20)',
                                }}>
                                  <Hash size={8} className="inline mr-0.5" />{r.glpi}
                                </span>
                              )}
                            </div>
                            <p style={{
                              fontFamily: FF_DM,
                              fontSize: '12px', lineHeight: 1.6, color: '#72708f',
                              overflow: 'hidden', display: '-webkit-box',
                              WebkitLineClamp: expanded ? undefined : 2,
                              WebkitBoxOrient: 'vertical',
                            }}>
                              {r.observacoes || '—'}
                            </p>
                          </div>

                          <div style={{ display: 'flex', alignItems: 'center', gap: '12px', flexShrink: 0, paddingRight: canDelete ? '28px' : '4px' }}>
                            {tempoDisplay && (
                              <span style={{
                                fontFamily: FF_DM,
                                fontSize: '12px', fontWeight: 700,
                                fontVariantNumeric: 'tabular-nums',
                                color: tc.color,
                              }}>
                                {tempoDisplay}
                              </span>
                            )}
                            <ChevronRight size={14} style={{ color: '#72708f', transform: expanded ? 'rotate(90deg)' : 'none', transition: 'transform 200ms ease' }} />
                          </div>
                        </div>

                        {expanded && (
                          <div
                            style={{
                              display: 'flex', justifyContent: 'flex-end',
                              padding: '0 16px 12px',
                              borderTop: '1px solid #211F3C',
                            }}
                            onClick={(e) => e.stopPropagation()}
                          >
                            <button
                              type="button"
                              onClick={() => { setRegistroAberto(r); toggleExpand(cardKey) }}
                              className="btn-secondary text-xs flex items-center gap-1.5"
                            >
                              <BookOpen size={12} />
                              Ver detalhes
                            </button>
                          </div>
                        )}
                      </div>
                    )
                  })}
                </div>
              </div>
            ))}
          </div>
        )}
      </div>

      {/* Modals */}
      <NovoRegistroModal aberto={novoAberto} onFechar={() => setNovoAberto(false)} onSalvo={() => setNovoAberto(false)} />
      <EditarRegistroModal
        registro={registroParaEditar}
        onFechar={() => setRegistroParaEditar(null)}
        onSalvo={() => { setRegistroParaEditar(null); setToast({ message: 'Registro atualizado.', type: 'success' }) }}
      />
      <RegistroModal
        registro={registroAberto}
        role={role}
        onFechar={() => setRegistroAberto(null)}
        onEditar={(r) => { setRegistroAberto(null); setRegistroParaEditar(r) }}
      />
      <ConfirmDeleteModal
        registro={registroParaDeletar}
        onFechar={() => setRegistroParaDeletar(null)}
        onApagado={() => { setRegistroParaDeletar(null); setToast({ message: 'Registro apagado da planilha.', type: 'success' }) }}
        onErro={(msg) => setToast({ message: msg, type: 'error' })}
      />

      {/* Toast */}
      {toast && (
        <div style={{
          position: 'fixed', bottom: '24px', right: '24px', zIndex: 60,
          display: 'flex', alignItems: 'center', gap: '10px',
          padding: '12px 16px', borderRadius: '10px',
          fontFamily: FF_DM,
          fontSize: '0.8125rem', fontWeight: 600,
          background: '#070714',
          border: `1px solid ${toast.type === 'success' ? 'rgba(74,222,128,0.35)' : 'rgba(227,57,57,0.35)'}`,
          color: toast.type === 'success' ? '#4ade80' : '#e33939',
          boxShadow: '0 8px 32px rgba(0,0,0,0.60)',
          animation: 'fadeInScale 200ms ease',
          maxWidth: '320px',
        }}>
          <div style={{
            width: '6px', height: '6px', borderRadius: '50%', flexShrink: 0,
            background: toast.type === 'success' ? '#4ade80' : '#e33939',
          }} />
          {toast.message}
        </div>
      )}
    </>
  )
}
