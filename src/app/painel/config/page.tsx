import { requireGestor } from '@/lib/auth'
import { listarPlanilhas } from '@/lib/sheets'
import { getNomesFantasia } from '@/lib/snapshots'
import PainelShell from '@/components/PainelShell'
import PlanilhasClient from './PlanilhasClient'
import NomesFantasiaClient from './NomesFantasiaClient'
import { Database } from 'lucide-react'

function getMesReferencia(): string {
  const d = new Date()
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}`
}

export default async function ConfigPage() {
  const profile = await requireGestor()

  const mesReferencia = getMesReferencia()

  const [planilhas, nomesFantasia] = await Promise.all([
    listarPlanilhas(),
    getNomesFantasia(mesReferencia),
  ])

  return (
    <PainelShell profile={profile} title="Planilhas">
      <div className="max-w-2xl space-y-10">

        {/* ── Planilhas ── */}
        <div className="space-y-6">
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

        {/* Divisor */}
        <div className="divider" />

        {/* ── Nomes Fantasia ── */}
        <NomesFantasiaClient
          mesReferencia={mesReferencia}
          nomesIniciais={nomesFantasia}
        />

      </div>
    </PainelShell>
  )
}
