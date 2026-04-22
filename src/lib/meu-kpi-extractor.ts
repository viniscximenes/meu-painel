// Servidor apenas — extrai KPIs da planilha ATIVA (estrutura legacy com headers)
// Usado para o mês em andamento na tela de histórico

import { buscarLinhasPlanilha, matchCelulaOperador, encontrarColunaIdent } from '@/lib/sheets'
import type { Planilha } from '@/lib/sheets'
import { computarKPIs, normalizarChave, formatarExibicao } from '@/lib/kpi-utils'
import type { KpiHistoricoMes, KpiHistoricoItem } from '@/lib/historico-kpi'

const MESES_PT = [
  'Janeiro','Fevereiro','Março','Abril','Maio','Junho',
  'Julho','Agosto','Setembro','Outubro','Novembro','Dezembro',
]

// ── Keywords para cada KPI (testadas contra `nome_coluna + label` normalizados) ─

const PRINCIPAIS_DEF: { label: string; match: (c: string) => boolean }[] = [
  { label: 'Pedido',            match: c => c.includes('pedido') },
  { label: 'Churn',             match: c => (c.includes('churn') || c.includes('cancel')) && !c.includes('retenc') && !c.includes('retenç') },
  { label: 'Tx. Retenção',      match: c => (c.includes('retenc') || c.includes('retenç')) && !c.includes('liquid') && !c.includes('15d') },
  { label: 'TMA',               match: c => c.startsWith('tma') || c.includes('tempo medio') || c.includes('tempo médio') },
  { label: 'ABS',               match: c => c === 'abs' || c.startsWith('abs') || c.includes('absenteism') || c.includes('ausencia') || c.includes('ausência') },
  { label: 'Indisponibilidade', match: c => c.includes('indisp') },
]

const COMPLEMENTARES_DEF: { label: string; match: (c: string) => boolean }[] = [
  { label: 'Ticket',           match: c => c.includes('ticket') },
  { label: 'Tx. Ret. Líquida', match: c => c.includes('tx') && c.includes('15d') },
  { label: 'Transferência',    match: c => c.startsWith('transfer') },
  { label: 'Short Call',       match: c => c.includes('short') },
  { label: 'Rechamada',        match: c => c.includes('rechamada') && (c.includes('d+7') || !c.includes('d+')) },
]

// ── Extrator ──────────────────────────────────────────────────────────────────

export async function lerKpiLegadoParaHistorico(
  planilha: Planilha,
  username: string,
  nomeCompleto: string,
): Promise<KpiHistoricoMes> {
  const now = new Date()
  const mes      = planilha.referencia_mes ?? (now.getMonth() + 1)
  const ano      = planilha.referencia_ano ?? now.getFullYear()
  const mesLabel = `${MESES_PT[mes - 1].toUpperCase()} ${ano}`
  const base = { mes, ano, mesLabel, planilhaNome: planilha.nome, emAndamento: true }

  try {
    const aba = planilha.aba || ''
    const { headers, rows } = await buscarLinhasPlanilha(planilha.spreadsheet_id, aba, 300)

    if (!headers.length) {
      return { ...base, encontrado: false, principais: [], complementares: [] }
    }

    const colIdent = encontrarColunaIdent(headers)
    const meuRow = rows.find(r => matchCelulaOperador(r[colIdent] ?? '', username, nomeCompleto))
    if (!meuRow) {
      return { ...base, encontrado: false, principais: [], complementares: [] }
    }

    const kpis = computarKPIs(headers, meuRow, [])

    function encontrarKpi(matchFn: (c: string) => boolean) {
      return kpis.find(k => matchFn(normalizarChave(`${k.nome_coluna} ${k.label}`)))
    }

    const principais: KpiHistoricoItem[] = PRINCIPAIS_DEF
      .map(({ label, match }) => {
        const kpi = encontrarKpi(match)
        if (!kpi) return null
        const valor = formatarExibicao(kpi.valor, kpi.unidade) || kpi.valor || '—'
        return { label, valor } satisfies KpiHistoricoItem
      })
      .filter((x): x is KpiHistoricoItem => x !== null)

    const complementares: KpiHistoricoItem[] = COMPLEMENTARES_DEF
      .map(({ label, match }): KpiHistoricoItem | null => {
        const kpi = encontrarKpi(match)
        if (!kpi) return null
        const valor = formatarExibicao(kpi.valor, kpi.unidade) || kpi.valor || '—'
        if (valor === '—') return null
        return { label, valor }
      })
      .filter((x): x is KpiHistoricoItem => x !== null)

    return { ...base, encontrado: true, principais, complementares }
  } catch (e) {
    console.error(`[lerKpiLegadoParaHistorico:${planilha.nome}]`, e)
    return { ...base, encontrado: false, principais: [], complementares: [] }
  }
}
