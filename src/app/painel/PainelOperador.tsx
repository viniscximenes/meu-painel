import { redirect } from 'next/navigation'
import { Profile } from '@/types'
import { getOperadorPorId } from '@/lib/operadores'
import MetricCard from '@/components/MetricCard'
import { getMetas, computarKPIs, getMetasOperadorConfig } from '@/lib/kpi'
import type { MetaOperadorConfig } from '@/lib/kpi-utils'
import { getPlanilhaAtiva, buscarLinhaOperador } from '@/lib/sheets'
import { buildMetasIndividuais } from '@/lib/kpi-coluna-utils'
import KPIBasico from '@/components/kpi/KPIBasico'
import { Target, Clock, Database } from 'lucide-react'
import type { KPIItem } from '@/lib/kpi'

interface PainelOperadorProps {
  profile: Profile
}

export default async function PainelOperador({ profile }: PainelOperadorProps) {
  if (!profile.operador_id) redirect('/login')

  const operador = getOperadorPorId(profile.operador_id)
  if (!operador) redirect('/login')

  const hora = new Date().getHours()
  const saudacao = hora < 12 ? 'Bom dia' : hora < 18 ? 'Boa tarde' : 'Boa noite'

  const [planilha, metas, opConfigs] = await Promise.all([
    getPlanilhaAtiva(),
    getMetas(),
    getMetasOperadorConfig().catch(() => ({} as Record<string, MetaOperadorConfig>)),
  ])

  let kpis: KPIItem[] = []
  if (planilha) {
    const resultado = await buscarLinhaOperador(profile.username, planilha.spreadsheet_id, planilha.aba)
    if (resultado) {
      const metasIndividuais = buildMetasIndividuais(resultado.row, opConfigs)
      kpis = computarKPIs(resultado.headers, resultado.row, metas, undefined, opConfigs, metasIndividuais)
    }
  }

  const metasAtingidas   = kpis.filter((k) => k.status === 'verde').length
  const totalComMeta     = kpis.filter((k) => k.status !== 'neutro').length

  return (
    <div className="space-y-8">
      {/* Saudação */}
      <div>
        <h2
          className="text-2xl font-extrabold"
          style={{
            background: 'linear-gradient(135deg, var(--text-primary) 0%, var(--text-secondary) 100%)',
            WebkitBackgroundClip: 'text',
            WebkitTextFillColor: 'transparent',
            backgroundClip: 'text',
            letterSpacing: '-0.03em',
          }}
        >
          {saudacao}, {profile.nome.split(' ')[0]}!
        </h2>
        <p className="mt-1 text-sm" style={{ color: 'var(--text-muted)' }}>
          Acompanhe seus dados e métricas de desempenho.
        </p>
      </div>

      {/* Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-2 xl:grid-cols-4 gap-4">
        <MetricCard
          label="Metas Atingidas"
          valor={totalComMeta > 0 ? `${metasAtingidas}/${totalComMeta}` : '—'}
          icone={<Target size={16} />}
          descricao="KPIs dentro da meta"
        />
        <MetricCard
          label="Planilha Ativa"
          valor={planilha?.nome || 'N/A'}
          icone={<Database size={16} />}
          descricao={planilha ? `Aba: ${planilha.aba || 'primeira'}` : 'Não configurada'}
        />
        <MetricCard
          label="Atualizado"
          valor={new Date().toLocaleTimeString('pt-BR', { hour: '2-digit', minute: '2-digit' })}
          icone={<Clock size={16} />}
          descricao="Hora atual"
        />
      </div>

      {/* KPI Básico inline */}
      {kpis.length > 0 && (
        <KPIBasico
          kpis={kpis}
          nomeOperador={profile.nome}
        />
      )}

      {kpis.length === 0 && planilha && (
        <div className="card text-center py-10">
          <p className="text-sm" style={{ color: 'var(--text-muted)' }}>
            Nenhum dado encontrado para você na planilha &quot;{planilha.nome}&quot;.
          </p>
        </div>
      )}
    </div>
  )
}
