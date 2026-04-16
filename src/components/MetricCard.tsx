import { TrendingUp, TrendingDown, Minus } from 'lucide-react'
import clsx from 'clsx'

interface MetricCardProps {
  label: string
  valor: string | number
  variacao?: number
  icone?: React.ReactNode
  descricao?: string
  className?: string
  iconeBg?: string
  iconeColor?: string
  valorColor?: string
}

export default function MetricCard({
  label,
  valor,
  variacao,
  icone,
  descricao,
  className,
  iconeBg,
  iconeColor,
  valorColor,
}: MetricCardProps) {
  const temVariacao = variacao !== undefined && variacao !== null
  const positivo = temVariacao && variacao! > 0
  const negativo = temVariacao && variacao! < 0

  const useGradientValue = !valorColor

  return (
    <div
      className={clsx('card flex flex-col gap-3 relative overflow-hidden', className)}
      style={{ animationFillMode: 'both', minHeight: '120px' }}
    >
      {/* Decorative top accent */}
      <div
        className="absolute top-0 left-0 right-0 h-[2px]"
        style={{
          background: iconeBg
            ? `linear-gradient(90deg, ${iconeBg} 0%, transparent 100%)`
            : 'linear-gradient(90deg, rgba(201,168,76,0.6) 0%, rgba(201,168,76,0.0) 100%)',
        }}
      />

      <div className="flex items-start justify-between">
        <p
          className="text-xs font-semibold uppercase"
          style={{ color: 'var(--text-muted)', letterSpacing: '0.08em' }}
        >
          {label}
        </p>
        {icone && (
          <div
            className="p-2.5 rounded-xl shrink-0"
            style={{
              background: iconeBg ?? 'rgba(201,168,76,0.08)',
              color: iconeColor ?? 'var(--gold-light)',
              boxShadow: iconeBg
                ? `0 4px 16px ${iconeBg}55`
                : '0 4px 16px rgba(201,168,76,0.12)',
            }}
          >
            {icone}
          </div>
        )}
      </div>

      <div>
        {useGradientValue ? (
          <p
            className="text-3xl font-extrabold tracking-tight tabular-nums leading-none"
            style={{
              background: 'linear-gradient(135deg, var(--gold-bright) 0%, var(--gold-light) 50%, #fbbf24 100%)',
              WebkitBackgroundClip: 'text',
              WebkitTextFillColor: 'transparent',
              backgroundClip: 'text',
            }}
          >
            {valor}
          </p>
        ) : (
          <p
            className="text-3xl font-extrabold tracking-tight tabular-nums leading-none"
            style={{ color: valorColor }}
          >
            {valor}
          </p>
        )}
        {descricao && (
          <p className="text-xs mt-1.5" style={{ color: 'var(--text-muted)' }}>{descricao}</p>
        )}
      </div>

      {temVariacao && (
        <div
          className={clsx('flex items-center gap-1 text-xs font-medium')}
          style={{ color: positivo ? '#10b981' : negativo ? '#ef4444' : 'var(--text-muted)' }}
        >
          {positivo ? <TrendingUp size={12} /> : negativo ? <TrendingDown size={12} /> : <Minus size={12} />}
          <span>
            {positivo ? '+' : ''}
            {variacao!.toFixed(1)}% vs período anterior
          </span>
        </div>
      )}
    </div>
  )
}
