import { redirect } from 'next/navigation'
import { getProfile } from '@/lib/auth'
import { getMetas, computarKPIs } from '@/lib/kpi'
import { getPlanilhaAtiva, buscarLinhaOperador } from '@/lib/sheets'
import PainelShell from '@/components/PainelShell'
import KPIBasico from '@/components/kpi/KPIBasico'
import KPICompleto from '@/components/kpi/KPICompleto'
import { AlertTriangle, Settings } from 'lucide-react'
import Link from 'next/link'

interface PageProps {
  searchParams: Promise<{ view?: string }>
}

export default async function KPIPage({ searchParams }: PageProps) {
  const profile = await getProfile()

  if (profile.role === 'gestor') redirect('/painel/kpis-equipe')

  const { view } = await searchParams
  const completo = view === 'completo'

  const [planilha, metas] = await Promise.all([getPlanilhaAtiva(), getMetas()])

  if (!planilha) {
    return (
      <PainelShell profile={profile} title="Meus KPIs">
        <AvisoSemPlanilha />
      </PainelShell>
    )
  }

  const resultado = await buscarLinhaOperador(profile.username, planilha.spreadsheet_id, planilha.aba)

  if (!resultado) {
    return (
      <PainelShell profile={profile} title="Meus KPIs">
        <AvisoSemDados username={profile.username} planilhaNome={planilha.nome} />
      </PainelShell>
    )
  }

  const kpis = computarKPIs(resultado.headers, resultado.row, metas)

  return (
    <PainelShell profile={profile} title={completo ? 'KPI Completo' : 'Meus KPIs'}>
      {completo ? (
        <KPICompleto kpis={kpis} nomeOperador={profile.nome} linkVoltar="/painel/kpi" podeOrdenar={false} />
      ) : (
        <KPIBasico kpis={kpis} nomeOperador={profile.nome} linkCompleto="/painel/kpi?view=completo" />
      )}
    </PainelShell>
  )
}

function AvisoSemPlanilha() {
  return (
    <div className="flex flex-col items-center justify-center min-h-[50vh] gap-4 text-center">
      <div
        className="w-14 h-14 rounded-2xl flex items-center justify-center"
        style={{ background: 'rgba(201,168,76,0.08)' }}
      >
        <Settings size={24} style={{ color: 'var(--gold)' }} />
      </div>
      <div>
        <h3 className="font-semibold text-lg" style={{ color: 'var(--text-primary)' }}>
          Planilha não configurada
        </h3>
        <p className="text-sm mt-1 max-w-xs" style={{ color: 'var(--text-muted)' }}>
          A supervisão ainda não ativou nenhuma planilha.
        </p>
      </div>
    </div>
  )
}

function AvisoSemDados({ username, planilhaNome }: { username: string; planilhaNome: string }) {
  return (
    <div className="flex flex-col items-center justify-center min-h-[50vh] gap-4 text-center">
      <div
        className="w-14 h-14 rounded-2xl flex items-center justify-center"
        style={{ background: 'rgba(245,158,11,0.08)' }}
      >
        <AlertTriangle size={24} className="text-amber-400" />
      </div>
      <div>
        <h3 className="font-semibold text-lg" style={{ color: 'var(--text-primary)' }}>
          Dados não encontrados
        </h3>
        <p className="text-sm mt-1 max-w-sm" style={{ color: 'var(--text-muted)' }}>
          Nenhuma linha para <strong style={{ color: 'var(--text-secondary)' }}>{username}</strong>{' '}
          na planilha <strong style={{ color: 'var(--text-secondary)' }}>{planilhaNome}</strong>.
        </p>
        <p className="text-xs mt-2" style={{ color: 'var(--text-muted)' }}>
          Verifique se a coluna de email/usuário contém o seu login.
        </p>
      </div>
    </div>
  )
}
