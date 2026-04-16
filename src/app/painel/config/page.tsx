import { requireGestor } from '@/lib/auth'
import { listarPlanilhas } from '@/lib/sheets'
import PainelShell from '@/components/PainelShell'
import PlanilhasClient from './PlanilhasClient'
import { Database } from 'lucide-react'

export default async function ConfigPage() {
  const profile = await requireGestor()
  const planilhas = await listarPlanilhas()

  return (
    <PainelShell profile={profile} title="Planilhas">
      <div className="max-w-2xl space-y-6">
        {/* Header */}
        <div>
          <h2 className="text-xl font-bold flex items-center gap-2" style={{ color: 'var(--text-primary)' }}>
            <Database size={20} style={{ color: 'var(--gold)' }} />
            Planilhas Cadastradas
          </h2>
          <p className="text-sm mt-1" style={{ color: 'var(--text-muted)' }}>
            Cada planilha representa um período (ex: ABRIL.2026). Apenas uma pode estar ativa por vez.
          </p>
        </div>

        <PlanilhasClient planilhas={planilhas} />
      </div>
    </PainelShell>
  )
}
