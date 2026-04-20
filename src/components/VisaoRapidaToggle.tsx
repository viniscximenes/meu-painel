'use client'

import { useState, useEffect } from 'react'

const LS_KEY = 'halo:meu-kpi:visao-rapida'

export default function VisaoRapidaToggle() {
  const [active, setActive] = useState(false)

  useEffect(() => {
    try { setActive(localStorage.getItem(LS_KEY) === '1') } catch {}
  }, [])

  function toggle() {
    // Usa `active` diretamente (não o padrão prev =>) para que o dispatchEvent
    // aconteça no handler de evento do usuário, fora da fase de render do React.
    const next = !active
    setActive(next)
    try {
      if (next) localStorage.setItem(LS_KEY, '1')
      else localStorage.removeItem(LS_KEY)
    } catch {}
    window.dispatchEvent(new CustomEvent('halo:visao-rapida-changed', { detail: { active: next } }))
  }

  return (
    <button
      type="button"
      onClick={toggle}
      title={active
        ? 'Voltar a exibir todos os KPIs e Dados do Mês'
        : 'Mostrar só os KPIs mais críticos e esconder dados secundários'}
      onMouseEnter={e => { (e.currentTarget as HTMLElement).style.background = 'rgba(201,168,76,0.08)' }}
      onMouseLeave={e => { (e.currentTarget as HTMLElement).style.background = 'transparent' }}
      style={{
        all: 'unset',
        boxSizing: 'border-box',
        display: 'inline-flex',
        alignItems: 'center',
        gap: '5px',
        padding: '4px 10px',
        borderRadius: '8px',
        border: `1px solid ${active ? 'rgba(201,168,76,0.25)' : 'rgba(255,255,255,0.08)'}`,
        cursor: 'pointer',
        fontSize: '11px',
        fontWeight: 500,
        color: active ? '#e8c96d' : 'rgba(255,255,255,0.45)',
        userSelect: 'none',
        whiteSpace: 'nowrap',
        transition: 'color 0.15s, border-color 0.15s',
      }}
    >
      {active ? '◱' : '◲'}
      <span>{active ? 'Visão Completa' : 'Visão Rápida'}</span>
    </button>
  )
}
