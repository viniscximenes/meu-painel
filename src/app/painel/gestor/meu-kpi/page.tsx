import { requireGestorOuAdmin } from '@/lib/auth'
import { getPlanilhaAtiva, getPlanilhaPorTipo, resolverNomeAba } from '@/lib/sheets'
import { lerKpiGestor } from '@/lib/kpi-gestor-sheets'
import { getMetasGestorConfig } from '@/lib/kpi'
import PainelShell from '@/components/PainelShell'
import GestorMeuKPIClient from './GestorMeuKPIClient'
import { AlertTriangle, Settings } from 'lucide-react'

export const dynamic = 'force-dynamic'

export default async function GestorMeuKpiPage() {
  const profile  = await requireGestorOuAdmin()
  const planilha = await getPlanilhaPorTipo('kpi_quartil').then(p => p ?? getPlanilhaAtiva()).catch(() => null)

  const cssVars = { '--void2': '#07070f', '--void3': '#0d0d1a' } as React.CSSProperties

  if (!planilha) {
    return (
      <PainelShell profile={profile} title="Meu KPI" iconName="Gauge">
        <div style={cssVars} className="space-y-4">
          <GoldLine />
          <EmptyState icon={<Settings size={24} style={{ color: 'var(--gold)' }} />}>
            <strong>Planilha não configurada</strong>
            <span style={{ color: 'var(--text-muted)', fontSize: '13px' }}>A supervisão ainda não ativou nenhuma planilha.</span>
          </EmptyState>
        </div>
      </PainelShell>
    )
  }

  let kpiData = null
  let erro: string | null = null
  const gestorConfigs = await getMetasGestorConfig()

  try {
    const aba = await resolverNomeAba(planilha.spreadsheet_id, 'KPI GESTOR').catch(() => 'KPI GESTOR')
    kpiData = await lerKpiGestor(planilha.spreadsheet_id, aba, gestorConfigs)
  } catch (e) {
    erro = e instanceof Error ? e.message : 'Erro desconhecido ao carregar planilha'
  }

  return (
    <PainelShell profile={profile} title="Meu KPI" iconName="Gauge">
      <div style={cssVars} className="space-y-4">

        {erro && (
          <div className="flex items-start gap-3 rounded-xl border px-4 py-3"
            style={{ background: 'rgba(239,68,68,0.05)', borderColor: 'rgba(239,68,68,0.2)' }}>
            <AlertTriangle size={15} className="text-rose-400 shrink-0 mt-0.5" />
            <div>
              <p className="text-sm font-medium text-rose-300">Erro ao carregar dados</p>
              <p className="text-xs mt-0.5 text-rose-500">{erro}</p>
            </div>
          </div>
        )}

        {!erro && !kpiData && (
          <EmptyState icon={<AlertTriangle size={24} className="text-amber-400" />}>
            <strong>Dados não encontrados</strong>
            <span style={{ color: 'var(--text-muted)', fontSize: '13px' }}>
              A aba <strong style={{ color: 'var(--text-secondary)' }}>KPI GESTOR</strong> não foi encontrada ou está vazia na planilha ativa.
            </span>
          </EmptyState>
        )}

        {kpiData && <GestorMeuKPIClient data={kpiData} gestorConfigs={gestorConfigs} />}
      </div>
    </PainelShell>
  )
}

function GoldLine() {
  return (
    <div style={{
      height: '1px',
      background: 'linear-gradient(90deg, transparent 0%, #c9a84c 25%, #e8c96d 50%, #c9a84c 75%, transparent 100%)',
    }} />
  )
}

function EmptyState({ icon, children }: { icon: React.ReactNode; children: React.ReactNode }) {
  return (
    <div className="flex flex-col items-center justify-center min-h-[50vh] gap-4 text-center">
      <div className="w-14 h-14 rounded-2xl flex items-center justify-center"
        style={{ background: 'rgba(201,168,76,0.08)', border: '1px solid rgba(201,168,76,0.10)' }}>
        {icon}
      </div>
      <div className="flex flex-col items-center gap-2">{children}</div>
    </div>
  )
}
