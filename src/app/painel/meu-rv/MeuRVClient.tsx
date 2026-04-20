'use client'

import { useState } from 'react'
import type { ResultadoRV, ComponenteRV, RVConfig, BonusCriterios } from '@/lib/rv-utils'
import { formatBRL, segParaMMSS } from '@/lib/rv-utils'
import {
  CheckCircle2, XCircle, AlertTriangle, ChevronDown,
  Target, Activity, Clock, TrendingUp, Check, X,
} from 'lucide-react'
import { useCountUp } from '@/hooks/useCountUp'

export interface MeuRVProps {
  resultado:        ResultadoRV
  nomeOperador:     string
  mesLabel:         string
  dataAtualizacao:  string | null
  absValAtual:      number
  faltasNoMes:      number
  posicaoRanking:   number
}

// ── Helpers (lógica intacta) ──────────────────────────────────────────────────

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
      const min = config.ticketFaixas[config.ticketFaixas.length - 1]?.min ?? -18
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
      return `Reduza em ${exc.toFixed(1)}% (atual: ${v.toFixed(1)}%, limite: ≤${config.indispLimite}%)`
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

// ── Paleta por posição de ranking ─────────────────────────────────────────────

type Paleta = {
  heroBg: string
  valorGradient: string
  beamClass: string
  brilhoRgba: string | null
  pulse: boolean
  bordaComp: string | null
}

function getPaleta(pos: number): Paleta {
  if (pos === 1) return {
    heroBg: 'linear-gradient(135deg, #0f0c02 0%, #1a1400 50%, #0a0900 100%)',
    valorGradient: 'linear-gradient(135deg, #f4d47c 0%, #d4a935 100%)',
    beamClass: 'rv-hero-beam',
    brilhoRgba: 'rgba(201,168,76,0.25)',
    pulse: true,
    bordaComp: '1px solid #c9a84c',
  }
  if (pos === 2) return {
    heroBg: '#1a1a24',
    valorGradient: 'linear-gradient(135deg, #c0c0d0 0%, #e8e8e8 100%)',
    beamClass: 'rv-hero-beam-silver',
    brilhoRgba: 'rgba(192,192,192,0.15)',
    pulse: false,
    bordaComp: '1px solid #c0c0c0',
  }
  if (pos === 3) return {
    heroBg: '#2a1d10',
    valorGradient: 'linear-gradient(135deg, #a67848 0%, #d8935a 100%)',
    beamClass: 'rv-hero-beam-bronze',
    brilhoRgba: 'rgba(205,127,50,0.14)',
    pulse: false,
    bordaComp: '1px solid #cd7f32',
  }
  return {
    heroBg: '#0d1824',
    valorGradient: 'linear-gradient(135deg, #38bdf8 0%, #7dd3fc 100%)',
    beamClass: 'rv-hero-beam-blue',
    brilhoRgba: null,
    pulse: false,
    bordaComp: null,
  }
}

const LABEL_SHORT: Record<string, string> = {
  retracao: 'RETENÇÃO',
  indisp: 'INDISP.',
  tma: 'TMA',
  ticket: 'TICKET',
}

function CompIcon({ id, size = 13 }: { id: string; size?: number }) {
  const s = { flexShrink: 0 as const }
  switch (id) {
    case 'retracao': return <Target size={size} style={s} />
    case 'indisp':   return <Activity size={size} style={s} />
    case 'tma':      return <Clock size={size} style={s} />
    case 'ticket':   return <TrendingUp size={size} style={s} />
    default:         return <Target size={size} style={s} />
  }
}

// ── Componente Principal ──────────────────────────────────────────────────────

export default function MeuRVClient({
  resultado, absValAtual, faltasNoMes, posicaoRanking,
}: MeuRVProps) {
  const {
    elegivel, motivosInelegivel, componentes,
    rvBase, pedidosRealizados, pedidosMeta, multiplicador, rvAposPedidos,
    bonusCriterios, bonus, rvTotal,
    penalidades, totalPenalidade, rvFinal,
    descontoIndividualAplicado, semDados, config,
  } = resultado

  const deducaoTotal = totalPenalidade + (descontoIndividualAplicado?.valor ?? 0)
  const rvAnimado    = useCountUp(elegivel ? rvFinal : 0, 800)

  const [regrasExpandidas, setRegrasExpandidas] = useState(false)

  const componentesAtivos = componentes.filter(c => c.aplicavel)
  const naoAtingidos      = componentesAtivos.filter(c => !c.ganhou)
  const bonusOk           = bonusCriterios.retracaoOk && bonusCriterios.indispOk && bonusCriterios.churnOk

  return (
    <>
      <style dangerouslySetInnerHTML={{ __html: `
        @property --rv-angle {
          syntax: '<angle>';
          initial-value: 0deg;
          inherits: false;
        }
        @keyframes rvBorderRotate { to { --rv-angle: 360deg; } }
        @keyframes rvFadeIn {
          from { opacity: 0; transform: translateY(16px); }
          to   { opacity: 1; transform: translateY(0); }
        }
        @keyframes rvSlideIn {
          from { opacity: 0; transform: translateY(10px); }
          to   { opacity: 1; transform: translateY(0); }
        }
        .rv-hero-beam {
          padding: 2px; border-radius: 12px;
          background: conic-gradient(
            from var(--rv-angle),
            transparent 0deg,
            rgba(201,168,76,0.3) 55deg,
            rgba(232,201,109,0.7) 85deg,
            rgba(245,217,122,0.9) 90deg,
            rgba(232,201,109,0.7) 95deg,
            rgba(201,168,76,0.3) 125deg,
            transparent 175deg
          );
          animation: rvFadeIn 0.5s ease both, rvBorderRotate 4s linear 0.5s infinite;
        }
        .rv-hero-beam-silver {
          padding: 2px; border-radius: 12px;
          background: conic-gradient(
            from var(--rv-angle),
            transparent 0deg,
            rgba(192,192,192,0.3) 55deg,
            rgba(232,232,232,0.7) 85deg,
            rgba(255,255,255,0.9) 90deg,
            rgba(232,232,232,0.7) 95deg,
            rgba(192,192,192,0.3) 125deg,
            transparent 175deg
          );
          animation: rvFadeIn 0.5s ease both, rvBorderRotate 5s linear 0.5s infinite;
        }
        .rv-hero-beam-bronze {
          padding: 2px; border-radius: 12px;
          background: conic-gradient(
            from var(--rv-angle),
            transparent 0deg,
            rgba(166,120,72,0.3) 55deg,
            rgba(205,127,50,0.65) 85deg,
            rgba(216,147,90,0.85) 90deg,
            rgba(205,127,50,0.65) 95deg,
            rgba(166,120,72,0.3) 125deg,
            transparent 175deg
          );
          animation: rvFadeIn 0.5s ease both, rvBorderRotate 6s linear 0.5s infinite;
        }
        .rv-hero-beam-blue {
          padding: 2px; border-radius: 12px;
          background: conic-gradient(
            from var(--rv-angle),
            transparent 0deg,
            rgba(56,189,248,0.2) 55deg,
            rgba(125,211,252,0.55) 85deg,
            rgba(186,230,253,0.75) 90deg,
            rgba(125,211,252,0.55) 95deg,
            rgba(56,189,248,0.2) 125deg,
            transparent 175deg
          );
          animation: rvFadeIn 0.5s ease both, rvBorderRotate 8s linear 0.5s infinite;
        }
        @keyframes rvGlow {
          0%, 100% { opacity: 0.3; }
          50%       { opacity: 0.6; }
        }
        @media (prefers-reduced-motion: reduce) {
          .rv-hero-beam,
          .rv-hero-beam-silver,
          .rv-hero-beam-bronze,
          .rv-hero-beam-blue { animation: rvFadeIn 0.01ms ease both; }
        }
      `}} />

      <div style={{ display: 'flex', flexDirection: 'column', gap: '14px' }}>

        {/* 1. Hero */}
        <HeroSection
          elegivel={elegivel}
          rvAnimado={rvAnimado}
          rvBruto={rvTotal}
          deducao={deducaoTotal}
          motivosInelegivel={motivosInelegivel}
          semDados={semDados}
          posicaoRanking={posicaoRanking}
        />

        {!semDados && (
          <>
            {/* 2. Elegibilidade */}
            <ElegibilidadeSection
              absValAtual={absValAtual}
              absMaximo={config.absMaximo}
              faltasNoMes={faltasNoMes}
              motivosInelegivel={motivosInelegivel}
            />

            {/* 3. Componentes */}
            <ComponentesSection
              componentes={componentes}
              config={config}
              elegivel={elegivel}
              posicaoRanking={posicaoRanking}
            />

            {/* 4. Cálculo */}
            <CalculoSection
              rvBase={rvBase}
              pedidosRealizados={pedidosRealizados}
              pedidosMeta={pedidosMeta}
              multiplicador={multiplicador}
              rvAposPedidos={rvAposPedidos}
              bonusCriterios={bonusCriterios}
              bonus={bonus}
              rvTotal={rvTotal}
              penalidades={penalidades}
              descontoIndividualAplicado={descontoIndividualAplicado}
              rvFinal={rvFinal}
              elegivel={elegivel}
              config={config}
            />

            {/* 5. O Que Posso Melhorar */}
            <MelhoriaSection
              naoAtingidos={naoAtingidos}
              config={config}
              elegivel={elegivel}
              motivosInelegivel={motivosInelegivel}
              bonusOk={bonusOk}
              bonusValor={config.bonusValor}
              penalidades={penalidades}
            />
          </>
        )}

        {/* 6. Regras */}
        <RegrasSection
          config={config}
          expanded={regrasExpandidas}
          onToggle={() => setRegrasExpandidas(v => !v)}
        />
      </div>
    </>
  )
}

// ── 1. Hero ───────────────────────────────────────────────────────────────────

function HeroSection({ elegivel, rvAnimado, rvBruto, deducao, motivosInelegivel, semDados, posicaoRanking }: {
  elegivel: boolean; rvAnimado: number
  rvBruto: number; deducao: number
  motivosInelegivel: string[]; semDados: boolean
  posicaoRanking: number
}) {
  if (semDados) {
    return (
      <div style={{
        background: 'var(--bg-card)', border: '1px solid rgba(201,168,76,0.08)',
        borderRadius: '12px', padding: '32px', textAlign: 'center',
      }}>
        <p style={{ color: 'var(--text-muted)', fontSize: '14px' }}>
          Dados insuficientes para calcular o RV deste mês.
        </p>
      </div>
    )
  }

  const p = getPaleta(posicaoRanking)
  const hasBrilho = elegivel && p.brilhoRgba !== null

  return (
    <div className={p.beamClass}>
      <div style={{
        position: 'relative', borderRadius: '10px',
        padding: '28px 32px 24px',
        background: p.heroBg,
        overflow: 'hidden',
      }}>
        {/* Brilho no canto sup. direito — só para elegíveis 1º/2º/3º */}
        {hasBrilho && (
          <div style={{
            position: 'absolute', top: 0, right: 0,
            width: '200px', height: '120px', pointerEvents: 'none', zIndex: 0,
            background: `radial-gradient(ellipse at top right, ${p.brilhoRgba} 0%, transparent 70%)`,
            animation: p.pulse ? 'rvGlow 3s ease-in-out infinite' : undefined,
          }} />
        )}

        {/* Badge elegibilidade */}
        <div style={{ position: 'relative', zIndex: 1, display: 'flex', justifyContent: 'flex-end', marginBottom: '12px' }}>
          <span style={{
            display: 'inline-flex', alignItems: 'center', gap: '5px',
            fontSize: '10px', fontWeight: 700, padding: '4px 10px', borderRadius: '4px',
            textTransform: 'uppercase', letterSpacing: '0.08em',
            ...(elegivel
              ? { background: 'rgba(34,197,94,0.12)', color: 'var(--verde)', border: '1px solid rgba(34,197,94,0.20)' }
              : { background: 'rgba(239,68,68,0.12)', color: 'var(--vermelho)', border: '1px solid rgba(239,68,68,0.20)' }),
          }}>
            {elegivel
              ? <><CheckCircle2 size={11} />ELEGÍVEL</>
              : <><XCircle size={11} />INELEGÍVEL</>
            }
          </span>
        </div>

        {/* Valor dominante */}
        <div style={{ position: 'relative', zIndex: 1, textAlign: 'left', marginBottom: '8px' }}>
          <div style={{
            fontSize: '72px', fontWeight: 900, lineHeight: 1,
            fontVariantNumeric: 'tabular-nums',
            ...(elegivel
              ? {
                  background: p.valorGradient,
                  WebkitBackgroundClip: 'text', WebkitTextFillColor: 'transparent', backgroundClip: 'text',
                }
              : { color: 'rgba(255,255,255,0.22)' }),
          }}>
            {formatBRL(rvAnimado)}
          </div>
        </div>

        {/* Label */}
        <p style={{
          position: 'relative', zIndex: 1, textAlign: 'left', fontSize: '13px',
          color: 'rgba(255,255,255,0.55)',
          marginBottom: (elegivel && deducao > 0) || (!elegivel && motivosInelegivel.length > 0) ? '16px' : '0',
        }}>
          RV estimado para este mês
        </p>

        {/* Bruto + dedução */}
        {elegivel && deducao > 0 && (
          <div style={{
            position: 'relative', zIndex: 1,
            display: 'flex', justifyContent: 'flex-start', alignItems: 'center', gap: '14px', flexWrap: 'wrap',
          }}>
            <span style={{ fontSize: '12px', color: 'rgba(255,255,255,0.42)' }}>
              Valor bruto: {formatBRL(rvBruto)}
            </span>
            <span style={{ fontSize: '12px', color: 'rgba(255,255,255,0.22)' }}>•</span>
            <span style={{ fontSize: '12px', color: (posicaoRanking === 1 || posicaoRanking === 3) ? '#fca5a5' : '#f87171' }}>
              Dedução: −{formatBRL(deducao)}
            </span>
          </div>
        )}

        {/* Motivos inelegível */}
        {!elegivel && motivosInelegivel.length > 0 && (
          <div style={{
            position: 'relative', zIndex: 1,
            padding: '12px 14px', borderRadius: '12px',
            background: 'rgba(239,68,68,0.06)', border: '1px solid rgba(239,68,68,0.16)',
          }}>
            <p style={{
              fontSize: '10px', fontWeight: 700, color: 'var(--vermelho)',
              textTransform: 'uppercase', letterSpacing: '0.08em', marginBottom: '8px',
            }}>
              Por que estou inelegível
            </p>
            {motivosInelegivel.map((m, i) => (
              <div key={i} style={{ display: 'flex', alignItems: 'flex-start', gap: '8px', marginTop: i > 0 ? '5px' : '0' }}>
                <XCircle size={13} style={{ color: 'var(--vermelho)', flexShrink: 0, marginTop: '1px' }} />
                <span style={{ fontSize: '12px', color: 'rgba(252,165,165,0.9)' }}>{m}</span>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  )
}

// ── 2. Elegibilidade ──────────────────────────────────────────────────────────

function ElegibilidadeSection({ absValAtual, absMaximo, faltasNoMes, motivosInelegivel }: {
  absValAtual: number; absMaximo: number
  faltasNoMes: number; motivosInelegivel: string[]
}) {
  const absOk    = absValAtual <= absMaximo
  const faltasOk = faltasNoMes < 2

  return (
    <SectionCard title="Elegibilidade">
      <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '10px' }}>
        <ElegItem
          label="ABS"
          valor={`${absValAtual.toFixed(1)}%`}
          sublabel={`Máximo permitido: ${absMaximo}%`}
          ok={absOk}
          blocking={!absOk && motivosInelegivel.some(m => m.toLowerCase().includes('abs'))}
        />
        <ElegItem
          label="Faltas no mês"
          valor={String(faltasNoMes)}
          sublabel="Máximo permitido: 1"
          ok={faltasOk}
          blocking={!faltasOk && motivosInelegivel.some(m => m.toLowerCase().includes('falta'))}
        />
      </div>
    </SectionCard>
  )
}

function ElegItem({ label, valor, sublabel, ok, blocking }: {
  label: string; valor: string; sublabel: string; ok: boolean; blocking: boolean
}) {
  return (
    <div style={{
      padding: '12px 14px', borderRadius: '12px',
      background: 'rgba(255,255,255,0.02)',
      border: '1px solid rgba(255,255,255,0.08)',
      ...(blocking ? { borderLeft: '2px solid var(--vermelho)' } : {}),
    }}>
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: '6px', marginBottom: '5px' }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
          {ok
            ? <CheckCircle2 size={18} style={{ color: 'var(--verde)', flexShrink: 0 }} />
            : <XCircle size={18} style={{ color: 'var(--vermelho)', flexShrink: 0 }} />
          }
          <span style={{ fontSize: '14px', fontWeight: 600, color: 'var(--text-primary)' }}>{label}</span>
        </div>
        <span style={{
          fontSize: '24px', fontWeight: 700, fontVariantNumeric: 'tabular-nums',
          color: ok ? 'rgba(255,255,255,0.95)' : 'rgba(252,165,165,0.95)',
        }}>
          {valor}
        </span>
      </div>
      <p style={{ fontSize: '11px', color: 'rgba(255,255,255,0.40)', paddingLeft: '20px' }}>{sublabel}</p>
    </div>
  )
}

// ── 3. Componentes ────────────────────────────────────────────────────────────

function ComponentesSection({ componentes, config, elegivel, posicaoRanking }: {
  componentes: ComponenteRV[]; config: RVConfig; elegivel: boolean; posicaoRanking: number
}) {
  const ativos = componentes.filter(c => c.aplicavel)

  return (
    <SectionCard title="Componentes do RV">
      <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '10px' }}>
        {ativos.map((comp, i) => (
          <ComponenteCard key={comp.id} comp={comp} config={config} elegivel={elegivel} posicaoRanking={posicaoRanking} delay={i * 55} />
        ))}
      </div>
    </SectionCard>
  )
}

function ComponenteCard({ comp, config, elegivel, posicaoRanking, delay }: {
  comp: ComponenteRV; config: RVConfig; elegivel: boolean; posicaoRanking: number; delay: number
}) {
  const prog   = calcProgresso(comp, config)
  const ganhou = comp.ganhou && elegivel
  const paleta = getPaleta(posicaoRanking)
  const bordaCard = paleta.bordaComp ?? `1px solid ${ganhou ? 'rgba(34,197,94,0.15)' : 'rgba(255,255,255,0.07)'}`

  return (
    <div style={{
      padding: '14px', borderRadius: '12px',
      background: 'rgba(255,255,255,0.02)',
      border: bordaCard,
      display: 'flex', flexDirection: 'column', gap: '8px',
      animation: 'rvSlideIn 0.4s ease both',
      animationDelay: `${delay}ms`,
    }}>

      {/* Linha topo: ícone + label + badge */}
      <div style={{ display: 'flex', alignItems: 'center', gap: '5px' }}>
        <span style={{ color: ganhou ? 'var(--verde)' : 'var(--text-muted)', flexShrink: 0 }}>
          <CompIcon id={comp.id} size={12} />
        </span>
        <span style={{
          flex: 1, fontSize: '10px', fontWeight: 700,
          textTransform: 'uppercase', letterSpacing: '0.08em', color: 'var(--text-muted)',
          overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap',
        }}>
          {LABEL_SHORT[comp.id] ?? comp.label}
        </span>
        <span style={{
          fontSize: '9px', fontWeight: 700, padding: '2px 6px', borderRadius: '4px',
          textTransform: 'uppercase', letterSpacing: '0.05em', flexShrink: 0,
          ...(ganhou
            ? { background: 'rgba(34,197,94,0.12)', color: 'var(--verde)', border: '1px solid rgba(34,197,94,0.20)' }
            : { background: 'rgba(239,68,68,0.08)', color: 'rgba(248,113,113,0.85)', border: '1px solid rgba(239,68,68,0.16)' }),
        }}>
          {ganhou ? 'BATIDA' : 'FORA'}
        </span>
      </div>

      {/* Valor + prêmio */}
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-end', gap: '4px' }}>
        <span style={{
          fontSize: '26px', fontWeight: 700, lineHeight: 1,
          fontVariantNumeric: 'tabular-nums',
          color: ganhou ? 'rgba(255,255,255,0.95)' : 'rgba(252,165,165,0.95)',
        }}>
          {comp.valorDisplay || '—'}
        </span>
        <span style={{
          fontSize: '12px', fontWeight: 700, fontVariantNumeric: 'tabular-nums',
          color: ganhou ? 'var(--verde)' : 'rgba(255,255,255,0.30)',
          paddingBottom: '2px',
        }}>
          +{formatBRL(comp.premio)}
        </span>
      </div>

      {/* Barra de progresso */}
      {comp.valorNum > 0 && (
        <div style={{ height: '2px', borderRadius: '99px', background: 'rgba(255,255,255,0.06)', overflow: 'hidden' }}>
          <div style={{
            height: '100%', width: `${Math.min(prog, 100)}%`, borderRadius: '99px',
            background: ganhou
              ? 'var(--verde)'
              : prog > 80 ? 'var(--amarelo)' : 'var(--vermelho)',
            transition: 'width 0.9s cubic-bezier(0.4,0,0.2,1)',
          }} />
        </div>
      )}

      {/* Meta */}
      <div>
        <p style={{ fontSize: '11px', color: 'rgba(255,255,255,0.38)', lineHeight: 1.4 }}>
          {comp.regraDisplay}
        </p>
        {comp.detalhe && (
          <p style={{ fontSize: '10px', color: 'var(--amarelo)', marginTop: '2px', lineHeight: 1.4 }}>
            {comp.detalhe}
          </p>
        )}
      </div>
    </div>
  )
}

// ── 4. Cálculo ────────────────────────────────────────────────────────────────

function CalculoSection({
  rvBase, pedidosRealizados, pedidosMeta, multiplicador, rvAposPedidos,
  bonusCriterios, bonus, rvTotal, penalidades,
  descontoIndividualAplicado, rvFinal, elegivel, config,
}: {
  rvBase: number; pedidosRealizados: number; pedidosMeta: number
  multiplicador: number; rvAposPedidos: number
  bonusCriterios: BonusCriterios; bonus: number; rvTotal: number
  penalidades: { metaLabel: string; percentual: number; valorDeduzido: number }[]
  descontoIndividualAplicado: { motivo: string; valor: number } | null
  rvFinal: number; elegivel: boolean; config: RVConfig
}) {
  const temMult  = pedidosMeta > 0
  const bonusGanhou = bonusCriterios.retracaoOk && bonusCriterios.indispOk && bonusCriterios.churnOk && elegivel && bonus > 0

  return (
    <SectionCard title="Cálculo do RV">
      <div style={{ display: 'flex', flexDirection: 'column' }}>

        {/* Subtotal dos componentes */}
        <CalcRow label="Subtotal dos componentes" valor={formatBRL(rvBase)} dim />

        {/* Multiplicador de pedidos */}
        {temMult && (
          <>
            <CalcDivider />
            <CalcRow
              label={`Multiplicador de pedidos (${Math.round(pedidosRealizados)}/${pedidosMeta})`}
              valor={`×${multiplicador.toFixed(2)}`}
              valorColor={multiplicador >= 1 ? 'var(--verde)' : 'var(--gold)'}
            />
            {multiplicador < 1 && (
              <CalcRow label="RV após multiplicador" valor={formatBRL(rvAposPedidos)} dim />
            )}
          </>
        )}

        {/* Bônus de qualidade */}
        <CalcDivider />
        <div style={{ padding: '10px 0' }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', gap: '8px' }}>
            <span style={{ fontSize: '13px', color: 'rgba(255,255,255,0.80)' }}>Bônus de Qualidade</span>
            <span style={{
              fontSize: '14px', fontWeight: 700, fontVariantNumeric: 'tabular-nums',
              color: bonusGanhou ? 'var(--verde)' : 'rgba(255,255,255,0.28)',
            }}>
              {bonusGanhou ? `+${formatBRL(bonus)}` : `+${formatBRL(0)}`}
            </span>
          </div>
          <div style={{ display: 'flex', flexWrap: 'wrap', gap: '10px', marginTop: '7px' }}>
            <BonusCrit ok={bonusCriterios.retracaoOk} label={`Ret ≥ ${config.bonusRetracaoMinima}%`} />
            <BonusCrit ok={bonusCriterios.indispOk} label={`Indisp ≤ ${config.bonusIndispMaxima}%`} />
            {config.churnMeta > 0 && (
              <BonusCrit ok={bonusCriterios.churnOk} label={`Churn ≤ ${config.churnMeta}`} />
            )}
          </div>
        </div>

        {/* Subtotal com bônus */}
        <CalcDivider />
        <CalcRow label="Subtotal com bônus" valor={formatBRL(rvTotal)} dim />

        {/* Deflatores */}
        {penalidades.map((pen, i) => (
          <DeflatorRow key={i} label={pen.metaLabel} percentual={pen.percentual} valor={pen.valorDeduzido} />
        ))}

        {/* Desconto individual */}
        {descontoIndividualAplicado && (
          <div style={{
            margin: '6px 0', padding: '10px 12px', borderRadius: '10px',
            background: 'rgba(239,68,68,0.04)', borderLeft: '2px solid var(--vermelho)',
          }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', gap: '8px' }}>
              <span style={{ fontSize: '13px', color: 'rgba(255,255,255,0.80)' }}>
                Desconto: {descontoIndividualAplicado.motivo}
              </span>
              <span style={{ fontSize: '14px', fontWeight: 700, color: 'var(--vermelho)', fontVariantNumeric: 'tabular-nums' }}>
                −{formatBRL(descontoIndividualAplicado.valor)}
              </span>
            </div>
          </div>
        )}

        {/* RV FINAL */}
        <div style={{
          marginTop: '10px', paddingTop: '12px',
          borderTop: '2px solid rgba(201,168,76,0.18)',
          display: 'flex', justifyContent: 'space-between', alignItems: 'center',
        }}>
          <span style={{
            fontSize: '13px', fontWeight: 700,
            textTransform: 'uppercase', letterSpacing: '0.08em', color: 'var(--gold)',
          }}>
            RV FINAL
          </span>
          <span style={{
            fontSize: '26px', fontWeight: 700, fontVariantNumeric: 'tabular-nums',
            background: 'linear-gradient(135deg, #f4d47c 0%, #d4a935 100%)',
            WebkitBackgroundClip: 'text', WebkitTextFillColor: 'transparent', backgroundClip: 'text',
          }}>
            {formatBRL(elegivel ? rvFinal : 0)}
          </span>
        </div>
      </div>
    </SectionCard>
  )
}

function CalcRow({ label, valor, dim, valorColor }: {
  label: string; valor: string; dim?: boolean; valorColor?: string
}) {
  return (
    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', gap: '8px', padding: '8px 0' }}>
      <span style={{ fontSize: '13px', color: dim ? 'rgba(255,255,255,0.58)' : 'rgba(255,255,255,0.85)' }}>
        {label}
      </span>
      <span style={{
        fontSize: '14px', fontWeight: 700, fontVariantNumeric: 'tabular-nums',
        color: valorColor ?? (dim ? 'rgba(255,255,255,0.65)' : 'var(--text-primary)'),
      }}>
        {valor}
      </span>
    </div>
  )
}

function CalcDivider() {
  return <div style={{ height: '1px', background: 'rgba(255,255,255,0.07)', margin: '2px 0' }} />
}

function BonusCrit({ ok, label }: { ok: boolean; label: string }) {
  return (
    <div style={{ display: 'inline-flex', alignItems: 'center', gap: '4px' }}>
      {ok
        ? <Check size={11} style={{ color: 'var(--verde)', flexShrink: 0 }} />
        : <X size={11} style={{ color: 'var(--vermelho)', flexShrink: 0 }} />
      }
      <span style={{ fontSize: '11px', color: ok ? 'rgba(134,239,172,0.9)' : 'rgba(252,165,165,0.9)' }}>
        {label}
      </span>
    </div>
  )
}

function DeflatorRow({ label, percentual, valor }: { label: string; percentual: number; valor: number }) {
  return (
    <div style={{
      margin: '6px 0', padding: '10px 12px', borderRadius: '10px',
      background: 'rgba(239,68,68,0.04)', borderLeft: '2px solid var(--vermelho)',
    }}>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', gap: '8px' }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
          <AlertTriangle size={13} style={{ color: 'var(--vermelho)', flexShrink: 0 }} />
          <span style={{ fontSize: '13px', color: 'rgba(255,255,255,0.80)' }}>
            Deflator {label} (−{percentual}%)
          </span>
        </div>
        <span style={{ fontSize: '14px', fontWeight: 700, color: 'var(--vermelho)', fontVariantNumeric: 'tabular-nums', flexShrink: 0 }}>
          −{formatBRL(valor)}
        </span>
      </div>
    </div>
  )
}

// ── 5. O Que Posso Melhorar ───────────────────────────────────────────────────

type Oportunidade = {
  titulo: string
  desc: string
  ganhe: number | null
}

function MelhoriaSection({ naoAtingidos, config, elegivel, motivosInelegivel, bonusOk, bonusValor, penalidades }: {
  naoAtingidos: ComponenteRV[]; config: RVConfig; elegivel: boolean
  motivosInelegivel: string[]; bonusOk: boolean; bonusValor: number
  penalidades: { metaLabel: string; percentual: number; valorDeduzido: number }[]
}) {
  const ops: Oportunidade[] = []

  if (!elegivel && motivosInelegivel.length > 0) {
    ops.push({ titulo: 'Elegibilidade ao RV', desc: motivosInelegivel.join(' · '), ganhe: null })
  }

  for (const comp of naoAtingidos) {
    const msg = getMelhoriaMsg(comp, config)
    if (!msg) continue
    ops.push({
      titulo: comp.label,
      desc: msg,
      ganhe: comp.aplicavel && comp.premio > 0 ? comp.premio : null,
    })
  }

  if (!bonusOk && bonusValor > 0) {
    ops.push({
      titulo: 'Bônus de Qualidade',
      desc: `Atinja TX Retenção ≥ ${config.bonusRetracaoMinima}% e Indisponibilidade ≤ ${config.bonusIndispMaxima}%`,
      ganhe: bonusValor,
    })
  }

  for (const pen of penalidades) {
    const jaCobertoByComp = naoAtingidos.some(c => c.label.toLowerCase() === pen.metaLabel.toLowerCase())
    if (jaCobertoByComp) continue
    ops.push({
      titulo: `Corrigir ${pen.metaLabel}`,
      desc: `Este deflator está reduzindo seu RV em ${pen.percentual}%.`,
      ganhe: pen.valorDeduzido,
    })
  }

  return (
    <SectionCard title="O Que Posso Melhorar">
      {ops.length === 0 ? (
        <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', padding: '16px 8px', gap: '8px' }}>
          <CheckCircle2 size={26} style={{ color: 'var(--verde)' }} />
          <p style={{
            fontFamily: 'var(--ff-display)', fontSize: '15px', fontWeight: 700,
            color: 'var(--verde)', textAlign: 'center',
          }}>
            Você está maximizando seu RV
          </p>
          <p style={{ fontSize: '12px', color: 'var(--text-muted)', textAlign: 'center' }}>
            Todos os critérios foram atingidos. Continue assim!
          </p>
        </div>
      ) : (
        <div style={{ display: 'flex', flexDirection: 'column', gap: '10px' }}>
          {ops.map((op, i) => (
            <MelhoriaItem key={i} op={op} />
          ))}
        </div>
      )}
    </SectionCard>
  )
}

function MelhoriaItem({ op }: { op: Oportunidade }) {
  return (
    <div style={{
      display: 'flex', alignItems: 'flex-start', gap: '10px',
      padding: '9px 12px', borderRadius: '12px',
      background: 'rgba(201,168,76,0.04)', border: '1px solid rgba(201,168,76,0.10)',
    }}>
      <AlertTriangle size={14} style={{ color: 'var(--gold)', flexShrink: 0, marginTop: '2px' }} />
      <div style={{ flex: 1 }}>
        <div style={{
          display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start',
          gap: '8px', flexWrap: 'wrap', marginBottom: '4px',
        }}>
          <p style={{ fontSize: '13px', fontWeight: 600, color: 'var(--gold-light)' }}>{op.titulo}</p>
          {op.ganhe !== null && op.ganhe > 0 && (
            <span style={{
              fontSize: '11px', fontWeight: 700, padding: '2px 8px', borderRadius: '4px',
              background: 'rgba(34,197,94,0.10)', color: 'var(--verde)',
              border: '1px solid rgba(34,197,94,0.18)', whiteSpace: 'nowrap', flexShrink: 0,
            }}>
              Ganhe {formatBRL(op.ganhe)}
            </span>
          )}
        </div>
        <p style={{ fontSize: '12px', color: 'var(--text-muted)', lineHeight: 1.5 }}>{op.desc}</p>
      </div>
    </div>
  )
}

// ── 6. Regras ─────────────────────────────────────────────────────────────────

function RegrasSection({ config, expanded, onToggle }: { config: RVConfig; expanded: boolean; onToggle: () => void }) {
  return (
    <div style={{
      background: 'var(--bg-card)', border: '1px solid rgba(201,168,76,0.08)',
      borderRadius: '12px', overflow: 'hidden',
    }}>
      <button
        type="button"
        onClick={onToggle}
        style={{
          width: '100%', display: 'flex', justifyContent: 'space-between', alignItems: 'center',
          padding: '14px 20px', background: 'transparent', border: 'none', cursor: 'pointer',
          transition: 'background 0.15s',
        }}
        onMouseEnter={e => { (e.currentTarget as HTMLElement).style.background = 'rgba(201,168,76,0.04)' }}
        onMouseLeave={e => { (e.currentTarget as HTMLElement).style.background = 'transparent' }}
      >
        <span style={{
          fontFamily: 'var(--ff-display)', fontSize: '11px', fontWeight: 700,
          textTransform: 'uppercase', letterSpacing: '0.12em', color: 'var(--gold)',
        }}>
          Como é calculado meu RV
        </span>
        <ChevronDown size={14} style={{
          color: 'var(--text-muted)',
          transition: 'transform 0.3s cubic-bezier(0.4,0,0.2,1)',
          transform: expanded ? 'rotate(0deg)' : 'rotate(-90deg)',
        }} />
      </button>

      <div style={{
        maxHeight: expanded ? '900px' : '0', overflow: 'hidden',
        transition: 'max-height 0.4s cubic-bezier(0.4,0,0.2,1)',
      }}>
        <div style={{ padding: '0 20px 20px', display: 'flex', flexDirection: 'column', gap: '16px' }}>

          <RegraGroup title="Critérios de Elegibilidade">
            <RegraLine label="ABS máximo" valor={`≤ ${config.absMaximo}%`} />
            <RegraLine label="Faltas no mês" valor="Máximo 1 falta" />
          </RegraGroup>

          <RegraGroup title="Componentes do RV">
            {config.retracaoFaixas.map((f, i) => (
              <RegraLine key={i} label={`TX Retenção ≥ ${f.min}%`} valor={formatBRL(f.valor)} />
            ))}
            <RegraLine label={`Indisponibilidade ≤ ${config.indispLimite}%`} valor={formatBRL(config.indispValor)} />
            <RegraLine label={`TMA < ${segParaMMSS(config.tmaLimiteSeg)}`} valor={formatBRL(config.tmaValor)} />
            {config.ticketFaixas.map((f, i) => (
              <RegraLine key={i} label={`Variação Ticket ≥ ${f.min}%`} valor={formatBRL(f.valor)} />
            ))}
          </RegraGroup>

          {config.pedidosMeta > 0 && (
            <RegraGroup title="Multiplicador de Pedidos">
              <RegraLine label="Meta de pedidos" valor={String(config.pedidosMeta)} />
              <p style={{ fontSize: '11px', color: 'var(--text-muted)', lineHeight: 1.5 }}>
                RV = RV Base × (Pedidos / Meta), máximo 1×
              </p>
            </RegraGroup>
          )}

          {config.bonusValor > 0 && (
            <RegraGroup title={`Bônus de Qualidade (${formatBRL(config.bonusValor)})`}>
              <RegraLine label={`TX Retenção ≥ ${config.bonusRetracaoMinima}%`} valor="Obrigatório" />
              <RegraLine label={`Indisponibilidade ≤ ${config.bonusIndispMaxima}%`} valor="Obrigatório" />
              {config.churnMeta > 0 && (
                <RegraLine label={`Churn ≤ ${config.churnMeta}`} valor="Obrigatório" />
              )}
            </RegraGroup>
          )}

          {config.penalidades.filter(p => p.ativa).length > 0 && (
            <RegraGroup title="Deflatores">
              {config.penalidades.filter(p => p.ativa).map((pen, i) => (
                <RegraLine key={i} label={pen.metaLabel} valor={`−${pen.percentual}% se vermelho`} />
              ))}
            </RegraGroup>
          )}
        </div>
      </div>
    </div>
  )
}

function RegraGroup({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <div>
      <p style={{
        fontSize: '10px', fontWeight: 700, textTransform: 'uppercase',
        letterSpacing: '0.10em', color: 'rgba(244,212,124,0.7)', marginBottom: '8px',
      }}>
        {title}
      </p>
      <div style={{ display: 'flex', flexDirection: 'column', gap: '5px' }}>{children}</div>
    </div>
  )
}

function RegraLine({ label, valor }: { label: string; valor: string }) {
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
    <div style={{
      background: 'var(--bg-card)', border: '1px solid rgba(201,168,76,0.08)',
      borderRadius: '12px', padding: '20px',
    }}>
      <div style={{ display: 'flex', alignItems: 'center', gap: '10px', marginBottom: '16px' }}>
        <span style={{
          fontFamily: 'var(--ff-display)', fontSize: '11px', fontWeight: 700,
          textTransform: 'uppercase', letterSpacing: '0.12em', color: 'rgba(244,212,124,0.7)',
        }}>
          {title}
        </span>
        <div style={{ flex: 1, height: '1px', background: 'linear-gradient(90deg, rgba(201,168,76,0.15) 0%, transparent 100%)' }} />
      </div>
      {children}
    </div>
  )
}
