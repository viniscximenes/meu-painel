import { getProfile } from '@/lib/auth'
import { redirect } from 'next/navigation'
import { getPlanilhaAtiva, listarPlanilhasHistorico } from '@/lib/sheets'
import { lerKpiHistoricoPlanilha } from '@/lib/historico-kpi'
import PainelShell from '@/components/PainelShell'
import PorMesClient from './PorMesClient'
import type { PorMesProps, KpiMesData, MesDisponivel } from './PorMesClient'

export const dynamic = 'force-dynamic'

// A tela "Por Mês" mostra APENAS meses fechados (planilhas históricas).
// A planilha ativa é excluída explicitamente, mesmo se estiver associada
// a um mês/ano, porque:
// 1. Tem estrutura de colunas diferente (legado) que causaria erro de leitura
// 2. O mês corrente é exibido em Meu KPI e Últimos 3 Meses, não aqui

const MESES_PT  = ['JANEIRO','FEVEREIRO','MARÇO','ABRIL','MAIO','JUNHO',
                   'JULHO','AGOSTO','SETEMBRO','OUTUBRO','NOVEMBRO','DEZEMBRO']
const MESES_ABR = ['JAN','FEV','MAR','ABR','MAI','JUN','JUL','AGO','SET','OUT','NOV','DEZ']

interface PageProps {
  searchParams: Promise<{ mes?: string; ano?: string }>
}

export default async function PorMesPage({ searchParams }: PageProps) {
  const profile = await getProfile()
  if (profile.role === 'gestor') redirect('/painel')

  const params = await searchParams

  const now = new Date()

  // Buscar ativa e históricas em paralelo
  let planilhaAtiva: Awaited<ReturnType<typeof getPlanilhaAtiva>>
  let todasHistoricas: Awaited<ReturnType<typeof listarPlanilhasHistorico>>
  try {
    ;[planilhaAtiva, todasHistoricas] = await Promise.all([
      getPlanilhaAtiva(),
      listarPlanilhasHistorico(),
    ])
  } catch (err) {
    console.error('[PorMesPage] Erro ao listar planilhas:', err)
    const msg = err instanceof Error && err.message.includes('Quota exceeded')
      ? 'Limite de requisições do Google Sheets atingido. Aguarde alguns segundos e tente novamente.'
      : 'Erro ao carregar dados do histórico.'
    return (
      <PainelShell profile={profile} title="Por Mês" iconName="CalendarDays">
        <PorMesClient
          mesesDisponiveis={[]} kpiPorMes={{}}
          mesPadrao={{ mes: 1, ano: now.getFullYear() }}
          errorMessage={msg}
        />
      </PainelShell>
    )
  }

  // Excluir a planilha ativa do "Por Mês", independente de ter referência associada
  const planilhas = planilhaAtiva
    ? todasHistoricas.filter(p => p.id !== planilhaAtiva.id)
    : todasHistoricas

  // Ordenar cronologicamente (mais antigo → mais recente)
  const ordenadas = [...planilhas].sort((a, b) => {
    if (a.referencia_ano !== b.referencia_ano) return a.referencia_ano! - b.referencia_ano!
    return a.referencia_mes! - b.referencia_mes!
  })

  if (ordenadas.length === 0) {
    const props: PorMesProps = {
      mesesDisponiveis: [], kpiPorMes: {},
      mesPadrao: { mes: 1, ano: now.getFullYear() },
    }
    return (
      <PainelShell profile={profile} title="Por Mês" iconName="CalendarDays">
        <PorMesClient {...props} />
      </PainelShell>
    )
  }

  // Ler KPIs de todos os meses fechados em paralelo
  let resultados: Awaited<ReturnType<typeof lerKpiHistoricoPlanilha>>[]
  try {
    resultados = await Promise.all(
      ordenadas.map(p => lerKpiHistoricoPlanilha(p, profile.username, profile.nome))
    )
  } catch (err) {
    console.error('[PorMesPage] Erro ao ler KPIs:', err)
    const msg = err instanceof Error && err.message.includes('Quota exceeded')
      ? 'Limite de requisições do Google Sheets atingido. Aguarde alguns segundos e tente novamente.'
      : 'Erro ao carregar dados do histórico.'
    return (
      <PainelShell profile={profile} title="Por Mês" iconName="CalendarDays">
        <PorMesClient
          mesesDisponiveis={[]} kpiPorMes={{}}
          mesPadrao={{ mes: 1, ano: now.getFullYear() }}
          errorMessage={msg}
        />
      </PainelShell>
    )
  }

  // Só incluir meses onde o operador foi encontrado
  const comDados = ordenadas.filter((_, i) => resultados[i].encontrado)
  const resultadosFiltrados = resultados.filter(r => r.encontrado)

  if (comDados.length === 0) {
    const props: PorMesProps = {
      mesesDisponiveis: [], kpiPorMes: {},
      mesPadrao: { mes: 1, ano: now.getFullYear() },
    }
    return (
      <PainelShell profile={profile} title="Por Mês" iconName="CalendarDays">
        <PorMesClient {...props} />
      </PainelShell>
    )
  }

  const mesesDisponiveis: MesDisponivel[] = comDados.map(p => ({
    mes:        p.referencia_mes!,
    ano:        p.referencia_ano!,
    label:      `${MESES_PT[p.referencia_mes! - 1]} ${p.referencia_ano}`,
    labelCurto: `${MESES_ABR[p.referencia_mes! - 1]} ${p.referencia_ano}`,
  }))

  const kpiPorMes: Record<string, KpiMesData> = {}
  comDados.forEach((p, i) => {
    const chave = `${p.referencia_mes}-${p.referencia_ano}`
    kpiPorMes[chave] = {
      encontrado:     resultadosFiltrados[i].encontrado,
      principais:     resultadosFiltrados[i].principais,
      complementares: resultadosFiltrados[i].complementares,
    }
  })

  // Mês padrão: query param válido (só fechados) ou o mais recente
  const mesBuscado = params.mes ? parseInt(params.mes) : null
  const anoBuscado = params.ano ? parseInt(params.ano) : null
  let mesPadrao = mesesDisponiveis[mesesDisponiveis.length - 1]
  if (mesBuscado && anoBuscado) {
    const found = mesesDisponiveis.find(m => m.mes === mesBuscado && m.ano === anoBuscado)
    if (found) mesPadrao = found
    // Se não encontrado (ex: ?mes=4&ano=2026 apontando pra ativa), usa o mais recente — sem erro
  }

  const props: PorMesProps = {
    mesesDisponiveis,
    kpiPorMes,
    mesPadrao: { mes: mesPadrao.mes, ano: mesPadrao.ano },
  }

  return (
    <PainelShell profile={profile} title="Por Mês" iconName="CalendarDays">
      <PorMesClient {...props} />
    </PainelShell>
  )
}
