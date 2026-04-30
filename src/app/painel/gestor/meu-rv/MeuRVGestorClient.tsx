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
import { PainelHeader, LinhaHorizontalDourada } from '@/components/painel/PainelHeader'
import { PainelSectionTitle } from '@/components/painel/PainelSectionTitle'

export interface MeuRVGestorProps {
  rv:                  ResultadoRVGestor
  config:              RVGestorConfig
  opKpis:              OpKpiData[]
  absVal:              number
  monitoriasCompletas: number
  totalMonitorias:     number
  totalOperadores:     number
  mesLabel:            string
}

type HoverComp = 'retracao' | 'indisp' | 'tma' | 'abs-deflator' | null

// ── Main ─────────────────────────────────────────────────────────────────────

export default function MeuRVGestorClient({
  rv, config, opKpis, absVal, monitoriasCompletas, totalMonitorias, totalOperadores, mesLabel,
}: MeuRVGestorProps) {
  const rvAnimado = useCountUp(rv.rvFinal, 800)
  const [regrasOpen, setRegrasOpen] = useState(false)

  return (
    <>
      <style dangerouslySetInnerHTML={{ __html: `
        @keyframes rvSlideIn {
          from { opacity: 0; transform: translateY(10px); }
          to   { opacity: 1; transform: translateY(0); }
        }
        @media (max-width: 767px) {
          .rv-cols-grid { grid-template-columns: 1fr !important; }
        }
      `}} />

      <div className="halo-cards-bg" style={{ display: 'flex', flexDirection: 'column', gap: '14px' }}>

        {/* ── Header ── */}
        <PainelHeader titulo="Meu RV" mesLabel={mesLabel} />

        {/* ── Linha dourada HALO ── */}
        <LinhaHorizontalDourada />

        {/* ── RV ESTIMADO ── */}
        <PainelSectionTitle>RV ESTIMADO</PainelSectionTitle>

        {/* 1. Hero card */}
        <RVHeroCard
          rv={rv}
          rvAnimado={rvAnimado}
          monitoriasCompletas={monitoriasCompletas}
          totalOperadores={totalOperadores}
        />

        {!rv.semDados && (
          <>
            {/* 2+3. Componentes RV + Cálculo RV */}
            <PainelSectionTitle>COMPONENTES RV</PainelSectionTitle>
            <div className="rv-cols-grid" style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '24px' }}>
              <div style={{ display: 'flex', flexDirection: 'column', gap: '10px' }}>
                <NovaComponentesSection rv={rv} config={config} absVal={absVal} />
              </div>
              <div style={{ display: 'flex', flexDirection: 'column', gap: '14px', paddingTop: '4px' }}>
                <PainelSectionTitle>CALCULO RV</PainelSectionTitle>
                <NovaCalculoSection rv={rv} config={config} />
              </div>
            </div>

            {/* 4. O Que Posso Melhorar */}
            <MelhoriaSection rv={rv} config={config} monitoriasCompletas={monitoriasCompletas} />
          </>
        )}

        {/* 6. Regras */}
        <RegrasSection config={config} expanded={regrasOpen} onToggle={() => setRegrasOpen(v => !v)} />
      </div>
    </>
  )
}

// ── 1. RV Hero Card ───────────────────────────────────────────────────────────

const FF_SYNE_H = "'Syne', sans-serif"
const FF_DM_H   = "'DM Sans', sans-serif"
const pctBR = (n: number) => n.toLocaleString('pt-BR', { minimumFractionDigits: 1, maximumFractionDigits: 1 })

function RVHeroCard({ rv, rvAnimado, monitoriasCompletas, totalOperadores }: {
  rv: ResultadoRVGestor
  rvAnimado: number
  monitoriasCompletas: number
  totalOperadores: number
}) {
  if (rv.semDados) {
    return (
      <div style={{
        background: '#070714', border: '1px solid rgba(244,212,124,0.15)',
        borderRadius: '20px', padding: '32px', textAlign: 'center',
      }}>
        <p style={{ color: 'var(--text-muted)', fontSize: '14px' }}>
          Dados insuficientes para calcular o RV deste mês.
        </p>
      </div>
    )
  }

  let badgeLabel: string
  let badgeTextColor: string
  let badgeBg: string
  let badgeBorder: string

  if (rv.elegivel) {
    badgeLabel    = 'ELEGIVEL'
    badgeTextColor = '#22c55e'
    badgeBg       = 'rgba(74,222,128,0.13)'
    badgeBorder   = '1px solid rgba(34,197,94,0.72)'
  } else {
    badgeLabel    = 'INELEGIVEL'
    badgeTextColor = '#E33939'
    badgeBg       = 'rgba(242,96,96,0.13)'
    badgeBorder   = '1px solid rgba(227,57,57,0.72)'
  }

  return (
    <div style={{
      background: '#070714', border: '1px solid rgba(244,212,124,0.15)',
      borderRadius: '20px', padding: '28px 32px',
      display: 'flex', alignItems: 'stretch', minHeight: '157px',
      boxShadow: '0 4px 24px rgba(0,0,0,0.4)',
    }}>
      {/* Left — RV value */}
      <div style={{ flex: '0 0 auto', display: 'flex', alignItems: 'center', justifyContent: 'flex-start', paddingRight: '16px' }}>
        <span style={{
          fontFamily: FF_DM_H, fontSize: '64px', fontWeight: 900, lineHeight: 1,
          fontVariantNumeric: 'tabular-nums', color: '#B0AAFF', letterSpacing: '-0.02em',
        }}>
          {formatBRLGestor(rvAnimado)}
        </span>
      </div>

      {/* Vertical divider */}
      <div style={{ width: '1px', background: '#211F3C', margin: '8px 0', flexShrink: 0 }} />

      {/* Right — badge + counter */}
      <div style={{
        flex: 1, display: 'flex', flexDirection: 'column',
        alignItems: 'flex-start', justifyContent: 'flex-start',
        gap: '12px', paddingLeft: '16px', paddingTop: '8px',
      }}>
        <div style={{
          width: '147px', height: '29px',
          display: 'flex', alignItems: 'center', justifyContent: 'center',
          borderRadius: '0', background: badgeBg, border: badgeBorder,
        }}>
          <span style={{
            fontFamily: FF_SYNE_H, fontSize: '20px', fontWeight: 600,
            color: badgeTextColor, letterSpacing: '0.03em',
          }}>
            {badgeLabel}
          </span>
        </div>

        <div style={{ display: 'inline-flex', alignItems: 'baseline' }}>
          <span style={{ fontFamily: FF_SYNE_H, fontSize: '20px', fontWeight: 600, color: '#72708f', letterSpacing: '0.05em' }}>
            FEITO&nbsp;
          </span>
          <span style={{ fontFamily: FF_DM_H, fontSize: '20px', fontWeight: 700, color: '#72708f', fontVariantNumeric: 'tabular-nums' }}>
            {monitoriasCompletas}/{totalOperadores}
          </span>
          <span style={{ fontFamily: FF_SYNE_H, fontSize: '20px', fontWeight: 600, color: '#72708f', letterSpacing: '0.05em' }}>
            &nbsp;MONITORIAS
          </span>
        </div>
      </div>
    </div>
  )
}

// ── 2. Componentes RV (novo layout) ──────────────────────────────────────────

function NovaComponentesSection({ rv, config, absVal }: {
  rv: ResultadoRVGestor
  config: RVGestorConfig
  absVal: number
}) {
  const absOk = absVal <= config.bonusAbsMax
  const pct = (n: number) => n.toLocaleString('pt-BR', { minimumFractionDigits: 1, maximumFractionDigits: 1 })

  const comps = [
    {
      id: 'retracao',
      label: 'TX. RETENÇÃO',
      valorDisplay: rv.retencaoVal > 0 ? `${pct(rv.retencaoVal)}%` : '—',
      verde: rv.retencaoBase > 0,
      badgeText: rv.retencaoBase > 0 ? `+${formatBRLGestor(rv.retencaoBase)}` : 'FORA',
    },
    {
      id: 'indisp',
      label: 'INDISP.',
      valorDisplay: rv.indispVal > 0 ? `${pct(rv.indispVal)}%` : '—',
      verde: rv.indispBonus > 0,
      badgeText: rv.indispBonus > 0 ? `+${formatBRLGestor(rv.indispBonus)}` : 'FORA',
    },
    {
      id: 'abs',
      label: 'ABS',
      valorDisplay: absVal > 0 ? `${pct(absVal)}%` : '—',
      verde: absOk,
      badgeText: absOk ? 'DENTRO' : 'FORA',
    },
    {
      id: 'ticket',
      label: 'VR. TICKET',
      valorDisplay: rv.ticketAplicavel && rv.ticketVal !== 0
        ? `${rv.ticketVal < 0 ? '−' : '+'}${pct(Math.abs(rv.ticketVal))}%`
        : '—',
      verde: rv.ticketBonus > 0,
      badgeText: rv.ticketBonus > 0 ? `+${formatBRLGestor(rv.ticketBonus)}` : 'FORA',
    },
  ]

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: '10px' }}>
      {comps.map(c => (
        <NovoComponenteCard
          key={c.id}
          label={c.label}
          valorDisplay={c.valorDisplay}
          verde={c.verde}
          badgeText={c.badgeText}
        />
      ))}
    </div>
  )
}

function NovoComponenteCard({ label, valorDisplay, verde, badgeText }: {
  label: string
  valorDisplay: string
  verde: boolean
  badgeText: string
}) {
  const isMonetario = verde && /^\+R\$[\s ]/.test(badgeText)
  const badgeNumero = isMonetario ? badgeText.replace(/^\+R\$[\s ]/, '') : null

  return (
    <div style={{
      width: '100%',
      background: '#070714',
      border: '1px solid rgba(244,212,124,0.15)',
      borderRadius: '12px',
      padding: '12px 20px',
      display: 'flex',
      alignItems: 'center',
    }}>
      {/* Left — label + value (50% fixo para alinhar as 4 divisórias) */}
      <div style={{ flex: '0 0 50%', display: 'flex', flexDirection: 'column', justifyContent: 'center', gap: '2px', paddingRight: '16px' }}>
        <span style={{
          fontFamily: FF_SYNE_H, fontWeight: 600, fontSize: '24px',
          textTransform: 'uppercase', letterSpacing: '1px',
          color: verde ? 'rgba(106,196,73,0.62)' : 'rgba(227,57,57,0.74)', whiteSpace: 'nowrap',
        }}>
          {label}
        </span>
        <span className="rv-num" style={{
          fontSize: '48px', lineHeight: 1,
          fontVariantNumeric: 'tabular-nums', color: '#72708F',
        }}>
          {valorDisplay}
        </span>
      </div>

      {/* Divider */}
      <div style={{ width: '1px', background: '#211F3C', alignSelf: 'stretch', margin: '8px 0', flexShrink: 0 }} />

      {/* Right — badge (190×30px fixo) */}
      <div style={{ flex: 1, display: 'flex', alignItems: 'center', justifyContent: 'center', paddingLeft: '16px' }}>
        {isMonetario ? (
          <span style={{
            display: 'inline-flex',
            alignItems: 'center',
            justifyContent: 'center',
            width: '230px',
            height: '30px',
            border: '1px solid #3F8D23',
            background: 'rgba(103, 159, 83, 0.39)',
            borderRadius: '0',
            color: '#9ADE81',
            fontFamily: "'DM Sans', system-ui, sans-serif",
            fontWeight: 900,
            fontSize: '20px',
            lineHeight: 1,
            fontFeatureSettings: "'tnum'",
          }}>
            {`+R$ ${badgeNumero}`}
          </span>
        ) : (
          <span style={{
            display: 'inline-flex',
            alignItems: 'center',
            justifyContent: 'center',
            width: '230px',
            height: '30px',
            border: `1px solid ${verde ? '#3F8D23' : 'rgba(227, 57, 57, 0.72)'}`,
            background: verde ? 'rgba(103, 159, 83, 0.39)' : 'rgba(242, 96, 96, 0.13)',
            borderRadius: '0',
            color: verde ? '#9ADE81' : '#E33939',
            fontFamily: FF_SYNE_H,
            fontWeight: 600,
            fontSize: '20px',
            lineHeight: 1,
            textTransform: 'uppercase',
          }}>
            {badgeText}
          </span>
        )}
      </div>
    </div>
  )
}

// ── 3. Cálculo RV (novo layout) ───────────────────────────────────────────────

function NovaCalculoSection({ rv, config }: { rv: ResultadoRVGestor; config: RVGestorConfig }) {
  const bonusGanhou = rv.bonusAplicado && rv.elegivel
  const retOk = rv.retencaoVal >= config.bonusRetencaoMin
  const absOk = (rv.indispVal > 0 && rv.indispVal <= config.bonusAbsMax) || rv.indispVal === 0

  return (
    <div style={{
      background: '#070714',
      border: '1px solid rgba(244,212,124,0.15)',
      borderRadius: '12px',
      padding: '24px',
      display: 'flex',
      flexDirection: 'column',
    }}>
      <LinhaCalculo label="TX. RETENÇÃO" valor={formatBRLGestor(rv.retencaoBase)} />
      <LinhaCalculo label="INDISP." valor={formatBRLGestor(rv.indispBonus)} />
      <LinhaCalculo label="TMA" valor={formatBRLGestor(rv.tmaBonus)} />
      {rv.ticketAplicavel && (
        <LinhaCalculo label="VR. TICKET" valor={formatBRLGestor(rv.ticketBonus)} />
      )}

      <LinhaCalculo label="SUBTOTAL" valor={formatBRLGestor(rv.rvBase)} destaque />

      {/* Bônus de Performance */}
      <div style={{ padding: '8px 0' }}>
        <div style={{ display: 'flex', alignItems: 'baseline' }}>
          <span style={{ flexShrink: 0, display: 'inline-flex', alignItems: 'baseline' }}>
            <span style={{ fontFamily: FF_SYNE_H, fontWeight: 600, fontSize: '14px', textTransform: 'uppercase', color: '#72708f' }}>
              BÔNUS DE PERFORMANCE&nbsp;
            </span>
            <span style={{ fontFamily: FF_DM_H, fontWeight: 500, fontSize: '14px', color: '#72708f' }}>
              ({config.bonusPercentual}%)
            </span>
          </span>
          <span style={{
            flex: 1, borderBottom: '1px dotted rgba(114,112,143,0.3)',
            marginLeft: '12px', marginRight: '12px', marginBottom: '5px', alignSelf: 'end',
          }} />
          <span style={{
            fontFamily: FF_DM_H, fontWeight: 500, fontSize: '14px',
            color: bonusGanhou ? '#22c55e' : '#72708f',
            fontVariantNumeric: 'tabular-nums', flexShrink: 0,
          }}>
            {bonusGanhou ? `+${formatBRLGestor(rv.bonusValor)}` : 'R$ 0,00'}
          </span>
        </div>
        <div style={{ display: 'flex', gap: '14px', marginTop: '4px' }}>
          <BonusCondicao ok={retOk} label={`RET ≥ ${config.bonusRetencaoMin}%`} />
          <BonusCondicao ok={absOk} label={`ABS ≤ ${config.bonusAbsMax}%`} />
        </div>
      </div>

      <LinhaCalculo label="SUBTOTAL + BÔNUS" valor={formatBRLGestor(rv.rvComBonus)} destaque />

      {/* Deflatores */}
      <div style={{ paddingTop: '10px' }}>
        <span style={{
          fontFamily: FF_SYNE_H, fontWeight: 600, fontSize: '14px',
          textTransform: 'uppercase', letterSpacing: '0.08em', color: '#a1a3b8',
        }}>
          DEFLATORES
        </span>
      </div>

      {rv.deflatores.length === 0 ? (
        <p style={{
          fontFamily: FF_SYNE_H, fontSize: '13px',
          color: 'rgba(114,112,143,0.7)', fontStyle: 'italic', padding: '8px 0',
        }}>
          Nenhum deflator aplicado
        </p>
      ) : (
        <div style={{ display: 'flex', flexDirection: 'column' }}>
          {rv.deflatores.map((d, i) => (
            <NovoDeflatorRow key={i} motivo={d.motivo} perda={d.perda} valor={d.valorDeduzido} config={config} />
          ))}
        </div>
      )}
    </div>
  )
}

function LinhaCalculo({ label, valor, destaque }: {
  label: string
  valor: string
  destaque?: boolean
}) {
  return (
    <div style={{
      display: 'flex',
      alignItems: 'baseline',
      padding: destaque ? '10px 0' : '6px 0',
    }}>
      <span style={{
        flex: '0 0 auto',
        fontFamily: FF_SYNE_H,
        fontWeight: 600,
        fontSize: '14px',
        textTransform: 'uppercase',
        color: destaque ? '#a1a3b8' : '#72708f',
      }}>
        {label}
      </span>
      {destaque
        ? <span style={{ flex: 1 }} />
        : <span style={{
            flex: 1,
            borderBottom: '1px dotted rgba(114,112,143,0.3)',
            marginLeft: '12px', marginRight: '12px', marginBottom: '5px',
            alignSelf: 'end',
          }} />
      }
      <span style={{
        flex: '0 0 auto',
        fontFamily: FF_DM_H,
        fontWeight: destaque ? 600 : 500,
        fontSize: destaque ? '15px' : '14px',
        color: destaque ? '#a1a3b8' : '#72708f',
        fontVariantNumeric: 'tabular-nums',
      }}>
        {valor}
      </span>
    </div>
  )
}

function BonusCondicao({ ok, label }: { ok: boolean; label: string }) {
  // "RET ≥ 63,6%" → "RET" (Syne) + "≥ 63,6%" (DM Sans)
  const spaceIdx = label.indexOf(' ')
  const texto   = spaceIdx > -1 ? label.slice(0, spaceIdx) : label
  const numerico = spaceIdx > -1 ? label.slice(spaceIdx + 1) : ''
  const cor = ok ? 'rgba(34,197,94,0.8)' : 'rgba(227,57,57,0.8)'

  return (
    <div style={{ display: 'inline-flex', alignItems: 'center', gap: '4px' }}>
      <span style={{ fontSize: '11px', fontWeight: 700, color: ok ? '#22c55e' : '#E33939' }}>
        {ok ? '✓' : '✗'}
      </span>
      <span style={{ display: 'inline-flex', alignItems: 'baseline', gap: '2px' }}>
        <span style={{ fontFamily: FF_SYNE_H, fontSize: '11px', color: cor }}>{texto}</span>
        <span style={{ fontFamily: FF_DM_H, fontSize: '11px', color: cor, fontVariantNumeric: 'tabular-nums' }}>{numerico}</span>
      </span>
    </div>
  )
}

function NovoDeflatorRow({ motivo, perda, valor, config }: {
  motivo: string
  perda: number
  valor: number
  config: RVGestorConfig
}) {
  let textoLabel: string
  let numericoDesc: string

  if (motivo.startsWith('Indisponibilidade')) {
    // "Indisponibilidade 15.0% > 14,5%" → INDISP. + "15,0% > 14,5% (−15%)"
    const resto = motivo.replace('Indisponibilidade ', '').replace(/(\d+)\.(\d)/g, '$1,$2')
    textoLabel   = 'INDISP.'
    numericoDesc = `${resto} (−${perda}%)`
  } else if (motivo.startsWith('ABS')) {
    // "ABS 9.9%" → ABS + "9,9% > 5% (−30%)"
    const match  = motivo.match(/ABS ([\d.]+)%/)
    const val    = match ? match[1].replace('.', ',') : ''
    textoLabel   = 'ABS'
    numericoDesc = `${val}% > ${config.bonusAbsMax}% (−${perda}%)`
  } else if (motivo.startsWith('TMA')) {
    // "TMA 05:30 > 05:00" → TMA + "05:30 > 05:00 (−15%)"
    const resto  = motivo.replace(/^TMA\s*/, '')
    textoLabel   = 'TMA'
    numericoDesc = `${resto} (−${perda}%)`
  } else {
    textoLabel   = motivo
    numericoDesc = `(−${perda}%)`
  }

  return (
    <div style={{
      background: 'rgba(242,96,96,0.08)',
      border: '1px solid rgba(227,57,57,0.4)',
      borderRadius: '6px',
      padding: '8px 14px',
      display: 'flex',
      justifyContent: 'space-between',
      alignItems: 'center',
      marginTop: '8px',
      gap: '12px',
    }}>
      <span style={{ display: 'inline-flex', alignItems: 'baseline', gap: '4px', minWidth: 0 }}>
        <span style={{ fontFamily: FF_SYNE_H, fontWeight: 600, fontSize: '12px', color: '#E33939', textTransform: 'uppercase', whiteSpace: 'nowrap' }}>
          {textoLabel}
        </span>
        <span style={{ fontFamily: FF_DM_H, fontWeight: 500, fontSize: '12px', color: '#E33939', fontVariantNumeric: 'tabular-nums', whiteSpace: 'nowrap' }}>
          {numericoDesc}
        </span>
      </span>
      <span style={{
        fontFamily: FF_DM_H, fontWeight: 600, fontSize: '12px',
        color: '#E33939', fontVariantNumeric: 'tabular-nums', flexShrink: 0,
      }}>
        −{formatBRLGestor(valor)}
      </span>
    </div>
  )
}

// ── (legado — mantido para referência) ───────────────────────────────────────

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
    <SectionCard>
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

// ── 5. OPORTUNIDADES ─────────────────────────────────────────────────────────

type OportunidadeCat = 'bloqueio' | 'deflator' | 'bonus' | 'ganho'

interface Oportunidade {
  cat:   OportunidadeCat
  titulo: string
  desc:  string
  ganhe: number | null
}

const CAT_META: Record<OportunidadeCat, { cor: string; bg: string; border: string; verbo: string }> = {
  bloqueio: { cor: '#E33939', bg: 'rgba(227,57,57,0.06)',  border: 'rgba(227,57,57,0.25)',  verbo: 'BLOQUEIA' },
  deflator: { cor: '#F97316', bg: 'rgba(249,115,22,0.06)', border: 'rgba(249,115,22,0.25)', verbo: 'DEFLATOR' },
  bonus:    { cor: '#c9a84c', bg: 'rgba(201,168,76,0.06)', border: 'rgba(201,168,76,0.25)', verbo: 'BÔNUS'    },
  ganho:    { cor: '#22c55e', bg: 'rgba(34,197,94,0.06)',  border: 'rgba(34,197,94,0.25)',  verbo: 'GANHE'    },
}

function catIcon(cat: OportunidadeCat, cor: string) {
  if (cat === 'bloqueio') return <XCircle      size={14} style={{ color: cor }} />
  if (cat === 'deflator') return <AlertTriangle size={14} style={{ color: cor }} />
  if (cat === 'bonus')    return <Target        size={14} style={{ color: cor }} />
  return                         <TrendingUp    size={14} style={{ color: cor }} />
}

function buildOportunidades(rv: ResultadoRVGestor, config: RVGestorConfig): Oportunidade[] {
  const ops: Oportunidade[] = []

  // bloqueio — elegibilidade
  if (!rv.elegivel) {
    ops.push({
      cat: 'bloqueio',
      titulo: 'ELEGIBILIDADE BLOQUEADA',
      desc: rv.motivoInelegivel ?? 'Complete as monitorias da equipe para desbloquear o RV.',
      ganhe: null,
    })
  }

  // deflator — deflatores ativos
  for (const d of rv.deflatores) {
    let titulo: string
    if (d.motivo.startsWith('Indisponibilidade')) titulo = 'INDISP. ACIMA DA META'
    else if (d.motivo.startsWith('ABS'))          titulo = 'ABSENTEÍSMO ELEVADO'
    else if (d.motivo.startsWith('TMA'))          titulo = 'TMA ACIMA DA META'
    else                                           titulo = d.motivo.toUpperCase()
    ops.push({
      cat: 'deflator',
      titulo,
      desc: `Corrija p.p. para recuperar ${formatBRLGestor(d.valorDeduzido)} deduzidos (deflator −${d.perda}%).`,
      ganhe: d.valorDeduzido,
    })
  }

  // bonus — bônus de performance não ganho
  if (!rv.bonusAplicado && rv.rvBase > 0) {
    const potencial = Math.round(rv.rvBase * config.bonusPercentual / 100)
    ops.push({
      cat: 'bonus',
      titulo: `BÔNUS ${config.bonusPercentual}% DE PERFORMANCE`,
      desc: `Atinja TX. Ret ≥ ${config.bonusRetencaoMin}% e ABS ≤ ${config.bonusAbsMax}% p.p. para ganhar o bônus.`,
      ganhe: potencial,
    })
  }

  // ganho — upgrades de KPI
  if (rv.retencaoVal > 0) {
    const proxFaixa = config.retencaoFaixas.find(f => f.min > rv.retencaoVal)
    if (proxFaixa) {
      const diff = pctBR(proxFaixa.min - rv.retencaoVal)
      ops.push({
        cat: 'ganho',
        titulo: 'UPGRADE TX. RETENÇÃO',
        desc: `Aumente ${diff}% p.p. (${pctBR(rv.retencaoVal)}% → ${pctBR(proxFaixa.min)}%) para próxima faixa.`,
        ganhe: proxFaixa.valor - (rv.retencaoFaixa?.valor ?? 0),
      })
    }
  }

  if (rv.indispBonus === 0 && rv.indispVal > 0) {
    ops.push({
      cat: 'ganho',
      titulo: 'INDISP. DENTRO DA META',
      desc: `Reduza ${pctBR(rv.indispVal - config.indispMeta)}% p.p. (atual ${pctBR(rv.indispVal)}%, meta ≤ ${pctBR(config.indispMeta)}%).`,
      ganhe: config.indispValor,
    })
  }

  if (rv.tmaBonus === 0 && rv.tmaValSeg > 0) {
    const exc = rv.tmaValSeg - config.tmaMetaSeg
    ops.push({
      cat: 'ganho',
      titulo: 'TMA DENTRO DA META',
      desc: `Reduza ${segParaMMSSGestor(exc)} p.p. no TMA (atual ${segParaMMSSGestor(rv.tmaValSeg)}, meta ≤ ${segParaMMSSGestor(config.tmaMetaSeg)}).`,
      ganhe: config.tmaValor,
    })
  }

  if (!rv.ticketAplicavel && rv.retencaoVal > 0) {
    const diff = pctBR(config.ticketMinRetracao - rv.retencaoVal)
    ops.push({
      cat: 'ganho',
      titulo: 'DESBLOQUEAR TICKET',
      desc: `Aumente TX. Ret em ${diff}% p.p. para desbloquear variação de ticket.`,
      ganhe: null,
    })
  }

  const ORDER: OportunidadeCat[] = ['bloqueio', 'deflator', 'bonus', 'ganho']
  ops.sort((a, b) => {
    const oi = ORDER.indexOf(a.cat) - ORDER.indexOf(b.cat)
    if (oi !== 0) return oi
    return (b.ganhe ?? 0) - (a.ganhe ?? 0)
  })

  return ops
}

function MelhoriaSection({ rv, config, monitoriasCompletas }: {
  rv: ResultadoRVGestor
  config: RVGestorConfig
  monitoriasCompletas: number
}) {
  void monitoriasCompletas
  const ops = buildOportunidades(rv, config)
  const totalDisponivel = ops.reduce((acc, op) => acc + (op.ganhe ?? 0), 0)

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: '10px' }}>
      <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
        <div style={{ flex: 1 }}>
          <PainelSectionTitle>OPORTUNIDADES</PainelSectionTitle>
        </div>
        {totalDisponivel > 0 && (
          <span style={{
            fontFamily: FF_DM_H, fontWeight: 900, fontSize: '13px',
            color: '#B0AAFF', fontVariantNumeric: 'tabular-nums',
            whiteSpace: 'nowrap', flexShrink: 0,
          }}>
            +{formatBRLGestor(totalDisponivel)}
          </span>
        )}
      </div>

      {ops.length === 0 ? (
        <div style={{
          display: 'flex', flexDirection: 'column', alignItems: 'center',
          padding: '24px 8px', gap: '8px',
          background: '#070714', border: '1px solid rgba(34,197,94,0.15)', borderRadius: '12px',
        }}>
          <CheckCircle2 size={24} style={{ color: '#22c55e' }} />
          <span style={{
            fontFamily: FF_SYNE_H, fontSize: '13px', fontWeight: 600,
            color: '#22c55e', textTransform: 'uppercase', letterSpacing: '0.08em',
          }}>
            RV MAXIMIZADO
          </span>
          <span style={{ fontFamily: FF_DM_H, fontSize: '12px', color: '#72708f' }}>
            Todos os critérios foram atingidos. Continue assim!
          </span>
        </div>
      ) : (
        <div style={{ display: 'flex', flexDirection: 'column', gap: '6px' }}>
          {ops.map((op, i) => <OportunidadeCard key={i} op={op} />)}
        </div>
      )}
    </div>
  )
}

function OportunidadeCard({ op }: { op: Oportunidade }) {
  const meta = CAT_META[op.cat]
  return (
    <div style={{
      display: 'flex', alignItems: 'center', gap: '14px',
      padding: '12px 16px',
      background: meta.bg,
      border: `1px solid ${meta.border}`,
      borderLeft: `3px solid ${meta.cor}`,
      borderRadius: '0',
      transition: 'filter 0.2s ease',
    }}
      onMouseEnter={e => { (e.currentTarget as HTMLElement).style.filter = 'brightness(1.12)' }}
      onMouseLeave={e => { (e.currentTarget as HTMLElement).style.filter = '' }}
    >
      <span style={{ color: meta.cor, flexShrink: 0 }}>
        {catIcon(op.cat, meta.cor)}
      </span>
      <div style={{ flex: 1, minWidth: 0 }}>
        <span style={{
          display: 'block',
          fontFamily: FF_SYNE_H, fontWeight: 600, fontSize: '11px',
          textTransform: 'uppercase', letterSpacing: '0.1em', color: meta.cor,
        }}>
          {op.titulo}
        </span>
        <span style={{
          display: 'block',
          fontFamily: FF_DM_H, fontSize: '12px',
          color: 'rgba(255,255,255,0.52)', lineHeight: 1.4, marginTop: '2px',
        }}>
          {op.desc}
        </span>
      </div>
      {op.ganhe !== null && op.ganhe > 0 && (
        <span style={{ display: 'inline-flex', alignItems: 'center', flexShrink: 0 }}>
          <span style={{ display: 'inline-flex', alignItems: 'baseline' }}>
            <span style={{ fontFamily: FF_SYNE_H, fontSize: '11px', fontWeight: 600, color: meta.cor }}>
              {meta.verbo}&nbsp;
            </span>
            <span style={{ fontFamily: FF_DM_H, fontSize: '13px', fontWeight: 900, color: meta.cor, fontVariantNumeric: 'tabular-nums' }}>
              {formatBRLGestor(op.ganhe)}
            </span>
          </span>
        </span>
      )}
    </div>
  )
}

// ── 6. Regras ─────────────────────────────────────────────────────────────────

function RegrasSection({ config, expanded, onToggle }: {
  config: RVGestorConfig; expanded: boolean; onToggle: () => void
}) {
  return (
    <div style={{
      background: 'rgba(244,212,124,0.03)',
      border: '1px solid rgba(244,212,124,0.15)',
      borderRadius: '0', overflow: 'hidden',
    }}>
      <button
        type="button"
        onClick={onToggle}
        style={{
          width: '100%', display: 'flex', justifyContent: 'space-between', alignItems: 'center',
          padding: '14px 20px', background: 'transparent', border: 'none', cursor: 'pointer',
          transition: 'background 0.15s',
        }}
        onMouseEnter={e => { (e.currentTarget as HTMLElement).style.background = 'rgba(244,212,124,0.04)' }}
        onMouseLeave={e => { (e.currentTarget as HTMLElement).style.background = 'transparent' }}
      >
        <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
          <Info size={13} style={{ color: 'rgba(244,212,124,0.6)', flexShrink: 0 }} />
          <span style={{
            fontFamily: FF_SYNE_H, fontSize: '11px', fontWeight: 700,
            textTransform: 'uppercase', letterSpacing: '0.12em', color: 'rgba(244,212,124,0.7)',
          }}>
            Como é calculado meu RV
          </span>
        </div>
        <ChevronDown size={14} style={{
          color: 'rgba(244,212,124,0.5)',
          transition: 'transform 0.3s cubic-bezier(0.4,0,0.2,1)',
          transform: expanded ? 'rotate(180deg)' : 'rotate(0deg)',
        }} />
      </button>

      <div style={{
        maxHeight: expanded ? '1200px' : '0', overflow: 'hidden',
        transition: 'max-height 0.4s cubic-bezier(0.4,0,0.2,1)',
      }}>
        <div style={{ padding: '0 20px 20px', display: 'flex', flexDirection: 'column', gap: '20px' }}>

          <RegraBloco
            titulo="COMPONENTES DO RV"
            desc="Seu RV é composto por até 4 indicadores. Cada um contribui com um valor fixo quando dentro da meta."
          >
            {config.retencaoFaixas.map((f, i) => (
              <RegraLine key={i} label={`TX. Retenção ≥ ${f.min}%`} valor={formatBRLGestor(f.valor)} />
            ))}
            <RegraLine label={`Indisponibilidade ≤ ${config.indispMeta}%`} valor={formatBRLGestor(config.indispValor)} />
            <RegraLine label={`TMA ≤ ${segParaMMSSGestor(config.tmaMetaSeg)}`} valor={formatBRLGestor(config.tmaValor)} />
            {config.ticketFaixas.map((f, i) => (
              <RegraLine key={`tkt${i}`} label={`Var. Ticket ≥ ${f.min}% (req. Ret ≥ ${config.ticketMinRetracao}%)`} valor={formatBRLGestor(f.valor)} />
            ))}
          </RegraBloco>

          <RegraBloco
            titulo={`BÔNUS DE PERFORMANCE (${config.bonusPercentual}%)`}
            desc={`Bônus de ${config.bonusPercentual}% sobre o subtotal do RV quando ambas as condições são atingidas simultaneamente.`}
          >
            <RegraLine label={`TX. Retenção ≥ ${config.bonusRetencaoMin}%`} valor="Obrigatório" />
            <RegraLine label={`ABS ≤ ${config.bonusAbsMax}%`} valor="Obrigatório" />
          </RegraBloco>

          <RegraBloco
            titulo="DEFLATORES"
            desc="Reduções percentuais aplicadas ao RV com bônus quando indicadores ultrapassam os limites tolerados."
          >
            <RegraLine label={`TMA > ${segParaMMSSGestor(Math.round(config.tmaMetaSeg * (1 + config.tmaDeflatorPct / 100)))}`} valor={`−${config.tmaDeflatorPerda}%`} />
            <RegraLine label={`Indisponibilidade > ${config.indispMeta}%`} valor={`−${config.indispDeflatorPerda}%`} />
            {config.absDeflatorFaixas.filter(f => f.perda > 0).map((f, i) => (
              <RegraLine key={i} label={`ABS > ${f.limite}%`} valor={`−${f.perda}%`} />
            ))}
          </RegraBloco>

          <RegraBloco
            titulo="ELEGIBILIDADE"
            desc="O RV só é pago quando o critério mínimo de monitorias da equipe é cumprido no mês."
          >
            <RegraLine label="Monitorias por operador" valor="≥ 4 enviadas" />
            <RegraLine label="Mínimo de operadores" valor="14 completos" />
          </RegraBloco>

        </div>
      </div>
    </div>
  )
}

function RegraBloco({ titulo, desc, children }: {
  titulo: string; desc: string; children: React.ReactNode
}) {
  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
      <span style={{
        fontFamily: FF_SYNE_H, fontSize: '10px', fontWeight: 700,
        textTransform: 'uppercase', letterSpacing: '0.12em', color: 'rgba(244,212,124,0.7)',
      }}>
        {titulo}
      </span>
      <p style={{
        fontFamily: FF_DM_H, fontSize: '12px', margin: 0,
        color: 'rgba(114,112,143,0.9)', lineHeight: 1.5,
      }}>
        {desc}
      </p>
      <div style={{ display: 'flex', flexDirection: 'column', gap: '5px' }}>
        {children}
      </div>
    </div>
  )
}

function RegraLine({ label, valor }: { label: string; valor: string }) {
  return (
    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', gap: '8px' }}>
      <span style={{ fontFamily: FF_DM_H, fontSize: '12px', color: 'rgba(114,112,143,0.8)' }}>{label}</span>
      <span style={{ fontFamily: FF_DM_H, fontSize: '12px', fontWeight: 600, color: '#B0AAFF', flexShrink: 0 }}>{valor}</span>
    </div>
  )
}

// ── Shared ────────────────────────────────────────────────────────────────────

function SectionCard({ title, children }: { title?: string; children: React.ReactNode }) {
  return (
    <div style={{
      background: 'var(--bg-card)', border: '1px solid rgba(201,168,76,0.08)',
      borderRadius: '12px', padding: '20px',
    }}>
      {title && (
        <div style={{ display: 'flex', alignItems: 'center', gap: '10px', marginBottom: '16px' }}>
          <span style={{
            fontFamily: 'var(--ff-display)', fontSize: '11px', fontWeight: 700,
            textTransform: 'uppercase', letterSpacing: '0.12em', color: 'rgba(244,212,124,0.7)',
          }}>
            {title}
          </span>
          <div style={{ flex: 1, height: '1px', background: 'linear-gradient(90deg, rgba(201,168,76,0.15) 0%, transparent 100%)' }} />
        </div>
      )}
      {children}
    </div>
  )
}
