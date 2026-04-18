'use client'

import { useEffect } from 'react'

export default function CursorProvider({ role }: { role: string }) {
  useEffect(() => {
    if (role === 'operador' || role === 'aux') {
      document.body.classList.add('cursor-gold')
    }
    return () => { document.body.classList.remove('cursor-gold') }
  }, [role])
  return null
}
