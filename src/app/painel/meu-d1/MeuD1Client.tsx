'use client'

import { useState, useEffect } from 'react'
import { TrendingUp, TrendingDown, Minus, AlertTriangle, CheckCircle2, Target } from 'lucide-react'

export interface MeuD1Props {
  nomeOperador:    string
  mesLabel:        string
  ultimaAtualizacao: string | null

  // KPI acumulado do mês
  retidosKpi:   number
  canceladosKpi: number
  pedidosKpi:   number
  taxaKpi:      number

  // D-1 dados do dia
  retidosD1:    number
  canceladosD1: number
  pedidosD1:    number
  semDadosD1:   boolean

  // Estimado (KPI + D1)
  retidosEst:   number
  canceladosEst: number
  pedidosEst:   number
  taxaEst:      number
  deltaTaxa:    number

  // Projeção mensal
  diasUteisNoMes:           number
  diasPassados:             number
  diasRestantes:            number
  retidosPorDiaNecessario:  number
  jaEstaNaMeta:             boolean
  mediaDiariaRetidosEst:    number
}

// ── CountUp ───────────────────────────────────────────────────────────────────

function useCountUp(target: number, duration = 900) {
  const [val, setVal] = useState(0)
  useEffect(() => {
    if (target === 0) { setVal(0); return }
    let startTs: number | null = null
    let raf: number
    const tick = (ts: number) => {
      if (!startTs) startTs = ts
      const p = Math.min((ts - startTs) / duration, 1)
      setVal(target * (1 - Math.pow(1 - p, 3)))
      if (p < 1) { raf = requestAnimationFrame(tick) } else { setVal(target) }
    }
    raf = requestAnimationFrame(tick)
    return () => cancelAnimationFrame(raf)
  }, [target, duration])
  return val
}

// ── Helpers de cor ────────────────────────────────────────────────────────────

function taxaColor(t: number): string {
  if (t >= 66) return '#4ade80'
  if (t >= 60) return '#facc15'
  return '#f87171'
}

function taxaBg(t: number): string {
  if (t >= 66) return 'rgba(74,222,128,0.08)'
  if (t >= 60) return 'rgba(250,204,21,0.08)'
  return 'rgba(248,113,113,0.08)'
}

function taxaBorder(t: number): string {
  if (t >= 66) return 'rgba(74,222,128,0.18)'
  if (t >= 60) return 'rgba(250,204,21,0.18)'
  return 'rgba(248,113,113,0.18)'
}

function fmt1(n: number): string { return n.toFixed(1) }

// ── Dica do dia ───────────────────────────────────────────────────────────────

function gerarDica(p: MeuD1Props): { texto: string; tipo: 'verde' | 'amarelo' | 'vermelho' } {
  if (p.semDadosD1) {
    return { texto: 'Nenhum dado D-1 registrado ainda. Os dados são atualizados pela supervisão.', tipo: 'amarelo' }
  }
  const { deltaTaxa, canceladosD1, mediaDiariaRetidosEst, retidosD1, retidosPorDiaNecessario } = p

  if (deltaTaxa < -0.5) {
    return {
      texto: 'Seu cancelamento aumentou hoje. Foque em identificar objeções antes de transferir.',
      tipo: 'vermelho',
    }
  }
  if (canceladosD1 > mediaDiariaRetidosEst * 1.2 && canceladosD1 > 2) {
    return {
      texto: 'Você cancelou mais que o esperado hoje. Revise as objeções mais comuns com a gestão.',
      tipo: 'amarelo',
    }
  }
  if (retidosPorDiaNecessario > 0 && retidosD1 >= Math.ceil(retidosPorDiaNecessario)) {
    return {
      texto: 'Você está acima do ritmo necessário para bater a meta. Excelente!',
      tipo: 'verde',
    }
  }
  if (deltaTaxa >= 0.5) {
    return {
      texto: 'Ótimo dia! Continue com a abordagem de hoje.',
      tipo: 'verde',
    }
  }
  return {
    texto: 'Mantenha o foco na qualidade das negociações. Cada retenção conta para o resultado do mês.',
    tipo: 'amarelo',
  }
}

// ── Componentes de UI ─────────────────────────────────────────────────────────

function Section({ children, delay = 0 }: { children: React.ReactNode; delay?: number }) {
  return (
    <div style={{
      animation: `d1In 0.45s cubic-bezier(0.22,1,0.36,1) ${delay}ms both`,
    }}>
      {children}
    </div>
  )
}

function Card({ children, style }: { children: React.ReactNode; style?: React.CSSProperties }) {
  return (
    <div style={{
      background: 'var(--void3)',
      border: '1px solid rgba(201,168,76,0.08)',
      borderRadius: '14px',
      padding: '16px 18px',
      ...style,
    }}>
      {children}
    </div>
  )
}

function SectionTitle({ children }: { children: React.ReactNode }) {
  return (
    <p style={{
      fontSize: '10px', fontWeight: 700, textTransform: 'uppercase',
      letterSpacing: '0.12em', color: 'var(--text-muted)', marginBottom: '10px',
    }}>
      {children}
    </p>
  )
}

// ── Card Principal — Taxa de Retenção ─────────────────────────────────────────

function CardPrincipal(p: MeuD1Props) {
  const taxaKpiAnim  = useCountUp(p.taxaKpi)
  const taxaEstAnim  = useCountUp(p.taxaEst)
  const delta        = p.deltaTaxa
  const sinal        = delta > 0 ? '+' : ''
  const deltaColor   = delta >= 0 ? '#4ade80' : '#f87171'

  return (
    <Card style={{ background: 'var(--void2)' }}>
      <SectionTitle>Taxa de Retenção</SectionTitle>

      <div style={{ display: 'flex', alignItems: 'center', gap: '12px', flexWrap: 'wrap' }}>
        {/* KPI acumulado */}
        <div style={{
          flex: 1, minWidth: '120px', padding: '14px 16px', borderRadius: '12px',
          background: taxaBg(p.taxaKpi), border: `1px solid ${taxaBorder(p.taxaKpi)}`,
        }}>
          <p style={{ fontSize: '10px', color: 'var(--text-muted)', marginBottom: '6px', letterSpacing: '0.08em', textTransform: 'uppercase' }}>
            KPI do mês
          </p>
          <p style={{
            fontFamily: 'var(--ff-display)', fontSize: '32px', fontWeight: 700,
            color: taxaColor(p.taxaKpi), lineHeight: 1,
          }}>
            {fmt1(taxaKpiAnim)}%
          </p>
        </div>

        {/* Seta */}
        {!p.semDadosD1 && (
          <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: '4px', opacity: 0.5 }}>
            <div style={{ width: '32px', height: '1px', background: 'rgba(201,168,76,0.3)' }} />
            <span style={{ fontSize: '9px', color: 'var(--text-muted)', letterSpacing: '0.08em' }}>D-1</span>
            <div style={{ width: '32px', height: '1px', background: 'rgba(201,168,76,0.3)' }} />
          </div>
        )}

        {/* Estimativa */}
        {!p.semDadosD1 ? (
          <div style={{
            flex: 1, minWidth: '140px', padding: '14px 16px', borderRadius: '12px',
            background: taxaBg(p.taxaEst), border: `1px solid ${taxaBorder(p.taxaEst)}`,
          }}>
            <p style={{ fontSize: '10px', color: 'var(--text-muted)', marginBottom: '6px', letterSpacing: '0.08em', textTransform: 'uppercase' }}>
              Estimativa hoje
            </p>
            <div style={{ display: 'flex', alignItems: 'flex-end', gap: '10px', flexWrap: 'wrap' }}>
              <p style={{
                fontFamily: 'var(--ff-display)', fontSize: '40px', fontWeight: 700,
                color: taxaColor(p.taxaEst), lineHeight: 1,
              }}>
                {fmt1(taxaEstAnim)}%
              </p>
              <span style={{
                fontSize: '11px', fontWeight: 700, padding: '2px 7px',
                borderRadius: '6px',
                background: delta >= 0 ? 'rgba(74,222,128,0.12)' : 'rgba(248,113,113,0.12)',
                border: `1px solid ${delta >= 0 ? 'rgba(74,222,128,0.25)' : 'rgba(248,113,113,0.25)'}`,
                color: deltaColor,
                marginBottom: '4px',
              }}>
                {sinal}{fmt1(delta)}%
              </span>
            </div>
          </div>
        ) : (
          <div style={{
            flex: 1, minWidth: '140px', padding: '14px 16px', borderRadius: '12px',
            background: 'rgba(148,163,184,0.04)', border: '1px solid rgba(148,163,184,0.10)',
            display: 'flex', alignItems: 'center', justifyContent: 'center',
          }}>
            <span style={{ fontSize: '11px', color: 'var(--text-muted)' }}>Sem dados D-1 hoje</span>
          </div>
        )}
      </div>
    </Card>
  )
}

// ── Card Comparativo por Indicador ────────────────────────────────────────────

interface IndicadorCardProps {
  label:     string
  kpi:       number
  d1:        number
  total:     number
  positivo:  boolean  // mais = verde?
  semD1:     boolean
}

function IndicadorCard({ label, kpi, d1, total, positivo, semD1 }: IndicadorCardProps) {
  const kpiAnim = useCountUp(kpi)
  const d1Color = positivo ? '#4ade80' : '#f87171'
  const barKpiW = total > 0 ? Math.min(100, kpi / total * 100) : 80
  const barD1W  = total > 0 ? Math.min(100, d1 / total * 100) : 0

  return (
    <div style={{
      background: 'var(--void3)',
      border: '1px solid rgba(201,168,76,0.08)',
      borderRadius: '12px',
      padding: '14px 16px',
      flex: '1 1 130px',
      minWidth: '130px',
    }}>
      <p style={{ fontSize: '10px', color: 'var(--text-muted)', letterSpacing: '0.08em', textTransform: 'uppercase', marginBottom: '8px' }}>
        {label}
      </p>

      <div style={{ display: 'flex', alignItems: 'baseline', gap: '6px', flexWrap: 'wrap' }}>
        <span style={{ fontFamily: 'var(--ff-display)', fontSize: '24px', fontWeight: 700, color: 'var(--text-primary)', lineHeight: 1 }}>
          {Math.round(kpiAnim)}
        </span>
        {!semD1 && d1 > 0 && (
          <span style={{ fontSize: '13px', fontWeight: 700, color: d1Color }}>
            +{d1}
          </span>
        )}
      </div>

      {!semD1 && (
        <p style={{ fontSize: '11px', color: 'var(--text-muted)', marginTop: '4px' }}>
          Total estimado: {total}
        </p>
      )}

      {/* Barra comparativa */}
      <div style={{ marginTop: '10px', height: '5px', borderRadius: '99px', background: 'rgba(255,255,255,0.05)', overflow: 'hidden', position: 'relative' }}>
        <div style={{
          position: 'absolute', left: 0, top: 0, height: '100%',
          width: `${barKpiW}%`,
          background: 'rgba(201,168,76,0.4)',
          borderRadius: '99px',
          transition: 'width 0.8s cubic-bezier(0.22,1,0.36,1)',
        }} />
        {!semD1 && d1 > 0 && (
          <div style={{
            position: 'absolute', left: `${barKpiW}%`, top: 0, height: '100%',
            width: `${barD1W}%`,
            background: positivo ? 'rgba(74,222,128,0.6)' : 'rgba(248,113,113,0.6)',
            borderRadius: '0 99px 99px 0',
            transition: 'width 0.8s cubic-bezier(0.22,1,0.36,1) 0.2s',
          }} />
        )}
      </div>
    </div>
  )
}

function CardComparativo(p: MeuD1Props) {
  return (
    <Card>
      <SectionTitle>Comparativo por Indicador</SectionTitle>
      <div style={{ display: 'flex', gap: '10px', flexWrap: 'wrap' }}>
        <IndicadorCard
          label="Retidos" kpi={p.retidosKpi} d1={p.retidosD1}
          total={p.retidosEst} positivo semD1={p.semDadosD1}
        />
        <IndicadorCard
          label="Cancelados" kpi={p.canceladosKpi} d1={p.canceladosD1}
          total={p.canceladosEst} positivo={false} semD1={p.semDadosD1}
        />
        <IndicadorCard
          label="Pedidos" kpi={p.pedidosKpi} d1={p.pedidosD1}
          total={p.pedidosEst} positivo semD1={p.semDadosD1}
        />
      </div>
    </Card>
  )
}

// ── Card Cenário até fim do mês ───────────────────────────────────────────────

function CardCenario(p: MeuD1Props) {
  const rpdAnim = useCountUp(Math.max(0, p.retidosPorDiaNecessario))
  const { jaEstaNaMeta, retidosD1, retidosPorDiaNecessario, diasRestantes, diasPassados, diasUteisNoMes, semDadosD1 } = p
  const retidosNecessariosHoje = Math.ceil(retidosPorDiaNecessario)
  const hojeAcimaDoNecessario  = !semDadosD1 && retidosD1 >= retidosNecessariosHoje
  const progressoPct = diasUteisNoMes > 0 ? Math.min(100, diasPassados / diasUteisNoMes * 100) : 0

  return (
    <Card>
      <SectionTitle>Para fechar o mês em 66% de retenção</SectionTitle>

      {jaEstaNaMeta ? (
        <div style={{ display: 'flex', flexDirection: 'column', gap: '10px' }}>
          <div style={{
            display: 'inline-flex', alignItems: 'center', gap: '8px',
            padding: '8px 14px', borderRadius: '10px',
            background: 'rgba(74,222,128,0.08)', border: '1px solid rgba(74,222,128,0.2)',
            alignSelf: 'flex-start',
          }}>
            <CheckCircle2 size={15} style={{ color: '#4ade80' }} />
            <span style={{ fontSize: '13px', fontWeight: 600, color: '#4ade80' }}>Você já está na meta! 🎯</span>
          </div>
          <p style={{ fontSize: '12px', color: 'var(--text-muted)' }}>
            Mantenha o ritmo atual para fechar o mês bem.
          </p>
        </div>
      ) : (
        <div style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
          <div style={{ display: 'flex', alignItems: 'baseline', gap: '8px', flexWrap: 'wrap' }}>
            <span style={{
              fontFamily: 'var(--ff-display)', fontSize: '28px', fontWeight: 700,
              color: 'var(--gold)',
            }}>
              {Math.ceil(rpdAnim)}
            </span>
            <span style={{ fontSize: '13px', color: 'var(--text-secondary)' }}>
              retenções por dia
            </span>
          </div>
          <p style={{ fontSize: '12px', color: 'var(--text-muted)' }}>
            nos próximos <strong style={{ color: 'var(--text-secondary)' }}>{diasRestantes}</strong> dias úteis restantes
          </p>

          {!semDadosD1 && (
            <div style={{
              display: 'flex', alignItems: 'center', gap: '8px', padding: '8px 12px',
              borderRadius: '10px',
              background: hojeAcimaDoNecessario ? 'rgba(74,222,128,0.06)' : 'rgba(248,113,113,0.06)',
              border: `1px solid ${hojeAcimaDoNecessario ? 'rgba(74,222,128,0.18)' : 'rgba(248,113,113,0.18)'}`,
            }}>
              {hojeAcimaDoNecessario
                ? <CheckCircle2 size={13} style={{ color: '#4ade80', flexShrink: 0 }} />
                : <AlertTriangle size={13} style={{ color: '#f87171', flexShrink: 0 }} />
              }
              <span style={{ fontSize: '12px', color: hojeAcimaDoNecessario ? '#4ade80' : '#f87171' }}>
                Hoje você reteve {retidosD1}, precisava de {retidosNecessariosHoje}
              </span>
            </div>
          )}
        </div>
      )}

      {/* Barra de progresso do mês */}
      <div style={{ marginTop: '16px' }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '6px' }}>
          <span style={{ fontSize: '10px', color: 'var(--text-muted)' }}>Dias passados: {diasPassados}</span>
          <span style={{ fontSize: '10px', color: 'var(--text-muted)' }}>Restantes: {diasRestantes}</span>
        </div>
        <div style={{ height: '6px', borderRadius: '99px', background: 'rgba(255,255,255,0.05)', overflow: 'hidden', position: 'relative' }}>
          <div style={{
            height: '100%', borderRadius: '99px',
            width: `${progressoPct}%`,
            background: 'linear-gradient(90deg, rgba(201,168,76,0.6) 0%, rgba(232,201,109,0.8) 100%)',
            transition: 'width 1s cubic-bezier(0.22,1,0.36,1)',
          }} />
        </div>
        <p style={{ fontSize: '10px', color: 'var(--text-muted)', marginTop: '4px', textAlign: 'center' }}>
          {diasPassados} de {diasUteisNoMes} dias úteis do mês
        </p>
      </div>
    </Card>
  )
}

// ── Card Dica do Dia ──────────────────────────────────────────────────────────

function CardDica(p: MeuD1Props) {
  const dica = gerarDica(p)
  const cor = dica.tipo === 'verde' ? '#4ade80' : dica.tipo === 'vermelho' ? '#f87171' : '#facc15'
  const bg  = dica.tipo === 'verde' ? 'rgba(74,222,128,0.06)' : dica.tipo === 'vermelho' ? 'rgba(248,113,113,0.06)' : 'rgba(250,204,21,0.06)'
  const bd  = dica.tipo === 'verde' ? 'rgba(74,222,128,0.15)' : dica.tipo === 'vermelho' ? 'rgba(248,113,113,0.15)' : 'rgba(250,204,21,0.15)'

  const Icon = dica.tipo === 'verde' ? CheckCircle2 : dica.tipo === 'vermelho' ? AlertTriangle : Target

  return (
    <div style={{
      display: 'flex', alignItems: 'flex-start', gap: '10px',
      padding: '12px 14px', borderRadius: '12px',
      background: bg, border: `1px solid ${bd}`,
    }}>
      <Icon size={15} style={{ color: cor, flexShrink: 0, marginTop: '1px' }} />
      <div>
        <p style={{ fontSize: '10px', fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.08em', color: cor, marginBottom: '4px' }}>
          Dica do dia
        </p>
        <p style={{ fontSize: '12px', color: 'var(--text-secondary)', lineHeight: 1.55 }}>
          {dica.texto}
        </p>
      </div>
    </div>
  )
}

// ── Componente principal ──────────────────────────────────────────────────────

export default function MeuD1Client(p: MeuD1Props) {
  return (
    <>
      <style dangerouslySetInnerHTML={{ __html: `
        @keyframes d1In {
          from { opacity: 0; transform: translateY(10px); }
          to   { opacity: 1; transform: translateY(0); }
        }
      `}} />

      <div className="space-y-3">
        <Section delay={0}><CardPrincipal {...p} /></Section>
        <Section delay={60}><CardComparativo {...p} /></Section>
        <Section delay={120}><CardCenario {...p} /></Section>
        <Section delay={180}><CardDica {...p} /></Section>
      </div>
    </>
  )
}
