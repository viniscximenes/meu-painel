'use client'

import { useState, useEffect } from 'react'
import { ChevronRight } from 'lucide-react'

const FF_SYNE = "'Syne', sans-serif"
const FF_DM   = "'DM Sans', sans-serif"

export interface ComplementarItem { label: string; valor: string }
export interface SubsecaoConfig   { key: string; titulo: string; items: ComplementarItem[] }

interface Props {
  subsecoes:       SubsecaoConfig[]
  lsKey:           string
  defaultExpanded?: Record<string, boolean>
}

export function DadosComplementares({ subsecoes, lsKey, defaultExpanded }: Props) {
  const initial = () => {
    const base = defaultExpanded ?? Object.fromEntries(subsecoes.map(s => [s.key, true]))
    return Object.fromEntries(subsecoes.map(s => [s.key, base[s.key] ?? true]))
  }

  const [expanded, setExpanded] = useState<Record<string, boolean>>(initial)

  useEffect(() => {
    try {
      const raw = localStorage.getItem(lsKey)
      if (raw) setExpanded(prev => ({ ...prev, ...(JSON.parse(raw) as Record<string, boolean>) }))
    } catch { /* ignore */ }
  }, [lsKey])

  function toggle(key: string) {
    setExpanded(prev => {
      const next = { ...prev, [key]: !prev[key] }
      try { localStorage.setItem(lsKey, JSON.stringify(next)) } catch { /* ignore */ }
      return next
    })
  }

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: '4px' }}>
      {subsecoes.map(sub => {
        const isOpen = expanded[sub.key] ?? true
        return (
          <div key={sub.key}>
            <button type="button" className="mkpi-sub-btn" onClick={() => toggle(sub.key)}>
              <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                <span style={{ fontFamily: FF_SYNE, fontSize: '11px', fontWeight: 600, textTransform: 'uppercase', letterSpacing: '0.10em', color: '#f4d47c' }}>
                  {sub.titulo}
                </span>
                <span style={{ color: 'rgba(114,112,143,0.4)', userSelect: 'none' }}>·</span>
                <span style={{ fontFamily: FF_SYNE, fontSize: '10px', fontWeight: 600, color: 'rgba(114,112,143,0.7)' }}>
                  {sub.items.length} indicadores
                </span>
              </div>
              <ChevronRight size={14} style={{
                color: '#72708f', flexShrink: 0,
                transform: isOpen ? 'rotate(90deg)' : 'rotate(0deg)',
                transition: 'transform 250ms cubic-bezier(0.4,0,0.2,1)',
              }} />
            </button>

            <div className={`mkpi-sub-content${isOpen ? ' open' : ''}`}>
              <div className="mkpi-sub-inner">
                <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(140px, 1fr))', gap: '8px', padding: '6px 0 10px' }}>
                  {sub.items.map(({ label, valor }) => {
                    const empty = !valor || valor === '—'
                    return (
                      <div key={label} title={empty ? 'Sem dados disponíveis ainda' : undefined} style={{
                        background: '#070714',
                        border: '1px solid rgba(244,212,124,0.15)',
                        borderRadius: '10px', padding: '10px 12px',
                        minHeight: '72px', display: 'flex', flexDirection: 'column', justifyContent: 'space-between',
                      }}>
                        <p style={{ fontFamily: FF_SYNE, fontSize: '10px', fontWeight: 600, textTransform: 'uppercase', letterSpacing: '0.06em', color: '#72708f', lineHeight: 1.3, margin: 0 }}>
                          {label}
                        </p>
                        <p style={{ fontFamily: FF_DM, fontSize: '13px', fontWeight: 600, fontVariantNumeric: 'tabular-nums', margin: '4px 0 0', color: empty ? 'rgba(114,112,143,0.3)' : '#72708f' }}>
                          {empty ? '—' : valor}
                        </p>
                      </div>
                    )
                  })}
                </div>
              </div>
            </div>
          </div>
        )
      })}
    </div>
  )
}
