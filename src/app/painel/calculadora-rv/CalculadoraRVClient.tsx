'use client'

import { useState, useRef, useEffect, useMemo } from 'react'
import { AlertTriangle, ChevronDown, Check, X, Zap } from 'lucide-react'
import type { RVConfig } from '@/lib/rv-utils'
import { formatBRL, segParaMMSS, mmssParaSeg } from '@/lib/rv-utils'

// ── Tipos ─────────────────────────────────────────────────────────────────────

export interface CalculadoraRVProps {
  rvConfig: RVConfig
  txRetracaoAtual: number
  tmaAtualSeg:     number
  absAtual:        number
  indispAtual:     number
  faltasAtual:     number
  pedidosAtual:    number
  ticketAtual:     number
  rvAtual:               number
  elegivelAtual:         boolean
  motivosInelegivelAtual: string[]
  nomeOperador: string
  mesLabel:     string
  semDadosKpi:  boolean
}

interface SimResult {
  elegivel:          boolean
  motivosInelegivel: string[]
  retPremio:    number
  indispPremio: number
  tmaPremio:    number
  tickPremio:   number
  rvBase:        number
  mult:          number
  rvAposPedidos: number
  bonusOk:  boolean
  bonus:    number
  rvTotal:  number
  indispOk: boolean
  tmaOk:    boolean
}

// ── Cálculo puro client-side ──────────────────────────────────────────────────

function calcSimulado(
  txRetracao: number,
  tmaSeg:     number,
  absPercent: number,
  indisp:     number,
  faltas:     number,
  pedidos:    number,
  ticket:     number,
  config: RVConfig,
): SimResult {
  const motivosInelegivel: string[] = []
  if (absPercent > config.absMaximo)
    motivosInelegivel.push(`ABS ${absPercent.toFixed(1)}% > máximo ${config.absMaximo}%`)
  if (faltas >= 2)
    motivosInelegivel.push(`${faltas} falta(s) — limite 1`)
  const elegivel = motivosInelegivel.length === 0

  const retFaixa   = config.retracaoFaixas.find(f => txRetracao >= f.min)
  const retPremio  = elegivel && retFaixa ? retFaixa.valor : 0

  const indispOk    = indisp > 0 && indisp <= config.indispLimite
  const indispPremio = elegivel && indispOk ? config.indispValor : 0

  const tmaOk    = tmaSeg > 0 && tmaSeg < config.tmaLimiteSeg
  const tmaPremio = elegivel && tmaOk ? config.tmaValor : 0

  const ticketAplic = txRetracao >= config.ticketMinRetracao
  const tickFaixa   = ticketAplic ? config.ticketFaixas.find(f => ticket >= f.min) : null
  const tickPremio  = elegivel && tickFaixa ? tickFaixa.valor : 0

  const rvBase = retPremio + indispPremio + tmaPremio + tickPremio

  const mult =
    config.pedidosMeta > 0 && pedidos > 0
      ? Math.round(Math.min(pedidos / config.pedidosMeta, 1) * 10000) / 10000
      : 1
  const rvAposPedidos = Math.round(rvBase * mult * 100) / 100

  const bonusOk = elegivel &&
    txRetracao >= config.bonusRetracaoMinima &&
    indisp > 0 && indisp <= config.bonusIndispMaxima
  const bonus   = bonusOk ? config.bonusValor : 0

  const rvTotal = Math.round((rvAposPedidos + bonus) * 100) / 100

  return {
    elegivel, motivosInelegivel,
    retPremio, indispPremio, tmaPremio, tickPremio,
    rvBase, mult, rvAposPedidos,
    bonusOk, bonus, rvTotal,
    indispOk, tmaOk,
  }
}

// ── Cenários pré-definidos ────────────────────────────────────────────────────

const CENARIOS = [
  { label: 'Meta Mínima',     desc: 'RV mínima elegível', retracao: 66, tmaMmss: '12:11', abs: 5, indisp: 14.5, faltas: 0, color: '#fbbf24' },
  { label: 'Meta Confortável', desc: 'RV com bônus',       retracao: 70, tmaMmss: '10:00', abs: 2, indisp: 11,   faltas: 0, color: '#4ade80' },
  { label: 'Máximo Possível',  desc: 'RV máxima teórica',  retracao: 80, tmaMmss: '08:00', abs: 0, indisp: 8,    faltas: 0, color: '#c9a84c' },
]

// ── Animação de número ────────────────────────────────────────────────────────

function useAnimated(target: number, duration = 280): number {
  const [display, setDisplay] = useState(target)
  const rafRef  = useRef<number>()
  const fromRef = useRef(target)

  useEffect(() => {
    const from = fromRef.current
    if (from === target) return
    const startTime = performance.now()
    cancelAnimationFrame(rafRef.current!)
    function frame(now: number) {
      const t    = Math.min((now - startTime) / duration, 1)
      const ease = 1 - Math.pow(1 - t, 3)
      setDisplay(Math.round((from + (target - from) * ease) * 100) / 100)
      if (t < 1) {
        rafRef.current = requestAnimationFrame(frame)
      } else {
        fromRef.current = target
      }
    }
    rafRef.current = requestAnimationFrame(frame)
    return () => cancelAnimationFrame(rafRef.current!)
  }, [target, duration])

  return display
}

// ── Shared ────────────────────────────────────────────────────────────────────

function Fade({ delay, children }: { delay: number; children: React.ReactNode }) {
  return (
    <div style={{ animation: `calcFadeUp 0.45s cubic-bezier(0.22,1,0.36,1) ${delay}ms both` }}>
      {children}
    </div>
  )
}

function Card({ children, style }: { children: React.ReactNode; style?: React.CSSProperties }) {
  return (
    <div style={{
      background: '#0d0d1a',
      border: '1px solid rgba(201,168,76,0.08)',
      borderRadius: '14px',
      padding: '16px 18px',
      ...style,
    }}>
      {children}
    </div>
  )
}

function SectionHeading({ children }: { children: React.ReactNode }) {
  return (
    <p style={{
      fontSize: '9px', fontWeight: 700, textTransform: 'uppercase',
      letterSpacing: '0.14em', color: 'var(--text-muted)', marginBottom: '12px',
    }}>
      {children}
    </p>
  )
}

function Badge({ ok, label }: { ok: boolean; label?: string }) {
  return (
    <span style={{
      fontSize: '11px', fontWeight: 600,
      padding: '3px 10px', borderRadius: '99px',
      background: ok ? 'rgba(74,222,128,0.12)' : 'rgba(248,113,113,0.12)',
      border: `1px solid ${ok ? 'rgba(74,222,128,0.3)' : 'rgba(248,113,113,0.3)'}`,
      color: ok ? '#4ade80' : '#f87171',
    }}>
      {label ?? (ok ? 'Elegível' : 'Inelegível')}
    </span>
  )
}

// ── Seção 1 — Resultado Atual ─────────────────────────────────────────────────

function ResultadoAtual({ p }: { p: CalculadoraRVProps }) {
  if (p.semDadosKpi) return null
  return (
    <Card style={{ borderColor: 'rgba(201,168,76,0.15)' }}>
      <div style={{ display: 'flex', alignItems: 'center', gap: '10px', marginBottom: '12px', flexWrap: 'wrap' }}>
        <SectionHeading>Situação atual</SectionHeading>
        <Badge ok={p.elegivelAtual} />
      </div>
      <p style={{
        fontFamily: 'var(--ff-display)', fontSize: '40px', fontWeight: 700,
        color: 'var(--gold)', lineHeight: 1, marginBottom: '6px',
      }}>
        {formatBRL(p.rvAtual)}
      </p>
      {p.motivosInelegivelAtual.length > 0 && (
        <ul style={{ marginBottom: '8px' }}>
          {p.motivosInelegivelAtual.map((m, i) => (
            <li key={i} style={{ fontSize: '11px', color: '#f87171', display: 'flex', alignItems: 'center', gap: '4px' }}>
              <X size={10} /> {m}
            </li>
          ))}
        </ul>
      )}
      <p style={{ fontSize: '11px', color: 'var(--text-muted)' }}>
        RV estimado com os dados atuais do mês · Penalidades e descontos individuais não incluídos no simulador
      </p>
    </Card>
  )
}

// ── Slider com marcador ───────────────────────────────────────────────────────

interface SliderProps {
  label:        string
  value:        number
  onChange:     (v: number) => void
  min:          number
  max:          number
  step?:        number
  marker?:      number
  markerLabel?: string
  formatVal:    (v: number) => string
  valueColor?:  string
}

function SliderKpi({ label, value, onChange, min, max, step = 0.1, marker, markerLabel, formatVal, valueColor }: SliderProps) {
  const pct = (v: number) => ((v - min) / (max - min)) * 100
  return (
    <div style={{ marginBottom: '16px' }}>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'baseline', marginBottom: '6px' }}>
        <span style={{ fontSize: '11px', color: 'var(--text-muted)' }}>{label}</span>
        <span style={{ fontSize: '15px', fontWeight: 700, fontFamily: 'var(--ff-display)', color: valueColor ?? 'var(--text-primary)' }}>
          {formatVal(value)}
        </span>
      </div>
      <div style={{ position: 'relative', paddingBottom: marker !== undefined ? '14px' : '0' }}>
        <input
          type="range" min={min} max={max} step={step} value={value}
          onChange={e => onChange(parseFloat(e.target.value))}
          style={{ width: '100%', accentColor: '#c9a84c', cursor: 'pointer', display: 'block' }}
        />
        {marker !== undefined && (
          <>
            <div style={{
              position: 'absolute', left: `${pct(marker)}%`, top: '6px',
              transform: 'translateX(-50%)', width: '2px', height: '10px',
              background: 'rgba(201,168,76,0.55)', borderRadius: '1px', pointerEvents: 'none',
            }} />
            {markerLabel && (
              <span style={{
                position: 'absolute', left: `${pct(marker)}%`, bottom: 0,
                transform: 'translateX(-50%)', fontSize: '9px',
                color: 'rgba(201,168,76,0.6)', whiteSpace: 'nowrap', pointerEvents: 'none',
              }}>
                {markerLabel}
              </span>
            )}
          </>
        )}
      </div>
    </div>
  )
}

// ── Cores por KPI ─────────────────────────────────────────────────────────────

function retracaoCor(v: number, config: RVConfig): string {
  const melhorFaixa = config.retracaoFaixas[0]
  if (v >= (melhorFaixa?.min ?? 70)) return '#4ade80'
  if (v >= 66) return '#c9a84c'
  if (v >= 60) return '#fbbf24'
  return '#f87171'
}

function absCor(v: number, max: number): string {
  if (v > max)         return '#f87171'
  if (v > max * 0.7)   return '#fbbf24'
  return '#4ade80'
}

function indispCor(v: number, limite: number): string {
  if (v > limite)      return '#f87171'
  if (v > limite * 0.8) return '#fbbf24'
  return '#4ade80'
}

function tmaCor(tmaSeg: number, limiteSeg: number): string {
  if (tmaSeg === 0)            return 'var(--text-muted)'
  if (tmaSeg >= limiteSeg)     return '#f87171'
  if (tmaSeg >= limiteSeg * 0.9) return '#fbbf24'
  return '#4ade80'
}

function ticketCor(v: number, config: RVConfig): string {
  const rank = config.ticketFaixas.findIndex(f => v >= f.min)
  if (rank < 0) return 'var(--text-muted)'
  if (rank === 0) return '#c9a84c'
  if (rank === 1) return '#4ade80'
  if (rank === 2) return '#fbbf24'
  return '#fb923c'
}

// ── Painel de resultado em tempo real ─────────────────────────────────────────

function ResultadoSimulado({ r, config, pedidos }: { r: SimResult; config: RVConfig; pedidos: number }) {
  const animRV = useAnimated(r.rvTotal)

  const linhas = [
    { label: 'TX Retenção',       valor: r.retPremio,    ok: r.retPremio > 0 },
    { label: 'Indisponibilidade', valor: r.indispPremio, ok: r.indispOk },
    { label: 'TMA',               valor: r.tmaPremio,    ok: r.tmaOk },
    { label: 'Variação Ticket',   valor: r.tickPremio,   ok: r.tickPremio > 0 },
  ]

  return (
    <Card style={{ borderColor: r.elegivel ? 'rgba(201,168,76,0.2)' : 'rgba(248,113,113,0.15)', position: 'sticky', top: '80px' }}>
      <SectionHeading>RV Calculada</SectionHeading>

      <div style={{ textAlign: 'center', marginBottom: '14px' }}>
        <p style={{
          fontFamily: 'var(--ff-display)', fontSize: '48px', fontWeight: 700, lineHeight: 1,
          color: r.elegivel ? 'var(--gold)' : '#f87171', transition: 'color 0.3s',
        }}>
          {formatBRL(animRV)}
        </p>
        <div style={{ marginTop: '8px' }}><Badge ok={r.elegivel} /></div>
      </div>

      {r.motivosInelegivel.length > 0 && (
        <div style={{ marginBottom: '12px' }}>
          {r.motivosInelegivel.map((m, i) => (
            <div key={i} style={{ display: 'flex', alignItems: 'center', gap: '5px', fontSize: '11px', color: '#f87171', marginBottom: '3px' }}>
              <X size={10} /> {m}
            </div>
          ))}
        </div>
      )}

      <div style={{ borderTop: '1px solid rgba(201,168,76,0.08)', paddingTop: '12px' }}>
        {linhas.map(l => (
          <div key={l.label} style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '6px' }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: '5px' }}>
              {l.ok ? <Check size={10} style={{ color: '#4ade80', flexShrink: 0 }} /> : <X size={10} style={{ color: '#f87171', flexShrink: 0 }} />}
              <span style={{ fontSize: '11px', color: 'var(--text-muted)' }}>{l.label}</span>
            </div>
            <span style={{ fontSize: '12px', fontWeight: 600, color: l.ok ? 'var(--text-secondary)' : 'var(--text-muted)' }}>
              {l.ok ? `+ ${formatBRL(l.valor)}` : formatBRL(0)}
            </span>
          </div>
        ))}

        {r.mult < 1 && (
          <div style={{ fontSize: '10px', color: 'var(--text-muted)', marginTop: '4px', marginBottom: '4px' }}>
            × {(r.mult * 100).toFixed(1)}% ({pedidos}/{config.pedidosMeta} pedidos)
          </div>
        )}

        {r.bonusOk && (
          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '6px' }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: '5px' }}>
              <Check size={10} style={{ color: '#4ade80' }} />
              <span style={{ fontSize: '11px', color: 'var(--text-muted)' }}>Bônus</span>
            </div>
            <span style={{ fontSize: '12px', fontWeight: 600, color: 'var(--text-secondary)' }}>+ {formatBRL(r.bonus)}</span>
          </div>
        )}

        <div style={{ borderTop: '1px solid rgba(201,168,76,0.08)', marginTop: '8px', paddingTop: '8px', display: 'flex', justifyContent: 'space-between' }}>
          <span style={{ fontSize: '12px', fontWeight: 600, color: 'var(--text-secondary)' }}>Total</span>
          <span style={{ fontSize: '14px', fontWeight: 700, fontFamily: 'var(--ff-display)', color: r.elegivel ? 'var(--gold)' : '#f87171' }}>
            {formatBRL(r.rvTotal)}
          </span>
        </div>
      </div>
    </Card>
  )
}

// ── Seção 2 — Simulador ───────────────────────────────────────────────────────

interface SimuladorProps {
  p:          CalculadoraRVProps
  txRetracao: number; setTxRetracao: (v: number) => void
  tmaInput:   string; setTmaInput:   (v: string) => void
  absVal:     number; setAbsVal:     (v: number) => void
  indispVal:  number; setIndispVal:  (v: number) => void
  faltas:     number; setFaltas:     (v: number) => void
  pedidos:    number; setPedidos:    (v: number) => void
  cancelados: number; setCancelados: (v: number) => void
  ticketVal:  number; setTicketVal:  (v: number) => void
  simResult:  SimResult
}

function NumInput({ label, value, onChange, color }: { label: string; value: number; onChange: (v: number) => void; color?: string }) {
  return (
    <div>
      <p style={{ fontSize: '10px', color: 'var(--text-muted)', marginBottom: '4px' }}>{label}</p>
      <input
        type="number" min={0} value={value}
        onChange={e => onChange(Math.max(0, parseInt(e.target.value) || 0))}
        style={{
          width: '100%', padding: '7px 10px', borderRadius: '8px',
          background: 'rgba(255,255,255,0.04)',
          border: '1px solid rgba(201,168,76,0.15)',
          color: color ?? 'var(--text-primary)',
          fontSize: '15px', fontFamily: 'var(--ff-display)', fontWeight: 700,
          outline: 'none',
        }}
      />
    </div>
  )
}

function Simulador({
  p, txRetracao, setTxRetracao, tmaInput, setTmaInput,
  absVal, setAbsVal, indispVal, setIndispVal, faltas, setFaltas,
  pedidos, setPedidos, cancelados, setCancelados, ticketVal, setTicketVal,
  simResult,
}: SimuladorProps) {
  const tmaSeg = mmssParaSeg(tmaInput)
  const config = p.rvConfig

  // Tx. de retenção estimada a partir de pedidos/cancelados
  const txComputada = pedidos > 0
    ? parseFloat(Math.max(0, Math.min(100, ((pedidos - cancelados) / pedidos) * 100)).toFixed(1))
    : null

  return (
    <Card>
      <SectionHeading>Simulador Interativo</SectionHeading>

      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(260px, 1fr))', gap: '24px' }}>
        {/* Sliders + Inputs */}
        <div>
          {/* Pedidos e Cancelados */}
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '10px', marginBottom: '16px' }}>
            <NumInput label="Pedidos no mês" value={pedidos} onChange={v => { setPedidos(v); if (v > 0) setTxRetracao(parseFloat(Math.max(0, Math.min(100, ((v - cancelados) / v) * 100)).toFixed(1))) }} />
            <NumInput label="Cancelados no mês" value={cancelados} onChange={v => { setCancelados(v); if (pedidos > 0) setTxRetracao(parseFloat(Math.max(0, Math.min(100, ((pedidos - v) / pedidos) * 100)).toFixed(1))) }} color={cancelados > pedidos * 0.34 ? '#f87171' : 'var(--text-primary)'} />
          </div>

          {/* Tx. Retenção slider */}
          <SliderKpi
            label="Tx. Retenção (%)"
            value={txRetracao}
            onChange={setTxRetracao}
            min={50} max={80} step={0.1}
            marker={config.bonusRetracaoMinima}
            markerLabel={`${config.bonusRetracaoMinima}% (meta)`}
            formatVal={v => `${v.toFixed(1)}%`}
            valueColor={retracaoCor(txRetracao, config)}
          />
          {txComputada !== null && (
            <p style={{ fontSize: '9px', color: 'var(--text-muted)', marginTop: '-10px', marginBottom: '16px' }}>
              Baseado em {pedidos} pedidos e {cancelados} cancelados
            </p>
          )}

          {/* TMA */}
          <div style={{ marginBottom: '16px' }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'baseline', marginBottom: '6px' }}>
              <span style={{ fontSize: '11px', color: 'var(--text-muted)' }}>TMA (MM:SS)</span>
              <span style={{ fontSize: '15px', fontWeight: 700, fontFamily: 'var(--ff-display)', color: tmaCor(tmaSeg, config.tmaLimiteSeg) }}>
                {tmaInput || '—'}
              </span>
            </div>
            <input
              type="text" value={tmaInput}
              onChange={e => setTmaInput(e.target.value)}
              placeholder={segParaMMSS(config.tmaLimiteSeg)}
              maxLength={5}
              style={{
                width: '100%', padding: '8px 10px', borderRadius: '8px',
                background: 'rgba(255,255,255,0.04)',
                border: `1px solid ${tmaSeg > 0 && tmaSeg >= config.tmaLimiteSeg ? 'rgba(248,113,113,0.4)' : 'rgba(201,168,76,0.15)'}`,
                color: tmaCor(tmaSeg, config.tmaLimiteSeg),
                fontSize: '14px', fontFamily: 'monospace', outline: 'none',
              }}
            />
            <p style={{ fontSize: '9px', color: 'var(--text-muted)', marginTop: '3px' }}>
              Limite: {segParaMMSS(config.tmaLimiteSeg)} — Verde se abaixo do limite
            </p>
          </div>

          {/* ABS */}
          <SliderKpi
            label="ABS (%)" value={absVal} onChange={setAbsVal}
            min={0} max={15} step={0.1}
            marker={config.absMaximo} markerLabel={`${config.absMaximo}% (limite)`}
            formatVal={v => `${v.toFixed(1)}%`}
            valueColor={absCor(absVal, config.absMaximo)}
          />

          {/* Indisponibilidade */}
          <SliderKpi
            label="Indisponibilidade (%)" value={indispVal} onChange={setIndispVal}
            min={0} max={25} step={0.1}
            marker={config.indispLimite} markerLabel={`${config.indispLimite}% (limite)`}
            formatVal={v => `${v.toFixed(1)}%`}
            valueColor={indispCor(indispVal, config.indispLimite)}
          />

          {/* Variação de Ticket */}
          {config.ticketFaixas.length > 0 && (
            <SliderKpi
              label="Variação de Ticket (%)" value={ticketVal} onChange={setTicketVal}
              min={-25} max={0} step={0.1}
              marker={config.ticketFaixas[0]?.min}
              markerLabel={config.ticketFaixas[0] ? `${config.ticketFaixas[0].min}% (${formatBRL(config.ticketFaixas[0].valor)})` : undefined}
              formatVal={v => `${v.toFixed(1)}%`}
              valueColor={ticketCor(ticketVal, config)}
            />
          )}

          {/* Faltas */}
          <div>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'baseline', marginBottom: '6px' }}>
              <span style={{ fontSize: '11px', color: 'var(--text-muted)' }}>Faltas no mês</span>
              <span style={{ fontSize: '15px', fontWeight: 700, fontFamily: 'var(--ff-display)', color: faltas >= 2 ? '#f87171' : faltas === 1 ? '#fbbf24' : '#4ade80' }}>
                {faltas}
              </span>
            </div>
            <input
              type="number" min={0} max={10} value={faltas}
              onChange={e => setFaltas(Math.max(0, Math.min(10, parseInt(e.target.value) || 0)))}
              style={{
                width: '80px', padding: '7px 10px', borderRadius: '8px',
                background: 'rgba(255,255,255,0.04)',
                border: `1px solid ${faltas >= 2 ? 'rgba(248,113,113,0.4)' : 'rgba(201,168,76,0.15)'}`,
                color: faltas >= 2 ? '#f87171' : 'var(--text-primary)',
                fontSize: '14px', outline: 'none',
              }}
            />
            {faltas >= 2 && (
              <p style={{ fontSize: '10px', color: '#f87171', marginTop: '4px', display: 'flex', alignItems: 'center', gap: '4px' }}>
                <AlertTriangle size={10} /> {faltas} falta(s) — inelegível para RV
              </p>
            )}
          </div>
        </div>

        {/* Resultado em tempo real */}
        <ResultadoSimulado r={simResult} config={config} pedidos={pedidos} />
      </div>
    </Card>
  )
}

// ── Seção 3 — Cenários Rápidos ────────────────────────────────────────────────

interface CenarioProps {
  p:         CalculadoraRVProps
  pedidos:   number
  ticketVal: number
  onSelect:  (retracao: number, tmaMmss: string, abs: number, indisp: number, faltas: number) => void
}

function CenariosRapidos({ p, pedidos, ticketVal, onSelect }: CenarioProps) {
  return (
    <Card>
      <SectionHeading>Cenários Rápidos</SectionHeading>
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(160px, 1fr))', gap: '10px' }}>
        {CENARIOS.map(c => {
          const r = calcSimulado(c.retracao, mmssParaSeg(c.tmaMmss), c.abs, c.indisp, c.faltas, pedidos, ticketVal, p.rvConfig)
          return (
            <button
              key={c.label}
              onClick={() => onSelect(c.retracao, c.tmaMmss, c.abs, c.indisp, c.faltas)}
              style={{ background: 'rgba(255,255,255,0.03)', border: '1px solid rgba(201,168,76,0.12)', borderRadius: '12px', padding: '14px', textAlign: 'left', cursor: 'pointer', transition: 'border-color 0.2s, background 0.2s' }}
              onMouseEnter={e => { const el = e.currentTarget as HTMLElement; el.style.borderColor = `${c.color}50`; el.style.background = `${c.color}08` }}
              onMouseLeave={e => { const el = e.currentTarget as HTMLElement; el.style.borderColor = 'rgba(201,168,76,0.12)'; el.style.background = 'rgba(255,255,255,0.03)' }}
            >
              <div style={{ display: 'flex', alignItems: 'center', gap: '6px', marginBottom: '8px' }}>
                <Zap size={12} style={{ color: c.color }} />
                <span style={{ fontSize: '11px', fontWeight: 700, color: c.color, textTransform: 'uppercase', letterSpacing: '0.06em' }}>{c.label}</span>
              </div>
              <p style={{ fontFamily: 'var(--ff-display)', fontSize: '22px', fontWeight: 700, color: 'var(--text-primary)', lineHeight: 1, marginBottom: '4px' }}>
                {formatBRL(r.rvTotal)}
              </p>
              <p style={{ fontSize: '10px', color: 'var(--text-muted)' }}>{c.desc}</p>
              <div style={{ marginTop: '8px', fontSize: '9px', color: 'var(--text-muted)', lineHeight: 1.6 }}>
                <span>Ret {c.retracao}% · TMA {c.tmaMmss}</span><br />
                <span>ABS {c.abs}% · Indisp {c.indisp}%</span>
              </div>
            </button>
          )
        })}
      </div>
    </Card>
  )
}

// ── Seção 4 — Tabela de faixas ────────────────────────────────────────────────

function TabelaFaixas({ config, txRetracao, ticket, indispVal, tmaSeg }: {
  config: RVConfig; txRetracao: number; ticket: number; indispVal: number; tmaSeg: number
}) {
  const [aberto, setAberto] = useState(false)
  const retFaixa  = config.retracaoFaixas.find(f => txRetracao >= f.min)
  const tickFaixa = config.ticketFaixas.find(f => ticket >= f.min)

  return (
    <Card>
      <button
        onClick={() => setAberto(v => !v)}
        style={{ width: '100%', display: 'flex', justifyContent: 'space-between', alignItems: 'center', background: 'none', border: 'none', cursor: 'pointer', padding: 0 }}
      >
        <span style={{ fontSize: '9px', fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.14em', color: 'var(--text-muted)' }}>
          Como é calculado meu RV
        </span>
        <ChevronDown size={14} style={{ color: 'var(--text-muted)', transform: aberto ? 'rotate(180deg)' : '', transition: 'transform 0.3s' }} />
      </button>

      <div style={{ maxHeight: aberto ? '1000px' : '0px', overflow: 'hidden', transition: 'max-height 0.4s cubic-bezier(0.4,0,0.2,1)' }}>
        <div style={{ paddingTop: '16px', display: 'flex', flexDirection: 'column', gap: '20px' }}>

          <div>
            <p style={{ fontSize: '10px', fontWeight: 600, color: 'var(--text-secondary)', marginBottom: '8px' }}>Tx. Retenção</p>
            <table style={{ width: '100%', borderCollapse: 'collapse' }}>
              <tbody>
                {config.retracaoFaixas.map(f => {
                  const ativa = f === retFaixa
                  return (
                    <tr key={f.min} style={{ background: ativa ? 'rgba(201,168,76,0.08)' : 'transparent' }}>
                      <td style={{ padding: '5px 8px', fontSize: '12px', color: ativa ? 'var(--gold)' : 'var(--text-muted)', fontWeight: ativa ? 700 : 400 }}>≥ {f.min}%</td>
                      <td style={{ padding: '5px 8px', fontSize: '12px', color: ativa ? 'var(--gold)' : 'var(--text-secondary)', fontWeight: ativa ? 700 : 400, textAlign: 'right' }}>
                        {formatBRL(f.valor)}{ativa && <span style={{ fontSize: '9px', marginLeft: '4px', opacity: 0.7 }}>← atual</span>}
                      </td>
                    </tr>
                  )
                })}
                <tr>
                  <td style={{ padding: '5px 8px', fontSize: '12px', color: 'var(--text-muted)' }}>{'< '}{config.retracaoFaixas[config.retracaoFaixas.length - 1]?.min ?? 57}%</td>
                  <td style={{ padding: '5px 8px', fontSize: '12px', color: 'var(--text-muted)', textAlign: 'right' }}>{formatBRL(0)}</td>
                </tr>
              </tbody>
            </table>
          </div>

          <div>
            <p style={{ fontSize: '10px', fontWeight: 600, color: 'var(--text-secondary)', marginBottom: '8px' }}>Componentes fixos</p>
            {[
              { label: `Indisponibilidade ≤ ${config.indispLimite}%`, valor: config.indispValor, ok: indispVal > 0 && indispVal <= config.indispLimite },
              { label: `TMA < ${segParaMMSS(config.tmaLimiteSeg)}`,   valor: config.tmaValor,   ok: tmaSeg > 0 && tmaSeg < config.tmaLimiteSeg },
            ].map(r => (
              <div key={r.label} style={{ display: 'flex', justifyContent: 'space-between', padding: '5px 8px', borderRadius: '6px', background: r.ok ? 'rgba(201,168,76,0.06)' : 'transparent' }}>
                <span style={{ fontSize: '12px', color: r.ok ? 'var(--gold)' : 'var(--text-muted)', fontWeight: r.ok ? 600 : 400 }}>{r.label}</span>
                <span style={{ fontSize: '12px', color: r.ok ? 'var(--gold)' : 'var(--text-muted)', fontWeight: r.ok ? 600 : 400 }}>{formatBRL(r.valor)}</span>
              </div>
            ))}
          </div>

          {config.ticketFaixas.length > 0 && (
            <div>
              <p style={{ fontSize: '10px', fontWeight: 600, color: 'var(--text-secondary)', marginBottom: '4px' }}>Variação de Ticket</p>
              <p style={{ fontSize: '10px', color: 'var(--text-muted)', marginBottom: '8px' }}>Requer TX Retenção ≥ {config.ticketMinRetracao}%</p>
              <table style={{ width: '100%', borderCollapse: 'collapse' }}>
                <tbody>
                  {config.ticketFaixas.map(f => {
                    const ativa = f === tickFaixa
                    return (
                      <tr key={f.min} style={{ background: ativa ? 'rgba(201,168,76,0.08)' : 'transparent' }}>
                        <td style={{ padding: '5px 8px', fontSize: '12px', color: ativa ? 'var(--gold)' : 'var(--text-muted)', fontWeight: ativa ? 700 : 400 }}>≥ {f.min}%</td>
                        <td style={{ padding: '5px 8px', fontSize: '12px', color: ativa ? 'var(--gold)' : 'var(--text-secondary)', fontWeight: ativa ? 700 : 400, textAlign: 'right' }}>
                          {formatBRL(f.valor)}{ativa && <span style={{ fontSize: '9px', marginLeft: '4px', opacity: 0.7 }}>← atual</span>}
                        </td>
                      </tr>
                    )
                  })}
                </tbody>
              </table>
            </div>
          )}

          <div>
            <p style={{ fontSize: '10px', fontWeight: 600, color: 'var(--text-secondary)', marginBottom: '8px' }}>Bônus</p>
            <p style={{ fontSize: '12px', color: 'var(--text-muted)', lineHeight: 1.6 }}>
              {formatBRL(config.bonusValor)} se TX Retenção ≥ {config.bonusRetracaoMinima}% e Indisponibilidade ≤ {config.bonusIndispMaxima}%
            </p>
          </div>

          {config.pedidosMeta > 0 && (
            <div>
              <p style={{ fontSize: '10px', fontWeight: 600, color: 'var(--text-secondary)', marginBottom: '8px' }}>Multiplicador de Pedidos</p>
              <p style={{ fontSize: '12px', color: 'var(--text-muted)', lineHeight: 1.6 }}>
                RV Base × (pedidos realizados ÷ meta de {config.pedidosMeta} pedidos), máximo ×1
              </p>
            </div>
          )}
        </div>
      </div>
    </Card>
  )
}

// ── Componente principal ──────────────────────────────────────────────────────

export default function CalculadoraRVClient(p: CalculadoraRVProps) {
  const clamp = (v: number, min: number, max: number) => Math.max(min, Math.min(max, v))

  // Cancelados derivados: pedidos × (1 − txRetenção%)
  const canceladosInit = p.pedidosAtual > 0
    ? Math.round(p.pedidosAtual * (1 - (p.txRetracaoAtual || 0) / 100))
    : 0

  const [txRetracao, setTxRetracao] = useState(clamp(p.txRetracaoAtual || 66, 50, 80))
  const [tmaInput,   setTmaInput]   = useState(segParaMMSS(p.tmaAtualSeg || 0))
  const [absVal,     setAbsVal]     = useState(clamp(p.absAtual || 0, 0, 15))
  const [indispVal,  setIndispVal]  = useState(clamp(p.indispAtual || 10, 0, 25))
  const [faltas,     setFaltas]     = useState(p.faltasAtual)
  const [pedidos,    setPedidos]    = useState(p.pedidosAtual || 0)
  const [cancelados, setCancelados] = useState(canceladosInit)
  const [ticketVal,  setTicketVal]  = useState(clamp(p.ticketAtual || -6, -25, 0))

  const tmaSeg = useMemo(() => mmssParaSeg(tmaInput), [tmaInput])

  const simResult = useMemo(
    () => calcSimulado(txRetracao, tmaSeg, absVal, indispVal, faltas, pedidos, ticketVal, p.rvConfig),
    [txRetracao, tmaSeg, absVal, indispVal, faltas, pedidos, ticketVal, p.rvConfig],
  )

  function applyScenario(retracao: number, tmaMmss: string, abs: number, indisp: number, f: number) {
    setTxRetracao(retracao)
    setTmaInput(tmaMmss)
    setAbsVal(abs)
    setIndispVal(indisp)
    setFaltas(f)
    // Atualiza cancelados para refletir nova retenção nos pedidos atuais
    if (pedidos > 0) {
      setCancelados(Math.round(pedidos * (1 - retracao / 100)))
    }
  }

  return (
    <>
      <style dangerouslySetInnerHTML={{ __html: `
        @keyframes calcFadeUp {
          from { opacity: 0; transform: translateY(10px); }
          to   { opacity: 1; transform: translateY(0); }
        }
      `}} />

      <div style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
        {!p.semDadosKpi && (
          <Fade delay={0}><ResultadoAtual p={p} /></Fade>
        )}

        <Fade delay={60}>
          <Simulador
            p={p}
            txRetracao={txRetracao} setTxRetracao={setTxRetracao}
            tmaInput={tmaInput}     setTmaInput={setTmaInput}
            absVal={absVal}         setAbsVal={setAbsVal}
            indispVal={indispVal}   setIndispVal={setIndispVal}
            faltas={faltas}         setFaltas={setFaltas}
            pedidos={pedidos}       setPedidos={setPedidos}
            cancelados={cancelados} setCancelados={setCancelados}
            ticketVal={ticketVal}   setTicketVal={setTicketVal}
            simResult={simResult}
          />
        </Fade>

        <Fade delay={120}>
          <CenariosRapidos p={p} pedidos={pedidos} ticketVal={ticketVal} onSelect={applyScenario} />
        </Fade>

        <Fade delay={180}>
          <TabelaFaixas
            config={p.rvConfig}
            txRetracao={txRetracao}
            ticket={ticketVal}
            indispVal={indispVal}
            tmaSeg={tmaSeg}
          />
        </Fade>
      </div>
    </>
  )
}
