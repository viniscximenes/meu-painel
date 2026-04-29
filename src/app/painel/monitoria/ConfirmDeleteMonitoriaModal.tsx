'use client'

import { useTransition } from 'react'
import { X, Trash2, AlertTriangle } from 'lucide-react'
import { HaloSpinner } from '@/components/HaloSpinner'
import type { Monitoria } from '@/lib/monitoria-utils'
import { deletarMonitoriaAction } from './actions'

const FF_SYNE = "'Syne', sans-serif"
const FF_DM   = "'DM Sans', sans-serif"

interface Props {
  monitoria: Monitoria | null
  onFechar:  () => void
  onApagado: () => void
  onErro:    (msg: string) => void
}

export default function ConfirmDeleteMonitoriaModal({ monitoria, onFechar, onApagado, onErro }: Props) {
  const [pending, startDelete] = useTransition()

  if (!monitoria) return null

  function handleDelete() {
    startDelete(async () => {
      const res = await deletarMonitoriaAction(monitoria!.sheetRowIndex)
      if (res.ok) {
        onApagado()
      } else {
        onErro(res.erro ?? 'Erro ao apagar monitoria.')
        onFechar()
      }
    })
  }

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center p-4"
      style={{ background: 'rgba(0,0,0,0.80)', backdropFilter: 'blur(4px)' }}
      onClick={(e) => { if (e.target === e.currentTarget && !pending) onFechar() }}
    >
      <div
        role="dialog"
        aria-modal="true"
        aria-labelledby="confirm-delete-monitoria-title"
        className="animate-fadeInScale w-full"
        style={{
          maxWidth: '440px',
          borderRadius: '20px',
          overflow: 'hidden',
          background: '#070714',
          border: '1px solid rgba(244,212,124,0.20)',
          boxShadow: '0 24px 64px rgba(0,0,0,0.70)',
        }}
      >
        {/* Header */}
        <div style={{
          display: 'flex', alignItems: 'center', justifyContent: 'space-between',
          padding: '20px 24px',
          borderBottom: '1px solid #211F3C',
        }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
            <div style={{ padding: '8px', borderRadius: '8px', background: 'rgba(227,57,57,0.10)', lineHeight: 0 }}>
              <Trash2 size={16} style={{ color: 'rgba(227,57,57,0.95)' }} />
            </div>
            <div>
              <h3
                id="confirm-delete-monitoria-title"
                style={{
                  fontFamily: FF_SYNE, fontSize: '14px', fontWeight: 600,
                  color: '#A6A2A2', margin: 0, lineHeight: 1,
                }}
              >
                Apagar Monitoria
              </h3>
              <p style={{
                fontFamily: FF_SYNE, fontSize: '11px', fontWeight: 600,
                textTransform: 'uppercase', letterSpacing: '0.06em',
                color: '#72708F', margin: '4px 0 0',
              }}>
                Esta ação não pode ser desfeita
              </p>
            </div>
          </div>
          {!pending && (
            <button
              type="button"
              onClick={onFechar}
              aria-label="Fechar"
              style={{
                color: '#72708F', background: 'none', border: 'none',
                cursor: 'pointer', padding: '4px', lineHeight: 0,
                transition: 'color 150ms ease',
              }}
              onMouseEnter={e => { (e.currentTarget as HTMLElement).style.color = '#A6A2A2' }}
              onMouseLeave={e => { (e.currentTarget as HTMLElement).style.color = '#72708F' }}
            >
              <X size={16} />
            </button>
          )}
        </div>

        {/* Body */}
        <div style={{ padding: '20px 24px', display: 'flex', flexDirection: 'column', gap: '14px' }}>
          <div style={{
            background: '#03040C',
            border: '1px solid rgba(227,57,57,0.25)',
            borderRadius: '10px',
            padding: '12px 16px',
          }}>
            <p style={{
              fontFamily: FF_SYNE, fontSize: '12px', fontWeight: 600,
              textTransform: 'uppercase', letterSpacing: '0.04em',
              color: '#A6A2A2', margin: 0,
            }}>
              {monitoria.colaborador || '—'}
            </p>
            <p style={{
              fontFamily: FF_DM, fontSize: '11px', fontWeight: 500,
              fontVariantNumeric: 'tabular-nums',
              color: '#72708F', margin: '4px 0 0',
            }}>
              {monitoria.dataAtendimento || '—'} · {monitoria.idChamada || '—'}
            </p>
          </div>

          <div style={{
            display: 'flex', alignItems: 'flex-start', gap: '10px',
            padding: '12px 16px',
            background: 'rgba(227,57,57,0.06)',
            border: '1px solid rgba(227,57,57,0.20)',
            borderRadius: '10px',
          }}>
            <AlertTriangle size={14} style={{ color: 'rgba(227,57,57,0.95)', flexShrink: 0, marginTop: '1px' }} />
            <p style={{ fontFamily: FF_DM, fontSize: '12px', color: '#A6A2A2', margin: 0, lineHeight: 1.5 }}>
              O registro será removido permanentemente da planilha.{' '}
              <strong style={{ color: 'rgba(227,57,57,0.95)' }}>Não pode ser desfeito.</strong>
            </p>
          </div>
        </div>

        {/* Footer */}
        <div style={{
          padding: '16px 24px',
          borderTop: '1px solid #211F3C',
          display: 'flex', alignItems: 'center', justifyContent: 'flex-end', gap: '12px',
        }}>
          <button
            type="button"
            onClick={onFechar}
            disabled={pending}
            style={{
              fontFamily: FF_SYNE, fontWeight: 600, fontSize: '12px',
              textTransform: 'uppercase', letterSpacing: '0.05em',
              color: '#72708F', cursor: pending ? 'not-allowed' : 'pointer',
              background: 'none', border: 'none', padding: '6px 0',
              opacity: pending ? 0.5 : 1,
              transition: 'color 150ms ease',
            }}
            onMouseEnter={e => { if (!pending) (e.currentTarget as HTMLElement).style.color = '#A6A2A2' }}
            onMouseLeave={e => { (e.currentTarget as HTMLElement).style.color = '#72708F' }}
          >
            Cancelar
          </button>
          <button
            type="button"
            onClick={handleDelete}
            disabled={pending}
            style={{
              display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '8px',
              fontFamily: FF_SYNE, fontWeight: 600, fontSize: '12px',
              textTransform: 'uppercase', letterSpacing: '0.05em',
              color: pending ? '#72708F' : 'rgba(227,57,57,0.95)',
              background: 'rgba(227,57,57,0.10)',
              border: '1px solid rgba(227,57,57,0.40)',
              borderRadius: '10px',
              padding: '10px 20px',
              cursor: pending ? 'not-allowed' : 'pointer',
              minWidth: '120px',
              transition: 'border-color 150ms ease, background 150ms ease',
            }}
            onMouseEnter={e => {
              if (!pending) {
                const el = e.currentTarget as HTMLElement
                el.style.background = 'rgba(227,57,57,0.18)'
                el.style.borderColor = 'rgba(227,57,57,0.60)'
              }
            }}
            onMouseLeave={e => {
              const el = e.currentTarget as HTMLElement
              el.style.background = 'rgba(227,57,57,0.10)'
              el.style.borderColor = 'rgba(227,57,57,0.40)'
            }}
          >
            {pending ? <HaloSpinner size="sm" /> : <Trash2 size={14} />}
            {pending ? 'Apagando…' : 'Sim, apagar'}
          </button>
        </div>
      </div>
    </div>
  )
}
