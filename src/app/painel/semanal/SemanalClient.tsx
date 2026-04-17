'use client'

import { useState, useTransition } from 'react'
import { useRouter } from 'next/navigation'
import { ChevronDown, Info, Trophy, AlertTriangle, Eye, EyeOff, XCircle, Save, RotateCcw } from 'lucide-react'
import { salvarSnapshotHojeAction, salvarSnapshotSemanaAnteriorAction } from './actions'
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
  score: number
}

export interface SemanalClientProps {
  todasDatas: string[]
  dataDe: string | null
  dataPara: string | null
  rows: OperadorRow[]
  metas: Meta[]
  mesReferencia: string
  melhores: number[]
  piores: number[]
  existeSnapshotHoje: boolean
}

// ── Sistema de pontos ─────────────────────────────────────────────────────────

function calcKpiPts(nomeColuna: string, v1: number, v2: number): number {
  const key = normalizarChave(nomeColuna)
  if (key.includes('retenc') || key.includes('retenç')) {
    const d = v2 - v1
    if (d >= 2) return 3; if (d > 0) return 1
    if (d < 0 && d > -2) return -1; if (d <= -2) return -3; return 0
  }
  if (key === 'pedidos') {
    const d = v2 - v1
    if (d >= 5) return 3; if (d >= 1) return 1
    if (d <= -1 && d >= -4) return -1; if (d <= -5) return -3; return 0
  }
  if (key === 'churn') {
    const r = v1 - v2
    if (r >= 3) return 3; if (r >= 1) return 1
    if (r <= -1 && r >= -2) return -1; if (r <= -3) return -3; return 0
  }
  if (key.startsWith('abs')) {
    const r = v1 - v2
    if (r >= 0.5) return 3; if (r > 0) return 1
    if (r < 0 && r > -0.5) return -1; if (r <= -0.5) return -3; return 0
  }
  if (key.includes('indisp')) {
    const r = v1 - v2
    if (r >= 1) return 3; if (r > 0) return 1
    if (r < 0 && r > -1) return -1; if (r <= -1) return -3; return 0
  }
  if (key === 'tma') {
    const r = v1 - v2
    if (r >= 30) return 3; if (r >= 1) return 1
    if (r <= -1 && r >= -29) return -1; if (r <= -30) return -3; return 0
  }
  return 0
}

// ── Ícones por KPI ─────────────────────────────────────────────────────────────

function getKpiIcon(meta: Meta): string {
  const key = normalizarChave(meta.nome_coluna)
  if (key.includes('retenc') || key.includes('retenç')) return '🎯'
  if (key === 'pedidos') return '📦'
  if (key === 'churn') return '🔄'
  if (key.startsWith('abs')) return '⏱'
  if (key.includes('indisp')) return '📵'
  if (key === 'tma') return '⏰'
  return '📊'
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
  if (isTma(meta)) return `${d >= 0 ? '+' : ''}${Math.round(d)}s`
  const uni = meta.unidade.trim().toLowerCase()
  if (uni === '%' || uni === 'porcentagem') return `${d >= 0 ? '+' : ''}${d.toFixed(1)}pp`
  const r = Math.round(d * 10) / 10
  return `${r >= 0 ? '+' : ''}${r}`
}

function isImproved(v1: number, v2: number, meta: Meta): boolean {
  return meta.tipo === 'maior_melhor' ? v2 > v1 : v2 < v1
}

const MESES = ['jan','fev','mar','abr','mai','jun','jul','ago','set','out','nov','dez']
function fmtMes(mes: string): string {
  const [y, m] = mes.split('-')
  return `${MESES[parseInt(m, 10) - 1] ?? m} ${y}`
}
function fmtData(d: string): string {
  const m = d.match(/^(\d{4})-(\d{2})-(\d{2})$/)
  return m ? `${m[3]}/${m[2]}` : d
}

// ── Pódio — config por posição ────────────────────────────────────────────────

const PODIUM_MARGIN_TOP: Record<number, string> = { 1: '0',      2: '2rem',  3: '3.5rem' }
const PODIUM_BORDER:     Record<number, string> = { 1: 'var(--gold)', 2: '#9ca3af', 3: '#92400e' }
const PODIUM_SHADOW:     Record<number, string> = {
  1: '0 0 0 2px var(--gold), 0 8px 32px rgba(201,168,76,0.20)',
  2: '0 0 0 2px #9ca3af',
  3: '0 0 0 2px #92400e',
}

// ── Barra comparativa ──────────────────────────────────────────────────────────

function KpiBar({ v1, v2, meta }: { v1: number; v2: number; meta: Meta }) {
  const max = Math.max(v1, v2) || 1
  const pct1 = Math.min((v1 / max) * 100, 100)
  const pct2 = Math.min((v2 / max) * 100, 100)
  const ok   = isImproved(v1, v2, meta)
  const unchanged = v1 === v2

  const snapColor = unchanged
    ? 'rgba(255,255,255,0.25)'
    : ok
      ? 'linear-gradient(90deg, rgba(16,185,129,0.55), rgba(16,185,129,0.9))'
      : 'linear-gradient(90deg, rgba(239,68,68,0.55), rgba(239,68,68,0.9))'

  return (
    <div
      className="relative rounded-full mt-2"
      style={{ height: '6px', background: 'rgba(255,255,255,0.06)' }}
    >
      {/* Snap1 ghost */}
      <div
        className="absolute inset-y-0 left-0 rounded-full"
        style={{ width: `${pct1}%`, background: 'rgba(255,255,255,0.16)' }}
      />
      {/* Snap2 bar com gradiente */}
      <div
        className="absolute inset-y-0 left-0 rounded-full"
        style={{ width: `${pct2}%`, background: snapColor }}
      />
      {/* Tick marcando snap1 */}
      {!unchanged && (
        <div
          className="absolute inset-y-0 w-0.5 rounded-full"
          style={{ left: `${pct1}%`, background: 'rgba(255,255,255,0.55)', zIndex: 2 }}
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
  const icon = getKpiIcon(meta)

  // Sem dados
  if (v1 === undefined && v2 === undefined) {
    return (
      <div className="py-2 flex items-center gap-2">
        <span className="text-sm leading-none">{icon}</span>
        <span className="text-xs flex-1" style={{ color: 'var(--text-muted)' }}>
          {meta.label}
          {destaque && (
            <span className="ml-1.5 text-[9px] font-bold px-1.5 py-0.5 rounded-full"
              style={{ background: 'rgba(201,168,76,0.12)', color: 'var(--gold-light)' }}>
              Principal
            </span>
          )}
        </span>
        <span className="text-xs" style={{ color: 'var(--text-muted)' }}>—</span>
      </div>
    )
  }

  // Só snap2
  if (v1 === undefined) {
    return (
      <div className="py-2 flex items-center gap-2">
        <span className="text-sm leading-none">{icon}</span>
        <span className="text-xs flex-1" style={{ color: 'var(--text-secondary)' }}>{meta.label}</span>
        <span
          className="font-bold tabular-nums"
          style={{ color: 'var(--text-primary)', fontSize: destaque ? '15px' : '13px' }}
        >
          {fmtVal(v2!, meta)}
        </span>
      </div>
    )
  }

  const val1 = v1!
  const val2 = v2 ?? val1
  const pts  = calcKpiPts(meta.nome_coluna, val1, val2)
  const ok   = isImproved(val1, val2, meta)
  const unchanged = val1 === val2
  const arrow = unchanged ? '→' : ok ? '↑' : '↓'
  const arrowColor = unchanged ? 'var(--text-muted)' : ok ? 'var(--verde)' : 'var(--vermelho)'
  const valColor = unchanged ? 'var(--text-secondary)' : ok ? 'var(--verde)' : 'var(--vermelho)'

  return (
    <div className={destaque ? 'py-3' : 'py-2'}>
      {/* Linha superior: ícone + label + badge pts */}
      <div className="flex items-center gap-2 mb-1.5">
        <span className={destaque ? 'text-base leading-none' : 'text-sm leading-none'}>{icon}</span>
        <span
          className="flex-1 font-semibold"
          style={{
            color: 'var(--text-secondary)',
            fontSize: destaque ? '12px' : '11px',
          }}
        >
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
            className="font-bold tabular-nums rounded-full shrink-0 px-2 py-0.5"
            style={{
              fontSize: '11px',
              background: pts > 0 ? 'rgba(16,185,129,0.15)' : 'rgba(239,68,68,0.15)',
              color: pts > 0 ? 'var(--verde)' : 'var(--vermelho)',
              border: `1px solid ${pts > 0 ? 'rgba(16,185,129,0.3)' : 'rgba(239,68,68,0.3)'}`,
            }}
          >
            {pts > 0 ? '+' : ''}{pts}
          </span>
        )}
      </div>

      {/* Linha de valores: v1 → v2 + delta */}
      <div className="flex items-center gap-2">
        {/* Valor anterior */}
        <span
          className="tabular-nums shrink-0"
          style={{ color: 'var(--text-muted)', fontSize: destaque ? '14px' : '12px' }}
        >
          {fmtVal(val1, meta)}
        </span>

        {/* Seta direcional */}
        <span
          className={unchanged ? '' : 'animate-pulse'}
          style={{
            color: arrowColor,
            fontSize: destaque ? '16px' : '14px',
            fontWeight: 700,
            lineHeight: 1,
            flexShrink: 0,
          }}
        >
          {arrow}
        </span>

        {/* Valor atual */}
        <span
          className="font-bold tabular-nums shrink-0"
          style={{ color: valColor, fontSize: destaque ? '17px' : '14px' }}
        >
          {fmtVal(val2, meta)}
        </span>

        {/* Delta */}
        {!unchanged && (
          <span
            className="tabular-nums font-semibold ml-auto shrink-0"
            style={{ color: arrowColor, fontSize: destaque ? '11px' : '10px' }}
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

function OperadorCard({
  row, metas, pos, tipo, mostrarNomes,
}: {
  row: OperadorRow
  metas: Meta[]
  pos: number
  tipo: 'melhor' | 'pior'
  mostrarNomes: boolean
}) {
  const isMelhor = tipo === 'melhor'
  const posEmoji = isMelhor ? (['🥇','🥈','🥉'][pos - 1] ?? `#${pos}`) : null
  const pts = row.score

  let ptsColor: string
  let ptsBg: string
  let ptsBorder: string
  if (!isMelhor) {
    ptsColor  = 'var(--amarelo)'
    ptsBg     = 'rgba(234,179,8,0.15)'
    ptsBorder = 'rgba(234,179,8,0.3)'
  } else if (pts > 0) {
    ptsColor  = 'var(--verde)'
    ptsBg     = 'rgba(16,185,129,0.08)'
    ptsBorder = 'rgba(16,185,129,0.18)'
  } else {
    ptsColor  = 'var(--amarelo)'
    ptsBg     = 'rgba(234,179,8,0.10)'
    ptsBorder = 'rgba(234,179,8,0.25)'
  }

  const txRetMeta   = metas.find((m) => isTxRet(m))
  const outrasMetas = metas.filter((m) => !isTxRet(m))

  const nome = mostrarNomes
    ? row.nomeReal.split(' ').slice(0, 2).join(' ')
    : (row.nomeFantasia ?? row.nomeReal.split(' ')[0])

  const borderColor = isMelhor ? PODIUM_BORDER[pos] ?? 'var(--border)' : 'var(--vermelho)'
  const shadow      = isMelhor ? PODIUM_SHADOW[pos]  ?? 'none'          : 'none'
  const cardBg      = !isMelhor
    ? 'linear-gradient(135deg, rgba(239,68,68,0.08) 0%, transparent 60%)'
    : undefined

  return (
    <div
      className="card flex flex-col"
      style={{
        padding: 0,
        overflow: 'hidden',
        border: `2px solid ${borderColor}`,
        boxShadow: shadow,
        ...(cardBg ? { background: cardBg } : {}),
      }}
    >
      {/* Header */}
      <div
        className="flex items-center gap-3 px-4 pt-4 pb-3"
        style={{ borderBottom: '1px solid var(--border)' }}
      >
        {isMelhor
          ? <span className="text-2xl leading-none shrink-0">{posEmoji}</span>
          : <XCircle size={24} style={{ color: 'var(--vermelho)', flexShrink: 0 }} />
        }
        <div
          className="w-10 h-10 rounded-xl flex items-center justify-center text-[11px] font-bold shrink-0 border-2"
          style={getAvatarStyle(row.opId)}
        >
          {getIniciaisNome(row.nomeReal)}
        </div>
        <div className="flex-1 min-w-0">
          <p
            className="font-bold truncate"
            style={{
              fontFamily: 'var(--ff-display)',
              fontSize: '17px',
              color: 'var(--text-primary)',
              lineHeight: 1.2,
            }}
          >
            {nome}
          </p>
        </div>
        {/* Pontuação */}
        <div
          className="shrink-0 text-center px-3 py-2 rounded-xl"
          style={{ background: ptsBg, border: `1px solid ${ptsBorder}` }}
        >
          <p
            className="font-bold tabular-nums leading-none"
            style={{ color: ptsColor, fontFamily: 'var(--ff-body)', fontSize: '22px' }}
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
        {txRetMeta && (
          <>
            <KpiRow
              meta={txRetMeta}
              v1={row.snap1?.[txRetMeta.nome_coluna]}
              v2={row.snap2?.[txRetMeta.nome_coluna]}
              destaque
            />
            {outrasMetas.length > 0 && (
              <div className="divider" style={{ margin: '0.25rem 0' }} />
            )}
          </>
        )}
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

// ── Pódio dos melhores ────────────────────────────────────────────────────────

function PodiumMelhores({
  rows, metas, mostrarNomes,
}: {
  rows: OperadorRow[]
  metas: Meta[]
  mostrarNomes: boolean
}) {
  // Reordena para exibição: [2º, 1º, 3º]
  const ordered =
    rows.length === 3
      ? [
          { row: rows[1], pos: 2 },
          { row: rows[0], pos: 1 },
          { row: rows[2], pos: 3 },
        ]
      : rows.map((row, i) => ({ row, pos: i + 1 }))

  return (
    <>
      {/* Mobile: ordem normal, empilhados */}
      <div className="flex flex-col gap-4 md:hidden">
        {rows.map((row, i) => (
          <OperadorCard key={row.opId} row={row} metas={metas} pos={i + 1} tipo="melhor" mostrarNomes={mostrarNomes} />
        ))}
      </div>

      {/* Desktop: pódio com reordenação e margens */}
      <div className="hidden md:flex items-start gap-4">
        {ordered.map(({ row, pos }) => (
          <div key={row.opId} style={{ flex: 1, marginTop: PODIUM_MARGIN_TOP[pos] ?? '0' }}>
            <OperadorCard row={row} metas={metas} pos={pos} tipo="melhor" mostrarNomes={mostrarNomes} />
          </div>
        ))}
      </div>
    </>
  )
}

// ── Componente principal ───────────────────────────────────────────────────────

export default function SemanalClient({
  todasDatas, dataDe, dataPara, rows, metas, mesReferencia, melhores, piores, existeSnapshotHoje,
}: SemanalClientProps) {
  const router = useRouter()
  const [infoAberta,   setInfoAberta]   = useState(false)
  const [mostrarNomes, setMostrarNomes] = useState(false)
  const [toast,        setToast]        = useState<{ tipo: 'ok' | 'erro'; msg: string } | null>(null)
  const [isPending,    startTransition] = useTransition()

  function mostrarToast(tipo: 'ok' | 'erro', msg: string) {
    setToast({ tipo, msg })
    setTimeout(() => setToast(null), 4000)
  }

  function fmtDataISO(iso: string): string {
    const [y, m, d] = iso.split('-')
    return `${d}/${m}/${y}`
  }

  async function handleSalvarSnapshot() {
    if (existeSnapshotHoje) {
      const ok = window.confirm('Já existe snapshot de hoje.\nDeseja atualizar?')
      if (!ok) return
    }
    startTransition(async () => {
      const res = await salvarSnapshotHojeAction()
      if (res.ok) {
        mostrarToast('ok', `Snapshot salvo — ${fmtDataISO(res.data)}`)
        router.refresh()
      } else {
        mostrarToast('erro', res.erro)
      }
    })
  }

  async function handleSalvarSemanaAnterior() {
    startTransition(async () => {
      const res = await salvarSnapshotSemanaAnteriorAction()
      if (res.ok === false) {
        mostrarToast('erro', res.erro)
        return
      }
      if (res.ok === 'confirmar') {
        const confirmado = window.confirm(
          `Já existe snapshot de ${fmtDataISO(res.data)}.\nDeseja atualizar?`
        )
        if (!confirmado) return
        const res2 = await salvarSnapshotSemanaAnteriorAction(true)
        if (res2.ok === true) {
          mostrarToast('ok', `Snapshot salvo — ${fmtDataISO(res2.data)}`)
          router.refresh()
        } else if (res2.ok === false) {
          mostrarToast('erro', res2.erro)
        }
        return
      }
      mostrarToast('ok', `Snapshot salvo — ${fmtDataISO(res.data)}`)
      router.refresh()
    })
  }

  const rowsMelhores = melhores.map((id) => rows.find((r) => r.opId === id)).filter(Boolean) as OperadorRow[]
  const rowsPiores   = piores.map((id)   => rows.find((r) => r.opId === id)).filter(Boolean) as OperadorRow[]

  function handleDataDeChange(val: string) {
    const params = new URLSearchParams()
    if (val) params.set('de', val)
    if (dataPara) params.set('ate', dataPara)
    router.push(`/painel/semanal?${params.toString()}`)
  }

  function handleDataParaChange(val: string) {
    const params = new URLSearchParams()
    if (dataDe) params.set('de', dataDe)
    if (val) params.set('ate', val)
    router.push(`/painel/semanal?${params.toString()}`)
  }

  const selectStyle: React.CSSProperties = {
    padding: '3px 6px',
    fontSize: '12px',
    background: 'var(--bg-elevated)',
    border: '1px solid rgba(201,168,76,0.2)',
    borderRadius: '6px',
    color: 'var(--text-secondary)',
    cursor: 'pointer',
  }

  return (
    <div className="space-y-6">

      {/* ── Header ── */}
      <div className="flex items-start justify-between gap-4 flex-wrap">
        <div>
          <h1
            className="text-xl font-bold"
            style={{ color: 'var(--text-primary)', fontFamily: 'var(--ff-display)' }}
          >
            Acompanhamento Semanal
          </h1>
          <div className="mt-1.5 flex items-center gap-2 flex-wrap" style={{ color: 'var(--text-muted)', fontSize: '13px' }}>
            <span style={{ textTransform: 'capitalize' }}>{fmtMes(mesReferencia)}</span>
            {todasDatas.length > 0 && (
              <>
                <span style={{ color: 'var(--border)' }}>·</span>
                <span className="flex items-center gap-1.5 flex-wrap">
                  <span>De</span>
                  <select
                    value={dataDe ?? ''}
                    onChange={(e) => handleDataDeChange(e.target.value)}
                    style={selectStyle}
                  >
                    <option value="">—</option>
                    {todasDatas.map((d) => (
                      <option key={d} value={d}>{fmtData(d)}</option>
                    ))}
                  </select>
                  <span>→</span>
                  <select
                    value={dataPara ?? ''}
                    onChange={(e) => handleDataParaChange(e.target.value)}
                    style={selectStyle}
                  >
                    <option value="">—</option>
                    {todasDatas.map((d) => (
                      <option key={d} value={d}>{fmtData(d)}</option>
                    ))}
                  </select>
                </span>
              </>
            )}
          </div>
        </div>

        {/* Ações do header */}
        <div className="flex items-center gap-2 shrink-0 flex-wrap">
          {/* Salvar snapshot */}
          <button
            type="button"
            onClick={handleSalvarSnapshot}
            disabled={isPending}
            className="btn-secondary flex items-center gap-1.5 text-xs"
            style={isPending ? { opacity: 0.6, cursor: 'not-allowed' } : undefined}
          >
            <Save size={12} />
            {isPending ? 'Salvando…' : 'Salvar snapshot hoje'}
          </button>

          {/* Salvar semana anterior */}
          <button
            type="button"
            onClick={handleSalvarSemanaAnterior}
            disabled={isPending}
            className="btn-secondary flex items-center gap-1.5 text-xs"
            style={isPending ? { opacity: 0.6, cursor: 'not-allowed' } : undefined}
          >
            <RotateCcw size={12} />
            {isPending ? 'Salvando…' : 'Salvar semana anterior'}
          </button>

          {/* Toggle nomes */}
          <button
            type="button"
            onClick={() => setMostrarNomes((v) => !v)}
            className="btn-secondary flex items-center gap-1.5 text-xs"
          >
            {mostrarNomes ? <EyeOff size={12} /> : <Eye size={12} />}
            {mostrarNomes ? 'Ver nomes fantasia' : 'Ver nomes reais'}
          </button>
        </div>
      </div>

      {/* Toast */}
      {toast && (
        <div
          className="flex items-center gap-2 px-4 py-3 rounded-xl text-sm font-medium"
          style={{
            background: toast.tipo === 'ok'
              ? 'rgba(16,185,129,0.10)'
              : 'rgba(239,68,68,0.10)',
            border: `1px solid ${toast.tipo === 'ok' ? 'rgba(16,185,129,0.25)' : 'rgba(239,68,68,0.25)'}`,
            color: toast.tipo === 'ok' ? 'var(--verde)' : 'var(--vermelho)',
          }}
        >
          {toast.tipo === 'ok' ? <Save size={14} /> : <XCircle size={14} />}
          {toast.msg}
        </div>
      )}

      {/* ── Como funciona ── */}
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
                { label: '🎯 Tx. Retenção', desc: '≥+2pp → +3 | 0~2pp → +1 | -0~2pp → -1 | ≤-2pp → -3' },
                { label: '📦 Pedidos',      desc: '≥+5 → +3 | +1~4 → +1 | -1~4 → -1 | ≤-5 → -3' },
                { label: '🔄 Churn',        desc: 'reduziu ≥3 → +3 | 1~2 → +1 | aumentou 1~2 → -1 | ≥3 → -3' },
                { label: '⏱ ABS',           desc: 'reduziu ≥0.5pp → +3 | >0 → +1 | aumentou >0 → -1 | ≥0.5pp → -3' },
                { label: '📵 Indisp',        desc: 'reduziu ≥1pp → +3 | >0 → +1 | aumentou >0 → -1 | ≥1pp → -3' },
                { label: '⏰ TMA',           desc: 'reduziu ≥30s → +3 | 1~29s → +1 | aumentou 1~29s → -1 | ≥30s → -3' },
              ].map(({ label, desc }) => (
                <div key={label}>
                  <p className="text-[10px] font-bold mb-0.5" style={{ color: 'var(--text-secondary)' }}>{label}</p>
                  <p className="text-[10px] leading-relaxed" style={{ color: 'var(--text-muted)' }}>{desc}</p>
                </div>
              ))}
            </div>
            <p className="text-[10px] font-semibold pt-1" style={{ color: 'var(--text-muted)' }}>
              Pontuação máxima: <span style={{ color: 'var(--verde)' }}>+18 pts</span>
              {' · '}
              Mínima: <span style={{ color: 'var(--vermelho)' }}>-18 pts</span>
            </p>
          </div>
        </div>
      </div>

      {/* ── Sem dados ── */}
      {todasDatas.length === 0 && (
        <div className="card flex flex-col items-center justify-center text-center" style={{ padding: '4rem 2rem' }}>
          <Trophy size={32} style={{ color: 'var(--text-muted)', opacity: 0.3 }} />
          <p className="text-sm mt-3" style={{ color: 'var(--text-muted)' }}>
            Nenhum snapshot disponível ainda.
          </p>
          <p className="text-xs mt-1" style={{ color: 'var(--text-muted)', opacity: 0.6 }}>
            O primeiro registro será criado automaticamente na próxima segunda-feira.
          </p>
        </div>
      )}

      {/* ── Top 3 melhores — pódio ── */}
      {rowsMelhores.length > 0 && (
        <div>
          <div className="flex items-center gap-2 mb-4">
            <Trophy size={15} style={{ color: 'var(--gold)' }} />
            <span className="label-uppercase" style={{ color: 'var(--gold)' }}>Melhores da semana</span>
          </div>
          <PodiumMelhores rows={rowsMelhores} metas={metas} mostrarNomes={mostrarNomes} />
        </div>
      )}

      {/* ── Divisor ── */}
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

      {/* ── Top 3 piores ── */}
      {rowsPiores.length > 0 && (
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          {rowsPiores.map((row, i) => (
            <OperadorCard key={row.opId} row={row} metas={metas} pos={i + 1} tipo="pior" mostrarNomes={mostrarNomes} />
          ))}
        </div>
      )}
    </div>
  )
}
