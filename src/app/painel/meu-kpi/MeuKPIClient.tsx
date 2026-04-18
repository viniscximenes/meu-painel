'use client'

import { useRef, useState } from 'react'
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

function focoAmarelo(kpi: KPIItem): string | null {
  if (!kpi.meta || kpi.status !== 'amarelo') return null
  const label = kpi.label.toLowerCase()
  const meta = kpi.meta
  const v = kpi.valorNum
  const limite = meta.verde_inicio > 0 ? meta.verde_inicio : meta.valor_meta

  // Tx. Retenção: vermelho threshold fixo em 60%
  if (label.includes('retenc') || label.includes('retenç')) {
    const dist = v - 60
    if (dist <= 0) return 'Atenção: você está muito próximo de sair da meta!'
    return `Faltam ${dist.toFixed(1)}% para ficar abaixo da meta`
  }

  if (meta.tipo === 'maior_melhor') {
    const limiarVermelho = limite * 0.8
    const dist = v - limiarVermelho
    if (dist <= 0) return 'Atenção: muito próximo de sair da meta!'
    if (label.includes('pedido')) return `Faltam ${Math.ceil(dist)} pedidos para perder a meta`
    return `Faltam ${dist.toFixed(1)}${kpi.unidade ? ' ' + kpi.unidade : ''} para perder a meta`
  } else {
    const dist = limite - v
    if (dist <= 0) return 'Atenção: muito próximo de sair da meta!'
    if (label.includes('abs') || label.includes('ausên')) return `Mais ${dist.toFixed(2)}% de ausência e você perde a meta`
    if (label.includes('indisp')) return `Mais ${dist.toFixed(1)}% e você perde a meta`
    if (label.includes('cancel') || label.includes('churn')) return `Mais ${Math.ceil(dist)} cancelamentos e você perde a meta`
    if (label.includes('tma') || label.includes('tempo')) return `Mais ${formatSeg(dist)} por atendimento e você perde a meta`
    return `Mais ${dist.toFixed(1)}${kpi.unidade ? ' ' + kpi.unidade : ''} e você perde a meta`
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

// ── Componente Principal ──────────────────────────────────────────────────────

export default function MeuKPIClient({
  kpis, basicos, complementares,
  posicaoRanking, meuTxRet, totalNoRanking,
}: MeuKPIProps) {
  const basicosKPI = basicos.map(m => kpis.find(k => k.nome_coluna === m.nome_coluna)).filter(Boolean) as KPIItem[]

  return (
    <>
      <style dangerouslySetInnerHTML={{ __html: `
        @keyframes kpiCardIn {
          0%   { opacity: 0; transform: translateY(16px); }
          100% { opacity: 1; transform: translateY(0); }
        }

        @media (prefers-reduced-motion: no-preference) {

          /* ── 1º lugar ── */
          @keyframes rank1Entrance {
            0%   { transform: scale(0) rotate(-6deg); opacity: 0; }
            55%  { transform: scale(1.12) rotate(2deg); opacity: 1; }
            75%  { transform: scale(0.94) rotate(-1deg); }
            100% { transform: scale(1) rotate(0deg); }
          }
          @keyframes num1Bounce {
            0%   { transform: scale(0); opacity: 0; }
            50%  { transform: scale(1.3); opacity: 1; }
            70%  { transform: scale(0.9); }
            100% { transform: scale(1); opacity: 1; }
          }
          @keyframes borderGlow {
            0%   { box-shadow: 0 0 0 0 rgba(201,168,76,0); border-color: rgba(201,168,76,0.35); }
            33%  { box-shadow: 0 0 32px 10px rgba(201,168,76,0.30); border-color: rgba(232,201,109,0.9); }
            66%  { box-shadow: 0 0 20px 4px rgba(201,168,76,0.15); border-color: rgba(201,168,76,0.6); }
            100% { box-shadow: 0 0 28px 8px rgba(201,168,76,0.25); border-color: rgba(232,201,109,0.8); }
          }
          @keyframes firework {
            0%   { transform: translate(0,0) scale(1); opacity: 1; }
            80%  { opacity: 0.6; }
            100% { transform: translate(var(--fx), var(--fy)) scale(0); opacity: 0; }
          }
          @keyframes motivText {
            0%   { opacity: 0; transform: translateY(8px); }
            100% { opacity: 1; transform: translateY(0); }
          }
          @keyframes shimmerGold {
            0%   { background-position: -200% center; }
            100% { background-position: 200% center; }
          }

          /* ── 2º lugar ── */
          @keyframes rank2SlideUp {
            0%   { transform: translateY(40px); opacity: 0; }
            100% { transform: translateY(0); opacity: 1; }
          }
          @keyframes twinkle {
            0%, 100% { opacity: 0; transform: scale(0.6); }
            50%       { opacity: 1; transform: scale(1.2); }
          }
          @keyframes silverSweep {
            0%   { transform: scaleX(0); opacity: 0.8; }
            100% { transform: scaleX(1); opacity: 0; }
          }
          @keyframes silverPulse {
            0%, 100% { box-shadow: 0 0 0 0 rgba(156,163,175,0); border-color: rgba(156,163,175,0.30); }
            50%       { box-shadow: 0 0 20px 4px rgba(156,163,175,0.20); border-color: rgba(209,213,219,0.60); }
          }

          /* ── 3º lugar ── */
          @keyframes num3Flip {
            0%   { transform: rotateY(90deg); opacity: 0; }
            100% { transform: rotateY(0deg); opacity: 1; }
          }
          @keyframes flicker {
            0%, 100% { transform: scaleY(1) scaleX(1); }
            25%       { transform: scaleY(1.12) scaleX(0.92); }
            50%       { transform: scaleY(0.94) scaleX(1.05); }
            75%       { transform: scaleY(1.08) scaleX(0.96); }
          }
          @keyframes bronzePulse {
            0%, 100% { border-color: rgba(205,127,50,0.25); }
            50%       { border-color: rgba(205,127,50,0.55); box-shadow: 0 0 16px 2px rgba(205,127,50,0.15); }
          }

          /* ── 4º+ ── */
          @keyframes rankFade {
            0%   { opacity: 0; transform: scale(0.95) translateY(8px); }
            100% { opacity: 1; transform: scale(1) translateY(0); }
          }
        }

        @media (prefers-reduced-motion: reduce) {
          @keyframes rank1Entrance { from { opacity:0; } to { opacity:1; } }
          @keyframes num1Bounce    { from { opacity:0; } to { opacity:1; } }
          @keyframes rank2SlideUp  { from { opacity:0; } to { opacity:1; } }
          @keyframes num3Flip      { from { opacity:0; } to { opacity:1; } }
          @keyframes rankFade      { from { opacity:0; } to { opacity:1; } }
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

// ── Partículas fogos 1º lugar ──────────────────────────────────────────────────

const FIREWORKS: { id: number; x: number; y: number; fx: string; fy: string; d: number; s: number; color: string }[] = [
  { id:0,  x:50, y:50, fx:'-80px', fy:'-90px', d:0.0,  s:6, color:'#e8c96d' },
  { id:1,  x:50, y:50, fx:'80px',  fy:'-85px', d:0.08, s:5, color:'#f5d97a' },
  { id:2,  x:50, y:50, fx:'-90px', fy:'0px',   d:0.16, s:6, color:'#c9a84c' },
  { id:3,  x:50, y:50, fx:'90px',  fy:'0px',   d:0.04, s:5, color:'#e8c96d' },
  { id:4,  x:50, y:50, fx:'-60px', fy:'80px',  d:0.20, s:6, color:'#f5d97a' },
  { id:5,  x:50, y:50, fx:'60px',  fy:'80px',  d:0.12, s:5, color:'#c9a84c' },
  { id:6,  x:20, y:30, fx:'-50px', fy:'-70px', d:0.30, s:4, color:'#e8c96d' },
  { id:7,  x:80, y:30, fx:'50px',  fy:'-70px', d:0.24, s:4, color:'#f5d97a' },
  { id:8,  x:20, y:70, fx:'-55px', fy:'60px',  d:0.36, s:4, color:'#c9a84c' },
  { id:9,  x:80, y:70, fx:'55px',  fy:'60px',  d:0.18, s:4, color:'#e8c96d' },
  { id:10, x:50, y:20, fx:'0px',   fy:'-80px', d:0.10, s:5, color:'#f5d97a' },
  { id:11, x:50, y:80, fx:'0px',   fy:'75px',  d:0.28, s:5, color:'#c9a84c' },
]

const STARS = [0, 1, 2, 3, 4, 5]

// ── Ranking Card ──────────────────────────────────────────────────────────────

function RankingCard({ posicao, txRet, total }: { posicao: number; txRet: number; total: number }) {
  const is1 = posicao === 1
  const is2 = posicao === 2
  const is3 = posicao === 3

  const cardRef = useRef<HTMLDivElement>(null)
  const [tilt, setTilt] = useState({ x: 0, y: 0 })

  function handleMouseMove(e: React.MouseEvent<HTMLDivElement>) {
    if (!is1 || !cardRef.current) return
    const rect = cardRef.current.getBoundingClientRect()
    const cx = rect.left + rect.width / 2
    const cy = rect.top + rect.height / 2
    const rx = ((e.clientY - cy) / (rect.height / 2)) * -8
    const ry = ((e.clientX - cx) / (rect.width / 2)) * 8
    setTilt({ x: rx, y: ry })
  }

  function handleMouseLeave() {
    setTilt({ x: 0, y: 0 })
  }

  // styles by position
  const cardStyle: React.CSSProperties = is1 ? {
    background: 'linear-gradient(135deg, #0f0c02 0%, #1a1400 50%, #0a0900 100%)',
    border: '1px solid rgba(201,168,76,0.35)',
    animationName: 'rank1Entrance, borderGlow',
    animationDuration: '0.7s, 2.5s',
    animationDelay: '0s, 0.8s',
    animationTimingFunction: 'cubic-bezier(0.34,1.56,0.64,1), ease-in-out',
    animationIterationCount: '1, infinite',
    animationFillMode: 'both, none',
    transform: tilt.x || tilt.y ? `perspective(600px) rotateX(${tilt.x}deg) rotateY(${tilt.y}deg)` : undefined,
    transition: tilt.x || tilt.y ? 'transform 0.1s' : 'transform 0.3s ease',
  } : is2 ? {
    background: '#0d0d1a',
    border: '1px solid rgba(156,163,175,0.30)',
    animationName: 'rank2SlideUp, silverPulse',
    animationDuration: '0.5s, 3s',
    animationDelay: '0s, 0.5s',
    animationTimingFunction: 'ease, ease-in-out',
    animationIterationCount: '1, infinite',
    animationFillMode: 'both, none',
  } : is3 ? {
    background: '#0d0d1a',
    border: '1px solid rgba(205,127,50,0.25)',
    animationName: 'rankFade, bronzePulse',
    animationDuration: '0.45s, 3s',
    animationDelay: '0s, 0.5s',
    animationTimingFunction: 'ease, ease-in-out',
    animationIterationCount: '1, infinite',
    animationFillMode: 'both, none',
  } : {
    background: '#0d0d1a',
    border: '1px solid rgba(201,168,76,0.08)',
    animation: 'rankFade 0.4s ease both',
  }

  return (
    <div
      ref={cardRef}
      onMouseMove={handleMouseMove}
      onMouseLeave={handleMouseLeave}
      style={{
        position: 'relative',
        borderRadius: '20px',
        padding: '28px 32px',
        display: 'flex',
        alignItems: 'center',
        gap: '32px',
        flexWrap: 'wrap',
        overflow: 'hidden',
        ...cardStyle,
      }}
    >
      {/* ── 1º: fogos de artifício ── */}
      {is1 && FIREWORKS.map(f => (
        <div key={f.id} style={{
          position: 'absolute',
          left: `${f.x}%`, top: `${f.y}%`,
          width: `${f.s}px`, height: `${f.s}px`,
          borderRadius: '50%',
          background: f.color,
          // @ts-expect-error CSS custom properties
          '--fx': f.fx, '--fy': f.fy,
          animation: `firework 1.2s ease-out ${f.d + 0.6}s both`,
          pointerEvents: 'none', zIndex: 0,
        }} />
      ))}

      {/* ── 2º: linha varredura prata ── */}
      {is2 && (
        <div style={{
          position: 'absolute', top: 0, left: 0, right: 0, height: '2px',
          background: 'linear-gradient(90deg, transparent, #e2e8f0, transparent)',
          transformOrigin: 'left',
          animation: 'silverSweep 0.7s ease-out 0.4s both',
          zIndex: 0,
        }} />
      )}

      {/* ── 3º: chamas ── */}
      {is3 && [
        { left:'22%', color:'#cd7f32', h:24, d:'0s' },
        { left:'50%', color:'#d4942a', h:30, d:'0.13s' },
        { left:'78%', color:'#e8a83c', h:22, d:'0.07s' },
      ].map((flame, i) => (
        <div key={i} style={{
          position: 'absolute',
          bottom: 0,
          left: flame.left,
          width: '10px',
          height: `${flame.h}px`,
          background: `radial-gradient(ellipse at bottom, ${flame.color} 0%, transparent 100%)`,
          borderRadius: '50% 50% 20% 20%',
          animation: `flicker 0.4s ease-in-out ${flame.d} infinite alternate`,
          opacity: 0.55,
          zIndex: 0,
          pointerEvents: 'none',
        }} />
      ))}

      {/* ── Número ── */}
      <div style={{ position: 'relative', zIndex: 1, flexShrink: 0, textAlign: 'center' }}>

        {/* 2º: estrelas cintilantes */}
        {is2 && STARS.map(i => (
          <div key={i} style={{
            position: 'absolute',
            fontSize: '14px',
            color: '#9ca3af',
            animation: `twinkle 1.4s ease-in-out ${i * 0.22}s infinite`,
            ...[
              { top:'-18px', left:'50%', transform:'translateX(-50%)' },
              { top:'10px',  left:'-20px' },
              { top:'10px',  right:'-20px' },
              { bottom:'10px', left:'-18px' },
              { bottom:'10px', right:'-18px' },
              { bottom:'-14px', left:'50%', transform:'translateX(-50%)' },
            ][i],
          }}>✦</div>
        ))}

        <div style={{
          fontFamily: 'var(--ff-display)',
          lineHeight: 1,
          fontWeight: 900,
          ...(is1 ? {
            fontSize: '80px',
            background: 'linear-gradient(90deg, #c9a84c, #e8c96d, #f5d97a, #e8c96d, #c9a84c)',
            backgroundSize: '200% auto',
            WebkitBackgroundClip: 'text',
            WebkitTextFillColor: 'transparent',
            backgroundClip: 'text',
            animation: 'num1Bounce 0.6s cubic-bezier(0.34,1.56,0.64,1) 0.1s both, shimmerGold 2.5s linear 1s infinite',
          } : is2 ? {
            fontSize: '72px',
            color: '#e2e8f0',
            animation: 'rank2SlideUp 0.5s ease both',
          } : is3 ? {
            fontSize: '68px',
            color: '#cd7f32',
            animation: 'num3Flip 0.6s ease 0.1s both',
          } : {
            fontSize: '56px',
            color: 'var(--text-muted)',
            animation: 'rankFade 0.4s ease both',
          }),
        }}>
          {posicao}º
        </div>

        <div style={{ fontSize: is1 ? '28px' : '22px', lineHeight: 1, marginTop: '6px' }}>
          {is1 ? '🏆' : is2 ? '🥈' : is3 ? '🥉' : null}
        </div>
      </div>

      {/* ── Info ── */}
      <div style={{ position: 'relative', zIndex: 1, flex: 1, minWidth: '160px' }}>
        <p style={{
          fontFamily: 'var(--ff-display)',
          fontSize: is1 ? '20px' : '17px',
          fontWeight: 700,
          color: is1 ? '#e8c96d' : is2 ? '#e2e8f0' : is3 ? '#cd7f32' : 'var(--text-secondary)',
          marginBottom: '4px',
        }}>
          {is1 ? 'Líder de Retenção!' : is2 ? '2º no Ranking' : is3 ? '3º no Ranking' : `${posicao}º no Ranking`}
        </p>

        {/* 1º: texto motivacional com delay */}
        {is1 && (
          <p style={{
            fontSize: '13px', color: '#c9a84c', marginBottom: '8px',
            animation: 'motivText 0.5s ease 0.8s both',
          }}>
            Você está no topo! 🏆
          </p>
        )}

        <p style={{ fontSize: '13px', color: 'var(--text-muted)', marginBottom: '8px' }}>
          de {total} operadores em Tx. Retenção
        </p>

        <div style={{
          display: 'inline-flex', alignItems: 'center', gap: '8px',
          padding: '6px 14px', borderRadius: '10px',
          background: 'rgba(201,168,76,0.06)', border: '1px solid rgba(201,168,76,0.12)',
        }}>
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
  const foco        = focoEmMelhorar(kpi)
  const alertaAm    = focoAmarelo(kpi)
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

      {/* Mensagem de status */}
      {kpi.status === 'amarelo' && alertaAm ? (
        <div style={{ background: 'rgba(234,179,8,0.06)', border: '1px solid rgba(234,179,8,0.18)', borderRadius: '10px', padding: '8px 10px', display: 'flex', alignItems: 'flex-start', gap: '7px' }}>
          <AlertTriangle size={12} style={{ color: '#facc15', flexShrink: 0, marginTop: '1px' }} />
          <span style={{ fontSize: '11px', color: '#fde047', lineHeight: 1.4 }}>{alertaAm}</span>
        </div>
      ) : kpi.status === 'vermelho' && foco ? (
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
