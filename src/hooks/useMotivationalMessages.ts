'use client'

import { useState, useEffect } from 'react'
import { MOTIVATIONAL_MESSAGES } from '@/lib/kpi-config'

const ROTATION_INTERVAL_MS = 4 * 60 * 1000

function selectMessage(cardIndex: number, rotationIndex: number): string {
  const total = MOTIVATIONAL_MESSAGES.length
  // Desloca o pool por rotação para garantir unicidade entre cards e entre ciclos
  const offset = (rotationIndex * 7 + cardIndex) % total
  return MOTIVATIONAL_MESSAGES[offset]
}

/**
 * Retorna mensagem motivacional única por cardIndex.
 * Retorna null no SSR/pré-hidratação para evitar hydration mismatch.
 * Após mount, começa a rotacionar a cada 4min.
 */
export function useMotivationalMessage(cardIndex: number): string | null {
  const [message, setMessage] = useState<string | null>(null)
  const [rotationIndex, setRotationIndex] = useState(0)

  useEffect(() => {
    setMessage(selectMessage(cardIndex, 0))

    const id = setInterval(() => {
      setRotationIndex(prev => prev + 1)
    }, ROTATION_INTERVAL_MS)

    return () => clearInterval(id)
  }, [cardIndex])

  useEffect(() => {
    if (rotationIndex > 0) {
      setMessage(selectMessage(cardIndex, rotationIndex))
    }
  }, [rotationIndex, cardIndex])

  return message
}
