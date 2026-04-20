'use client'

import { useState } from 'react'
import type { KpiHistoricoMes } from '@/lib/historico-kpi'
import {
  ChevronDown, Clock, Shield, XCircle, Package, CalendarX,
  Activity, BarChart2, UserX,
} from 'lucide-react'

// ── Tipos públicos ─────────────────────────────────────────────────────────────

export interface Ultimos3MesesProps {
  meses: KpiHistoricoMes[]
}

// ── Helpers ───────────────────────────────────────────────────────────────────

function kpiIcon(label: string) {
  const l = label.toLowerCase()
  if (l.includes('retenc') || l.includes('retenç')) return <Shield size={14} />
  if (l.includes('tma') || l.includes('tempo'))      return <Clock size={14} />
  if (l.includes('churn') || l.includes('cancel'))   return <XCircle size={14} />
  if (l.includes('pedido'))                          return <Package size={14} />
  if (l.includes('abs') || l.includes('ausên'))      return <CalendarX size={14} />
  if (l.includes('indisp'))                          return <Activity size={14} />
  return <BarChart2 size={14} />
}

function SectionLabel({ children }: { children: React.ReactNode }) {
  return (
    <div style={{ display: 'flex', alignItems: 'center', gap: '10px', paddingBottom: '2px' }}>
      <span style={{
        fontSize: '9px', fontWeight: 700, letterSpacing: '0.14em',
        textTransform: 'uppercase', color: 'rgba(244,212,124,0.7)',
      }}>
        {children}
      </span>
      <div style={{ flex: 1, height: '1px', background: 'linear-gradient(90deg, rgba(201,168,76,0.18) 0%, transparent 100%)' }} />
    </div>
  )
}

// ── Card de KPI principal ─────────────────────────────────────────────────────

function PrincipalCard({ label, valor, critico }: { label: string; valor: string; critico: boolean }) {
  const semDados = valor === '—'
  return (
    <div style={{
      background:   critico ? '#150e0e' : 'var(--bg-card)',
      border:       critico ? '1px solid rgba(248,113,113,0.25)' : '1px solid rgba(201,168,76,0.08)',
      borderRadius: '10px',
      padding:      '12px 14px',
      display:      'flex', flexDirection: 'column', gap: '6px',
    }}>
      <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
        <span style={{ color: critico ? 'rgba(248,113,113,0.65)' : 'rgba(244,212,124,0.65)', flexShrink: 0 }}>{kpiIcon(label)}</span>
        <span style={{
          fontSize: '10px', fontWeight: 600, letterSpacing: '0.08em',
          textTransform: 'uppercase', color: 'rgba(255,255,255,0.50)',
        }}>
          {label}
        </span>
      </div>
      <span style={{
        fontSize: '22px', fontWeight: 700, lineHeight: 1,
        color: semDados ? 'rgba(255,255,255,0.25)' : 'rgba(255,255,255,0.92)',
        fontVariantNumeric: 'tabular-nums',
      }}>
        {valor}
      </span>
    </div>
  )
}

// ── Seção complementares (colapsável) ─────────────────────────────────────────

function ComplementaresSection({ itens }: { itens: { label: string; valor: string }[] }) {
  const [open, setOpen] = useState(false)

  return (
    <div style={{
      background: 'var(--bg-elevated)',
      border: '1px solid rgba(255,255,255,0.06)',
      borderRadius: '10px',
      overflow: 'hidden',
    }}>
      <button
        type="button"
        onClick={() => setOpen(v => !v)}
        style={{
          width: '100%', display: 'flex', alignItems: 'center', gap: '8px',
          padding: '10px 14px', background: 'transparent', border: 'none',
          cursor: 'pointer', textAlign: 'left',
        }}
      >
        <span style={{
          fontSize: '9px', fontWeight: 700, letterSpacing: '0.14em',
          textTransform: 'uppercase', color: 'rgba(244,212,124,0.7)', flex: 1,
        }}>
          Dados Complementares
        </span>
        <ChevronDown
          size={13}
          style={{
            color: 'var(--text-muted)', flexShrink: 0,
            transition: 'transform 0.3s ease',
            transform: open ? 'rotate(0deg)' : 'rotate(-90deg)',
          }}
        />
      </button>
      <div style={{
        maxHeight: open ? '300px' : '0px',
        overflow: 'hidden',
        transition: 'max-height 0.35s cubic-bezier(0.4,0,0.2,1)',
      }}>
        <div style={{
          padding: '0 14px 12px',
          display: 'grid',
          gridTemplateColumns: 'repeat(auto-fill, minmax(180px, 1fr))',
          gap: '8px 16px',
        }}>
          {itens.map(c => (
            <div key={c.label} style={{ display: 'flex', justifyContent: 'space-between', gap: '8px', alignItems: 'baseline' }}>
              <span style={{ fontSize: '11px', color: 'rgba(255,255,255,0.40)', flexShrink: 0 }}>{c.label}</span>
              <span style={{ fontSize: '12px', fontWeight: 600, color: 'rgba(255,255,255,0.75)', textAlign: 'right' }}>{c.valor}</span>
            </div>
          ))}
        </div>
      </div>
    </div>
  )
}

// ── Seção de um mês ────────────────────────────────────────────────────────────

function MesSection({ mes, defaultOpen }: { mes: KpiHistoricoMes; defaultOpen: boolean }) {
  const [open, setOpen] = useState(defaultOpen)

  return (
    <div style={{
      background: 'var(--bg-card)',
      border: '1px solid rgba(201,168,76,0.08)',
      borderRadius: '12px',
      overflow: 'hidden',
    }}>
      {/* Header colapsável */}
      <button
        type="button"
        onClick={() => setOpen(v => !v)}
        style={{
          width: '100%', display: 'flex', alignItems: 'center', gap: '12px',
          padding: '14px 18px', background: 'transparent', border: 'none',
          cursor: 'pointer', textAlign: 'left',
        }}
      >
        <div style={{ flex: 1, display: 'flex', alignItems: 'center', gap: '10px', flexWrap: 'wrap' }}>
          <span style={{
            fontFamily: 'var(--ff-display)',
            fontSize: '14px', fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.06em',
            background: 'linear-gradient(135deg, #e8c96d 0%, #c9a84c 100%)',
            WebkitBackgroundClip: 'text', WebkitTextFillColor: 'transparent', backgroundClip: 'text',
          }}>
            {mes.mesLabel}
          </span>
          {mes.emAndamento && (
            <span style={{
              fontSize: '10px', fontWeight: 600, letterSpacing: '0.06em', textTransform: 'uppercase',
              padding: '2px 8px', borderRadius: '4px',
              background: 'rgba(244,212,124,0.08)', border: '1px solid rgba(244,212,124,0.25)',
              color: '#d4a935',
            }}>
              em andamento
            </span>
          )}
          {!mes.encontrado && (
            <span style={{
              fontSize: '10px', fontWeight: 600, letterSpacing: '0.06em', textTransform: 'uppercase',
              padding: '2px 8px', borderRadius: '99px',
              background: 'rgba(255,255,255,0.05)', border: '1px solid rgba(255,255,255,0.10)',
              color: 'rgba(255,255,255,0.35)',
            }}>
              sem dados
            </span>
          )}
        </div>
        <ChevronDown
          size={15}
          style={{
            color: 'var(--text-muted)', flexShrink: 0,
            transition: 'transform 0.3s ease',
            transform: open ? 'rotate(0deg)' : 'rotate(-90deg)',
          }}
        />
      </button>

      {/* Conteúdo */}
      <div style={{
        maxHeight: open ? '2000px' : '0px',
        overflow: 'hidden',
        transition: 'max-height 0.4s cubic-bezier(0.4,0,0.2,1)',
      }}>
        <div style={{ padding: '0 18px 18px', display: 'flex', flexDirection: 'column', gap: '16px' }}>

          {/* Operador não estava na empresa neste mês */}
          {!mes.encontrado && (
            <div style={{
              display: 'flex', flexDirection: 'column', alignItems: 'center', gap: '10px',
              padding: '24px 0', textAlign: 'center',
            }}>
              <UserX size={32} style={{ color: 'rgba(255,255,255,0.18)' }} />
              <p style={{ fontSize: '13px', fontWeight: 600, color: 'rgba(255,255,255,0.45)', margin: 0 }}>
                Você não estava na empresa neste mês
              </p>
              <p style={{ fontSize: '12px', color: 'rgba(255,255,255,0.25)', margin: 0 }}>
                Nenhuma linha encontrada em {mes.planilhaNome}.
              </p>
            </div>
          )}

          {/* KPIs Principais */}
          {mes.encontrado && mes.principais.length > 0 && (
            <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
              <SectionLabel>KPIs Principais</SectionLabel>
              <div style={{
                display: 'grid',
                gridTemplateColumns: 'repeat(auto-fill, minmax(160px, 1fr))',
                gap: '8px',
              }}>
                {mes.principais.map(k => <PrincipalCard key={k.label} label={k.label} valor={k.valor} critico={k.critico} />)}
              </div>
            </div>
          )}

          {/* Complementares */}
          {mes.encontrado && mes.complementares.length > 0 && (
            <ComplementaresSection itens={mes.complementares} />
          )}
        </div>
      </div>
    </div>
  )
}

// ── Componente principal ──────────────────────────────────────────────────────

export default function Ultimos3MesesClient({ meses }: Ultimos3MesesProps) {
  if (!meses.length) {
    return (
      <div style={{
        padding: '48px 24px', textAlign: 'center',
        background: 'var(--bg-card)', border: '1px solid rgba(255,255,255,0.06)',
        borderRadius: '12px',
      }}>
        <p style={{ fontSize: '14px', color: 'var(--text-muted)' }}>
          Nenhum mês de histórico configurado ainda.
        </p>
        <p style={{ fontSize: '12px', color: 'rgba(255,255,255,0.30)', marginTop: '6px' }}>
          Peça ao gestor para associar planilhas ao histórico em Configurações.
        </p>
      </div>
    )
  }

  return (
    <>
      <style>{`
        @keyframes hFadeUp {
          from { opacity: 0; transform: translateY(8px); }
          to   { opacity: 1; transform: translateY(0); }
        }
        .h-mes { animation: hFadeUp 0.35s ease both; }
        .h-mes:nth-child(1) { animation-delay:  0ms; }
        .h-mes:nth-child(2) { animation-delay: 60ms; }
        .h-mes:nth-child(3) { animation-delay: 120ms; }
        @media (prefers-reduced-motion: reduce) {
          .h-mes { animation: none; }
        }
      `}</style>
      <div style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
        {meses.map((m, i) => (
          <div key={`${m.mes}-${m.ano}`} className="h-mes">
            <MesSection mes={m} defaultOpen={i === 0} />
          </div>
        ))}
      </div>
    </>
  )
}
