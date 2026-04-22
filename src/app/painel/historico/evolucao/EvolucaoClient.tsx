'use client'

import { useState, useMemo } from 'react'
import {
  ResponsiveContainer, ComposedChart, Area, Line, XAxis, YAxis,
  Tooltip as RTooltip, ReferenceLine, CartesianGrid,
} from 'recharts'
import { TrendingUp, TrendingDown, BarChart2, Minus } from 'lucide-react'

// ── Tipos públicos ─────────────────────────────────────────────────────────────

export interface PontoEvolucao {
  mes: number
  ano: number
  label: string
  labelCompleto: string
  emAndamento: boolean
  kpi: {
    txRetencao:  number | null
    tmaSegundos: number | null
    abs:         number | null
    indisp:      number | null
  }
}

export interface EvolucaoProps {
  pontos: PontoEvolucao[]
}

// ── Helpers ───────────────────────────────────────────────────────────────────

function formatTMA(secs: number): string {
  const m = Math.floor(secs / 60)
  const s = Math.floor(secs % 60)
  return `${m}:${String(s).padStart(2, '0')}`
}

function formatPct(n: number): string {
  const r = Math.round(n * 10) / 10
  return r % 1 === 0 ? `${r}%` : `${r.toFixed(1)}%`
}

// ── Tipos internos ────────────────────────────────────────────────────────────

type Status = 'critico' | 'atencao' | 'neutro'

interface RefLine {
  valor: number
  label: string
  cor: string
}

interface MetricaConfig {
  id: keyof PontoEvolucao['kpi']
  tab: string
  getValor: (kpi: PontoEvolucao['kpi']) => number | null
  formatarYAxis: (n: number) => string
  formatarValor: (n: number) => string
  calcYDomain: (values: number[]) => [number, number]
  refLines: RefLine[]
  calcStatus: (n: number) => Status
  maiorMelhor: boolean
  metaRef: number | null
  temAtencao: boolean
}

// ── Configuração das métricas ─────────────────────────────────────────────────

const METRICAS: MetricaConfig[] = [
  {
    id: 'txRetencao', tab: 'TX Retenção', maiorMelhor: true,
    getValor: kpi => kpi.txRetencao,
    formatarYAxis: n => `${Math.round(n)}%`, formatarValor: formatPct,
    calcYDomain: (v) => {
      if (!v.length) return [50, 80]
      const all = [...v, 60, 66]
      const lo  = Math.min(...all), hi = Math.max(...all)
      const m   = Math.max(3, (hi - lo) * 0.35)
      return [
        Math.max(0,   Math.floor((lo - m) / 5) * 5),
        Math.min(100, Math.ceil ((hi + m) / 5) * 5),
      ]
    },
    refLines: [
      { valor: 66,  label: '66%', cor: 'rgba(201,168,76,0.55)' },
      { valor: 60,  label: '60%', cor: 'rgba(248,113,113,0.55)' },
    ],
    calcStatus: n => n < 60 ? 'critico' : n < 66 ? 'atencao' : 'neutro',
    metaRef: 66, temAtencao: true,
  },
  {
    id: 'tmaSegundos', tab: 'TMA', maiorMelhor: false,
    getValor: kpi => kpi.tmaSegundos,
    formatarYAxis: formatTMA, formatarValor: formatTMA,
    calcYDomain: (v) => {
      if (!v.length) return [0, 1200]
      const all = [...v, 731]
      const lo  = Math.min(...all), hi = Math.max(...all)
      const m   = Math.max(60, (hi - lo) * 0.35)
      return [
        Math.max(0, Math.floor((lo - m) / 60) * 60),
        Math.ceil((hi + m) / 60) * 60,
      ]
    },
    refLines: [{ valor: 731, label: '12:11', cor: 'rgba(248,113,113,0.55)' }],
    calcStatus: n => n > 731 ? 'critico' : 'neutro',
    metaRef: 731, temAtencao: false,
  },
  {
    id: 'abs', tab: 'ABS', maiorMelhor: false,
    getValor: kpi => kpi.abs,
    formatarYAxis: n => `${Math.round(n)}%`, formatarValor: formatPct,
    calcYDomain: (v) => {
      if (!v.length) return [0, 15]
      const hi = Math.max(...v, 5)
      const m  = Math.max(2, hi * 0.35)
      return [0, Math.ceil((hi + m) / 5) * 5]
    },
    refLines: [{ valor: 5, label: '5%', cor: 'rgba(248,113,113,0.55)' }],
    calcStatus: n => n > 5 ? 'critico' : 'neutro',
    metaRef: 5, temAtencao: false,
  },
  {
    id: 'indisp', tab: 'Indisponibilidade', maiorMelhor: false,
    getValor: kpi => kpi.indisp,
    formatarYAxis: n => `${Math.round(n)}%`, formatarValor: formatPct,
    calcYDomain: (v) => {
      if (!v.length) return [0, 30]
      const hi = Math.max(...v, 14.5)
      const m  = Math.max(3, hi * 0.35)
      return [0, Math.ceil((hi + m) / 5) * 5]
    },
    refLines: [{ valor: 14.5, label: '14.5%', cor: 'rgba(248,113,113,0.55)' }],
    calcStatus: n => n > 14.5 ? 'critico' : 'neutro',
    metaRef: 14.5, temAtencao: false,
  },
]

const STATUS_COLORS: Record<Status, string> = {
  critico: '#f87171',
  atencao: '#facc15',
  neutro:  '#4ade80',
}

const STATUS_LABEL: Record<Status, string> = {
  critico: 'CRÍTICO',
  atencao: 'ATENÇÃO',
  neutro:  'BOM',
}

// ── Calcular destaques ────────────────────────────────────────────────────────

interface Destaques {
  media: number
  n: number
  maiorAlta:  { rawDelta: number; mesPara: string; mesDe: string } | null
  maiorQueda: { rawDelta: number; mesPara: string; mesDe: string } | null
}

function calcularDestaques(
  data: { label: string; valor: number }[],
  metrica: MetricaConfig,
): Destaques | null {
  if (!data.length) return null
  const media = data.reduce((s, p) => s + p.valor, 0) / data.length
  if (data.length < 2) return { media, n: data.length, maiorAlta: null, maiorQueda: null }

  let bestImprove = -Infinity, bestIdx = 1, bestDelta = 0
  let worstImprove = Infinity, worstIdx = 1, worstDelta = 0

  for (let i = 1; i < data.length; i++) {
    const rawDelta = data[i].valor - data[i - 1].valor
    const improve  = metrica.maiorMelhor ? rawDelta : -rawDelta
    if (improve > bestImprove)  { bestImprove  = improve; bestIdx  = i; bestDelta  = rawDelta }
    if (improve < worstImprove) { worstImprove = improve; worstIdx = i; worstDelta = rawDelta }
  }

  return {
    media,
    n: data.length,
    maiorAlta:  { rawDelta: bestDelta,  mesPara: data[bestIdx].label,  mesDe: data[bestIdx  - 1].label },
    maiorQueda: { rawDelta: worstDelta, mesPara: data[worstIdx].label, mesDe: data[worstIdx - 1].label },
  }
}

function formatarDelta(rawDelta: number, metrica: MetricaConfig): string {
  const sign = rawDelta >= 0 ? '+' : '−'
  return sign + metrica.formatarValor(Math.abs(rawDelta))
}

function deltaIsGood(rawDelta: number, metrica: MetricaConfig): boolean {
  if (rawDelta === 0) return false
  return metrica.maiorMelhor ? rawDelta > 0 : rawDelta < 0
}

function corDoCard(rawDelta: number, metrica: MetricaConfig): string {
  if (rawDelta === 0) return '#f4d47c'
  return deltaIsGood(rawDelta, metrica) ? STATUS_COLORS.neutro : STATUS_COLORS.critico
}

// ── ChartRow type ─────────────────────────────────────────────────────────────

type ChartRow = Record<string, unknown> & {
  label: string
  labelCompleto: string
  emAndamento: boolean
  valor?: number
}

// ── Resumo Atual ──────────────────────────────────────────────────────────────

interface UltimoPonto {
  label: string
  labelCompleto: string
  emAndamento: boolean
  valor: number
}

function ResumoAtual({
  ultimoPonto, delta, media, metrica,
}: {
  ultimoPonto: UltimoPonto
  delta: number | null
  media: number | null
  metrica: MetricaConfig
}) {
  const status   = metrica.calcStatus(ultimoPonto.valor)
  const cor      = STATUS_COLORS[status]
  const deltaCor = delta === null ? 'rgba(255,255,255,0.30)'
    : deltaIsGood(delta, metrica) ? STATUS_COLORS.neutro
    : STATUS_COLORS.critico

  return (
    <div style={{
      padding: '20px 24px',
      borderBottom: '1px solid rgba(255,255,255,0.08)',
      display: 'flex', alignItems: 'center', justifyContent: 'space-between',
      gap: '16px', flexWrap: 'wrap',
    }}>
      {/* Coluna 1: valor hero */}
      <div>
        <div style={{
          fontFamily: 'var(--ff-body)',
          fontSize: '44px', fontWeight: 600, lineHeight: 1,
          color: cor, fontVariantNumeric: 'tabular-nums', letterSpacing: '-0.02em',
        }}>
          {metrica.formatarValor(ultimoPonto.valor)}
        </div>
        <div style={{
          fontFamily: 'var(--ff-body)',
          fontSize: '11px', color: 'rgba(255,255,255,0.40)',
          marginTop: '6px', display: 'flex', alignItems: 'center', gap: '8px',
        }}>
          {ultimoPonto.labelCompleto}
          {ultimoPonto.emAndamento && (
            <span style={{
              fontFamily: 'var(--ff-body)',
              fontSize: '10px', fontWeight: 700, letterSpacing: '0.06em', textTransform: 'uppercase',
              padding: '3px 7px', borderRadius: '4px',
              background: 'rgba(244,212,124,0.12)', border: '1px solid rgba(244,212,124,0.35)',
              color: '#f4d47c',
            }}>
              PARCIAL
            </span>
          )}
        </div>
      </div>

      {/* Coluna 2: variação + meta */}
      <div style={{ flex: 1, display: 'flex', flexDirection: 'column', gap: '5px', minWidth: '140px' }}>
        {delta !== null ? (
          <div style={{
            fontFamily: 'var(--ff-body)',
            fontSize: '14px', fontWeight: 600, color: deltaCor,
            fontVariantNumeric: 'tabular-nums',
          }}>
            Δ {delta > 0 ? '+' : delta < 0 ? '−' : ''}{metrica.formatarValor(Math.abs(delta))} vs mês anterior
          </div>
        ) : (
          <div style={{ fontFamily: 'var(--ff-body)', fontSize: '12px', color: 'rgba(255,255,255,0.25)' }}>
            Primeiro mês disponível
          </div>
        )}
        <div style={{
          fontFamily: 'var(--ff-body)',
          fontSize: '12px', color: 'rgba(255,255,255,0.35)',
          display: 'flex', alignItems: 'center', gap: '6px', flexWrap: 'wrap',
        }}>
          {media !== null && <span>média {metrica.formatarValor(media)}</span>}
          {media !== null && metrica.metaRef !== null && (
            <span style={{ color: 'rgba(255,255,255,0.18)' }}>·</span>
          )}
          {metrica.metaRef !== null && <span>meta {metrica.formatarValor(metrica.metaRef)}</span>}
        </div>
      </div>

      {/* Coluna 3: badge de status (padrão retangular dos cards) */}
      <div style={{
        fontFamily: 'var(--ff-body)',
        padding: '3px 7px', borderRadius: '4px',
        background: `${cor}1f`, border: `1px solid ${cor}59`,
        fontSize: '10px', fontWeight: 700, letterSpacing: '0.06em',
        color: cor, flexShrink: 0, textTransform: 'uppercase' as const,
        whiteSpace: 'nowrap',
      }}>
        {STATUS_LABEL[status]}
      </div>
    </div>
  )
}

// ── Legenda de cores ──────────────────────────────────────────────────────────

function LegendaCores({ metrica }: { metrica: MetricaConfig }) {
  const itens: { status: Status; label: string }[] = [
    { status: 'neutro',  label: 'BOM' },
    ...(metrica.temAtencao ? [{ status: 'atencao' as Status, label: 'ATENÇÃO' }] : []),
    { status: 'critico', label: 'CRÍTICO' },
  ]
  return (
    <div style={{
      display: 'flex', alignItems: 'center', justifyContent: 'center',
      gap: '20px', paddingTop: '4px',
    }}>
      {itens.map(item => (
        <div key={item.status} style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
          <div style={{
            width: '6px', height: '6px', borderRadius: '50%',
            background: STATUS_COLORS[item.status], flexShrink: 0,
          }} />
          <span style={{
            fontFamily: 'var(--ff-body)',
            fontSize: '10px', color: 'rgba(255,255,255,0.40)',
            fontWeight: 600, letterSpacing: '0.06em',
          }}>
            {item.label}
          </span>
        </div>
      ))}
    </div>
  )
}

// ── Custom Tooltip ────────────────────────────────────────────────────────────

function CustomTooltip({
  active, payload, metrica, flatData, mediaVal,
}: {
  active?: boolean
  payload?: Array<{ payload: ChartRow }>
  metrica: MetricaConfig
  flatData?: { label: string; valor: number }[]
  mediaVal?: number | null
}) {
  if (!active || !payload?.length) return null
  const d = payload[0]?.payload
  if (!d) return null
  const valor = d.valor
  if (valor == null) return null
  const v        = valor as number
  const status   = metrica.calcStatus(v)
  const cor      = STATUS_COLORS[status]

  let delta: number | null = null
  if (flatData) {
    const idx = flatData.findIndex(p => p.label === d.label)
    if (idx > 0) delta = v - flatData[idx - 1].valor
  }
  const deltaCor = delta === null ? 'rgba(255,255,255,0.30)'
    : deltaIsGood(delta, metrica) ? STATUS_COLORS.neutro
    : STATUS_COLORS.critico

  return (
    <div style={{
      background: '#0d0d1a',
      border: `1px solid ${cor}60`,
      borderRadius: '10px',
      padding: '14px 16px',
      minWidth: '190px',
      boxShadow: '0 8px 24px rgba(0,0,0,0.5), 0 0 0 1px rgba(255,255,255,0.04)',
    }}>
      <div style={{
        fontFamily: 'var(--ff-display)',
        fontSize: '10px', fontWeight: 700, letterSpacing: '0.1em',
        textTransform: 'uppercase', color: 'rgba(244,212,124,0.70)',
        marginBottom: '8px', display: 'flex', alignItems: 'center', gap: '6px',
      }}>
        {d.labelCompleto as string}
        {d.emAndamento && (
          <span style={{
            fontFamily: 'var(--ff-body)',
            fontSize: '10px', fontWeight: 700, letterSpacing: '0.06em', textTransform: 'uppercase',
            padding: '3px 7px', borderRadius: '4px',
            background: 'rgba(244,212,124,0.12)', border: '1px solid rgba(244,212,124,0.35)',
            color: '#f4d47c',
          }}>
            PARCIAL
          </span>
        )}
      </div>

      <div style={{
        fontFamily: 'var(--ff-body)',
        fontSize: '26px', fontWeight: 600, color: cor,
        fontVariantNumeric: 'tabular-nums', lineHeight: 1, letterSpacing: '-0.02em',
      }}>
        {metrica.formatarValor(v)}
      </div>

      <div style={{
        fontFamily: 'var(--ff-body)',
        display: 'inline-flex', alignItems: 'center', marginTop: '8px',
        padding: '3px 7px', borderRadius: '4px',
        background: `${cor}1f`, border: `1px solid ${cor}59`,
        fontSize: '10px', fontWeight: 700, letterSpacing: '0.06em', color: cor,
      }}>
        {STATUS_LABEL[status]}
      </div>

      {(delta !== null || mediaVal != null) && (
        <div style={{ height: '1px', background: 'rgba(255,255,255,0.07)', margin: '10px 0 8px' }} />
      )}

      {delta !== null && (
        <div style={{ fontFamily: 'var(--ff-body)', fontSize: '11px', color: deltaCor, marginBottom: '4px', fontVariantNumeric: 'tabular-nums' }}>
          vs anterior: {delta > 0 ? '+' : delta < 0 ? '−' : ''}{metrica.formatarValor(Math.abs(delta))}
        </div>
      )}
      {mediaVal != null && (
        <div style={{ fontFamily: 'var(--ff-body)', fontSize: '11px', color: 'rgba(255,255,255,0.35)', fontVariantNumeric: 'tabular-nums' }}>
          média: {metrica.formatarValor(mediaVal)}
        </div>
      )}
    </div>
  )
}

// ── Tab selector ──────────────────────────────────────────────────────────────

function TabSelector({
  metricas, selecionada, onChange,
}: {
  metricas: MetricaConfig[]
  selecionada: string
  onChange: (id: string) => void
}) {
  return (
    <div style={{ display: 'flex', gap: '6px', flexWrap: 'wrap' }}>
      {metricas.map(m => {
        const ativa = m.id === selecionada
        return (
          <button
            key={m.id}
            type="button"
            onClick={() => onChange(m.id)}
            style={{
              padding: '10px 18px',
              borderRadius: '8px',
              border:       ativa ? '1px solid rgba(201,168,76,0.30)' : '1px solid rgba(255,255,255,0.06)',
              borderBottom: ativa ? '2px solid #e8c96d'               : '2px solid transparent',
              background:   ativa ? 'rgba(201,168,76,0.08)'           : 'transparent',
              color:        ativa ? '#e8c96d'                         : 'rgba(255,255,255,0.45)',
              fontSize: '11px', fontWeight: 600, letterSpacing: '0.05em',
              cursor: 'pointer', transition: 'all 0.18s ease',
            }}
          >
            {m.tab}
          </button>
        )
      })}
    </div>
  )
}

// ── Card de destaque ──────────────────────────────────────────────────────────

function DestaqueCard({
  icon, titulo, valor, valorColor, arrow, contexto, subContexto,
}: {
  icon: React.ReactNode
  titulo: string
  valor: string
  valorColor: string
  arrow?: '↑' | '↓'
  contexto: string
  subContexto?: string
}) {
  return (
    <div style={{
      background: '#0d0d1a',
      border: '1px solid rgba(201,168,76,0.08)',
      borderRadius: '16px',
      padding: '20px 22px',
      display: 'flex', flexDirection: 'column', gap: '14px',
      flex: '1 1 160px',
    }}>
      <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
        <span style={{ color: valorColor, opacity: 0.75 }}>{icon}</span>
        <span style={{
          fontFamily: 'var(--ff-display)',
          fontSize: '10px', fontWeight: 700, letterSpacing: '0.13em',
          textTransform: 'uppercase', color: 'rgba(255,255,255,0.35)',
        }}>
          {titulo}
        </span>
      </div>
      <div>
        <div style={{
          fontFamily: 'var(--ff-body)',
          fontSize: '32px', fontWeight: 600, lineHeight: 1,
          color: valorColor, fontVariantNumeric: 'tabular-nums', letterSpacing: '-0.02em',
          display: 'flex', alignItems: 'baseline', gap: '5px',
        }}>
          {arrow && <span style={{ fontSize: '24px', opacity: 0.90 }}>{arrow}</span>}
          {valor}
        </div>
        <div style={{ fontFamily: 'var(--ff-body)', fontSize: '13px', color: 'rgba(255,255,255,0.55)', marginTop: '10px' }}>
          {contexto}
        </div>
        {subContexto && (
          <div style={{ fontFamily: 'var(--ff-body)', fontSize: '12px', color: 'rgba(255,255,255,0.35)', marginTop: '3px' }}>
            {subContexto}
          </div>
        )}
      </div>
    </div>
  )
}

// ── Estado vazio ──────────────────────────────────────────────────────────────

function EstadoVazio({ tipo }: { tipo: 'semDados' | 'apenasParcial' }) {
  return (
    <div style={{
      background: '#0d0d1a',
      border: '1px solid rgba(201,168,76,0.08)',
      borderRadius: '12px', padding: '48px 24px',
      textAlign: 'center',
      display: 'flex', flexDirection: 'column', alignItems: 'center', gap: '12px',
    }}>
      <BarChart2 size={32} style={{ color: 'rgba(255,255,255,0.15)' }} />
      {tipo === 'semDados' ? (
        <>
          <p style={{ fontFamily: 'var(--ff-body)', fontSize: '14px', fontWeight: 600, color: 'rgba(255,255,255,0.45)', margin: 0 }}>
            Nenhum mês disponível ainda
          </p>
          <p style={{ fontFamily: 'var(--ff-body)', fontSize: '12px', color: 'rgba(255,255,255,0.25)', margin: 0 }}>
            Peça ao gestor para associar planilhas ao histórico em Configurações.
          </p>
        </>
      ) : (
        <>
          <p style={{ fontFamily: 'var(--ff-body)', fontSize: '14px', fontWeight: 600, color: 'rgba(255,255,255,0.45)', margin: 0 }}>
            Apenas o mês atual disponível
          </p>
          <p style={{ fontFamily: 'var(--ff-body)', fontSize: '12px', color: 'rgba(255,255,255,0.25)', margin: 0 }}>
            Aguarde os primeiros meses fecharem para ver sua evolução completa.
          </p>
        </>
      )}
    </div>
  )
}

function MetricaSemDados({ tab }: { tab: string }) {
  return (
    <div style={{
      height: '260px',
      display: 'flex', alignItems: 'center', justifyContent: 'center',
      color: 'rgba(255,255,255,0.25)', fontSize: '13px',
      fontFamily: 'var(--ff-body)',
    }}>
      Sem dados de {tab} para exibir
    </div>
  )
}

// ── Componente principal ──────────────────────────────────────────────────────

export default function EvolucaoClient({ pontos }: EvolucaoProps) {
  const [metricaId, setMetricaId] = useState<string>('txRetencao')

  const { metrica, chartData, segmentos, yDomain, flatData, ultimoPonto, delta } = useMemo(() => {
    const metrica = METRICAS.find(m => m.id === metricaId)!

    const filtrado = pontos
      .map(p => ({
        label:         p.label,
        labelCompleto: p.labelCompleto,
        emAndamento:   p.emAndamento,
        valor:         metrica.getValor(p.kpi),
      }))
      .filter((p): p is typeof p & { valor: number } => p.valor !== null)

    const n = filtrado.length

    const chartData: ChartRow[] = filtrado.map((p, i) => {
      const row: ChartRow = {
        label:         p.label,
        labelCompleto: p.labelCompleto,
        emAndamento:   p.emAndamento,
        valor:         p.valor,
      }
      for (let j = 1; j < n; j++) {
        row[`seg_${j}`] = (i === j - 1 || i === j) ? p.valor : null
      }
      return row
    })

    // Segment j covers indices j-1 → j, colored by destination point
    const segmentos: { key: string; cor: string; dashed: boolean }[] = []
    for (let j = 1; j < n; j++) {
      const destino = filtrado[j]
      const dashed  = destino.emAndamento
      const cor     = dashed ? '#f4d47c' : STATUS_COLORS[metrica.calcStatus(destino.valor)]
      segmentos.push({ key: `seg_${j}`, cor, dashed })
    }

    const values      = filtrado.map(p => p.valor)
    const yDomain     = metrica.calcYDomain(values)
    const flatData    = filtrado.map(p => ({ label: p.label, valor: p.valor }))
    const ultimoPonto = filtrado.length > 0 ? filtrado[filtrado.length - 1] : null
    const delta       = filtrado.length >= 2
      ? filtrado[filtrado.length - 1].valor - filtrado[filtrado.length - 2].valor
      : null

    return { metrica, chartData, segmentos, yDomain, flatData, ultimoPonto, delta }
  }, [pontos, metricaId])

  const destaques = useMemo(
    () => calcularDestaques(flatData, metrica),
    [flatData, metrica],
  )

  // ── Empty states ──────────────────────────────────────────────────────────

  if (pontos.length === 0) {
    return (
      <div className="space-y-4 login-grid-bg">
        <GoldLine />
        <PageHeader totalMeses={0} />
        <EstadoVazio tipo="semDados" />
      </div>
    )
  }

  if (pontos.length === 1 && pontos[0].emAndamento) {
    return (
      <div className="space-y-4 login-grid-bg">
        <GoldLine />
        <PageHeader totalMeses={1} />
        <TabSelector metricas={METRICAS} selecionada={metricaId} onChange={setMetricaId} />
        <EstadoVazio tipo="apenasParcial" />
      </div>
    )
  }

  // ── Main render ───────────────────────────────────────────────────────────

  return (
    <div className="space-y-4 login-grid-bg">
      <style>{`
        .ev-fadeup { animation: evFadeUp 0.35s ease both; }
        @keyframes evFadeUp {
          from { opacity: 0; transform: translateY(6px); }
          to   { opacity: 1; transform: translateY(0); }
        }
        @media (prefers-reduced-motion: reduce) { .ev-fadeup { animation: none; } }
      `}</style>

      <GoldLine />
      <PageHeader totalMeses={pontos.length} />

      <div className="ev-fadeup" style={{ animationDelay: '0ms' }}>
        <TabSelector metricas={METRICAS} selecionada={metricaId} onChange={setMetricaId} />
      </div>

      {/* Chart container — integra ResumoAtual + gráfico + legenda */}
      <div className="ev-fadeup" style={{
        animationDelay: '40ms',
        background: '#0d0d1a',
        border: '1px solid rgba(201,168,76,0.08)',
        borderRadius: '12px',
        overflow: 'hidden',
      }}>

        {/* Resumo atual — hero acima do gráfico */}
        {ultimoPonto && (
          <ResumoAtual
            ultimoPonto={ultimoPonto}
            delta={delta}
            media={destaques?.media ?? null}
            metrica={metrica}
          />
        )}

        {/* Gráfico */}
        <div style={{ padding: '24px 16px 0 4px' }}>
          {chartData.length === 0 ? (
            <MetricaSemDados tab={metrica.tab} />
          ) : (
            <ResponsiveContainer key={metricaId} width="100%" height={400}>
              <ComposedChart data={chartData} margin={{ top: 12, right: 64, left: 4, bottom: 4 }}>

                <defs>
                  <linearGradient id="ev-area-gradient" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="0%"   stopColor="#f4d47c" stopOpacity={0.35} />
                    <stop offset="60%"  stopColor="#f4d47c" stopOpacity={0.14} />
                    <stop offset="100%" stopColor="#f4d47c" stopOpacity={0.02} />
                  </linearGradient>
                </defs>

                <CartesianGrid
                  strokeDasharray="3 3"
                  stroke="rgba(255,255,255,0.08)"
                  vertical={false}
                />

                <XAxis
                  dataKey="label"
                  tick={{ fill: 'rgba(255,255,255,0.45)', fontSize: 11, fontWeight: 600 }}
                  axisLine={{ stroke: 'rgba(255,255,255,0.07)' }}
                  tickLine={false}
                />
                <YAxis
                  domain={yDomain}
                  tickFormatter={metrica.formatarYAxis}
                  tick={{ fill: 'rgba(255,255,255,0.40)', fontSize: 11 }}
                  axisLine={false}
                  tickLine={false}
                  width={50}
                />

                {metrica.refLines.map(rl => (
                  <ReferenceLine
                    key={rl.valor}
                    y={rl.valor}
                    stroke={rl.cor}
                    strokeDasharray="4 3"
                    label={{
                      value: rl.label,
                      position: 'right',
                      fill: rl.cor.replace(/0\.\d+\)$/, '0.95)'),
                      fontSize: 10,
                      fontWeight: 700,
                    }}
                  />
                ))}

                {/* Area gradient fill */}
                <Area
                  type="monotone"
                  dataKey="valor"
                  fill="url(#ev-area-gradient)"
                  stroke="none"
                  isAnimationActive={true}
                  animationDuration={600}
                  activeDot={false}
                />

                {/* Per-segment colored lines (3.5px) */}
                {segmentos.map(seg => (
                  <Line
                    key={seg.key}
                    dataKey={seg.key}
                    stroke={seg.cor}
                    strokeWidth={3.5}
                    strokeDasharray={seg.dashed ? '5 4' : undefined}
                    connectNulls={false}
                    dot={false}
                    activeDot={false}
                    isAnimationActive={true}
                    animationDuration={500}
                    style={{ filter: `drop-shadow(0 0 5px ${seg.cor}60)` }}
                  />
                ))}

                {/* Transparent line — dots + hover halo */}
                <Line
                  dataKey="valor"
                  stroke="transparent"
                  strokeWidth={0}
                  connectNulls={false}
                  isAnimationActive={false}
                  dot={(props: Record<string, unknown>) => {
                    const { cx, cy, payload } = props as { cx: number; cy: number; payload: ChartRow }
                    const v = payload.valor
                    if (v == null || cx == null || cy == null) return <g key={`d-${payload.label}`} />
                    if (payload.emAndamento) {
                      const cor = '#f4d47c'
                      return (
                        <g key={`d-${payload.label}`}>
                          <circle cx={cx} cy={cy} r={13} fill={cor} fillOpacity={0.12} />
                          <circle cx={cx} cy={cy} r={9}  fill="transparent" stroke={cor} strokeWidth={1.5} strokeDasharray="3 2" />
                          <circle cx={cx} cy={cy} r={4}  fill={cor} />
                        </g>
                      )
                    }
                    const cor = STATUS_COLORS[metrica.calcStatus(v as number)]
                    return (
                      <g key={`d-${payload.label}`}>
                        <circle cx={cx} cy={cy} r={12} fill={cor} fillOpacity={0.16} />
                        <circle cx={cx} cy={cy} r={7}  fill={cor} stroke="#0c1018" strokeWidth={2} />
                      </g>
                    )
                  }}
                  activeDot={({ cx, cy, payload }: { cx?: number; cy?: number; payload?: ChartRow }) => {
                    const v = payload?.valor
                    if (v == null || cx == null || cy == null) return <g />
                    if (payload?.emAndamento) {
                      const cor = '#f4d47c'
                      return (
                        <g>
                          <circle cx={cx} cy={cy} r={18} fill={cor} fillOpacity={0.28} />
                          <circle cx={cx} cy={cy} r={9}  fill="transparent" stroke={cor} strokeWidth={1.5} strokeDasharray="3 2" />
                          <circle cx={cx} cy={cy} r={4}  fill={cor} />
                        </g>
                      )
                    }
                    const cor = STATUS_COLORS[metrica.calcStatus(v as number)]
                    return (
                      <g>
                        <circle cx={cx} cy={cy} r={16} fill={cor} fillOpacity={0.32} />
                        <circle cx={cx} cy={cy} r={7}  fill={cor} stroke="#0c1018" strokeWidth={2} />
                      </g>
                    )
                  }}
                />

                <RTooltip
                  content={
                    <CustomTooltip
                      metrica={metrica}
                      flatData={flatData}
                      mediaVal={destaques?.media ?? null}
                    />
                  }
                  cursor={{ strokeDasharray: '3 3', stroke: 'rgba(255,255,255,0.18)', strokeWidth: 1 }}
                />
              </ComposedChart>
            </ResponsiveContainer>
          )}
        </div>

        {/* Legenda de cores */}
        <div style={{ padding: '16px 24px 20px' }}>
          <LegendaCores metrica={metrica} />
        </div>
      </div>

      {/* Cards de destaque */}
      {destaques && (
        <div className="ev-fadeup" style={{ animationDelay: '80ms', display: 'flex', gap: '16px', flexWrap: 'wrap' }}>

          {(() => {
            const d = destaques.maiorAlta
            if (!d) return (
              <DestaqueCard
                icon={<TrendingUp size={16} />}
                titulo="Maior Alta"
                valor="—"
                valorColor="rgba(255,255,255,0.35)"
                contexto="Sem comparação disponível"
              />
            )
            const cor   = corDoCard(d.rawDelta, metrica)
            const arrow = d.rawDelta > 0 ? '↑' : d.rawDelta < 0 ? '↓' : undefined
            return (
              <DestaqueCard
                icon={<TrendingUp size={16} />}
                titulo="Maior Alta"
                valor={formatarDelta(d.rawDelta, metrica)}
                valorColor={cor}
                arrow={arrow}
                contexto={`em ${d.mesPara}`}
                subContexto={`vs ${d.mesDe}`}
              />
            )
          })()}

          {(() => {
            const d = destaques.maiorQueda
            if (!d) return (
              <DestaqueCard
                icon={<TrendingDown size={16} />}
                titulo="Maior Queda"
                valor="—"
                valorColor="rgba(255,255,255,0.35)"
                contexto="Sem comparação disponível"
              />
            )
            const cor   = corDoCard(d.rawDelta, metrica)
            const arrow = d.rawDelta > 0 ? '↑' : d.rawDelta < 0 ? '↓' : undefined
            return (
              <DestaqueCard
                icon={<TrendingDown size={16} />}
                titulo="Maior Queda"
                valor={formatarDelta(d.rawDelta, metrica)}
                valorColor={cor}
                arrow={arrow}
                contexto={`em ${d.mesPara}`}
                subContexto={`vs ${d.mesDe}`}
              />
            )
          })()}

          <DestaqueCard
            icon={<Minus size={16} />}
            titulo="Média do Período"
            valor={metrica.formatarValor(destaques.media)}
            valorColor="#f4d47c"
            contexto={`${destaques.n} ${destaques.n === 1 ? 'mês' : 'meses'}`}
          />
        </div>
      )}
    </div>
  )
}

// ── Subcomponentes auxiliares ─────────────────────────────────────────────────

function GoldLine() {
  return (
    <div style={{
      height: '1px',
      background: 'linear-gradient(90deg, transparent 0%, #c9a84c 25%, #e8c96d 50%, #c9a84c 75%, transparent 100%)',
    }} />
  )
}

function PageHeader({ totalMeses }: { totalMeses: number }) {
  return (
    <div style={{
      background: '#0d0d1a',
      border: '1px solid rgba(201,168,76,0.10)',
      borderRadius: '12px',
      padding: '14px 20px',
      display: 'flex', flexDirection: 'column', gap: '6px',
    }}>
      <div style={{ display: 'flex', alignItems: 'center', gap: '10px', flexWrap: 'wrap' }}>
        <span style={{
          fontFamily: 'var(--ff-display)',
          fontSize: '15px', fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.06em',
          background: 'linear-gradient(135deg, #e8c96d 0%, #c9a84c 100%)',
          WebkitBackgroundClip: 'text', WebkitTextFillColor: 'transparent', backgroundClip: 'text',
        }}>
          Evolução
        </span>
        <div style={{ width: '1px', height: '14px', background: 'rgba(201,168,76,0.2)' }} />
        <span style={{ fontFamily: 'var(--ff-body)', fontSize: '11px', color: 'var(--text-muted)' }}>
          {totalMeses} {totalMeses === 1 ? 'mês disponível' : 'meses disponíveis'}
        </span>
      </div>
      <p style={{ fontFamily: 'var(--ff-body)', fontSize: '12px', color: 'rgba(255,255,255,0.35)', margin: 0 }}>
        Acompanhe a evolução da sua performance ao longo do tempo.
      </p>
    </div>
  )
}
