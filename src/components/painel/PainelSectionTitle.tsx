import type { ReactNode } from 'react'

const FF_SYNE = "'Syne', sans-serif"

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

export function PainelSectionTitle({ children }: { children: ReactNode }) {
  return (
    <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
      <FlorDourada />
      <span style={{
        fontFamily: FF_SYNE,
        fontSize: '12px', fontWeight: 600,
        letterSpacing: '0.14em',
        color: '#f4d47c',
        whiteSpace: 'nowrap',
      }}>
        {children}
      </span>
      <div style={{ flex: 1, height: '1px', background: 'linear-gradient(90deg, rgba(244,212,124,0.2) 0%, transparent 100%)' }} />
    </div>
  )
}
