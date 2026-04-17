'use client'

import { useState } from 'react'
import { ChevronDown, Info, Trophy, AlertTriangle } from 'lucide-react'
import type { Meta } from '@/lib/kpi-utils'
import { normalizarChave } from '@/lib/kpi-utils'
import { getAvatarStyle, getIniciaisNome } from '@/lib/operadores'

// ── Tipos ──────────────────────────────────────────────────────────────────────

export interface OperadorRow {
  opId: number
  nomeReal: string
  username: string
  nomeFantasia: string | null
  snap1: Record<string, number> | null
  snap2: Record<string, number> | null
  score: number   // soma de pontos (-18 a +18); 0 se sem comparação
}

export interface SemanalClientProps {
  datas: string[]
  rows: OperadorRow[]
  metas: Meta[]
  mesReferencia: string
  melhores: number[]
  piores: number[]
}

// ── Sistema de pontos (espelho de page.tsx) ────────────────────────────────────

function calcKpiPts(nomeColuna: string, v1: number, v2: number): number {
  const key = normalizarChave(nomeColuna)

  if (key.includes('retenc') || key.includes('retenç')) {
    const d = v2 - v1
    if (d >= 2) return 3
    if (d > 0) return 1
    if (d < 0 && d > -2) return -1
    if (d <= -2) return -3
    return 0
  }
  if (key === 'pedidos') {
    const d = v2 - v1
    if (d >= 5) return 3
    if (d >= 1) return 1
    if (d <= -1 && d >= -4) return -1
    if (d <= -5) return -3
    return 0
  }
  if (key === 'churn') {
    const r = v1 - v2
    if (r >= 3) return 3
    if (r >= 1) return 1
    if (r <= -1 && r >= -2) return -1
    if (r <= -3) return -3
    return 0
  }
  if (key.startsWith('abs')) {
    const r = v1 - v2
    if (r >= 0.5) return 3
    if (r > 0) return 1
    if (r < 0 && r > -0.5) return -1
    if (r <= -0.5) return -3
    return 0
  }
  if (key.includes('indisp')) {
    const r = v1 - v2
    if (r >= 1) return 3
    if (r > 0) return 1
    if (r < 0 && r > -1) return -1
    if (r <= -1) return -3
    return 0
  }
  if (key === 'tma') {
    const r = v1 - v2
    if (r >= 30) return 3
    if (r >= 1) return 1
    if (r <= -1 && r >= -29) return -1
    if (r <= -30) return -3
    return 0
  }
  return 0
}

// ── Helpers de formato ─────────────────────────────────────────────────────────

function isTxRet(meta: Meta): boolean {
  const k = normalizarChave(meta.nome_coluna)
  return k.includes('retenc') || k.includes('retenç')
}

function isTma(meta: Meta): boolean {
  return normalizarChave(meta.nome_coluna) === 'tma'
}

function fmtVal(val: number, meta: Meta): string {
  if (isTma(meta)) {
    const m = Math.floor(val / 60)
    const s = Math.round(val % 60)
    return `${String(m).padStart(2, '0')}:${String(s).padStart(2, '0')}`
  }
  const uni = meta.unidade.trim().toLowerCase()
  if (uni === '%' || uni === 'porcentagem') return `${val.toFixed(1)}%`
  return Number.isInteger(val) ? String(val) : val.toFixed(1)
}

function fmtDelta(v1: number, v2: number, meta: Meta): string {
  const d = v2 - v1
  if (isTma(meta)) {
    const abs = Math.round(Math.abs(d))
    return `${d >= 0 ? '+' : '-'}${abs}s`
  }
  const uni = meta.unidade.trim().toLowerCase()
  if (uni === '%' || uni === 'porcentagem') {
    return `${d >= 0 ? '+' : ''}${d.toFixed(1)}pp`
  }
  const rounded = Math.round(d * 10) / 10
  return `${rounded >= 0 ? '+' : ''}${rounded}`
}

function isImproved(v1: number, v2: number, meta: Meta): boolean {
  return meta.tipo === 'maior_melhor' ? v2 > v1 : v2 < v1
}

const MESES = ['jan','fev','mar','abr','mai','jun','jul','ago','set','out','nov','dez']
function fmtMes(mes: string): string {
  const [y, m] = mes.split('-')
  const idx = parseInt(m, 10) - 1
  return `${MESES[idx] ?? m} ${y}`
}
function fmtData(d: string): string {
  const m = d.match(/^(\d{4})-(\d{2})-(\d{2})$/)
  return m ? `${m[3]}/${m[2]}` : d
}

// ── Barra comparativa ──────────────────────────────────────────────────────────

function KpiBar({ v1, v2, meta }: { v1: number; v2: number; meta: Meta }) {
  const max = Math.max(v1, v2) || 1
  const pct1 = Math.min((v1 / max) * 100, 100)
  const pct2 = Math.min((v2 / max) * 100, 100)
  const ok = isImproved(v1, v2, meta)
  const color = ok ? 'var(--verde)' : 'var(--vermelho)'
  const unchanged = v1 === v2

  return (
    <div
      className="relative h-1 rounded-full mt-2"
      style={{ background: 'rgba(255,255,255,0.06)' }}
    >
      {/* Snap1 ghost */}
      <div
        className="absolute inset-y-0 left-0 rounded-full"
        style={{ width: `${pct1}%`, background: 'rgba(255,255,255,0.18)' }}
      />
      {/* Snap2 bar */}
      <div
        className="absolute inset-y-0 left-0 rounded-full"
        style={{
          width: `${pct2}%`,
          background: unchanged ? 'rgba(255,255,255,0.25)' : color,
          opacity: 0.8,
        }}
      />
      {/* Tick no snap1 */}
      {!unchanged && (
        <div
          className="absolute inset-y-0 w-px"
          style={{ left: `${pct1}%`, background: 'rgba(255,255,255,0.5)' }}
        />
      )}
    </div>
  )
}

// ── Linha de KPI ──────────────────────────────────────────────────────────────

function KpiRow({
  meta, v1, v2, destaque,
}: {
  meta: Meta
  v1: number | undefined
  v2: number | undefined
  destaque?: boolean
}) {
  if (v1 === undefined && v2 === undefined) {
    return (
      <div className={destaque ? 'py-2.5' : 'py-1.5'}>
        <div className="flex items-center justify-between gap-2">
          <span className="text-xs" style={{ color: 'var(--text-muted)' }}>
            {destaque && <span className="mr-1">⭐</span>}
            {meta.label}
            {destaque && (
              <span className="ml-1.5 text-[9px] font-semibold px-1.5 py-0.5 rounded-full"
                style={{ background: 'rgba(201,168,76,0.12)', color: 'var(--gold-light)' }}>
                Principal
              </span>
            )}
          </span>
          <span className="text-xs" style={{ color: 'var(--text-muted)' }}>—</span>
        </div>
      </div>
    )
  }

  // Só snap2 (sem comparação)
  if (v1 === undefined) {
    return (
      <div className={destaque ? 'py-2.5' : 'py-1.5'}>
        <div className="flex items-center justify-between gap-2">
          <span className="text-xs" style={{ color: 'var(--text-secondary)' }}>
            {destaque && <span className="mr-1">⭐</span>}
            {meta.label}
          </span>
          <span
            className={destaque ? 'text-sm font-bold tabular-nums' : 'text-xs font-semibold tabular-nums'}
            style={{ color: 'var(--text-primary)' }}
          >
            {fmtVal(v2!, meta)}
          </span>
        </div>
      </div>
    )
  }

  const val1 = v1!
  const val2 = v2 ?? val1
  const pts = calcKpiPts(meta.nome_coluna, val1, val2)
  const ok = isImproved(val1, val2, meta)
  const unchanged = val1 === val2
  const deltaColor = unchanged ? 'var(--text-muted)' : ok ? 'var(--verde)' : 'var(--vermelho)'

  return (
    <div className={destaque ? 'py-2.5' : 'py-1.5'}>
      {/* Linha superior: label + pts badge */}
      <div className="flex items-center justify-between gap-2 mb-1">
        <span
          className={destaque ? 'text-xs font-semibold' : 'text-[11px] font-medium'}
          style={{ color: 'var(--text-secondary)' }}
        >
          {destaque && <span className="mr-1">⭐</span>}
          {meta.label}
          {destaque && (
            <span className="ml-1.5 text-[9px] font-bold px-1.5 py-0.5 rounded-full"
              style={{ background: 'rgba(201,168,76,0.12)', color: 'var(--gold-light)' }}>
              Principal
            </span>
          )}
        </span>
        {pts !== 0 && (
          <span
            className="text-[9px] font-bold px-1.5 py-0.5 rounded-full tabular-nums shrink-0"
            style={{
              background: pts > 0 ? 'rgba(16,185,129,0.12)' : 'rgba(239,68,68,0.12)',
              color: pts > 0 ? 'var(--verde)' : 'var(--vermelho)',
              border: `1px solid ${pts > 0 ? 'rgba(16,185,129,0.2)' : 'rgba(239,68,68,0.2)'}`,
            }}
          >
            {pts > 0 ? '+' : ''}{pts}pts
          </span>
        )}
      </div>

      {/* Linha inferior: valores + delta */}
      <div className="flex items-center gap-1.5">
        <span
          className="tabular-nums shrink-0"
          style={{
            color: 'var(--text-muted)',
            fontSize: destaque ? '13px' : '11px',
          }}
        >
          {fmtVal(val1, meta)}
        </span>
        <span style={{ color: 'var(--text-muted)', fontSize: '10px' }}>→</span>
        <span
          className="font-bold tabular-nums shrink-0"
          style={{
            color: unchanged ? 'var(--text-secondary)' : deltaColor,
            fontSize: destaque ? '15px' : '12px',
          }}
        >
          {fmtVal(val2, meta)}
        </span>
        {!unchanged && (
          <span
            className="text-[10px] font-semibold tabular-nums ml-auto shrink-0"
            style={{ color: deltaColor }}
          >
            {fmtDelta(val1, val2, meta)}
          </span>
        )}
      </div>

      {/* Barra */}
      <KpiBar v1={val1} v2={val2} meta={meta} />
    </div>
  )
}

// ── Card de operador ───────────────────────────────────────────────────────────

const POS_EMOJI_MELHOR = ['🥇', '🥈', '🥉']

function OperadorCard({
  row, metas, pos, tipo,
}: {
  row: OperadorRow
  metas: Meta[]
  pos: number        // 1-based
  tipo: 'melhor' | 'pior'
}) {
  const isMelhor = tipo === 'melhor'
  const posEmoji = isMelhor ? (POS_EMOJI_MELHOR[pos - 1] ?? `#${pos}`) : '💀'
  const pts = row.score
  const ptsColor = pts > 0 ? 'var(--verde)' : pts < 0 ? 'var(--vermelho)' : 'var(--text-muted)'
  const ptsBg = pts > 0
    ? 'rgba(16,185,129,0.08)'
    : pts < 0
      ? 'rgba(239,68,68,0.08)'
      : 'rgba(255,255,255,0.04)'
  const ptsBorder = pts > 0
    ? 'rgba(16,185,129,0.15)'
    : pts < 0
      ? 'rgba(239,68,68,0.15)'
      : 'rgba(255,255,255,0.08)'

  const txRetMeta   = metas.find((m) => isTxRet(m))
  const outrasMetas = metas.filter((m) => !isTxRet(m))

  const nome = row.nomeFantasia ?? row.nomeReal.split(' ')[0]

  return (
    <div
      className="card flex flex-col"
      style={{ padding: 0, overflow: 'hidden' }}
    >
      {/* Header */}
      <div
        className="flex items-center gap-3 px-4 pt-4 pb-3"
        style={{ borderBottom: '1px solid var(--border)' }}
      >
        <span className="text-xl leading-none shrink-0">{posEmoji}</span>
        <div
          className="w-9 h-9 rounded-xl flex items-center justify-center text-[10px] font-bold shrink-0 border-2"
          style={getAvatarStyle(row.opId)}
        >
          {getIniciaisNome(row.nomeReal)}
        </div>
        <div className="flex-1 min-w-0">
          <p
            className="font-bold truncate"
            style={{
              fontFamily: 'var(--ff-display)',
              fontSize: '16px',
              color: 'var(--text-primary)',
              lineHeight: 1.2,
            }}
          >
            {nome}
          </p>
          <p className="text-[10px] truncate mt-0.5" style={{ color: 'var(--text-muted)' }}>
            @{row.username}
          </p>
        </div>
        {/* Pontuação total */}
        <div
          className="shrink-0 text-right px-3 py-2 rounded-xl"
          style={{ background: ptsBg, border: `1px solid ${ptsBorder}` }}
        >
          <p
            className="text-xl font-bold tabular-nums leading-none"
            style={{ color: ptsColor, fontFamily: 'var(--ff-body)' }}
          >
            {pts > 0 ? '+' : ''}{pts}
          </p>
          <p className="text-[9px] mt-0.5 uppercase tracking-wide" style={{ color: 'var(--text-muted)' }}>
            pts
          </p>
        </div>
      </div>

      {/* KPIs */}
      <div className="flex-1 px-4">
        {/* Tx. Retenção em destaque */}
        {txRetMeta && (
          <>
            <KpiRow
              meta={txRetMeta}
              v1={row.snap1?.[txRetMeta.nome_coluna]}
              v2={row.snap2?.[txRetMeta.nome_coluna]}
              destaque
            />
            {outrasMetas.length > 0 && (
              <div className="divider" style={{ margin: '0 0 0.25rem' }} />
            )}
          </>
        )}

        {/* Demais KPIs */}
        {outrasMetas.map((meta, i) => (
          <div key={meta.nome_coluna}>
            <KpiRow
              meta={meta}
              v1={row.snap1?.[meta.nome_coluna]}
              v2={row.snap2?.[meta.nome_coluna]}
            />
            {i < outrasMetas.length - 1 && (
              <div style={{ height: '1px', background: 'rgba(255,255,255,0.04)' }} />
            )}
          </div>
        ))}
      </div>

      <div style={{ height: '1rem' }} />
    </div>
  )
}

// ── Componente principal ───────────────────────────────────────────────────────

export default function SemanalClient({
  datas, rows, metas, mesReferencia, melhores, piores,
}: SemanalClientProps) {
  const [infoAberta, setInfoAberta] = useState(false)

  const data2 = datas[0] ?? null
  const data1 = datas[1] ?? null

  const rowsMelhores = melhores.map((id) => rows.find((r) => r.opId === id)).filter(Boolean) as OperadorRow[]
  const rowsPiores   = piores.map((id)   => rows.find((r) => r.opId === id)).filter(Boolean) as OperadorRow[]

  const semDados = datas.length === 0

  return (
    <div className="space-y-6">

      {/* Header */}
      <div>
        <h1
          className="text-xl font-bold"
          style={{ color: 'var(--text-primary)', fontFamily: 'var(--ff-display)' }}
        >
          Acompanhamento Semanal
        </h1>
        <p className="text-sm mt-0.5 flex items-center gap-2 flex-wrap" style={{ color: 'var(--text-muted)' }}>
          <span style={{ textTransform: 'capitalize' }}>{fmtMes(mesReferencia)}</span>
          {data1 && data2 && (
            <>
              <span style={{ color: 'var(--border)' }}>·</span>
              <span>
                Comparando{' '}
                <strong style={{ color: 'var(--text-secondary)' }}>{fmtData(data1)}</strong>
                {' '}→{' '}
                <strong style={{ color: 'var(--text-secondary)' }}>{fmtData(data2)}</strong>
              </span>
            </>
          )}
          {data2 && !data1 && (
            <>
              <span style={{ color: 'var(--border)' }}>·</span>
              <span>Snapshot de <strong style={{ color: 'var(--text-secondary)' }}>{fmtData(data2)}</strong></span>
            </>
          )}
        </p>
      </div>

      {/* Como funciona */}
      <div className="card" style={{ padding: 0 }}>
        <button
          type="button"
          onClick={() => setInfoAberta((v) => !v)}
          className="w-full flex items-center gap-3 px-4 py-3 text-left"
        >
          <Info size={14} style={{ color: 'var(--gold)', flexShrink: 0 }} />
          <span className="text-sm font-semibold flex-1" style={{ color: 'var(--text-secondary)' }}>
            Como funciona
          </span>
          <ChevronDown
            size={14}
            style={{
              color: 'var(--text-muted)',
              flexShrink: 0,
              transition: 'transform 0.3s',
              transform: infoAberta ? 'rotate(0deg)' : 'rotate(-90deg)',
            }}
          />
        </button>

        <div
          style={{
            maxHeight: infoAberta ? '600px' : '0px',
            overflow: 'hidden',
            transition: 'max-height 0.35s cubic-bezier(0.4,0,0.2,1)',
          }}
        >
          <div className="px-4 pb-5 space-y-3" style={{ borderTop: '1px solid var(--border)' }}>
            <p className="text-xs pt-3 leading-relaxed" style={{ color: 'var(--text-secondary)' }}>
              Toda segunda-feira o sistema captura automaticamente os KPIs de cada operador a
              partir da planilha ativa. Esta tela compara os dois últimos registros,
              calculando a <strong style={{ color: 'var(--gold-light)' }}>pontuação de evolução</strong> de cada um.
            </p>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-x-6 gap-y-2 pt-1">
              {[
                { label: '⭐ Tx. Retenção', desc: '≥+2pp →+3 | +0~2pp →+1 | -0~2pp →-1 | ≤-2pp →-3' },
                { label: 'Pedidos', desc: '≥+5 →+3 | +1~4 →+1 | -1~4 →-1 | ≤-5 →-3' },
                { label: 'Churn', desc: 'reduziu ≥3 →+3 | 1~2 →+1 | aumentou 1~2 →-1 | ≥3 →-3' },
                { label: 'ABS', desc: 'reduziu ≥0.5pp →+3 | >0 →+1 | aumentou >0 →-1 | ≥0.5pp →-3' },
                { label: 'Indisp Total', desc: 'reduziu ≥1pp →+3 | >0 →+1 | aumentou >0 →-1 | ≥1pp →-3' },
                { label: 'TMA', desc: 'reduziu ≥30s →+3 | 1~29s →+1 | aumentou 1~29s →-1 | ≥30s →-3' },
              ].map(({ label, desc }) => (
                <div key={label}>
                  <p className="text-[10px] font-bold mb-0.5" style={{ color: 'var(--text-secondary)' }}>{label}</p>
                  <p className="text-[10px] leading-relaxed" style={{ color: 'var(--text-muted)' }}>{desc}</p>
                </div>
              ))}
            </div>

            <p className="text-[10px] font-semibold pt-1" style={{ color: 'var(--text-muted)' }}>
              Pontuação máxima: <span style={{ color: 'var(--verde)' }}>+18 pts</span>
              {' '}·{' '}
              Mínima: <span style={{ color: 'var(--vermelho)' }}>-18 pts</span>
            </p>
          </div>
        </div>
      </div>

      {/* Sem dados */}
      {semDados && (
        <div className="card flex flex-col items-center justify-center py-16 text-center" style={{ padding: '4rem 2rem' }}>
          <Trophy size={32} style={{ color: 'var(--text-muted)', opacity: 0.3 }} />
          <p className="text-sm mt-3" style={{ color: 'var(--text-muted)' }}>
            Nenhum snapshot disponível ainda.
          </p>
          <p className="text-xs mt-1" style={{ color: 'var(--text-muted)', opacity: 0.6 }}>
            O primeiro registro será criado automaticamente na próxima segunda-feira.
          </p>
        </div>
      )}

      {/* Top 3 melhores */}
      {rowsMelhores.length > 0 && (
        <div>
          <div className="flex items-center gap-2 mb-3">
            <Trophy size={15} style={{ color: 'var(--gold)' }} />
            <span className="label-uppercase" style={{ color: 'var(--gold)' }}>Melhores da semana</span>
          </div>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            {rowsMelhores.map((row, i) => (
              <OperadorCard key={row.opId} row={row} metas={metas} pos={i + 1} tipo="melhor" />
            ))}
          </div>
        </div>
      )}

      {/* Divisor */}
      {rowsMelhores.length > 0 && rowsPiores.length > 0 && (
        <div className="flex items-center gap-3">
          <div className="flex-1" style={{ height: '1px', background: 'var(--border)' }} />
          <div className="flex items-center gap-2">
            <AlertTriangle size={13} style={{ color: 'var(--vermelho)', opacity: 0.7 }} />
            <span className="label-uppercase" style={{ color: 'var(--vermelho)', opacity: 0.8 }}>
              Precisam de atenção
            </span>
          </div>
          <div className="flex-1" style={{ height: '1px', background: 'var(--border)' }} />
        </div>
      )}

      {/* Top 3 piores */}
      {rowsPiores.length > 0 && (
        <div>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            {rowsPiores.map((row, i) => (
              <OperadorCard key={row.opId} row={row} metas={metas} pos={i + 1} tipo="pior" />
            ))}
          </div>
        </div>
      )}
    </div>
  )
}
