import { Profile } from '@/types'
import { OPERADORES_DISPLAY, getIniciaisNome, getAvatarStyle } from '@/lib/operadores'
import { getMetas, computarKPIs } from '@/lib/kpi'
import { normalizarChave, type KPIItem } from '@/lib/kpi-utils'
import {
  getPlanilhaAtiva, buscarLinhasPlanilha, encontrarColunaIdent,
  extrairDataAtualizacao, formatarDataPtBR, matchCelulaOperador,
} from '@/lib/sheets'
import { getRVConfig, calcularRV, formatBRL } from '@/lib/rv'
import { buscarMonitoriasAtivas } from '@/lib/monitoria'
import { META_MONITORIAS, mesDeData } from '@/lib/monitoria-utils'
import Link from 'next/link'
import {
  Users, TrendingUp, XCircle, FileText,
  BarChart2, DollarSign, ClipboardCheck, CalendarDays,
  AlertTriangle, CheckCircle,
} from 'lucide-react'

// ── Types ─────────────────────────────────────────────────────────────────────

interface PainelGestorProps { profile: Profile }

interface OpData {
  id: number; nome: string; username: string
  kpiVerde: number; kpiAmarelo: number; kpiVermelho: number
  pctVerde: number
  rvElegivel: boolean; rvFinal: number; rvSemDados: boolean
  monitoriaCount: number
}

interface AlertaOp { id: number; nome: string; valor: string }

// ── Detecção de KPI por label/nome_coluna ─────────────────────────────────────

function isTmaKpi(k: KPIItem): boolean {
  const c = normalizarChave(k.nome_coluna)
  const l = normalizarChave(k.label)
  return c.includes('tma') || l.includes('tma') ||
    c.includes('tempo medio') || c.includes('tempo médio') ||
    l.includes('tempo medio') || l.includes('tempo médio')
}

function isAbsKpi(k: KPIItem): boolean {
  const c = normalizarChave(k.nome_coluna)
  const l = normalizarChave(k.label)
  return c === 'abs' || c.includes('absenteismo') || c.includes('absenteísmo') ||
    c.includes('ausencia') || c.includes('ausência') ||
    l.includes('abs') || l.includes('absenteismo') || l.includes('absenteísmo')
}

function isRetencaoKpi(k: KPIItem): boolean {
  const c = normalizarChave(k.nome_coluna)
  const l = normalizarChave(k.label)
  return c.includes('retenc') || c.includes('retenç') ||
    l.includes('retenc') || l.includes('retenç')
}

// ── Pure helpers ──────────────────────────────────────────────────────────────

function firstName2(nome: string): string {
  const p = nome.split(' ')
  return p[1] ? `${p[0]} ${p[1]}` : p[0]
}

// ── Sub-components ────────────────────────────────────────────────────────────

function OpAvatar({ id, nome }: { id: number; nome: string }) {
  return (
    <div style={{
      ...getAvatarStyle(id),
      width: 28, height: 28, borderRadius: 7, border: '1px solid',
      display: 'flex', alignItems: 'center', justifyContent: 'center',
      fontSize: '.58rem', fontWeight: 700, flexShrink: 0,
    }}>
      {getIniciaisNome(nome)}
    </div>
  )
}

function AlertRow({ op }: { op: AlertaOp }) {
  return (
    <div style={{
      display: 'flex', alignItems: 'center', gap: 10,
      padding: '.45rem .5rem', borderRadius: 6,
      borderLeft: '2px solid var(--vermelho)',
      background: 'rgba(239,68,68,0.04)',
      marginBottom: 4,
    }}>
      <OpAvatar id={op.id} nome={op.nome} />
      <span style={{ flex: 1, fontSize: '.78rem', fontWeight: 500, color: 'var(--text-primary)', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
        {firstName2(op.nome)}
      </span>
      <span style={{ fontSize: '.78rem', fontWeight: 700, color: 'var(--vermelho)', flexShrink: 0, fontVariantNumeric: 'tabular-nums' }}>
        {op.valor}
      </span>
    </div>
  )
}

function AlertGroup({ title, items }: { title: string; items: AlertaOp[] }) {
  return (
    <div>
      <div style={{ display: 'flex', alignItems: 'center', gap: 6, marginBottom: 8 }}>
        <AlertTriangle size={11} style={{ color: 'var(--vermelho)', flexShrink: 0 }} />
        <span style={{ fontSize: '.7rem', fontWeight: 700, textTransform: 'uppercase', letterSpacing: '.08em', color: 'var(--text-secondary)' }}>
          {title}
        </span>
        {items.length > 0 && (
          <span style={{ fontSize: '.65rem', fontWeight: 700, padding: '.1rem .45rem', borderRadius: 9999, background: 'rgba(239,68,68,0.12)', color: 'var(--vermelho)', border: '1px solid rgba(239,68,68,0.2)' }}>
            {items.length}
          </span>
        )}
      </div>
      {items.length === 0 ? (
        <div style={{ display: 'flex', alignItems: 'center', gap: 6, padding: '.4rem .5rem' }}>
          <CheckCircle size={11} style={{ color: 'var(--verde)', flexShrink: 0 }} />
          <span style={{ fontSize: '.75rem', color: 'var(--text-muted)' }}>Nenhuma ocorrência</span>
        </div>
      ) : (
        items.map((op) => <AlertRow key={op.id} op={op} />)
      )}
    </div>
  )
}

// ── Main component ────────────────────────────────────────────────────────────

export default async function PainelGestor({ profile }: PainelGestorProps) {
  const hora = new Date().getHours()
  const saudacao = hora < 12 ? 'Bom dia' : hora < 18 ? 'Boa tarde' : 'Boa noite'
  const now = new Date()
  const mesAtual    = `${String(now.getMonth() + 1).padStart(2, '0')}/${now.getFullYear()}`
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

  // Alertas por categoria
  const alertasTMA:      AlertaOp[] = []
  const alertasABS:      AlertaOp[] = []
  const alertasRetencao: AlertaOp[] = []

  // Monitoria: mês atual, verde only
  const monitoriasMes = monitorias.filter(m =>
    mesDeData(m.dataAtendimento) === mesAtual && m.status === 'verde'
  )
  for (const op of opData) {
    op.monitoriaCount = monitoriasMes.filter(m => m.colaborador === op.nome).length
  }

  // KPI + RV from planilha
  if (planilha && metas.length > 0) {
    try {
      const { headers, rows } = await buscarLinhasPlanilha(planilha.spreadsheet_id, planilha.aba)
      const col = encontrarColunaIdent(headers)
      dataAtualizacao = extrairDataAtualizacao(rows)

      for (const op of opData) {
        const row = rows.find(r => matchCelulaOperador(r[col] ?? '', op.username, op.nome))
        if (!row) continue

        const kpis    = computarKPIs(headers, row, metas)
        const comMeta = kpis.filter((k: KPIItem) => k.status !== 'neutro')
        op.kpiVerde    = kpis.filter((k: KPIItem) => k.status === 'verde').length
        op.kpiAmarelo  = kpis.filter((k: KPIItem) => k.status === 'amarelo').length
        op.kpiVermelho = kpis.filter((k: KPIItem) => k.status === 'vermelho').length
        op.pctVerde    = comMeta.length > 0 ? op.kpiVerde / comMeta.length : -1

        // Alertas
        for (const k of kpis) {
          if (k.status !== 'vermelho') continue
          if (isTmaKpi(k))      alertasTMA.push({ id: op.id, nome: op.nome, valor: k.valor })
          if (isAbsKpi(k))      alertasABS.push({ id: op.id, nome: op.nome, valor: k.valor })
          if (isRetencaoKpi(k)) alertasRetencao.push({ id: op.id, nome: op.nome, valor: k.valor })
        }

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

  // Aggregate stats
  const opsComKPI   = opData.filter(op => op.pctVerde >= 0)
  const mediaKPI    = opsComKPI.length > 0
    ? Math.round(opsComKPI.reduce((s, op) => s + op.pctVerde * 100, 0) / opsComKPI.length)
    : null
  const inelegiveis   = opData.filter(op => !op.rvElegivel && !op.rvSemDados)
  const totalEnviadas = monitoriasMes.length
  const metaTotal     = OPERADORES_DISPLAY.length * META_MONITORIAS
  const pctEnviadas   = metaTotal > 0 ? Math.min(100, Math.round(totalEnviadas / metaTotal * 100)) : 0

  const totalAlertas = alertasTMA.length + alertasABS.length + alertasRetencao.length

  // Quick access
  const quickLinks = [
    {
      href: '/painel/kpis-equipe',
      icon: BarChart2,
      title: 'KPIs da Equipe',
      desc: 'Resultados e status por operador',
      color: '#a78bfa',
      glow: 'rgba(167,139,250,0.10)',
    },
    {
      href: '/painel/rv-equipe',
      icon: DollarSign,
      title: 'RV da Equipe',
      desc: 'Elegibilidade e valores de RV',
      color: '#10b981',
      glow: 'rgba(16,185,129,0.10)',
    },
    {
      href: '/painel/monitoria',
      icon: ClipboardCheck,
      title: 'Monitoria',
      desc: 'Envio e progresso de monitorias',
      color: '#e8c96d',
      glow: 'rgba(201,168,76,0.10)',
    },
    {
      href: '/painel/semanal',
      icon: CalendarDays,
      title: 'Acompanhamento Semanal',
      desc: 'Evolução semanal de KPIs',
      color: '#22d3ee',
      glow: 'rgba(34,211,238,0.10)',
    },
  ]

  // Render
  return (
    <div className="space-y-8">

      {/* Scoped CSS */}
      <style>{`
        .dp-stat-card { transition: border-color .2s, transform .2s, box-shadow .2s; }
        .dp-stat-card:hover { transform: translateY(-2px); box-shadow: var(--shadow-gold); }
        .dp-quick-card { transition: border-color .2s, background .2s, transform .15s; }
        .dp-quick-card:hover { border-color: rgba(201,168,76,0.4) !important; background: rgba(201,168,76,0.04) !important; transform: translateY(-1px); }
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
          <div style={{ position: 'absolute', top: 0, left: 0, right: 0, height: 3, background: 'linear-gradient(90deg,var(--gold),transparent)' }} />
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

      {/* ── Alertas do dia ── */}
      <div className="card" style={{ padding: '1.5rem' }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 10, marginBottom: '1.25rem' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
            <span style={{
              fontFamily: 'var(--ff-display)', fontSize: '.8rem', fontWeight: 700,
              textTransform: 'uppercase', letterSpacing: '.1em', color: 'var(--text-secondary)',
            }}>
              Alertas do dia
            </span>
            {totalAlertas > 0 && (
              <span style={{
                fontSize: '.65rem', fontWeight: 700, padding: '.15rem .55rem', borderRadius: 9999,
                background: 'rgba(239,68,68,0.12)', color: 'var(--vermelho)',
                border: '1px solid rgba(239,68,68,0.2)',
              }}>
                {totalAlertas} ocorrência{totalAlertas !== 1 ? 's' : ''}
              </span>
            )}
          </div>
          <div style={{ flex: 1, height: 1, background: 'linear-gradient(90deg,rgba(201,168,76,0.15) 0%,transparent 100%)' }} />
        </div>

        <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
          <AlertGroup title="TMA acima da meta" items={alertasTMA} />
          <AlertGroup title="ABS acima do limite" items={alertasABS} />
          <AlertGroup title="Tx. Retenção abaixo de 60%" items={alertasRetencao} />
        </div>
      </div>

      {/* ── Acesso rápido ── */}
      <div>
        <div style={{ display: 'flex', alignItems: 'center', gap: 10, marginBottom: '1rem' }}>
          <span style={{
            fontFamily: 'var(--ff-display)', fontSize: '.8rem', fontWeight: 700,
            textTransform: 'uppercase', letterSpacing: '.1em', color: 'var(--text-secondary)',
          }}>
            Acesso rápido
          </span>
          <div style={{ flex: 1, height: 1, background: 'linear-gradient(90deg,rgba(201,168,76,0.15) 0%,transparent 100%)' }} />
        </div>

        <div className="grid grid-cols-2 xl:grid-cols-4 gap-4">
          {quickLinks.map(({ href, icon: Icon, title, desc, color, glow }) => (
            <Link
              key={href}
              href={href}
              className="dp-quick-card"
              style={{
                display: 'block', textDecoration: 'none',
                background: 'var(--card-bg)',
                border: '1px solid rgba(201,168,76,0.1)',
                borderRadius: 14,
                padding: '1.1rem 1.25rem',
                position: 'relative', overflow: 'hidden',
              }}
            >
              <div style={{
                width: 36, height: 36, borderRadius: 10,
                background: glow,
                display: 'flex', alignItems: 'center', justifyContent: 'center',
                marginBottom: '.875rem', flexShrink: 0,
              }}>
                <Icon size={17} style={{ color }} />
              </div>
              <p style={{ fontSize: '.82rem', fontWeight: 700, color: 'var(--text-primary)', marginBottom: '.3rem', lineHeight: 1.3 }}>
                {title}
              </p>
              <p style={{ fontSize: '.7rem', color: 'var(--text-muted)', lineHeight: 1.45 }}>
                {desc}
              </p>
            </Link>
          ))}
        </div>
      </div>

    </div>
  )
}
