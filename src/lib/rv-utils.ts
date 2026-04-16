// ── Utilitários puros de RV ───────────────────────────────────────────────────
// Este arquivo NÃO importa supabase/admin nem qualquer lib Node.js.
// Pode ser importado em Client Components com segurança.

// ── Funções puras ─────────────────────────────────────────────────────────────

export function formatBRL(valor: number): string {
  return valor.toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' })
}

export function segParaMMSS(seg: number): string {
  const m = Math.floor(seg / 60)
  const s = Math.round(seg % 60)
  return `${String(m).padStart(2, '0')}:${String(s).padStart(2, '0')}`
}

export function mmssParaSeg(mmss: string): number {
  const m = String(mmss).trim().match(/^(\d+):(\d{2})$/)
  if (m) return parseInt(m[1]) * 60 + parseInt(m[2])
  const n = parseInt(String(mmss))
  return isNaN(n) ? 0 : n
}

// ── Tipos ─────────────────────────────────────────────────────────────────────

export interface PenalidadeRV {
  metaId: string
  metaLabel: string
  ativa: boolean
  percentual: number  // ex: 10 → desconta 10% do rvTotal
}

export interface DescontoIndividual {
  id: string           // timestamp-based ID
  operadorId: number
  operadorNome: string
  motivo: string
  tipo: 'fixo' | 'percentual'
  valor: number        // R$ (fixo) ou % do rvFinal
  mesReferencia: string // YYYY-MM
}

export interface PenalidadeAplicada {
  metaLabel: string
  percentual: number
  valorDeduzido: number
}

export interface FaixaRV {
  min: number    // limiar em %
  valor: number  // prêmio em R$
}

export type RVConfigRaw = Record<string, string>

export interface RVConfig {
  absMaximo: number
  retracaoFaixas: FaixaRV[]
  indispLimite: number
  indispValor: number
  tmaLimiteSeg: number
  tmaValor: number
  ticketFaixas: FaixaRV[]
  ticketMinRetracao: number
  pedidosMeta: number
  churnMeta: number
  bonusValor: number
  bonusRetracaoMinima: number
  bonusIndispMaxima: number
  penalidades: PenalidadeRV[]
  descontosIndividuais: DescontoIndividual[]
}

export interface ComponenteRV {
  id: string
  label: string
  valorDisplay: string
  valorNum: number
  regraDisplay: string
  ganhou: boolean
  aplicavel: boolean
  premio: number
  colunaEncontrada?: string
  detalhe?: string
}

export interface BonusCriterios {
  retracaoOk: boolean
  retracaoAtual: number
  churnOk: boolean
  churnAtual: number
  churnMeta: number
  indispOk: boolean
  indispAtual: number
}

export interface ResultadoRV {
  elegivel: boolean
  motivosInelegivel: string[]
  componentes: ComponenteRV[]
  rvBase: number
  pedidosRealizados: number
  pedidosMeta: number
  multiplicador: number
  rvAposPedidos: number
  bonusCriterios: BonusCriterios
  bonus: number
  rvTotal: number
  penalidades: PenalidadeAplicada[]
  totalPenalidade: number
  rvFinal: number
  descontoIndividualAplicado: { motivo: string; valor: number } | null
  semDados: boolean
  config: RVConfig
}

export const RV_CONFIG_DEFAULTS: RVConfigRaw = {
  abs_maximo:            '5',
  bonus_valor:           '300',
  retracao_faixas:       JSON.stringify([{min:66,valor:700},{min:63,valor:400},{min:60,valor:300},{min:57,valor:200}]),
  indisp_limite:         '14.5',
  indisp_valor:          '150',
  tma_limite_seg:        '731',
  tma_valor:             '150',
  ticket_faixas:         JSON.stringify([{min:-6,valor:200},{min:-9,valor:150},{min:-15,valor:100},{min:-18,valor:50}]),
  ticket_min_retracao:   '60',
  pedidos_meta:          '260',
  churn_meta:            '0',
  bonus_retracao_minima: '66',
  bonus_indisp_maxima:   '14.5',
  penalidades:              '[]',
  descontos_individuais:    '[]',
}

export function parseRVConfig(raw: RVConfigRaw): RVConfig {
  const n = (k: string) => parseFloat(raw[k] ?? '0') || 0
  const j = <T,>(k: string): T => { try { return JSON.parse(raw[k] ?? '[]') } catch { return [] as unknown as T } }
  return {
    absMaximo:           n('abs_maximo'),
    retracaoFaixas:      j<FaixaRV[]>('retracao_faixas').sort((a, b) => b.min - a.min),
    indispLimite:        n('indisp_limite'),
    indispValor:         n('indisp_valor'),
    tmaLimiteSeg:        n('tma_limite_seg'),
    tmaValor:            n('tma_valor'),
    ticketFaixas:        j<FaixaRV[]>('ticket_faixas').sort((a, b) => b.min - a.min),
    ticketMinRetracao:   n('ticket_min_retracao'),
    pedidosMeta:         n('pedidos_meta'),
    churnMeta:           n('churn_meta'),
    bonusValor:          n('bonus_valor'),
    bonusRetracaoMinima: n('bonus_retracao_minima'),
    bonusIndispMaxima:   n('bonus_indisp_maxima'),
    penalidades:         j<PenalidadeRV[]>('penalidades'),
    descontosIndividuais: j<DescontoIndividual[]>('descontos_individuais'),
  }
}
