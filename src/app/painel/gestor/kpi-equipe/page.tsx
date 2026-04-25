import { requireGestorOuAdmin } from '@/lib/auth'
import { getPlanilhaAtiva } from '@/lib/sheets'
import { lerKpiConsolidado } from '@/lib/kpi-consolidado-sheets'
import PainelShell from '@/components/PainelShell'
import KpiEquipeClient from './KpiEquipeClient'
import { AlertTriangle, Settings } from 'lucide-react'
import Link from 'next/link'

export const dynamic = 'force-dynamic'

export default async function GestorKpiEquipePage() {
  const profile  = await requireGestorOuAdmin()
  const planilha = await getPlanilhaAtiva().catch(() => null)

  const mesLabel = new Date().toLocaleDateString('pt-BR', { month: 'long', year: 'numeric' }).toUpperCase()
  const cssVars  = { '--void2': '#07070f', '--void3': '#0d0d1a' } as React.CSSProperties

  if (!planilha) {
    return (
      <PainelShell profile={profile} title="KPI Equipe" iconName="BarChart3">
        <div style={cssVars} className="space-y-4">
          <GoldLine />
          <EmptyState icon={<Settings size={24} style={{ color: 'var(--gold)' }} />}>
            <strong>Planilha não configurada</strong>
            <span style={{ color: 'var(--text-muted)', fontSize: '13px' }}>
              Nenhuma planilha está ativa.{' '}
              <Link href="/painel/config" style={{ color: '#c9a84c', textDecoration: 'underline' }}>
                Configurar
              </Link>
            </span>
          </EmptyState>
        </div>
      </PainelShell>
    )
  }

  let kpiData: Awaited<ReturnType<typeof lerKpiConsolidado>> | null = null
  let erroSheets: string | null = null

  try {
    kpiData = await lerKpiConsolidado(planilha.spreadsheet_id, planilha.aba)
  } catch (e) {
    erroSheets = e instanceof Error ? e.message : 'Erro desconhecido ao carregar planilha'
  }

  return (
    <PainelShell profile={profile} title="KPI Equipe" iconName="BarChart3">
      <div style={cssVars} className="space-y-4">
        <GoldLine />

        {erroSheets && (
          <div className="flex items-start gap-3 rounded-xl border px-4 py-3"
            style={{ background: 'rgba(239,68,68,0.05)', borderColor: 'rgba(239,68,68,0.2)' }}>
            <AlertTriangle size={15} className="text-rose-400 shrink-0 mt-0.5" />
            <div>
              <p className="text-sm font-medium text-rose-300">Erro ao carregar dados</p>
              <p className="text-xs mt-0.5 text-rose-500">{erroSheets}</p>
            </div>
          </div>
        )}

        {!erroSheets && kpiData && (
          <KpiEquipeClient
            operadores={kpiData.operadores}
            dataAtualizacao={kpiData.dataAtualizacao}
            mesLabel={mesLabel}
          />
        )}
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
