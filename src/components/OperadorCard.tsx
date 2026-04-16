'use client'

import Link from 'next/link'
import { Operador } from '@/types'
import { getAvatarStyle, getIniciaisNome } from '@/lib/operadores'
import { ArrowRight } from 'lucide-react'

interface OperadorCardProps {
  operador: Omit<Operador, 'profile_id'>
  resumo?: { label: string; valor: string | number }[]
  status?: 'ativo' | 'inativo'
}

export default function OperadorCard({
  operador,
  resumo,
  status = 'ativo',
}: OperadorCardProps) {
  const isAtivo = status === 'ativo'

  return (
    <Link
      href={`/painel/operadores/${operador.id}`}
      className="card flex flex-col gap-4 group relative overflow-hidden"
      aria-label={`Ver perfil de ${operador.nome}`}
      style={{ textDecoration: 'none', minHeight: '140px' }}
      onMouseEnter={(e) => {
        const el = e.currentTarget as HTMLElement
        el.style.transform = 'translateY(-4px)'
        el.style.borderColor = 'rgba(201,168,76,0.40)'
        el.style.boxShadow = '0 12px 40px rgba(0,0,0,0.5), 0 0 0 1px rgba(201,168,76,0.10), 0 8px 32px rgba(59,130,246,0.12)'
      }}
      onMouseLeave={(e) => {
        const el = e.currentTarget as HTMLElement
        el.style.transform = 'translateY(0)'
        el.style.borderColor = 'rgba(255,255,255,0.06)'
        el.style.boxShadow = 'var(--shadow-dark)'
      }}
    >
      {/* Subtle gradient overlay on hover via pseudo */}
      <div
        className="absolute inset-0 opacity-0 group-hover:opacity-100 pointer-events-none"
        style={{
          background: 'linear-gradient(135deg, rgba(201,168,76,0.03) 0%, transparent 60%)',
          transition: 'opacity 200ms ease',
        }}
      />

      {/* Cabeçalho */}
      <div className="flex items-center gap-3 relative">
        {/* Avatar com ring animado */}
        <div className="relative shrink-0">
          <div
            className="w-10 h-10 rounded-xl flex items-center justify-center font-bold text-sm border-2"
            style={getAvatarStyle(operador.id)}
          />
          <div
            className="absolute inset-0 rounded-xl"
            style={{
              ...getAvatarStyle(operador.id),
              opacity: 0,
              transition: 'opacity 200ms ease',
            }}
          />
          <div
            className="w-10 h-10 rounded-xl flex items-center justify-center font-bold text-sm border-2 absolute inset-0"
            style={getAvatarStyle(operador.id)}
          >
            {getIniciaisNome(operador.nome)}
          </div>
        </div>

        <div className="flex-1 min-w-0">
          <p className="truncate text-sm" style={{ color: 'var(--text-primary)', fontWeight: 400 }}>
            {operador.nome}
          </p>
          <p className="text-xs truncate font-medium" style={{ color: '#4a90d9' }}>
            {operador.username}
          </p>
        </div>

        {/* Status dot pulsante */}
        <div className="relative shrink-0">
          <span
            className="w-2.5 h-2.5 rounded-full block animate-dotPulse"
            style={{
              background: isAtivo ? '#10b981' : 'var(--text-muted)',
              boxShadow: isAtivo ? '0 0 8px rgba(16,185,129,0.5)' : 'none',
            }}
          />
        </div>
      </div>

      {/* Métricas resumidas */}
      {resumo && resumo.length > 0 && (
        <div className="grid grid-cols-2 gap-1.5 relative">
          {resumo.slice(0, 4).map((item) => (
            <div
              key={item.label}
              className="rounded-xl p-2.5"
              style={{
                background: 'rgba(5,5,8,0.6)',
                border: '1px solid rgba(255,255,255,0.04)',
              }}
            >
              <p className="text-[10px] truncate uppercase" style={{ color: 'var(--text-muted)', letterSpacing: '0.06em' }}>
                {item.label}
              </p>
              <p
                className="mt-0.5"
                style={{
                  fontFamily: 'var(--ff-body)',
                  fontSize: '0.875rem',
                  fontWeight: 700,
                  lineHeight: 1,
                  fontVariantNumeric: 'tabular-nums',
                  fontFeatureSettings: '"tnum" 1',
                  color: 'var(--text-primary)',
                }}
              >
                {item.valor}
              </p>
            </div>
          ))}
        </div>
      )}

      {/* "Ver detalhes" com arrow animada */}
      <div className="mt-auto flex items-center justify-between relative">
        <div
          className="flex items-center gap-1.5 text-xs font-semibold px-3 py-1.5 rounded-lg border transition-all"
          style={{
            color: 'var(--gold-light)',
            background: 'rgba(201,168,76,0.05)',
            borderColor: 'rgba(201,168,76,0.15)',
          }}
        >
          Ver detalhes
        </div>
        <div
          className="w-7 h-7 rounded-lg flex items-center justify-center border transition-all group-hover:translate-x-1"
          style={{
            color: 'var(--gold)',
            background: 'rgba(201,168,76,0.08)',
            borderColor: 'rgba(201,168,76,0.18)',
            transition: 'transform 200ms cubic-bezier(0.4,0,0.2,1)',
          }}
        >
          <ArrowRight size={13} />
        </div>
      </div>
    </Link>
  )
}
