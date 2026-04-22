'use client'

import { useMemo, useState } from 'react'
import type { KpiHistoricoMes, KpiHistoricoItem } from '@/lib/historico-kpi'
import {
  Package, XCircle, Shield, Clock, CalendarX, Activity,
  ArrowUp, ArrowDown, Minus, UserX,
} from 'lucide-react'
import {
  BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip,
  ReferenceLine, ResponsiveContainer, Cell, LabelList,
} from 'recharts'

export interface Ultimos3MesesProps {
  meses: KpiHistoricoMes[]
}

const MESES_CURTOS = ['JAN','FEV','MAR','ABR','MAI','JUN','JUL','AGO','SET','OUT','NOV','DEZ']

// ── Parsers ───────────────────────────────────────────────────────────────────

function parseValor(label: string, valor: string): number | null {
  if (!valor || valor === '—') return null
  const l = label.toLowerCase()
  if (l.includes('tma') || l.includes('tempo')) {
    const parts = valor.split(':').map(p => parseInt(p, 10))
    if (parts.some(Number.isNaN)) return null
    if (parts.length === 3) return parts[0] * 3600 + parts[1] * 60 + parts[2]
    if (parts.length === 2) return parts[0] * 60 + parts[1]
    return null
  }
  const s = valor.replace('%', '').replace(',', '.').trim()
  const n = parseFloat(s)
  return isNaN(n) ? null : n
}

function fmtTMA(secs: number): string {
  const h = Math.floor(secs / 3600)
  const m = Math.floor((secs % 3600) / 60)
  const s = Math.floor(secs % 60)
  if (h > 0) return `${String(h).padStart(2,'0')}:${String(m).padStart(2,'0')}:${String(s).padStart(2,'0')}`
  return `${String(m).padStart(2,'0')}:${String(s).padStart(2,'0')}`
}

// ── Delta calc (semântico binário: bom/ruim/neutro) ──────────────────────────

type DeltaSentido = 'bom' | 'ruim' | 'neutro'

interface DeltaInfo {
  texto: string
  seta: 'up' | 'down' | 'eq'
  sentido: DeltaSentido
  raw: number
}

function calcDelta(label: string, valAtual: string, valAnterior: string): DeltaInfo | null {
  const nA = parseValor(label, valAtual)
  const nB = parseValor(label, valAnterior)
  if (nA === null || nB === null) return null
  const delta = nA - nB
  return {
    texto: fmtDelta(label, delta),
    seta: delta > 0 ? 'up' : delta < 0 ? 'down' : 'eq',
    sentido: sentidoDelta(label, delta),
    raw: delta,
  }
}

function fmtDelta(label: string, delta: number): string {
  const l = label.toLowerCase()
  if (l.includes('tma') || l.includes('tempo')) {
    const sign = delta > 0 ? '+' : delta < 0 ? '-' : ''
    const abs = Math.abs(Math.round(delta))
    const h = Math.floor(abs / 3600)
    const m = Math.floor((abs % 3600) / 60)
    const s = abs % 60
    return `${sign}${String(h).padStart(2,'0')}:${String(m).padStart(2,'0')}:${String(s).padStart(2,'0')}`
  }
  const isPct = l.includes('retenc') || l.includes('retenç')
    || l === 'abs' || l.startsWith('abs') || l.includes('indisp')
  if (isPct) {
    const r = Math.round(Math.abs(delta) * 10) / 10
    const absFmt = r % 1 === 0 ? r.toFixed(0) : r.toFixed(1).replace('.', ',')
    const sign = delta > 0 ? '+' : delta < 0 ? '-' : ''
    return `${sign}${absFmt}%`
  }
  const sign = delta > 0 ? '+' : delta < 0 ? '-' : ''
  return `${sign}${Math.abs(Math.round(delta))}`
}

function sentidoDelta(label: string, delta: number): DeltaSentido {
  if (delta === 0) return 'neutro'
  const l = label.toLowerCase()
  const subirBom  = l.includes('pedido') || l.includes('retenc') || l.includes('retenç')
  const descerBom = l.includes('churn') || l.includes('tma') || l.includes('tempo')
    || l === 'abs' || l.startsWith('abs') || l.includes('indisp')
  if (subirBom)  return delta > 0 ? 'bom' : 'ruim'
  if (descerBom) return delta < 0 ? 'bom' : 'ruim'
  return 'neutro'
}

function corDeltaLegado(label: string, delta: number): string {
  const s = sentidoDelta(label, delta)
  if (s === 'bom')  return '#4ade80'
  if (s === 'ruim') return '#f87171'
  return 'rgba(255,255,255,0.55)'
}

// ── Ícones por métrica ──────────────────────────────────────────────────────

function iconFor(label: string, size = 16) {
  const l = label.toLowerCase()
  if (l.includes('retenc') || l.includes('retenç')) return <Shield size={size} />
  if (l.includes('tma') || l.includes('tempo'))      return <Clock size={size} />
  if (l.includes('churn') || l.includes('cancel'))   return <XCircle size={size} />
  if (l.includes('pedido'))                          return <Package size={size} />
  if (l === 'abs' || l.startsWith('abs'))            return <CalendarX size={size} />
  if (l.includes('indisp'))                          return <Activity size={size} />
  return <Activity size={size} />
}

// ── Pill de delta ───────────────────────────────────────────────────────────

function DeltaPill({ delta, mesAntAbbr }: { delta: DeltaInfo | null; mesAntAbbr?: string | null }) {
  if (!delta) {
    return (
      <div className="hl-pill" style={{ color: 'rgba(255,255,255,0.40)' }} title="Sem mês anterior para comparar">
        <Minus size={14} strokeWidth={2.5} />
        <span>—</span>
      </div>
    )
  }
  const cor =
    delta.sentido === 'bom'  ? '#4ade80' :
    delta.sentido === 'ruim' ? '#f87171' :
                               'rgba(255,255,255,0.55)'
  return (
    <div className="hl-pill" style={{ color: cor }}>
      {delta.seta === 'up'   && <ArrowUp   size={14} strokeWidth={2.5} />}
      {delta.seta === 'down' && <ArrowDown size={14} strokeWidth={2.5} />}
      {delta.seta === 'eq'   && <Minus     size={14} strokeWidth={2.5} />}
      {mesAntAbbr && <span className="hl-pill-ref">{mesAntAbbr}</span>}
      <span>{delta.texto}</span>
    </div>
  )
}

// ── Linha de KPI (card horizontal) ──────────────────────────────────────────

function LinhaKpi({
  label, valor, delta, mesAntAbbr,
}: {
  label: string
  valor: string
  delta: DeltaInfo | null
  mesAntAbbr?: string | null
}) {
  const semDados = valor === '—'
  const displayLabel = label.toLowerCase().includes('indisp') ? 'INDISP.' : label.toUpperCase()

  return (
    <div className="hl-card">
      <div className="hl-card-label">
        <span className="hl-card-icon">{iconFor(label, 14)}</span>
        <span>{displayLabel}</span>
      </div>
      <div
        className="hl-card-valor"
        style={{ color: semDados ? 'rgba(255,255,255,0.28)' : undefined }}
      >
        {valor}
      </div>
      <DeltaPill delta={semDados ? null : delta} mesAntAbbr={mesAntAbbr} />
    </div>
  )
}

// ── Bloco de um mês ─────────────────────────────────────────────────────────

const ORDEM_METRICAS = ['Pedido', 'Churn', 'Tx. Retenção', 'TMA', 'ABS', 'Indisponibilidade']

function MesBloco({
  mes, mesAnterior,
}: {
  mes: KpiHistoricoMes
  mesAnterior: KpiHistoricoMes | null
}) {
  const metricas: KpiHistoricoItem[] = ORDEM_METRICAS
    .map(l => mes.principais.find(p => p.label === l))
    .filter((x): x is KpiHistoricoItem => !!x)

  return (
    <div className="hl-mes">
      <div className="hl-mes-header">
        <h2 className="hl-mes-titulo">{mes.mesLabel}</h2>
        {mes.emAndamento ? (
          <span className="hl-badge hl-badge-blue">em andamento</span>
        ) : mes.encontrado ? (
          <span className="hl-badge hl-badge-neutral">fechado</span>
        ) : null}
        {!mes.encontrado && (
          <span className="hl-badge hl-badge-muted">sem dados</span>
        )}
      </div>

      {!mes.encontrado ? (
        <div className="hl-empty-mes">
          <UserX size={28} style={{ color: 'rgba(255,255,255,0.35)' }} />
          <p>Você não estava na empresa neste mês.</p>
        </div>
      ) : (
        <div className="hl-cards">
          {metricas.map(k => {
            const valAnt = mesAnterior?.encontrado
              ? mesAnterior.principais.find(p => p.label === k.label)?.valor
              : undefined
            const d = valAnt ? calcDelta(k.label, k.valor, valAnt) : null
            const mesAntAbbr = mesAnterior?.encontrado && mesAnterior.mes
              ? MESES_CURTOS[mesAnterior.mes - 1] ?? null
              : null
            return <LinhaKpi key={k.label} label={k.label} valor={k.valor} delta={d} mesAntAbbr={mesAntAbbr} />
          })}
        </div>
      )}
    </div>
  )
}

// ── Gráfico comparativo ─────────────────────────────────────────────────────

type MetricaChart = 'retencao' | 'tma' | 'abs' | 'indisp'

interface MetricaCfg {
  tabLabel: string
  kpiLabel: string
  titulo: string
  meta: number
  metaLabel: string
  ehTMA: boolean
  yPad: number
}

const METRICA_CONFIG: Record<MetricaChart, MetricaCfg> = {
  retencao: { tabLabel: 'TX RETENÇÃO', kpiLabel: 'Tx. Retenção',      titulo: 'TX RETENÇÃO',       meta: 66,  metaLabel: '≥ 66%',     ehTMA: false, yPad: 10 },
  tma:      { tabLabel: 'TMA',          kpiLabel: 'TMA',              titulo: 'TMA',               meta: 731, metaLabel: '≤ 12:11',   ehTMA: true,  yPad: 120 },
  abs:      { tabLabel: 'ABS',          kpiLabel: 'ABS',              titulo: 'ABS',               meta: 5,   metaLabel: '< 5%',      ehTMA: false, yPad: 3  },
  indisp:   { tabLabel: 'INDISP.',      kpiLabel: 'Indisponibilidade', titulo: 'INDISPONIBILIDADE', meta: 14.5,metaLabel: '< 14,5%',   ehTMA: false, yPad: 5  },
}

function statusCorBarra(metrica: MetricaChart, valor: number): string {
  if (metrica === 'retencao') {
    if (valor >= 66) return '#4ade80'
    if (valor >= 60) return '#facc15'
    return '#f87171'
  }
  if (metrica === 'tma')    return valor > 731  ? '#f87171' : '#4ade80'
  if (metrica === 'abs')    return valor >= 5    ? '#f87171' : '#4ade80'
  if (metrica === 'indisp') return valor >= 14.5 ? '#f87171' : '#4ade80'
  return 'rgba(255,255,255,0.60)'
}

function formatChartValue(metrica: MetricaChart, v: number): string {
  if (metrica === 'tma') return fmtTMA(v)
  const r = Math.round(v * 10) / 10
  return `${(r % 1 === 0 ? r.toFixed(0) : r.toFixed(1)).replace('.', ',')}%`
}

function gradFor(cor: string): string {
  if (cor === '#4ade80') return 'url(#hl-grad-green)'
  if (cor === '#facc15') return 'url(#hl-grad-yellow)'
  if (cor === '#f87171') return 'url(#hl-grad-red)'
  return cor
}

function GraficoComparativo({ meses }: { meses: KpiHistoricoMes[] }) {
  const [ativa, setAtiva] = useState<MetricaChart>('retencao')
  const cfg = METRICA_CONFIG[ativa]

  const data = useMemo(() => meses.map(m => {
    const k = m.principais.find(p => p.label === cfg.kpiLabel)
    const v = k ? parseValor(cfg.kpiLabel, k.valor) : null
    return {
      mes: MESES_CURTOS[m.mes - 1],
      valor: v,
      valorLabel: v !== null ? formatChartValue(ativa, v) : '—',
      emAndamento: m.emAndamento,
      cor: v !== null ? statusCorBarra(ativa, v) : 'rgba(255,255,255,0.20)',
    }
  }), [meses, ativa, cfg.kpiLabel])

  const deltasCalc: { deltaRaw: number; mesLabel: string }[] = []
  for (let i = 0; i < meses.length - 1; i++) {
    const atu = meses[i], ant = meses[i + 1]
    const ka = atu.principais.find(p => p.label === cfg.kpiLabel)?.valor
    const kb = ant.principais.find(p => p.label === cfg.kpiLabel)?.valor
    if (!ka || !kb) continue
    const na = parseValor(cfg.kpiLabel, ka)
    const nb = parseValor(cfg.kpiLabel, kb)
    if (na === null || nb === null) continue
    deltasCalc.push({ deltaRaw: na - nb, mesLabel: MESES_CURTOS[atu.mes - 1] })
  }
  const valoresValidos = data.filter(d => d.valor !== null).map(d => d.valor as number)
  const media      = valoresValidos.length ? valoresValidos.reduce((a,b) => a + b, 0) / valoresValidos.length : null
  const maiorAlta  = deltasCalc.length ? deltasCalc.reduce((m, d) => d.deltaRaw > m.deltaRaw ? d : m, deltasCalc[0]) : null
  const maiorQueda = deltasCalc.length ? deltasCalc.reduce((m, d) => d.deltaRaw < m.deltaRaw ? d : m, deltasCalc[0]) : null

  const yMax = valoresValidos.length
    ? Math.max(cfg.meta + cfg.yPad, Math.max(...valoresValidos) + cfg.yPad)
    : cfg.meta + cfg.yPad

  return (
    <div className="hl-chart">
      <div className="hl-chart-header">
        <span className="hl-chart-titulo">GRÁFICO COMPARATIVO</span>
      </div>

      <div className="hl-tabs" role="tablist">
        {(Object.keys(METRICA_CONFIG) as MetricaChart[]).map(m => (
          <button
            key={m}
            type="button"
            role="tab"
            aria-selected={ativa === m}
            className={`hl-tab ${ativa === m ? 'hl-tab-active' : ''}`}
            onClick={() => setAtiva(m)}
          >
            {METRICA_CONFIG[m].tabLabel}
          </button>
        ))}
      </div>

      <div className="hl-chart-titulo-metrica">{cfg.titulo}</div>

      <div className="hl-chart-wrap" key={ativa}>
        <div className="hl-meta-tag">META {cfg.metaLabel}</div>
        <ResponsiveContainer width="100%" height={260}>
          <BarChart data={data} margin={{ top: 28, right: 22, left: 6, bottom: 6 }}>
            <defs>
              <linearGradient id="hl-grad-green" x1="0" y1="0" x2="0" y2="1">
                <stop offset="0%" stopColor="#6ee7a0" />
                <stop offset="100%" stopColor="#4ade80" />
              </linearGradient>
              <linearGradient id="hl-grad-yellow" x1="0" y1="0" x2="0" y2="1">
                <stop offset="0%" stopColor="#fde047" />
                <stop offset="100%" stopColor="#facc15" />
              </linearGradient>
              <linearGradient id="hl-grad-red" x1="0" y1="0" x2="0" y2="1">
                <stop offset="0%" stopColor="#fca5a5" />
                <stop offset="100%" stopColor="#f87171" />
              </linearGradient>
            </defs>
            <CartesianGrid strokeDasharray="3 3" stroke="rgba(255,255,255,0.03)" vertical={false} />
            <XAxis
              dataKey="mes"
              axisLine={false}
              tickLine={false}
              tick={{ fontSize: 12, fill: '#a1a1aa', fontWeight: 500 }}
            />
            <YAxis
              axisLine={false}
              tickLine={false}
              domain={[0, yMax]}
              tickFormatter={(v) => cfg.ehTMA ? fmtTMA(v) : `${Math.round(v)}%`}
              tick={{ fontSize: 11, fill: '#71717a' }}
              width={52}
            />
            <Tooltip
              cursor={{ fill: 'rgba(244,212,124,0.06)' }}
              content={({ active, payload }) => {
                if (!active || !payload || !payload.length) return null
                const p = payload[0].payload as typeof data[number]
                if (p.valor === null) return null
                return (
                  <div style={{
                    background: 'rgba(20, 24, 32, 0.92)',
                    border: '1px solid rgba(244, 212, 124, 0.25)',
                    borderRadius: '8px',
                    padding: '10px 14px',
                    fontFamily: 'var(--ff-body)',
                    backdropFilter: 'blur(12px)',
                    WebkitBackdropFilter: 'blur(12px)',
                    boxShadow: '0 6px 18px rgba(0,0,0,0.45)',
                  }}>
                    <div style={{
                      fontSize: '11px', fontWeight: 600, color: 'rgba(255,255,255,0.55)',
                      letterSpacing: '0.08em',
                    }}>
                      {p.mes}{p.emAndamento ? ' · PARCIAL' : ''}
                    </div>
                    <div style={{
                      fontSize: '16px', fontWeight: 700, color: 'rgba(255,255,255,0.95)', marginTop: '2px',
                      fontVariantNumeric: 'tabular-nums',
                    }}>
                      {p.valorLabel}
                    </div>
                  </div>
                )
              }}
            />
            <ReferenceLine
              y={cfg.meta}
              stroke="rgba(244, 212, 124, 0.50)"
              strokeDasharray="3 6"
              strokeWidth={1.5}
            />
            <Bar dataKey="valor" radius={[6, 6, 0, 0]} maxBarSize={56} isAnimationActive animationDuration={800}>
              {data.map((d, i) => (
                <Cell
                  key={i}
                  fill={gradFor(d.cor)}
                  fillOpacity={d.emAndamento ? 0.82 : 1}
                  stroke={d.emAndamento ? d.cor : undefined}
                  strokeWidth={d.emAndamento ? 1.5 : 0}
                  strokeDasharray={d.emAndamento ? '4 3' : undefined}
                />
              ))}
              <LabelList
                dataKey="valorLabel"
                position="top"
                fill="#d4d4d8"
                fontSize={13}
                fontWeight={700}
              />
            </Bar>
          </BarChart>
        </ResponsiveContainer>
      </div>

      <div className="hl-chart-detalhes">
        <div className="hl-det-linha">
          <span>META</span>
          <span style={{ color: '#f4d47c', fontWeight: 700 }}>{cfg.metaLabel}</span>
        </div>
        {maiorAlta && (
          <div className="hl-det-linha">
            <span>MAIOR ALTA</span>
            <span style={{ fontWeight: 700 }}>
              <span style={{ color: corDeltaLegado(cfg.kpiLabel, maiorAlta.deltaRaw) }}>
                {fmtDelta(cfg.kpiLabel, maiorAlta.deltaRaw)}
              </span>
              <span style={{ color: 'rgba(255,255,255,0.40)', fontWeight: 500, fontSize: '11px' }}>
                {' em '}{maiorAlta.mesLabel}
              </span>
            </span>
          </div>
        )}
        {maiorQueda && (
          <div className="hl-det-linha">
            <span>MAIOR QUEDA</span>
            <span style={{ fontWeight: 700 }}>
              <span style={{ color: corDeltaLegado(cfg.kpiLabel, maiorQueda.deltaRaw) }}>
                {fmtDelta(cfg.kpiLabel, maiorQueda.deltaRaw)}
              </span>
              <span style={{ color: 'rgba(255,255,255,0.40)', fontWeight: 500, fontSize: '11px' }}>
                {' em '}{maiorQueda.mesLabel}
              </span>
            </span>
          </div>
        )}
        {media !== null && (
          <div className="hl-det-linha">
            <span>MÉDIA</span>
            <span style={{ color: 'rgba(255,255,255,0.95)', fontWeight: 700 }}>
              {formatChartValue(ativa, media)}
            </span>
          </div>
        )}
      </div>
    </div>
  )
}

// ── Componente principal ────────────────────────────────────────────────────

export default function Ultimos3MesesClient({ meses }: Ultimos3MesesProps) {
  if (!meses.length) {
    return (
      <div className="hl-root">
        <HistLightStyles />
        <div className="hl-empty-page">
          <p>Nenhum mês de histórico configurado ainda.</p>
          <p className="hl-empty-sub">Peça ao gestor para associar planilhas em Configurações.</p>
        </div>
      </div>
    )
  }

  return (
    <div className="hl-root login-grid-bg">
      <HistLightStyles />

      <div className="hl-page-header">
        <h1 className="hl-page-titulo">Último Trimestre</h1>
        <p className="hl-page-subtitulo">
          Detalhamento dos últimos 3 meses
        </p>
      </div>

      <div className="hl-split">
        <div className="hl-col-left">
          {meses.map((m, i) => (
            <MesBloco
              key={`${m.mes}-${m.ano}`}
              mes={m}
              mesAnterior={meses[i + 1] ?? null}
            />
          ))}
        </div>
        <div className="hl-col-right">
          <GraficoComparativo meses={meses} />
        </div>
      </div>
    </div>
  )
}

// ── Estilos locais (escopados via .hl-root) ────────────────────────────────

function HistLightStyles() {
  return (
    <style>{`
      .hl-root {
        font-family: var(--ff-body);
        color: rgba(255,255,255,0.95);
      }
      .hl-root * { box-sizing: border-box; }

      .hl-page-header {
        background: linear-gradient(90deg, #0c0f16 0%, #0a0d13 100%);
        border: 1px solid rgba(201, 168, 76, 0.10);
        border-radius: 12px;
        padding: 14px 20px;
        display: flex; flex-direction: column; gap: 6px;
        margin-bottom: 24px;
      }
      .hl-page-titulo {
        font-family: var(--ff-display);
        font-size: 16px; font-weight: 700; letter-spacing: 0.06em;
        text-transform: uppercase;
        background: linear-gradient(135deg, #e8c96d 0%, #c9a84c 100%);
        -webkit-background-clip: text;
        -webkit-text-fill-color: transparent;
        background-clip: text;
        margin: 0;
      }
      .hl-page-subtitulo {
        font-family: var(--ff-body);
        font-size: 12px; color: rgba(255,255,255,0.35);
        margin: 0;
      }

      .hl-split {
        display: grid;
        grid-template-columns: minmax(0, 1.63fr) minmax(0, 1fr);
        gap: 32px;
        align-items: start;
      }
      @media (max-width: 1279px) {
        .hl-split { grid-template-columns: 1fr; gap: 24px; }
        .hl-col-right { position: static; margin-top: 0; }
      }
      .hl-col-right { position: sticky; top: 24px; margin-top: 64px; }

      /* ── Blocos de mês ───────────────────────────────── */
      .hl-mes { margin-bottom: 36px; }
      .hl-mes:last-child { margin-bottom: 0; }

      .hl-mes-header {
        display: flex; align-items: center; gap: 14px;
        margin-bottom: 12px; flex-wrap: wrap;
        padding: 14px 18px;
        border-radius: 10px;
        background: linear-gradient(90deg, #0c0f16 0%, #0a0d13 100%);
        border: 1px solid rgba(201, 168, 76, 0.10);
      }
      .hl-mes-titulo {
        font-family: var(--ff-body);
        font-size: 20px; font-weight: 400; letter-spacing: 0.12em;
        text-transform: uppercase; color: #f4d47c;
        font-variant-numeric: normal;
        font-feature-settings: normal;
        margin: 0;
      }
      .hl-badge {
        font-family: var(--ff-body);
        font-size: 10px; font-weight: 700; letter-spacing: 0.10em;
        text-transform: uppercase;
        padding: 5px 12px; border-radius: 5px;
      }
      .hl-badge-blue {
        background: rgba(244, 212, 124, 0.15);
        border: 1px solid rgba(244, 212, 124, 0.40);
        color: #f4d47c;
      }
      .hl-badge-neutral {
        background: rgba(255, 255, 255, 0.05);
        border: 1px solid rgba(255, 255, 255, 0.15);
        color: rgba(255, 255, 255, 0.55);
      }
      .hl-badge-muted {
        background: rgba(255, 255, 255, 0.02);
        border: 1px solid rgba(255, 255, 255, 0.10);
        color: rgba(255, 255, 255, 0.40);
      }

      .hl-cards { display: flex; flex-direction: column; gap: 6px; }

      /* ── Card linha (gradiente horizontal neutro) ── */
      .hl-card {
        display: flex; align-items: center; justify-content: space-between;
        gap: 14px;
        padding: 9px 18px;
        border-radius: 8px;
        border: 1px solid rgba(201, 168, 76, 0.10);
        background: linear-gradient(to right, #15181f 0%, #0f1219 100%);
        transition: background 0.2s ease, border-color 0.2s ease;
      }
      .hl-card:hover {
        background: linear-gradient(to right, #1a1e27 0%, #13161e 100%);
        border-color: rgba(201, 168, 76, 0.18);
      }

      .hl-card-label {
        display: flex; align-items: center; gap: 8px;
        font-family: var(--ff-body);
        font-size: 14px; font-weight: 500; letter-spacing: 0.10em;
        text-transform: uppercase; color: #d4d4d8;
        min-width: 168px; flex-shrink: 0;
      }
      .hl-card-icon { display: inline-flex; color: rgba(255,255,255,0.50); }

      .hl-card-valor {
        font-family: var(--ff-body);
        font-size: 14px; font-weight: 700;
        font-variant-numeric: tabular-nums;
        letter-spacing: 0;
        line-height: 1;
        color: #d4d4d8;
        flex: 1; text-align: center;
      }

      /* ── Pill do delta (fundo neutro, cor semântica inline) ── */
      .hl-pill {
        display: inline-flex; align-items: center; gap: 6px;
        padding: 4px 10px;
        border-radius: 6px;
        font-family: var(--ff-body);
        font-size: 14px; font-weight: 600;
        font-variant-numeric: tabular-nums;
        line-height: 1;
        justify-content: center;
        flex-shrink: 0;
        background: rgba(14, 16, 22, 0.85);
        border: 1px solid rgba(255, 255, 255, 0.06);
      }
      .hl-pill-ref {
        font-weight: 700; letter-spacing: 0.04em;
        opacity: 0.92;
      }

      /* ── Vazio do mês ───────────────────────────────── */
      .hl-empty-mes {
        padding: 28px 20px; border-radius: 10px;
        background: rgba(20, 24, 32, 0.5);
        border: 1px dashed rgba(255, 255, 255, 0.10);
        display: flex; flex-direction: column; align-items: center; gap: 8px;
      }
      .hl-empty-mes p {
        font-family: var(--ff-body);
        font-size: 13px; color: rgba(255,255,255,0.55); margin: 0;
      }

      .hl-empty-page {
        padding: 48px 24px; text-align: center;
        border-radius: 12px;
        background: rgba(20, 24, 32, 0.6);
        backdrop-filter: blur(12px);
        -webkit-backdrop-filter: blur(12px);
        border: 1px dashed rgba(255, 255, 255, 0.10);
      }
      .hl-empty-page p { color: rgba(255,255,255,0.70); font-size: 14px; margin: 0; }
      .hl-empty-page .hl-empty-sub { color: rgba(255,255,255,0.40); font-size: 12px; margin-top: 6px; }

      /* ── Gráfico (fundo sólido para cobrir grid dourado) ── */
      .hl-chart {
        background: #0d1017;
        border-radius: 12px;
        border: 1px solid rgba(201, 168, 76, 0.10);
        padding: 24px;
        display: flex; flex-direction: column; gap: 14px;
      }
      .hl-chart-header { display: flex; align-items: center; }
      .hl-chart-titulo {
        font-family: var(--ff-display);
        font-size: 14px; font-weight: 700; letter-spacing: 0.12em;
        text-transform: uppercase; color: #f4d47c;
      }

      .hl-tabs {
        display: flex; gap: 2px;
        border-bottom: 1px solid rgba(255, 255, 255, 0.08);
        flex-wrap: wrap;
      }
      .hl-tab {
        font-family: var(--ff-body);
        font-size: 11px; font-weight: 600; letter-spacing: 0.08em;
        text-transform: uppercase;
        padding: 10px 16px;
        background: transparent; border: none;
        color: #a1a1aa; cursor: pointer;
        border-bottom: 2px solid transparent;
        border-radius: 6px 6px 0 0;
        transition: color 0.2s ease, background 0.2s ease, border-color 0.2s ease;
      }
      .hl-tab:hover { color: #d4d4d8; }
      .hl-tab-active {
        color: #f4d47c;
        background: rgba(244, 212, 124, 0.10);
        border-bottom-color: #f4d47c;
        font-weight: 700;
      }
      .hl-tab-active:hover { color: #f4d47c; }

      .hl-chart-titulo-metrica {
        font-family: var(--ff-display);
        font-size: 18px; font-weight: 700; letter-spacing: 0.10em;
        text-transform: uppercase; color: #f4d47c;
        padding: 4px 0;
      }

      .hl-chart-wrap {
        position: relative;
        padding: 4px 0;
        animation: hlFadeChart 0.25s ease both;
      }
      .hl-meta-tag {
        position: absolute;
        top: 4px; right: 6px;
        font-family: var(--ff-body);
        font-size: 11px; font-weight: 600; letter-spacing: 0.08em;
        text-transform: uppercase;
        color: #f4d47c;
        opacity: 0.70;
        background: #0d1017;
        padding: 2px 8px;
        border-radius: 4px;
        border: 1px solid rgba(244, 212, 124, 0.20);
        z-index: 2; pointer-events: none;
      }
      @keyframes hlFadeChart {
        from { opacity: 0; transform: translateY(4px); }
        to   { opacity: 1; transform: translateY(0); }
      }

      .hl-chart-detalhes {
        border-top: 1px solid rgba(255, 255, 255, 0.08);
        padding-top: 4px;
        display: flex; flex-direction: column;
      }
      .hl-det-linha {
        display: flex; justify-content: space-between; align-items: center;
        padding: 10px 0;
        font-family: var(--ff-body);
        font-size: 14px;
        border-bottom: 1px solid rgba(255, 255, 255, 0.06);
        font-variant-numeric: tabular-nums;
      }
      .hl-det-linha:last-child { border-bottom: none; }
      .hl-det-linha > span:first-child {
        font-size: 12px; font-weight: 600; letter-spacing: 0.08em;
        text-transform: uppercase; color: rgba(255, 255, 255, 0.55);
      }

      @media (max-width: 680px) {
        .hl-card {
          gap: 10px; padding: 8px 14px;
        }
        .hl-card-label { min-width: 120px; font-size: 12px; }
        .hl-card-valor { font-size: 13px; }
        .hl-pill { padding: 3px 7px; font-size: 12px; }
        .hl-mes-header { padding: 12px 14px; }
        .hl-mes-titulo { font-size: 18px; }
      }

      @media (prefers-reduced-motion: reduce) {
        .hl-card, .hl-tab, .hl-chart-wrap { transition: none; animation: none; }
      }
    `}</style>
  )
}
