'use client'

import { useEffect, useRef } from 'react'
import {
  ShoppingCart, TrendingDown, Clock, Phone, PhoneOff, ClipboardCheck,
  Star, Timer, UserX, PauseCircle, WifiOff, BarChart2, Shield,
  CreditCard, Zap, Users, ArrowRightLeft, PhoneCall, AlertCircle,
  Headphones, Package, Ban, ThumbsUp,
} from 'lucide-react'
import type { KPIItem, Status } from '@/lib/kpi-utils'
import { formatarExibicao, sufixoUnidade, getLabelStatus } from '@/lib/kpi-utils'
import { ICON_MAP } from '@/lib/kpi-icons'
import clsx from 'clsx'

// ── Ícone por palavras-chave ──────────────────────────────────────────────────

function pickIcon(label: string): React.ElementType {
  const l = label.toLowerCase()
  if (l.includes('pedido') || l.includes('venda'))           return ShoppingCart
  if (l.includes('cancel'))                                   return Ban
  if (l.includes('churn'))                                    return TrendingDown
  if (l.includes('ticket') || l.includes('variação'))        return CreditCard
  if (l.includes('tma') || l.includes('tempo médio'))        return Clock
  if (l.includes('tabulação') || l.includes('tabulacao'))    return ClipboardCheck
  if (l.includes('five9') || l.includes('ligaç') || l.includes('ligac')) return Headphones
  if (l.includes('abs') || l.includes('ausência') || l.includes('ausencia')) return UserX
  if (l.includes('indisp'))                                   return WifiOff
  if (l.includes('pausa') || l.includes('nr17'))             return PauseCircle
  if (l.includes('csat') || l.includes('satisf'))            return ThumbsUp
  if (l.includes('retenção') || l.includes('retencao') || l.includes('tx')) return Shield
  if (l.includes('transferência') || l.includes('transferencia')) return ArrowRightLeft
  if (l.includes('short') || l.includes('rechamada'))        return PhoneCall
  if (l.includes('short call'))                              return PhoneOff
  if (l.includes('retid') || l.includes('cliente'))          return Users
  if (l.includes('login') || l.includes('logado'))           return Timer
  if (l.includes('produto') || l.includes('pacote'))         return Package
  if (l.includes('engaj') || l.includes('zap'))              return Zap
  if (l.includes('phone') || l.includes('fone'))             return Phone
  return BarChart2
}

// ── Descrição para tooltip ────────────────────────────────────────────────────

function descreverKPI(label: string): string {
  const l = label.toLowerCase()
  if (l.includes('pedido') || l.includes('venda'))           return 'Total de pedidos/vendas realizados no período.'
  if (l.includes('cancel'))                                   return 'Total de cancelamentos registrados no período.'
  if (l.includes('churn'))                                    return 'Taxa de clientes perdidos no período.'
  if (l.includes('ticket'))                                   return 'Valor médio por venda (ticket médio).'
  if (l.includes('tma') || l.includes('tempo médio de atend')) return 'Tempo Médio de Atendimento por chamada.'
  if (l.includes('tabulação') || l.includes('tabulacao') || l.includes('acw')) return 'Tempo de pós-atendimento após encerrar a chamada.'
  if (l.includes('five9') || l.includes('ligaç') || l.includes('ligac')) return 'Total de ligações realizadas ou recebidas.'
  if (l.includes('abs') || l.includes('ausência') || l.includes('ausencia')) return 'Absenteísmo — horas/dias de ausência no período.'
  if (l.includes('indisp'))                                   return 'Tempo em estado de indisponibilidade no sistema.'
  if (l.includes('pausa') || l.includes('nr17'))             return 'Tempo em pausa conforme NR-17.'
  if (l.includes('csat') || l.includes('satisf'))            return 'Nota de satisfação do cliente (CSAT).'
  if (l.includes('retenção') || l.includes('retencao'))      return 'Taxa de retenção de clientes que solicitaram cancelamento.'
  if (l.includes('transferência') || l.includes('transferencia')) return 'Total de chamadas transferidas para outro agente ou fila.'
  if (l.includes('short call') || l.includes('short'))       return 'Chamadas com duração inferior ao mínimo aceitável.'
  if (l.includes('rechamada'))                               return 'Clientes que precisaram ligar novamente para o mesmo problema.'
  if (l.includes('login') || l.includes('logado'))           return 'Tempo total logado no sistema de atendimento.'
  if (l.includes('discado') || l.includes('discagem'))       return 'Total de chamadas discadas no período.'
  return ''
}

// ── Tooltip (i) ───────────────────────────────────────────────────────────────

function InfoTooltip({ texto }: { texto: string }) {
  if (!texto) return null
  return (
    <div className="relative group/tip inline-flex shrink-0">
      <span
        className="w-3.5 h-3.5 rounded-full text-[8px] font-bold flex items-center justify-center cursor-help select-none transition-all"
        style={{ background: 'rgba(201,168,76,0.12)', color: 'var(--text-muted)' }}
        onMouseEnter={(e) => {
          const el = e.currentTarget as HTMLElement
          el.style.background = 'rgba(201,168,76,0.22)'
          el.style.color = 'var(--gold-light)'
        }}
        onMouseLeave={(e) => {
          const el = e.currentTarget as HTMLElement
          el.style.background = 'rgba(201,168,76,0.12)'
          el.style.color = 'var(--text-muted)'
        }}
      >
        i
      </span>
      <div
        className="absolute bottom-full left-1/2 -translate-x-1/2 mb-2.5 w-48 rounded-xl px-3 py-2.5 text-[10px] leading-relaxed opacity-0 group-hover/tip:opacity-100 pointer-events-none z-50 text-center"
        style={{
          background: 'rgba(10,14,24,0.95)',
          backdropFilter: 'blur(12px)',
          border: '1px solid rgba(201,168,76,0.25)',
          color: 'var(--text-secondary)',
          boxShadow: '0 12px 40px rgba(0,0,0,0.6)',
          transition: 'opacity 150ms ease, transform 150ms ease',
          transform: 'translateY(4px)',
        }}
        onMouseEnter={(e) => {
          const el = e.currentTarget as HTMLElement
          el.style.opacity = '1'
          el.style.transform = 'translateY(0)'
        }}
      >
        {texto}
        <span
          className="absolute top-full left-1/2 -translate-x-1/2 border-4 border-transparent"
          style={{ borderTopColor: 'rgba(10,14,24,0.95)' }}
        />
      </div>
    </div>
  )
}

// ── Estilos por status ────────────────────────────────────────────────────────

const STATUS_STYLES: Record<Status, {
  topBorder: string;
  cardBg: string; cardBorder: string;
  iconBg: string; iconColor: string; iconShadow: string;
  bar: string;
  badgeBg: string; badgeColor: string; badgeBorder: string; badgeGlow: string;
  valorColor: string;
}> = {
  verde: {
    topBorder: '#10b981',
    cardBg: 'rgba(16,185,129,0.03)',   cardBorder: 'rgba(16,185,129,0.18)',
    iconBg: 'rgba(16,185,129,0.12)',   iconColor: '#10b981', iconShadow: 'rgba(16,185,129,0.25)',
    bar: 'from-emerald-500 to-teal-400',
    badgeBg: 'rgba(16,185,129,0.10)',  badgeColor: '#34d399', badgeBorder: 'rgba(16,185,129,0.25)',
    badgeGlow: '0 0 12px rgba(16,185,129,0.30)',
    valorColor: '#10b981',
  },
  amarelo: {
    topBorder: '#f59e0b',
    cardBg: 'rgba(245,158,11,0.03)',   cardBorder: 'rgba(245,158,11,0.18)',
    iconBg: 'rgba(245,158,11,0.12)',   iconColor: '#f59e0b', iconShadow: 'rgba(245,158,11,0.25)',
    bar: 'from-amber-500 to-orange-400',
    badgeBg: 'rgba(245,158,11,0.10)',  badgeColor: '#fbbf24', badgeBorder: 'rgba(245,158,11,0.25)',
    badgeGlow: '0 0 12px rgba(245,158,11,0.30)',
    valorColor: '#f59e0b',
  },
  vermelho: {
    topBorder: '#ef4444',
    cardBg: 'rgba(239,68,68,0.03)',    cardBorder: 'rgba(239,68,68,0.18)',
    iconBg: 'rgba(239,68,68,0.12)',    iconColor: '#ef4444', iconShadow: 'rgba(239,68,68,0.25)',
    bar: 'from-rose-500 to-pink-400',
    badgeBg: 'rgba(239,68,68,0.10)',   badgeColor: '#f87171', badgeBorder: 'rgba(239,68,68,0.25)',
    badgeGlow: '0 0 12px rgba(239,68,68,0.30)',
    valorColor: '#ef4444',
  },
  neutro: {
    topBorder: 'transparent',
    cardBg: 'rgba(255,255,255,0.02)',  cardBorder: 'rgba(255,255,255,0.06)',
    iconBg: 'rgba(201,168,76,0.08)',   iconColor: 'var(--text-muted)', iconShadow: 'rgba(0,0,0,0)',
    bar: 'from-slate-600 to-slate-500',
    badgeBg: 'rgba(201,168,76,0.06)', badgeColor: 'var(--text-muted)', badgeBorder: 'rgba(201,168,76,0.12)',
    badgeGlow: 'none',
    valorColor: 'var(--text-secondary)',
  },
}

// ── Componente ────────────────────────────────────────────────────────────────

interface KPICardProps {
  kpi: KPIItem
  index: number
}

export default function KPICard({ kpi, index }: KPICardProps) {
  const barRef = useRef<HTMLDivElement>(null)
  const st = STATUS_STYLES[kpi.status]
  const Icone = (kpi.meta?.icone && ICON_MAP[kpi.meta.icone]) ? ICON_MAP[kpi.meta.icone] : pickIcon(kpi.label)
  const descricao = kpi.meta?.descricao || descreverKPI(kpi.label)
  const valorFmt = formatarExibicao(kpi.valor, kpi.unidade)
  const sufixo   = sufixoUnidade(kpi.unidade)

  const metaTexto = kpi.meta
    ? `${kpi.meta.tipo === 'maior_melhor' ? '≥' : '≤'} ${formatarExibicao(String(kpi.meta.verde_inicio), kpi.meta.unidade)}`
    : null

  useEffect(() => {
    const bar = barRef.current
    if (!bar || kpi.status === 'neutro') return
    const t = setTimeout(() => { bar.style.width = `${kpi.progresso}%` }, 80 + index * 30)
    return () => clearTimeout(t)
  }, [kpi.progresso, kpi.status, index])

  return (
    <div
      className="rounded-2xl border flex flex-col gap-2.5 relative overflow-hidden animate-fadeInUp"
      style={{
        background: st.cardBg,
        borderColor: st.cardBorder,
        borderTop: `3px solid ${st.topBorder}`,
        padding: '1rem',
        animationDelay: `${index * 40}ms`,
        transition: 'all 200ms cubic-bezier(0.4,0,0.2,1)',
        backdropFilter: 'blur(20px)',
      }}
      onMouseEnter={(e) => {
        const el = e.currentTarget as HTMLElement
        el.style.transform = 'translateY(-2px)'
        el.style.boxShadow = kpi.status !== 'neutro'
          ? `0 8px 32px rgba(0,0,0,0.4), ${st.badgeGlow}`
          : '0 8px 32px rgba(0,0,0,0.4)'
      }}
      onMouseLeave={(e) => {
        const el = e.currentTarget as HTMLElement
        el.style.transform = 'translateY(0)'
        el.style.boxShadow = 'none'
      }}
    >
      {/* Ícone + badge */}
      <div className="flex items-start justify-between gap-2">
        <div
          className="w-9 h-9 rounded-xl flex items-center justify-center shrink-0"
          style={{
            background: st.iconBg,
            color: st.iconColor,
            boxShadow: `0 4px 16px ${st.iconShadow}`,
          }}
        >
          <Icone size={16} />
        </div>
        {kpi.status !== 'neutro' && (
          <span
            className="text-[10px] font-semibold px-2 py-0.5 rounded-full border uppercase"
            role="status"
            style={{
              background: st.badgeBg,
              color: st.badgeColor,
              borderColor: st.badgeBorder,
              boxShadow: st.badgeGlow,
              letterSpacing: '0.06em',
            }}
          >
            {getLabelStatus(kpi.status, kpi.meta?.tipo)}
          </span>
        )}
      </div>

      {/* Label + tooltip */}
      <div className="flex items-center gap-1.5">
        <p
          className="text-xs font-semibold truncate flex-1 uppercase"
          style={{ color: 'var(--text-muted)', letterSpacing: '0.06em' }}
        >
          {kpi.label}
        </p>
        <InfoTooltip texto={descricao} />
      </div>

      {/* Valor */}
      <p
        className="leading-none tabular-nums"
        style={{
          fontFamily: 'var(--ff-display)',
          fontSize: '22px',
          fontWeight: 700,
          color: st.valorColor,
          fontVariantNumeric: 'tabular-nums',
        }}
      >
        {valorFmt}
        {valorFmt !== '—' && sufixo && (
          <span className="text-sm font-normal ml-0.5" style={{ color: 'var(--text-muted)' }}>
            {sufixo}
          </span>
        )}
      </p>

      {/* Meta */}
      {metaTexto && (
        <p className="text-[10px]" style={{ color: 'var(--text-muted)' }}>
          meta: <span style={{ color: 'var(--text-secondary)' }}>{metaTexto}</span>
        </p>
      )}

      {/* Barra de progresso */}
      {kpi.status !== 'neutro' && (
        <div className="mt-auto pt-1">
          <div className="rounded-full overflow-hidden" style={{ height: '3px', background: 'rgba(255,255,255,0.06)' }}>
            <div
              ref={barRef}
              className={clsx('h-full rounded-full bg-gradient-to-r transition-all duration-700', st.bar)}
              style={{ width: '0%' }}
            />
          </div>
        </div>
      )}
    </div>
  )
}
