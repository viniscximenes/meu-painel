'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import { ArrowLeft } from 'lucide-react'
import { getAvatarStyle, getIniciaisNome } from '@/lib/operadores'
import { normalizarChave, calcKpiPts } from '@/lib/kpi-utils'
import type { Meta } from '@/lib/kpi-utils'

// ── Tipos ──────────────────────────────────────────────────────────────────────

interface SnapNorm {
  data_ref: string
  dados: Record<string, number>
}

interface Props {
  operador: { id: number; nome: string; username: string }
  nomeFantasia: string | null
  snapshots: SnapNorm[]
  metas: Meta[]
  posicao: { tipo: 'melhor' | 'pior'; lugar: number } | null
  score: number
  mesReferencia: string
}

// ── Helpers ────────────────────────────────────────────────────────────────────

function fmtData(iso: string) {
  const m = iso.match(/^(\d{4})-(\d{2})-(\d{2})$/)
  return m ? `${m[3]}/${m[2]}` : iso
}

function isTxRet(meta: Meta) {
  const k = normalizarChave(meta.nome_coluna)
  return k.includes('retenc') || k.includes('retenç')
}
function isTma(meta: Meta) {
  return normalizarChave(meta.nome_coluna) === 'tma'
}
function isPct(meta: Meta) {
  const k = normalizarChave(meta.nome_coluna)
  return isTxRet(meta) || k.startsWith('abs') || k.includes('indisp')
}

function fmtVal(val: number, meta: Meta): string {
  if (isTma(meta)) {
    const m = Math.floor(val / 60), s = Math.round(val % 60)
    return `${String(m).padStart(2, '0')}:${String(s).padStart(2, '0')}`
  }
  const uni = meta.unidade.trim().toLowerCase()
  if (uni === '%' || uni === 'porcentagem') return `${val.toFixed(1)}%`
  return Number.isInteger(val) ? String(val) : val.toFixed(1)
}

function getKpiColor(meta: Meta): string {
  const k = normalizarChave(meta.nome_coluna)
  if (k.includes('retenc') || k.includes('retenç')) return '#10b981'
  if (k.startsWith('abs')) return '#ef4444'
  if (k.includes('indisp')) return '#eab308'
  return '#6366f1'
}

const MELHOR_COLORS: Record<number, string> = {
  1: 'var(--gold)',
  2: '#9ca3af',
  3: '#92400e',
}

// ── SVG Line Chart ─────────────────────────────────────────────────────────────

const W = 600, H = 200
const PL = 44, PR = 72, PT = 16, PB = 36
const PW = W - PL - PR, PH = H - PT - PB

function xPos(i: number, n: number) {
  return n <= 1 ? PL + PW / 2 : PL + (i / (n - 1)) * PW
}
function yPct(val: number) {
  return PT + (1 - Math.min(Math.max(val, 0), 100) / 100) * PH
}

function LineChart({ snapshots, metas }: { snapshots: SnapNorm[]; metas: Meta[] }) {
  const [tip, setTip] = useState<{ x: number; y: number; label: string } | null>(null)
  const metasPct = metas.filter(isPct)
  const n = snapshots.length
  if (n === 0 || metasPct.length === 0) return null

  const metaLineY = yPct(60)

  return (
    <div>
      <svg viewBox={`0 0 ${W} ${H}`} style={{ width: '100%', height: 'auto', display: 'block', overflow: 'visible' }}>
        {/* Grid */}
        {[0, 25, 50, 75, 100].map((pct) => {
          const y = yPct(pct)
          return (
            <g key={pct}>
              <line x1={PL} y1={y} x2={W - PR} y2={y} stroke="rgba(255,255,255,0.05)" strokeWidth={1} />
              <text x={PL - 5} y={y + 4} textAnchor="end"
                style={{ fontSize: '9px', fill: 'rgba(255,255,255,0.3)', fontFamily: 'monospace' }}>
                {pct}%
              </text>
            </g>
          )
        })}

        {/* Linha de meta 60% */}
        <line x1={PL} y1={metaLineY} x2={W - PR} y2={metaLineY}
          stroke="var(--gold)" strokeWidth={1.5} strokeDasharray="6,4" opacity={0.65} />
        <text x={W - PR + 6} y={metaLineY + 4}
          style={{ fontSize: '9px', fill: 'var(--gold)', fontWeight: 600 }}>
          Meta 60%
        </text>

        {/* Linhas por KPI */}
        {metasPct.map((meta) => {
          const color = getKpiColor(meta)
          const pts = snapshots
            .map((s, i) => {
              const val = s.dados[meta.nome_coluna]
              if (val === undefined) return null
              return { x: xPos(i, n), y: yPct(val), val }
            })
            .filter(Boolean) as { x: number; y: number; val: number }[]

          if (pts.length === 0) return null
          const lineStr = pts.map((p) => `${p.x},${p.y}`).join(' ')
          const area =
            pts.length >= 2
              ? `M${pts[0].x},${PT + PH} ${pts.map((p) => `L${p.x},${p.y}`).join(' ')} L${pts[pts.length - 1].x},${PT + PH} Z`
              : null

          return (
            <g key={meta.nome_coluna}>
              {area && <path d={area} fill={color} opacity={0.07} />}
              {pts.length >= 2 && (
                <polyline points={lineStr} fill="none" stroke={color} strokeWidth={2}
                  strokeLinecap="round" strokeLinejoin="round" />
              )}
              {pts.map((p, idx) => {
                const isLast = idx === pts.length - 1
                return (
                  <g key={idx}>
                    {/* Anel estático no último ponto */}
                    {isLast && (
                      <circle cx={p.x} cy={p.y} r={9} fill="none"
                        stroke={color} strokeWidth={1.5} opacity={0.35} />
                    )}
                    <circle
                      cx={p.x} cy={p.y} r={isLast ? 5 : 3.5}
                      fill={color} stroke="rgba(10,10,10,0.9)" strokeWidth={1.5}
                      style={{ cursor: 'pointer' }}
                      onMouseEnter={() =>
                        setTip({ x: p.x, y: p.y, label: `${meta.label}: ${p.val.toFixed(1)}%` })
                      }
                      onMouseLeave={() => setTip(null)}
                    />
                  </g>
                )
              })}
            </g>
          )
        })}

        {/* Labels eixo X */}
        {snapshots.map((s, i) => (
          <text key={s.data_ref} x={xPos(i, n)} y={H - 6} textAnchor="middle"
            style={{ fontSize: '9px', fill: 'rgba(255,255,255,0.35)' }}>
            {fmtData(s.data_ref)}
          </text>
        ))}

        {/* Tooltip */}
        {tip && (() => {
          const tx = Math.min(Math.max(tip.x, 70), W - PR - 10)
          const ty = Math.max(tip.y - 28, PT + 6)
          const tw = tip.label.length * 6 + 16
          return (
            <g>
              <rect x={tx - tw / 2} y={ty - 14} width={tw} height={18} rx={4}
                fill="rgba(15,15,15,0.95)" stroke="rgba(255,255,255,0.12)" strokeWidth={0.5} />
              <text x={tx} y={ty - 1} textAnchor="middle"
                style={{ fontSize: '10px', fill: 'var(--text-primary)', fontWeight: 600 }}>
                {tip.label}
              </text>
            </g>
          )
        })()}
      </svg>

      {/* Legenda */}
      <div className="flex items-center gap-5 mt-3 flex-wrap justify-center">
        {metasPct.map((meta) => (
          <div key={meta.nome_coluna} className="flex items-center gap-1.5">
            <div style={{ width: '14px', height: '2px', borderRadius: '2px', background: getKpiColor(meta) }} />
            <span style={{ fontSize: '11px', color: 'var(--text-muted)' }}>{meta.label}</span>
          </div>
        ))}
        <div className="flex items-center gap-1.5">
          <div style={{ width: '14px', height: '0', borderTop: '2px dashed var(--gold)', opacity: 0.65 }} />
          <span style={{ fontSize: '11px', color: 'var(--text-muted)' }}>Meta 60%</span>
        </div>
      </div>
    </div>
  )
}

// ── Grid de KPIs não-percentuais ───────────────────────────────────────────────

function MetricGrid({ snapshots, metas }: { snapshots: SnapNorm[]; metas: Meta[] }) {
  const metasNaoPct = metas.filter((m) => !isPct(m))
  if (!metasNaoPct.length || !snapshots.length) return null

  return (
    <div style={{ overflowX: 'auto' }}>
      <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: '12px' }}>
        <thead>
          <tr>
            <th style={{ textAlign: 'left', padding: '6px 10px', color: 'var(--text-muted)', fontWeight: 600, fontSize: '10px', textTransform: 'uppercase', letterSpacing: '0.06em' }}>
              KPI
            </th>
            {snapshots.map((s) => (
              <th key={s.data_ref} style={{ textAlign: 'center', padding: '6px 10px', color: 'var(--text-muted)', fontWeight: 400, fontSize: '11px' }}>
                {fmtData(s.data_ref)}
              </th>
            ))}
          </tr>
        </thead>
        <tbody>
          {metasNaoPct.map((meta) => (
            <tr key={meta.nome_coluna} style={{ borderTop: '1px solid rgba(255,255,255,0.04)' }}>
              <td style={{ padding: '8px 10px', color: 'var(--text-secondary)', fontWeight: 500, fontSize: '12px' }}>
                {meta.label}
              </td>
              {snapshots.map((s, i) => {
                const val = s.dados[meta.nome_coluna]
                const prev = i > 0 ? snapshots[i - 1].dados[meta.nome_coluna] : undefined
                let color = 'var(--text-primary)'
                if (val !== undefined && prev !== undefined && val !== prev) {
                  color = meta.tipo === 'maior_melhor'
                    ? (val > prev ? 'var(--verde)' : 'var(--vermelho)')
                    : (val < prev ? 'var(--verde)' : 'var(--vermelho)')
                }
                return (
                  <td key={s.data_ref}
                    style={{ textAlign: 'center', padding: '8px 10px', color, fontWeight: 600, fontVariantNumeric: 'tabular-nums' }}>
                    {val !== undefined ? fmtVal(val, meta) : '—'}
                  </td>
                )
              })}
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  )
}

// ── Timeline card ──────────────────────────────────────────────────────────────

function TimelineCard({ snap, prev, metas }: { snap: SnapNorm; prev: SnapNorm | null; metas: Meta[] }) {
  let totalPts = 0
  if (prev) {
    for (const meta of metas) {
      const v1 = prev.dados[meta.nome_coluna], v2 = snap.dados[meta.nome_coluna]
      if (v1 !== undefined && v2 !== undefined) totalPts += calcKpiPts(meta.nome_coluna, v1, v2)
    }
  }

  const borderLeft = !prev
    ? 'rgba(255,255,255,0.12)'
    : totalPts > 0
    ? 'var(--verde)'
    : totalPts < 0
    ? 'var(--vermelho)'
    : 'rgba(255,255,255,0.12)'

  const ptsBg = totalPts > 0
    ? 'rgba(16,185,129,0.12)'
    : totalPts < 0
    ? 'rgba(239,68,68,0.12)'
    : 'rgba(255,255,255,0.06)'
  const ptsColor = totalPts > 0
    ? 'var(--verde)'
    : totalPts < 0
    ? 'var(--vermelho)'
    : 'var(--text-muted)'

  return (
    <div style={{
      background: 'var(--bg-elevated)',
      border: '1px solid var(--border)',
      borderLeft: `3px solid ${borderLeft}`,
      borderRadius: '12px',
      padding: '14px 16px',
    }}>
      <div className="flex items-center justify-between mb-3">
        <span style={{ fontSize: '13px', fontWeight: 700, color: 'var(--text-primary)' }}>
          {fmtData(snap.data_ref)}
        </span>
        {prev && (
          <span className="px-2.5 py-0.5 rounded-full text-xs font-bold"
            style={{ background: ptsBg, color: ptsColor }}>
            {totalPts > 0 ? '+' : ''}{totalPts} pts
          </span>
        )}
      </div>

      <div className="grid grid-cols-2 gap-x-8 gap-y-1.5">
        {metas.map((meta) => {
          const val  = snap.dados[meta.nome_coluna]
          const prev0 = prev?.dados[meta.nome_coluna]
          if (val === undefined) return null

          const hasDelta = prev0 !== undefined && prev0 !== val
          const improved = hasDelta && (meta.tipo === 'maior_melhor' ? val > prev0! : val < prev0!)
          const deltaColor = !hasDelta ? 'var(--text-muted)' : improved ? 'var(--verde)' : 'var(--vermelho)'

          let deltaStr = ''
          if (hasDelta) {
            const d = val - prev0!
            if (isTma(meta)) deltaStr = `${d >= 0 ? '+' : ''}${Math.round(d)}s`
            else {
              const uni = meta.unidade.trim().toLowerCase()
              deltaStr = uni === '%' || uni === 'porcentagem'
                ? `${d >= 0 ? '+' : ''}${d.toFixed(1)}pp`
                : `${d >= 0 ? '+' : ''}${Math.round(d * 10) / 10}`
            }
          }

          return (
            <div key={meta.nome_coluna} className="flex items-center justify-between gap-2">
              <span style={{ fontSize: '11px', color: 'var(--text-muted)' }}>{meta.label}</span>
              <span className="flex items-center gap-1.5">
                <span style={{ fontSize: '12px', fontWeight: 600, color: 'var(--text-primary)', fontVariantNumeric: 'tabular-nums' }}>
                  {fmtVal(val, meta)}
                </span>
                {hasDelta && (
                  <span style={{ fontSize: '10px', color: deltaColor, fontVariantNumeric: 'tabular-nums' }}>
                    {deltaStr}
                  </span>
                )}
              </span>
            </div>
          )
        })}
      </div>
    </div>
  )
}

// ── Componente principal ───────────────────────────────────────────────────────

export default function OperadorDashClient({
  operador, nomeFantasia, snapshots, metas, posicao, score, mesReferencia,
}: Props) {
  const router = useRouter()

  const nome = nomeFantasia ?? operador.nome.split(' ').slice(0, 2).join(' ')

  const badgeColor = posicao
    ? posicao.tipo === 'pior'
      ? 'var(--vermelho)'
      : MELHOR_COLORS[posicao.lugar] ?? 'var(--gold)'
    : null

  const headerGrad = posicao
    ? posicao.tipo === 'pior'
      ? 'linear-gradient(135deg, rgba(239,68,68,0.08) 0%, transparent 60%)'
      : posicao.lugar === 1
      ? 'linear-gradient(135deg, rgba(201,168,76,0.08) 0%, transparent 60%)'
      : posicao.lugar === 2
      ? 'linear-gradient(135deg, rgba(156,163,175,0.08) 0%, transparent 60%)'
      : 'linear-gradient(135deg, rgba(146,64,14,0.08) 0%, transparent 60%)'
    : undefined

  const ptsColor = score > 0 ? 'var(--verde)' : score < 0 ? 'var(--vermelho)' : 'var(--text-muted)'
  const ptsBg    = score > 0 ? 'rgba(16,185,129,0.08)' : score < 0 ? 'rgba(239,68,68,0.08)' : 'rgba(255,255,255,0.04)'

  return (
    <div className="space-y-6 max-w-3xl">

      {/* ── Header ── */}
      <div
        className="card"
        style={{
          padding: '20px 24px',
          background: headerGrad ?? 'var(--bg-card)',
          border: badgeColor ? `1px solid ${badgeColor}40` : undefined,
        }}
      >
        <button
          type="button"
          onClick={() => router.back()}
          className="btn-secondary flex items-center gap-1.5 text-xs mb-4"
        >
          <ArrowLeft size={12} />
          Voltar
        </button>

        <div className="flex items-center gap-4 flex-wrap">
          {/* Avatar */}
          <div
            className="w-14 h-14 rounded-2xl flex items-center justify-center text-sm font-bold shrink-0 border-2"
            style={getAvatarStyle(operador.id)}
          >
            {getIniciaisNome(operador.nome)}
          </div>

          {/* Nome + username */}
          <div className="flex-1 min-w-0">
            <p style={{ fontFamily: 'var(--ff-display)', fontSize: '22px', color: 'var(--text-primary)', fontWeight: 700, lineHeight: 1.2 }}>
              {nome}
            </p>
            <p style={{ fontSize: '12px', color: 'var(--text-muted)', marginTop: '3px' }}>
              {operador.username}
            </p>
          </div>

          {/* Badge posição */}
          {posicao && (
            <div
              className="shrink-0 px-3 py-2 rounded-xl text-center"
              style={{ border: `1px solid ${badgeColor}50`, background: `${badgeColor}15` }}
            >
              <p style={{ fontSize: '20px', lineHeight: 1, fontWeight: 800, color: badgeColor ?? undefined }}>
                {posicao.tipo === 'melhor'
                  ? (['🥇', '🥈', '🥉'][posicao.lugar - 1] ?? `#${posicao.lugar}`)
                  : '⚠️'}
              </p>
              <p style={{ fontSize: '9px', color: 'var(--text-muted)', marginTop: '3px', textTransform: 'uppercase', letterSpacing: '0.06em' }}>
                {posicao.tipo === 'melhor' ? `${posicao.lugar}º lugar` : 'Atenção'}
              </p>
            </div>
          )}

          {/* Score */}
          {snapshots.length >= 2 && (
            <div
              className="shrink-0 px-3 py-2 rounded-xl text-center"
              style={{ border: '1px solid rgba(255,255,255,0.08)', background: ptsBg }}
            >
              <p style={{ fontSize: '22px', lineHeight: 1, fontWeight: 800, color: ptsColor, fontVariantNumeric: 'tabular-nums' }}>
                {score > 0 ? '+' : ''}{score}
              </p>
              <p style={{ fontSize: '9px', color: 'var(--text-muted)', marginTop: '3px', textTransform: 'uppercase', letterSpacing: '0.06em' }}>
                pts
              </p>
            </div>
          )}
        </div>
      </div>

      {/* ── Gráfico % ── */}
      {snapshots.length >= 1 && metas.some(isPct) && (
        <div className="card" style={{ padding: '20px 20px 16px' }}>
          <p className="label-uppercase mb-4" style={{ color: 'var(--gold)' }}>Evolução — KPIs percentuais</p>
          <LineChart snapshots={snapshots} metas={metas} />
        </div>
      )}

      {/* ── Outros KPIs ── */}
      {snapshots.length >= 1 && metas.some((m) => !isPct(m)) && (
        <div className="card" style={{ padding: '20px 20px 12px' }}>
          <p className="label-uppercase mb-3" style={{ color: 'var(--gold)' }}>Evolução — Outros KPIs</p>
          <MetricGrid snapshots={snapshots} metas={metas} />
        </div>
      )}

      {/* ── Histórico ── */}
      {snapshots.length >= 1 && (
        <div>
          <p className="label-uppercase mb-3" style={{ color: 'var(--text-muted)' }}>Histórico detalhado</p>
          <div className="space-y-3">
            {[...snapshots].reverse().map((snap, i) => {
              const revIdx = snapshots.length - 1 - i
              const prev = revIdx > 0 ? snapshots[revIdx - 1] : null
              return (
                <TimelineCard key={snap.data_ref} snap={snap} prev={prev} metas={metas} />
              )
            })}
          </div>
        </div>
      )}

      {snapshots.length === 0 && (
        <div className="card flex flex-col items-center justify-center text-center" style={{ padding: '4rem 2rem' }}>
          <p className="text-sm" style={{ color: 'var(--text-muted)' }}>
            Nenhum snapshot disponível para este operador.
          </p>
        </div>
      )}
    </div>
  )
}
