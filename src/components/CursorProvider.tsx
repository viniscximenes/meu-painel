'use client'

import { useEffect, useRef } from 'react'

export default function CursorProvider({ role }: { role: string }) {
  const lastPos = useRef({ x: 0, y: 0 })
  const isGold  = role === 'operador' || role === 'aux'

  // Cursor gold class
  useEffect(() => {
    if (isGold) document.body.classList.add('cursor-gold')
    return () => { document.body.classList.remove('cursor-gold') }
  }, [isGold])

  // Flash dourado a cada 10s
  useEffect(() => {
    if (!isGold) return

    const onMove = (e: MouseEvent) => { lastPos.current = { x: e.clientX, y: e.clientY } }
    document.addEventListener('mousemove', onMove)

    const id = setInterval(() => {
      const px = lastPos.current.x || Math.random() * window.innerWidth
      const py = lastPos.current.y || Math.random() * window.innerHeight
      const el = document.createElement('div')
      el.style.cssText = [
        'position:fixed',
        `left:${px}px`,
        `top:${py}px`,
        'width:30px',
        'height:30px',
        'border-radius:50%',
        'background:radial-gradient(circle,rgba(201,168,76,0.8),transparent)',
        'transform:translate(-50%,-50%) scale(0)',
        'pointer-events:none',
        'z-index:9998',
        'animation:cursorFlash 0.8s ease-out forwards',
      ].join(';')
      document.body.appendChild(el)
      setTimeout(() => { el.remove() }, 850)
    }, 10000)

    return () => {
      document.removeEventListener('mousemove', onMove)
      clearInterval(id)
    }
  }, [isGold])

  return null
}
