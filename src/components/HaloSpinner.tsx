interface HaloSpinnerProps {
  size?: 'sm' | 'md' | 'lg'
  className?: string
}

const SIZE_MAP: Record<NonNullable<HaloSpinnerProps['size']>, string> = {
  sm: '14px',
  md: '18px',
  lg: '32px',
}

export function HaloSpinner({ size = 'md', className }: HaloSpinnerProps) {
  const px = SIZE_MAP[size]
  return (
    <span
      className={`spinner-premium${className ? ` ${className}` : ''}`}
      style={{ width: px, height: px, flexShrink: 0 }}
      aria-hidden="true"
    />
  )
}
