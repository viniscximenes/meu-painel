'use client'

import { useState, useEffect } from 'react'
import { AlertTriangle, CheckCircle2, Target, TrendingUp } from 'lucide-react'

export interface MeuD1Props {
  nomeOperador: string
  mesLabel:     string

  // KPI acumulado do mês
  retidosKpi:    number
  canceladosKpi: number
  pedidosKpi:    number
  taxaKpi:       number

  // D-1 dados do dia (col B=retidos, C=cancelados, D=pedidos)
  retidosD1:    number
  canceladosD1: number
  pedidosD1:    number
  semDadosD1:   boolean

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

  // Cenários Plano de Ação
  taxaProjetada:       number  // projeção ao ritmo atual
  maxCanceladosDiaBon: number  // máx cancel/dia para 63.6% (negativo = impossível)
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

function taxaColor(t: number)  { return t >= 66 ? '#4ade80' : t >= 60 ? '#facc15' : '#f87171' }
function taxaBg(t: number)     { return t >= 66 ? 'rgba(74,222,128,0.08)' : t >= 60 ? 'rgba(250,204,21,0.08)' : 'rgba(248,113,113,0.08)' }
function taxaBorder(t: number) { return t >= 66 ? 'rgba(74,222,128,0.18)' : t >= 60 ? 'rgba(250,204,21,0.18)' : 'rgba(248,113,113,0.18)' }
function fmt1(n: number)       { return n.toFixed(1) }

// ── Componentes base ──────────────────────────────────────────────────────────

function Section({ children, delay = 0 }: { children: React.ReactNode; delay?: number }) {
  return (
    <div style={{ animation: `d1In 0.45s cubic-bezier(0.22,1,0.36,1) ${delay}ms both` }}>
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

// ── Card Principal — hierarquia: estimativa = protagonista ────────────────────

function CardPrincipal(p: MeuD1Props) {
  const taxaEstAnim = useCountUp(p.taxaEst)
  const delta       = p.deltaTaxa
  const sinal       = delta > 0 ? '+' : ''
  const deltaColor  = delta >= 0 ? '#4ade80' : '#f87171'

  return (
    <Card style={{ background: 'var(--void2)' }}>
      <SectionTitle>Taxa de Retenção</SectionTitle>

      <div style={{ display: 'flex', alignItems: 'flex-start', gap: '20px', flexWrap: 'wrap' }}>
        {/* Estimativa — protagonista */}
        <div style={{
          flex: '1 1 180px',
          padding: '16px 18px', borderRadius: '12px',
          background: taxaBg(p.taxaEst), border: `1px solid ${taxaBorder(p.taxaEst)}`,
        }}>
          <p style={{ fontSize: '10px', color: 'var(--text-muted)', marginBottom: '8px', letterSpacing: '0.08em', textTransform: 'uppercase' }}>
            {p.semDadosD1 ? 'KPI do mês' : 'Estimativa hoje'}
          </p>
          <div style={{ display: 'flex', alignItems: 'flex-end', gap: '10px', flexWrap: 'wrap' }}>
            <span style={{
              fontFamily: 'var(--ff-display)', fontSize: '48px', fontWeight: 700,
              color: taxaColor(p.taxaEst), lineHeight: 1,
            }}>
              {fmt1(taxaEstAnim)}%
            </span>
            {!p.semDadosD1 && (
              <span style={{
                fontSize: '12px', fontWeight: 700, padding: '2px 8px', borderRadius: '6px',
                background: delta >= 0 ? 'rgba(74,222,128,0.12)' : 'rgba(248,113,113,0.12)',
                border: `1px solid ${delta >= 0 ? 'rgba(74,222,128,0.25)' : 'rgba(248,113,113,0.25)'}`,
                color: deltaColor, marginBottom: '6px',
              }}>
                {sinal}{fmt1(delta)}%
              </span>
            )}
          </div>
          {p.semDadosD1 && (
            <span style={{
              display: 'inline-block', marginTop: '8px', fontSize: '11px',
              color: 'var(--text-muted)', padding: '2px 8px', borderRadius: '6px',
              background: 'rgba(148,163,184,0.08)', border: '1px solid rgba(148,163,184,0.12)',
            }}>
              Sem dados D-1 hoje
            </span>
          )}
        </div>

        {/* KPI acumulado — referência discreta */}
        {!p.semDadosD1 && (
          <div style={{ display: 'flex', flexDirection: 'column', gap: '4px', paddingTop: '4px' }}>
            <p style={{ fontSize: '10px', color: 'var(--text-muted)', letterSpacing: '0.08em', textTransform: 'uppercase' }}>
              KPI do mês
            </p>
            <span style={{
              fontFamily: 'var(--ff-display)', fontSize: '22px', fontWeight: 700,
              color: 'var(--text-muted)', lineHeight: 1,
            }}>
              {fmt1(p.taxaKpi)}%
            </span>
            <p style={{ fontSize: '10px', color: 'var(--text-muted)', opacity: 0.6 }}>
              acumulado
            </p>
          </div>
        )}
      </div>
    </Card>
  )
}

// ── Card Comparativo por Indicador ────────────────────────────────────────────

interface IndicadorCardProps {
  label:    string
  kpi:      number
  d1:       number
  total:    number
  positivo: boolean
  semD1:    boolean
}

function IndicadorCard({ label, kpi, d1, total, positivo, semD1 }: IndicadorCardProps) {
  const kpiAnim = useCountUp(kpi)
  const d1Color = positivo ? '#4ade80' : '#f87171'
  const barKpiW = total > 0 ? Math.min(100, kpi / total * 100) : 80
  const barD1W  = total > 0 ? Math.min(100, d1 / total * 100) : 0

  return (
    <div style={{
      background: 'var(--void3)', border: '1px solid rgba(201,168,76,0.08)',
      borderRadius: '12px', padding: '14px 16px', flex: '1 1 130px', minWidth: '130px',
    }}>
      <p style={{ fontSize: '10px', color: 'var(--text-muted)', letterSpacing: '0.08em', textTransform: 'uppercase', marginBottom: '8px' }}>
        {label}
      </p>
      <div style={{ display: 'flex', alignItems: 'baseline', gap: '6px', flexWrap: 'wrap' }}>
        <span style={{ fontFamily: 'var(--ff-display)', fontSize: '24px', fontWeight: 700, color: 'var(--text-primary)', lineHeight: 1 }}>
          {Math.round(kpiAnim)}
        </span>
        {!semD1 && d1 > 0 && (
          <span style={{ fontSize: '13px', fontWeight: 700, color: d1Color }}>+{d1}</span>
        )}
      </div>
      {!semD1 && (
        <p style={{ fontSize: '11px', color: 'var(--text-muted)', marginTop: '4px' }}>
          Total estimado: {total}
        </p>
      )}
      <div style={{ marginTop: '10px', height: '5px', borderRadius: '99px', background: 'rgba(255,255,255,0.05)', overflow: 'hidden', position: 'relative' }}>
        <div style={{
          position: 'absolute', left: 0, top: 0, height: '100%', width: `${barKpiW}%`,
          background: 'rgba(201,168,76,0.4)', borderRadius: '99px',
          transition: 'width 0.8s cubic-bezier(0.22,1,0.36,1)',
        }} />
        {!semD1 && d1 > 0 && (
          <div style={{
            position: 'absolute', left: `${barKpiW}%`, top: 0, height: '100%', width: `${barD1W}%`,
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
        <IndicadorCard label="Retidos"    kpi={p.retidosKpi}    d1={p.retidosD1}    total={p.retidosEst}    positivo      semD1={p.semDadosD1} />
        <IndicadorCard label="Cancelados" kpi={p.canceladosKpi} d1={p.canceladosD1} total={p.canceladosEst} positivo={false} semD1={p.semDadosD1} />
        <IndicadorCard label="Pedidos"    kpi={p.pedidosKpi}    d1={p.pedidosD1}    total={p.pedidosEst}    positivo      semD1={p.semDadosD1} />
      </div>
    </Card>
  )
}

// ── Card Cenário até fim do mês ───────────────────────────────────────────────

function CardCenario(p: MeuD1Props) {
  const rpdAnim      = useCountUp(Math.max(0, p.retidosPorDiaNecessario))
  const progressoPct = p.diasUteisNoMes > 0 ? Math.min(100, p.diasPassados / p.diasUteisNoMes * 100) : 0

  return (
    <Card>
      <SectionTitle>Para fechar o mês em 66% de retenção</SectionTitle>

      {p.jaEstaNaMeta ? (
        <div style={{ display: 'flex', flexDirection: 'column', gap: '10px' }}>
          <div style={{
            display: 'inline-flex', alignItems: 'center', gap: '8px',
            padding: '8px 14px', borderRadius: '10px', alignSelf: 'flex-start',
            background: 'rgba(74,222,128,0.08)', border: '1px solid rgba(74,222,128,0.2)',
          }}>
            <CheckCircle2 size={15} style={{ color: '#4ade80' }} />
            <span style={{ fontSize: '13px', fontWeight: 600, color: '#4ade80' }}>Você já está na meta!</span>
          </div>
          <p style={{ fontSize: '12px', color: 'var(--text-muted)' }}>Mantenha o ritmo atual para fechar o mês bem.</p>
        </div>
      ) : (
        <div style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
          <div style={{ display: 'flex', alignItems: 'baseline', gap: '8px', flexWrap: 'wrap' }}>
            <span style={{ fontFamily: 'var(--ff-display)', fontSize: '28px', fontWeight: 700, color: 'var(--gold)' }}>
              {Math.ceil(rpdAnim)}
            </span>
            <span style={{ fontSize: '13px', color: 'var(--text-secondary)' }}>retenções por dia</span>
          </div>
          <p style={{ fontSize: '12px', color: 'var(--text-muted)' }}>
            nos próximos <strong style={{ color: 'var(--text-secondary)' }}>{p.diasRestantes}</strong> dias úteis restantes
          </p>
        </div>
      )}

      <div style={{ marginTop: '16px' }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '6px' }}>
          <span style={{ fontSize: '10px', color: 'var(--text-muted)' }}>Passados: {p.diasPassados}</span>
          <span style={{ fontSize: '10px', color: 'var(--text-muted)' }}>Restantes: {p.diasRestantes}</span>
        </div>
        <div style={{ height: '6px', borderRadius: '99px', background: 'rgba(255,255,255,0.05)', overflow: 'hidden' }}>
          <div style={{
            height: '100%', borderRadius: '99px', width: `${progressoPct}%`,
            background: 'linear-gradient(90deg, rgba(201,168,76,0.6) 0%, rgba(232,201,109,0.8) 100%)',
            transition: 'width 1s cubic-bezier(0.22,1,0.36,1)',
          }} />
        </div>
        <p style={{ fontSize: '10px', color: 'var(--text-muted)', marginTop: '4px', textAlign: 'center' }}>
          {p.diasPassados} de {p.diasUteisNoMes} dias úteis do mês
        </p>
      </div>
    </Card>
  )
}

// ── Card Plano de Ação ────────────────────────────────────────────────────────

function CenarioBox({ titulo, cor, bg, bd, icon: Icon, children }: {
  titulo: string
  cor: string; bg: string; bd: string
  icon: React.ElementType
  children: React.ReactNode
}) {
  return (
    <div style={{ padding: '12px 14px', borderRadius: '12px', background: bg, border: `1px solid ${bd}` }}>
      <div style={{ display: 'flex', alignItems: 'center', gap: '7px', marginBottom: '8px' }}>
        <Icon size={13} style={{ color: cor, flexShrink: 0 }} />
        <p style={{ fontSize: '10px', fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.1em', color: cor }}>
          {titulo}
        </p>
      </div>
      {children}
    </div>
  )
}

function CardPlanoAcao(p: MeuD1Props) {
  const taxaProjAnim = useCountUp(p.taxaProjetada)

  const projCor = p.taxaProjetada >= 66 ? '#4ade80' : p.taxaProjetada >= 60 ? '#facc15' : '#f87171'
  const projBg  = p.taxaProjetada >= 66 ? 'rgba(74,222,128,0.06)' : p.taxaProjetada >= 60 ? 'rgba(250,204,21,0.06)' : 'rgba(248,113,113,0.06)'
  const projBd  = p.taxaProjetada >= 66 ? 'rgba(74,222,128,0.15)' : p.taxaProjetada >= 60 ? 'rgba(250,204,21,0.15)' : 'rgba(248,113,113,0.15)'

  const bonusPossivel     = p.maxCanceladosDiaBon > 0
  const maxCancelFloor    = Math.floor(p.maxCanceladosDiaBon)

  const retidosNecHoje    = Math.ceil(p.retidosPorDiaNecessario)
  const hojeOk            = !p.semDadosD1 && p.retidosD1 >= retidosNecHoje
  const cen3Cor           = hojeOk ? '#4ade80' : '#f87171'
  const cen3Bg            = hojeOk ? 'rgba(74,222,128,0.06)' : 'rgba(248,113,113,0.06)'
  const cen3Bd            = hojeOk ? 'rgba(74,222,128,0.15)' : 'rgba(248,113,113,0.15)'
  const Cen3Icon          = hojeOk ? CheckCircle2 : AlertTriangle

  return (
    <Card>
      <SectionTitle>Plano de Ação</SectionTitle>
      <div style={{ display: 'flex', flexDirection: 'column', gap: '10px' }}>

        {/* Cenário 1 — Projeção ao ritmo atual */}
        <CenarioBox titulo="Cenário 1 — Se manter o ritmo atual" cor={projCor} bg={projBg} bd={projBd} icon={TrendingUp}>
          <div style={{ display: 'flex', alignItems: 'baseline', gap: '8px', flexWrap: 'wrap' }}>
            <span style={{ fontFamily: 'var(--ff-display)', fontSize: '26px', fontWeight: 700, color: projCor, lineHeight: 1 }}>
              {fmt1(taxaProjAnim)}%
            </span>
            <span style={{ fontSize: '12px', color: 'var(--text-muted)' }}>de retenção ao fim do mês</span>
          </div>
          <p style={{ fontSize: '11px', color: 'var(--text-muted)', marginTop: '6px', lineHeight: 1.5 }}>
            {p.taxaProjetada >= 66
              ? 'Mantendo este ritmo, você vai bater a meta de 66%!'
              : p.taxaProjetada >= 60
              ? 'Você estará próximo, mas ainda abaixo de 66%. Acelere as retenções.'
              : 'Atenção: neste ritmo você ficará abaixo da meta. É preciso acelerar.'}
          </p>
        </CenarioBox>

        {/* Cenário 2 — Meta de churn para bônus */}
        <CenarioBox
          titulo="Cenário 2 — Bônus de 20% (63.6% de retenção)"
          cor={bonusPossivel ? '#c9a84c' : '#f87171'}
          bg={bonusPossivel ? 'rgba(201,168,76,0.06)' : 'rgba(248,113,113,0.06)'}
          bd={bonusPossivel ? 'rgba(201,168,76,0.15)' : 'rgba(248,113,113,0.15)'}
          icon={Target}
        >
          {bonusPossivel ? (
            <>
              <div style={{ display: 'flex', alignItems: 'baseline', gap: '8px', flexWrap: 'wrap' }}>
                <span style={{ fontFamily: 'var(--ff-display)', fontSize: '26px', fontWeight: 700, color: 'var(--gold)', lineHeight: 1 }}>
                  {maxCancelFloor}
                </span>
                <span style={{ fontSize: '12px', color: 'var(--text-muted)' }}>cancelamentos por dia no máximo</span>
              </div>
              <p style={{ fontSize: '11px', color: 'var(--text-muted)', marginTop: '6px', lineHeight: 1.5 }}>
                Para garantir o bônus, mantenha no máximo {maxCancelFloor} cancelamento{maxCancelFloor !== 1 ? 's' : ''}/dia pelos próximos {p.diasRestantes} dias.
              </p>
            </>
          ) : (
            <p style={{ fontSize: '12px', color: '#f87171', lineHeight: 1.5 }}>
              O bônus deste mês está fora de alcance. Foque em atingir 66% para a meta principal.
            </p>
          )}
        </CenarioBox>

        {/* Cenário 3 — O que precisa hoje */}
        {!p.semDadosD1 && (
          <CenarioBox titulo="Cenário 3 — O que precisava hoje" cor={cen3Cor} bg={cen3Bg} bd={cen3Bd} icon={Cen3Icon}>
            <div style={{ display: 'flex', alignItems: 'center', gap: '12px', flexWrap: 'wrap' }}>
              <div>
                <p style={{ fontSize: '10px', color: 'var(--text-muted)', marginBottom: '2px' }}>Você reteve</p>
                <span style={{ fontFamily: 'var(--ff-display)', fontSize: '22px', fontWeight: 700, color: cen3Cor }}>{p.retidosD1}</span>
              </div>
              <div style={{ width: '1px', height: '28px', background: 'rgba(255,255,255,0.08)' }} />
              <div>
                <p style={{ fontSize: '10px', color: 'var(--text-muted)', marginBottom: '2px' }}>Precisava de</p>
                <span style={{ fontFamily: 'var(--ff-display)', fontSize: '22px', fontWeight: 700, color: 'var(--text-secondary)' }}>{retidosNecHoje}</span>
              </div>
            </div>
            <p style={{ fontSize: '11px', color: 'var(--text-muted)', marginTop: '8px', lineHeight: 1.5 }}>
              {hojeOk
                ? 'Você bateu o necessário hoje. Continue assim!'
                : `Faltaram ${retidosNecHoje - p.retidosD1} retenção${retidosNecHoje - p.retidosD1 !== 1 ? 'ões' : ''} para o ritmo ideal hoje.`}
            </p>
          </CenarioBox>
        )}

        {p.semDadosD1 && (
          <p style={{ fontSize: '12px', color: 'var(--text-muted)', textAlign: 'center', padding: '8px' }}>
            Cenário 3 disponível quando os dados D-1 forem atualizados.
          </p>
        )}
      </div>
    </Card>
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
        <Section delay={180}><CardPlanoAcao {...p} /></Section>
      </div>
    </>
  )
}
