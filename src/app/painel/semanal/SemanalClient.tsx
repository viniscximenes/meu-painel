'use client'

import { useState } from 'react'
import { ChevronDown, Eye, EyeOff, Printer, ArrowUp, ArrowDown, Minus, Trophy, TrendingDown, Info } from 'lucide-react'
import type { Meta, Status } from '@/lib/kpi-utils'
import { getAvatarStyle, getIniciaisNome } from '@/lib/operadores'

// ── Tipos ──────────────────────────────────────────────────────────────────────

export interface OperadorRow {
  opId: number
  nomeReal: string
  username: string
  nomeFantasia: string | null
  snap1: Record<string, number> | null   // dados snapshot mais antigo
  snap2: Record<string, number> | null   // dados snapshot mais recente
  score: number                          // para ranking
  statuses2: Record<string, Status>      // status do snap2 por nome_coluna
}

export interface SemanalClientProps {
  datas: string[]          // [data_mais_recente, data_mais_antiga] ou [data_unica]
  rows: OperadorRow[]
  metas: Meta[]            // basico = true, ordenadas
  mesReferencia: string    // 'YYYY-MM'
  melhores: number[]       // opIds top 3
  piores: number[]         // opIds bottom 3
}

// ── Formatação ─────────────────────────────────────────────────────────────────

function fmtVal(val: number | undefined, meta: Meta): string {
  if (val === undefined || val === null) return '—'
  const uni = meta.unidade.trim().toLowerCase()
  if (uni === '%' || uni === 'porcentagem') return `${val.toFixed(1)}%`
  if (['seg', 's', 'segundos', 'tempo'].includes(uni)) {
    const m = Math.floor(val / 60)
    const s = Math.round(val % 60)
    return `${String(m).padStart(2, '0')}:${String(s).padStart(2, '0')}`
  }
  if (['hh:mm', 'mm:ss'].includes(uni)) {
    const m = Math.floor(val / 60)
    const s = Math.round(val % 60)
    return `${String(m).padStart(2, '0')}:${String(s).padStart(2, '0')}`
  }
  return Number.isInteger(val) ? String(val) : val.toFixed(1)
}

function calcDelta(older: number | undefined, newer: number | undefined): number | null {
  if (older === undefined || newer === undefined || older === 0) return null
  return ((newer - older) / Math.abs(older)) * 100
}

function statusColor(s: Status): string {
  if (s === 'verde')    return 'var(--verde)'
  if (s === 'amarelo')  return 'var(--amarelo)'
  if (s === 'vermelho') return 'var(--vermelho)'
  return 'var(--text-muted)'
}

function deltaIsGood(delta: number, meta: Meta): boolean {
  return meta.tipo === 'maior_melhor' ? delta > 0 : delta < 0
}

function fmtData(d: string): string {
  // 'YYYY-MM-DD' → 'DD/MM'
  const m = d.match(/^(\d{4})-(\d{2})-(\d{2})$/)
  if (m) return `${m[3]}/${m[2]}`
  return d
}

const MESES = ['jan','fev','mar','abr','mai','jun','jul','ago','set','out','nov','dez']
function fmtMes(mes: string): string {
  const [y, m] = mes.split('-')
  const idx = parseInt(m, 10) - 1
  return `${MESES[idx] ?? m} ${y}`
}

// ── Componente principal ───────────────────────────────────────────────────────

export default function SemanalClient({ datas, rows, metas, mesReferencia, melhores, piores }: SemanalClientProps) {
  const [infoAberta,    setInfoAberta]    = useState(false)
  const [mostrarNomes,  setMostrarNomes]  = useState(false)
  const [sortColuna,    setSortColuna]    = useState<string | null>(null)
  const [sortAsc,       setSortAsc]       = useState(false)

  const data2 = datas[0] ?? null  // mais recente
  const data1 = datas[1] ?? null  // mais antiga

  // ── Ordenação ──────────────────────────────────────────────────────────────

  function handleSort(nome_coluna: string) {
    if (sortColuna === nome_coluna) {
      setSortAsc((v) => !v)
    } else {
      setSortColuna(nome_coluna)
      const meta = metas.find((m) => m.nome_coluna === nome_coluna)
      // maior_melhor → decrescente por padrão; menor_melhor → crescente
      setSortAsc(meta?.tipo === 'menor_melhor')
    }
  }

  const rowsOrdenadas = [...rows].sort((a, b) => {
    if (!sortColuna) return b.score - a.score  // padrão: por score
    const va = a.snap2?.[sortColuna] ?? a.snap1?.[sortColuna] ?? (sortAsc ? Infinity : -Infinity)
    const vb = b.snap2?.[sortColuna] ?? b.snap1?.[sortColuna] ?? (sortAsc ? Infinity : -Infinity)
    return sortAsc ? va - vb : vb - va
  })

  // ── Helpers de display ────────────────────────────────────────────────────

  function getNome(row: OperadorRow) {
    if (mostrarNomes) return row.nomeReal.split(' ').slice(0, 2).join(' ')
    return row.nomeFantasia ?? row.nomeReal.split(' ')[0]
  }

  function getSubtitulo(row: OperadorRow) {
    if (mostrarNomes) return `@${row.username}`
    return row.nomeFantasia ? row.nomeReal.split(' ')[0] : null
  }

  // ── Ranking ────────────────────────────────────────────────────────────────

  const rowsMelhores = melhores.map((id) => rows.find((r) => r.opId === id)).filter(Boolean) as OperadorRow[]
  const rowsPiores   = piores.map((id)   => rows.find((r) => r.opId === id)).filter(Boolean) as OperadorRow[]

  // ── Render ─────────────────────────────────────────────────────────────────

  return (
    <div className="space-y-5">

      {/* ── Header ── */}
      <div className="flex items-start justify-between gap-4 flex-wrap">
        <div>
          <h1 className="text-xl font-bold" style={{ color: 'var(--text-primary)', fontFamily: 'var(--ff-display)' }}>
            Acompanhamento Semanal
          </h1>
          <p className="text-sm mt-0.5 flex items-center gap-2" style={{ color: 'var(--text-muted)' }}>
            <span style={{ textTransform: 'capitalize' }}>{fmtMes(mesReferencia)}</span>
            {data1 && data2 && (
              <>
                <span style={{ color: 'var(--border)' }}>·</span>
                <span>Comparando <strong style={{ color: 'var(--text-secondary)' }}>{fmtData(data1)}</strong> → <strong style={{ color: 'var(--text-secondary)' }}>{fmtData(data2)}</strong></span>
              </>
            )}
          </p>
        </div>
        <button
          onClick={() => window.print()}
          className="btn-secondary flex items-center gap-1.5 text-xs no-print"
        >
          <Printer size={13} /> Imprimir
        </button>
      </div>

      {/* ── Como funciona ── */}
      <div
        className="card"
        style={{ padding: '0' }}
      >
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
              transition: 'transform 0.3s ease',
              transform: infoAberta ? 'rotate(0deg)' : 'rotate(-90deg)',
            }}
          />
        </button>
        <div
          style={{
            maxHeight: infoAberta ? '300px' : '0px',
            overflow: 'hidden',
            transition: 'max-height 0.35s cubic-bezier(0.4,0,0.2,1)',
          }}
        >
          <div
            className="px-4 pb-4 space-y-2"
            style={{ borderTop: '1px solid var(--border)' }}
          >
            <p className="text-xs pt-3 leading-relaxed" style={{ color: 'var(--text-secondary)' }}>
              <strong style={{ color: 'var(--gold-light)' }}>Snapshots semanais:</strong> toda segunda-feira o sistema registra
              automaticamente os KPIs de cada operador a partir da planilha ativa.
              Esta tela compara os dois registros mais recentes.
            </p>
            <p className="text-xs leading-relaxed" style={{ color: 'var(--text-secondary)' }}>
              <strong style={{ color: 'var(--gold-light)' }}>Nomes fantasia:</strong> cada operador recebe um nome anônimo
              renovado todo mês para que a comparação seja feita sem viés. O gestor pode
              alternar entre nomes fantasia e nomes reais clicando no botão de visibilidade.
            </p>
            <p className="text-xs leading-relaxed" style={{ color: 'var(--text-secondary)' }}>
              <strong style={{ color: 'var(--gold-light)' }}>Ranking:</strong> baseado no desempenho geral dos KPIs do snapshot
              mais recente. Verde = 2 pts, Amarelo = 1 pt, Vermelho = 0 pts.
            </p>
          </div>
        </div>
      </div>

      {/* ── Ranking ── */}
      {(rowsMelhores.length > 0 || rowsPiores.length > 0) && (
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4 no-print">
          {/* Melhores */}
          <div className="card" style={{ padding: '1rem' }}>
            <div className="flex items-center gap-2 mb-3">
              <Trophy size={14} style={{ color: 'var(--gold)' }} />
              <span className="label-uppercase" style={{ color: 'var(--gold)' }}>Top 3 Melhores</span>
            </div>
            <div className="space-y-2">
              {rowsMelhores.slice(0, 3).map((r, i) => (
                <RankingItem key={r.opId} row={r} pos={i + 1} tipo="melhor" getNome={getNome} />
              ))}
              {rowsMelhores.length === 0 && (
                <p className="text-xs" style={{ color: 'var(--text-muted)' }}>Sem dados suficientes.</p>
              )}
            </div>
          </div>

          {/* Piores */}
          <div className="card" style={{ padding: '1rem' }}>
            <div className="flex items-center gap-2 mb-3">
              <TrendingDown size={14} style={{ color: 'var(--vermelho)' }} />
              <span className="label-uppercase" style={{ color: 'var(--vermelho)' }}>Precisam de Atenção</span>
            </div>
            <div className="space-y-2">
              {rowsPiores.slice(0, 3).map((r, i) => (
                <RankingItem key={r.opId} row={r} pos={i + 1} tipo="pior" getNome={getNome} />
              ))}
              {rowsPiores.length === 0 && (
                <p className="text-xs" style={{ color: 'var(--text-muted)' }}>Sem dados suficientes.</p>
              )}
            </div>
          </div>
        </div>
      )}

      {/* ── Tabela ── */}
      <div className="card" style={{ padding: '1rem' }}>
        {/* Toolbar */}
        <div className="flex items-center justify-between gap-3 mb-4 flex-wrap no-print">
          <span className="label-uppercase">
            {rows.filter((r) => r.snap2 || r.snap1).length} operadores
          </span>
          <button
            type="button"
            onClick={() => setMostrarNomes((v) => !v)}
            className="btn-secondary flex items-center gap-1.5 text-xs"
          >
            {mostrarNomes ? <EyeOff size={12} /> : <Eye size={12} />}
            {mostrarNomes ? 'Ocultar nomes' : 'Ver nomes reais'}
          </button>
        </div>

        {metas.length === 0 ? (
          <p className="text-sm py-6 text-center" style={{ color: 'var(--text-muted)' }}>
            Nenhum KPI básico configurado. Configure metas em <strong>/painel/metas</strong>.
          </p>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-xs" style={{ borderCollapse: 'collapse', minWidth: '600px' }}>
              <thead>
                <tr style={{ borderBottom: '1px solid var(--border)' }}>
                  {/* Coluna operador */}
                  <th
                    className="text-left pb-2.5 pr-4"
                    style={{ color: 'var(--text-muted)', fontWeight: 600, letterSpacing: '0.07em', textTransform: 'uppercase', fontSize: '9px', minWidth: '140px' }}
                  >
                    Operador
                  </th>

                  {/* Colunas KPI */}
                  {metas.map((meta) => (
                    <th
                      key={meta.nome_coluna}
                      className="text-right pb-2.5 px-2 cursor-pointer select-none"
                      style={{
                        color: sortColuna === meta.nome_coluna ? 'var(--gold-light)' : 'var(--text-muted)',
                        fontWeight: 600,
                        letterSpacing: '0.07em',
                        textTransform: 'uppercase',
                        fontSize: '9px',
                        whiteSpace: 'nowrap',
                      }}
                      onClick={() => handleSort(meta.nome_coluna)}
                    >
                      <span className="flex items-center justify-end gap-1">
                        {meta.label}
                        {sortColuna === meta.nome_coluna
                          ? (sortAsc ? <ArrowUp size={9} /> : <ArrowDown size={9} />)
                          : <span style={{ width: 9 }} />
                        }
                      </span>
                    </th>
                  ))}
                </tr>
              </thead>

              <tbody>
                {rowsOrdenadas.map((row) => (
                  <tr
                    key={row.opId}
                    style={{ borderBottom: '1px solid var(--border)' }}
                    className="hover:bg-[rgba(255,255,255,0.015)] transition-colors"
                  >
                    {/* Operador */}
                    <td className="py-2.5 pr-4">
                      <div className="flex items-center gap-2">
                        <div
                          className="w-7 h-7 rounded-lg flex items-center justify-center text-[9px] font-bold shrink-0 border-2"
                          style={getAvatarStyle(row.opId)}
                        >
                          {getIniciaisNome(row.nomeReal)}
                        </div>
                        <div className="min-w-0">
                          <p className="font-semibold truncate" style={{ color: 'var(--text-primary)', maxWidth: '110px' }}>
                            {getNome(row)}
                          </p>
                          {getSubtitulo(row) && (
                            <p className="truncate" style={{ color: 'var(--text-muted)', fontSize: '9px' }}>
                              {getSubtitulo(row)}
                            </p>
                          )}
                        </div>
                      </div>
                    </td>

                    {/* KPIs */}
                    {metas.map((meta) => {
                      const v2 = row.snap2?.[meta.nome_coluna]
                      const v1 = row.snap1?.[meta.nome_coluna]
                      const delta = calcDelta(v1, v2)
                      const status = row.statuses2[meta.nome_coluna] ?? 'neutro'
                      const good = delta !== null ? deltaIsGood(delta, meta) : null

                      return (
                        <td key={meta.nome_coluna} className="py-2.5 px-2 text-right tabular-nums">
                          {v2 !== undefined || v1 !== undefined ? (
                            <div>
                              {/* Valor principal (snap2) */}
                              <span
                                className="font-bold"
                                style={{ color: v2 !== undefined ? statusColor(status) : 'var(--text-muted)' }}
                              >
                                {fmtVal(v2, meta)}
                              </span>

                              {/* Valor anterior (snap1) + Δ */}
                              {v1 !== undefined && (
                                <div className="flex items-center justify-end gap-1 mt-0.5">
                                  <span style={{ color: 'var(--text-muted)', fontSize: '9px' }}>
                                    {fmtVal(v1, meta)}
                                  </span>
                                  {delta !== null && (
                                    <span
                                      className="flex items-center gap-0.5"
                                      style={{
                                        fontSize: '9px',
                                        fontWeight: 700,
                                        color: good ? 'var(--verde)' : 'var(--vermelho)',
                                      }}
                                    >
                                      {delta > 0 ? <ArrowUp size={8} /> : delta < 0 ? <ArrowDown size={8} /> : <Minus size={8} />}
                                      {Math.abs(delta).toFixed(1)}%
                                    </span>
                                  )}
                                </div>
                              )}
                            </div>
                          ) : (
                            <span style={{ color: 'var(--text-muted)' }}>—</span>
                          )}
                        </td>
                      )
                    })}
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}

        {/* Legenda */}
        {datas.length >= 2 && (
          <div className="flex items-center gap-4 mt-4 pt-3 flex-wrap no-print" style={{ borderTop: '1px solid var(--border)' }}>
            <span className="text-[10px]" style={{ color: 'var(--text-muted)' }}>
              Valor maior = snapshot <strong style={{ color: 'var(--text-secondary)' }}>{fmtData(datas[0])}</strong>
            </span>
            <span className="text-[10px]" style={{ color: 'var(--text-muted)' }}>
              Valor menor = snapshot anterior <strong style={{ color: 'var(--text-secondary)' }}>{fmtData(datas[1])}</strong>
            </span>
            <span className="flex items-center gap-1 text-[10px]" style={{ color: 'var(--verde)' }}>
              <ArrowUp size={9} /> Melhora
            </span>
            <span className="flex items-center gap-1 text-[10px]" style={{ color: 'var(--vermelho)' }}>
              <ArrowDown size={9} /> Piora
            </span>
          </div>
        )}
      </div>
    </div>
  )
}

// ── Ranking item ───────────────────────────────────────────────────────────────

function RankingItem({
  row, pos, tipo, getNome,
}: {
  row: OperadorRow
  pos: number
  tipo: 'melhor' | 'pior'
  getNome: (r: OperadorRow) => string
}) {
  const isMelhor = tipo === 'melhor'
  const scoreColor = isMelhor ? 'var(--verde)' : 'var(--vermelho)'
  const scoreBg    = isMelhor ? 'rgba(16,185,129,0.08)' : 'rgba(239,68,68,0.08)'
  const posLabel   = pos === 1 ? '🥇' : pos === 2 ? '🥈' : '🥉'

  return (
    <div
      className="flex items-center gap-3 rounded-xl px-3 py-2"
      style={{ background: scoreBg, border: `1px solid ${scoreColor}20` }}
    >
      <span className="text-base leading-none shrink-0">{posLabel}</span>
      <div
        className="w-7 h-7 rounded-lg flex items-center justify-center text-[9px] font-bold shrink-0 border-2"
        style={getAvatarStyle(row.opId)}
      >
        {getIniciaisNome(row.nomeReal)}
      </div>
      <div className="flex-1 min-w-0">
        <p className="text-xs font-semibold truncate" style={{ color: 'var(--text-primary)' }}>
          {getNome(row)}
        </p>
      </div>
      <span
        className="text-[10px] font-bold tabular-nums shrink-0"
        style={{ color: scoreColor }}
      >
        {row.score.toFixed(1)}
      </span>
    </div>
  )
}
