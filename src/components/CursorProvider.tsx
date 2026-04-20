'use client'

import { useEffect, useState } from 'react'

const LS_KEY = 'halo:cursor-style'
const CURSOR_CLASSES = ['cursor-gold', 'cursor-silver', 'cursor-bronze'] as const

export default function CursorProvider({ role }: { role: string }) {
  const [cursorStyle, setCursorState] = useState<string | null>(null)

  useEffect(() => {
    const check = () => {
      const isOp = role === 'operador' || role === 'aux'
      if (!isOp) { setCursorState(null); return }
      setCursorState(localStorage.getItem(LS_KEY) || null)
    }

    check()
    window.addEventListener('halo:cursor-changed', check)
    return () => window.removeEventListener('halo:cursor-changed', check)
  }, [role])

  useEffect(() => {
    CURSOR_CLASSES.forEach(cls => document.body.classList.remove(cls))
    if (cursorStyle) document.body.classList.add(`cursor-${cursorStyle}`)
    return () => { CURSOR_CLASSES.forEach(cls => document.body.classList.remove(cls)) }
  }, [cursorStyle])

  return null
}

/** Called by MeuKPIClient after computing posicaoRanking */
export function setCursorStyle(style: 'gold' | 'silver' | 'bronze' | null) {
  if (style) localStorage.setItem(LS_KEY, style)
  else localStorage.removeItem(LS_KEY)
  window.dispatchEvent(new Event('halo:cursor-changed'))
}

/** @deprecated use setCursorStyle */
export function setCursorGold(isLider: boolean) {
  setCursorStyle(isLider ? 'gold' : null)
}
