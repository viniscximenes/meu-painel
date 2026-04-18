'use client'

import { type KPIItem, type Meta } from '@/lib/kpi-utils'
import {
  Clock, Shield, XCircle, Package, CalendarX, Activity,
  BarChart2, TrendingUp, AlertTriangle, CheckCircle2,
} from 'lucide-react'

export interface MeuKPIProps {
  kpis:            KPIItem[]
  basicos:         Meta[]
  complementares:  { label: string; valor: string }[]
  posicaoRanking:  number
  meuTxRet:        number
  totalNoRanking:  number
  nomeOperador:    string
  planilhaNome:    string
  dataAtualizacao: string | null
  mesLabel:        string
}

// ── Helpers ───────────────────────────────────────────────────────────────────

const STATUS_COLOR = { verde: '#4ade80', amarelo: '#facc15', vermelho: '#f87171', neutro: '#94a3b8' }
const STATUS_BG    = { verde: 'rgba(74,222,128,0.08)', amarelo: 'rgba(250,204,21,0.08)', vermelho: 'rgba(248,113,113,0.08)', neutro: 'rgba(148,163,184,0.06)' }
const STATUS_BORDER= { verde: 'rgba(74,222,128,0.15)', amarelo: 'rgba(250,204,21,0.15)', vermelho: 'rgba(248,113,113,0.15)', neutro: 'rgba(148,163,184,0.10)' }
const STATUS_LABEL = { verde: 'Na Meta ✓', amarelo: 'Atenção', vermelho: 'Fora da Meta', neutro: '' }

function kpiIcon(label: string) {
  const l = label.toLowerCase()
  if (l.includes('retenc') || l.includes('retenç')) return <Shield size={16} />
  if (l.includes('tma') || l.includes('tempo'))      return <Clock size={16} />
  if (l.includes('cancel') || l.includes('churn'))   return <XCircle size={16} />
  if (l.includes('pedido'))                          return <Package size={16} />
  if (l.includes('abs') || l.includes('ausên'))      return <CalendarX size={16} />
  if (l.includes('indisp'))                          return <Activity size={16} />
  return <BarChart2 size={16} />
}

function formatSeg(s: number): string {
  const m = Math.floor(Math.abs(s) / 60)
  const sec = Math.round(Math.abs(s) % 60)
  return `${String(m).padStart(2,'0')}:${String(sec).padStart(2,'0')}`
}

function focoEmMelhorar(kpi: KPIItem): string | null {
  if (!kpi.meta || kpi.status === 'verde') return null
  const alvo = kpi.meta.verde_inicio > 0 ? kpi.meta.verde_inicio : kpi.meta.valor_meta
  const label = kpi.label.toLowerCase()

  if (kpi.meta.tipo === 'maior_melhor') {
    const falta = alvo - kpi.valorNum
    if (falta <= 0) return null
    if (label.includes('retenc') || label.includes('retenç')) return `Retenha mais ${falta.toFixed(1)}% de clientes`
    if (label.includes('pedido')) return `Aumente ${Math.ceil(falta)} pedidos para atingir a meta`
    return `Aumente ${falta.toFixed(1)}${kpi.unidade ? ' ' + kpi.unidade : ''} para atingir a meta`
  } else {
    const excesso = kpi.valorNum - alvo
    if (excesso <= 0) return null
    if (label.includes('tma') || label.includes('tempo')) return `Reduza ${formatSeg(excesso)} por atendimento`
    if (label.includes('abs') || label.includes('ausên')) return `Reduza ${excesso.toFixed(2)}% de ausência`
    if (label.includes('indisp'))  return `Reduza ${excesso.toFixed(2)}% de inatividade`
    if (label.includes('cancel') || label.includes('churn')) return `Reduza ${Math.ceil(excesso)} cancelamentos`
    return `Reduza ${excesso.toFixed(1)}${kpi.unidade ? ' ' + kpi.unidade : ''}`
  }
}

function distanciaMeta(kpi: KPIItem): string {
  if (!kpi.meta) return ''
  const alvo = kpi.meta.verde_inicio > 0 ? kpi.meta.verde_inicio : kpi.meta.valor_meta
  const diff = kpi.meta.tipo === 'maior_melhor' ? kpi.valorNum - alvo : alvo - kpi.valorNum
  const sign = diff >= 0 ? '+' : ''
  const label = kpi.label.toLowerCase()
  if (label.includes('tma') || label.includes('tempo')) return `${sign}${formatSeg(Math.abs(diff))}`
  return `${sign}${diff.toFixed(1)}${kpi.unidade ? ' ' + kpi.unidade : ''}`
}

function formatMeta(meta: Meta): string {
  const alvo = meta.verde_inicio > 0 ? meta.verde_inicio : meta.valor_meta
  const label = meta.label.toLowerCase()
  if (label.includes('tma') || label.includes('tempo')) return formatSeg(alvo)
  return `${alvo}${meta.unidade ? ' ' + meta.unidade : ''}`
}

// ── Partículas para 1º lugar ───────────────────────────────────────────────────

const PARTICLES: { id: number; x: number; y: number; d: number; s: number }[] = [
  { id:0,  x: 10, y: 20, d: 0.0,  s: 5 }, { id:1,  x: 85, y: 15, d: 0.15, s: 4 }, { id:2,  x: 50, y: 5,  d: 0.3,  s: 6 },
  { id:3,  x: 20, y: 70, d: 0.1,  s: 3 }, { id:4,  x: 80, y: 65, d: 0.25, s: 5 }, { id:5,  x: 35, y: 90, d: 0.05, s: 4 },
  { id:6,  x: 65, y: 85, d: 0.2,  s: 3 }, { id:7,  x: 5,  y: 45, d: 0.35, s: 5 }, { id:8,  x: 92, y: 40, d: 0.1,  s: 4 },
  { id:9,  x: 45, y: 50, d: 0.4,  s: 6 }, { id:10, x: 72, y: 30, d: 0.18, s: 3 }, { id:11, x: 28, y: 35, d: 0.28, s: 5 },
]

// ── Componente Principal ──────────────────────────────────────────────────────

export default function MeuKPIClient({
  kpis, basicos, complementares,
  posicaoRanking, meuTxRet, totalNoRanking,
}: MeuKPIProps) {
  const basicosKPI = basicos.map(m => kpis.find(k => k.nome_coluna === m.nome_coluna)).filter(Boolean) as KPIItem[]

  return (
    <>
      <style dangerouslySetInnerHTML={{ __html: `
        @keyframes rankEntrance {
          0%   { transform: scale(0) rotate(-5deg); opacity: 0; }
          60%  { transform: scale(1.08) rotate(1deg); opacity: 1; }
          80%  { transform: scale(0.96) rotate(-0.5deg); }
          100% { transform: scale(1) rotate(0deg); opacity: 1; }
        }
        @keyframes rankSlideUp {
          0%   { transform: translateY(24px); opacity: 0; }
          100% { transform: translateY(0);    opacity: 1; }
        }
        @keyframes rankFade {
          0%   { opacity: 0; transform: scale(0.97); }
          100% { opacity: 1; transform: scale(1); }
        }
        @keyframes goldPulse {
          0%, 100% { box-shadow: 0 0 0 0 rgba(201,168,76,0); border-color: rgba(201,168,76,0.35); }
          50%       { box-shadow: 0 0 28px 6px rgba(201,168,76,0.25); border-color: rgba(232,201,109,0.8); }
        }
        @keyframes silverPulse {
          0%, 100% { box-shadow: 0 0 0 0 rgba(156,163,175,0); border-color: rgba(156,163,175,0.30); }
          50%       { box-shadow: 0 0 20px 4px rgba(156,163,175,0.20); border-color: rgba(209,213,219,0.60); }
        }
        @keyframes bronzePulse {
          0%, 100% { border-color: rgba(205,127,50,0.25); }
          50%       { border-color: rgba(205,127,50,0.55); }
        }
        @keyframes particle {
          0%   { transform: translateY(0) scale(1); opacity: 1; }
          100% { transform: translateY(-60px) scale(0); opacity: 0; }
        }
        @keyframes kpiCardIn {
          0%   { opacity: 0; transform: translateY(16px); }
          100% { opacity: 1; transform: translateY(0); }
        }
      `}} />

      <div className="space-y-6">
        {/* ── Seção 1: Ranking ── */}
        <RankingCard posicao={posicaoRanking} txRet={meuTxRet} total={totalNoRanking} />

        {/* ── Seção 2: KPIs Principais ── */}
        {basicosKPI.length > 0 && (
          <div className="space-y-3">
            <SectionTitle>KPIs Principais</SectionTitle>
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(280px, 1fr))', gap: '12px' }}>
              {basicosKPI.map((kpi, i) => (
                <KPICard key={kpi.nome_coluna} kpi={kpi} delay={i * 80} />
              ))}
            </div>
          </div>
        )}

        {/* ── Seção 3: Dados Complementares ── */}
        {complementares.length > 0 && (
          <div className="space-y-3">
            <SectionTitle>Dados do Mês</SectionTitle>
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(130px, 1fr))', gap: '8px' }}>
              {complementares.map(({ label, valor }) => (
                <div key={label} style={{ background: '#0d0d1a', border: '1px solid rgba(201,168,76,0.06)', borderRadius: '12px', padding: '10px 12px' }}>
                  <p style={{ fontSize: '10px', textTransform: 'uppercase', letterSpacing: '0.06em', color: 'var(--text-muted)', marginBottom: '4px', lineHeight: 1.3 }}>{label}</p>
                  <p style={{ fontSize: '16px', fontWeight: 600, color: 'var(--text-primary)', fontVariantNumeric: 'tabular-nums' }}>{valor}</p>
                </div>
              ))}
            </div>
          </div>
        )}
      </div>
    </>
  )
}

// ── Ranking Card ──────────────────────────────────────────────────────────────

function RankingCard({ posicao, txRet, total }: { posicao: number; txRet: number; total: number }) {
  const is1 = posicao === 1
  const is2 = posicao === 2
  const is3 = posicao === 3
  const medals = ['🥇','🥈','🥉']
  const medal  = posicao <= 3 ? medals[posicao - 1] : null

  const rankColor = is1 ? 'linear-gradient(135deg, #e8c96d 0%, #f5d97a 50%, #c9a84c 100%)'
    : is2 ? '#9ca3af'
    : is3 ? '#cd7f32'
    : 'var(--text-muted)'

  const animation = is1 ? 'rankEntrance 0.7s cubic-bezier(0.34,1.56,0.64,1) both'
    : is2 ? 'rankSlideUp 0.5s ease both'
    : is3 ? 'rankFade 0.45s ease both'
    : 'rankFade 0.4s ease both'

  const borderAnim = is1 ? 'goldPulse 2.5s ease-in-out infinite'
    : is2 ? 'silverPulse 3s ease-in-out infinite'
    : is3 ? 'bronzePulse 3s ease-in-out infinite'
    : undefined

  const baseBorder = is1 ? 'rgba(201,168,76,0.35)' : is2 ? 'rgba(156,163,175,0.30)' : is3 ? 'rgba(205,127,50,0.25)' : 'rgba(201,168,76,0.08)'

  return (
    <div style={{
      position: 'relative',
      background: is1 ? 'linear-gradient(135deg, #0f0c02 0%, #1a1400 50%, #0a0900 100%)' : '#0d0d1a',
      border: `1px solid ${baseBorder}`,
      borderRadius: '20px',
      padding: '28px 32px',
      display: 'flex',
      alignItems: 'center',
      gap: '32px',
      flexWrap: 'wrap',
      animation,
      ...(borderAnim ? { animationName: `${animation.split(' ')[0]}, ${borderAnim.split(' ')[0]}`, animationDuration: `${animation.split(' ')[1]}, ${borderAnim.split(' ')[1]}`, animationDelay: `0s, 0.8s`, animationTimingFunction: `${animation.split(' ').slice(2,-1).join(' ')}, ease-in-out`, animationIterationCount: `1, infinite`, animationFillMode: 'both, none' } : {}),
      overflow: 'hidden',
    }}>

      {/* Partículas 1º lugar */}
      {is1 && PARTICLES.map(p => (
        <div key={p.id} style={{
          position: 'absolute',
          left: `${p.x}%`,
          top:  `${p.y}%`,
          width: `${p.s}px`,
          height: `${p.s}px`,
          borderRadius: '50%',
          background: p.id % 3 === 0 ? '#e8c96d' : p.id % 3 === 1 ? '#f5d97a' : '#c9a84c',
          animation: `particle ${1.2 + p.d}s ease-out ${p.d + 0.7}s both`,
          pointerEvents: 'none',
          zIndex: 0,
        }} />
      ))}

      {/* Posição grande */}
      <div style={{ position: 'relative', zIndex: 1, flexShrink: 0, textAlign: 'center' }}>
        <div style={{
          fontSize: '72px',
          fontWeight: 900,
          lineHeight: 1,
          fontFamily: 'var(--ff-display)',
          background: is1 ? rankColor : undefined,
          color: is1 ? undefined : (is2 || is3 ? rankColor : 'var(--text-muted)'),
          WebkitBackgroundClip: is1 ? 'text' : undefined,
          WebkitTextFillColor: is1 ? 'transparent' : undefined,
          backgroundClip: is1 ? 'text' : undefined,
        }}>
          {posicao}º
        </div>
        {medal && <div style={{ fontSize: '28px', lineHeight: 1, marginTop: '4px' }}>{medal}</div>}
      </div>

      {/* Info */}
      <div style={{ position: 'relative', zIndex: 1, flex: 1, minWidth: '160px' }}>
        <p style={{
          fontFamily: 'var(--ff-display)',
          fontSize: is1 ? '20px' : '17px',
          fontWeight: 700,
          color: is1 ? '#e8c96d' : is2 ? '#9ca3af' : is3 ? '#cd7f32' : 'var(--text-secondary)',
          marginBottom: '4px',
        }}>
          {is1 ? 'Líder de Retenção!' : is2 ? '2º no Ranking' : is3 ? '3º no Ranking' : `${posicao}º no Ranking`}
        </p>
        <p style={{ fontSize: '13px', color: 'var(--text-muted)', marginBottom: '8px' }}>
          de {total} operadores em Tx. Retenção
        </p>
        <div style={{ display: 'inline-flex', alignItems: 'center', gap: '8px', padding: '6px 14px', borderRadius: '10px', background: 'rgba(201,168,76,0.06)', border: '1px solid rgba(201,168,76,0.12)' }}>
          <TrendingUp size={13} style={{ color: '#c9a84c' }} />
          <span style={{ fontSize: '18px', fontWeight: 700, color: '#e8c96d', fontVariantNumeric: 'tabular-nums' }}>
            {txRet.toFixed(1)}%
          </span>
          <span style={{ fontSize: '11px', color: 'var(--text-muted)' }}>Tx. Retenção</span>
        </div>
      </div>
    </div>
  )
}

// ── KPI Card ──────────────────────────────────────────────────────────────────

function KPICard({ kpi, delay }: { kpi: KPIItem; delay: number }) {
  const color  = STATUS_COLOR[kpi.status]
  const bg     = STATUS_BG[kpi.status]
  const border = STATUS_BORDER[kpi.status]
  const foco   = focoEmMelhorar(kpi)
  const dist   = kpi.meta ? distanciaMeta(kpi) : null
  const metaFmt = kpi.meta ? formatMeta(kpi.meta) : null
  const pct    = kpi.progresso

  return (
    <div style={{
      background: '#0d0d1a',
      border: `1px solid rgba(201,168,76,0.08)`,
      borderRadius: '16px',
      padding: '16px',
      display: 'flex',
      flexDirection: 'column',
      gap: '12px',
      animation: `kpiCardIn 0.4s ease both`,
      animationDelay: `${delay}ms`,
    }}>

      {/* Header */}
      <div style={{ display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between', gap: '8px' }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: '8px', flex: 1, minWidth: 0 }}>
          <div style={{ width: '28px', height: '28px', borderRadius: '8px', display: 'flex', alignItems: 'center', justifyContent: 'center', background: bg, border: `1px solid ${border}`, color, flexShrink: 0 }}>
            {kpiIcon(kpi.label)}
          </div>
          <span style={{ fontSize: '12px', fontWeight: 600, color: 'var(--text-secondary)', lineHeight: 1.3 }}>{kpi.label}</span>
        </div>
        <span style={{ fontSize: '9px', fontWeight: 700, padding: '3px 8px', borderRadius: '99px', textTransform: 'uppercase', letterSpacing: '0.08em', background: bg, color, border: `1px solid ${border}`, flexShrink: 0, whiteSpace: 'nowrap' }}>
          {STATUS_LABEL[kpi.status]}
        </span>
      </div>

      {/* Valor principal */}
      <div>
        <span style={{
          fontFamily: 'var(--ff-display)',
          fontSize: '36px',
          fontWeight: 800,
          lineHeight: 1,
          color,
          fontVariantNumeric: 'tabular-nums',
        }}>
          {kpi.valor}
        </span>
        {kpi.unidade && kpi.status !== 'neutro' && (
          <span style={{ fontSize: '13px', color: 'var(--text-muted)', marginLeft: '4px' }}>{kpi.unidade}</span>
        )}
      </div>

      {/* Barra de progresso */}
      {kpi.meta && (
        <div>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '5px' }}>
            <span style={{ fontSize: '10px', color: 'var(--text-muted)' }}>
              {pct >= 100
                ? 'Meta atingida'
                : `${pct}% da meta atingida`}
            </span>
            <span style={{ fontSize: '10px', color: 'var(--text-muted)' }}>Meta: {metaFmt}</span>
          </div>
          <div style={{ height: '8px', borderRadius: '99px', background: 'rgba(255,255,255,0.06)', overflow: 'hidden' }}>
            <div style={{
              height: '100%',
              width: `${Math.min(pct, 100)}%`,
              borderRadius: '99px',
              background: kpi.status === 'verde'
                ? 'linear-gradient(90deg, #16a34a, #4ade80)'
                : kpi.status === 'amarelo'
                  ? 'linear-gradient(90deg, #ca8a04, #facc15)'
                  : 'linear-gradient(90deg, #dc2626, #f87171)',
              transition: 'width 0.8s cubic-bezier(0.4,0,0.2,1)',
            }} />
          </div>
          {dist && (
            <p style={{ fontSize: '10px', color: kpi.status === 'verde' ? '#4ade80' : 'var(--text-muted)', marginTop: '4px' }}>
              Distância da meta: <strong style={{ color: kpi.status === 'verde' ? '#4ade80' : color }}>{dist}</strong>
            </p>
          )}
        </div>
      )}

      {/* Foco em melhorar / mensagem positiva */}
      {foco ? (
        <div style={{ background: 'rgba(248,113,113,0.06)', border: '1px solid rgba(248,113,113,0.15)', borderRadius: '10px', padding: '8px 10px', display: 'flex', alignItems: 'flex-start', gap: '7px' }}>
          <AlertTriangle size={12} style={{ color: '#f87171', flexShrink: 0, marginTop: '1px' }} />
          <span style={{ fontSize: '11px', color: '#fca5a5', lineHeight: 1.4 }}>{foco}</span>
        </div>
      ) : kpi.status === 'verde' ? (
        <div style={{ background: 'rgba(74,222,128,0.05)', border: '1px solid rgba(74,222,128,0.12)', borderRadius: '10px', padding: '8px 10px', display: 'flex', alignItems: 'center', gap: '7px' }}>
          <CheckCircle2 size={12} style={{ color: '#4ade80', flexShrink: 0 }} />
          <span style={{ fontSize: '11px', color: '#86efac' }}>Dentro da meta — continue assim!</span>
        </div>
      ) : null}
    </div>
  )
}

// ── Section Title ─────────────────────────────────────────────────────────────

function SectionTitle({ children }: { children: React.ReactNode }) {
  return (
    <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
      <span style={{
        fontFamily: 'var(--ff-display)',
        fontSize: '11px', fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.12em',
        color: '#c9a84c',
      }}>{children}</span>
      <div style={{ flex: 1, height: '1px', background: 'linear-gradient(90deg, rgba(201,168,76,0.15) 0%, transparent 100%)' }} />
    </div>
  )
}
