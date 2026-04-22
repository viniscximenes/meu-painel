'use client'

import { contarStatusPrincipais } from '@/lib/historico-status'

export default function StatusSummary({
  principais,
}: {
  principais: { label: string; valor: string }[]
}) {
  const { bons, atencoes, criticos, total } = contarStatusPrincipais(principais)
  if (total === 0) return null

  const allBom = bons === total && atencoes === 0 && criticos === 0

  if (allBom) {
    return (
      <span style={{
        display: 'inline-flex', alignItems: 'center', gap: '6px',
        fontFamily: 'var(--ff-body)',
        fontSize: '11px', fontWeight: 500,
        color: 'rgba(74,222,128,0.85)',
        letterSpacing: '0.04em',
      }}>
        <span style={{
          width: 6, height: 6, borderRadius: '50%', background: '#4ade80',
        }} />
        TUDO OK
      </span>
    )
  }

  return (
    <div style={{
      display: 'flex', alignItems: 'center', gap: '14px',
      flexWrap: 'wrap',
    }}>
      {criticos > 0 && (
        <span style={{
          display: 'inline-flex', alignItems: 'center', gap: '6px',
          fontFamily: 'var(--ff-body)',
          fontSize: '11px', fontWeight: 500,
          color: 'rgba(248,113,113,0.85)',
        }}>
          <span style={{
            width: 6, height: 6, borderRadius: '50%', background: '#f87171',
          }} />
          {criticos} {criticos === 1 ? 'crítico' : 'críticos'}
        </span>
      )}
      {atencoes > 0 && (
        <span style={{
          display: 'inline-flex', alignItems: 'center', gap: '6px',
          fontFamily: 'var(--ff-body)',
          fontSize: '11px', fontWeight: 500,
          color: 'rgba(250,204,21,0.85)',
        }}>
          <span style={{
            width: 6, height: 6, borderRadius: '50%', background: '#facc15',
          }} />
          {atencoes} atenção
        </span>
      )}
    </div>
  )
}
