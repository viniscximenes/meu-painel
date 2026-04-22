'use client'

import { X, BookOpen, Hash, Clock, Calendar, User, Pencil } from 'lucide-react'
import type { DiarioRegistro, TipoRegistro } from '@/lib/diario-utils'
import { formatTempo, formatarDataCompleta } from '@/lib/diario-utils'

const TIPO_CORES: Record<TipoRegistro, { bg: string; color: string; border: string; label: string }> = {
  'Pausa justificada': { bg: 'rgba(245,158,11,0.10)',  color: '#f59e0b', border: 'rgba(245,158,11,0.25)', label: 'Pausa justificada' },
  'Fora da jornada':   { bg: 'rgba(96,165,250,0.10)',  color: '#60a5fa', border: 'rgba(96,165,250,0.25)', label: 'Fora da jornada' },
  'Geral':             { bg: 'rgba(167,139,250,0.10)', color: '#a78bfa', border: 'rgba(167,139,250,0.25)', label: 'Geral' },
  'Outros':            { bg: 'rgba(148,163,184,0.10)', color: '#94a3b8', border: 'rgba(148,163,184,0.20)', label: 'Outros' },
}

interface Props {
  registro: DiarioRegistro | null
  role: string
  onFechar: () => void
  onEditar: (r: DiarioRegistro) => void
}

export default function RegistroModal({ registro, role, onFechar, onEditar }: Props) {
  if (!registro) return null

  const tc = TIPO_CORES[registro.tipo]
  const tempoFmt = registro.tempoMin > 0 ? formatTempo(registro.tempoMin) : registro.tempo || '—'
  const colaboradorLabel = registro.colaborador || 'Geral — Setor inteiro'
  const canEdit = role === 'admin' || role === 'gestor'

  const deficitFmt = registro.tipo === 'Fora da jornada' && registro.tempoMin > 0
    ? (() => {
        const h = Math.floor(registro.tempoMin / 60)
        const m = registro.tempoMin % 60
        return `Déficit: ${h}:${String(m).padStart(2,'0')}`
      })()
    : null

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center p-4"
      style={{ background: 'rgba(0,0,0,0.75)', backdropFilter: 'blur(10px) saturate(160%)' }}
      onClick={(e) => { if (e.target === e.currentTarget) onFechar() }}
    >
      <div
        className="animate-fadeInScale w-full max-w-lg rounded-2xl overflow-hidden flex flex-col glass-premium"
        style={{ border: '1px solid rgba(201,168,76,0.25)', maxHeight: '88vh' }}
      >
        {/* Header */}
        <div
          className="flex items-start justify-between px-6 py-4 shrink-0"
          style={{ borderBottom: '1px solid var(--border)' }}
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
                <span className="font-bold tabular-nums" style={{ color: deficitFmt ? '#f87171' : tc.color }}>
                  {deficitFmt ?? tempoFmt}
                </span>
              </div>
            )}
            <div className="flex items-center gap-1.5">
              <User size={12} />
              <span style={{ color: 'rgba(255,255,255,0.45)' }}>
                {registro.criadoPor || '—'}
              </span>
            </div>
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

        </div>

        {/* Footer */}
        <div
          className="px-6 py-4 flex items-center justify-between shrink-0"
          style={{ borderTop: '1px solid var(--border)' }}
        >
          <button type="button" onClick={onFechar} className="btn-ghost text-sm">
            Fechar
          </button>
          {canEdit && (
            <button
              type="button"
              onClick={() => { onEditar(registro); onFechar() }}
              className="btn-secondary flex items-center gap-2 text-sm"
            >
              <Pencil size={13} />
              Editar
            </button>
          )}
        </div>
      </div>
    </div>
  )
}
