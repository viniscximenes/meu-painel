// Servidor apenas — leitura e processamento de fechamento histórico para modo histórico

import { createAdminClient } from '@/lib/supabase/admin'
import { buscarLinhasPlanilha, resolverNomeAba, matchCelulaOperador } from '@/lib/sheets'
import type { Planilha } from '@/lib/sheets'
import type { MetaOperadorConfig, Status, KPIItem } from '@/lib/kpi-utils'
import { parseInt_, parseTMA } from '@/lib/quartil-sheets'

// ── Tipos ──────────────────────────────────────────────────────────────────────

export interface KPIsHistorico {
  pedidos:     string | null   // B(1)
  churn:       string | null   // C(2)
  retencao:    string | null   // E(4)
  tma:         string | null   // I(8)
  abs:         string | null   // K(10)
  indisp:      string | null   // L(11)
  metaPedidos: string | null   // M(12)
  metaChurn:   string | null   // N(13)
}

// ── Constantes ────────────────────────────────────────────────────────────────

const MESES_PT = [
  'Janeiro','Fevereiro','Março','Abril','Maio','Junho',
  'Julho','Agosto','Setembro','Outubro','Novembro','Dezembro',
]

// Headers sintéticos para calcularRV detectar colunas corretamente via keyword matching
// Posições correspondem às colunas fixas do KPI CONSOLIDADO histórico
export const HISTORICO_FAKE_HEADERS: string[] = (() => {
  const h = new Array(14).fill('')
  h[1]  = 'pedidos'
  h[2]  = 'churn'
  h[4]  = 'retencao'         // normalizado sem acento → detectado por KEYWORDS.retracao
  h[8]  = 'tma'
  h[10] = 'abs'
  h[11] = 'indisponibilidade'
  return h
})()

// ── Busca de planilha histórica ───────────────────────────────────────────────

export async function buscarPlanilhaHistoricaMaisRecente(): Promise<Planilha | null> {
  try {
    const db = createAdminClient()
    const { data } = await db
      .from('planilhas')
      .select('*')
      .or('tipo.is.null,tipo.eq.mes_passado')
      .not('referencia_mes', 'is', null)
      .not('referencia_ano', 'is', null)
      .order('referencia_ano', { ascending: false })
      .order('referencia_mes', { ascending: false })
      .limit(1)
      .maybeSingle()
    return (data ?? null) as Planilha | null
  } catch {
    return null
  }
}

// ── Leitura da aba KPI CONSOLIDADO ───────────────────────────────────────────

export async function lerHistoricoFechamento(
  spreadsheetId: string,
): Promise<{ headers: string[]; rows: string[][] }> {
  const aba = await resolverNomeAba(spreadsheetId, 'KPI CONSOLIDADO').catch(() => 'KPI CONSOLIDADO')
  return buscarLinhasPlanilha(spreadsheetId, aba, 500)
}

// ── Extração com layout fixo ──────────────────────────────────────────────────

export function extrairKPIsHistorico(row: string[]): KPIsHistorico {
  return {
    pedidos:     row[1]  || null,
    churn:       row[2]  || null,
    retencao:    row[4]  || null,
    tma:         row[8]  || null,
    abs:         row[10] || null,
    indisp:      row[11] || null,
    metaPedidos: row[12] || null,
    metaChurn:   row[13] || null,
  }
}

// ── Localização da linha do operador ─────────────────────────────────────────

export function encontrarRowOperador(
  rows: string[][],
  username: string,
  nomeCompleto: string,
): string[] | null {
  return rows.find(r => {
    const valorA = String(r[0] || '').trim()
    if (!valorA) return false
    return matchCelulaOperador(valorA, username, nomeCompleto)
  }) ?? null
}

// ── Formatação de mês ────────────────────────────────────────────────────────

export function nomeMesPt(mes: number): string {
  return MESES_PT[mes - 1] ?? `Mês ${mes}`
}

export function mesLabelFechamento(mes: number, ano: number): string {
  return `FECHAMENTO ${nomeMesPt(mes).toUpperCase()}/${ano}`
}

// ── Cálculo de status histórico ───────────────────────────────────────────────
// Espelha a lógica de calcStatus() de kpi-utils.ts, sem requerer objeto Meta

function calcStatusHistorico(
  valorNum: number,
  kpiKey: string,
  opConfig?: MetaOperadorConfig,
  metaIndividual?: number,
): Status {
  if (opConfig) {
    if (opConfig.modo === 'coluna_individual') {
      if (metaIndividual == null || metaIndividual <= 0) return 'neutro'
      if (kpiKey === 'pedidos') return valorNum >= metaIndividual ? 'verde' : 'vermelho'
      if (kpiKey === 'churn')   return valorNum <= metaIndividual ? 'verde' : 'vermelho'
      return 'neutro'
    }
    if (opConfig.modo === 'limiar_global') {
      const { verde_op, verde_valor, amarelo_valor } = opConfig
      if (verde_valor == null) return 'neutro'
      if (verde_op === '>=') {
        if (valorNum >= verde_valor) return 'verde'
        if (amarelo_valor != null && valorNum >= amarelo_valor) return 'amarelo'
        return 'vermelho'
      }
      if (verde_op === '<=') {
        if (valorNum <= verde_valor) return 'verde'
        if (amarelo_valor != null && valorNum <= amarelo_valor) return 'amarelo'
        return 'vermelho'
      }
    }
  }
  // Fallback hardcoded por KPI (mesmos valores de historico-status.ts)
  switch (kpiKey) {
    case 'tx_ret_bruta': return valorNum >= 66 ? 'verde' : valorNum >= 60 ? 'amarelo' : 'vermelho'
    case 'tma':          return valorNum > 0 && valorNum <= 731 ? 'verde' : 'vermelho'
    case 'abs':          return valorNum <= 5 ? 'verde' : valorNum <= 8 ? 'amarelo' : 'vermelho'
    case 'indisp':       return valorNum <= 14.5 ? 'verde' : 'vermelho'
    default:             return 'neutro'
  }
}

// ── Construção de KPIItem[] para modo histórico ───────────────────────────────

export function buildKPIsHistorico(
  kpisHist: KPIsHistorico,
  opConfigs: Record<string, MetaOperadorConfig>,
): KPIItem[] {
  const pctNum = (raw: string | null): number => {
    if (!raw) return 0
    const n = parseFloat(raw.replace(/[%\s]/g, '').replace(',', '.'))
    return isNaN(n) ? 0 : n
  }
  const intNum = (raw: string | null): number => parseInt_(raw ?? undefined) ?? 0
  const tmaNum = (raw: string | null): number => parseTMA(raw ?? undefined) ?? 0

  const metaPedidosNum = kpisHist.metaPedidos ? (parseInt_(kpisHist.metaPedidos) ?? undefined) : undefined
  const metaChurnNum   = kpisHist.metaChurn   ? (parseInt_(kpisHist.metaChurn)   ?? undefined) : undefined

  const defs = [
    { key: 'pedidos',     label: 'PEDIDOS',           raw: kpisHist.pedidos,  num: intNum(kpisHist.pedidos),  unidade: '',    metaInd: metaPedidosNum },
    { key: 'churn',       label: 'CHURN',             raw: kpisHist.churn,    num: intNum(kpisHist.churn),    unidade: '',    metaInd: metaChurnNum },
    { key: 'tx_ret_bruta',label: 'TX. RETENÇÃO',      raw: kpisHist.retencao, num: pctNum(kpisHist.retencao), unidade: '%',   metaInd: undefined },
    { key: 'tma',         label: 'TMA',               raw: kpisHist.tma,      num: tmaNum(kpisHist.tma),      unidade: 'seg', metaInd: undefined },
    { key: 'abs',         label: 'ABS',               raw: kpisHist.abs,      num: pctNum(kpisHist.abs),      unidade: '%',   metaInd: undefined },
    { key: 'indisp',      label: 'INDISPONIBILIDADE', raw: kpisHist.indisp,   num: pctNum(kpisHist.indisp),   unidade: '%',   metaInd: undefined },
  ]

  return defs.map((d, i) => {
    const opConfig = opConfigs[d.key]
    const status   = d.raw
      ? calcStatusHistorico(d.num, d.key, opConfig, d.metaInd)
      : ('neutro' as const)
    const item: KPIItem = {
      nome_coluna: d.key,
      label:       d.label,
      valor:       d.raw ?? '—',
      valorNum:    d.num,
      unidade:     d.unidade,
      status,
      progresso:   0,
      basico:      true,
      indice:      i,
      opConfig,
    }
    if (d.metaInd != null) item.metaIndividual = d.metaInd
    return item
  })
}
