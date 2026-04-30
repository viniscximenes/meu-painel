'use client'

import React from 'react'

const FF_SYNE = "'Syne', sans-serif"
const FF_DM   = "'DM Sans', sans-serif"

interface PainelHeaderProps {
  titulo: React.ReactNode
  mesLabel: string
  dataReferencia?: string | null
}

export function PainelHeader({ titulo, mesLabel, dataReferencia }: PainelHeaderProps) {
  return (
    <div style={{
      background: '#070714',
      border: '1px solid rgba(244,212,124,0.15)',
      borderRadius: '10px',
      padding: '16px 20px',
      display: 'flex', alignItems: 'center', gap: '20px', flexWrap: 'wrap',
      lineHeight: 1,
    }}>
      <span style={{
        fontFamily: FF_SYNE, fontSize: '20px', fontWeight: 600,
        textTransform: 'uppercase', letterSpacing: '1.5px',
        color: '#f4d47c',
      }}>
        {titulo}
      </span>

      {mesLabel && (
        <>
          <div style={{ width: '1px', height: '14px', background: 'rgba(244,212,124,0.3)', flexShrink: 0 }} />
          <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
            <div className="animate-pulse" style={{ width: '5px', height: '5px', borderRadius: '50%', background: '#4ade80', flexShrink: 0 }} />
            <span style={{
              fontFamily: FF_DM, fontSize: '13px', fontWeight: 500,
              textTransform: 'uppercase', letterSpacing: '1px',
              color: '#72708f', fontVariantNumeric: 'tabular-nums',
            }}>
              {mesLabel}
            </span>
          </div>
        </>
      )}

      {dataReferencia && (
        <>
          <div style={{ width: '1px', height: '14px', background: 'rgba(244,212,124,0.3)', flexShrink: 0 }} />
          <div style={{ display: 'inline-flex', alignItems: 'baseline', gap: '8px' }}>
            <span style={{
              fontFamily: FF_SYNE, fontSize: '13px', fontWeight: 600,
              textTransform: 'uppercase', letterSpacing: '1px',
              color: '#72708f',
            }}>
              Atualizado até
            </span>
            <span style={{
              fontFamily: FF_DM, fontSize: '13px', fontWeight: 500,
              color: '#72708f', fontVariantNumeric: 'tabular-nums',
            }}>
              {dataReferencia}
            </span>
          </div>
        </>
      )}
    </div>
  )
}

export function LinhaHorizontalDourada() {
  return (
    <div style={{
      height: '6px', borderRadius: '3px',
      background: 'linear-gradient(90deg, rgba(184,137,59,0.4) 0%, rgba(244,212,124,0.9) 50%, rgba(184,137,59,0.4) 100%)',
      boxShadow: '0 0 12px rgba(244,212,124,0.20)',
    }} />
  )
}
