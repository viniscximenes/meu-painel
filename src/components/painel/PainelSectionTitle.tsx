import type { ReactNode } from 'react'

const FF_SYNE = "'Syne', sans-serif"
const FF_DM   = "'DM Sans', sans-serif"

function FlorDourada({ size = 10, color = '#c9a24a' }: { size?: number; color?: string }) {
  return (
    <svg width={size} height={size} viewBox="0 0 10 10" fill="none" aria-hidden="true" style={{ flexShrink: 0 }}>
      <rect x="0"   y="3.5" width="3" height="3" fill={color} transform="rotate(45 1.5 5)"  />
      <rect x="3.5" y="0"   width="3" height="3" fill={color} transform="rotate(45 5 1.5)"  />
      <rect x="7"   y="3.5" width="3" height="3" fill={color} transform="rotate(45 8.5 5)"  />
      <rect x="3.5" y="7"   width="3" height="3" fill={color} transform="rotate(45 5 8.5)"  />
    </svg>
  )
}

interface PainelSectionTitleProps {
  children: ReactNode
  contador?: number
}

export function PainelSectionTitle({ children, contador }: PainelSectionTitleProps) {
  return (
    <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
      <FlorDourada />
      <div style={{ display: 'flex', alignItems: 'baseline', gap: '6px', flexShrink: 0 }}>
        <span style={{
          fontFamily: FF_SYNE,
          fontSize: '12px', fontWeight: 600,
          letterSpacing: '0.14em',
          color: '#f4d47c',
          whiteSpace: 'nowrap',
        }}>
          {children}
        </span>
        {contador !== undefined && (
          <span style={{
            fontFamily: FF_DM,
            fontSize: '12px', fontWeight: 500,
            color: '#A6A2A2',
            fontVariantNumeric: 'tabular-nums',
            whiteSpace: 'nowrap',
          }}>
            ({contador})
          </span>
        )}
      </div>
      <div style={{ flex: 1, height: '1px', background: 'linear-gradient(90deg, rgba(244,212,124,0.2) 0%, transparent 100%)' }} />
    </div>
  )
}
