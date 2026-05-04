import { requireAdmin } from '@/lib/auth'
import PainelShell from '@/components/PainelShell'
import { getRVConfigRaw } from '@/lib/rv'
import { getMetas } from '@/lib/kpi'
import RVConfigForm from './RVConfigForm'
import { PainelHeader, LinhaHorizontalDourada } from '@/components/painel/PainelHeader'

export const dynamic = 'force-dynamic'

export default async function RVConfigPage() {
  const profile = await requireAdmin()
  const [raw, metas] = await Promise.all([getRVConfigRaw(), getMetas()])

  return (
    <PainelShell profile={profile} title="Ajuste de RV" iconName="Settings">
      <div className="space-y-8 regiao-cards-painel">
        <PainelHeader titulo="AJUSTE DE RV" mesLabel="" />
        <LinhaHorizontalDourada />
        <RVConfigForm raw={raw} metas={metas} />
      </div>
    </PainelShell>
  )
}
