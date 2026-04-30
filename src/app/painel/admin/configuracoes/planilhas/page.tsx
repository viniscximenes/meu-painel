import { requireAdmin } from '@/lib/auth'
import PainelShell from '@/components/PainelShell'
import { PainelHeader, LinhaHorizontalDourada } from '@/components/painel/PainelHeader'
import { getPlanilhaPorTipo, listarAbas, getMapeamentoKpiColunas, getMapeamentoKpiGestorColunas } from '@/lib/sheets'
import { getMapeamentoQuartil } from '@/lib/quartil-config'
import PlanilhasConfigClient from './PlanilhasConfigClient'

export const dynamic = 'force-dynamic'

export default async function AjustePlanilhasPage() {
  const profile = await requireAdmin()

  const [mesAtual, mesPassado, kpiQuartil] = await Promise.all([
    getPlanilhaPorTipo('mes_atual'),
    getPlanilhaPorTipo('mes_passado'),
    getPlanilhaPorTipo('kpi_quartil'),
  ])

  const [abasMesAtual, abasMesPassado, abasKpiQuartil, mapeamento, mapeamentoGestor, mapeamentoQuartil] = await Promise.all([
    mesAtual   ? listarAbas(mesAtual.spreadsheet_id).catch(() => [])   : Promise.resolve([]),
    mesPassado ? listarAbas(mesPassado.spreadsheet_id).catch(() => []) : Promise.resolve([]),
    kpiQuartil ? listarAbas(kpiQuartil.spreadsheet_id).catch(() => []) : Promise.resolve([]),
    getMapeamentoKpiColunas(),
    getMapeamentoKpiGestorColunas(),
    getMapeamentoQuartil(),
  ])

  return (
    <PainelShell profile={profile} title="Ajuste de Planilhas" iconName="Settings">
      <div className="space-y-6">
        <div className="space-y-4">
          <PainelHeader titulo="Ajuste de Planilhas" mesLabel="" />
          <LinhaHorizontalDourada />
        </div>
        <PlanilhasConfigClient
          mesAtual={mesAtual}          abasMesAtual={abasMesAtual}
          mesPassado={mesPassado}      abasMesPassado={abasMesPassado}
          kpiQuartil={kpiQuartil}      abasKpiQuartil={abasKpiQuartil}
          mapeamentoInicial={mapeamento}
          mapeamentoGestorInicial={mapeamentoGestor}
          mapeamentoQuartilInicial={mapeamentoQuartil}
        />
      </div>
    </PainelShell>
  )
}
