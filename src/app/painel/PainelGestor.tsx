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
  if (count >= META_MONITORIAS) return '#10b981'
  if (count >= 2)               return '#f59e0b'
  return '#f43f5e'
}

function kpiColor(op: OpData): string {
  if (op.pctVerde < 0) return '#475569'
  const max = Math.max(op.kpiVerde, op.kpiAmarelo, op.kpiVermelho)
  if (max === 0)               return '#475569'
  if (op.kpiVerde === max)     return '#10b981'
  if (op.kpiAmarelo === max)   return '#f59e0b'
  return '#f43f5e'
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
        color: '#cbd5e1', textDecoration: 'none',
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
  const metaTotal    = OPERADORES_DISPLAY.length * META_MONITORIAS   // 52
  const pctEnviadas  = metaTotal > 0 ? Math.min(100, Math.round(totalEnviadas / metaTotal * 100)) : 0

  // ── Section data ──────────────────────────────────────────────────────────
  // A: 4 operators with fewest monitorias (most need attention)
  const secaoMonitoria = [...opData]
    .sort((a, b) => a.monitoriaCount - b.monitoriaCount)
    .slice(0, 4)

  // B: last 4 operators in list
  const secaoKPI = opData.slice(-4).reverse()

  // C: RV — ineligible first (up to 2), then eligible, fill to 4
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

      {/* Scoped CSS — hover effects only, no globals.css changes */}
      <style>{`
        .dp-stat-card { transition: border-color .2s, transform .2s, box-shadow .2s; }
        .dp-stat-card:hover { transform: translateY(-2px); box-shadow: 0 8px 32px rgba(0,0,0,.45); }
        .dp-list-item { transition: background .15s; }
        .dp-list-item:hover { background: rgba(26,34,53,.9) !important; }
        .dp-section-link .dp-arrow { opacity: 0; display: inline-block; transition: opacity .15s, transform .15s; }
        .dp-section-link:hover { color: #f8fafc !important; }
        .dp-section-link:hover .dp-arrow { opacity: 1; transform: translateX(3px); }
        .dp-see-all { font-size: .72rem; color: #475569; text-decoration: none; transition: color .15s; }
        .dp-see-all:hover { color: #94a3b8; }
      `}</style>

      {/* ── Header ── */}
      <div className="flex items-start justify-between gap-4 flex-wrap">
        <div>
          <h2 style={{
            fontFamily: 'var(--ff-display)', fontSize: '1.75rem', fontWeight: 800,
            color: '#f1f5f9', letterSpacing: '-0.03em', lineHeight: 1.15,
          }}>
            {saudacao}, {profile.nome.split(' ')[0]}!
          </h2>
          <div className="flex items-center gap-2 mt-2 flex-wrap">
            <span style={{
              width: 7, height: 7, borderRadius: '50%',
              background: '#10b981', display: 'inline-block',
              animation: 'dotPulse 2s ease-in-out infinite', flexShrink: 0,
            }} />
            <span style={{ fontSize: '.75rem', color: '#10b981', fontWeight: 600 }}>Ao vivo</span>
            <span style={{ fontSize: '.75rem', color: '#334155' }}>·</span>
            <span style={{ fontSize: '.75rem', color: '#94a3b8', textTransform: 'capitalize' }}>{mesAnoLabel}</span>
            {dataAtualizacao && (
              <>
                <span style={{ fontSize: '.75rem', color: '#334155' }}>·</span>
                <span style={{ fontSize: '.75rem', color: '#475569' }}>
                  Atualizado até{' '}
                  <span style={{ color: '#94a3b8' }}>{formatarDataPtBR(dataAtualizacao)}</span>
                </span>
              </>
            )}
          </div>
        </div>
        <span style={{
          fontSize: '.7rem', fontWeight: 700, textTransform: 'uppercase', letterSpacing: '.10em',
          color: '#94a3b8', background: 'rgba(255,255,255,.04)',
          border: '1px solid rgba(255,255,255,.08)', borderRadius: 9999,
          padding: '.3rem .875rem', alignSelf: 'flex-start', marginTop: '.25rem', whiteSpace: 'nowrap',
        }}>
          Gestão · Retenção
        </span>
      </div>

      {/* ── 4 Stats Cards ── */}
      <div className="grid grid-cols-2 xl:grid-cols-4 gap-4">

        {/* Card 1 — Operadores */}
        <div className="dp-stat-card animate-fadeUp" style={{
          background: '#111827', borderRadius: 16, padding: '1.25rem',
          border: '1px solid rgba(255,255,255,.07)', overflow: 'hidden',
          animationDelay: '0ms',
        }}>
          <div className="flex items-start justify-between" style={{ marginBottom: '1rem' }}>
            <span style={{ fontSize: '.7rem', fontWeight: 700, textTransform: 'uppercase', letterSpacing: '.08em', color: '#475569' }}>
              Operadores
            </span>
            <div style={{ width: 30, height: 30, borderRadius: 8, background: 'rgba(34,211,238,.10)', display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0 }}>
              <Users size={14} style={{ color: '#22d3ee' }} />
            </div>
          </div>
          <div style={{ fontFamily: 'var(--ff-body)', fontSize: 36, fontWeight: 800, color: '#f1f5f9', lineHeight: 1, letterSpacing: '-.02em', fontVariantNumeric: 'tabular-nums', fontFeatureSettings: '"tnum" 1', display: 'block' }}>
            {OPERADORES_DISPLAY.length}
          </div>
          <div style={{ fontSize: '.72rem', color: '#475569', marginTop: '.5rem' }}>equipe ativa este mês</div>
        </div>

        {/* Card 2 — Meta KPI */}
        <div className="dp-stat-card animate-fadeUp" style={{
          background: '#111827', borderRadius: 16, padding: '1.25rem',
          border: '1px solid rgba(167,139,250,.18)', overflow: 'hidden',
          position: 'relative', animationDelay: '60ms',
        }}>
          <div style={{ position: 'absolute', top: 0, left: 0, right: 0, height: 3, background: 'linear-gradient(90deg,#a78bfa,transparent)' }} />
          <div className="flex items-start justify-between" style={{ marginBottom: '1rem' }}>
            <span style={{ fontSize: '.7rem', fontWeight: 700, textTransform: 'uppercase', letterSpacing: '.08em', color: '#475569' }}>
              Meta KPI
            </span>
            <div style={{ width: 30, height: 30, borderRadius: 8, background: 'rgba(167,139,250,.10)', display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0 }}>
              <TrendingUp size={14} style={{ color: '#a78bfa' }} />
            </div>
          </div>
          <div style={{ fontFamily: 'var(--ff-body)', fontSize: 36, fontWeight: 800, color: '#a78bfa', lineHeight: 1, letterSpacing: '-.02em', fontVariantNumeric: 'tabular-nums', fontFeatureSettings: '"tnum" 1', display: 'block' }}>
            {mediaKPI !== null ? `${mediaKPI}%` : '—'}
          </div>
          <div style={{ fontSize: '.72rem', color: '#475569', marginTop: '.5rem' }}>média geral da equipe</div>
        </div>

        {/* Card 3 — Inelegíveis RV */}
        <div className="dp-stat-card animate-fadeUp" style={{
          background: '#111827', borderRadius: 16, padding: '1.25rem',
          border: '1px solid rgba(244,63,94,.18)', overflow: 'hidden',
          position: 'relative', animationDelay: '120ms',
        }}>
          <div style={{ position: 'absolute', top: 0, left: 0, right: 0, height: 3, background: 'linear-gradient(90deg,#f43f5e,transparent)' }} />
          <div className="flex items-start justify-between" style={{ marginBottom: '1rem' }}>
            <span style={{ fontSize: '.7rem', fontWeight: 700, textTransform: 'uppercase', letterSpacing: '.08em', color: '#475569' }}>
              Inelegíveis RV
            </span>
            <div style={{ width: 30, height: 30, borderRadius: 8, background: 'rgba(244,63,94,.10)', display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0 }}>
              <XCircle size={14} style={{ color: '#f43f5e' }} />
            </div>
          </div>
          <div style={{ fontFamily: 'var(--ff-body)', fontSize: 36, fontWeight: 800, color: '#f43f5e', lineHeight: 1, letterSpacing: '-.02em', fontVariantNumeric: 'tabular-nums', fontFeatureSettings: '"tnum" 1', display: 'block' }}>
            {inelegiveis.length}
            <span style={{ fontSize: 18, fontWeight: 600, color: '#475569' }}>/{OPERADORES_DISPLAY.length}</span>
          </div>
          <div style={{ fontSize: '.72rem', color: '#475569', marginTop: '.5rem' }}>abaixo do limite ABS</div>
        </div>

        {/* Card 4 — Monitoria */}
        <div className="dp-stat-card animate-fadeUp" style={{
          background: '#111827', borderRadius: 16, padding: '1.25rem',
          border: '1px solid rgba(245,158,11,.18)', overflow: 'hidden',
          position: 'relative', animationDelay: '180ms',
        }}>
          <div style={{ position: 'absolute', top: 0, left: 0, right: 0, height: 3, background: 'linear-gradient(90deg,#f59e0b,transparent)' }} />
          <div className="flex items-start justify-between" style={{ marginBottom: '1rem' }}>
            <span style={{ fontSize: '.7rem', fontWeight: 700, textTransform: 'uppercase', letterSpacing: '.08em', color: '#475569' }}>
              Monitoria
            </span>
            <div style={{ width: 30, height: 30, borderRadius: 8, background: 'rgba(245,158,11,.10)', display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0 }}>
              <FileText size={14} style={{ color: '#f59e0b' }} />
            </div>
          </div>
          <div style={{ fontFamily: 'var(--ff-body)', fontSize: 36, fontWeight: 800, color: '#f59e0b', lineHeight: 1, letterSpacing: '-.02em', fontVariantNumeric: 'tabular-nums', fontFeatureSettings: '"tnum" 1', display: 'block' }}>
            {totalEnviadas}
            <span style={{ fontSize: 18, fontWeight: 600, color: '#475569' }}>/{metaTotal}</span>
          </div>
          <div style={{ height: 3, background: 'rgba(255,255,255,.06)', borderRadius: 2, margin: '.625rem 0 0', overflow: 'hidden' }}>
            <div style={{ height: '100%', width: `${pctEnviadas}%`, background: '#f59e0b', borderRadius: 2 }} />
          </div>
          <div style={{ fontSize: '.72rem', color: '#475569', marginTop: '.5rem' }}>enviadas este mês</div>
        </div>

      </div>

      {/* ── 3 Sections ── */}
      <div className="flex flex-col gap-4">

        {/* A — Progresso de Monitoria */}
        <div style={{ background: '#111827', border: '1px solid rgba(255,255,255,.06)', borderRadius: 14, padding: '1.25rem' }}>
          <SectionHeader href="/painel/monitoria" title="Progresso de Monitoria" />
          <div style={{ height: 1, background: 'rgba(255,255,255,.05)', margin: '.75rem 0' }} />
          <div>
            {secaoMonitoria.map(op => {
              const cor = monitoriaColor(op.monitoriaCount)
              const pct = Math.min(100, Math.round((op.monitoriaCount / META_MONITORIAS) * 100))
              return (
                <div key={op.id} className="dp-list-item" style={{
                  display: 'flex', alignItems: 'center', gap: 10,
                  padding: '.5rem', marginBottom: 2,
                  borderBottom: '1px solid rgba(255,255,255,.04)',
                  borderLeft: `2px solid ${cor}`,
                  paddingLeft: 8, borderRadius: 4,
                }}>
                  <OpAvatar id={op.id} nome={op.nome} />
                  <div style={{ flex: 1, minWidth: 0 }}>
                    <div style={{ fontSize: '.78rem', fontWeight: 600, color: '#f1f5f9', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap', marginBottom: 4 }}>
                      {firstName2(op.nome)}
                    </div>
                    <div style={{ height: 3, background: 'rgba(255,255,255,.06)', borderRadius: 2, overflow: 'hidden' }}>
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
        <div style={{ background: '#111827', border: '1px solid rgba(255,255,255,.06)', borderRadius: 14, padding: '1.25rem' }}>
          <SectionHeader href="/painel/kpis-equipe" title="Resultados de KPI" />
          <div style={{ height: 1, background: 'rgba(255,255,255,.05)', margin: '.75rem 0' }} />
          <div>
            {secaoKPI.map(op => {
              const cor = kpiColor(op)
              return (
                <div key={op.id} className="dp-list-item" style={{
                  display: 'flex', alignItems: 'center', gap: 10,
                  padding: '.5rem', marginBottom: 2,
                  borderBottom: '1px solid rgba(255,255,255,.04)',
                  borderLeft: `2px solid ${cor}`,
                  paddingLeft: 8, borderRadius: 4,
                }}>
                  <OpAvatar id={op.id} nome={op.nome} />
                  <div style={{ flex: 1, minWidth: 0 }}>
                    <div style={{ fontSize: '.78rem', fontWeight: 600, color: '#f1f5f9', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap', marginBottom: 4 }}>
                      {firstName2(op.nome)}
                    </div>
                    {op.pctVerde >= 0 ? (
                      <div style={{ display: 'flex', alignItems: 'center', gap: 8, fontSize: '.68rem' }}>
                        <span style={{ color: '#10b981' }}>{op.kpiVerde} ✓</span>
                        <span style={{ color: '#f59e0b' }}>{op.kpiAmarelo} ⚠</span>
                        <span style={{ color: '#f43f5e' }}>{op.kpiVermelho} ✕</span>
                      </div>
                    ) : (
                      <span style={{ fontSize: '.68rem', color: '#475569' }}>Sem dados</span>
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
        <div style={{ background: '#111827', border: '1px solid rgba(255,255,255,.06)', borderRadius: 14, padding: '1.25rem' }}>
          <SectionHeader href="/painel/rv-equipe" title="Casos de RV" />
          <div style={{ height: 1, background: 'rgba(255,255,255,.05)', margin: '.75rem 0' }} />
          <div>
            {secaoRV.map(op => {
              const elegivel   = !op.rvSemDados && op.rvElegivel
              const inelegivel = !op.rvSemDados && !op.rvElegivel
              const cor        = inelegivel ? '#f43f5e' : elegivel ? '#10b981' : '#475569'
              const badgeBg    = inelegivel ? 'rgba(244,63,94,.10)' : elegivel ? 'rgba(16,185,129,.10)' : 'rgba(71,85,105,.10)'
              const badgeBdr   = inelegivel ? 'rgba(244,63,94,.25)' : elegivel ? 'rgba(16,185,129,.25)' : 'rgba(71,85,105,.25)'
              const badgeLabel = inelegivel ? 'Inelegível' : elegivel ? 'Elegível' : '—'
              return (
                <div key={op.id} className="dp-list-item" style={{
                  display: 'flex', alignItems: 'center', gap: 10,
                  padding: '.5rem', marginBottom: 2,
                  borderBottom: '1px solid rgba(255,255,255,.04)',
                  borderLeft: `2px solid ${cor}`,
                  paddingLeft: 8, borderRadius: 4,
                }}>
                  <OpAvatar id={op.id} nome={op.nome} />
                  <div style={{ flex: 1, minWidth: 0 }}>
                    <div style={{ fontSize: '.78rem', fontWeight: 600, color: '#f1f5f9', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                      {firstName2(op.nome)}
                    </div>
                  </div>
                  <div style={{ display: 'flex', alignItems: 'center', gap: 6, flexShrink: 0 }}>
                    {elegivel && (
                      <span style={{ fontSize: '.72rem', fontWeight: 700, color: '#f59e0b', fontVariantNumeric: 'tabular-nums' }}>
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
