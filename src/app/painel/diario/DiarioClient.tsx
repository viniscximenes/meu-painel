'use client'

import { useState, useMemo, useEffect } from 'react'
import { BookOpen, Plus, Hash, ChevronRight, Filter, Trash2, Users } from 'lucide-react'
import type { DiarioRegistro, TipoRegistro } from '@/lib/diario-utils'
import { formatTempo, formatarDataCurta } from '@/lib/diario-utils'
import { OPERADORES_DISPLAY } from '@/lib/operadores'
import Link from 'next/link'
import NovoRegistroModal from './NovoRegistroModal'
import RegistroModal from './RegistroModal'
import ConfirmDeleteModal from './ConfirmDeleteModal'

const TIPO_CORES: Record<TipoRegistro, { bg: string; color: string; border: string }> = {
  'Pausa justificada': { bg: 'rgba(245,158,11,0.10)',  color: '#f59e0b', border: 'rgba(245,158,11,0.25)' },
  'Fora da jornada':   { bg: 'rgba(96,165,250,0.10)',  color: '#60a5fa', border: 'rgba(96,165,250,0.25)' },
  'Geral':             { bg: 'rgba(167,139,250,0.10)', color: '#a78bfa', border: 'rgba(167,139,250,0.25)' },
  'Outros':            { bg: 'rgba(148,163,184,0.10)', color: '#94a3b8', border: 'rgba(148,163,184,0.20)' },
  'Tempo logado':      { bg: 'rgba(52,211,153,0.10)',  color: '#34d399', border: 'rgba(52,211,153,0.25)' },
}

interface Props {
  registros: DiarioRegistro[]
  mesLabel: string
}

interface Toast {
  message: string
  type: 'success' | 'error'
}

export default function DiarioClient({ registros, mesLabel }: Props) {
  const [novoAberto,         setNovoAberto]         = useState(false)
  const [registroAberto,     setRegistroAberto]     = useState<DiarioRegistro | null>(null)
  const [registroParaDeletar,setRegistroParaDeletar]= useState<DiarioRegistro | null>(null)
  const [filtroOp,           setFiltroOp]           = useState('')
  const [filtroTipo,         setFiltroTipo]         = useState<TipoRegistro | ''>('')
  const [expandidos,         setExpandidos]         = useState<Set<number>>(new Set())
  const [hoveredCard,        setHoveredCard]        = useState<number | null>(null)
  const [toast,              setToast]              = useState<Toast | null>(null)

  // Auto-dismiss toast after 3s
  useEffect(() => {
    if (!toast) return
    const t = setTimeout(() => setToast(null), 3000)
    return () => clearTimeout(t)
  }, [toast])

  const filtrados = useMemo(() => {
    return registros.filter((r) => {
      if (filtroOp) {
        if (filtroOp === '__geral__') {
          if (r.colaborador) return false
        } else {
          if (!r.colaborador.toLowerCase().includes(filtroOp.toLowerCase())) return false
        }
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

  function getHistorico(registro: DiarioRegistro): DiarioRegistro[] {
    if (!registro.colaborador) return []
    return registros.filter((r) => r !== registro && r.colaborador === registro.colaborador)
  }

  const hasFilters = filtroOp !== '' || filtroTipo !== ''

  return (
    <>
      {/* Header row */}
      <div className="flex items-center justify-between mb-6 flex-wrap gap-3">
        <div>
          <h2
            className="text-2xl font-extrabold"
            style={{
              background: 'linear-gradient(90deg, var(--text-primary) 0%, var(--gold-light) 100%)',
              WebkitBackgroundClip: 'text',
              WebkitTextFillColor: 'transparent',
            }}
          >
            Diário de Bordo
          </h2>
          <p className="text-xs mt-0.5" style={{ color: 'var(--text-muted)' }}>
            {mesLabel} · {registros.length} registros
          </p>
        </div>
        <div className="flex items-center gap-2 flex-wrap">
          <Link
            href="/painel/diario/resumo"
            className="flex items-center gap-2 text-sm font-semibold px-3 py-2 rounded-xl transition-all"
            style={{
              background: 'rgba(96,165,250,0.08)',
              color: '#60a5fa',
              border: '1px solid rgba(96,165,250,0.20)',
            }}
            onMouseEnter={(e) => { (e.currentTarget as HTMLElement).style.background = 'rgba(96,165,250,0.14)' }}
            onMouseLeave={(e) => { (e.currentTarget as HTMLElement).style.background = 'rgba(96,165,250,0.08)' }}
          >
            <Users size={14} />
            Por Operador
          </Link>
          <button
            type="button"
            onClick={() => setNovoAberto(true)}
            className="btn-primary flex items-center gap-2"
          >
            <Plus size={15} />
            Novo Registro
          </button>
        </div>
      </div>

      {/* Filter bar */}
      <div
        className="rounded-2xl border px-4 py-3 mb-5 flex items-center gap-3 flex-wrap"
        style={{ background: 'rgba(255,255,255,0.02)', borderColor: 'rgba(255,255,255,0.06)' }}
      >
        <Filter size={13} style={{ color: 'var(--text-muted)', flexShrink: 0 }} />

        <select
          value={filtroOp}
          onChange={(e) => setFiltroOp(e.target.value)}
          className="select"
          style={{ maxWidth: '200px', fontSize: '0.8125rem', padding: '0.375rem 0.75rem' }}
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
                className={active ? 'pill-filter' : 'pill-filter pill-filter-inactive'}
                style={
                  active
                    ? {
                        background: tc ? tc.bg : 'rgba(201,168,76,0.12)',
                        color: tc ? tc.color : 'var(--gold-light)',
                        border: `1px solid ${tc ? tc.border : 'rgba(201,168,76,0.30)'}`,
                      }
                    : {}
                }
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
            className="text-[11px] ml-auto"
            style={{ color: 'var(--text-muted)' }}
          >
            Limpar filtros
          </button>
        )}
      </div>

      {/* List */}
      {grupos.length === 0 ? (
        <div className="flex flex-col items-center justify-center py-20 gap-3">
          <div className="p-4 rounded-2xl" style={{ background: 'rgba(255,255,255,0.03)' }}>
            <BookOpen size={28} style={{ color: 'var(--text-muted)' }} />
          </div>
          <p className="text-sm" style={{ color: 'var(--text-muted)' }}>
            {hasFilters ? 'Nenhum registro encontrado para este filtro.' : 'Nenhum registro no diário ainda.'}
          </p>
        </div>
      ) : (
        <div className="space-y-6">
          {grupos.map(([data, regs]) => (
            <div key={data}>
              <div className="flex items-center gap-3 mb-3">
                <span
                  className="text-xs font-bold px-2.5 py-1 rounded-full tabular-nums"
                  style={{
                    background: 'rgba(201,168,76,0.08)',
                    color: 'var(--gold-light)',
                    border: '1px solid rgba(201,168,76,0.20)',
                  }}
                >
                  {formatarDataCurta(data)}
                </span>
                <div className="flex-1 h-px" style={{ background: 'rgba(255,255,255,0.05)' }} />
                <span className="text-[10px]" style={{ color: 'var(--text-muted)' }}>
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
                  const tempoFmt = r.tempoMin > 0 ? formatTempo(r.tempoMin) : r.tempo || null

                  return (
                    <div
                      key={i}
                      className="relative rounded-xl border transition-all"
                      style={{
                        background: 'rgba(255,255,255,0.02)',
                        borderColor: expanded ? tc.border : 'rgba(255,255,255,0.06)',
                        boxShadow: expanded ? `0 0 0 1px ${tc.bg}` : 'none',
                      }}
                      onMouseEnter={() => setHoveredCard(cardKey)}
                      onMouseLeave={() => setHoveredCard(null)}
                    >
                      {/* Delete button — top-right, visible on hover */}
                      <button
                        type="button"
                        aria-label="Apagar registro"
                        onClick={(e) => {
                          e.stopPropagation()
                          setRegistroParaDeletar(r)
                        }}
                        style={{
                          position: 'absolute',
                          top: '8px',
                          right: '8px',
                          opacity: hovered ? 1 : 0,
                          transition: 'opacity 150ms ease, background 150ms ease',
                          padding: '5px',
                          borderRadius: '8px',
                          color: '#f87171',
                          background: hovered ? 'rgba(239,68,68,0.10)' : 'transparent',
                          border: hovered ? '1px solid rgba(239,68,68,0.20)' : '1px solid transparent',
                          zIndex: 2,
                          cursor: 'pointer',
                          lineHeight: 0,
                        }}
                        onMouseEnter={(e) => { (e.currentTarget as HTMLElement).style.background = 'rgba(239,68,68,0.20)' }}
                        onMouseLeave={(e) => { (e.currentTarget as HTMLElement).style.background = hovered ? 'rgba(239,68,68,0.10)' : 'transparent' }}
                      >
                        <Trash2 size={13} />
                      </button>

                      <div
                        className="flex items-start gap-3 px-4 py-3 cursor-pointer"
                        onClick={() => toggleExpand(cardKey)}
                      >
                        <div
                          className="w-1 self-stretch rounded-full shrink-0 mt-0.5"
                          style={{ background: tc.color, opacity: 0.7, minHeight: '20px' }}
                        />

                        <div className="flex-1 min-w-0">
                          <div className="flex items-center gap-2 flex-wrap mb-1">
                            <span
                              className="text-[9px] font-bold uppercase px-1.5 py-0.5 rounded-full shrink-0"
                              style={{ background: tc.bg, color: tc.color, border: `1px solid ${tc.border}` }}
                            >
                              {r.tipo.split(' ')[0]}
                            </span>
                            <span className="text-sm font-medium truncate" style={{ color: 'var(--text-primary)', maxWidth: 'calc(100% - 80px)' }}>
                              {label}
                            </span>
                            {r.glpi && (
                              <span
                                className="text-[9px] font-bold px-1.5 py-0.5 rounded-full tabular-nums shrink-0"
                                style={{
                                  background: 'rgba(96,165,250,0.10)',
                                  color: '#60a5fa',
                                  border: '1px solid rgba(96,165,250,0.20)',
                                }}
                              >
                                <Hash size={8} className="inline mr-0.5" />
                                {r.glpi}
                              </span>
                            )}
                          </div>
                          <p
                            className="text-xs leading-relaxed"
                            style={{
                              color: 'var(--text-muted)',
                              overflow: 'hidden',
                              display: '-webkit-box',
                              WebkitLineClamp: expanded ? undefined : 2,
                              WebkitBoxOrient: 'vertical',
                            }}
                          >
                            {r.observacoes || '—'}
                          </p>
                        </div>

                        <div className="flex items-center gap-3 shrink-0" style={{ paddingRight: '20px' }}>
                          {tempoFmt && (
                            <span className="text-xs font-bold tabular-nums" style={{ color: tc.color }}>
                              {tempoFmt}
                            </span>
                          )}
                          <ChevronRight
                            size={14}
                            style={{
                              color: 'var(--text-muted)',
                              transform: expanded ? 'rotate(90deg)' : 'none',
                              transition: 'transform 200ms ease',
                            }}
                          />
                        </div>
                      </div>

                      {expanded && (
                        <div
                          className="flex justify-end px-4 pb-3 pt-0"
                          style={{ borderTop: '1px solid rgba(255,255,255,0.04)' }}
                          onClick={(e) => e.stopPropagation()}
                        >
                          <button
                            type="button"
                            onClick={() => {
                              setRegistroAberto(r)
                              toggleExpand(cardKey)
                            }}
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

      {/* Modals */}
      <NovoRegistroModal
        aberto={novoAberto}
        onFechar={() => setNovoAberto(false)}
        onSalvo={() => setNovoAberto(false)}
      />

      <RegistroModal
        registro={registroAberto}
        historico={registroAberto ? getHistorico(registroAberto) : []}
        onFechar={() => setRegistroAberto(null)}
      />

      <ConfirmDeleteModal
        registro={registroParaDeletar}
        onFechar={() => setRegistroParaDeletar(null)}
        onApagado={() => {
          setRegistroParaDeletar(null)
          setToast({ message: 'Registro apagado da planilha.', type: 'success' })
        }}
        onErro={(msg) => setToast({ message: msg, type: 'error' })}
      />

      {/* Toast */}
      {toast && (
        <div
          style={{
            position: 'fixed',
            bottom: '24px',
            right: '24px',
            zIndex: 60,
            display: 'flex',
            alignItems: 'center',
            gap: '10px',
            padding: '12px 16px',
            borderRadius: '12px',
            fontSize: '0.8125rem',
            fontWeight: 600,
            background: toast.type === 'success'
              ? 'linear-gradient(135deg, rgba(16,185,129,0.15), rgba(16,185,129,0.08))'
              : 'linear-gradient(135deg, rgba(239,68,68,0.15), rgba(239,68,68,0.08))',
            border: `1px solid ${toast.type === 'success' ? 'rgba(16,185,129,0.30)' : 'rgba(239,68,68,0.30)'}`,
            color: toast.type === 'success' ? '#34d399' : '#f87171',
            boxShadow: '0 8px 32px rgba(0,0,0,0.40)',
            backdropFilter: 'blur(12px)',
            animation: 'fadeInScale 200ms ease',
            maxWidth: '320px',
          }}
        >
          {toast.message}
        </div>
      )}
    </>
  )
}
