'use client'

import { useState, useEffect } from 'react'

export function useCountUp(target: number, duration = 900) {
  const [val, setVal] = useState(0)

  useEffect(() => {
    if (target === 0) { setVal(0); return }
    let startTs: number | null = null
    let raf: number
    const tick = (ts: number) => {
      if (!startTs) startTs = ts
      const p = Math.min((ts - startTs) / duration, 1)
      setVal(target * (1 - Math.pow(1 - p, 3)))
      if (p < 1) { raf = requestAnimationFrame(tick) } else { setVal(target) }
    }
    raf = requestAnimationFrame(tick)
    return () => cancelAnimationFrame(raf)
  }, [target, duration])

  return val
}
