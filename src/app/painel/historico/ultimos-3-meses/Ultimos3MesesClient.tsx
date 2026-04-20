'use client'

import { useState } from 'react'
import { type KPIItem } from '@/lib/kpi-utils'
import { formatMetricValue } from '@/lib/kpi-utils'
import {
  ChevronDown, Clock, Shield, XCircle, Package, CalendarX,
  Activity, BarChart2, CheckCircle2, AlertCircle, MinusCircle,
} from 'lucide-react'

// ── Tipos ─────────────────────────────────────────────────────────────────────

export interface MesHistorico {
  planilhaNome:    string
  mesLabel:        string
  dataAtualizacao: string | null
  kpis:            KPIItem[]
  complementares:  { label: string; valor: string }[]
}

export interface Ultimos3MesesProps {
  meses: MesHistorico[]
}

// ── Helpers ───────────────────────────────────────────────────────────────────

const STATUS_COLOR  = { verde: '#4ade80', amarelo: '#facc15', vermelho: '#f87171', neutro: '#94a3b8' }
const STATUS_BG     = { verde: 'rgba(74,222,128,0.06)', amarelo: 'rgba(250,204,21,0.06)', vermelho: 'rgba(248,113,113,0.06)', neutro: 'rgba(148,163,184,0.04)' }
const STATUS_BORDER = { verde: 'rgba(74,222,128,0.15)', amarelo: 'rgba(250,204,21,0.15)', vermelho: 'rgba(248,113,113,0.15)', neutro: 'rgba(148,163,184,0.10)' }

function KPIIcon({ label }: { label: string }) {
  const l = label.toLowerCase()
  if (l.includes('retenc') || l.includes('retenç')) return <Shield size={14} />
  if (l.includes('tma') || l.includes('tempo'))      return <Clock size={14} />
  if (l.includes('cancel') || l.includes('churn'))   return <XCircle size={14} />
  if (l.includes('pedido'))                          return <Package size={14} />
  if (l.includes('abs') || l.includes('ausên'))      return <CalendarX size={14} />
  if (l.includes('indisp'))                          return <Activity size={14} />
  return <BarChart2 size={14} />
}

function StatusIcon({ status }: { status: KPIItem['status'] }) {
  if (status === 'verde')    return <CheckCircle2 size={12} style={{ color: STATUS_COLOR.verde }} />
  if (status === 'amarelo')  return <AlertCircle  size={12} style={{ color: STATUS_COLOR.amarelo }} />
  if (status === 'vermelho') return <AlertCircle  size={12} style={{ color: STATUS_COLOR.vermelho }} />
  return <MinusCircle size={12} style={{ color: STATUS_COLOR.neutro }} />
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

// ── Card de um KPI ────────────────────────────────────────────────────────────

function KPICard({ kpi }: { kpi: KPIItem }) {
  const cor    = STATUS_COLOR[kpi.status]
  const fundo  = STATUS_BG[kpi.status]
  const borda  = STATUS_BORDER[kpi.status]
  const valor  = formatMetricValue(kpi.valor, kpi.unidade)

  return (
    <div style={{
      background:   fundo,
      border:       `1px solid ${borda}`,
      borderRadius: '10px',
      padding:      '12px 14px',
      display:      'flex', flexDirection: 'column', gap: '6px',
    }}>
      <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
        <span style={{ color: 'rgba(244,212,124,0.7)', flexShrink: 0 }}><KPIIcon label={kpi.label} /></span>
        <span style={{ fontSize: '10px', fontWeight: 600, letterSpacing: '0.08em', textTransform: 'uppercase', color: 'rgba(255,255,255,0.55)' }}>
          {kpi.label}
        </span>
        <span style={{ marginLeft: 'auto', flexShrink: 0 }}><StatusIcon status={kpi.status} /></span>
      </div>
      <span style={{ fontSize: '22px', fontWeight: 700, lineHeight: 1, color: cor, fontVariantNumeric: 'tabular-nums' }}>
        {valor}
      </span>
    </div>
  )
}

// ── Seção de um mês ────────────────────────────────────────────────────────────

function MesSection({ mes, defaultOpen }: { mes: MesHistorico; defaultOpen: boolean }) {
  const [open, setOpen] = useState(defaultOpen)
  const basicos = mes.kpis.filter(k => k.basico)

  return (
    <div style={{
      background: 'rgba(255,255,255,0.02)',
      border: '1px solid rgba(201,168,76,0.10)',
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
        <div style={{ flex: 1 }}>
          <span style={{
            fontFamily: 'var(--ff-display)',
            fontSize: '14px', fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.06em',
            background: 'linear-gradient(135deg, #e8c96d 0%, #c9a84c 100%)',
            WebkitBackgroundClip: 'text', WebkitTextFillColor: 'transparent', backgroundClip: 'text',
          }}>
            {mes.mesLabel}
          </span>
          {mes.dataAtualizacao && (
            <span style={{ fontSize: '11px', color: 'var(--text-muted)', marginLeft: '10px' }}>
              atualizado {mes.dataAtualizacao}
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

          {/* KPIs principais */}
          {basicos.length > 0 && (
            <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
              <SectionLabel>KPIs Principais</SectionLabel>
              <div style={{
                display: 'grid',
                gridTemplateColumns: 'repeat(auto-fill, minmax(160px, 1fr))',
                gap: '8px',
              }}>
                {basicos.map(k => <KPICard key={k.nome_coluna} kpi={k} />)}
              </div>
            </div>
          )}

          {/* Dados do mês */}
          {mes.complementares.length > 0 && (
            <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
              <SectionLabel>Dados do Mês</SectionLabel>
              <div style={{
                background: 'rgba(255,255,255,0.02)',
                border: '1px solid rgba(255,255,255,0.06)',
                borderRadius: '10px',
                padding: '12px 14px',
                display: 'grid',
                gridTemplateColumns: 'repeat(auto-fill, minmax(180px, 1fr))',
                gap: '8px 16px',
              }}>
                {mes.complementares.map(c => (
                  <div key={c.label} style={{ display: 'flex', justifyContent: 'space-between', gap: '8px', alignItems: 'baseline' }}>
                    <span style={{ fontSize: '11px', color: 'rgba(255,255,255,0.45)', flexShrink: 0 }}>{c.label}</span>
                    <span style={{ fontSize: '12px', fontWeight: 600, color: 'rgba(255,255,255,0.75)', textAlign: 'right' }}>{c.valor}</span>
                  </div>
                ))}
              </div>
            </div>
          )}

          {basicos.length === 0 && mes.complementares.length === 0 && (
            <p style={{ fontSize: '13px', color: 'var(--text-muted)', textAlign: 'center', padding: '16px 0' }}>
              Sem dados disponíveis para este mês.
            </p>
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
        background: 'rgba(255,255,255,0.02)', border: '1px solid rgba(255,255,255,0.06)',
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
          <div key={m.planilhaNome} className="h-mes">
            <MesSection mes={m} defaultOpen={i === 0} />
          </div>
        ))}
      </div>
    </>
  )
}
