import { requireAdmin } from '@/lib/auth'
import { listarPlanilhas } from '@/lib/sheets'
import PainelShell from '@/components/PainelShell'
import HistoricoConfigClient from './HistoricoConfigClient'
import { History } from 'lucide-react'

export const dynamic = 'force-dynamic'

export default async function HistoricoConfigPage() {
  const profile = await requireAdmin()
  const planilhas = await listarPlanilhas()

  return (
    <PainelShell profile={profile} title="Histórico — Config" iconName="History">
      <div className="max-w-3xl space-y-6">
        <div>
          <h2 className="text-xl font-bold flex items-center gap-2" style={{ color: 'var(--text-primary)' }}>
            <History size={20} style={{ color: 'var(--gold)' }} />
            Associar Mês de Referência
          </h2>
          <p className="text-sm mt-1" style={{ color: 'var(--text-muted)' }}>
            Vincule cada planilha ao mês/ano que ela representa para aparecer no histórico dos operadores.
          </p>
        </div>
        <HistoricoConfigClient planilhas={planilhas} />
      </div>
    </PainelShell>
  )
}
