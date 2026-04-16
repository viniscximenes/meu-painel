'use client'

import Link from 'next/link'
import { Clock, TrendingUp, ChevronRight } from 'lucide-react'
import { formatTempo } from '@/lib/diario-utils'
import { getAvatarStyle, getIniciaisNome } from '@/lib/operadores'
import type { TipoRegistro } from '@/lib/diario-utils'
import { useState } from 'react'

const TIPO_CORES: Record<TipoRegistro, { bg: string; color: string; border: string }> = {
  'Pausa justificada': { bg: 'rgba(245,158,11,0.10)', color: '#f59e0b', border: 'rgba(245,158,11,0.25)' },
  'Fora da jornada':   { bg: 'rgba(96,165,250,0.10)', color: '#60a5fa', border: 'rgba(96,165,250,0.25)' },
  'Geral':             { bg: 'rgba(167,139,250,0.10)', color: '#a78bfa', border: 'rgba(167,139,250,0.25)' },
  'Outros':            { bg: 'rgba(148,163,184,0.10)', color: '#94a3b8', border: 'rgba(148,163,184,0.20)' },
  'Tempo logado':      { bg: 'rgba(52,211,153,0.10)',  color: '#34d399', border: 'rgba(52,211,153,0.25)' },
}

interface Props {
  op: { id: number; nome: string; username: string }
  total: number
  minPausas: number
  minFora: number
  tipoCounts: Record<TipoRegistro, number>
}

export default function OperadorResumoCard({ op, total, minPausas, minFora, tipoCounts }: Props) {
  const [hovered, setHovered] = useState(false)

  return (
    <Link
      href={`/painel/diario/${op.username}`}
      className="block rounded-2xl border transition-colors"
      style={{
        background: hovered ? 'rgba(255,255,255,0.04)' : 'rgba(255,255,255,0.02)',
        borderColor: hovered ? 'rgba(201,168,76,0.15)' : 'rgba(255,255,255,0.06)',
        transition: 'background 150ms ease, border-color 150ms ease',
      }}
      onMouseEnter={() => setHovered(true)}
      onMouseLeave={() => setHovered(false)}
    >
      <div className="flex items-center gap-4 px-5 py-4">
        {/* Avatar */}
        <div
          className="w-10 h-10 rounded-xl flex items-center justify-center text-sm font-bold border-2 shrink-0"
          style={getAvatarStyle(op.id)}
        >
          {getIniciaisNome(op.nome)}
        </div>

        {/* Nome + totais */}
        <div className="flex-1 min-w-0">
          <p className="text-sm font-semibold" style={{ color: 'var(--text-primary)' }}>
            {op.nome}
          </p>
          <div className="flex items-center gap-3 mt-1 flex-wrap">
            <span className="text-[10px] font-medium" style={{ color: 'var(--text-muted)' }}>
              {total} {total === 1 ? 'registro' : 'registros'}
            </span>
            {minPausas > 0 && (
              <span className="flex items-center gap-1 text-[10px] font-semibold tabular-nums" style={{ color: '#f59e0b' }}>
                <Clock size={10} />
                Pausas: {formatTempo(minPausas)}
              </span>
            )}
            {minFora > 0 && (
              <span className="flex items-center gap-1 text-[10px] font-semibold tabular-nums" style={{ color: '#60a5fa' }}>
                <TrendingUp size={10} />
                Fora: {formatTempo(minFora)}
              </span>
            )}
          </div>
        </div>

        <ChevronRight size={15} style={{ color: 'var(--text-muted)', flexShrink: 0 }} />
      </div>

      {/* Barra de tipos */}
      <div
        className="px-5 pb-3 flex items-center gap-2 flex-wrap"
        style={{ borderTop: '1px solid rgba(255,255,255,0.04)' }}
      >
        {(Object.entries(tipoCounts) as [TipoRegistro, number][])
          .filter(([, count]) => count > 0)
          .map(([tipo, count]) => {
            const c = TIPO_CORES[tipo]
            return (
              <span
                key={tipo}
                className="text-[9px] font-bold uppercase px-1.5 py-0.5 rounded-full"
                style={{ background: c.bg, color: c.color, border: `1px solid ${c.border}` }}
              >
                {tipo.split(' ')[0]} {count}
              </span>
            )
          })}
      </div>
    </Link>
  )
}
