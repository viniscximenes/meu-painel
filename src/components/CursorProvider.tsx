'use client'

import { useEffect, useRef } from 'react'

const FLASH_SVG = `<svg width="60" height="60" viewBox="0 0 24 24" xmlns="http://www.w3.org/2000/svg">
  <line x1="12" y1="2" x2="12" y2="22" stroke="white" stroke-width="1.5" stroke-linecap="round" opacity="0.9"/>
  <line x1="2" y1="12" x2="22" y2="12" stroke="white" stroke-width="1.5" stroke-linecap="round" opacity="0.9"/>
  <line x1="5" y1="5" x2="19" y2="19" stroke="#e8c96d" stroke-width="1" stroke-linecap="round" opacity="0.7"/>
  <line x1="19" y1="5" x2="5" y2="19" stroke="#e8c96d" stroke-width="1" stroke-linecap="round" opacity="0.7"/>
  <circle cx="12" cy="12" r="2" fill="white" opacity="1"/>
</svg>`

export default function CursorProvider({ role }: { role: string }) {
  const lastPos = useRef({ x: 0, y: 0 })
  const isGold  = role === 'operador' || role === 'aux'

  useEffect(() => {
    if (isGold) document.body.classList.add('cursor-gold')
    return () => { document.body.classList.remove('cursor-gold') }
  }, [isGold])

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
        `left:${px - 2}px`,
        `top:${py - 2}px`,
        'width:60px',
        'height:60px',
        'pointer-events:none',
        'z-index:9998',
        'animation:metalFlash 0.6s ease-out forwards',
      ].join(';')
      el.innerHTML = FLASH_SVG
      document.body.appendChild(el)
      setTimeout(() => { el.remove() }, 650)
    }, 10000)

    return () => {
      document.removeEventListener('mousemove', onMove)
      clearInterval(id)
    }
  }, [isGold])

  return null
}
