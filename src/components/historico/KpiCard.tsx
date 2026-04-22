'use client'

import {
  Shield, Clock, XCircle, Package, CalendarX, Activity, BarChart2,
} from 'lucide-react'
import {
  calcularStatusPrincipal,
  calcBarraHistorico, getLimiteTexto, formatDeltaMeta,
  type Status,
} from '@/lib/historico-status'

const COR_SEM: Record<Status, string> = {
  bom:     '#4ade80',
  atencao: '#facc15',
  critico: '#f87171',
  neutro:  '#f4d47c',
}
const BADGE_BG: Record<Status, string> = {
  bom:     'rgba(74,222,128,0.12)',
  atencao: 'rgba(250,204,21,0.12)',
  critico: 'rgba(248,113,113,0.12)',
  neutro:  'transparent',
}
const BADGE_BORDER: Record<Status, string> = {
  bom:     'rgba(74,222,128,0.35)',
  atencao: 'rgba(250,204,21,0.35)',
  critico: 'rgba(248,113,113,0.40)',
  neutro:  'transparent',
}
const BADGE_LABEL: Record<Status, string> = {
  bom: 'BOM', atencao: 'ATENÇÃO', critico: 'CRÍTICO', neutro: '',
}

function iconFor(label: string, size = 14) {
  const l = label.toLowerCase()
  if (l.includes('retenc') || l.includes('retenç')) return <Shield size={size} />
  if (l.includes('tma') || l.includes('tempo'))      return <Clock size={size} />
  if (l.includes('churn') || l.includes('cancel'))   return <XCircle size={size} />
  if (l.includes('pedido'))                          return <Package size={size} />
  if (l === 'abs' || l.startsWith('abs'))            return <CalendarX size={size} />
  if (l.includes('indisp'))                          return <Activity size={size} />
  return <BarChart2 size={size} />
}

export interface DeltaAnterior {
  texto: string
  isBom: boolean | null
  mesAnteriorLabel: string
}

export interface KpiCardProps {
  label: string
  valor: string
  deltaAnterior?: DeltaAnterior | null
}

export default function KpiCard({ label, valor, deltaAnterior }: KpiCardProps) {
  const status   = calcularStatusPrincipal(label, valor)
  const semDados = valor === '—'
  const barra    = calcBarraHistorico(label, valor)
  const limite   = getLimiteTexto(label)
  const delta    = formatDeltaMeta(label, valor)

  const labelLower   = label.toLowerCase()
  const displayLabel = labelLower.includes('indisp') ? 'Indisp.' : label

  const barBg =
    barra.status === 'neutro'  ? 'rgba(244,212,124,0.4)' :
    barra.status === 'bom'     ? '#4ade80' :
    barra.status === 'atencao' ? '#facc15' :
                                 '#f87171'

  const deltaCor = delta
    ? (delta.status === 'bom' ? '#4ade80' : delta.status === 'atencao' ? '#facc15' : '#f87171')
    : undefined

  const deltaAntCor =
    deltaAnterior?.isBom === true  ? '#4ade80' :
    deltaAnterior?.isBom === false ? '#f87171' :
                                     'rgba(255,255,255,0.45)'

  const deltaAntSeta = deltaAnterior
    ? (deltaAnterior.texto.startsWith('+') ? '↑' :
       deltaAnterior.texto.startsWith('-') ? '↓' : '→')
    : null

  return (
    <div
      className="h-card"
      style={{
        background: 'rgba(20, 24, 32, 0.6)',
        backdropFilter: 'blur(12px)',
        WebkitBackdropFilter: 'blur(12px)',
        border: '1px solid rgba(255, 255, 255, 0.06)',
        borderRadius: '10px',
        padding: '18px 20px',
        display: 'flex', flexDirection: 'column',
        minHeight: deltaAnterior ? '178px' : '160px',
        fontFamily: 'var(--ff-body)',
        transition: 'transform 0.2s ease, border-color 0.2s ease, box-shadow 0.2s ease',
      }}
    >
      {/* Header: icon + label + badge */}
      <div style={{
        display: 'flex', alignItems: 'center', justifyContent: 'space-between',
        gap: '8px', marginBottom: '14px',
      }}>
        <div style={{
          display: 'flex', alignItems: 'center', gap: '8px',
          minWidth: 0, flex: 1, overflow: 'hidden',
        }}>
          <span style={{
            color: COR_SEM[status], display: 'inline-flex', flexShrink: 0,
          }}>
            {iconFor(label, 14)}
          </span>
          <span
            title={label}
            style={{
              fontFamily: 'var(--ff-body)',
              fontSize: '11px', fontWeight: 600, letterSpacing: '0.08em',
              textTransform: 'uppercase', color: 'rgba(255,255,255,0.55)',
              whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis',
            }}
          >
            {displayLabel}
          </span>
        </div>
        {status !== 'neutro' && (
          <span style={{
            fontFamily: 'var(--ff-body)',
            fontSize: '9.5px', fontWeight: 600,
            padding: '3px 8px', borderRadius: '4px',
            textTransform: 'uppercase', letterSpacing: '0.08em',
            background: BADGE_BG[status], color: COR_SEM[status],
            border: `1px solid ${BADGE_BORDER[status]}`,
            flexShrink: 0, whiteSpace: 'nowrap',
          }}>
            {BADGE_LABEL[status]}
          </span>
        )}
      </div>

      {/* Valor gigante branco */}
      <div style={{ flex: 1 }}>
        <span style={{
          fontFamily: 'var(--ff-body)',
          fontSize: '42px', fontWeight: 700, lineHeight: 1,
          color: semDados ? 'rgba(255,255,255,0.25)' : '#ffffff',
          fontVariantNumeric: 'tabular-nums', letterSpacing: '-0.02em',
          display: 'block',
        }}>
          {valor}
        </span>
      </div>

      {/* Barra 3px */}
      <div style={{
        marginTop: '16px',
        height: '3px', borderRadius: '2px',
        background: 'rgba(255,255,255,0.08)', overflow: 'hidden',
      }}>
        <div style={{
          height: '100%', width: `${barra.pct}%`,
          borderRadius: '2px', background: barBg,
          transition: 'width 0.4s ease',
        }} />
      </div>

      {/* Divisória + footer */}
      <div style={{
        marginTop: '12px', paddingTop: '10px',
        borderTop: '1px solid rgba(255,255,255,0.05)',
        display: 'flex', flexDirection: 'column', gap: '4px',
      }}>
        <div style={{
          display: 'flex', justifyContent: 'space-between', alignItems: 'center',
          gap: '8px',
        }}>
          <span style={{
            fontFamily: 'var(--ff-body)',
            fontSize: '10px', color: 'rgba(255,255,255,0.35)',
          }}>
            {limite || 'métrica informativa'}
          </span>
          {delta && !semDados && (
            <span style={{
              fontFamily: 'var(--ff-body)',
              fontSize: '11px', fontWeight: 600,
              color: deltaCor, fontVariantNumeric: 'tabular-nums',
            }}>
              {delta.texto}
            </span>
          )}
        </div>
        {deltaAnterior && (
          <div style={{
            display: 'flex', alignItems: 'center', gap: '4px',
            fontFamily: 'var(--ff-body)', fontSize: '11px', color: deltaAntCor,
          }}>
            <span>{deltaAntSeta}</span>
            <span style={{ fontVariantNumeric: 'tabular-nums', fontWeight: 500 }}>
              {deltaAnterior.texto}
            </span>
            <span style={{ color: 'rgba(255,255,255,0.30)', marginLeft: '2px' }}>
              vs {deltaAnterior.mesAnteriorLabel}
            </span>
          </div>
        )}
      </div>
    </div>
  )
}
