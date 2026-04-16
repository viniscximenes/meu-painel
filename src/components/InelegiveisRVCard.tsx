'use client'

import { useState } from 'react'
import { AlertTriangle, X, ShieldOff, Info } from 'lucide-react'
import { getAvatarStyle, getIniciaisNome } from '@/lib/operadores'

export type OpInelegivel = {
  id: number
  nome: string
  username: string
  motivos: string[]
}

interface Props {
  valor: number
  operadores?: OpInelegivel[]
}

export default function InelegiveisRVCard({ valor, operadores = [] }: Props) {
  const [aberto, setAberto] = useState(false)

  return (
    <>
      {/* ── Card clicável ─────────────────────────────────────────────────────── */}
      <button
        type="button"
        onClick={() => setAberto(true)}
        className="card flex flex-col gap-3 relative overflow-hidden text-left w-full"
        aria-label={`${valor} operadores inelegíveis ao RV — clique para ver detalhes`}
        style={{ cursor: 'pointer' }}
        onMouseEnter={(e) => {
          const el = e.currentTarget as HTMLElement
          el.style.borderColor = 'rgba(251,146,60,0.40)'
          el.style.boxShadow   = '0 8px 32px rgba(0,0,0,0.5), 0 0 0 1px rgba(251,146,60,0.08)'
        }}
        onMouseLeave={(e) => {
          const el = e.currentTarget as HTMLElement
          el.style.borderColor = 'rgba(255,255,255,0.06)'
          el.style.boxShadow   = 'var(--shadow-dark)'
        }}
      >
        {/* Accent top */}
        <div
          className="absolute top-0 left-0 right-0 h-[2px]"
          style={{ background: 'linear-gradient(90deg, rgba(251,146,60,0.7) 0%, rgba(251,146,60,0.0) 100%)' }}
        />

        <div className="flex items-start justify-between">
          <p className="text-xs font-semibold uppercase" style={{ color: 'var(--text-muted)', letterSpacing: '0.08em' }}>
            Inelegíveis ao RV
          </p>
          <div
            className="p-2.5 rounded-xl shrink-0"
            style={{
              background: 'rgba(251,146,60,0.12)',
              color: '#fb923c',
              boxShadow: '0 4px 16px rgba(251,146,60,0.18)',
            }}
          >
            <AlertTriangle size={16} />
          </div>
        </div>

        <div>
          <p className="text-3xl font-extrabold tracking-tight tabular-nums leading-none" style={{ color: '#fb923c' }}>
            {valor}
          </p>
          <p className="text-xs mt-1.5" style={{ color: 'var(--text-muted)' }}>
            Clique para ver detalhes
          </p>
        </div>
      </button>

      {/* ── Modal ─────────────────────────────────────────────────────────────── */}
      {aberto && (
        <div
          className="fixed inset-0 z-50 flex items-center justify-center p-4"
          style={{ background: 'rgba(0,0,0,0.72)', backdropFilter: 'blur(10px) saturate(150%)' }}
          onClick={(e) => { if (e.target === e.currentTarget) setAberto(false) }}
        >
          <div
            className="animate-fadeInScale w-full max-w-lg rounded-2xl border overflow-hidden"
            style={{
              background: 'linear-gradient(180deg, rgba(17,24,39,0.98) 0%, rgba(8,12,20,0.98) 100%)',
              borderColor: 'rgba(251,146,60,0.20)',
              boxShadow: '0 32px 96px rgba(0,0,0,0.85), 0 0 0 1px rgba(251,146,60,0.06)',
              maxHeight: '80vh',
              display: 'flex',
              flexDirection: 'column',
            }}
          >
            {/* Header do modal */}
            <div
              className="flex items-center justify-between px-6 py-4 shrink-0"
              style={{ borderBottom: '1px solid rgba(255,255,255,0.06)' }}
            >
              <div className="flex items-center gap-3">
                <div
                  className="p-2 rounded-xl"
                  style={{ background: 'rgba(251,146,60,0.12)', color: '#fb923c' }}
                >
                  <ShieldOff size={16} />
                </div>
                <div>
                  <h3 className="text-base font-bold" style={{ color: 'var(--text-primary)' }}>
                    Operadores Inelegíveis ao RV
                  </h3>
                  <p className="text-xs mt-0.5" style={{ color: 'var(--text-muted)' }}>
                    {valor === 0 ? 'Nenhum operador inelegível' : `${valor} operador${valor !== 1 ? 'es' : ''}`}
                  </p>
                </div>
              </div>

              <button
                type="button"
                onClick={() => setAberto(false)}
                className="p-2 rounded-xl transition-colors"
                aria-label="Fechar modal"
                style={{ color: 'var(--text-muted)' }}
                onMouseEnter={(e) => {
                  const el = e.currentTarget as HTMLButtonElement
                  el.style.background = 'rgba(255,255,255,0.06)'
                  el.style.color      = 'var(--text-primary)'
                }}
                onMouseLeave={(e) => {
                  const el = e.currentTarget as HTMLButtonElement
                  el.style.background = 'transparent'
                  el.style.color      = 'var(--text-muted)'
                }}
              >
                <X size={16} />
              </button>
            </div>

            {/* Corpo do modal */}
            <div className="overflow-y-auto flex-1 px-6 py-5">
              {operadores.length === 0 ? (
                /* Placeholder — regras ainda não configuradas */
                <div
                  className="flex flex-col items-center gap-4 py-10 text-center rounded-2xl"
                  style={{ background: 'rgba(255,255,255,0.02)', border: '1px dashed rgba(255,255,255,0.08)' }}
                >
                  <div
                    className="p-4 rounded-2xl"
                    style={{ background: 'rgba(251,146,60,0.08)', border: '1px solid rgba(251,146,60,0.12)' }}
                  >
                    <Info size={20} style={{ color: '#fb923c' }} />
                  </div>
                  <div>
                    <p className="text-sm font-semibold" style={{ color: 'var(--text-secondary)' }}>
                      Regras de RV não configuradas ainda
                    </p>
                    <p className="text-xs mt-1.5 max-w-xs mx-auto leading-relaxed" style={{ color: 'var(--text-muted)' }}>
                      Configure os critérios de elegibilidade em{' '}
                      <span style={{ color: 'var(--gold-light)' }}>Configurar Regras de RV</span>{' '}
                      para que os inelegíveis sejam calculados automaticamente.
                    </p>
                  </div>
                </div>
              ) : (
                /* Lista de operadores inelegíveis */
                <div className="space-y-2">
                  {operadores.map((op) => (
                    <div
                      key={op.id}
                      className="flex items-start gap-3 rounded-xl px-4 py-3"
                      style={{
                        background: 'rgba(251,146,60,0.04)',
                        border: '1px solid rgba(251,146,60,0.12)',
                      }}
                    >
                      {/* Avatar */}
                      <div
                        className="w-8 h-8 rounded-lg flex items-center justify-center text-xs font-bold shrink-0 border-2"
                        style={getAvatarStyle(op.id)}
                      >
                        {getIniciaisNome(op.nome)}
                      </div>

                      {/* Info */}
                      <div className="flex-1 min-w-0">
                        <p className="text-sm font-semibold truncate" style={{ color: 'var(--text-primary)' }}>
                          {op.nome}
                        </p>
                        <p className="text-xs mb-1.5" style={{ color: '#4a90d9' }}>{op.username}</p>

                        {/* Tags de motivos */}
                        {op.motivos.length > 0 ? (
                          <div className="flex flex-wrap gap-1">
                            {op.motivos.map((m) => (
                              <span
                                key={m}
                                className="text-[10px] px-1.5 py-0.5 rounded font-medium"
                                style={{
                                  background: 'rgba(239,68,68,0.10)',
                                  color: '#f87171',
                                  border: '1px solid rgba(239,68,68,0.20)',
                                }}
                              >
                                {m}
                              </span>
                            ))}
                          </div>
                        ) : (
                          <span className="text-[10px]" style={{ color: 'var(--text-muted)' }}>
                            Motivos a definir
                          </span>
                        )}
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>
          </div>
        </div>
      )}
    </>
  )
}
