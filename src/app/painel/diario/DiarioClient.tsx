'use client'

import { useState, useMemo, useEffect } from 'react'
import { BookOpen, Plus, Hash, ChevronRight, Filter, Trash2 } from 'lucide-react'
import type { DiarioRegistro, TipoRegistro } from '@/lib/diario-utils'
import {
  formatarDataCurta,
  parseTempoSeg, formatHHMMSS,
  JORNADA_OBRIGATORIA_SEGUNDOS, LIMIAR_BRUTO_MIN,
} from '@/lib/diario-utils'
import { OPERADORES_DISPLAY } from '@/lib/operadores'
import NovoRegistroModal from './NovoRegistroModal'
import EditarRegistroModal from './EditarRegistroModal'
import RegistroModal from './RegistroModal'
import ConfirmDeleteModal from './ConfirmDeleteModal'

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
  const canEdit   = role === 'admin' || role === 'gestor'

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

  function toggleExpand(idx: number) {
    setExpandidos((prev) => {
      const next = new Set(prev)
      if (next.has(idx)) next.delete(idx)
      else next.add(idx)
      return next
    })
  }

  const hasFilters = filtroOp !== '' || filtroTipo !== ''
  const cssVars = { '--void2': '#07070f', '--void3': '#0d0d1a' } as React.CSSProperties

  return (
    <>
      <div style={cssVars} className="space-y-5 login-grid-bg">

        {/* ── Linha dourada ── */}
        <div style={{
          height: '1px',
          background: 'linear-gradient(90deg, transparent 0%, #c9a84c 25%, #e8c96d 50%, #c9a84c 75%, transparent 100%)',
        }} />

        {/* ── Header ── */}
        <div style={{
          background: 'var(--void2)',
          border: '1px solid rgba(201,168,76,0.1)',
          borderRadius: '14px',
          padding: '14px 20px',
          display: 'flex',
          alignItems: 'center',
          gap: '16px',
          flexWrap: 'wrap',
          justifyContent: 'space-between',
        }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '14px', flexWrap: 'wrap' }}>
            <span style={{
              fontFamily: 'var(--ff-display)',
              fontSize: '16px',
              fontWeight: 700,
              textTransform: 'uppercase',
              letterSpacing: '0.06em',
              background: 'linear-gradient(135deg, #e8c96d 0%, #c9a84c 100%)',
              WebkitBackgroundClip: 'text',
              WebkitTextFillColor: 'transparent',
              backgroundClip: 'text',
            }}>
              Diário de Bordo
            </span>
            <div style={{ width: '1px', height: '16px', background: 'rgba(201,168,76,0.2)', flexShrink: 0 }} />
            <span style={{ fontSize: '11px', textTransform: 'uppercase', letterSpacing: '0.06em', color: 'var(--text-muted)' }}>
              {mesLabel}
            </span>
            <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
              <div className="animate-pulse" style={{ width: '6px', height: '6px', borderRadius: '50%', background: '#10b981', flexShrink: 0 }} />
              <span style={{ fontSize: '11px', color: 'var(--text-muted)' }}>
                <strong style={{ color: 'var(--text-secondary)', fontWeight: 600 }}>{registros.length}</strong>{' '}registros
              </span>
            </div>
          </div>
          <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
            <button
              type="button"
              onClick={() => setNovoAberto(true)}
              className="btn-primary flex items-center gap-2"
              style={{ fontFamily: 'var(--ff-display)', fontWeight: 700, letterSpacing: '0.06em', fontSize: '11px', textTransform: 'uppercase' }}
            >
              <Plus size={15} />
              Novo Registro
            </button>
          </div>
        </div>

        {/* ── Filter bar ── */}
        <div style={{
          background: 'var(--void2)',
          border: '1px solid rgba(201,168,76,0.1)',
          borderRadius: '14px',
          padding: '12px 16px',
          display: 'flex',
          alignItems: 'center',
          gap: '10px',
          flexWrap: 'wrap',
        }}>
          <Filter size={13} style={{ color: 'rgba(244,212,124,0.6)', flexShrink: 0 }} />

          <select
            value={filtroOp}
            onChange={(e) => setFiltroOp(e.target.value)}
            className="select"
            style={{ maxWidth: '200px', fontSize: '0.8125rem', padding: '0.375rem 0.75rem', background: 'var(--void2)' }}
          >
            <option value="">Todos os operadores</option>
            <option value="__geral__">Geral — Setor inteiro</option>
            {OPERADORES_DISPLAY.map((op) => (
              <option key={op.id} value={op.nome}>{op.nome.split(' ')[0]} {op.nome.split(' ').slice(-1)[0]}</option>
            ))}
          </select>

          <div className="flex items-center gap-1.5 flex-wrap">
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
                    padding: '4px 12px',
                    borderRadius: '99px',
                    fontSize: '11px',
                    fontWeight: active ? 700 : 600,
                    border: active
                      ? (tc ? `1px solid ${tc.border}` : '1px solid rgba(244,212,124,0.5)')
                      : '1px solid rgba(244,212,124,0.15)',
                    background: active
                      ? (tc ? tc.bg : '#f4d47c')
                      : 'transparent',
                    color: active
                      ? (tc ? tc.color : '#0a0e14')
                      : '#a1a1aa',
                    cursor: 'pointer',
                    whiteSpace: 'nowrap',
                    transition: 'border-color 150ms ease, color 150ms ease',
                  }}
                  onMouseEnter={e => { if (!active) { const el = e.currentTarget; el.style.borderColor = 'rgba(244,212,124,0.35)'; el.style.color = '#d4d4d8' } }}
                  onMouseLeave={e => { if (!active) { const el = e.currentTarget; el.style.borderColor = 'rgba(244,212,124,0.15)'; el.style.color = '#a1a1aa' } }}
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
              style={{ fontSize: '11px', marginLeft: 'auto', color: 'var(--text-muted)', cursor: 'pointer', background: 'none', border: 'none' }}
            >
              Limpar filtros
            </button>
          )}
        </div>

        {/* ── List ── */}
        {grupos.length === 0 ? (
          <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', padding: '80px 0', gap: '12px' }}>
            <div style={{ padding: '16px', borderRadius: '16px', background: 'rgba(255,255,255,0.03)' }}>
              <BookOpen size={28} style={{ color: 'var(--text-muted)' }} />
            </div>
            <p style={{ fontSize: '14px', color: 'var(--text-muted)' }}>
              {hasFilters ? 'Nenhum registro encontrado para este filtro.' : 'Nenhum registro no diário ainda.'}
            </p>
          </div>
        ) : (
          <div className="space-y-6">
            {grupos.map(([data, regs]) => (
              <div key={data}>
                <div style={{ display: 'flex', alignItems: 'center', gap: '12px', marginBottom: '10px' }}>
                  <span style={{
                    fontSize: '12px',
                    fontWeight: 700,
                    padding: '4px 10px',
                    borderRadius: '4px',
                    fontVariantNumeric: 'tabular-nums',
                    background: 'rgba(201,168,76,0.08)',
                    color: '#e8c96d',
                    border: '1px solid rgba(201,168,76,0.20)',
                  }}>
                    {formatarDataCurta(data)}
                  </span>
                  <div style={{ flex: 1, height: '1px', background: 'rgba(255,255,255,0.05)' }} />
                  <span style={{ fontSize: '10px', color: 'var(--text-muted)' }}>
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

                    let tempoDisplay: string | null = null
                    if (r.tipo === 'Fora da jornada') {
                      if (r.tempoMin >= LIMIAR_BRUTO_MIN) {
                        // Tempo logado bruto → calcula déficit com precisão de segundos
                        const logadoSeg = parseTempoSeg(r.tempo)
                        const deficitSeg = logadoSeg > 0 ? Math.max(0, JORNADA_OBRIGATORIA_SEGUNDOS - logadoSeg) : 0
                        tempoDisplay = deficitSeg > 0 ? formatHHMMSS(deficitSeg) : null
                      } else if (r.tempoMin > 0) {
                        // Déficit já salvo → exibir diretamente
                        tempoDisplay = formatHHMMSS(r.tempoMin * 60)
                      }
                    } else {
                      const seg = parseTempoSeg(r.tempo)
                      tempoDisplay = seg > 0 ? formatHHMMSS(seg) : (r.tempo || null)
                    }

                    return (
                      <div
                        key={i}
                        style={{
                          position: 'relative',
                          borderRadius: '0 10px 10px 0',
                          border: expanded ? `1px solid ${tc.border}` : '1px solid rgba(244,212,124,0.15)',
                          borderLeft: `3px solid ${tc.color}`,
                          background: '#0a0e14',
                          transition: 'border-color 150ms ease',
                        }}
                        onMouseEnter={() => setHoveredCard(cardKey)}
                        onMouseLeave={() => setHoveredCard(null)}
                      >
                        {/* Delete button */}
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
                              color: '#f87171',
                              background: hovered ? 'rgba(239,68,68,0.10)' : 'transparent',
                              border: hovered ? '1px solid rgba(239,68,68,0.20)' : '1px solid transparent',
                              zIndex: 2, cursor: 'pointer', lineHeight: 0,
                            }}
                            onMouseEnter={(e) => { (e.currentTarget as HTMLElement).style.background = 'rgba(239,68,68,0.20)' }}
                            onMouseLeave={(e) => { (e.currentTarget as HTMLElement).style.background = hovered ? 'rgba(239,68,68,0.10)' : 'transparent' }}
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
                                fontSize: '9px', fontWeight: 700, textTransform: 'uppercase',
                                padding: '2px 6px', borderRadius: '2px', flexShrink: 0,
                                background: tc.bg, color: tc.color, border: `1px solid ${tc.border}`,
                              }}>
                                {r.tipo.split(' ')[0]}
                              </span>
                              <span style={{ fontSize: '14px', fontWeight: 500, color: 'var(--text-primary)', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap', maxWidth: 'calc(100% - 80px)' }}>
                                {label}
                              </span>
                              {r.glpi && (
                                <span style={{
                                  fontSize: '9px', fontWeight: 700, padding: '2px 6px', borderRadius: '99px', flexShrink: 0,
                                  fontVariantNumeric: 'tabular-nums',
                                  background: 'rgba(96,165,250,0.10)', color: '#60a5fa', border: '1px solid rgba(96,165,250,0.20)',
                                }}>
                                  <Hash size={8} className="inline mr-0.5" />{r.glpi}
                                </span>
                              )}
                            </div>
                            <p style={{
                              fontSize: '12px', lineHeight: 1.6, color: '#a1a1aa',
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
                                fontSize: '12px', fontWeight: 700, fontVariantNumeric: 'tabular-nums',
                                color: tc.color,
                              }}>
                                {tempoDisplay}
                              </span>
                            )}
                            <ChevronRight size={14} style={{ color: 'var(--text-muted)', transform: expanded ? 'rotate(90deg)' : 'none', transition: 'transform 200ms ease' }} />
                          </div>
                        </div>

                        {expanded && (
                          <div
                            style={{ display: 'flex', justifyContent: 'flex-end', padding: '0 16px 12px', borderTop: '1px solid rgba(255,255,255,0.04)' }}
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
          padding: '12px 16px', borderRadius: '12px',
          fontSize: '0.8125rem', fontWeight: 600,
          background: toast.type === 'success'
            ? 'linear-gradient(135deg, rgba(16,185,129,0.15), rgba(16,185,129,0.08))'
            : 'linear-gradient(135deg, rgba(239,68,68,0.15), rgba(239,68,68,0.08))',
          border: `1px solid ${toast.type === 'success' ? 'rgba(16,185,129,0.30)' : 'rgba(239,68,68,0.30)'}`,
          color: toast.type === 'success' ? '#34d399' : '#f87171',
          boxShadow: '0 8px 32px rgba(0,0,0,0.40)',
          backdropFilter: 'blur(12px)',
          animation: 'fadeInScale 200ms ease',
          maxWidth: '320px',
        }}>
          {toast.message}
        </div>
      )}
    </>
  )
}
