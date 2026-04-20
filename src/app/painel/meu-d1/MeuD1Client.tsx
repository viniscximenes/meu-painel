'use client'

import React from 'react'
import { CheckCircle2, TrendingUp, AlertTriangle, Target } from 'lucide-react'
import { useCountUp } from '@/hooks/useCountUp'

export interface MeuD1Props {
  retidosKpi:    number
  canceladosKpi: number
  pedidosKpi:    number
  taxaKpi:       number

  retidosD1:    number
  canceladosD1: number
  pedidosD1:    number
  semDadosD1:   boolean
  txD1:         number | null

  retidosEst:    number
  canceladosEst: number
  pedidosEst:    number
  taxaEst:       number
  deltaTaxa:     number

  taxaProjetada:     number

  maxCanceladosDia:  number | null   // null = cota esgotada
  metaCanceladosMes: number

  horaAtualiz: string | null
  dataAtualiz: string | null
}

// ── Helpers ───────────────────────────────────────────────────────────────────

function formatDataPorExtenso(raw: string | null): string | null {
  if (!raw) return null
  const [dia, mes, ano] = raw.split('/')
  if (!dia || !mes || !ano) return raw
  try {
    return new Date(parseInt(ano), parseInt(mes) - 1, parseInt(dia))
      .toLocaleDateString('pt-BR', { day: 'numeric', month: 'long', year: 'numeric' })
  } catch { return raw }
}

function getTaxaColor(t: number)  { return t >= 66 ? 'var(--verde)' : t >= 60 ? 'var(--amarelo)' : 'var(--vermelho)' }
function getTaxaGlow(t: number)   { return t >= 66 ? 'rgba(74,222,128,0.07)' : t >= 60 ? 'rgba(250,204,21,0.07)' : 'rgba(248,113,113,0.07)' }
function getTaxaBorder(t: number) { return t >= 66 ? 'rgba(74,222,128,0.15)' : t >= 60 ? 'rgba(250,204,21,0.15)' : 'rgba(248,113,113,0.15)' }
function fmt1(n: number)          { return n.toFixed(1) }

type BadgeState = 'ok' | 'warn' | 'error' | 'muted'
const BADGE_STYLES: Record<BadgeState, { color: string; bg: string; border: string }> = {
  ok:    { color: 'var(--verde)',       bg: 'rgba(74,222,128,0.10)',  border: 'rgba(74,222,128,0.20)' },
  warn:  { color: 'var(--amarelo)',     bg: 'rgba(250,204,21,0.10)',  border: 'rgba(250,204,21,0.20)' },
  error: { color: 'var(--vermelho)',    bg: 'rgba(248,113,113,0.10)', border: 'rgba(248,113,113,0.20)' },
  muted: { color: 'var(--text-muted)', bg: 'rgba(148,163,184,0.06)', border: 'rgba(148,163,184,0.12)' },
}

// ── Shared components ─────────────────────────────────────────────────────────

function Badge({ children, state }: { children: React.ReactNode; state: BadgeState }) {
  const { color, bg, border } = BADGE_STYLES[state]
  return (
    <span style={{
      display: 'inline-flex', alignItems: 'center', gap: '4px',
      fontSize: '11px', fontWeight: 600, padding: '3px 8px', borderRadius: '4px',
      background: bg, border: `1px solid ${border}`, color,
    }}>
      {children}
    </span>
  )
}

function SectionTitle({ children }: { children: React.ReactNode }) {
  return (
    <div style={{ display: 'flex', alignItems: 'center', gap: '10px', marginBottom: '12px' }}>
      <span style={{
        fontFamily: 'var(--ff-display)', fontSize: '11px', fontWeight: 700,
        textTransform: 'uppercase', letterSpacing: '0.12em', color: 'rgba(244,212,124,0.7)',
      }}>
        {children}
      </span>
      <div style={{ flex: 1, height: '1px', background: 'linear-gradient(90deg, rgba(201,168,76,0.15) 0%, transparent 100%)' }} />
    </div>
  )
}

function SectionCard({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <div style={{
      background: 'var(--bg-card)', border: '1px solid rgba(201,168,76,0.08)',
      borderRadius: '12px', padding: '20px',
    }}>
      <SectionTitle>{title}</SectionTitle>
      {children}
    </div>
  )
}

// ── 1. Hero ───────────────────────────────────────────────────────────────────

function HeroTaxa(p: MeuD1Props) {
  const txShow = p.txD1 !== null ? p.txD1 : p.taxaKpi
  const txAnim = useCountUp(txShow)
  const label  = p.txD1 !== null ? 'TAXA DE RETENÇÃO HOJE' : 'KPI ACUMULADO DO MÊS'

  return (
    <div style={{
      position: 'relative', overflow: 'hidden',
      background: 'var(--bg-card)',
      border: `1px solid ${getTaxaBorder(txShow)}`,
      borderRadius: '12px',
      padding: '28px 24px',
      textAlign: 'center',
    }}>
      <div style={{
        position: 'absolute', inset: 0, pointerEvents: 'none',
        background: `radial-gradient(ellipse 70% 60% at 50% 0%, ${getTaxaGlow(txShow)} 0%, transparent 70%)`,
      }} />
      <p style={{
        fontSize: '11px', fontWeight: 600, textTransform: 'uppercase',
        letterSpacing: '0.15em', color: 'rgba(244,212,124,0.7)',
        marginBottom: '16px', position: 'relative', zIndex: 1,
      }}>
        {label}
      </p>
      <p style={{
        fontSize: '72px', fontWeight: 700, lineHeight: 1,
        fontVariantNumeric: 'tabular-nums',
        color: getTaxaColor(txShow),
        position: 'relative', zIndex: 1,
      }}>
        {fmt1(txAnim)}%
      </p>

      {/* Timestamp / status */}
      <div style={{ marginTop: '28px', position: 'relative', zIndex: 1 }}>
        {p.semDadosD1 ? (
          <p style={{ fontSize: '12px', color: 'rgba(255,255,255,0.50)', textAlign: 'center' }}>
            Aguardando primeiro report do dia
          </p>
        ) : p.horaAtualiz ? (
          <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: '4px' }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: '7px' }}>
              <div className="animate-pulse" style={{ width: '6px', height: '6px', borderRadius: '50%', background: '#10b981', flexShrink: 0 }} />
              <span style={{ fontSize: '13px', color: 'rgba(255,255,255,0.55)' }}>Último report:</span>
              <span style={{ fontSize: '14px', fontWeight: 600, color: 'rgba(255,255,255,0.95)' }}>{p.horaAtualiz}</span>
            </div>
            {formatDataPorExtenso(p.dataAtualiz) && (
              <span style={{ fontSize: '11px', color: 'rgba(255,255,255,0.45)' }}>
                {formatDataPorExtenso(p.dataAtualiz)}
              </span>
            )}
          </div>
        ) : (
          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '7px' }}>
            <div style={{ width: '6px', height: '6px', borderRadius: '50%', background: 'rgba(255,255,255,0.20)', flexShrink: 0 }} />
            <span style={{ fontSize: '13px', color: 'rgba(255,255,255,0.55)' }}>Último report:</span>
            <span style={{ fontSize: '14px', fontWeight: 600, color: 'rgba(255,255,255,0.95)' }}>--:--</span>
          </div>
        )}
      </div>
    </div>
  )
}

// ── 2. Trio ───────────────────────────────────────────────────────────────────

function TrioCard({ label, valor, cor }: { label: string; valor: number; cor: string }) {
  return (
    <div style={{
      flex: '1 1 0', padding: '16px 12px',
      background: 'var(--bg-card)',
      border: '1px solid rgba(201,168,76,0.08)',
      borderRadius: '12px', textAlign: 'center',
    }}>
      <p style={{
        fontSize: '11px', fontWeight: 600, textTransform: 'uppercase',
        letterSpacing: '0.10em', color: 'rgba(244,212,124,0.7)', marginBottom: '10px',
      }}>
        {label}
      </p>
      <p style={{ fontSize: '44px', fontWeight: 700, lineHeight: 1, fontVariantNumeric: 'tabular-nums', color: cor }}>
        {valor}
      </p>
    </div>
  )
}

function TrioIndicadores(p: MeuD1Props) {
  if (p.semDadosD1) {
    return (
      <div style={{
        padding: '16px', borderRadius: '12px',
        background: 'var(--bg-card)', border: '1px solid rgba(201,168,76,0.08)',
        display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '8px',
      }}>
        <AlertTriangle size={14} style={{ color: 'var(--text-muted)' }} />
        <p style={{ fontSize: '12px', color: 'var(--text-muted)' }}>Sem dados do dia ainda</p>
      </div>
    )
  }
  return (
    <div style={{ display: 'flex', gap: '10px' }}>
      <TrioCard label="Retidos"    valor={p.retidosD1}    cor="rgba(134,239,172,0.9)" />
      <TrioCard label="Cancelados" valor={p.canceladosD1} cor="rgba(252,165,165,0.9)" />
      <TrioCard label="Pedidos"    valor={p.pedidosD1}    cor="rgba(253,230,138,0.9)" />
    </div>
  )
}

// ── 3. Plano de Ação ──────────────────────────────────────────────────────────

const VALOR_NUM: React.CSSProperties = {
  fontSize: '30px', fontWeight: 700, lineHeight: 1,
  fontVariantNumeric: 'tabular-nums', color: 'rgba(255,255,255,0.95)',
}

type PlanoCardProps = {
  icon: React.ElementType
  titulo: string
  valor: React.ReactNode
  unidade: string
  descricao: string
  badge: React.ReactNode
}

function PlanoCard({ icon: Icon, titulo, valor, unidade, descricao, badge }: PlanoCardProps) {
  return (
    <div style={{
      flex: '1 1 130px', padding: '16px 14px',
      background: 'var(--bg-card)',
      border: '1px solid rgba(201,168,76,0.08)',
      borderRadius: '12px',
      display: 'flex', flexDirection: 'column', gap: '8px',
    }}>
      <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
        <Icon size={13} style={{ color: 'rgba(244,212,124,0.7)', flexShrink: 0 }} />
        <span style={{
          fontSize: '10px', fontWeight: 700, textTransform: 'uppercase',
          letterSpacing: '0.08em', color: 'rgba(244,212,124,0.7)',
        }}>
          {titulo}
        </span>
      </div>
      <div>
        {valor}
        <p style={{ fontSize: '11px', color: 'rgba(255,255,255,0.50)', marginTop: '2px' }}>{unidade}</p>
      </div>
      <p style={{ fontSize: '11px', color: 'rgba(255,255,255,0.55)', lineHeight: 1.4, flex: 1 }}>{descricao}</p>
      <div>{badge}</div>
    </div>
  )
}

function PlanoAcao(p: MeuD1Props) {
  const taxaProjAnim = useCountUp(p.taxaProjetada)
  const maxCancDia   = p.maxCanceladosDia

  // Badge projeção
  const projState: BadgeState = p.taxaEst >= p.taxaKpi ? 'ok' : p.taxaEst >= 66 ? 'warn' : 'error'

  // Badge cancelados
  const cancelBadgeState: BadgeState = (() => {
    if (p.semDadosD1) return 'muted'
    if (maxCancDia === null || p.canceladosD1 > maxCancDia) return 'error'
    if (p.canceladosD1 === maxCancDia) return 'warn'
    return 'ok'
  })()

  // Card C — Retidos: nova fórmula baseada nos dados do dia
  const META = 0.66
  const pedidosHoje = p.canceladosD1 + p.retidosD1
  const taxaHoje    = pedidosHoje > 0 ? p.retidosD1 / pedidosHoje : 0

  type RetidosEstado = 'na-meta' | 'abaixo-meta' | 'sem-pedidos'
  let retidosEstado: RetidosEstado
  let retidosVal: number | null

  if (pedidosHoje === 0) {
    retidosEstado = 'sem-pedidos'
    retidosVal = null
  } else if (taxaHoje >= META) {
    retidosEstado = 'na-meta'
    retidosVal = null
  } else {
    const x = (META * p.canceladosD1 - (1 - META) * p.retidosD1) / (1 - META)
    retidosEstado = 'abaixo-meta'
    retidosVal = Math.max(1, Math.ceil(x))
  }

  const retidosBadgeState: BadgeState = retidosEstado === 'na-meta' ? 'ok' : 'error'
  const retidosUnidade = retidosVal === 1 ? 'retenção necessária' : 'retenções necessárias'

  return (
    <div>
      <SectionTitle>Plano de Ação</SectionTitle>
      <div style={{ display: 'flex', gap: '10px', flexWrap: 'wrap' }}>

        {/* Card A — Projeção */}
        <PlanoCard
          icon={TrendingUp}
          titulo="Projeção"
          valor={<p style={VALOR_NUM}>{fmt1(taxaProjAnim)}%</p>}
          unidade="ao fim do mês"
          descricao="Se mantiver este ritmo"
          badge={
            <Badge state={projState}>
              KPI {fmt1(p.taxaKpi)}% → Est {fmt1(p.taxaEst)}%
            </Badge>
          }
        />

        {/* Card B — Cancelados máx/dia */}
        <PlanoCard
          icon={AlertTriangle}
          titulo="Cancelados"
          valor={maxCancDia === null
            ? <AlertTriangle size={30} style={{ color: 'var(--vermelho)' }} />
            : <p style={VALOR_NUM}>{maxCancDia}</p>
          }
          unidade={maxCancDia === null ? 'cota esgotada' : 'cancelamentos/dia no máximo'}
          descricao={maxCancDia === null
            ? 'Segure os cancelados hoje pra não afetar sua Tx. Retenção'
            : `Pra não passar dos ${p.metaCanceladosMes} do mês`
          }
          badge={
            p.semDadosD1
              ? <Badge state="muted">Sem dados hoje</Badge>
              : <Badge state={cancelBadgeState}>
                  {cancelBadgeState === 'ok'
                    ? <><CheckCircle2 size={10} />Hoje: {p.canceladosD1}</>
                    : <><AlertTriangle size={10} />Hoje: {p.canceladosD1}</>
                  }
                </Badge>
          }
        />

        {/* Card C — Retidos */}
        <PlanoCard
          icon={retidosEstado === 'na-meta' ? CheckCircle2 : retidosEstado === 'sem-pedidos' ? Target : Target}
          titulo="Retidos"
          valor={
            retidosEstado === 'na-meta'
              ? <CheckCircle2 size={30} style={{ color: 'var(--verde)' }} />
              : retidosEstado === 'sem-pedidos'
              ? <p style={{ ...VALOR_NUM, color: 'rgba(255,255,255,0.30)' }}>—</p>
              : <p style={VALOR_NUM}>{retidosVal}</p>
          }
          unidade={
            retidosEstado === 'na-meta' ? 'já está na meta'
            : retidosEstado === 'sem-pedidos' ? 'sem pedidos ainda hoje'
            : retidosUnidade
          }
          descricao={
            retidosEstado === 'na-meta' ? 'Mantenha sem cancelar mais'
            : retidosEstado === 'sem-pedidos' ? 'Aguardando dados do dia'
            : 'Pra bater 66% hoje'
          }
          badge={
            retidosEstado === 'sem-pedidos' ? null
            : p.semDadosD1
              ? <Badge state="muted">Sem dados hoje</Badge>
              : <Badge state={retidosBadgeState}>
                  {retidosEstado === 'na-meta'
                    ? <><CheckCircle2 size={10} />Você fez {p.retidosD1}</>
                    : <><AlertTriangle size={10} />Você fez {p.retidosD1}</>
                  }
                </Badge>
          }
        />
      </div>
    </div>
  )
}

// ── 4. Comparativo ────────────────────────────────────────────────────────────

function KpiTableRow({ label, kpi, est }: { label: string; kpi: string; est: string }) {
  return (
    <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
      <span style={{ flex: 1, fontSize: '13px', fontWeight: 400, color: 'rgba(255,255,255,0.70)' }}>{label}</span>
      <span style={{ fontSize: '13px', fontWeight: 600, color: 'rgba(255,255,255,0.95)', width: '72px', textAlign: 'right' }}>{kpi}</span>
      <span style={{ fontSize: '13px', fontWeight: 600, color: 'rgba(255,255,255,0.95)', width: '84px', textAlign: 'right' }}>{est}</span>
    </div>
  )
}

function ComparativoKPI(p: MeuD1Props) {
  return (
    <SectionCard title="Comparativo com KPI do Mês">
      <div style={{ display: 'flex', alignItems: 'center', gap: '8px', marginBottom: '12px' }}>
        <span style={{ flex: 1 }} />
        <span style={{
          fontSize: '10px', fontWeight: 700, textTransform: 'uppercase',
          letterSpacing: '0.10em', color: 'rgba(244,212,124,0.45)', width: '72px', textAlign: 'right',
        }}>
          KPI MÊS
        </span>
        <span style={{
          fontSize: '10px', fontWeight: 700, textTransform: 'uppercase',
          letterSpacing: '0.10em', color: 'rgba(244,212,124,0.45)', width: '84px', textAlign: 'right',
        }}>
          ESTIMATIVA
        </span>
      </div>
      <div style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
        <KpiTableRow label="Taxa de Retenção" kpi={`${fmt1(p.taxaKpi)}%`} est={p.semDadosD1 ? '—' : `${fmt1(p.taxaEst)}%`} />
        <KpiTableRow label="Retidos"    kpi={String(p.retidosKpi)}    est={p.semDadosD1 ? '—' : String(p.retidosEst)} />
        <KpiTableRow label="Cancelados" kpi={String(p.canceladosKpi)} est={p.semDadosD1 ? '—' : String(p.canceladosEst)} />
        <KpiTableRow label="Pedidos"    kpi={String(p.pedidosKpi)}    est={p.semDadosD1 ? '—' : String(p.pedidosEst)} />
      </div>
      {!p.semDadosD1 && (
        <p style={{ fontSize: '11px', color: 'rgba(255,255,255,0.38)', marginTop: '16px', textAlign: 'center' }}>
          Estimativa = KPI acumulado + dados D-1 de hoje
        </p>
      )}
    </SectionCard>
  )
}

// ── Main ──────────────────────────────────────────────────────────────────────

export default function MeuD1Client(p: MeuD1Props) {
  return (
    <>
      <style dangerouslySetInnerHTML={{ __html: `
        @keyframes d1FadeUp {
          from { opacity: 0; transform: translateY(10px); }
          to   { opacity: 1; transform: translateY(0); }
        }
        @media (prefers-reduced-motion: reduce) {
          .d1-fade { animation: none !important; }
        }
      `}} />
      <div style={{ display: 'flex', flexDirection: 'column', gap: '14px' }}>
        {[HeroTaxa, TrioIndicadores, PlanoAcao, ComparativoKPI].map((Comp, i) => (
          <div
            key={i}
            className="d1-fade"
            style={{ animation: `d1FadeUp 0.45s cubic-bezier(0.22,1,0.36,1) ${i * 60}ms both` }}
          >
            <Comp {...p} />
          </div>
        ))}
      </div>
    </>
  )
}
