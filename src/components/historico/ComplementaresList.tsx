'use client'

import { useState } from 'react'
import { ChevronDown } from 'lucide-react'
import {
  calcularStatusComplementar,
  getLimiteComplementar,
} from '@/lib/historico-status'

interface ItemBase { label: string; valor: string }

export interface ComplementaresListProps<T extends ItemBase = ItemBase> {
  itens: T[]
  renderLinhaExtra?: (item: T) => React.ReactNode
}

export default function ComplementaresList<T extends ItemBase>({
  itens, renderLinhaExtra,
}: ComplementaresListProps<T>) {
  const [open, setOpen] = useState(false)
  if (!itens.length) return null

  return (
    <div style={{
      background: 'rgba(20, 24, 32, 0.6)',
      backdropFilter: 'blur(12px)',
      WebkitBackdropFilter: 'blur(12px)',
      border: '1px solid rgba(255, 255, 255, 0.06)',
      borderRadius: '10px',
      overflow: 'hidden',
    }}>
      <button
        type="button"
        onClick={() => setOpen(v => !v)}
        style={{
          width: '100%', display: 'flex', alignItems: 'center', gap: '8px',
          padding: '14px 18px',
          background: 'rgba(255,255,255,0.02)',
          border: 'none', cursor: 'pointer', textAlign: 'left',
          fontFamily: 'var(--ff-body)',
        }}
      >
        <span style={{
          fontFamily: 'var(--ff-display)',
          fontSize: '10px', fontWeight: 700, letterSpacing: '0.15em',
          textTransform: 'uppercase', color: 'rgba(255,255,255,0.45)', flex: 1,
        }}>
          Dados Complementares
        </span>
        <span style={{
          fontFamily: 'var(--ff-body)',
          fontSize: '10px', color: 'rgba(255,255,255,0.30)', marginRight: '4px',
        }}>
          {itens.length} {itens.length === 1 ? 'métrica' : 'métricas'}
        </span>
        <ChevronDown size={13} style={{
          color: 'rgba(255,255,255,0.40)', flexShrink: 0,
          transition: 'transform 0.25s cubic-bezier(0.4,0,0.2,1)',
          transform: open ? 'rotate(0deg)' : 'rotate(-90deg)',
        }} />
      </button>
      <div style={{
        maxHeight: open ? '600px' : '0px', overflow: 'hidden',
        transition: 'max-height 0.25s cubic-bezier(0.4,0,0.2,1)',
      }}>
        <div style={{ padding: '4px 18px 14px' }}>
          {itens.map((c, i) => {
            const sc          = calcularStatusComplementar(c.label, c.valor)
            const limite      = getLimiteComplementar(c.label)
            const statusLabel = sc === 'neutro' ? '' : sc === 'bom' ? 'BOM' : 'CRÍTICO'
            const corValor    = sc === 'neutro'
              ? 'rgba(255,255,255,0.92)'
              : sc === 'bom' ? '#4ade80' : '#f87171'
            const badgeBg     = sc === 'bom' ? 'rgba(74,222,128,0.12)' : 'rgba(248,113,113,0.12)'
            const badgeBorder = sc === 'bom' ? 'rgba(74,222,128,0.35)' : 'rgba(248,113,113,0.40)'

            const extra = renderLinhaExtra?.(c)

            return (
              <div key={c.label} style={{
                display: 'flex', flexDirection: 'column', gap: '4px',
                padding: '11px 0',
                borderBottom: i === itens.length - 1 ? 'none' : '1px solid rgba(255,255,255,0.05)',
              }}>
                <div style={{
                  display: 'flex', alignItems: 'center', gap: '12px',
                }}>
                  <span style={{
                    fontFamily: 'var(--ff-body)',
                    fontSize: '13px', color: 'rgba(255,255,255,0.72)', flex: 1,
                  }}>
                    {c.label}
                  </span>
                  {limite && (
                    <span style={{
                      fontFamily: 'var(--ff-body)',
                      fontSize: '10px', color: 'rgba(255,255,255,0.32)',
                      letterSpacing: '0.04em',
                    }}>
                      {limite}
                    </span>
                  )}
                  {statusLabel && (
                    <span style={{
                      fontFamily: 'var(--ff-body)',
                      fontSize: '9.5px', fontWeight: 600,
                      padding: '2px 7px', borderRadius: '4px',
                      textTransform: 'uppercase', letterSpacing: '0.08em',
                      color: corValor, background: badgeBg,
                      border: `1px solid ${badgeBorder}`, whiteSpace: 'nowrap',
                    }}>
                      {statusLabel}
                    </span>
                  )}
                  <span style={{
                    fontFamily: 'var(--ff-body)',
                    fontSize: '14px', fontWeight: 600,
                    fontVariantNumeric: 'tabular-nums',
                    color: corValor, minWidth: '58px', textAlign: 'right',
                  }}>
                    {c.valor}
                  </span>
                </div>
                {extra && (
                  <div style={{ display: 'flex', justifyContent: 'flex-end' }}>
                    {extra}
                  </div>
                )}
              </div>
            )
          })}
        </div>
      </div>
    </div>
  )
}
