import { requireGestor } from '@/lib/auth'
import { listarPlanilhas } from '@/lib/sheets'
import { getNomesFantasia } from '@/lib/snapshots'
import { getAppConfig } from '@/lib/app-config'
import { getRVGestorConfigRaw } from '@/lib/rv-gestor'
import PainelShell from '@/components/PainelShell'
import PlanilhasClient from './PlanilhasClient'
import NomesFantasiaClient from './NomesFantasiaClient'
import KPIConsolidadoConfigClient from './KPIConsolidadoConfigClient'
import RVGestorConfigClient from './RVGestorConfigClient'
import { Database, TrendingUp } from 'lucide-react'

function getMesReferencia(): string {
  const d = new Date()
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}`
}

export default async function ConfigPage() {
  const profile = await requireGestor()

  const mesReferencia = getMesReferencia()

  const [planilhas, nomesFantasia, limiteRaw, gestorConfigRaw] = await Promise.all([
    listarPlanilhas(),
    getNomesFantasia(mesReferencia),
    getAppConfig('kpi_consolidado_limite_linhas'),
    getRVGestorConfigRaw(),
  ])
  const limiteLinhas = limiteRaw ? parseInt(limiteRaw, 10) : 50

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

        {/* ── KPI CONSOLIDADO ── */}
        <KPIConsolidadoConfigClient limiteInicial={limiteLinhas} />

        {/* Divisor */}
        <div className="divider" />

        {/* ── Nomes Fantasia ── */}
        <NomesFantasiaClient
          mesReferencia={mesReferencia}
          nomesIniciais={nomesFantasia}
        />

        {/* Divisor */}
        <div className="divider" />

        {/* ── RV Gestor ── */}
        <div className="space-y-6">
          <div>
            <h2 className="text-xl font-bold flex items-center gap-2" style={{ color: 'var(--text-primary)' }}>
              <TrendingUp size={20} style={{ color: 'var(--gold)' }} />
              RV Gestor
            </h2>
            <p className="text-sm mt-1" style={{ color: 'var(--text-muted)' }}>
              Faixas, metas operacionais, bônus e deflatores do cálculo de RV do gestor.
            </p>
          </div>

          <RVGestorConfigClient raw={gestorConfigRaw} />
        </div>

      </div>
    </PainelShell>
  )
}
