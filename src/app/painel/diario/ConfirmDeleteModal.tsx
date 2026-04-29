'use client'

import { useTransition } from 'react'
import { X, Trash2, AlertTriangle } from 'lucide-react'
import { HaloSpinner } from '@/components/HaloSpinner'
import type { DiarioRegistro, TipoRegistro } from '@/lib/diario-utils'
import { formatarDataCompleta } from '@/lib/diario-utils'
import { deletarRegistroDiarioAction } from './actions'

const TIPO_CORES: Record<TipoRegistro, { bg: string; color: string; border: string }> = {
  'Pausa justificada': { bg: 'rgba(245,158,11,0.10)',  color: '#f59e0b', border: 'rgba(245,158,11,0.25)' },
  'Fora da jornada':   { bg: 'rgba(96,165,250,0.10)',  color: '#60a5fa', border: 'rgba(96,165,250,0.25)' },
  'Geral':             { bg: 'rgba(167,139,250,0.10)', color: '#a78bfa', border: 'rgba(167,139,250,0.25)' },
  'Outros':            { bg: 'rgba(148,163,184,0.10)', color: '#94a3b8', border: 'rgba(148,163,184,0.20)' },
}

interface Props {
  registro: DiarioRegistro | null
  onFechar: () => void
  onApagado: () => void
  onErro: (msg: string) => void
}

export default function ConfirmDeleteModal({ registro, onFechar, onApagado, onErro }: Props) {
  const [pending, startDelete] = useTransition()

  if (!registro) return null

  const tc = TIPO_CORES[registro.tipo]

  function handleDelete() {
    startDelete(async () => {
      const res = await deletarRegistroDiarioAction(registro!.sheetRowIndex)
      if (res.ok) {
        onApagado()
      } else {
        onErro(res.erro ?? 'Erro ao apagar registro.')
        onFechar()
      }
    })
  }

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center p-4"
      style={{ background: 'rgba(0,0,0,0.80)', backdropFilter: 'blur(10px) saturate(160%)' }}
      onClick={(e) => { if (e.target === e.currentTarget && !pending) onFechar() }}
    >
      <div
        role="dialog"
        aria-modal="true"
        aria-labelledby="confirm-delete-title"
        className="animate-fadeInScale w-full max-w-md rounded-2xl overflow-hidden flex flex-col glass-premium"
        style={{ border: '1px solid rgba(201,168,76,0.25)' }}
      >
        {/* Header */}
        <div
          className="flex items-center justify-between px-6 py-4 shrink-0"
          style={{ borderBottom: '1px solid var(--border)' }}
        >
          <div className="flex items-center gap-3">
            <div className="p-2 rounded-xl" style={{ background: 'rgba(239,68,68,0.10)', color: '#f87171' }}>
              <Trash2 size={15} />
            </div>
            <div>
              <h3 id="confirm-delete-title" className="text-sm font-bold" style={{ color: 'var(--text-primary)' }}>Apagar Registro</h3>
              <p className="text-[10px] mt-0.5" style={{ color: 'var(--text-muted)' }}>Esta ação não pode ser desfeita</p>
            </div>
          </div>
          {!pending && (
            <button type="button" onClick={onFechar} className="p-1.5 rounded-lg transition-colors"
              style={{ color: 'var(--text-muted)' }}
              onMouseEnter={(e) => { const el = e.currentTarget as HTMLElement; el.style.background = 'rgba(255,255,255,0.06)'; el.style.color = 'var(--text-primary)' }}
              onMouseLeave={(e) => { const el = e.currentTarget as HTMLElement; el.style.background = 'transparent'; el.style.color = 'var(--text-muted)' }}
            >
              <X size={15} />
            </button>
          )}
        </div>

        {/* Corpo */}
        <div className="px-6 py-5 space-y-4">
          {/* Preview do registro */}
          <div
            className="rounded-xl border px-4 py-3"
            style={{ background: 'rgba(255,255,255,0.02)', borderColor: tc.border }}
          >
            <div className="flex items-center gap-2 mb-2 flex-wrap">
              <span
                className="text-[9px] font-bold uppercase px-1.5 py-0.5 rounded-full"
                style={{ background: tc.bg, color: tc.color, border: `1px solid ${tc.border}` }}
              >
                {registro.tipo}
              </span>
              <span className="text-xs font-medium" style={{ color: 'var(--text-secondary)' }}>
                {registro.colaborador || 'Geral — Setor inteiro'}
              </span>
              <span className="text-[10px] tabular-nums ml-auto" style={{ color: 'var(--text-muted)' }}>
                {formatarDataCompleta(registro.data)}
              </span>
            </div>
            <p className="text-xs leading-relaxed" style={{ color: 'var(--text-muted)' }}>
              {registro.observacoes.slice(0, 120)}{registro.observacoes.length > 120 ? '…' : ''}
            </p>
          </div>

          {/* Aviso */}
          <div
            className="flex items-start gap-2.5 rounded-xl px-4 py-3"
            style={{ background: 'rgba(239,68,68,0.06)', border: '1px solid rgba(239,68,68,0.18)' }}
          >
            <AlertTriangle size={14} className="shrink-0 mt-0.5" style={{ color: '#f87171' }} />
            <p className="text-xs leading-relaxed" style={{ color: 'var(--text-secondary)' }}>
              O registro será removido permanentemente da planilha Google Sheets.
              Esta ação <strong style={{ color: '#f87171' }}>não pode ser desfeita</strong>.
            </p>
          </div>
        </div>

        {/* Footer */}
        <div
          className="px-6 py-4 flex items-center justify-end gap-3 shrink-0"
          style={{ borderTop: '1px solid var(--border)' }}
        >
          <button
            type="button"
            onClick={onFechar}
            disabled={pending}
            className="btn-ghost text-sm"
            style={{ opacity: pending ? 0.5 : 1 }}
          >
            Cancelar
          </button>
          <button
            type="button"
            onClick={handleDelete}
            disabled={pending}
            className="btn-danger flex items-center gap-2"
            style={{ minWidth: '110px' }}
          >
            {pending ? (
              <HaloSpinner size="sm" />
            ) : (
              <Trash2 size={14} />
            )}
            {pending ? 'Apagando…' : 'Sim, apagar'}
          </button>
        </div>
      </div>
    </div>
  )
}
