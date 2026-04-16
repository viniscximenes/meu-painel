import { notFound } from 'next/navigation'
import { requireGestor } from '@/lib/auth'
import { getMetas, computarKPIs } from '@/lib/kpi'
import { getPlanilhaAtiva, buscarLinhaOperador } from '@/lib/sheets'
import { OPERADORES } from '@/lib/operadores'
import PainelShell from '@/components/PainelShell'
import KPIBasico from '@/components/kpi/KPIBasico'
import KPICompleto from '@/components/kpi/KPICompleto'
import { AlertTriangle } from 'lucide-react'

interface PageProps {
  params: Promise<{ username: string }>
  searchParams: Promise<{ view?: string }>
}

export default async function KPIOperadorPage({ params, searchParams }: PageProps) {
  const { username } = await params
  const { view } = await searchParams
  const completo = view === 'completo'

  const profile = await requireGestor()
  const operador = OPERADORES.find((o) => o.username === username)
  if (!operador) notFound()

  const [planilha, metas] = await Promise.all([getPlanilhaAtiva(), getMetas()])

  if (!planilha) {
    return (
      <PainelShell profile={profile} title={`KPI — ${operador.nome}`}>
        <div className="flex flex-col items-center justify-center min-h-[50vh] gap-3 text-center">
          <p className="text-sm" style={{ color: 'var(--text-muted)' }}>
            Nenhuma planilha ativa configurada.
          </p>
        </div>
      </PainelShell>
    )
  }

  const resultado = await buscarLinhaOperador(username, planilha.spreadsheet_id, planilha.aba)

  if (!resultado) {
    return (
      <PainelShell profile={profile} title={`KPI — ${operador.nome}`}>
        <div className="flex flex-col items-center justify-center min-h-[50vh] gap-4 text-center">
          <div
            className="w-14 h-14 rounded-2xl flex items-center justify-center"
            style={{ background: 'rgba(245,158,11,0.08)' }}
          >
            <AlertTriangle size={24} className="text-amber-400" />
          </div>
          <div>
            <h3 className="font-semibold" style={{ color: 'var(--text-primary)' }}>
              Dados não encontrados
            </h3>
            <p className="text-sm mt-1" style={{ color: 'var(--text-muted)' }}>
              Nenhuma linha para <strong style={{ color: 'var(--text-secondary)' }}>{username}</strong>{' '}
              na planilha <strong style={{ color: 'var(--text-secondary)' }}>{planilha.nome}</strong>.
            </p>
          </div>
        </div>
      </PainelShell>
    )
  }

  const kpis = computarKPIs(resultado.headers, resultado.row, metas)
  const linkBase = `/painel/kpi/${username}`

  return (
    <PainelShell profile={profile} title={`KPI — ${operador.nome}`}>
      {completo ? (
        <KPICompleto kpis={kpis} nomeOperador={operador.nome} linkVoltar={linkBase} podeOrdenar={true} />
      ) : (
        <KPIBasico kpis={kpis} nomeOperador={operador.nome} linkCompleto={`${linkBase}?view=completo`} />
      )}
    </PainelShell>
  )
}
