import { requireGestor } from '@/lib/auth'
import PainelShell from '@/components/PainelShell'
import { buscarMonitoriasAtivas } from '@/lib/monitoria'
import { OPERADORES_DISPLAY } from '@/lib/operadores'
import { META_MONITORIAS } from '@/lib/monitoria-utils'
import MonitoriaClient from './MonitoriaClient'

export const dynamic = 'force-dynamic'

export default async function MonitoriaPage() {
  const profile = await requireGestor()
  const { monitorias } = await buscarMonitoriasAtivas()

  const d = new Date()
  const mesAtual = `${String(d.getMonth() + 1).padStart(2, '0')}/${d.getFullYear()}`

  return (
    <PainelShell profile={profile} title="Monitoria de Qualidade">
      <MonitoriaClient
        initialMonitorias={monitorias}
        operadores={OPERADORES_DISPLAY}
        metaMonitorias={META_MONITORIAS}
        mesAtual={mesAtual}
      />
    </PainelShell>
  )
}
