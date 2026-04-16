'use client'

import { X, BookOpen, Hash, Clock, Calendar, AlertTriangle, ChevronRight } from 'lucide-react'
import type { DiarioRegistro, TipoRegistro } from '@/lib/diario-utils'
import { formatTempo, formatarDataCurta, formatarDataCompleta } from '@/lib/diario-utils'

const TIPO_CORES: Record<TipoRegistro, { bg: string; color: string; border: string; label: string }> = {
  'Pausa justificada': { bg: 'rgba(245,158,11,0.10)',  color: '#f59e0b', border: 'rgba(245,158,11,0.25)', label: 'Pausa justificada' },
  'Fora da jornada':   { bg: 'rgba(96,165,250,0.10)',  color: '#60a5fa', border: 'rgba(96,165,250,0.25)', label: 'Fora da jornada' },
  'Geral':             { bg: 'rgba(167,139,250,0.10)', color: '#a78bfa', border: 'rgba(167,139,250,0.25)', label: 'Geral' },
  'Outros':            { bg: 'rgba(148,163,184,0.10)', color: '#94a3b8', border: 'rgba(148,163,184,0.20)', label: 'Outros' },
}

interface Props {
  registro: DiarioRegistro | null
  historico: DiarioRegistro[]
  onFechar: () => void
}

export default function RegistroModal({ registro, historico, onFechar }: Props) {
  if (!registro) return null
  const tc = TIPO_CORES[registro.tipo]
  const tempoFmt = registro.tempoMin > 0 ? formatTempo(registro.tempoMin) : registro.tempo || '—'
  const colaboradorLabel = registro.colaborador || 'Geral — Setor inteiro'

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center p-4"
      style={{ background: 'rgba(0,0,0,0.75)', backdropFilter: 'blur(10px) saturate(160%)' }}
      onClick={(e) => { if (e.target === e.currentTarget) onFechar() }}
    >
      <div
        className="animate-fadeInScale w-full max-w-lg rounded-2xl border overflow-hidden flex flex-col"
        style={{
          background: 'linear-gradient(180deg, rgba(17,24,39,0.99) 0%, rgba(8,12,20,0.99) 100%)',
          borderColor: tc.border,
          boxShadow: `0 32px 96px rgba(0,0,0,0.85), 0 0 0 1px ${tc.bg}`,
          maxHeight: '88vh',
        }}
      >
        {/* Header */}
        <div
          className="flex items-start justify-between px-6 py-4 shrink-0"
          style={{ borderBottom: '1px solid rgba(255,255,255,0.06)' }}
        >
          <div className="flex items-start gap-3">
            <div className="p-2 rounded-xl shrink-0 mt-0.5" style={{ background: tc.bg, color: tc.color }}>
              <BookOpen size={15} />
            </div>
            <div>
              <div className="flex items-center gap-2 flex-wrap">
                <span
                  className="text-[10px] font-bold uppercase px-2.5 py-1 rounded-full border"
                  style={{ background: tc.bg, color: tc.color, borderColor: tc.border, letterSpacing: '0.07em' }}
                >
                  {tc.label}
                </span>
                {registro.glpi && (
                  <span className="text-[10px] font-bold px-2 py-0.5 rounded-full tabular-nums"
                    style={{ background: 'rgba(96,165,250,0.10)', color: '#60a5fa', border: '1px solid rgba(96,165,250,0.20)' }}>
                    <Hash size={9} className="inline mr-0.5" />{registro.glpi}
                  </span>
                )}
              </div>
              <h3 className="text-base font-bold mt-1.5" style={{ color: 'var(--text-primary)' }}>
                {colaboradorLabel}
              </h3>
            </div>
          </div>
          <button type="button" onClick={onFechar} aria-label="Fechar" className="p-2 rounded-xl transition-colors shrink-0"
            style={{ color: 'var(--text-muted)' }}
            onMouseEnter={(e) => { const el = e.currentTarget as HTMLElement; el.style.background = 'rgba(255,255,255,0.06)'; el.style.color = 'var(--text-primary)' }}
            onMouseLeave={(e) => { const el = e.currentTarget as HTMLElement; el.style.background = 'transparent'; el.style.color = 'var(--text-muted)' }}
          >
            <X size={16} />
          </button>
        </div>

        {/* Corpo */}
        <div className="overflow-y-auto flex-1 px-6 py-5 space-y-5">

          {/* Metadados */}
          <div className="flex items-center gap-4 flex-wrap text-xs" style={{ color: 'var(--text-muted)' }}>
            <div className="flex items-center gap-1.5">
              <Calendar size={12} />
              <span style={{ color: 'var(--text-secondary)' }}>{formatarDataCompleta(registro.data)}</span>
            </div>
            {registro.tempoMin > 0 && (
              <div className="flex items-center gap-1.5">
                <Clock size={12} />
                <span className="font-bold tabular-nums" style={{ color: tc.color }}>{tempoFmt}</span>
              </div>
            )}
          </div>

          {/* Observações */}
          <div
            className="rounded-xl border px-4 py-3"
            style={{ background: 'rgba(255,255,255,0.02)', borderColor: 'rgba(255,255,255,0.06)' }}
          >
            <p className="text-[10px] font-bold uppercase mb-2" style={{ color: 'var(--text-muted)', letterSpacing: '0.08em' }}>
              Observações
            </p>
            <p className="text-sm leading-relaxed" style={{ color: 'var(--text-primary)' }}>
              {registro.observacoes || '—'}
            </p>
          </div>

          {/* Seção de impacto */}
          {(registro.tipo === 'Pausa justificada' || registro.tipo === 'Fora da jornada') && registro.tempoMin > 0 && (
            <div
              className="rounded-xl border px-4 py-3"
              style={{ background: 'rgba(201,168,76,0.04)', borderColor: 'rgba(201,168,76,0.18)' }}
            >
              <p className="text-[10px] font-bold uppercase mb-2" style={{ color: 'var(--gold)', letterSpacing: '0.08em' }}>
                Impacto estimado
              </p>
              {registro.tipo === 'Pausa justificada' ? (
                <p className="text-xs leading-relaxed" style={{ color: 'var(--text-secondary)' }}>
                  Este registro subtrai <strong style={{ color: 'var(--gold-light)' }}>{tempoFmt}</strong> do tempo de indisponibilidade total
                  {registro.colaborador ? ` de ${registro.colaborador}` : ' do setor'} ao calcular a estimativa contestada.
                </p>
              ) : (
                <p className="text-xs leading-relaxed" style={{ color: 'var(--text-secondary)' }}>
                  Este registro indica que <strong style={{ color: '#93c5fd' }}>{tempoFmt}</strong> de jornada fora do horário
                  {registro.colaborador ? ` de ${registro.colaborador}` : ''} pode ser revertida na análise de ABS.
                </p>
              )}
            </div>
          )}

          {/* Histórico do operador no mês */}
          {historico.length > 0 && (
            <div>
              <p className="text-[10px] font-bold uppercase mb-3" style={{ color: 'var(--text-muted)', letterSpacing: '0.08em' }}>
                Outros registros do mês
              </p>
              <div className="space-y-1.5">
                {historico.slice(0, 5).map((r, i) => {
                  const htc = TIPO_CORES[r.tipo]
                  return (
                    <div
                      key={i}
                      className="flex items-center gap-3 rounded-xl px-3 py-2"
                      style={{ background: 'rgba(255,255,255,0.02)', border: '1px solid rgba(255,255,255,0.04)' }}
                    >
                      <span className="text-[10px] tabular-nums shrink-0" style={{ color: 'var(--text-muted)', minWidth: '36px' }}>
                        {formatarDataCurta(r.data)}
                      </span>
                      <span
                        className="text-[9px] font-bold uppercase px-1.5 py-0.5 rounded-full shrink-0"
                        style={{ background: htc.bg, color: htc.color, border: `1px solid ${htc.border}` }}
                      >
                        {r.tipo.split(' ')[0]}
                      </span>
                      <span className="text-xs truncate flex-1" style={{ color: 'var(--text-muted)' }}>
                        {r.observacoes.slice(0, 60)}{r.observacoes.length > 60 ? '…' : ''}
                      </span>
                      {r.tempoMin > 0 && (
                        <span className="text-[10px] font-bold tabular-nums shrink-0" style={{ color: htc.color }}>
                          {formatTempo(r.tempoMin)}
                        </span>
                      )}
                    </div>
                  )
                })}
                {historico.length > 5 && (
                  <p className="text-[10px] text-center pt-1" style={{ color: 'var(--text-muted)' }}>
                    + {historico.length - 5} registros adicionais
                  </p>
                )}
              </div>
            </div>
          )}
        </div>

        {/* Footer */}
        <div
          className="px-6 py-4 flex justify-end shrink-0"
          style={{ borderTop: '1px solid rgba(255,255,255,0.06)' }}
        >
          <button type="button" onClick={onFechar} className="btn-secondary text-sm">
            Fechar
          </button>
        </div>
      </div>
    </div>
  )
}
