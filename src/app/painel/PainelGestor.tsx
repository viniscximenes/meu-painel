import { Profile } from '@/types'
import { OPERADORES_DISPLAY, getIniciaisNome, getAvatarStyle } from '@/lib/operadores'
import { getMetas, computarKPIs } from '@/lib/kpi'
import {
  getPlanilhaAtiva, buscarLinhasPlanilha, encontrarColunaIdent,
  extrairDataAtualizacao, formatarDataPtBR, matchCelulaOperador,
} from '@/lib/sheets'
import { getRVConfig, calcularRV, formatBRL } from '@/lib/rv'
import { buscarMonitoriasAtivas } from '@/lib/monitoria'
import { META_MONITORIAS, mesDeData } from '@/lib/monitoria-utils'
import Link from 'next/link'
import { Users, TrendingUp, XCircle, FileText } from 'lucide-react'

// ── Types ─────────────────────────────────────────────────────────────────────

interface PainelGestorProps { profile: Profile }

interface OpData {
  id: number; nome: string; username: string
  kpiVerde: number; kpiAmarelo: number; kpiVermelho: number
  pctVerde: number        // -1 = sem dados KPI
  rvElegivel: boolean; rvFinal: number; rvSemDados: boolean
  monitoriaCount: number
}

// ── Pure helpers ──────────────────────────────────────────────────────────────

function monitoriaColor(count: number): string {
  if (count >= META_MONITORIAS) return 'var(--verde)'
  if (count >= 2)               return 'var(--amarelo)'
  return 'var(--vermelho)'
}

function kpiColor(op: OpData): string {
  if (op.pctVerde < 0) return 'var(--text-muted)'
  const max = Math.max(op.kpiVerde, op.kpiAmarelo, op.kpiVermelho)
  if (max === 0)               return 'var(--text-muted)'
  if (op.kpiVerde === max)     return 'var(--verde)'
  if (op.kpiAmarelo === max)   return 'var(--amarelo)'
  return 'var(--vermelho)'
}

function firstName2(nome: string): string {
  const p = nome.split(' ')
  return p[1] ? `${p[0]} ${p[1]}` : p[0]
}

// ── Sub-components ────────────────────────────────────────────────────────────

function SectionHeader({ href, title }: { href: string; title: string }) {
  return (
    <Link
      href={href}
      className="dp-section-link"
      style={{
        display: 'inline-flex', alignItems: 'center', gap: 4,
        fontFamily: 'var(--ff-body)', fontSize: '.75rem', fontWeight: 700,
        textTransform: 'uppercase', letterSpacing: '.08em',
        color: 'var(--text-secondary)', textDecoration: 'none',
      }}
    >
      {title}<span className="dp-arrow"> →</span>
    </Link>
  )
}

function OpAvatar({ id, nome }: { id: number; nome: string }) {
  return (
    <div style={{
      ...getAvatarStyle(id),
      width: 30, height: 30, borderRadius: 8, border: '1px solid',
      display: 'flex', alignItems: 'center', justifyContent: 'center',
      fontSize: '.6rem', fontWeight: 700, flexShrink: 0,
    }}>
      {getIniciaisNome(nome)}
    </div>
  )
}

// ── Main component ────────────────────────────────────────────────────────────

export default async function PainelGestor({ profile }: PainelGestorProps) {
  const hora = new Date().getHours()
  const saudacao = hora < 12 ? 'Bom dia' : hora < 18 ? 'Boa tarde' : 'Boa noite'
  const now = new Date()
  const mesAtual  = `${String(now.getMonth() + 1).padStart(2, '0')}/${now.getFullYear()}`
  const mesAnoLabel = new Intl.DateTimeFormat('pt-BR', { month: 'long', year: 'numeric' }).format(now)

  const [metas, planilha, rvConfig, { monitorias }] = await Promise.all([
    getMetas(), getPlanilhaAtiva(), getRVConfig(), buscarMonitoriasAtivas(),
  ])

  let dataAtualizacao: string | null = null

  const opData: OpData[] = OPERADORES_DISPLAY.map(op => ({
    id: op.id, nome: op.nome, username: op.username,
    kpiVerde: 0, kpiAmarelo: 0, kpiVermelho: 0, pctVerde: -1,
    rvElegivel: false, rvFinal: 0, rvSemDados: true,
    monitoriaCount: 0,
  }))

  // ── Monitoria: current month, verde only ──────────────────────────────────
  const monitoriasMes = monitorias.filter(m =>
    mesDeData(m.dataAtendimento) === mesAtual && m.status === 'verde'
  )
  for (const op of opData) {
    op.monitoriaCount = monitoriasMes.filter(m => m.colaborador === op.nome).length
  }

  // ── KPI + RV from planilha ────────────────────────────────────────────────
  if (planilha && metas.length > 0) {
    try {
      const { headers, rows } = await buscarLinhasPlanilha(planilha.spreadsheet_id, planilha.aba)
      const col = encontrarColunaIdent(headers)
      dataAtualizacao = extrairDataAtualizacao(rows)
      for (const op of opData) {
        const row = rows.find(r => matchCelulaOperador(r[col] ?? '', op.username, op.nome))
        if (!row) continue
        const kpis   = computarKPIs(headers, row, metas)
        const comMeta = kpis.filter(k => k.status !== 'neutro')
        op.kpiVerde    = kpis.filter(k => k.status === 'verde').length
        op.kpiAmarelo  = kpis.filter(k => k.status === 'amarelo').length
        op.kpiVermelho = kpis.filter(k => k.status === 'vermelho').length
        op.pctVerde    = comMeta.length > 0 ? op.kpiVerde / comMeta.length : -1
        try {
          const rv = calcularRV(headers, row, rvConfig)
          op.rvElegivel = rv.elegivel
          op.rvFinal    = rv.rvFinal
          op.rvSemDados = rv.semDados
        } catch { /* ignore RV errors */ }
      }
    } catch (e) {
      console.error('[PainelGestor] erro ao buscar planilha:', e)
    }
  }

  // ── Aggregate stats ───────────────────────────────────────────────────────
  const opsComKPI    = opData.filter(op => op.pctVerde >= 0)
  const mediaKPI     = opsComKPI.length > 0
    ? Math.round(opsComKPI.reduce((s, op) => s + op.pctVerde * 100, 0) / opsComKPI.length)
    : null
  const inelegiveis  = opData.filter(op => !op.rvElegivel && !op.rvSemDados)
  const totalEnviadas = monitoriasMes.length
  const metaTotal    = OPERADORES_DISPLAY.length * META_MONITORIAS
  const pctEnviadas  = metaTotal > 0 ? Math.min(100, Math.round(totalEnviadas / metaTotal * 100)) : 0

  // ── Section data ──────────────────────────────────────────────────────────
  const secaoMonitoria = [...opData]
    .sort((a, b) => a.monitoriaCount - b.monitoriaCount)
    .slice(0, 4)

  const secaoKPI = opData.slice(-4).reverse()

  const opsComRV   = opData.filter(op => !op.rvSemDados)
  const ineleg2    = opsComRV.filter(op => !op.rvElegivel).slice(0, 2)
  const eleg       = opsComRV.filter(op => op.rvElegivel)
  const ineleg2Ids = new Set(ineleg2.map(o => o.id))
  const secaoRVMix = [...ineleg2, ...eleg.filter(o => !ineleg2Ids.has(o.id))].slice(0, 4)
  const secaoRVIds = new Set(secaoRVMix.map(o => o.id))
  const secaoRV    = secaoRVMix.length >= 4
    ? secaoRVMix
    : [...secaoRVMix, ...opData.filter(o => !secaoRVIds.has(o.id)).slice(0, 4 - secaoRVMix.length)]

  // ── Render ────────────────────────────────────────────────────────────────
  return (
    <div className="space-y-8">

      {/* Scoped CSS */}
      <style>{`
        .dp-stat-card { transition: border-color .2s, transform .2s, box-shadow .2s; }
        .dp-stat-card:hover { transform: translateY(-2px); box-shadow: var(--shadow-gold); }
        .dp-list-item { transition: background .15s; }
        .dp-list-item:hover { background: var(--bg-hover) !important; }
        .dp-section-link .dp-arrow { opacity: 0; display: inline-block; transition: opacity .15s, transform .15s; }
        .dp-section-link:hover { color: var(--text-primary) !important; }
        .dp-section-link:hover .dp-arrow { opacity: 1; transform: translateX(3px); }
        .dp-see-all { font-size: .72rem; color: var(--text-muted); text-decoration: none; transition: color .15s; }
        .dp-see-all:hover { color: var(--text-secondary); }
      `}</style>

      {/* ── Header ── */}
      <div className="flex items-start justify-between gap-4 flex-wrap">
        <div>
          <h2 style={{
            fontFamily: 'var(--ff-display)', fontSize: '1.75rem', fontWeight: 800,
            color: 'var(--text-primary)', letterSpacing: '-0.03em', lineHeight: 1.15,
          }}>
            {saudacao}, {profile.nome.split(' ')[0]}!
          </h2>
          <div className="flex items-center gap-2 mt-2 flex-wrap">
            <span style={{
              width: 7, height: 7, borderRadius: '50%',
              background: 'var(--verde)', display: 'inline-block',
              animation: 'dotPulse 2s ease-in-out infinite', flexShrink: 0,
            }} />
            <span style={{ fontSize: '.75rem', color: 'var(--verde)', fontWeight: 600 }}>Ao vivo</span>
            <span style={{ fontSize: '.75rem', color: 'var(--text-muted)' }}>·</span>
            <span style={{ fontSize: '.75rem', color: 'var(--text-secondary)', textTransform: 'capitalize' }}>{mesAnoLabel}</span>
            {dataAtualizacao && (
              <>
                <span style={{ fontSize: '.75rem', color: 'var(--text-muted)' }}>·</span>
                <span style={{ fontSize: '.75rem', color: 'var(--text-muted)' }}>
                  Atualizado até{' '}
                  <span style={{ color: 'var(--text-secondary)' }}>{formatarDataPtBR(dataAtualizacao)}</span>
                </span>
              </>
            )}
          </div>
        </div>
        <span style={{
          fontSize: '.7rem', fontWeight: 700, textTransform: 'uppercase', letterSpacing: '.10em',
          color: 'var(--text-secondary)', background: 'var(--gold-glow)',
          border: '1px solid var(--border)', borderRadius: 9999,
          padding: '.3rem .875rem', alignSelf: 'flex-start', marginTop: '.25rem', whiteSpace: 'nowrap',
        }}>
          Gestão · Retenção
        </span>
      </div>

      {/* ── 4 Stats Cards ── */}
      <div className="grid grid-cols-2 xl:grid-cols-4 gap-4">

        {/* Card 1 — Operadores */}
        <div className="card dp-stat-card animate-fadeUp" style={{ animationDelay: '0ms' }}>
          <div className="flex items-start justify-between" style={{ marginBottom: '1rem' }}>
            <span className="label-uppercase">Operadores</span>
            <div style={{ width: 30, height: 30, borderRadius: 8, background: 'rgba(34,211,238,.10)', display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0 }}>
              <Users size={14} style={{ color: '#22d3ee' }} />
            </div>
          </div>
          <div className="metric-value" style={{ color: 'var(--text-primary)' }}>
            {OPERADORES_DISPLAY.length}
          </div>
          <div style={{ fontSize: '.72rem', color: 'var(--text-muted)', marginTop: '.5rem' }}>equipe ativa este mês</div>
        </div>

        {/* Card 2 — Meta KPI */}
        <div className="card dp-stat-card animate-fadeUp" style={{ borderColor: 'rgba(167,139,250,.22)', animationDelay: '60ms' }}>
          <div style={{ position: 'absolute', top: 0, left: 0, right: 0, height: 3, background: 'linear-gradient(90deg,rgba(167,139,250,.8),transparent)' }} />
          <div className="flex items-start justify-between" style={{ marginBottom: '1rem' }}>
            <span className="label-uppercase">Meta KPI</span>
            <div style={{ width: 30, height: 30, borderRadius: 8, background: 'rgba(167,139,250,.10)', display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0 }}>
              <TrendingUp size={14} style={{ color: '#a78bfa' }} />
            </div>
          </div>
          <div className="metric-value" style={{ color: '#a78bfa' }}>
            {mediaKPI !== null ? `${mediaKPI}%` : '—'}
          </div>
          <div style={{ fontSize: '.72rem', color: 'var(--text-muted)', marginTop: '.5rem' }}>média geral da equipe</div>
        </div>

        {/* Card 3 — Inelegíveis RV */}
        <div className="card dp-stat-card animate-fadeUp" style={{ borderColor: 'rgba(239,68,68,.22)', animationDelay: '120ms' }}>
          <div style={{ position: 'absolute', top: 0, left: 0, right: 0, height: 3, background: 'linear-gradient(90deg,rgba(239,68,68,.8),transparent)' }} />
          <div className="flex items-start justify-between" style={{ marginBottom: '1rem' }}>
            <span className="label-uppercase">Inelegíveis RV</span>
            <div style={{ width: 30, height: 30, borderRadius: 8, background: 'rgba(239,68,68,.10)', display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0 }}>
              <XCircle size={14} style={{ color: 'var(--vermelho)' }} />
            </div>
          </div>
          <div className="metric-value" style={{ color: 'var(--vermelho)' }}>
            {inelegiveis.length}
            <span style={{ fontSize: 18, fontWeight: 600, color: 'var(--text-muted)' }}>/{OPERADORES_DISPLAY.length}</span>
          </div>
          <div style={{ fontSize: '.72rem', color: 'var(--text-muted)', marginTop: '.5rem' }}>abaixo do limite ABS</div>
        </div>

        {/* Card 4 — Monitoria */}
        <div className="card dp-stat-card animate-fadeUp" style={{ borderColor: 'rgba(201,168,76,.22)', animationDelay: '180ms' }}>
          <div style={{ position: 'absolute', top: 0, left: 0, right: 0, height: 3, background: 'linear-gradient(90deg,var(--gold),.transparent)' }} />
          <div className="flex items-start justify-between" style={{ marginBottom: '1rem' }}>
            <span className="label-uppercase">Monitoria</span>
            <div style={{ width: 30, height: 30, borderRadius: 8, background: 'var(--gold-glow)', display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0 }}>
              <FileText size={14} style={{ color: 'var(--gold-light)' }} />
            </div>
          </div>
          <div className="metric-value" style={{ color: 'var(--gold-light)' }}>
            {totalEnviadas}
            <span style={{ fontSize: 18, fontWeight: 600, color: 'var(--text-muted)' }}>/{metaTotal}</span>
          </div>
          <div style={{ height: 3, background: 'var(--border)', borderRadius: 2, margin: '.625rem 0 0', overflow: 'hidden' }}>
            <div style={{ height: '100%', width: `${pctEnviadas}%`, background: 'var(--gold)', borderRadius: 2 }} />
          </div>
          <div style={{ fontSize: '.72rem', color: 'var(--text-muted)', marginTop: '.5rem' }}>enviadas este mês</div>
        </div>

      </div>

      {/* ── 3 Sections ── */}
      <div className="flex flex-col gap-4">

        {/* A — Progresso de Monitoria */}
        <div className="card" style={{ padding: '1.25rem' }}>
          <SectionHeader href="/painel/monitoria" title="Progresso de Monitoria" />
          <div className="divider" style={{ margin: '.75rem 0' }} />
          <div>
            {secaoMonitoria.map(op => {
              const cor = monitoriaColor(op.monitoriaCount)
              const pct = Math.min(100, Math.round((op.monitoriaCount / META_MONITORIAS) * 100))
              return (
                <div key={op.id} className="dp-list-item" style={{
                  display: 'flex', alignItems: 'center', gap: 10,
                  padding: '.5rem', marginBottom: 2,
                  borderBottom: '1px solid var(--border)',
                  borderLeft: `2px solid ${cor}`,
                  paddingLeft: 8, borderRadius: 4,
                }}>
                  <OpAvatar id={op.id} nome={op.nome} />
                  <div style={{ flex: 1, minWidth: 0 }}>
                    <div style={{ fontSize: '.78rem', fontWeight: 600, color: 'var(--text-primary)', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap', marginBottom: 4 }}>
                      {firstName2(op.nome)}
                    </div>
                    <div style={{ height: 3, background: 'var(--border)', borderRadius: 2, overflow: 'hidden' }}>
                      <div style={{ height: '100%', width: `${pct}%`, background: cor, borderRadius: 2 }} />
                    </div>
                  </div>
                  <div style={{ fontSize: '.72rem', fontWeight: 700, color: cor, flexShrink: 0 }}>
                    {op.monitoriaCount}/{META_MONITORIAS}
                  </div>
                </div>
              )
            })}
          </div>
          <div style={{ textAlign: 'right', marginTop: '.75rem' }}>
            <Link href="/painel/monitoria" className="dp-see-all">Ver todos →</Link>
          </div>
        </div>

        {/* B — Resultados de KPI */}
        <div className="card" style={{ padding: '1.25rem' }}>
          <SectionHeader href="/painel/kpis-equipe" title="Resultados de KPI" />
          <div className="divider" style={{ margin: '.75rem 0' }} />
          <div>
            {secaoKPI.map(op => {
              const cor = kpiColor(op)
              return (
                <div key={op.id} className="dp-list-item" style={{
                  display: 'flex', alignItems: 'center', gap: 10,
                  padding: '.5rem', marginBottom: 2,
                  borderBottom: '1px solid var(--border)',
                  borderLeft: `2px solid ${cor}`,
                  paddingLeft: 8, borderRadius: 4,
                }}>
                  <OpAvatar id={op.id} nome={op.nome} />
                  <div style={{ flex: 1, minWidth: 0 }}>
                    <div style={{ fontSize: '.78rem', fontWeight: 600, color: 'var(--text-primary)', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap', marginBottom: 4 }}>
                      {firstName2(op.nome)}
                    </div>
                    {op.pctVerde >= 0 ? (
                      <div style={{ display: 'flex', alignItems: 'center', gap: 8, fontSize: '.68rem' }}>
                        <span style={{ color: 'var(--verde)' }}>{op.kpiVerde} ✓</span>
                        <span style={{ color: 'var(--amarelo)' }}>{op.kpiAmarelo} ⚠</span>
                        <span style={{ color: 'var(--vermelho)' }}>{op.kpiVermelho} ✕</span>
                      </div>
                    ) : (
                      <span style={{ fontSize: '.68rem', color: 'var(--text-muted)' }}>Sem dados</span>
                    )}
                  </div>
                  <div style={{ width: 8, height: 8, borderRadius: '50%', background: cor, flexShrink: 0 }} />
                </div>
              )
            })}
          </div>
          <div style={{ textAlign: 'right', marginTop: '.75rem' }}>
            <Link href="/painel/kpis-equipe" className="dp-see-all">Ver todos →</Link>
          </div>
        </div>

        {/* C — Casos de RV */}
        <div className="card" style={{ padding: '1.25rem' }}>
          <SectionHeader href="/painel/rv-equipe" title="Casos de RV" />
          <div className="divider" style={{ margin: '.75rem 0' }} />
          <div>
            {secaoRV.map(op => {
              const elegivel   = !op.rvSemDados && op.rvElegivel
              const inelegivel = !op.rvSemDados && !op.rvElegivel
              const cor        = inelegivel ? 'var(--vermelho)' : elegivel ? 'var(--verde)' : 'var(--text-muted)'
              const badgeBg    = inelegivel ? 'rgba(239,68,68,.10)' : elegivel ? 'rgba(34,197,94,.10)' : 'rgba(82,106,133,.10)'
              const badgeBdr   = inelegivel ? 'rgba(239,68,68,.25)' : elegivel ? 'rgba(34,197,94,.25)' : 'rgba(82,106,133,.20)'
              const badgeLabel = inelegivel ? 'Inelegível' : elegivel ? 'Elegível' : '—'
              return (
                <div key={op.id} className="dp-list-item" style={{
                  display: 'flex', alignItems: 'center', gap: 10,
                  padding: '.5rem', marginBottom: 2,
                  borderBottom: '1px solid var(--border)',
                  borderLeft: `2px solid ${cor}`,
                  paddingLeft: 8, borderRadius: 4,
                }}>
                  <OpAvatar id={op.id} nome={op.nome} />
                  <div style={{ flex: 1, minWidth: 0 }}>
                    <div style={{ fontSize: '.78rem', fontWeight: 600, color: 'var(--text-primary)', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                      {firstName2(op.nome)}
                    </div>
                  </div>
                  <div style={{ display: 'flex', alignItems: 'center', gap: 6, flexShrink: 0 }}>
                    {elegivel && (
                      <span style={{ fontSize: '.72rem', fontWeight: 700, color: 'var(--gold-light)', fontVariantNumeric: 'tabular-nums' }}>
                        {formatBRL(op.rvFinal)}
                      </span>
                    )}
                    <span style={{
                      fontSize: '.6rem', fontWeight: 700,
                      textTransform: 'uppercase', letterSpacing: '.06em',
                      padding: '.15rem .5rem', borderRadius: 9999,
                      background: badgeBg, color: cor, border: `1px solid ${badgeBdr}`,
                    }}>
                      {badgeLabel}
                    </span>
                  </div>
                </div>
              )
            })}
          </div>
          <div style={{ textAlign: 'right', marginTop: '.75rem' }}>
            <Link href="/painel/rv-equipe" className="dp-see-all">Ver todos →</Link>
          </div>
        </div>

      </div>
    </div>
  )
}
