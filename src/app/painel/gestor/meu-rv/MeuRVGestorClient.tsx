'use client'

import { useState } from 'react'
import type { ResultadoRVGestor, RVGestorConfig } from '@/lib/rv-gestor-utils'
import { formatBRLGestor, segParaMMSSGestor } from '@/lib/rv-gestor-utils'
import type { OpKpiData } from '../GestorRVSection'
import { useCountUp } from '@/hooks/useCountUp'
import { getIniciaisNome } from '@/lib/operadores'
import {
  CheckCircle2, XCircle, AlertTriangle, ChevronDown,
  Target, Activity, Clock, TrendingUp, Check, X,
  Users, Info,
} from 'lucide-react'

export interface MeuRVGestorProps {
  rv:                  ResultadoRVGestor
  config:              RVGestorConfig
  opKpis:              OpKpiData[]
  absVal:              number
  monitoriasCompletas: number
  totalMonitorias:     number
  totalOperadores:     number
  mesLabel:            string
  dataAtualizacao:     string | null
}

type HoverComp = 'retracao' | 'indisp' | 'tma' | 'abs-deflator' | null

// ── Main ─────────────────────────────────────────────────────────────────────

export default function MeuRVGestorClient({
  rv, config, opKpis, absVal, monitoriasCompletas, totalMonitorias, totalOperadores, mesLabel, dataAtualizacao,
}: MeuRVGestorProps) {
  const rvAnimado       = useCountUp(rv.rvFinal, 800)
  const [regrasOpen, setRegrasOpen] = useState(false)
  const [hoveredComp, setHoveredComp] = useState<HoverComp>(null)

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
        @media (prefers-reduced-motion: reduce) {
          .rv-hero-beam-blue { animation: rvFadeIn 0.01ms ease both; }
        }
      `}} />

      <div className="login-grid-bg" style={{ display: 'flex', flexDirection: 'column', gap: '14px' }}>

        {/* 1. Hero */}
        <HeroSection rv={rv} rvAnimado={rvAnimado} mesLabel={mesLabel} dataAtualizacao={dataAtualizacao} />

        {!rv.semDados && (
          <>
            {/* 2. Elegibilidade */}
            <ElegibilidadeSection
              rv={rv}
              monitoriasCompletas={monitoriasCompletas}
              totalOperadores={totalOperadores}
            />

            {/* 3. Componentes */}
            <ComponentesSection
              rv={rv}
              config={config}
              opKpis={opKpis}
              hoveredComp={hoveredComp}
              onHover={setHoveredComp}
            />

            {/* 4. Cálculo */}
            <CalculoSection rv={rv} config={config} />

            {/* 5. O Que Posso Melhorar */}
            <MelhoriaSection rv={rv} config={config} monitoriasCompletas={monitoriasCompletas} />
          </>
        )}

        {/* 6. Regras */}
        <RegrasSection config={config} expanded={regrasOpen} onToggle={() => setRegrasOpen(v => !v)} />
      </div>
    </>
  )
}

// ── 1. Hero ───────────────────────────────────────────────────────────────────

function HeroSection({ rv, rvAnimado, mesLabel, dataAtualizacao }: {
  rv: ResultadoRVGestor
  rvAnimado: number
  mesLabel: string
  dataAtualizacao: string | null
}) {
  if (rv.semDados) {
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

  const hasDed = rv.totalDeflator > 0

  return (
    <div className="rv-hero-beam-blue">
      <div style={{
        position: 'relative', borderRadius: '10px',
        padding: '28px 32px 24px',
        background: '#0d1824',
        overflow: 'hidden',
      }}>
        {/* Mês */}
        <div style={{ position: 'relative', zIndex: 1, marginBottom: '12px' }}>
          <span style={{ fontSize: '11px', color: 'rgba(255,255,255,0.30)', letterSpacing: '0.08em', textTransform: 'uppercase' }}>
            {mesLabel}
          </span>
        </div>

        {/* Valor */}
        <div style={{ position: 'relative', zIndex: 1, textAlign: 'left', marginBottom: '6px' }}>
          <div style={{
            fontSize: '72px', fontWeight: 900, lineHeight: 1,
            fontVariantNumeric: 'tabular-nums',
            background: 'linear-gradient(135deg, #60a5fa 0%, #93c5fd 100%)',
            WebkitBackgroundClip: 'text', WebkitTextFillColor: 'transparent', backgroundClip: 'text',
          }}>
            {formatBRLGestor(rvAnimado)}
          </div>
        </div>

        <p style={{
          position: 'relative', zIndex: 1, textAlign: 'left', fontSize: '13px',
          color: 'rgba(255,255,255,0.45)',
          marginBottom: hasDed || !rv.elegivel ? '16px' : '0',
        }}>
          RV estimado para este mês
          {dataAtualizacao && (
            <span style={{ marginLeft: '8px', fontSize: '11px', color: 'rgba(255,255,255,0.25)' }}>
              · ref. {dataAtualizacao}
            </span>
          )}
        </p>

        {/* Bruto + dedução */}
        {rv.elegivel && hasDed && (
          <div style={{
            position: 'relative', zIndex: 1,
            display: 'flex', justifyContent: 'flex-start', alignItems: 'center', gap: '14px', flexWrap: 'wrap',
          }}>
            <span style={{ fontSize: '12px', color: 'rgba(255,255,255,0.42)' }}>
              Bruto: {formatBRLGestor(rv.rvComBonus)}
            </span>
            <span style={{ fontSize: '12px', color: 'rgba(255,255,255,0.22)' }}>•</span>
            <span style={{ fontSize: '12px', color: '#fca5a5' }}>
              Deflatores: −{formatBRLGestor(rv.totalDeflator)}
            </span>
          </div>
        )}

        {/* Motivo inelegível */}
        {!rv.elegivel && rv.motivoInelegivel && (
          <div style={{
            position: 'relative', zIndex: 1,
            padding: '10px 14px', borderRadius: '10px',
            background: 'rgba(234,179,8,0.06)', border: '1px solid rgba(234,179,8,0.16)',
          }}>
            <div style={{ display: 'flex', alignItems: 'flex-start', gap: '8px' }}>
              <AlertTriangle size={13} style={{ color: 'var(--amarelo)', flexShrink: 0, marginTop: '1px' }} />
              <span style={{ fontSize: '12px', color: 'rgba(253,224,71,0.85)' }}>{rv.motivoInelegivel}</span>
            </div>
          </div>
        )}
      </div>
    </div>
  )
}

// ── 2. Elegibilidade ──────────────────────────────────────────────────────────

function ElegibilidadeSection({ rv, monitoriasCompletas, totalOperadores }: {
  rv: ResultadoRVGestor
  monitoriasCompletas: number
  totalOperadores: number
}) {
  const monOk = monitoriasCompletas >= 13

  return (
    <SectionCard title="Elegibilidade">
      <ElegItem
        label="Monitorias"
        valor={`${monitoriasCompletas}/${totalOperadores}`}
        sublabel="Operadores com 4+ monitorias enviadas • Mínimo: 14"
        ok={monOk}
        blocking={!monOk && !rv.elegivel}
      />
    </SectionCard>
  )
}

function ElegItem({ label, valor, sublabel, ok, blocking }: {
  label: string; valor: string; sublabel: string; ok: boolean; blocking: boolean
}) {
  return (
    <div style={{
      padding: '14px 18px', borderRadius: '12px',
      background: 'rgba(255,255,255,0.02)',
      border: '1px solid rgba(255,255,255,0.08)',
      ...(blocking ? { borderLeft: '2px solid var(--vermelho)' } : {}),
    }}>
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: '6px', marginBottom: '6px' }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
          {ok
            ? <CheckCircle2 size={20} style={{ color: 'var(--verde)', flexShrink: 0 }} />
            : <XCircle size={20} style={{ color: 'var(--vermelho)', flexShrink: 0 }} />
          }
          <span style={{ fontSize: '15px', fontWeight: 600, color: 'var(--text-primary)' }}>{label}</span>
        </div>
        <span style={{
          fontSize: '28px', fontWeight: 700, fontVariantNumeric: 'tabular-nums',
          color: ok ? 'rgba(255,255,255,0.95)' : 'rgba(252,165,165,0.95)',
        }}>
          {valor}
        </span>
      </div>
      <p style={{ fontSize: '11px', color: 'rgba(255,255,255,0.40)', paddingLeft: '28px' }}>{sublabel}</p>
    </div>
  )
}

// ── 3. Componentes ────────────────────────────────────────────────────────────

type CompDef = {
  id:          string
  label:       string
  valorDisplay: string
  ganhou:      boolean
  premio:      number
  regraDisplay: string
  progress:    number
  aplicavel:   boolean
  hoverKey:    HoverComp
  icon:        React.ReactNode
}

function buildComps(rv: ResultadoRVGestor, config: RVGestorConfig): CompDef[] {
  const minRet = config.retencaoFaixas[config.retencaoFaixas.length - 1]?.min ?? 58
  const minTkt = config.ticketFaixas[config.ticketFaixas.length - 1]?.min ?? -18

  return [
    {
      id: 'retracao',
      label: 'TX. RETENÇÃO',
      valorDisplay: rv.retencaoVal > 0 ? `${rv.retencaoVal.toFixed(1)}%` : '—',
      ganhou: rv.retencaoBase > 0,
      premio: rv.retencaoBase,
      regraDisplay: `≥ ${minRet}%`,
      progress: rv.retencaoVal > 0 ? Math.min(100, rv.retencaoVal / 65 * 100) : 0,
      aplicavel: true,
      hoverKey: 'retracao',
      icon: <Target size={12} />,
    },
    {
      id: 'indisp',
      label: 'INDISPONIBILIDADE',
      valorDisplay: rv.indispVal > 0 ? `${rv.indispVal.toFixed(1)}%` : '—',
      ganhou: rv.indispBonus > 0,
      premio: rv.indispBonus,
      regraDisplay: `≤ ${config.indispMeta}%`,
      progress: rv.indispVal > 0
        ? (rv.indispBonus > 0 ? 100 : Math.min(99, config.indispMeta / rv.indispVal * 100))
        : 0,
      aplicavel: true,
      hoverKey: 'indisp',
      icon: <Activity size={12} />,
    },
    {
      id: 'tma',
      label: 'TMA',
      valorDisplay: rv.tmaValSeg > 0 ? segParaMMSSGestor(rv.tmaValSeg) : '—',
      ganhou: rv.tmaBonus > 0,
      premio: rv.tmaBonus,
      regraDisplay: `≤ ${segParaMMSSGestor(config.tmaMetaSeg)}`,
      progress: rv.tmaValSeg > 0
        ? (rv.tmaBonus > 0 ? 100 : Math.min(99, config.tmaMetaSeg / rv.tmaValSeg * 100))
        : 0,
      aplicavel: true,
      hoverKey: 'tma',
      icon: <Clock size={12} />,
    },
    {
      id: 'ticket',
      label: 'VAR. TICKET',
      valorDisplay: rv.ticketAplicavel && rv.ticketVal !== 0
        ? `${rv.ticketVal >= 0 ? '+' : ''}${rv.ticketVal.toFixed(1)}%`
        : '—',
      ganhou: rv.ticketBonus > 0,
      premio: rv.ticketBonus,
      regraDisplay: rv.ticketAplicavel
        ? `≥ ${minTkt}%`
        : `Ret ≥ ${config.ticketMinRetracao}%`,
      progress: rv.ticketAplicavel && rv.ticketVal !== 0
        ? Math.min(100, Math.max(0, (rv.ticketVal - minTkt) / Math.abs(minTkt) * 100))
        : 0,
      aplicavel: rv.ticketAplicavel,
      hoverKey: null,
      icon: <TrendingUp size={12} />,
    },
  ]
}

function ComponentesSection({ rv, config, opKpis, hoveredComp, onHover }: {
  rv: ResultadoRVGestor
  config: RVGestorConfig
  opKpis: OpKpiData[]
  hoveredComp: HoverComp
  onHover: (k: HoverComp) => void
}) {
  const comps = buildComps(rv, config)

  return (
    <SectionCard title="Componentes do RV">
      <div style={{ display: 'flex', alignItems: 'flex-start', gap: '14px' }}>
        <div style={{ flex: 1, display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '10px' }}>
          {comps.map((comp, i) => (
            <ComponenteCard
              key={comp.id}
              comp={comp}
              delay={i * 55}
              hovered={hoveredComp === comp.hoverKey && comp.hoverKey !== null}
              onMouseEnter={() => comp.hoverKey && onHover(comp.hoverKey)}
              onMouseLeave={() => onHover(null)}
            />
          ))}
        </div>

        {/* Hover popup — always reserves 230px to prevent layout shift / flicker loop */}
        <div style={{ width: '230px', flexShrink: 0, pointerEvents: 'none' }}>
          {hoveredComp && (
            <div style={{ animation: 'rvSlideIn 0.2s ease both' }}>
              <OpPopup line={hoveredComp} config={config} opKpis={opKpis} />
            </div>
          )}
        </div>
      </div>
    </SectionCard>
  )
}

function ComponenteCard({ comp, delay, hovered, onMouseEnter, onMouseLeave }: {
  comp: CompDef
  delay: number
  hovered: boolean
  onMouseEnter: () => void
  onMouseLeave: () => void
}) {
  const ganhou = comp.ganhou && comp.aplicavel

  return (
    <div
      onMouseEnter={onMouseEnter}
      onMouseLeave={onMouseLeave}
      style={{
        padding: '14px', borderRadius: '12px',
        background: hovered ? 'rgba(56,189,248,0.04)' : 'rgba(255,255,255,0.02)',
        border: `1px solid ${hovered ? 'rgba(56,189,248,0.20)' : ganhou ? 'rgba(34,197,94,0.15)' : 'rgba(255,255,255,0.07)'}`,
        display: 'flex', flexDirection: 'column', gap: '8px',
        animation: 'rvSlideIn 0.4s ease both',
        animationDelay: `${delay}ms`,
        cursor: comp.hoverKey ? 'default' : undefined,
        transition: 'border-color 0.15s, background 0.15s',
      }}
    >
      {/* Linha topo */}
      <div style={{ display: 'flex', alignItems: 'center', gap: '5px' }}>
        <span style={{ color: ganhou ? 'var(--verde)' : !comp.aplicavel ? 'rgba(255,255,255,0.20)' : 'var(--text-muted)', flexShrink: 0 }}>
          {comp.icon}
        </span>
        <span style={{
          flex: 1, fontSize: '9px', fontWeight: 700,
          textTransform: 'uppercase', letterSpacing: '0.09em', color: 'var(--text-muted)',
          overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap',
        }}>
          {comp.label}
        </span>
        <span style={{
          fontSize: '9px', fontWeight: 700, padding: '2px 6px', borderRadius: '4px',
          textTransform: 'uppercase', letterSpacing: '0.05em', flexShrink: 0,
          ...(!comp.aplicavel
            ? { background: 'rgba(255,255,255,0.04)', color: 'rgba(255,255,255,0.30)', border: '1px solid rgba(255,255,255,0.08)' }
            : ganhou
              ? { background: 'rgba(34,197,94,0.12)', color: 'var(--verde)', border: '1px solid rgba(34,197,94,0.20)' }
              : { background: 'rgba(239,68,68,0.08)', color: 'rgba(248,113,113,0.85)', border: '1px solid rgba(239,68,68,0.16)' }),
        }}>
          {!comp.aplicavel ? 'N/A' : ganhou ? 'BATIDA' : 'FORA'}
        </span>
      </div>

      {/* Valor + prêmio */}
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-end', gap: '4px' }}>
        <span style={{
          fontSize: '24px', fontWeight: 700, lineHeight: 1,
          fontVariantNumeric: 'tabular-nums',
          color: !comp.aplicavel
            ? 'rgba(255,255,255,0.22)'
            : ganhou
              ? 'rgba(255,255,255,0.95)'
              : 'rgba(252,165,165,0.90)',
        }}>
          {comp.valorDisplay || '—'}
        </span>
        <span style={{
          fontSize: '12px', fontWeight: 700, fontVariantNumeric: 'tabular-nums',
          color: ganhou ? 'var(--verde)' : 'rgba(255,255,255,0.25)',
          paddingBottom: '2px',
        }}>
          +{formatBRLGestor(comp.premio)}
        </span>
      </div>

      {/* Barra de progresso */}
      {comp.progress > 0 && (
        <div style={{ height: '2px', borderRadius: '99px', background: 'rgba(255,255,255,0.06)', overflow: 'hidden' }}>
          <div style={{
            height: '100%', width: `${Math.min(comp.progress, 100)}%`, borderRadius: '99px',
            background: ganhou ? 'var(--verde)' : comp.progress > 80 ? 'var(--amarelo)' : 'var(--vermelho)',
            transition: 'width 0.9s cubic-bezier(0.4,0,0.2,1)',
          }} />
        </div>
      )}

      {/* Meta */}
      <p style={{ fontSize: '11px', color: 'rgba(255,255,255,0.35)', lineHeight: 1.4 }}>
        {comp.regraDisplay}
        {comp.hoverKey && <span style={{ marginLeft: '4px', color: 'rgba(56,189,248,0.50)', fontSize: '9px' }}>· hover para detalhes</span>}
      </p>
    </div>
  )
}

// ── Hover popup ───────────────────────────────────────────────────────────────

function OpPopup({ line, config, opKpis }: {
  line: HoverComp
  config: RVGestorConfig
  opKpis: OpKpiData[]
}) {
  if (!line) return null

  type Entry = { op: OpKpiData; valor: string }
  let title = ''
  let metaLabel = ''
  let entries: Entry[] = []

  if (line === 'retracao') {
    title = 'TX Retenção'
    metaLabel = 'Meta ≥ 60%'
    entries = opKpis
      .filter(o => o.retencaoVal > 0 && o.retencaoVal < 60)
      .sort((a, b) => a.retencaoVal - b.retencaoVal)
      .map(o => ({ op: o, valor: `${o.retencaoVal.toFixed(1)}%` }))
  } else if (line === 'indisp') {
    title = 'Indisponibilidade'
    metaLabel = `Meta ≤ ${config.indispMeta}%`
    entries = opKpis
      .filter(o => o.indispVal > config.indispMeta)
      .sort((a, b) => b.indispVal - a.indispVal)
      .map(o => ({ op: o, valor: `${o.indispVal.toFixed(1)}%` }))
  } else if (line === 'tma') {
    title = 'TMA'
    metaLabel = `Meta ≤ ${segParaMMSSGestor(config.tmaMetaSeg)}`
    entries = opKpis
      .filter(o => o.tmaValSeg > config.tmaMetaSeg)
      .sort((a, b) => b.tmaValSeg - a.tmaValSeg)
      .map(o => ({ op: o, valor: segParaMMSSGestor(o.tmaValSeg) }))
  } else {
    return null
  }

  return (
    <div style={{
      background: '#0d0d1a',
      border: '1px solid rgba(201,168,76,0.20)',
      borderRadius: '12px',
      padding: '14px',
    }}>
      <div style={{ display: 'flex', alignItems: 'center', gap: '6px', marginBottom: '8px' }}>
        <Users size={12} style={{ color: 'var(--gold)', flexShrink: 0 }} />
        <span style={{ fontSize: '10px', fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.10em', color: 'var(--gold-light)' }}>
          {title}
        </span>
      </div>
      <p style={{ fontSize: '9px', color: 'var(--text-muted)', marginBottom: '8px', letterSpacing: '0.05em' }}>
        {metaLabel} · {entries.length} fora da meta
      </p>

      {entries.length === 0 ? (
        <p style={{ fontSize: '11px', color: '#34d399', textAlign: 'center', padding: '8px 0' }}>
          Todos dentro da meta ✓
        </p>
      ) : (
        <div style={{ display: 'flex', flexDirection: 'column', gap: '5px', maxHeight: '280px', overflowY: 'auto' }}>
          {entries.map(({ op, valor }) => (
            <div key={op.id} style={{
              display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: '8px',
              padding: '5px 8px', borderRadius: '7px',
              background: 'rgba(255,255,255,0.02)', border: '1px solid rgba(255,255,255,0.04)',
            }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: '6px', minWidth: 0 }}>
                <div style={{
                  width: '20px', height: '20px', borderRadius: '5px',
                  display: 'flex', alignItems: 'center', justifyContent: 'center',
                  fontSize: '7px', fontWeight: 700, flexShrink: 0, color: '#ffffff',
                  background: 'linear-gradient(135deg, #0f1729, #1a2540)',
                  border: '1px solid rgba(66,139,255,0.20)',
                }}>
                  {getIniciaisNome(op.nome)}
                </div>
                <span style={{ fontSize: '10px', color: 'var(--text-secondary)', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                  {op.nome.split(' ')[0]}
                </span>
              </div>
              <span style={{ fontSize: '11px', fontWeight: 700, color: '#ef4444', fontVariantNumeric: 'tabular-nums', flexShrink: 0 }}>
                {valor}
              </span>
            </div>
          ))}
        </div>
      )}
    </div>
  )
}

// ── 4. Cálculo ────────────────────────────────────────────────────────────────

function CalculoSection({ rv, config }: { rv: ResultadoRVGestor; config: RVGestorConfig }) {
  const bonusGanhou = rv.bonusAplicado && rv.elegivel

  return (
    <SectionCard title="Cálculo do RV">
      <div style={{ display: 'flex', flexDirection: 'column' }}>

        {/* Componentes individuais */}
        <CalcRow label="TX. Retenção" valor={formatBRLGestor(rv.retencaoBase)} dim />
        <CalcRow label="Indisponibilidade" valor={formatBRLGestor(rv.indispBonus)} dim />
        <CalcRow label="TMA" valor={formatBRLGestor(rv.tmaBonus)} dim />
        {rv.ticketAplicavel && (
          <CalcRow label="Variação Ticket" valor={formatBRLGestor(rv.ticketBonus)} dim />
        )}

        <CalcDivider />
        <CalcRow label="Subtotal dos componentes" valor={formatBRLGestor(rv.rvBase)} />

        {/* Bônus 20% */}
        <CalcDivider />
        <div style={{ padding: '10px 0' }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', gap: '8px' }}>
            <span style={{ fontSize: '13px', color: 'rgba(255,255,255,0.80)' }}>
              Bônus de Performance ({config.bonusPercentual}%)
            </span>
            <span style={{
              fontSize: '14px', fontWeight: 700, fontVariantNumeric: 'tabular-nums',
              color: bonusGanhou ? 'var(--verde)' : 'rgba(255,255,255,0.28)',
            }}>
              {bonusGanhou ? `+${formatBRLGestor(rv.bonusValor)}` : '+R$ 0,00'}
            </span>
          </div>
          <div style={{ display: 'flex', flexWrap: 'wrap', gap: '10px', marginTop: '7px' }}>
            <BonusCrit ok={rv.retencaoVal >= config.bonusRetencaoMin} label={`Ret ≥ ${config.bonusRetencaoMin}%`} />
            <BonusCrit ok={rv.indispVal > 0 && rv.indispVal <= config.bonusAbsMax || rv.indispVal === 0} label={`ABS ≤ ${config.bonusAbsMax}%`} />
          </div>
        </div>

        <CalcDivider />
        <CalcRow label="Subtotal com bônus" valor={formatBRLGestor(rv.rvComBonus)} />

        {/* Deflatores */}
        {rv.deflatores.map((d, i) => (
          <DeflatorRow key={i} label={d.motivo} percentual={d.perda} valor={d.valorDeduzido} />
        ))}

        {/* RV Final */}
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
            {formatBRLGestor(rv.rvFinal)}
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
      <span style={{ fontSize: '13px', color: dim ? 'rgba(255,255,255,0.52)' : 'rgba(255,255,255,0.85)' }}>{label}</span>
      <span style={{
        fontSize: '14px', fontWeight: 700, fontVariantNumeric: 'tabular-nums',
        color: valorColor ?? (dim ? 'rgba(255,255,255,0.60)' : 'var(--text-primary)'),
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
          −{formatBRLGestor(valor)}
        </span>
      </div>
    </div>
  )
}

// ── 5. O Que Posso Melhorar ───────────────────────────────────────────────────

type Oportunidade = { titulo: string; desc: string; ganhe: number | null }

function MelhoriaSection({ rv, config, monitoriasCompletas }: {
  rv: ResultadoRVGestor
  config: RVGestorConfig
  monitoriasCompletas: number
}) {
  const ops: Oportunidade[] = []

  // Elegibilidade
  if (!rv.elegivel && rv.motivoInelegivel) {
    ops.push({ titulo: 'Elegibilidade ao RV', desc: rv.motivoInelegivel, ganhe: null })
  }

  // Retenção — sugerir upgrade de faixa
  if (rv.retencaoVal > 0) {
    const faixaAtual = rv.retencaoFaixa
    const proxFaixa  = config.retencaoFaixas.find(f => f.min > rv.retencaoVal)
    if (proxFaixa) {
      const diff = (proxFaixa.min - rv.retencaoVal).toFixed(1)
      ops.push({
        titulo: 'Upgrade de faixa — TX. Retenção',
        desc: `Aumente ${diff}% (de ${rv.retencaoVal.toFixed(1)}% para ${proxFaixa.min}%) para subir de faixa.`,
        ganhe: proxFaixa.valor - (faixaAtual?.valor ?? 0),
      })
    }
  }

  // Indisp
  if (rv.indispBonus === 0 && rv.indispVal > 0) {
    const exc = rv.indispVal - config.indispMeta
    ops.push({
      titulo: 'Indisponibilidade',
      desc: `Reduza ${exc.toFixed(1)}% (atual: ${rv.indispVal.toFixed(1)}%, meta: ≤${config.indispMeta}%).`,
      ganhe: config.indispValor,
    })
  }

  // TMA
  if (rv.tmaBonus === 0 && rv.tmaValSeg > 0) {
    const exc = rv.tmaValSeg - config.tmaMetaSeg
    ops.push({
      titulo: 'TMA',
      desc: `Reduza o TMA em ${segParaMMSSGestor(exc)} (atual: ${segParaMMSSGestor(rv.tmaValSeg)}, meta: ≤${segParaMMSSGestor(config.tmaMetaSeg)}).`,
      ganhe: config.tmaValor,
    })
  }

  // Ticket (se não aplicável)
  if (!rv.ticketAplicavel && rv.retencaoVal > 0) {
    const diff = (config.ticketMinRetracao - rv.retencaoVal).toFixed(1)
    ops.push({
      titulo: 'Desbloquear Variação Ticket',
      desc: `Aumente a TX. Retenção em ${diff}% para desbloquear o bônus de ticket.`,
      ganhe: null,
    })
  }

  // Bônus
  if (!rv.bonusAplicado && rv.rvBase > 0) {
    const potencial = Math.round(rv.rvBase * config.bonusPercentual / 100)
    ops.push({
      titulo: `Bônus de Performance (${config.bonusPercentual}%)`,
      desc: `Atinja TX. Retenção ≥ ${config.bonusRetencaoMin}% e ABS ≤ ${config.bonusAbsMax}%.`,
      ganhe: potencial,
    })
  }

  // Deflatores ativos
  for (const d of rv.deflatores) {
    ops.push({
      titulo: `Corrigir: ${d.motivo}`,
      desc: `Este deflator está reduzindo seu RV em ${d.perda}%.`,
      ganhe: d.valorDeduzido,
    })
  }

  return (
    <SectionCard title="O Que Posso Melhorar">
      {ops.length === 0 ? (
        <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', padding: '16px 8px', gap: '8px' }}>
          <CheckCircle2 size={26} style={{ color: 'var(--verde)' }} />
          <p style={{ fontFamily: 'var(--ff-display)', fontSize: '15px', fontWeight: 700, color: 'var(--verde)', textAlign: 'center' }}>
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
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', gap: '8px', flexWrap: 'wrap', marginBottom: '4px' }}>
          <p style={{ fontSize: '13px', fontWeight: 600, color: 'var(--gold-light)' }}>{op.titulo}</p>
          {op.ganhe !== null && op.ganhe > 0 && (
            <span style={{
              fontSize: '11px', fontWeight: 700, padding: '2px 8px', borderRadius: '4px',
              background: 'rgba(34,197,94,0.10)', color: 'var(--verde)',
              border: '1px solid rgba(34,197,94,0.18)', whiteSpace: 'nowrap', flexShrink: 0,
            }}>
              Ganhe {formatBRLGestor(op.ganhe)}
            </span>
          )}
        </div>
        <p style={{ fontSize: '12px', color: 'var(--text-muted)', lineHeight: 1.5 }}>{op.desc}</p>
      </div>
    </div>
  )
}

// ── 6. Regras ─────────────────────────────────────────────────────────────────

function RegrasSection({ config, expanded, onToggle }: {
  config: RVGestorConfig; expanded: boolean; onToggle: () => void
}) {
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

          <RegraGroup title="Elegibilidade">
            <RegraLine label="Monitorias completas" valor="≥ 14 operadores com 4+ monitorias enviadas" />
          </RegraGroup>

          <RegraGroup title="TX. Retenção (base do RV)">
            {config.retencaoFaixas.map((f, i) => (
              <RegraLine key={i} label={`≥ ${f.min}%`} valor={formatBRLGestor(f.valor)} />
            ))}
          </RegraGroup>

          <RegraGroup title="Bônus Operacional">
            <RegraLine label={`Indisponibilidade ≤ ${config.indispMeta}%`} valor={formatBRLGestor(config.indispValor)} />
            <RegraLine label={`TMA ≤ ${segParaMMSSGestor(config.tmaMetaSeg)}`} valor={formatBRLGestor(config.tmaValor)} />
          </RegraGroup>

          <RegraGroup title="Variação Ticket (req. Ret ≥ 60%)">
            {config.ticketFaixas.map((f, i) => (
              <RegraLine key={i} label={`≥ ${f.min}%`} valor={formatBRLGestor(f.valor)} />
            ))}
          </RegraGroup>

          <RegraGroup title={`Bônus de Performance (${config.bonusPercentual}% sobre RV Base)`}>
            <RegraLine label={`TX. Retenção ≥ ${config.bonusRetencaoMin}%`} valor="Obrigatório" />
            <RegraLine label={`ABS ≤ ${config.bonusAbsMax}%`} valor="Obrigatório" />
          </RegraGroup>

          <RegraGroup title="Deflatores">
            <RegraLine label={`TMA > ${segParaMMSSGestor(Math.round(config.tmaMetaSeg * (1 + config.tmaDeflatorPct / 100)))}`} valor={`−${config.tmaDeflatorPerda}%`} />
            <RegraLine label={`Indisponibilidade > ${config.indispMeta}%`} valor={`−${config.indispDeflatorPerda}%`} />
            {config.absDeflatorFaixas.filter(f => f.perda > 0).map((f, i) => (
              <RegraLine key={i} label={`ABS ≤ ${f.limite}%`} valor={`−${f.perda}%`} />
            ))}
          </RegraGroup>
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
