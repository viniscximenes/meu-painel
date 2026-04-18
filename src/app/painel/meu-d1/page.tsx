import { getProfile } from '@/lib/auth'
import { redirect } from 'next/navigation'
import { getPlanilhaAtiva, buscarLinhasPlanilha, encontrarColunaIdent, matchCelulaOperador } from '@/lib/sheets'
import { lerAbaD1, matchEmailD1 } from '@/lib/d1-sheets'
import { getAppConfig } from '@/lib/app-config'
import PainelShell from '@/components/PainelShell'
import MeuD1Client from './MeuD1Client'
import type { MeuD1Props } from './MeuD1Client'
import { AlertTriangle, Settings } from 'lucide-react'
import Link from 'next/link'

export const dynamic = 'force-dynamic'

const cssVars = { '--void2': '#07070f', '--void3': '#0d0d1a' } as React.CSSProperties

// ── Dias úteis (seg–sáb) do mês ───────────────────────────────────────────────

function calcDiasUteis(ano: number, mes: number): { total: number; passados: number; restantes: number } {
  const hoje      = new Date()
  const diaHoje   = hoje.getDate()
  const diasNoMes = new Date(ano, mes, 0).getDate()

  let total    = 0
  let passados = 0

  for (let d = 1; d <= diasNoMes; d++) {
    const dow = new Date(ano, mes - 1, d).getDay()
    if (dow === 0) continue  // pular domingo
    total++
    if (d <= diaHoje) passados++
  }

  return { total, passados, restantes: Math.max(0, total - passados) }
}

// ── Parser de número genérico ─────────────────────────────────────────────────

function parseNumKpi(v: string | undefined): number {
  if (!v) return 0
  const s = v.toString().replace(/[%\s]/g, '').replace(',', '.')
  const n = parseFloat(s)
  return isNaN(n) ? 0 : n
}

export default async function MeuD1Page() {
  const profile = await getProfile()
  if (profile.role === 'gestor') redirect('/painel')

  const [planilha, limiteRaw] = await Promise.all([
    getPlanilhaAtiva().catch(() => null),
    getAppConfig('kpi_consolidado_limite_linhas').catch(() => null),
  ])
  const limiteLinhas = limiteRaw ? parseInt(limiteRaw, 10) : 50

  const agora    = new Date()
  const mesAtual = agora.getMonth() + 1
  const anoAtual = agora.getFullYear()
  const mesLabel = agora.toLocaleDateString('pt-BR', { month: 'long', year: 'numeric' }).toUpperCase()

  if (!planilha) {
    return (
      <PainelShell profile={profile} title="D-1" iconName="TrendingUp">
        <div style={cssVars} className="space-y-4">
          <GoldLine />
          <EmptyState icon={<Settings size={24} style={{ color: 'var(--gold)' }} />}>
            <strong>Planilha não configurada</strong>
            <span style={{ color: 'var(--text-muted)', fontSize: '13px' }}>A supervisão ainda não ativou nenhuma planilha.</span>
            <Link href="/painel/config" className="btn-secondary text-xs">Configurar planilha</Link>
          </EmptyState>
        </div>
      </PainelShell>
    )
  }

  let dadosProps: MeuD1Props | null = null
  let erroSheets: string | null = null

  try {
    const [kpiData, d1Data] = await Promise.all([
      buscarLinhasPlanilha(planilha.spreadsheet_id, planilha.aba, limiteLinhas),
      lerAbaD1(planilha.spreadsheet_id).catch(() => null),
    ])

    // ── KPI acumulado ──────────────────────────────────────────────────────────
    const col    = encontrarColunaIdent(kpiData.headers)
    const meuRow = kpiData.rows.find(r => matchCelulaOperador(r[col] ?? '', profile.username, profile.nome))

    const pedidosKpi    = parseNumKpi(meuRow?.[4])
    const canceladosKpi = parseNumKpi(meuRow?.[8])
    const retidosKpi    = parseNumKpi(meuRow?.[14])
    const taxaKpiRaw    = parseNumKpi(meuRow?.[17])
    // taxa pode vir como 0.665 (fração) ou 66.5 (percentual)
    const taxaKpi       = taxaKpiRaw > 1 ? taxaKpiRaw : taxaKpiRaw * 100

    // ── D-1 do operador ────────────────────────────────────────────────────────
    const meuD1 = d1Data?.operadores.find(op =>
      matchEmailD1(op.email, profile.username, profile.nome)
    ) ?? null

    const semDadosD1   = !meuD1 || meuD1.txRetencao === null
    const retidosD1    = meuD1?.retidos    ?? 0
    const canceladosD1 = meuD1?.cancelados ?? 0
    const pedidosD1    = meuD1?.pedidos    ?? 0

    // ── Estimado ───────────────────────────────────────────────────────────────
    const retidosEst    = retidosKpi    + retidosD1
    const canceladosEst = canceladosKpi + canceladosD1
    const pedidosEst    = pedidosKpi    + pedidosD1
    const taxaEst       = pedidosEst > 0 ? (retidosEst / pedidosEst) * 100 : taxaKpi
    const deltaTaxa     = taxaEst - taxaKpi

    // ── Projeção mensal ────────────────────────────────────────────────────────
    const { total: diasUteisNoMes, passados: diasPassados, restantes: diasRestantes } =
      calcDiasUteis(anoAtual, mesAtual)

    const retidosNecessariosTotal     = 0.66 * pedidosEst
    const retidosFaltam               = retidosNecessariosTotal - retidosEst
    const retidosPorDiaNecessario     = diasRestantes > 0 ? retidosFaltam / diasRestantes : retidosFaltam
    const jaEstaNaMeta                = taxaEst >= 66
    const mediaDiariaRetidosEst       = diasPassados > 0 ? retidosEst / diasPassados : 0

    dadosProps = {
      nomeOperador:          profile.nome,
      mesLabel,
      ultimaAtualizacao:     d1Data?.ultimaAtualizacao ?? null,
      retidosKpi,
      canceladosKpi,
      pedidosKpi,
      taxaKpi,
      retidosD1,
      canceladosD1,
      pedidosD1,
      semDadosD1,
      retidosEst,
      canceladosEst,
      pedidosEst,
      taxaEst,
      deltaTaxa,
      diasUteisNoMes,
      diasPassados,
      diasRestantes,
      retidosPorDiaNecessario,
      jaEstaNaMeta,
      mediaDiariaRetidosEst,
    }
  } catch (e) {
    erroSheets = e instanceof Error ? e.message : 'Erro desconhecido'
  }

  return (
    <PainelShell profile={profile} title="D-1" iconName="TrendingUp">
      <div style={cssVars} className="space-y-4">
        <GoldLine />

        {/* Header */}
        <div style={{
          background: 'var(--void2)',
          border: '1px solid rgba(201,168,76,0.1)',
          borderRadius: '14px',
          padding: '14px 20px',
          display: 'flex',
          alignItems: 'center',
          gap: '16px',
          flexWrap: 'wrap',
        }}>
          <span style={{
            fontFamily: 'var(--ff-display)',
            fontSize: '16px', fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.06em',
            background: 'linear-gradient(135deg, #e8c96d 0%, #c9a84c 100%)',
            WebkitBackgroundClip: 'text', WebkitTextFillColor: 'transparent', backgroundClip: 'text',
          }}>
            D-1
          </span>
          <div style={{ width: '1px', height: '16px', background: 'rgba(201,168,76,0.2)' }} />
          <span style={{ fontSize: '11px', textTransform: 'uppercase', letterSpacing: '0.06em', color: 'var(--text-muted)' }}>
            {dadosProps?.nomeOperador.split(' ').slice(0, 2).join(' ')}
          </span>
          <div style={{ width: '1px', height: '16px', background: 'rgba(201,168,76,0.2)' }} />
          <span style={{ fontSize: '11px', color: 'var(--text-muted)' }}>{mesLabel}</span>
          {dadosProps?.ultimaAtualizacao && (
            <>
              <div style={{ width: '1px', height: '16px', background: 'rgba(201,168,76,0.2)' }} />
              <span style={{ fontSize: '11px', color: 'var(--text-muted)' }}>
                Atualizado {dadosProps.ultimaAtualizacao}
              </span>
            </>
          )}
        </div>

        {erroSheets && (
          <div className="flex items-start gap-3 rounded-xl border px-4 py-3"
            style={{ background: 'rgba(239,68,68,0.05)', borderColor: 'rgba(239,68,68,0.2)' }}>
            <AlertTriangle size={15} className="text-rose-400 shrink-0 mt-0.5" />
            <div>
              <p className="text-sm font-medium text-rose-300">Erro ao carregar dados</p>
              <p className="text-xs mt-0.5 text-rose-500">{erroSheets}</p>
            </div>
          </div>
        )}

        {dadosProps && <MeuD1Client {...dadosProps} />}
      </div>
    </PainelShell>
  )
}

function GoldLine() {
  return (
    <div style={{
      height: '1px',
      background: 'linear-gradient(90deg, transparent 0%, #c9a84c 25%, #e8c96d 50%, #c9a84c 75%, transparent 100%)',
    }} />
  )
}

function EmptyState({ icon, children }: { icon: React.ReactNode; children: React.ReactNode }) {
  return (
    <div className="flex flex-col items-center justify-center min-h-[50vh] gap-4 text-center">
      <div className="w-14 h-14 rounded-2xl flex items-center justify-center"
        style={{ background: 'rgba(201,168,76,0.08)', border: '1px solid rgba(201,168,76,0.10)' }}>
        {icon}
      </div>
      <div className="flex flex-col items-center gap-2">{children}</div>
    </div>
  )
}
