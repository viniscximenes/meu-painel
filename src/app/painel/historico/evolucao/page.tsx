import { getProfile } from '@/lib/auth'
import { redirect } from 'next/navigation'
import { getPlanilhaAtiva, listarPlanilhasHistorico } from '@/lib/sheets'
import { lerKpiHistoricoPlanilha } from '@/lib/historico-kpi'
import { lerKpiLegadoParaHistorico } from '@/lib/meu-kpi-extractor'
import type { KpiHistoricoMes } from '@/lib/historico-kpi'
import PainelShell from '@/components/PainelShell'
import EvolucaoClient from './EvolucaoClient'
import type { PontoEvolucao, EvolucaoProps } from './EvolucaoClient'

export const dynamic = 'force-dynamic'

const MESES_ABR = ['JAN','FEV','MAR','ABR','MAI','JUN','JUL','AGO','SET','OUT','NOV','DEZ']
const MESES_PT  = ['JANEIRO','FEVEREIRO','MARÇO','ABRIL','MAIO','JUNHO',
                   'JULHO','AGOSTO','SETEMBRO','OUTUBRO','NOVEMBRO','DEZEMBRO']

function parseNum(valor: string): number | null {
  if (!valor || valor === '—') return null
  const s = valor.replace('%', '').replace(',', '.').trim()
  const n = parseFloat(s)
  return isNaN(n) ? null : n
}

function parseTMAStr(valor: string): number | null {
  if (!valor || valor === '—') return null
  const parts = valor.split(':').map(p => parseInt(p, 10))
  if (parts.some(Number.isNaN)) return null
  if (parts.length === 3) return parts[0] * 3600 + parts[1] * 60 + parts[2]
  if (parts.length === 2) return parts[0] * 60 + parts[1]
  return null
}

function mesParaPonto(mes: KpiHistoricoMes, emAndamento: boolean): PontoEvolucao {
  const now = new Date()
  const m = mes.mes ?? (now.getMonth() + 1)
  const a = mes.ano ?? now.getFullYear()
  const find = (label: string) => mes.principais.find(k => k.label === label)?.valor ?? '—'
  return {
    mes: m, ano: a,
    label: MESES_ABR[m - 1],
    labelCompleto: `${MESES_PT[m - 1]} ${a}`,
    emAndamento,
    kpi: {
      txRetencao:  parseNum(find('Tx. Retenção')),
      tmaSegundos: parseTMAStr(find('TMA')),
      abs:         parseNum(find('ABS')),
      indisp:      parseNum(find('Indisponibilidade')),
    },
  }
}

export default async function EvolucaoPage() {
  const profile = await getProfile()
  if (profile.role === 'gestor') redirect('/painel')

  const [planilhaAtiva, planilhasHistorico] = await Promise.all([
    getPlanilhaAtiva(),
    listarPlanilhasHistorico(),
  ])

  const ativaJaInclusa = planilhaAtiva
    ? planilhasHistorico.some(p => p.id === planilhaAtiva.id)
    : false

  const resultados = await Promise.all(
    planilhasHistorico.map(p => {
      const ehAtiva = planilhaAtiva?.id === p.id
      if (ehAtiva) return lerKpiLegadoParaHistorico(p, profile.username, profile.nome)
      return lerKpiHistoricoPlanilha(p, profile.username, profile.nome)
    })
  )

  // Só incluir pontos onde o operador foi encontrado
  const pontos: PontoEvolucao[] = planilhasHistorico
    .map((p, i) => {
      if (!resultados[i].encontrado) return null
      const ehAtiva = planilhaAtiva?.id === p.id
      return mesParaPonto(resultados[i], ehAtiva)
    })
    .filter((p): p is PontoEvolucao => p !== null)

  // Planilha ativa não inclusa nas históricas
  if (planilhaAtiva && !ativaJaInclusa) {
    const mesAtiva = await lerKpiLegadoParaHistorico(
      planilhaAtiva, profile.username, profile.nome
    )
    if (mesAtiva.encontrado) {
      pontos.push(mesParaPonto(mesAtiva, true))
    }
  }

  pontos.sort((a, b) => a.ano !== b.ano ? a.ano - b.ano : a.mes - b.mes)

  const props: EvolucaoProps = { pontos }

  return (
    <PainelShell profile={profile} title="Evolução" iconName="LineChart">
      <EvolucaoClient {...props} />
    </PainelShell>
  )
}
