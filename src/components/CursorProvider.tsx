'use client'

import { useEffect } from 'react'

export default function CursorProvider({ role }: { role: string }) {
  const isGold = role === 'operador' || role === 'aux'

  useEffect(() => {
    if (isGold) document.body.classList.add('cursor-gold')
    return () => { document.body.classList.remove('cursor-gold') }
  }, [isGold])

  return null
}
