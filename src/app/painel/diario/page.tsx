import { requireGestorOuAdmin } from '@/lib/auth'
import { buscarDiarioAtivo } from '@/lib/diario'
import PainelShell from '@/components/PainelShell'
import DiarioClient from './DiarioClient'

export const dynamic = 'force-dynamic'

const MESES = ['Janeiro','Fevereiro','Março','Abril','Maio','Junho','Julho','Agosto','Setembro','Outubro','Novembro','Dezembro']

export default async function DiarioPage() {
  const profile = await requireGestorOuAdmin()
  const { registros } = await buscarDiarioAtivo()

  const agora = new Date()
  const mesLabel = `${MESES[agora.getMonth()]} ${agora.getFullYear()}`

  return (
    <PainelShell profile={profile} title="Diário de Bordo">
      <DiarioClient registros={registros} mesLabel={mesLabel} />
    </PainelShell>
  )
}
