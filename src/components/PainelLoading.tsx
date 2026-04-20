import { HaloSpinner } from '@/components/HaloSpinner'

interface PainelLoadingProps {
  mensagem: string
}

export function PainelLoading({ mensagem }: PainelLoadingProps) {
  return (
    <div
      className="min-h-[60vh] flex flex-col items-center justify-center gap-6"
      style={{ animation: 'fadeIn 0.2s ease both' }}
    >
      <div
        style={{
          fontFamily: 'var(--ff-display)',
          fontSize: '28px',
          fontWeight: 700,
          letterSpacing: '0.12em',
          background: 'linear-gradient(135deg, #e8c96d 0%, #c9a84c 100%)',
          WebkitBackgroundClip: 'text',
          WebkitTextFillColor: 'transparent',
          backgroundClip: 'text',
        }}
      >
        HALO
      </div>

      <HaloSpinner size="lg" />

      <p style={{ fontSize: '14px', fontWeight: 400, color: 'rgba(255,255,255,0.55)' }}>
        {mensagem}
      </p>
    </div>
  )
}
