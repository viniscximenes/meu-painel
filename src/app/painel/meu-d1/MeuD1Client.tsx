'use client'

import { useState, useEffect } from 'react'
import { AlertTriangle, CheckCircle2, Target, TrendingUp, ChevronDown } from 'lucide-react'

export interface MeuD1Props {
  nomeOperador: string
  mesLabel:     string
  horaAtualiz:  string | null
  dataAtualiz:  string | null

  // KPI acumulado do mês
  retidosKpi:    number
  canceladosKpi: number
  pedidosKpi:    number
  taxaKpi:       number

  // D-1 dados do dia (col B=cancelados, C=retidos, D=pedidos, E=txRetencao)
  retidosD1:    number
  canceladosD1: number
  pedidosD1:    number
  semDadosD1:   boolean
  txD1:         number | null

  // Estimado (KPI + D1)
  retidosEst:    number
  canceladosEst: number
  pedidosEst:    number
  taxaEst:       number
  deltaTaxa:     number

  // Projeção mensal
  diasUteisNoMes:          number
  diasPassados:            number
  diasRestantes:           number
  retidosPorDiaNecessario: number
  jaEstaNaMeta:            boolean
  taxaProjetada:           number
  maxCanceladosDiaBon:     number
}

// ── CountUp ───────────────────────────────────────────────────────────────────

function useCountUp(target: number, duration = 1000) {
  const [val, setVal] = useState(0)
  useEffect(() => {
    if (target === 0) { setVal(0); return }
    let startTs: number | null = null
    let raf: number
    const tick = (ts: number) => {
      if (!startTs) startTs = ts
      const prog = Math.min((ts - startTs) / duration, 1)
      setVal(target * (1 - Math.pow(1 - prog, 3)))
      if (prog < 1) { raf = requestAnimationFrame(tick) } else { setVal(target) }
    }
    raf = requestAnimationFrame(tick)
    return () => cancelAnimationFrame(raf)
  }, [target, duration])
  return val
}

// ── Helpers ───────────────────────────────────────────────────────────────────

function taxaColor(t: number)  { return t >= 66 ? '#4ade80' : t >= 60 ? '#facc15' : '#f87171' }
function taxaBg(t: number)     { return t >= 66 ? 'rgba(74,222,128,0.06)' : t >= 60 ? 'rgba(250,204,21,0.06)' : 'rgba(248,113,113,0.06)' }
function taxaBorder(t: number) { return t >= 66 ? 'rgba(74,222,128,0.15)' : t >= 60 ? 'rgba(250,204,21,0.15)' : 'rgba(248,113,113,0.15)' }
function fmt1(n: number)       { return n.toFixed(1) }

function Badge({ children, cor, bg, bd }: { children: React.ReactNode; cor: string; bg: string; bd: string }) {
  return (
    <span style={{
      display: 'inline-flex', alignItems: 'center', gap: '4px',
      fontSize: '11px', fontWeight: 600, padding: '3px 9px', borderRadius: '99px',
      background: bg, border: `1px solid ${bd}`, color: cor,
    }}>
      {children}
    </span>
  )
}

function SectionHeading({ children }: { children: React.ReactNode }) {
  return (
    <p style={{
      fontSize: '9px', fontWeight: 700, textTransform: 'uppercase',
      letterSpacing: '0.14em', color: 'var(--text-muted)', marginBottom: '10px',
    }}>
      {children}
    </p>
  )
}

function Fade({ delay, children }: { delay: number; children: React.ReactNode }) {
  return (
    <div style={{ animation: `d1FadeUp 0.5s cubic-bezier(0.22,1,0.36,1) ${delay}ms both` }}>
      {children}
    </div>
  )
}

// ── SEÇÃO 1 — Hero: Taxa do dia ───────────────────────────────────────────────

function HeroTaxa(p: MeuD1Props) {
  const txShow  = p.txD1 !== null ? p.txD1 : p.taxaKpi
  const txAnim  = useCountUp(txShow)
  const label   = p.txD1 !== null ? 'Taxa de retenção hoje' : 'KPI do mês'

  return (
    <div style={{
      background: 'var(--void2)',
      border: `1px solid ${taxaBorder(txShow)}`,
      borderRadius: '16px',
      padding: '28px 24px 22px',
      textAlign: 'center',
      position: 'relative',
      overflow: 'hidden',
    }}>
      {/* Glow de fundo */}
      <div style={{
        position: 'absolute', inset: 0, pointerEvents: 'none',
        background: `radial-gradient(ellipse 70% 60% at 50% 0%, ${taxaBg(txShow)} 0%, transparent 70%)`,
      }} />

      <p style={{
        fontSize: '9px', fontWeight: 700, textTransform: 'uppercase',
        letterSpacing: '0.16em', color: 'var(--gold)', marginBottom: '12px',
        position: 'relative',
      }}>
        {label}
      </p>

      <p style={{
        fontFamily: 'var(--ff-display)', fontSize: '80px', fontWeight: 700, lineHeight: 1,
        color: taxaColor(txShow), position: 'relative',
      }}>
        {fmt1(txAnim)}%
      </p>

      {/* Hora de atualização */}
      {p.horaAtualiz ? (
        <div style={{ marginTop: '16px', display: 'flex', flexDirection: 'column', alignItems: 'center', gap: '2px', position: 'relative' }}>
          <span style={{
            fontFamily: 'var(--ff-display)', fontSize: '18px', fontWeight: 700, color: 'var(--gold)',
          }}>
            Atualizado às {p.horaAtualiz}
          </span>
          {p.dataAtualiz && (
            <span style={{ fontSize: '11px', color: 'var(--text-muted)' }}>{p.dataAtualiz}</span>
          )}
        </div>
      ) : (
        <p style={{ marginTop: '14px', fontSize: '11px', color: 'var(--text-muted)', position: 'relative' }}>
          {p.semDadosD1 ? 'Sem dados D-1 hoje — exibindo KPI acumulado' : 'Sem horário de atualização'}
        </p>
      )}
    </div>
  )
}

// ── SEÇÃO 2 — Trio: Retidos / Cancelados / Pedidos ───────────────────────────

function TrioCard({ label, valor, cor }: { label: string; valor: number; cor: string }) {
  return (
    <div style={{
      flex: '1 1 90px', padding: '16px 14px',
      background: 'var(--void3)',
      border: '1px solid rgba(201,168,76,0.08)',
      borderRadius: '14px',
      textAlign: 'center',
    }}>
      <p style={{
        fontSize: '9px', fontWeight: 700, textTransform: 'uppercase',
        letterSpacing: '0.12em', color: 'var(--text-muted)', marginBottom: '8px',
      }}>
        {label}
      </p>
      <p style={{ fontFamily: 'var(--ff-display)', fontSize: '36px', fontWeight: 700, color: cor, lineHeight: 1 }}>
        {valor}
      </p>
    </div>
  )
}

function TrioIndicadores(p: MeuD1Props) {
  if (p.semDadosD1) return null
  return (
    <div style={{ display: 'flex', gap: '10px' }}>
      <TrioCard label="Retidos"    valor={p.retidosD1}    cor="#4ade80" />
      <TrioCard label="Cancelados" valor={p.canceladosD1} cor="#f87171" />
      <TrioCard label="Pedidos"    valor={p.pedidosD1}    cor="var(--text-primary)" />
    </div>
  )
}

// ── SEÇÃO 3 — Plano de Ação: 3 cards ─────────────────────────────────────────

function PlanoCard({
  icon: Icon, iconColor, numero, unidade, linha, badge,
}: {
  icon: React.ElementType
  iconColor: string
  numero: string
  unidade: string
  linha: string
  badge: React.ReactNode
}) {
  return (
    <div style={{
      flex: '1 1 130px', padding: '16px 14px',
      background: 'var(--void3)',
      border: '1px solid rgba(201,168,76,0.08)',
      borderRadius: '14px',
      display: 'flex', flexDirection: 'column', gap: '8px',
    }}>
      <Icon size={15} style={{ color: iconColor }} />
      <div>
        <p style={{ fontFamily: 'var(--ff-display)', fontSize: '32px', fontWeight: 700, color: iconColor, lineHeight: 1 }}>
          {numero}
        </p>
        <p style={{ fontSize: '11px', color: 'var(--text-muted)', marginTop: '3px' }}>{unidade}</p>
      </div>
      <p style={{ fontSize: '11px', color: 'var(--text-secondary)', lineHeight: 1.4 }}>{linha}</p>
      <div>{badge}</div>
    </div>
  )
}

function PlanoAcao(p: MeuD1Props) {
  const taxaProjAnim   = useCountUp(p.taxaProjetada)
  const retidosNecHoje = Math.ceil(p.retidosPorDiaNecessario)
  const maxCancelFloor = Math.floor(p.maxCanceladosDiaBon)
  const bonusPossivel  = p.maxCanceladosDiaBon > 0

  const projCor       = taxaColor(p.taxaProjetada)
  const projBadgeBg   = taxaBg(p.taxaProjetada)
  const projBadgeBd   = taxaBorder(p.taxaProjetada)
  const projTexto     = p.taxaProjetada >= 66 ? 'Vai bater a meta!' : p.taxaProjetada >= 60 ? 'Próximo da meta' : 'Abaixo da meta'

  const hojeOkCancel  = !p.semDadosD1 && p.canceladosD1 <= maxCancelFloor
  const c2BadgeCor    = !bonusPossivel ? '#f87171' : hojeOkCancel ? '#4ade80' : '#facc15'
  const c2BadgeBg     = !bonusPossivel ? 'rgba(248,113,113,0.1)' : hojeOkCancel ? 'rgba(74,222,128,0.1)' : 'rgba(250,204,21,0.1)'
  const c2BadgeBd     = !bonusPossivel ? 'rgba(248,113,113,0.2)' : hojeOkCancel ? 'rgba(74,222,128,0.2)' : 'rgba(250,204,21,0.2)'
  const c2BadgeTexto  = !bonusPossivel ? 'Meta impossível' : !p.semDadosD1 ? `Hoje: ${p.canceladosD1} ${hojeOkCancel ? '✓' : '⚠'}` : `Máx ${maxCancelFloor}/dia`

  const hojeOkRetidos = !p.semDadosD1 && p.retidosD1 >= retidosNecHoje
  const c3BadgeCor    = p.semDadosD1 ? 'var(--text-muted)' : hojeOkRetidos ? '#4ade80' : '#f87171'
  const c3BadgeBg     = p.semDadosD1 ? 'rgba(148,163,184,0.06)' : hojeOkRetidos ? 'rgba(74,222,128,0.1)' : 'rgba(248,113,113,0.1)'
  const c3BadgeBd     = p.semDadosD1 ? 'rgba(148,163,184,0.12)' : hojeOkRetidos ? 'rgba(74,222,128,0.2)' : 'rgba(248,113,113,0.2)'
  const c3BadgeTexto  = p.semDadosD1 ? 'Sem dados hoje' : `Você fez ${p.retidosD1} ${hojeOkRetidos ? '✓' : '⚠'}`

  return (
    <div>
      <SectionHeading>Plano de Ação</SectionHeading>
      <div style={{ display: 'flex', gap: '10px', flexWrap: 'wrap' }}>
        {/* Card A — Projeção */}
        <PlanoCard
          icon={TrendingUp}
          iconColor={projCor}
          numero={`${fmt1(taxaProjAnim)}%`}
          unidade="projeção ao fim do mês"
          linha="Se mantiver este ritmo"
          badge={<Badge cor={projCor} bg={projBadgeBg} bd={projBadgeBd}>{projTexto}</Badge>}
        />

        {/* Card B — Limite cancelamentos */}
        <PlanoCard
          icon={AlertTriangle}
          iconColor={bonusPossivel ? 'var(--gold)' : '#f87171'}
          numero={bonusPossivel ? String(maxCancelFloor) : '—'}
          unidade="cancelamentos/dia no máximo"
          linha={bonusPossivel ? `Para fechar em 66% nos próximos ${p.diasRestantes} dias` : 'Atingir 66% não é mais possível'}
          badge={<Badge cor={c2BadgeCor} bg={c2BadgeBg} bd={c2BadgeBd}>{c2BadgeTexto}</Badge>}
        />

        {/* Card C — Retidos necessários hoje */}
        <PlanoCard
          icon={Target}
          iconColor="var(--gold)"
          numero={p.jaEstaNaMeta ? '✓' : String(retidosNecHoje)}
          unidade={p.jaEstaNaMeta ? 'já está na meta!' : 'retenções para manter o ritmo'}
          linha={p.jaEstaNaMeta ? 'Mantenha o ritmo atual' : 'Necessário hoje para fechar em 66%'}
          badge={<Badge cor={c3BadgeCor} bg={c3BadgeBg} bd={c3BadgeBd}>{c3BadgeTexto}</Badge>}
        />
      </div>
    </div>
  )
}

// ── SEÇÃO 4 — Comparativo KPI (colapsível) ────────────────────────────────────

function ComparativoKPI(p: MeuD1Props) {
  const [aberto, setAberto] = useState(false)

  return (
    <div style={{
      background: 'var(--void3)',
      border: '1px solid rgba(201,168,76,0.06)',
      borderRadius: '14px',
      overflow: 'hidden',
    }}>
      <button
        type="button"
        onClick={() => setAberto(v => !v)}
        style={{
          width: '100%', padding: '12px 16px',
          display: 'flex', alignItems: 'center', justifyContent: 'space-between',
          background: 'none', border: 'none', cursor: 'pointer',
        }}
      >
        <span style={{
          fontSize: '11px', fontWeight: 600, color: 'var(--text-muted)',
          letterSpacing: '0.06em',
        }}>
          Ver comparativo com KPI do mês
        </span>
        <ChevronDown
          size={13}
          style={{
            color: 'var(--text-muted)', flexShrink: 0,
            transition: 'transform 0.3s ease',
            transform: aberto ? 'rotate(0deg)' : 'rotate(-90deg)',
          }}
        />
      </button>

      <div style={{
        maxHeight: aberto ? '400px' : '0',
        overflow: 'hidden',
        transition: 'max-height 0.35s cubic-bezier(0.4,0,0.2,1)',
      }}>
        <div style={{ padding: '0 16px 16px', display: 'flex', flexDirection: 'column', gap: '12px' }}>
          <div style={{ height: '1px', background: 'rgba(201,168,76,0.06)' }} />

          {/* Linha taxa */}
          <KpiRow label="Taxa de Retenção" kpi={`${fmt1(p.taxaKpi)}%`} est={p.semDadosD1 ? '—' : `${fmt1(p.taxaEst)}%`} />

          {/* Linhas numéricas */}
          <KpiRow label="Retidos"    kpi={String(p.retidosKpi)}    est={p.semDadosD1 ? '—' : String(p.retidosEst)} />
          <KpiRow label="Cancelados" kpi={String(p.canceladosKpi)} est={p.semDadosD1 ? '—' : String(p.canceladosEst)} />
          <KpiRow label="Pedidos"    kpi={String(p.pedidosKpi)}    est={p.semDadosD1 ? '—' : String(p.pedidosEst)} />

          {!p.semDadosD1 && (
            <p style={{ fontSize: '10px', color: 'var(--text-muted)', opacity: 0.7, textAlign: 'center' }}>
              Estimativa = KPI acumulado + dados D-1 de hoje
            </p>
          )}
        </div>
      </div>
    </div>
  )
}

function KpiRow({ label, kpi, est }: { label: string; kpi: string; est: string }) {
  return (
    <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
      <span style={{ fontSize: '12px', color: 'var(--text-muted)' }}>{label}</span>
      <div style={{ display: 'flex', gap: '20px' }}>
        <div style={{ textAlign: 'right' }}>
          <p style={{ fontSize: '9px', color: 'var(--text-muted)', letterSpacing: '0.08em', marginBottom: '1px' }}>KPI</p>
          <p style={{ fontSize: '13px', fontWeight: 600, color: 'var(--text-secondary)' }}>{kpi}</p>
        </div>
        <div style={{ textAlign: 'right' }}>
          <p style={{ fontSize: '9px', color: 'var(--text-muted)', letterSpacing: '0.08em', marginBottom: '1px' }}>Estimativa</p>
          <p style={{ fontSize: '13px', fontWeight: 600, color: 'var(--text-primary)' }}>{est}</p>
        </div>
      </div>
    </div>
  )
}

// ── Componente principal ──────────────────────────────────────────────────────

export default function MeuD1Client(p: MeuD1Props) {
  return (
    <>
      <style dangerouslySetInnerHTML={{ __html: `
        @keyframes d1FadeUp {
          from { opacity: 0; transform: translateY(12px); }
          to   { opacity: 1; transform: translateY(0); }
        }
      `}} />

      <div style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
        <Fade delay={0}><HeroTaxa {...p} /></Fade>
        {!p.semDadosD1 && <Fade delay={60}><TrioIndicadores {...p} /></Fade>}
        <Fade delay={120}><PlanoAcao {...p} /></Fade>
        <Fade delay={180}><ComparativoKPI {...p} /></Fade>
      </div>
    </>
  )
}
