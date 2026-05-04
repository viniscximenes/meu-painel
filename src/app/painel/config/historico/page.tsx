import { requireAdmin } from '@/lib/auth'
import { listarPlanilhas } from '@/lib/sheets'
import PainelShell from '@/components/PainelShell'
import { PainelHeader, LinhaHorizontalDourada } from '@/components/painel/PainelHeader'
import HistoricoConfigClient from './HistoricoConfigClient'

export const dynamic = 'force-dynamic'

export default async function AjusteHistoricoPage() {
  const profile = await requireAdmin()
  const todasPlanilhas = await listarPlanilhas().catch(() => [])
  const planilhas = todasPlanilhas.filter(p => p.tipo !== 'mes_atual' && p.tipo !== 'kpi_quartil')

  const n = planilhas.length
  const mesLabel = n === 0 ? 'NENHUM MÊS DISPONÍVEL' : n === 1 ? '1 MÊS PARA ANÁLISE' : `${n} MESES PARA ANÁLISE`

  return (
    <PainelShell profile={profile} title="Ajuste de Histórico" iconName="Settings">
      <div className="space-y-6 regiao-cards-painel">
        <PainelHeader titulo="AJUSTE DE HISTÓRICO" mesLabel={mesLabel} />
        <LinhaHorizontalDourada />
        <HistoricoConfigClient planilhas={planilhas} />
      </div>
    </PainelShell>
  )
}
