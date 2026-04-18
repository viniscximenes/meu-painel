import { notFound } from 'next/navigation'
import { requireGestor } from '@/lib/auth'
import PainelShell from '@/components/PainelShell'
import { getOperadorPorUsername, getAvatarStyle, getIniciaisNome } from '@/lib/operadores'
import {
  buscarDiarioAtivo,
  filtrarPorOperador,
  totalPausasJustificadas,
  contarComGLPI,
  formatTempo,
  formatarDataCurta,
  type DiarioRegistro,
  type TipoRegistro,
} from '@/lib/diario'
import { getPlanilhaAtiva, buscarLinhasPlanilha, matchCelulaOperador, encontrarColunaIdent } from '@/lib/sheets'
import { getRVConfigRaw, extrairDadosContestacao } from '@/lib/rv'
import { getMetas } from '@/lib/kpi'
import type { Meta } from '@/lib/kpi-utils'
import {
  BookOpen, Clock, Hash, TrendingDown, TrendingUp, AlertTriangle,
  CheckCircle2, XCircle, MinusCircle, ChevronRight, Info,
} from 'lucide-react'
import Link from 'next/link'

function avatarEstiloEscuro(id: number): { background: string; border: string; color: string } {
  const impar = id % 2 !== 0
  return {
    background: impar ? 'linear-gradient(135deg, #0f1729, #1a2540)' : 'linear-gradient(135deg, #0a1020, #111830)',
    border: impar ? '2px solid rgba(66,139,255,0.25)' : '2px solid rgba(66,139,255,0.15)',
    color: '#ffffff',
  }
}

export const dynamic = 'force-dynamic'

// ── Tipos ─────────────────────────────────────────────────────────────────────

type BadgeStatus = 'verde' | 'amarelo' | 'vermelho' | 'neutro'

// ── Cores ─────────────────────────────────────────────────────────────────────

const TIPO_CORES: Record<TipoRegistro, { bg: string; color: string; border: string }> = {
  'Pausa justificada': { bg: 'rgba(245,158,11,0.10)',  color: '#f59e0b', border: 'rgba(245,158,11,0.25)' },
  'Fora da jornada':   { bg: 'rgba(96,165,250,0.10)',  color: '#60a5fa', border: 'rgba(96,165,250,0.25)' },
  'Geral':             { bg: 'rgba(167,139,250,0.10)', color: '#a78bfa', border: 'rgba(167,139,250,0.25)' },
  'Outros':            { bg: 'rgba(148,163,184,0.10)', color: '#94a3b8', border: 'rgba(148,163,184,0.20)' },
}

const BADGE_STYLE: Record<BadgeStatus, { bg: string; color: string; border: string }> = {
  verde:    { bg: 'rgba(34,197,94,0.10)',   color: '#4ade80', border: 'rgba(34,197,94,0.25)' },
  amarelo:  { bg: 'rgba(245,158,11,0.10)',  color: '#fbbf24', border: 'rgba(245,158,11,0.25)' },
  vermelho: { bg: 'rgba(239,68,68,0.10)',   color: '#f87171', border: 'rgba(239,68,68,0.25)' },
  neutro:   { bg: 'rgba(148,163,184,0.10)', color: '#94a3b8', border: 'rgba(148,163,184,0.20)' },
}

// ── Helpers ───────────────────────────────────────────────────────────────────

function fmtPct(n: number): string {
  if (isNaN(n) || !isFinite(n)) return '—'
  return `${n.toFixed(1)}%`
}

function fmtH(min: number): string {
  if (!min || min <= 0) return '—'
  const h = Math.floor(min / 60)
  const m = min % 60
  return m > 0 ? `${h}h ${m}min` : `${h}h`
}

function getBadgeStatus(valor: number, meta: Meta | undefined): BadgeStatus {
  if (!meta) return 'neutro'
  const { tipo, verde_inicio, amarelo_inicio } = meta
  if (tipo === 'menor_melhor') {
    if (valor <= verde_inicio)   return 'verde'
    if (valor <= amarelo_inicio) return 'amarelo'
    return 'vermelho'
  } else {
    if (valor >= verde_inicio)   return 'verde'
    if (valor >= amarelo_inicio) return 'amarelo'
    return 'vermelho'
  }
}

/** Retorna string de meta legível, nunca "0.0%". */
function fmtMetaLabel(meta: Meta | undefined): string | undefined {
  if (!meta) return undefined
  if (meta.tipo === 'menor_melhor') {
    // Usa amarelo_inicio como "limite operacional" (acima = vermelho)
    const threshold = meta.amarelo_inicio > 0
      ? meta.amarelo_inicio
      : meta.verde_inicio > 0 ? meta.verde_inicio : 0
    if (threshold <= 0) return undefined
    return `Meta: ≤${threshold.toFixed(1)}%`
  } else {
    const threshold = meta.verde_inicio > 0 ? meta.verde_inicio : meta.amarelo_inicio
    if (threshold <= 0) return undefined
    return `Meta: ≥${threshold.toFixed(1)}%`
  }
}

function findMeta(metas: Meta[], keywords: string[]): Meta | undefined {
  return metas.find(m =>
    keywords.some(kw =>
      m.nome_coluna.toLowerCase().includes(kw) ||
      m.label.toLowerCase().includes(kw)
    )
  )
}

function BadgeIcon({ status }: { status: BadgeStatus }) {
  if (status === 'verde')    return <CheckCircle2 size={12} />
  if (status === 'vermelho') return <XCircle size={12} />
  return <MinusCircle size={12} />
}

// ── Page ──────────────────────────────────────────────────────────────────────

interface PageProps {
  params: Promise<{ username: string }>
}

export default async function DiarioOperadorPage({ params }: PageProps) {
  const { username } = await params
  const profile = await requireGestor()

  const operador = getOperadorPorUsername(username)
  if (!operador) notFound()

  // ── Fetch paralelo ───────────────────────────────────────────────────────────
  const [{ registros: todos }, planilha, rvConfigRaw, metas] = await Promise.all([
    buscarDiarioAtivo(),
    getPlanilhaAtiva(),
    getRVConfigRaw(),
    getMetas(),
  ])

  const registros   = filtrarPorOperador(todos, operador.username, operador.nome)
  const comGlpi     = contarComGLPI(registros)
  const pausasJust  = registros.filter((r) => r.tipo === 'Pausa justificada')
  const foraJornada = registros.filter((r) => r.tipo === 'Fora da jornada')

  // "Fora da jornada": valor ≥ 240min → salvo como tempo logado bruto → deficit = 380 − valor
  //                    valor < 240min → já salvo como déficit → usar diretamente
  const LIMIAR_BRUTO_MIN = 240
  const defsForaJornada = foraJornada.map((r) => {
    const min = r.tempoMin
    let def = 0
    if (min > 0 && min < 380) def = min >= LIMIAR_BRUTO_MIN ? 380 - min : min
    console.log(
      `[Diário Déficit] ${operador.username} | ${r.data} raw="${r.tempo}" ${min}min → ` +
      (min >= 380 ? 'completo(def=0)'
        : min >= LIMIAR_BRUTO_MIN ? `bruto→def=${def}min`
        : `déficit=${def}min`)
    )
    return def
  })

  const minPausas = totalPausasJustificadas(registros)
  const minFora   = defsForaJornada.reduce((s, d) => s + d, 0)
  const qtdFora   = foraJornada.length

  // ── Contestação ─────────────────────────────────────────────────────────────
  const horasMensais = parseInt((rvConfigRaw['horas_mensais'] as string | undefined) ?? '132')

  let indispPercent       = 0
  let tempoLogadoHoras    = 0
  let tempoProjetadoHoras = 0
  let colIndisp           = ''
  let colTempoLogado      = ''
  let colTempoProjetado   = ''
  let kpiRowFound         = false

  if (planilha) {
    const { headers, rows } = await buscarLinhasPlanilha(planilha.spreadsheet_id, planilha.aba)
    const colIdent = encontrarColunaIdent(headers)
    const row = rows.find((r) => matchCelulaOperador(r[colIdent] ?? '', operador.username, operador.nome))
    if (row) {
      kpiRowFound = true
      const ex = extrairDadosContestacao(headers, row)
      indispPercent       = ex.indispPercent
      tempoLogadoHoras    = ex.tempoLogadoHoras
      tempoProjetadoHoras = ex.tempoProjetadoHoras
      colIndisp           = ex.colIndisp
      colTempoLogado      = ex.colTempoLogado
      colTempoProjetado   = ex.colTempoProjetado
    }
  }

  // Forecast: usa "Tempo Projetado" da planilha; fallback para rv_config horas_mensais
  const forecastHoras = tempoProjetadoHoras > 0 ? tempoProjetadoHoras : horasMensais

  // ── Cálculo ABS ─────────────────────────────────────────────────────────────
  const minutosLogados    = Math.round(tempoLogadoHoras * 60)
  const JORNADA_DIA_MIN   = 380   // 6h20min

  // Para cada "Fora da jornada": usa o mesmo déficit já calculado em defsForaJornada
  const detalhesFora = foraJornada.map((r, i) => ({
    registro: r,
    diff: defsForaJornada[i] ?? 0,
  }))
  const minutosAcrescentar    = detalhesFora.reduce((s, d) => s + d.diff, 0)
  const minutosLogadosContest = minutosLogados + minutosAcrescentar

  // ABS = ausência: (forecast − logado) / forecast × 100. Menor = melhor.
  const absBruto      = forecastHoras > 0
    ? Math.max(0, Math.round((1 - (minutosLogados       / 60) / forecastHoras) * 10000) / 100)
    : 0
  const absContestado = forecastHoras > 0
    ? Math.max(0, Math.round((1 - (minutosLogadosContest / 60) / forecastHoras) * 10000) / 100)
    : 0

  // ── Cálculo Indisp ───────────────────────────────────────────────────────────
  const minutosIndispBruto   = minutosLogados > 0 ? indispPercent / 100 * minutosLogados : 0
  const minutosJustificados  = totalPausasJustificadas(pausasJust)
  const minutosIndispContest = Math.max(0, minutosIndispBruto - minutosJustificados)
  const indispContestada     = minutosLogados > 0 ? minutosIndispContest / minutosLogados * 100 : 0

  // ── Metas ───────────────────────────────────────────────────────────────────
  const metaAbs    = findMeta(metas, ['abs', 'absenteísmo', 'ausência', 'absenteismo', 'ausencia'])
  const metaIndisp = findMeta(metas, ['indisp', 'indisponib'])

  const statusAbsOrig      = getBadgeStatus(absBruto, metaAbs)
  const statusAbsContest   = getBadgeStatus(absContestado, metaAbs)
  const statusIndispOrig   = getBadgeStatus(indispPercent, metaIndisp)
  const statusIndispContest = getBadgeStatus(indispContestada, metaIndisp)

  const mostrarContestacao = kpiRowFound && (minPausas > 0 || minFora > 0) && tempoLogadoHoras > 0

  // ── JSX ─────────────────────────────────────────────────────────────────────
  return (
    <PainelShell profile={profile} title={`Diário — ${operador.nome.split(' ')[0]}`}>
      <div className="space-y-6" style={{ '--void2': '#07070f', '--void3': '#0d0d1a' } as React.CSSProperties}>

        {/* ── Linha dourada ── */}
        <div style={{
          height: '1px',
          background: 'linear-gradient(90deg, transparent 0%, #c9a84c 25%, #e8c96d 50%, #c9a84c 75%, transparent 100%)',
        }} />

        {/* Cabeçalho */}
        <div style={{
          background: 'var(--void2)',
          border: '1px solid rgba(201,168,76,0.1)',
          borderRadius: '14px',
          padding: '14px 20px',
          display: 'flex',
          alignItems: 'center',
          gap: '16px',
          flexWrap: 'wrap',
          justifyContent: 'space-between',
        }}>
          <div className="flex items-center gap-4">
          <div
            className="w-12 h-12 rounded-xl flex items-center justify-center text-base font-bold shrink-0"
            style={avatarEstiloEscuro(operador.id)}
          >
            {getIniciaisNome(operador.nome)}
          </div>
          <div>
            <h2
              className="text-xl font-extrabold"
              style={{
                fontFamily: 'var(--ff-display)',
                background: 'linear-gradient(135deg, #e8c96d 0%, #c9a84c 100%)',
                WebkitBackgroundClip: 'text',
                WebkitTextFillColor: 'transparent',
                backgroundClip: 'text',
              }}
            >
              {operador.nome}
            </h2>
            <p className="text-xs mt-0.5 flex items-center gap-1.5" style={{ color: 'var(--text-muted)' }}>
              <BookOpen size={11} />
              Diário de Bordo · {registros.length} registros do mês
            </p>
          </div>
          </div>
          <Link href="/painel/diario" className="text-xs btn-ghost">
            ← Todos os registros
          </Link>
        </div>

        {/* KPI cards resumo */}
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
          <div style={{ background: '#0d0d1a', border: '1px solid rgba(201,168,76,0.08)', borderRadius: '16px', padding: '16px', minHeight: '100px' }}>
            <div className="flex items-center gap-2 mb-2">
              <div className="p-1.5 rounded-lg" style={{ background: 'rgba(245,158,11,0.10)', color: '#f59e0b' }}>
                <Clock size={13} />
              </div>
              <p className="text-[10px] font-bold uppercase" style={{ color: 'var(--text-muted)', letterSpacing: '0.07em' }}>
                Pausas justif.
              </p>
            </div>
            <p className="text-2xl font-extrabold tabular-nums" style={{ color: '#f59e0b' }}>
              {minPausas > 0 ? formatTempo(minPausas) : '—'}
            </p>
            <p className="text-[10px] mt-0.5" style={{ color: 'var(--text-muted)' }}>
              {pausasJust.length} {pausasJust.length === 1 ? 'entrada' : 'entradas'}
            </p>
          </div>

          <div style={{ background: '#0d0d1a', border: '1px solid rgba(201,168,76,0.08)', borderRadius: '16px', padding: '16px', minHeight: '100px' }}>
            <div className="flex items-center gap-2 mb-2">
              <div className="p-1.5 rounded-lg" style={{ background: 'rgba(96,165,250,0.10)', color: '#60a5fa' }}>
                <TrendingUp size={13} />
              </div>
              <p className="text-[10px] font-bold uppercase" style={{ color: 'var(--text-muted)', letterSpacing: '0.07em' }}>
                Fora jornada
              </p>
            </div>
            <p className="text-2xl font-extrabold tabular-nums" style={{ color: '#60a5fa' }}>
              {minFora > 0 ? formatTempo(minFora) : '—'}
            </p>
            <p className="text-[10px] mt-0.5" style={{ color: 'var(--text-muted)' }}>
              {qtdFora} {qtdFora === 1 ? 'entrada' : 'entradas'}
            </p>
          </div>

          <div style={{ background: '#0d0d1a', border: '1px solid rgba(201,168,76,0.08)', borderRadius: '16px', padding: '16px', minHeight: '100px' }}>
            <div className="flex items-center gap-2 mb-2">
              <div className="p-1.5 rounded-lg" style={{ background: 'rgba(167,139,250,0.10)', color: '#a78bfa' }}>
                <BookOpen size={13} />
              </div>
              <p className="text-[10px] font-bold uppercase" style={{ color: 'var(--text-muted)', letterSpacing: '0.07em' }}>
                Total
              </p>
            </div>
            <p className="text-2xl font-extrabold tabular-nums" style={{ color: 'var(--text-primary)' }}>
              {registros.length}
            </p>
            <p className="text-[10px] mt-0.5" style={{ color: 'var(--text-muted)' }}>
              registros no mês
            </p>
          </div>

          <div style={{ background: '#0d0d1a', border: '1px solid rgba(201,168,76,0.08)', borderRadius: '16px', padding: '16px', minHeight: '100px' }}>
            <div className="flex items-center gap-2 mb-2">
              <div className="p-1.5 rounded-lg" style={{ background: 'rgba(96,165,250,0.10)', color: '#60a5fa' }}>
                <Hash size={13} />
              </div>
              <p className="text-[10px] font-bold uppercase" style={{ color: 'var(--text-muted)', letterSpacing: '0.07em' }}>
                Com GLPI
              </p>
            </div>
            <p className="text-2xl font-extrabold tabular-nums" style={{ color: 'var(--text-primary)' }}>
              {comGlpi}
            </p>
            <p className="text-[10px] mt-0.5" style={{ color: 'var(--text-muted)' }}>
              chamados vinculados
            </p>
          </div>
        </div>

        {/* ── Análise de Contestação ─────────────────────────────────────── */}
        {mostrarContestacao && (
          <div className="space-y-4">
            <p className="text-[10px] font-bold uppercase" style={{ color: 'var(--text-muted)', letterSpacing: '0.08em' }}>
              Análise de Contestação
            </p>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">

              {/* Card ABS / Tempo Logado */}
              {foraJornada.length > 0 && (
                <ContestCard
                  titulo="Tempo Logado (ABS)"
                  icon={<TrendingUp size={14} />}
                  iconColor="#60a5fa"
                  colLabel={colTempoLogado || 'Tempo de Login'}
                  original={absBruto}
                  contestado={absContestado}
                  statusOriginal={statusAbsOrig}
                  statusContestado={statusAbsContest}
                  metaLabel={fmtMetaLabel(metaAbs)}
                  delta={absContestado - absBruto}
                  deltaPositivoEhBom={false}
                  breakdown={[
                    `Forecast: ${fmtH(Math.round(forecastHoras * 60))}${colTempoProjetado ? ` (col: ${colTempoProjetado})` : ' (config)'}`,
                    `Bruto: ${fmtH(minutosLogados)} → ABS ${fmtPct(absBruto)}`,
                    `+ ${fmtH(minutosAcrescentar)} revertidos (${foraJornada.length}× 6h20 − logado)`,
                    `= ${fmtH(minutosLogadosContest)} contestado → ABS ${fmtPct(absContestado)}`,
                  ]}
                  detalheLabel="Jornadas incompletas justificadas:"
                  detalhes={detalhesFora.map(({ registro: r, diff }) => ({
                    data: r.data,
                    texto: r.observacoes || '—',
                    tempo: r.tempoMin > 0 ? formatTempo(r.tempoMin) : null,
                    extra: diff > 0 ? `+${formatTempo(diff)}` : null,
                  }))}
                />
              )}

              {/* Card Indisponibilidade */}
              {pausasJust.length > 0 && (
                <ContestCard
                  titulo="Indisponibilidade"
                  icon={<TrendingDown size={14} />}
                  iconColor="#f59e0b"
                  colLabel={colIndisp || 'Indisp Total'}
                  original={indispPercent}
                  contestado={indispContestada}
                  statusOriginal={statusIndispOrig}
                  statusContestado={statusIndispContest}
                  metaLabel={fmtMetaLabel(metaIndisp)}
                  delta={indispContestada - indispPercent}
                  deltaPositivoEhBom={false}
                  breakdown={[
                    `Indisp bruta: ${fmtPct(indispPercent)} × ${fmtH(minutosLogados)} = ${formatTempo(Math.round(minutosIndispBruto))}`,
                    `− ${formatTempo(minutosJustificados)} de pausas justificadas`,
                    `= ${formatTempo(Math.round(minutosIndispContest))} contestado (${fmtPct(indispContestada)})`,
                  ]}
                  detalheLabel="Pausas justificadas:"
                  detalhes={pausasJust.map((r) => ({
                    data: r.data,
                    texto: r.observacoes || '—',
                    tempo: r.tempoMin > 0 ? formatTempo(r.tempoMin) : null,
                    extra: null,
                  }))}
                />
              )}
            </div>

            {/* Disclaimer âmbar */}
            <div
              className="flex items-start gap-3 rounded-xl px-4 py-3"
              style={{ background: 'rgba(245,158,11,0.05)', border: '1px solid rgba(245,158,11,0.18)' }}
            >
              <AlertTriangle size={13} className="shrink-0 mt-0.5" style={{ color: '#f59e0b' }} />
              <p className="text-[11px] leading-relaxed" style={{ color: 'var(--text-muted)' }}>
                Valores contestados são{' '}
                <strong style={{ color: 'var(--text-secondary)' }}>estimativas para fins de argumentação</strong>.
                O KPI oficial permanece inalterado na planilha de referência.
              </p>
            </div>
          </div>
        )}

        {/* KPI row não encontrada mas há registros */}
        {!mostrarContestacao && (minPausas > 0 || minFora > 0) && (
          <div
            className="flex items-start gap-3 rounded-xl px-4 py-3"
            style={{ background: 'rgba(148,163,184,0.05)', border: '1px solid rgba(148,163,184,0.12)' }}
          >
            <Info size={13} className="shrink-0 mt-0.5" style={{ color: '#94a3b8' }} />
            <p className="text-[11px] leading-relaxed" style={{ color: 'var(--text-muted)' }}>
              {!kpiRowFound
                ? `Não foi possível localizar a linha de ${operador.nome.split(' ')[0]} na planilha ativa.`
                : tempoLogadoHoras === 0
                ? `Coluna de tempo logado não encontrada na planilha. Verifique os cabeçalhos.`
                : 'Nenhum registro de pausa ou jornada para contestar.'
              }
            </p>
          </div>
        )}

        {/* Lista de registros */}
        <div>
          <p className="text-[10px] font-bold uppercase mb-4" style={{ color: 'var(--text-muted)', letterSpacing: '0.08em' }}>
            Todos os registros
          </p>

          {registros.length === 0 ? (
            <div style={{ background: '#0d0d1a', border: '1px solid rgba(201,168,76,0.08)', borderRadius: '16px', padding: '48px 24px', textAlign: 'center' }}>
              <p className="text-sm" style={{ color: 'var(--text-muted)' }}>
                Nenhum registro para {operador.nome.split(' ')[0]} no mês atual.
              </p>
            </div>
          ) : (
            <div className="space-y-2">
              {registros.map((r, i) => {
                const tc = TIPO_CORES[r.tipo]
                const tempoFmt = r.tempoMin > 0 ? formatTempo(r.tempoMin) : r.tempo || null
                return (
                  <div
                    key={i}
                    className="rounded-xl flex items-start gap-3 px-4 py-3"
                    style={{ background: '#111827', border: '1px solid rgba(201,168,76,0.08)' }}
                  >
                    <div className="w-1 self-stretch rounded-full shrink-0" style={{ background: tc.color, opacity: 0.7, minHeight: '20px' }} />
                    <div className="shrink-0 text-[10px] tabular-nums font-medium w-10" style={{ color: 'var(--text-muted)', paddingTop: '2px' }}>
                      {formatarDataCurta(r.data)}
                    </div>
                    <span
                      className="text-[9px] font-bold uppercase px-1.5 py-0.5 rounded-full shrink-0 mt-0.5"
                      style={{ background: tc.bg, color: tc.color, border: `1px solid ${tc.border}` }}
                    >
                      {r.tipo.split(' ')[0]}
                    </span>
                    <div className="flex-1 min-w-0">
                      <p className="text-xs leading-relaxed" style={{ color: 'var(--text-secondary)' }}>
                        {r.observacoes || '—'}
                      </p>
                      {r.glpi && (
                        <span
                          className="inline-flex items-center gap-0.5 mt-1 text-[9px] font-bold px-1.5 py-0.5 rounded-full tabular-nums"
                          style={{ background: 'rgba(96,165,250,0.10)', color: '#60a5fa', border: '1px solid rgba(96,165,250,0.20)' }}
                        >
                          <Hash size={8} />{r.glpi}
                        </span>
                      )}
                    </div>
                    {tempoFmt && (
                      <span className="text-xs font-bold tabular-nums shrink-0" style={{ color: tc.color }}>
                        {tempoFmt}
                      </span>
                    )}
                  </div>
                )
              })}
            </div>
          )}
        </div>
      </div>
    </PainelShell>
  )
}

// ── ContestCard ───────────────────────────────────────────────────────────────

interface DetalheRow {
  data: string
  texto: string
  tempo: string | null
  extra: string | null  // e.g. "+20min" revertido, or null
}

interface ContestCardProps {
  titulo: string
  icon: React.ReactNode
  iconColor: string
  colLabel: string
  original: number
  contestado: number
  statusOriginal: BadgeStatus
  statusContestado: BadgeStatus
  metaLabel?: string
  delta: number
  deltaPositivoEhBom: boolean
  breakdown: string[]
  detalheLabel: string
  detalhes: DetalheRow[]
}

function ContestCard({
  titulo, icon, iconColor, colLabel,
  original, contestado,
  statusOriginal, statusContestado,
  metaLabel, delta, deltaPositivoEhBom,
  breakdown, detalheLabel, detalhes,
}: ContestCardProps) {
  const bsOrig    = BADGE_STYLE[statusOriginal]
  const bsContest = BADGE_STYLE[statusContestado]
  const deltaGood  = deltaPositivoEhBom ? delta > 0 : delta < 0
  const deltaColor = deltaGood ? '#4ade80' : delta === 0 ? '#94a3b8' : '#f87171'
  const deltaSign  = delta > 0 ? '+' : ''

  return (
    <div
      className="rounded-2xl border overflow-hidden"
      style={{ background: '#111827', borderColor: `${iconColor}30` }}
    >
      {/* Cabeçalho */}
      <div
        className="px-4 py-3 flex items-center gap-2"
        style={{ borderBottom: '1px solid rgba(255,255,255,0.05)', background: `${iconColor}08` }}
      >
        <div className="p-1.5 rounded-lg" style={{ background: `${iconColor}18`, color: iconColor }}>
          {icon}
        </div>
        <div className="flex-1 min-w-0">
          <p className="text-[10px] font-bold uppercase" style={{ color: iconColor, letterSpacing: '0.07em' }}>
            {titulo}
          </p>
          <p className="text-[9px]" style={{ color: 'var(--text-muted)' }}>
            Coluna: {colLabel}
          </p>
        </div>
        {metaLabel && (
          <span
            className="text-[9px] font-semibold px-2 py-0.5 rounded-full"
            style={{ background: `${iconColor}12`, color: iconColor, border: `1px solid ${iconColor}30` }}
          >
            {metaLabel}
          </span>
        )}
      </div>

      {/* Valores: original → contestado → Δ */}
      <div className="px-4 py-3 flex items-center gap-3">
        <div className="flex-1 text-center">
          <p className="text-[9px] font-bold uppercase mb-1" style={{ color: 'var(--text-muted)', letterSpacing: '0.06em' }}>
            Original
          </p>
          <p className="text-xl font-extrabold tabular-nums" style={{ color: 'var(--text-primary)' }}>
            {fmtPct(original)}
          </p>
          <span
            className="inline-flex items-center gap-1 mt-1 text-[9px] font-bold px-1.5 py-0.5 rounded-full"
            style={{ background: bsOrig.bg, color: bsOrig.color, border: `1px solid ${bsOrig.border}` }}
          >
            <BadgeIcon status={statusOriginal} />
            {statusOriginal}
          </span>
        </div>

        <div style={{ color: 'var(--text-muted)' }}>
          <ChevronRight size={16} />
        </div>

        <div className="flex-1 text-center">
          <p className="text-[9px] font-bold uppercase mb-1" style={{ color: 'var(--text-muted)', letterSpacing: '0.06em' }}>
            Contestado
          </p>
          <p className="text-xl font-extrabold tabular-nums" style={{ color: 'var(--text-primary)' }}>
            {fmtPct(contestado)}
          </p>
          <span
            className="inline-flex items-center gap-1 mt-1 text-[9px] font-bold px-1.5 py-0.5 rounded-full"
            style={{ background: bsContest.bg, color: bsContest.color, border: `1px solid ${bsContest.border}` }}
          >
            <BadgeIcon status={statusContestado} />
            {statusContestado}
          </span>
        </div>

        <div className="text-center pl-2" style={{ borderLeft: '1px solid rgba(255,255,255,0.06)' }}>
          <p className="text-[9px] font-bold uppercase mb-1" style={{ color: 'var(--text-muted)', letterSpacing: '0.06em' }}>Δ</p>
          <p className="text-sm font-extrabold tabular-nums" style={{ color: deltaColor }}>
            {deltaSign}{fmtPct(delta)}
          </p>
        </div>
      </div>

      {/* Breakdown do cálculo */}
      <div
        className="px-4 py-2.5 space-y-0.5"
        style={{ borderTop: '1px solid rgba(255,255,255,0.04)', background: 'rgba(0,0,0,0.15)' }}
      >
        {breakdown.map((line, i) => (
          <p key={i} className="text-[10px] tabular-nums" style={{ color: 'var(--text-muted)' }}>
            {line}
          </p>
        ))}
      </div>

      {/* Registros detalhados */}
      {detalhes.length > 0 && (
        <div className="px-4 pb-3" style={{ borderTop: '1px solid rgba(255,255,255,0.04)' }}>
          <p className="text-[9px] font-bold uppercase mt-2 mb-1.5" style={{ color: 'var(--text-muted)', letterSpacing: '0.07em' }}>
            {detalheLabel}
          </p>
          <div className="space-y-1">
            {detalhes.map((d, i) => (
              <div key={i} className="flex items-start gap-2 text-[10px]">
                <span className="tabular-nums shrink-0 w-8" style={{ color: 'var(--text-muted)' }}>
                  {formatarDataCurta(d.data)}
                </span>
                <span className="flex-1 leading-relaxed" style={{ color: 'var(--text-secondary)', minWidth: 0, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                  {d.texto}
                </span>
                <span className="flex items-center gap-1 shrink-0 tabular-nums" style={{ color: iconColor }}>
                  {d.tempo && <span className="font-semibold">{d.tempo}</span>}
                  {d.extra && (
                    <span className="font-bold" style={{ color: '#4ade80' }}>
                      {d.extra}
                    </span>
                  )}
                </span>
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  )
}
