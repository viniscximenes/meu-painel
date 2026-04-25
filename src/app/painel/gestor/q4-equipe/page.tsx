import { requireGestorOuAdmin } from '@/lib/auth'
import { getPlanilhaAtiva } from '@/lib/sheets'
import { lerQuartilEquipe } from '@/lib/quartil-sheets'
import { OPERADORES_DISPLAY } from '@/lib/operadores'
import PainelShell from '@/components/PainelShell'
import QuartilEquipeClient from './QuartilEquipeClient'
import type { OperadorQuartilData } from './QuartilEquipeClient'

export const dynamic = 'force-dynamic'

export default async function Q4EquipePage() {
  const profile = await requireGestorOuAdmin()

  const mesLabel = new Date().toLocaleDateString('pt-BR', { month: 'long', year: 'numeric' }).toUpperCase()

  const planilha = await getPlanilhaAtiva().catch(() => null)

  if (!planilha) {
    return (
      <PainelShell profile={profile} title="Q4 Equipe" iconName="Trophy">
        <QuartilEquipeClient operadores={[]} dataAtualizacao={null} mesLabel={mesLabel} />
      </PainelShell>
    )
  }

  const usernames = OPERADORES_DISPLAY.map(op => op.username)
  const topicos = await lerQuartilEquipe(planilha.spreadsheet_id, usernames)

  const dataAtualizacao = topicos.find(t => t.id === 'txretencao')?.dataAtualizacao ?? null

  // Agrupar por operador, só quem tem quartil 4 em pelo menos uma métrica
  const opMap = new Map<string, OperadorQuartilData>()
  for (const topico of topicos) {
    for (const op of topico.operadores) {
      if (op.quartil !== 4) continue
      if (!opMap.has(op.username)) {
        const display = OPERADORES_DISPLAY.find(o => o.username === op.username)
        if (!display) continue
        opMap.set(op.username, { id: display.id, nome: display.nome, username: op.username, q4: [] })
      }
      opMap.get(op.username)!.q4.push({
        topicoId:         topico.id,
        nomeTopico:       topico.nomeTopico,
        rankGlobal:       op.rankGlobal,
        totalOperadores:  topico.totalOperadores,
        metricaFormatada: op.metricaFormatada,
      })
    }
  }

  // Mais Q4s primeiro → pior rank relativo → alfabético
  const operadores = [...opMap.values()].sort((a, b) => {
    if (b.q4.length !== a.q4.length) return b.q4.length - a.q4.length
    const worstA = Math.max(...a.q4.map(t => t.rankGlobal / (t.totalOperadores || 1)))
    const worstB = Math.max(...b.q4.map(t => t.rankGlobal / (t.totalOperadores || 1)))
    if (worstB !== worstA) return worstB - worstA
    return a.nome.localeCompare(b.nome)
  })

  return (
    <PainelShell profile={profile} title="Q4 Equipe" iconName="Trophy">
      <QuartilEquipeClient operadores={operadores} dataAtualizacao={dataAtualizacao} mesLabel={mesLabel} />
    </PainelShell>
  )
}
