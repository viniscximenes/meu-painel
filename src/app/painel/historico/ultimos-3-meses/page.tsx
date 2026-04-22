import { getProfile } from '@/lib/auth'
import { redirect } from 'next/navigation'
import { getPlanilhaAtiva, getUltimasNPlanilhasHistorico } from '@/lib/sheets'
import { lerKpiHistoricoPlanilha } from '@/lib/historico-kpi'
import { lerKpiLegadoParaHistorico } from '@/lib/meu-kpi-extractor'
import PainelShell from '@/components/PainelShell'
import Ultimos3MesesClient from './Ultimos3MesesClient'
import type { Ultimos3MesesProps } from './Ultimos3MesesClient'
import { AlertTriangle } from 'lucide-react'

export const dynamic = 'force-dynamic'

export default async function Ultimos3MesesPage() {
  const profile = await getProfile()
  if (profile.role === 'gestor') redirect('/painel')

  const [planilhaAtiva, planilhasHistorico] = await Promise.all([
    getPlanilhaAtiva(),
    getUltimasNPlanilhasHistorico(3),
  ])

  let erroGeral: string | null = null
  let dadosProps: Ultimos3MesesProps | null = null

  try {
    const historicos = await Promise.all(
      planilhasHistorico.map(p => {
        const ehAtiva = planilhaAtiva?.id === p.id
        if (ehAtiva) {
          return lerKpiLegadoParaHistorico(p, profile.username, profile.nome)
        }
        return lerKpiHistoricoPlanilha(p, profile.username, profile.nome)
      })
    )

    const ativaJaInclusa = planilhaAtiva && planilhasHistorico.some(p => p.id === planilhaAtiva.id)
    let meses = historicos

    if (planilhaAtiva && !ativaJaInclusa) {
      const mesAtiva = await lerKpiLegadoParaHistorico(
        planilhaAtiva, profile.username, profile.nome
      )
      meses = [mesAtiva, ...historicos]
    }

    dadosProps = { meses }
  } catch (e) {
    erroGeral = e instanceof Error ? e.message : 'Erro desconhecido'
  }

  return (
    <PainelShell profile={profile} title="Histórico" iconName="History">
      {erroGeral && (
        <div style={{
          background: 'rgba(248, 113, 113, 0.08)',
          border: '1px solid rgba(248, 113, 113, 0.30)',
          borderRadius: '10px',
          padding: '12px 16px',
          display: 'flex', alignItems: 'flex-start', gap: '10px',
          marginBottom: '16px',
          backdropFilter: 'blur(12px)',
          WebkitBackdropFilter: 'blur(12px)',
        }}>
          <AlertTriangle size={15} style={{ color: '#f87171', flexShrink: 0, marginTop: '2px' }} />
          <div>
            <p style={{ fontFamily: 'var(--ff-body)', fontSize: '13px', fontWeight: 600, color: '#fca5a5', margin: 0 }}>
              Erro ao carregar histórico
            </p>
            <p style={{ fontFamily: 'var(--ff-body)', fontSize: '12px', color: 'rgba(255,255,255,0.60)', margin: '2px 0 0' }}>
              {erroGeral}
            </p>
          </div>
        </div>
      )}
      {dadosProps && <Ultimos3MesesClient {...dadosProps} />}
    </PainelShell>
  )
}
