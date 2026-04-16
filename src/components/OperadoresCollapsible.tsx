'use client'

import { useState } from 'react'
import { ChevronDown } from 'lucide-react'
import OperadorCard from '@/components/OperadorCard'

type Op = {
  id: number
  nome: string
  username: string
}

export default function OperadoresCollapsible({ operadores }: { operadores: Op[] }) {
  const [expandido, setExpandido] = useState(true)

  return (
    <div>
      {/* Header da seção */}
      <div className="flex items-center justify-between mb-4">
        <div className="flex items-center gap-2.5">
          <h3
            className="text-sm font-bold"
            style={{ color: 'var(--text-secondary)', letterSpacing: '-0.01em' }}
          >
            Todos os Operadores
          </h3>
          <span
            className="text-[10px] font-bold tabular-nums px-2 py-0.5 rounded-full"
            style={{
              background: 'rgba(201,168,76,0.08)',
              color: 'var(--gold)',
              border: '1px solid rgba(201,168,76,0.15)',
              letterSpacing: '0.02em',
            }}
          >
            {operadores.length}
          </span>
        </div>

        <button
          type="button"
          onClick={() => setExpandido((v) => !v)}
          className="flex items-center gap-1.5 px-3 py-1.5 rounded-full text-xs font-semibold transition-all"
          aria-label={expandido ? 'Recolher lista de operadores' : 'Expandir lista de operadores'}
          aria-expanded={expandido}
          style={{
            background: expandido ? 'rgba(201,168,76,0.08)' : 'rgba(255,255,255,0.03)',
            border: expandido ? '1px solid rgba(201,168,76,0.22)' : '1px solid rgba(255,255,255,0.08)',
            color: expandido ? 'var(--gold-light)' : 'var(--text-muted)',
            cursor: 'pointer',
            transition: 'all 200ms cubic-bezier(0.4,0,0.2,1)',
          }}
        >
          <span>{expandido ? 'Recolher' : 'Expandir'}</span>
          <ChevronDown
            size={13}
            style={{
              transition: 'transform 0.30s cubic-bezier(0.4,0,0.2,1)',
              transform: expandido ? 'rotate(0deg)' : 'rotate(-180deg)',
              flexShrink: 0,
            }}
          />
        </button>
      </div>

      {/* Grid recolhível com animação de max-height */}
      <div
        style={{
          maxHeight: expandido ? '3000px' : '0px',
          overflow: 'hidden',
          transition: 'max-height 0.4s cubic-bezier(0.4,0,0.2,1)',
        }}
      >
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4">
          {operadores.map((op) => (
            <OperadorCard key={op.id} operador={op} />
          ))}
        </div>
      </div>
    </div>
  )
}
