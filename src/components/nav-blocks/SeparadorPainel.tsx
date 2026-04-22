'use client'

interface SeparadorPainelProps {
  titulo: string
  cor?: string
  corLinha?: string
}

export function SeparadorPainel({
  titulo,
  cor = 'var(--halo-blue-aux)',
  corLinha = 'var(--halo-blue-aux-line)',
}: SeparadorPainelProps) {
  return (
    <div className="flex items-center gap-3 px-3" style={{ marginTop: '24px', marginBottom: '16px' }}>
      <div className="flex-1 h-px" style={{ background: corLinha }} />
      <span
        className="text-[10px] font-semibold shrink-0"
        style={{ color: cor, letterSpacing: '0.12em' }}
      >
        {titulo}
      </span>
      <div className="flex-1 h-px" style={{ background: corLinha }} />
    </div>
  )
}
