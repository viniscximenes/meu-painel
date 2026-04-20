import { getProfile } from '@/lib/auth'
import { redirect } from 'next/navigation'
import { getPlanilhaAtiva, getUltimasNPlanilhasHistorico } from '@/lib/sheets'
import { lerKpiHistoricoPlanilha } from '@/lib/historico-kpi'
import { lerKpiLegadoParaHistorico } from '@/lib/meu-kpi-extractor'
import { getMetas } from '@/lib/kpi'
import PainelShell from '@/components/PainelShell'
import Ultimos3MesesClient from './Ultimos3MesesClient'
import type { Ultimos3MesesProps } from './Ultimos3MesesClient'
import { AlertTriangle, History } from 'lucide-react'

export const dynamic = 'force-dynamic'

const cssVars = { '--void2': '#07070f', '--void3': '#0d0d1a' } as React.CSSProperties

export default async function Ultimos3MesesPage() {
  const profile = await getProfile()
  if (profile.role === 'gestor') redirect('/painel')

  const [planilhaAtiva, planilhasHistorico, metas] = await Promise.all([
    getPlanilhaAtiva(),
    getUltimasNPlanilhasHistorico(3),
    getMetas(),
  ])

  let erroGeral: string | null = null
  let dadosProps: Ultimos3MesesProps | null = null

  try {
    const historicos = await Promise.all(
      planilhasHistorico.map(p => {
        const ehAtiva = planilhaAtiva?.id === p.id
        if (ehAtiva) {
          return lerKpiLegadoParaHistorico(p, profile.username, profile.nome, metas)
        }
        return lerKpiHistoricoPlanilha(p, profile.username, profile.nome, metas)
      })
    )

    // Se a planilha ativa não está na lista histórica, insere no topo
    const ativaJaInclusa = planilhaAtiva && planilhasHistorico.some(p => p.id === planilhaAtiva.id)
    let meses = historicos

    if (planilhaAtiva && !ativaJaInclusa) {
      const mesAtiva = await lerKpiLegadoParaHistorico(
        planilhaAtiva, profile.username, profile.nome, metas
      )
      meses = [mesAtiva, ...historicos]
    }

    dadosProps = { meses }
  } catch (e) {
    erroGeral = e instanceof Error ? e.message : 'Erro desconhecido'
  }

  const totalMeses = dadosProps?.meses.length ?? planilhasHistorico.length

  return (
    <PainelShell profile={profile} title="Histórico" iconName="History">
      <div style={cssVars} className="space-y-4 login-grid-bg">
        <GoldLine />

        {/* Header */}
        <div style={{
          background: 'var(--void2)',
          border: '1px solid rgba(201,168,76,0.1)',
          borderRadius: '12px',
          padding: '14px 20px',
          display: 'flex', alignItems: 'center', gap: '12px',
        }}>
          <History size={16} style={{ color: 'rgba(244,212,124,0.7)', flexShrink: 0 }} />
          <span style={{
            fontFamily: 'var(--ff-display)',
            fontSize: '16px', fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.06em',
            background: 'linear-gradient(135deg, #e8c96d 0%, #c9a84c 100%)',
            WebkitBackgroundClip: 'text', WebkitTextFillColor: 'transparent', backgroundClip: 'text',
          }}>
            Últimos 3 Meses
          </span>
          <div style={{ width: '1px', height: '16px', background: 'rgba(201,168,76,0.2)' }} />
          <span style={{ fontSize: '11px', color: 'var(--text-muted)' }}>
            {totalMeses} {totalMeses === 1 ? 'mês disponível' : 'meses disponíveis'}
          </span>
        </div>

        {erroGeral && (
          <div className="flex items-start gap-3 rounded-xl border px-4 py-3"
            style={{ background: 'rgba(239,68,68,0.05)', borderColor: 'rgba(239,68,68,0.2)' }}>
            <AlertTriangle size={15} className="text-rose-400 shrink-0 mt-0.5" />
            <div>
              <p className="text-sm font-medium text-rose-300">Erro ao carregar histórico</p>
              <p className="text-xs mt-0.5 text-rose-500">{erroGeral}</p>
            </div>
          </div>
        )}

        {dadosProps && <Ultimos3MesesClient {...dadosProps} />}
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
