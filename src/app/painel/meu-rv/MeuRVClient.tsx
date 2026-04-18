'use client'

import { useState, useEffect } from 'react'
import type { ResultadoRV, ComponenteRV, RVConfig, BonusCriterios } from '@/lib/rv-utils'
import { formatBRL, segParaMMSS } from '@/lib/rv-utils'
import { CheckCircle2, XCircle, AlertTriangle, ChevronDown } from 'lucide-react'

export interface MeuRVProps {
  resultado:       ResultadoRV
  nomeOperador:    string
  mesLabel:        string
  dataAtualizacao: string | null
  absValAtual:     number
  faltasNoMes:     number
}

// ── CountUp ───────────────────────────────────────────────────────────────────

function useCountUp(target: number, duration = 1100) {
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

// ── Helpers ───────────────────────────────────────────────────────────────────

function calcProgresso(comp: ComponenteRV, config: RVConfig): number {
  if (!comp.aplicavel || comp.valorNum === 0) return 0
  if (comp.ganhou) return 100
  const v = comp.valorNum
  switch (comp.id) {
    case 'retracao': {
      const min = config.retracaoFaixas[config.retracaoFaixas.length - 1]?.min ?? 57
      return Math.min(99, Math.max(0, v / min * 100))
    }
    case 'indisp':
      if (v <= 0) return 0
      return Math.min(99, config.indispLimite / v * 100)
    case 'tma':
      if (v <= 0) return 0
      return Math.min(99, config.tmaLimiteSeg / v * 100)
    case 'ticket': {
      const faixas = config.ticketFaixas
      const min = faixas[faixas.length - 1]?.min ?? -18
      return Math.min(99, Math.max(0, (v - min) / (Math.abs(min) + 20) * 100))
    }
    default: return 50
  }
}

function getMelhoriaMsg(comp: ComponenteRV, config: RVConfig): string | null {
  if (comp.ganhou || !comp.aplicavel) return null
  const v = comp.valorNum
  switch (comp.id) {
    case 'retracao': {
      const min = config.retracaoFaixas[config.retracaoFaixas.length - 1]?.min ?? 57
      return v < min
        ? `Aumente a TX Retenção em ${(min - v).toFixed(1)}% (atual: ${v.toFixed(1)}%, mínimo: ${min}%)`
        : null
    }
    case 'indisp': {
      if (v <= 0) return 'Indisponibilidade não registrada na planilha'
      const exc = v - config.indispLimite
      return `Reduza a indisponibilidade em ${exc.toFixed(1)}% (atual: ${v.toFixed(1)}%, limite: ≤${config.indispLimite}%)`
    }
    case 'tma': {
      if (v <= 0) return 'TMA não encontrado na planilha'
      const exc = v - config.tmaLimiteSeg
      return exc > 0
        ? `Reduza o TMA em ${segParaMMSS(exc)} (atual: ${segParaMMSS(v)}, limite: ${segParaMMSS(config.tmaLimiteSeg)})`
        : null
    }
    case 'ticket': {
      if (comp.detalhe) return comp.detalhe
      const min = config.ticketFaixas[config.ticketFaixas.length - 1]?.min ?? -18
      const sinal = v >= 0 ? '+' : ''
      return `Variação de ticket deve ser ≥ ${min}% (atual: ${sinal}${v.toFixed(1)}%)`
    }
    default: return null
  }
}

// ── Componente Principal ──────────────────────────────────────────────────────

export default function MeuRVClient({
  resultado, absValAtual, faltasNoMes,
}: MeuRVProps) {
  const {
    elegivel, motivosInelegivel, componentes,
    rvBase, pedidosRealizados, pedidosMeta, multiplicador, rvAposPedidos,
    bonusCriterios, bonus, rvTotal,
    penalidades, totalPenalidade, rvFinal,
    descontoIndividualAplicado, semDados, config,
  } = resultado

  const rvAnimado = useCountUp(elegivel ? rvFinal : 0, 1200)
  const [regrasExpandidas, setRegrasExpandidas] = useState(false)

  const componentesAtivos = componentes.filter(c => c.aplicavel)
  const naoAtingidos = componentesAtivos.filter(c => !c.ganhou)
  const bonusOk = bonusCriterios.retracaoOk && bonusCriterios.indispOk && bonusCriterios.churnOk

  return (
    <>
      <style dangerouslySetInnerHTML={{ __html: `
        @keyframes rvIn {
          0%   { opacity: 0; transform: translateY(20px) scale(0.97); }
          100% { opacity: 1; transform: translateY(0) scale(1); }
        }
        @keyframes rvPulse {
          0%, 100% { box-shadow: 0 0 0 0 rgba(201,168,76,0); border-color: rgba(201,168,76,0.30); }
          50%       { box-shadow: 0 0 30px 8px rgba(201,168,76,0.18); border-color: rgba(232,201,109,0.70); }
        }
        @keyframes rvSlide {
          0%   { opacity: 0; transform: translateY(12px); }
          100% { opacity: 1; transform: translateY(0); }
        }
      `}} />

      <div style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>

        {/* Seção 1: Card Principal */}
        <MainCard elegivel={elegivel} rvAnimado={rvAnimado} rvFinal={rvFinal} motivosInelegivel={motivosInelegivel} semDados={semDados} />

        {/* Seção 2: Critérios de Elegibilidade */}
        <ElegibilidadeCard
          elegivel={elegivel}
          absValAtual={absValAtual}
          absMaximo={config.absMaximo}
          faltasNoMes={faltasNoMes}
          motivosInelegivel={motivosInelegivel}
        />

        {/* Seção 3: Breakdown */}
        {!semDados && (
          <BreakdownCard
            componentes={componentes}
            config={config}
            rvBase={rvBase}
            pedidosRealizados={pedidosRealizados}
            pedidosMeta={pedidosMeta}
            multiplicador={multiplicador}
            rvAposPedidos={rvAposPedidos}
            bonusCriterios={bonusCriterios}
            bonus={bonus}
            rvTotal={rvTotal}
            penalidades={penalidades}
            totalPenalidade={totalPenalidade}
            rvFinal={rvFinal}
            descontoIndividualAplicado={descontoIndividualAplicado}
            elegivel={elegivel}
          />
        )}

        {/* Seção 4: O que posso melhorar */}
        {!semDados && (
          <MelhoriaCard
            naoAtingidos={naoAtingidos}
            config={config}
            elegivel={elegivel}
            motivosInelegivel={motivosInelegivel}
            bonusOk={bonusOk}
            bonusValor={config.bonusValor}
          />
        )}

        {/* Seção 5: Regras (colapsível) */}
        <RegrasCard config={config} expanded={regrasExpandidas} onToggle={() => setRegrasExpandidas(v => !v)} />
      </div>
    </>
  )
}

// ── Seção 1: Card Principal ───────────────────────────────────────────────────

function MainCard({ elegivel, rvAnimado, rvFinal, motivosInelegivel, semDados }: {
  elegivel: boolean; rvAnimado: number; rvFinal: number
  motivosInelegivel: string[]; semDados: boolean
}) {
  if (semDados) {
    return (
      <div style={{ background: '#0d0d1a', border: '1px solid rgba(201,168,76,0.08)', borderRadius: '20px', padding: '32px', textAlign: 'center' }}>
        <p style={{ color: 'var(--text-muted)', fontSize: '14px' }}>Dados insuficientes para calcular o RV deste mês.</p>
      </div>
    )
  }

  return (
    <div style={{
      background: elegivel ? 'linear-gradient(135deg, #0f0c02 0%, #1a1400 50%, #0a0900 100%)' : '#0d0d1a',
      border: `1px solid ${elegivel ? 'rgba(201,168,76,0.30)' : 'rgba(239,68,68,0.20)'}`,
      borderRadius: '20px',
      padding: '32px',
      animation: elegivel
        ? 'rvIn 0.5s ease both, rvPulse 3s ease-in-out 0.9s infinite'
        : 'rvIn 0.5s ease both',
    }}>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', flexWrap: 'wrap', gap: '12px', marginBottom: '20px' }}>
        <span style={{ fontSize: '11px', fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.12em', color: 'var(--text-muted)' }}>
          RV Estimado
        </span>
        <span style={{
          fontSize: '10px', fontWeight: 700, padding: '4px 12px', borderRadius: '99px',
          textTransform: 'uppercase', letterSpacing: '0.08em',
          ...(elegivel
            ? { background: 'rgba(34,197,94,0.12)', color: '#4ade80', border: '1px solid rgba(34,197,94,0.20)' }
            : { background: 'rgba(239,68,68,0.12)', color: '#f87171', border: '1px solid rgba(239,68,68,0.20)' }),
        }}>
          {elegivel ? 'Elegível ✓' : 'Inelegível ✗'}
        </span>
      </div>

      <div style={{ marginBottom: '12px' }}>
        <span style={{
          fontFamily: 'var(--ff-display)',
          fontSize: '48px', fontWeight: 800, lineHeight: 1,
          fontVariantNumeric: 'tabular-nums',
          ...(elegivel
            ? {
                background: 'linear-gradient(135deg, #e8c96d 0%, #f5d97a 50%, #c9a84c 100%)',
                WebkitBackgroundClip: 'text', WebkitTextFillColor: 'transparent', backgroundClip: 'text',
              }
            : { color: 'var(--text-muted)', opacity: 0.5 }),
        }}>
          {elegivel ? formatBRL(rvAnimado) : formatBRL(rvFinal)}
        </span>
      </div>

      <p style={{ fontSize: '12px', color: 'var(--text-muted)' }}>
        Estimativa baseada nos dados atuais da planilha
      </p>

      {!elegivel && motivosInelegivel.length > 0 && (
        <div style={{ marginTop: '16px', padding: '14px 16px', borderRadius: '12px', background: 'rgba(239,68,68,0.08)', border: '1px solid rgba(239,68,68,0.20)' }}>
          <p style={{ fontSize: '11px', fontWeight: 700, color: '#f87171', textTransform: 'uppercase', letterSpacing: '0.08em', marginBottom: '8px' }}>
            Por que estou inelegível?
          </p>
          {motivosInelegivel.map((m, i) => (
            <div key={i} style={{ display: 'flex', alignItems: 'flex-start', gap: '8px', marginTop: i > 0 ? '6px' : '0' }}>
              <XCircle size={13} style={{ color: '#f87171', flexShrink: 0, marginTop: '1px' }} />
              <span style={{ fontSize: '12px', color: '#fca5a5' }}>{m}</span>
            </div>
          ))}
        </div>
      )}
    </div>
  )
}

// ── Seção 2: Elegibilidade ────────────────────────────────────────────────────

function ElegibilidadeCard({ elegivel, absValAtual, absMaximo, faltasNoMes, motivosInelegivel }: {
  elegivel: boolean; absValAtual: number; absMaximo: number
  faltasNoMes: number; motivosInelegivel: string[]
}) {
  const absOk = absValAtual <= absMaximo
  const faltasOk = faltasNoMes < 2
  const absBlocking = !absOk && motivosInelegivel.some(m => m.toLowerCase().includes('abs'))
  const faltasBlocking = !faltasOk && motivosInelegivel.some(m => m.toLowerCase().includes('falta'))

  return (
    <SectionCard title="Critérios de Elegibilidade">
      <div style={{ display: 'flex', flexDirection: 'column', gap: '10px' }}>
        <CriterioRow
          label="Absenteísmo (ABS)"
          valorAtual={`${absValAtual.toFixed(1)}%`}
          limite={`máximo ${absMaximo}%`}
          ok={absOk}
          blocking={absBlocking}
        />
        <CriterioRow
          label="Faltas no mês"
          valorAtual={`${faltasNoMes} falta${faltasNoMes !== 1 ? 's' : ''}`}
          limite="máximo 1 falta"
          ok={faltasOk}
          blocking={faltasBlocking}
        />
      </div>
    </SectionCard>
  )
}

function CriterioRow({ label, valorAtual, limite, ok, blocking }: {
  label: string; valorAtual: string; limite: string; ok: boolean; blocking: boolean
}) {
  return (
    <div style={{
      display: 'flex', alignItems: 'center', justifyContent: 'space-between', flexWrap: 'wrap', gap: '8px',
      padding: '12px 16px', borderRadius: '12px',
      background: ok ? 'rgba(34,197,94,0.04)' : 'rgba(239,68,68,0.05)',
      border: `1px solid ${ok ? 'rgba(34,197,94,0.12)' : 'rgba(239,68,68,0.15)'}`,
    }}>
      <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
        {ok
          ? <CheckCircle2 size={15} style={{ color: '#4ade80', flexShrink: 0 }} />
          : <XCircle size={15} style={{ color: '#f87171', flexShrink: 0 }} />}
        <div>
          <p style={{ fontSize: '13px', fontWeight: 600, color: ok ? '#4ade80' : '#f87171', lineHeight: 1.3 }}>{label}</p>
          <p style={{ fontSize: '11px', color: 'var(--text-muted)', marginTop: '2px' }}>{limite}</p>
        </div>
      </div>
      <div style={{ textAlign: 'right' }}>
        <p style={{ fontSize: '16px', fontWeight: 700, fontVariantNumeric: 'tabular-nums', color: ok ? '#4ade80' : '#f87171' }}>
          {valorAtual}
        </p>
        {blocking && (
          <p style={{ fontSize: '10px', color: '#fca5a5', marginTop: '2px' }}>Impedindo seu RV</p>
        )}
      </div>
    </div>
  )
}

// ── Seção 3: Breakdown ────────────────────────────────────────────────────────

function BreakdownCard({ componentes, config, rvBase, pedidosRealizados, pedidosMeta, multiplicador, rvAposPedidos, bonusCriterios, bonus, rvTotal, penalidades, totalPenalidade, rvFinal, descontoIndividualAplicado, elegivel }: {
  componentes: ComponenteRV[]; config: RVConfig
  rvBase: number; pedidosRealizados: number; pedidosMeta: number
  multiplicador: number; rvAposPedidos: number
  bonusCriterios: BonusCriterios; bonus: number; rvTotal: number
  penalidades: { metaLabel: string; percentual: number; valorDeduzido: number }[]
  totalPenalidade: number; rvFinal: number
  descontoIndividualAplicado: { motivo: string; valor: number } | null
  elegivel: boolean
}) {
  const temDeducoes = penalidades.length > 0 || !!descontoIndividualAplicado

  return (
    <SectionCard title="Breakdown Detalhado">
      <div style={{ display: 'flex', flexDirection: 'column', gap: '10px' }}>
        {componentes.map((comp, i) => (
          <ComponenteRow key={comp.id} comp={comp} config={config} elegivel={elegivel} delay={i * 60} />
        ))}
      </div>

      <div style={{ marginTop: '16px', display: 'flex', flexDirection: 'column', gap: '6px' }}>
        <LineaDivisoria />
        <TotalRow label="Subtotal" valor={rvBase} />

        {pedidosMeta > 0 && (
          <PedidosRow pedidosRealizados={pedidosRealizados} pedidosMeta={pedidosMeta} multiplicador={multiplicador} />
        )}

        {pedidosMeta > 0 && multiplicador < 1 && (
          <TotalRow label="RV após multiplicador" valor={rvAposPedidos} />
        )}

        <BonusRow bonusCriterios={bonusCriterios} bonus={bonus} config={config} elegivel={elegivel} />

        <LineaDivisoria />
        <TotalRow label="RV Total" valor={rvTotal} />

        {penalidades.map((pen, i) => (
          <DeducaoRow key={i} label={`Deflator: ${pen.metaLabel} (−${pen.percentual}%)`} valor={pen.valorDeduzido} />
        ))}

        {descontoIndividualAplicado && (
          <DeducaoRow label={`Desconto: ${descontoIndividualAplicado.motivo}`} valor={descontoIndividualAplicado.valor} />
        )}

        {temDeducoes && <LineaDivisoria />}

        <TotalRow label="RV FINAL" valor={rvFinal} highlight />
      </div>
    </SectionCard>
  )
}

function ComponenteRow({ comp, config, elegivel, delay }: {
  comp: ComponenteRV; config: RVConfig; elegivel: boolean; delay: number
}) {
  const prog = calcProgresso(comp, config)
  const ganhouEfetivo = comp.ganhou && elegivel

  return (
    <div style={{
      padding: '14px 16px', borderRadius: '14px',
      background: '#07070f',
      border: `1px solid ${ganhouEfetivo ? 'rgba(34,197,94,0.10)' : 'rgba(201,168,76,0.06)'}`,
      animation: 'rvSlide 0.4s ease both',
      animationDelay: `${delay}ms`,
    }}>
      <div style={{ display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between', gap: '12px', flexWrap: 'wrap' }}>
        <div style={{ flex: 1, minWidth: '140px' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '6px', marginBottom: '4px' }}>
            {ganhouEfetivo
              ? <CheckCircle2 size={13} style={{ color: '#4ade80', flexShrink: 0 }} />
              : <XCircle size={13} style={{ color: '#f87171', flexShrink: 0 }} />}
            <span style={{ fontSize: '12px', fontWeight: 600, color: ganhouEfetivo ? '#4ade80' : 'var(--text-secondary)' }}>
              {comp.label}
            </span>
          </div>
          <p style={{
            fontSize: '22px', fontWeight: 700, fontVariantNumeric: 'tabular-nums', lineHeight: 1,
            color: comp.valorNum > 0 ? 'var(--text-primary)' : 'var(--text-muted)',
          }}>
            {comp.valorDisplay}
          </p>
          <p style={{ fontSize: '10px', color: 'var(--text-muted)', marginTop: '4px' }}>{comp.regraDisplay}</p>
          {comp.detalhe && (
            <p style={{ fontSize: '10px', color: '#fbbf24', marginTop: '4px' }}>{comp.detalhe}</p>
          )}
        </div>
        <div style={{ textAlign: 'right', flexShrink: 0 }}>
          <span style={{
            fontFamily: 'var(--ff-display)',
            fontSize: '22px', fontWeight: 700, fontVariantNumeric: 'tabular-nums',
            color: ganhouEfetivo ? '#4ade80' : '#ef4444',
          }}>
            {ganhouEfetivo ? formatBRL(comp.premio) : 'R$0'}
          </span>
        </div>
      </div>

      {comp.aplicavel && comp.valorNum > 0 && (
        <div style={{ marginTop: '10px' }}>
          <div style={{ height: '5px', borderRadius: '99px', background: 'rgba(255,255,255,0.05)', overflow: 'hidden' }}>
            <div style={{
              height: '100%', width: `${Math.min(prog, 100)}%`, borderRadius: '99px',
              background: ganhouEfetivo
                ? 'linear-gradient(90deg, #16a34a, #4ade80)'
                : prog > 80 ? 'linear-gradient(90deg, #ca8a04, #facc15)'
                : 'linear-gradient(90deg, #dc2626, #f87171)',
              transition: 'width 0.9s cubic-bezier(0.4,0,0.2,1)',
            }} />
          </div>
          {!ganhouEfetivo && prog > 0 && (
            <p style={{ fontSize: '10px', color: 'var(--text-muted)', marginTop: '3px' }}>
              {prog.toFixed(0)}% do caminho para a meta
            </p>
          )}
        </div>
      )}
    </div>
  )
}

function TotalRow({ label, valor, highlight }: { label: string; valor: number; highlight?: boolean }) {
  return (
    <div style={{
      display: 'flex', justifyContent: 'space-between', alignItems: 'center',
      padding: highlight ? '12px 16px' : '6px 16px',
      borderRadius: highlight ? '12px' : '8px',
      background: highlight ? 'rgba(201,168,76,0.07)' : 'transparent',
      border: highlight ? '1px solid rgba(201,168,76,0.14)' : 'none',
      marginTop: highlight ? '4px' : '0',
    }}>
      <span style={{
        fontSize: highlight ? '13px' : '12px',
        fontWeight: highlight ? 700 : 500,
        color: highlight ? '#c9a84c' : 'var(--text-muted)',
        textTransform: highlight ? 'uppercase' : 'none',
        letterSpacing: highlight ? '0.06em' : 'normal',
      }}>
        {label}
      </span>
      <span style={{
        fontFamily: 'var(--ff-display)',
        fontSize: highlight ? '26px' : '16px',
        fontWeight: 700, fontVariantNumeric: 'tabular-nums',
        color: highlight ? '#e8c96d' : 'var(--text-secondary)',
      }}>
        {formatBRL(valor)}
      </span>
    </div>
  )
}

function DeducaoRow({ label, valor }: { label: string; valor: number }) {
  return (
    <div style={{
      display: 'flex', justifyContent: 'space-between', alignItems: 'center',
      padding: '8px 16px', borderRadius: '10px',
      background: 'rgba(239,68,68,0.05)', border: '1px solid rgba(239,68,68,0.12)',
    }}>
      <span style={{ fontSize: '12px', color: '#fca5a5' }}>{label}</span>
      <span style={{ fontFamily: 'var(--ff-display)', fontSize: '15px', fontWeight: 700, fontVariantNumeric: 'tabular-nums', color: '#f87171' }}>
        −{formatBRL(valor)}
      </span>
    </div>
  )
}

function PedidosRow({ pedidosRealizados, pedidosMeta, multiplicador }: {
  pedidosRealizados: number; pedidosMeta: number; multiplicador: number
}) {
  const ok = multiplicador >= 1
  return (
    <div style={{
      display: 'flex', justifyContent: 'space-between', alignItems: 'center',
      padding: '10px 16px', borderRadius: '10px',
      background: ok ? 'rgba(34,197,94,0.04)' : 'rgba(250,204,21,0.04)',
      border: `1px solid ${ok ? 'rgba(34,197,94,0.10)' : 'rgba(250,204,21,0.10)'}`,
    }}>
      <div>
        <p style={{ fontSize: '12px', color: 'var(--text-muted)' }}>Multiplicador pedidos</p>
        <p style={{ fontSize: '10px', color: 'var(--text-muted)', marginTop: '2px' }}>
          {Math.round(pedidosRealizados)}/{pedidosMeta} pedidos realizados
        </p>
      </div>
      <span style={{ fontSize: '18px', fontWeight: 700, fontVariantNumeric: 'tabular-nums', color: ok ? '#4ade80' : '#facc15' }}>
        ×{multiplicador.toFixed(2)}
      </span>
    </div>
  )
}

function BonusRow({ bonusCriterios, bonus, config, elegivel }: {
  bonusCriterios: BonusCriterios; bonus: number; config: RVConfig; elegivel: boolean
}) {
  const { retracaoOk, retracaoAtual, indispOk, indispAtual, churnOk, churnAtual, churnMeta } = bonusCriterios
  const allOk = retracaoOk && indispOk && churnOk
  const ganhou = allOk && elegivel && bonus > 0

  return (
    <div style={{
      padding: '12px 16px', borderRadius: '12px',
      background: ganhou ? 'rgba(34,197,94,0.05)' : 'rgba(255,255,255,0.02)',
      border: `1px solid ${ganhou ? 'rgba(34,197,94,0.12)' : 'rgba(255,255,255,0.06)'}`,
    }}>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', gap: '12px', flexWrap: 'wrap' }}>
        <div>
          <p style={{ fontSize: '12px', fontWeight: 600, color: 'var(--text-secondary)', marginBottom: '6px' }}>Bônus de Qualidade</p>
          <div style={{ display: 'flex', flexDirection: 'column', gap: '3px' }}>
            <BonusCriterio ok={retracaoOk} label={`TX Retenção ≥ ${config.bonusRetracaoMinima}% (atual: ${retracaoAtual.toFixed(1)}%)`} />
            <BonusCriterio ok={indispOk} label={`Indisp ≤ ${config.bonusIndispMaxima}% (atual: ${indispAtual.toFixed(1)}%)`} />
            {churnMeta > 0 && <BonusCriterio ok={churnOk} label={`Churn ≤ ${churnMeta} (atual: ${churnAtual})`} />}
          </div>
        </div>
        <span style={{
          fontFamily: 'var(--ff-display)',
          fontSize: '22px', fontWeight: 700, fontVariantNumeric: 'tabular-nums',
          color: ganhou ? '#4ade80' : '#ef4444', flexShrink: 0,
        }}>
          {ganhou ? formatBRL(bonus) : 'R$0'}
        </span>
      </div>
    </div>
  )
}

function BonusCriterio({ ok, label }: { ok: boolean; label: string }) {
  return (
    <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
      {ok
        ? <CheckCircle2 size={11} style={{ color: '#4ade80', flexShrink: 0 }} />
        : <XCircle size={11} style={{ color: '#f87171', flexShrink: 0 }} />}
      <span style={{ fontSize: '11px', color: ok ? '#86efac' : '#fca5a5' }}>{label}</span>
    </div>
  )
}

function LineaDivisoria() {
  return <div style={{ height: '1px', background: 'rgba(201,168,76,0.07)', margin: '4px 0' }} />
}

// ── Seção 4: Melhoria ─────────────────────────────────────────────────────────

function MelhoriaCard({ naoAtingidos, config, elegivel, motivosInelegivel, bonusOk, bonusValor }: {
  naoAtingidos: ComponenteRV[]; config: RVConfig; elegivel: boolean
  motivosInelegivel: string[]; bonusOk: boolean; bonusValor: number
}) {
  const melhorias = naoAtingidos
    .map(comp => ({ comp, msg: getMelhoriaMsg(comp, config) }))
    .filter(({ msg }) => msg !== null)

  const hasInelegivel = !elegivel && motivosInelegivel.length > 0
  const tudoOk = melhorias.length === 0 && !hasInelegivel && bonusOk

  return (
    <SectionCard title="O Que Posso Melhorar">
      {tudoOk ? (
        <div style={{ textAlign: 'center', padding: '16px 8px' }}>
          <p style={{ fontSize: '28px', marginBottom: '8px' }}>🎯</p>
          <p style={{ fontFamily: 'var(--ff-display)', fontSize: '15px', fontWeight: 700, color: '#4ade80', marginBottom: '6px' }}>
            Você está maximizando seu RV este mês!
          </p>
          <p style={{ fontSize: '12px', color: 'var(--text-muted)' }}>
            Todos os critérios foram atingidos. Continue assim!
          </p>
        </div>
      ) : (
        <div style={{ display: 'flex', flexDirection: 'column', gap: '10px' }}>
          {hasInelegivel && (
            <MelhoriaItem
              label="Elegibilidade ao RV"
              msg={motivosInelegivel.join(' · ')}
              premio={null}
            />
          )}
          {melhorias.map(({ comp, msg }) => (
            <MelhoriaItem
              key={comp.id}
              label={comp.label}
              msg={msg!}
              premio={comp.aplicavel && comp.premio > 0 ? formatBRL(comp.premio) : null}
            />
          ))}
          {!bonusOk && bonusValor > 0 && (
            <MelhoriaItem
              label="Bônus de Qualidade"
              msg={`Atinja TX Retenção ≥ ${config.bonusRetracaoMinima}% e Indisponibilidade ≤ ${config.bonusIndispMaxima}%`}
              premio={formatBRL(bonusValor)}
            />
          )}
        </div>
      )}
    </SectionCard>
  )
}

function MelhoriaItem({ label, msg, premio }: { label: string; msg: string; premio: string | null }) {
  return (
    <div style={{
      display: 'flex', alignItems: 'flex-start', gap: '12px',
      padding: '12px 14px', borderRadius: '12px',
      background: 'rgba(251,191,36,0.05)', border: '1px solid rgba(251,191,36,0.12)',
    }}>
      <AlertTriangle size={15} style={{ color: '#fbbf24', flexShrink: 0, marginTop: '1px' }} />
      <div style={{ flex: 1 }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', gap: '8px', flexWrap: 'wrap', marginBottom: '4px' }}>
          <p style={{ fontSize: '12px', fontWeight: 600, color: '#fcd34d' }}>{label}</p>
          {premio && (
            <span style={{
              fontSize: '11px', fontWeight: 700, padding: '2px 8px', borderRadius: '99px',
              background: 'rgba(251,191,36,0.12)', color: '#fbbf24',
              border: '1px solid rgba(251,191,36,0.20)', whiteSpace: 'nowrap', flexShrink: 0,
            }}>
              Ganhe {premio}
            </span>
          )}
        </div>
        <p style={{ fontSize: '12px', color: 'var(--text-muted)', lineHeight: 1.5 }}>{msg}</p>
      </div>
    </div>
  )
}

// ── Seção 5: Regras ───────────────────────────────────────────────────────────

function RegrasCard({ config, expanded, onToggle }: { config: RVConfig; expanded: boolean; onToggle: () => void }) {
  return (
    <div style={{ background: '#0d0d1a', border: '1px solid rgba(201,168,76,0.06)', borderRadius: '16px', overflow: 'hidden' }}>
      <button
        type="button"
        onClick={onToggle}
        style={{
          width: '100%', display: 'flex', justifyContent: 'space-between', alignItems: 'center',
          padding: '14px 20px', background: 'transparent', border: 'none', cursor: 'pointer',
        }}
      >
        <span style={{ fontFamily: 'var(--ff-display)', fontSize: '11px', fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.12em', color: '#c9a84c' }}>
          Como é calculado meu RV
        </span>
        <ChevronDown size={14} style={{ color: 'var(--text-muted)', transition: 'transform 0.3s', transform: expanded ? 'rotate(0deg)' : 'rotate(-90deg)' }} />
      </button>

      <div style={{ maxHeight: expanded ? '700px' : '0px', overflow: 'hidden', transition: 'max-height 0.4s cubic-bezier(0.4,0,0.2,1)' }}>
        <div style={{ padding: '0 20px 20px', display: 'flex', flexDirection: 'column', gap: '16px' }}>

          <RegraSection title="Critérios de Elegibilidade">
            <RegraItem label="ABS máximo" valor={`≤ ${config.absMaximo}%`} />
            <RegraItem label="Faltas no mês" valor="Máximo 1 falta" />
          </RegraSection>

          <RegraSection title="Componentes do RV">
            {config.retracaoFaixas.map((f, i) => (
              <RegraItem key={i} label={`TX Retenção ≥ ${f.min}%`} valor={formatBRL(f.valor)} />
            ))}
            <RegraItem label={`Indisponibilidade ≤ ${config.indispLimite}%`} valor={formatBRL(config.indispValor)} />
            <RegraItem label={`TMA < ${segParaMMSS(config.tmaLimiteSeg)}`} valor={formatBRL(config.tmaValor)} />
            {config.ticketFaixas.map((f, i) => (
              <RegraItem key={i} label={`Variação Ticket ≥ ${f.min}%`} valor={formatBRL(f.valor)} />
            ))}
          </RegraSection>

          {config.pedidosMeta > 0 && (
            <RegraSection title="Multiplicador de Pedidos">
              <RegraItem label="Meta de pedidos" valor={String(config.pedidosMeta)} />
              <p style={{ fontSize: '11px', color: 'var(--text-muted)', lineHeight: 1.5 }}>
                RV = RV Base × (Pedidos / Meta), máximo 1×
              </p>
            </RegraSection>
          )}

          {config.bonusValor > 0 && (
            <RegraSection title={`Bônus de Qualidade (${formatBRL(config.bonusValor)})`}>
              <RegraItem label={`TX Retenção ≥ ${config.bonusRetracaoMinima}%`} valor="Obrigatório" />
              <RegraItem label={`Indisponibilidade ≤ ${config.bonusIndispMaxima}%`} valor="Obrigatório" />
              {config.churnMeta > 0 && <RegraItem label={`Churn ≤ ${config.churnMeta}`} valor="Obrigatório" />}
            </RegraSection>
          )}

          {config.penalidades.filter(p => p.ativa).length > 0 && (
            <RegraSection title="Deflatores">
              {config.penalidades.filter(p => p.ativa).map((pen, i) => (
                <RegraItem key={i} label={pen.metaLabel} valor={`−${pen.percentual}% se vermelho`} />
              ))}
            </RegraSection>
          )}
        </div>
      </div>
    </div>
  )
}

function RegraSection({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <div>
      <p style={{ fontSize: '10px', fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.10em', color: 'var(--text-muted)', marginBottom: '8px' }}>
        {title}
      </p>
      <div style={{ display: 'flex', flexDirection: 'column', gap: '5px' }}>{children}</div>
    </div>
  )
}

function RegraItem({ label, valor }: { label: string; valor: string }) {
  return (
    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', gap: '8px' }}>
      <span style={{ fontSize: '12px', color: 'var(--text-muted)' }}>{label}</span>
      <span style={{ fontSize: '12px', fontWeight: 600, color: 'var(--text-secondary)', flexShrink: 0 }}>{valor}</span>
    </div>
  )
}

// ── Shared ────────────────────────────────────────────────────────────────────

function SectionCard({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <div style={{ background: '#0d0d1a', border: '1px solid rgba(201,168,76,0.08)', borderRadius: '16px', padding: '20px' }}>
      <div style={{ display: 'flex', alignItems: 'center', gap: '10px', marginBottom: '16px' }}>
        <span style={{
          fontFamily: 'var(--ff-display)',
          fontSize: '11px', fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.12em',
          color: '#c9a84c',
        }}>
          {title}
        </span>
        <div style={{ flex: 1, height: '1px', background: 'linear-gradient(90deg, rgba(201,168,76,0.15) 0%, transparent 100%)' }} />
      </div>
      {children}
    </div>
  )
}
