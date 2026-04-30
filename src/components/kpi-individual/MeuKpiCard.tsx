'use client'

import type { ReactNode } from 'react'

export type Status = 'verde' | 'amarelo' | 'vermelho' | 'neutro'

export interface KpiCardData {
  label:  string
  icon:   ReactNode
  valor:  string | null
  status: Status
  meta:   string | null
}

const FF_SYNE = "'Syne', sans-serif"
const FF_DM   = "'DM Sans', sans-serif"

const BADGE_CFG: Record<Status, { label: string; textColor: string; bg: string; border: string }> = {
  verde:    { label: 'DENTRO',       textColor: '#22c55e',  bg: 'rgba(74,222,128,0.13)',  border: 'rgba(34,197,94,0.72)' },
  amarelo:  { label: 'ATENÇÃO',      textColor: '#fbba2d',  bg: 'rgba(255,193,60,0.30)',  border: 'rgba(255,193,60,0.62)' },
  vermelho: { label: 'FORA DA META', textColor: '#e33939',  bg: 'rgba(242,96,96,0.13)',   border: 'rgba(227,57,57,0.72)' },
  neutro:   { label: 'SEM META',     textColor: '#72708f',  bg: 'rgba(114,112,143,0.13)', border: 'rgba(114,112,143,0.5)' },
}

const VALUE_COLOR: Record<Status, string> = {
  verde:    'rgba(74,222,128,0.72)',
  amarelo:  'rgba(255,193,60,0.72)',
  vermelho: 'rgba(227,57,57,0.72)',
  neutro:   '#72708f',
}


export function FlorDourada({ size = 10, color = '#c9a24a' }: { size?: number; color?: string }) {
  return (
    <svg width={size} height={size} viewBox="0 0 10 10" fill="none" aria-hidden="true" style={{ flexShrink: 0 }}>
      <rect x="0"   y="3.5" width="3" height="3" fill={color} transform="rotate(45 1.5 5)"  />
      <rect x="3.5" y="0"   width="3" height="3" fill={color} transform="rotate(45 5 1.5)"  />
      <rect x="7"   y="3.5" width="3" height="3" fill={color} transform="rotate(45 8.5 5)"  />
      <rect x="3.5" y="7"   width="3" height="3" fill={color} transform="rotate(45 5 8.5)"  />
    </svg>
  )
}

export function MeuKpiSectionTitle({ children }: { children: ReactNode }) {
  return (
    <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
      <FlorDourada />
      <span style={{
        fontFamily: FF_SYNE,
        fontSize: '12px', fontWeight: 600,
        letterSpacing: '0.14em',
        color: '#f4d47c', whiteSpace: 'nowrap',
      }}>
        {children}
      </span>
      <div style={{ flex: 1, height: '1px', background: 'linear-gradient(90deg, rgba(244,212,124,0.2) 0%, transparent 100%)' }} />
    </div>
  )
}

function MeuKpiBadge({ status }: { status: Status }) {
  const cfg = BADGE_CFG[status]
  return (
    <span style={{
      fontFamily: FF_SYNE,
      fontSize: '20px', fontWeight: 600, lineHeight: 1,
      textTransform: 'uppercase', letterSpacing: '1px',
      display: 'inline-flex', alignItems: 'center', justifyContent: 'center',
      width: '100%', maxWidth: '193px', height: '29px',
      borderRadius: '6px', border: `1px solid ${cfg.border}`,
      background: cfg.bg, color: cfg.textColor,
      flexShrink: 0,
    }}>
      {cfg.label}
    </span>
  )
}

export function MeuKpiCard({ card, delay }: { card: KpiCardData; delay: number }) {
  const hasValue = card.valor !== null
  const color    = hasValue ? VALUE_COLOR[card.status] : '#474658'
  const label    = card.label === 'Indisponibilidade' ? 'Indisp.' : card.label

  return (
    <div style={{
      background: '#070714',
      border: '1px solid rgba(244,212,124,0.15)',
      borderRadius: '10px',
      padding: '20px 24px',
      display: 'flex',
      alignItems: 'stretch',
      gap: '20px',
      animation: 'kpiCardIn 0.4s ease both',
      animationDelay: `${delay}ms`,
    }}>

      {/* Coluna esquerda: header no topo + valor na base */}
      <div style={{
        flex: '0 0 48%',
        display: 'flex',
        flexDirection: 'column',
        justifyContent: 'space-between',
        minHeight: '120px',
      }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
          <span style={{ color: color, display: 'flex', alignItems: 'center', flexShrink: 0 }}>
            {card.icon}
          </span>
          <span style={{
            fontFamily: FF_SYNE,
            fontSize: '20px', fontWeight: 600,
            textTransform: 'uppercase', letterSpacing: '0.06em',
            color: color,
            overflow: 'hidden', textOverflow: 'ellipsis',
          }}>
            {label}
          </span>
        </div>

        <div>
          <div style={{
            fontFamily: FF_DM,
            fontSize: '64px', fontWeight: 900, lineHeight: 1,
            color: color,
            fontVariantNumeric: 'tabular-nums',
            letterSpacing: '-0.02em',
          }}>
            {card.valor ?? '—'}
          </div>
          {!hasValue && (
            <span style={{ fontFamily: FF_SYNE, fontSize: '11px', fontWeight: 600, color: '#474658', marginTop: '4px', display: 'block' }}>
              Sem dados
            </span>
          )}
        </div>
      </div>

      {/* Divisória vertical */}
      <div style={{
        width: '1px',
        background: '#211F3C',
        flexShrink: 0,
        marginTop: '8px',
        marginBottom: '8px',
      }} />

      {/* Coluna direita: badge + meta */}
      <div style={{
        flex: '1 1 auto',
        display: 'flex',
        flexDirection: 'column',
        justifyContent: 'flex-start',
        alignItems: 'center',
        gap: '10px',
        paddingTop: '8px',
      }}>
        {hasValue ? (
          <>
            <MeuKpiBadge status={card.status} />
            {card.meta && (
              <div style={{
                display: 'inline-flex',
                alignItems: 'baseline',
                gap: '4px',
                color: '#72708f',
                lineHeight: 1.2,
              }}>
                <span style={{ fontFamily: FF_SYNE, fontSize: '20px', fontWeight: 600 }}>
                  META:
                </span>
                <span style={{
                  fontFamily: FF_DM,
                  fontSize: '20px', fontWeight: 500,
                  fontVariantNumeric: 'tabular-nums',
                }}>
                  {card.meta.replace('META: ', '')}
                </span>
              </div>
            )}
          </>
        ) : (
          <span style={{ fontFamily: FF_SYNE, fontSize: '11px', fontWeight: 600, color: '#474658' }}>
            Sem mapeamento
          </span>
        )}
      </div>

    </div>
  )
}
