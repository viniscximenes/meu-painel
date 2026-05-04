// ── Utilitários puros de RV Gestor ───────────────────────────────────────────
// NÃO importa supabase/admin nem googleapis. Seguro para Client Components.

// ── Tipos ─────────────────────────────────────────────────────────────────────

export interface FaixaGestor { min: number; valor: number }
export interface DeflatorABSFaixa { limite: number; perda: number }

export type RVGestorConfigRaw = Record<string, string>

export interface RVGestorConfig {
  monitoriasMinimas:    number
  retencaoFaixas:       FaixaGestor[]
  indispMeta:           number
  indispValor:          number
  tmaMetaSeg:           number
  tmaValor:             number
  ticketFaixas:         FaixaGestor[]
  ticketMinRetracao:    number
  bonusRetencaoMin:     number
  bonusAbsMax:          number
  bonusPercentual:      number
  tmaDeflatorPct:       number
  tmaDeflatorPerda:     number
  indispDeflatorPerda:  number
  absDeflatorFaixas:    DeflatorABSFaixa[]
}

export interface DadosGestorParsed {
  retencaoVal:          number   // %
  indispVal:            number   // %
  tmaValSeg:            number   // seconds
  ticketVal:            number   // % signed
  absVal:               number   // %
  monitoriasCompletas:  number   // operators with 4+ sent
  totalMonitorias:      number   // total sent
  semDados:             boolean  // pré-computado em page.tsx via null-check
}

export interface DeflatorAplicado {
  motivo:       string
  perda:        number   // % deduzido
  valorDeduzido: number
}

export interface ResultadoRVGestor {
  elegivel:            boolean
  motivoInelegivel:    string | null
  retencaoVal:         number
  retencaoFaixa:       FaixaGestor | null
  retencaoBase:        number
  indispVal:           number
  indispBonus:         number
  tmaValSeg:           number
  tmaBonus:            number
  ticketVal:           number
  ticketFaixa:         FaixaGestor | null
  ticketBonus:         number
  ticketAplicavel:     boolean
  rvBase:              number
  bonusAplicado:       boolean
  bonusValor:          number
  rvComBonus:          number
  deflatores:          DeflatorAplicado[]
  totalDeflator:       number
  rvFinal:             number
  semDados:            boolean
}

// ── Defaults ──────────────────────────────────────────────────────────────────

export const RV_GESTOR_DEFAULTS: RVGestorConfigRaw = {
  gestor_monitorias_minimas:    '13',
  gestor_retracao_faixas:       JSON.stringify([{min:65,valor:800},{min:63,valor:500},{min:60,valor:400},{min:58,valor:200}]),
  gestor_indisp_meta:           '14.5',
  gestor_indisp_valor:          '200',
  gestor_tma_meta_seg:          '731',
  gestor_tma_valor:             '200',
  gestor_ticket_faixas:         JSON.stringify([{min:-12,valor:300},{min:-15,valor:200},{min:-18,valor:100}]),
  gestor_ticket_min_retracao:   '60',
  gestor_bonus_retracao_min:    '63.6',
  gestor_bonus_abs_max:         '5',
  gestor_bonus_percentual:      '20',
  gestor_tma_deflator_pct:      '5',
  gestor_tma_deflator_perda:    '15',
  gestor_indisp_deflator_perda: '15',
  gestor_abs_deflator_faixas:   JSON.stringify([
    {limite:5,perda:0},{limite:6,perda:10},{limite:8,perda:20},{limite:10,perda:30},{limite:999,perda:50},
  ]),
}

// ── Parse ─────────────────────────────────────────────────────────────────────

export function parseRVGestorConfig(raw: RVGestorConfigRaw): RVGestorConfig {
  const n = (k: string) => parseFloat(raw[k] ?? '0') || 0
  const j = <T,>(k: string): T => { try { return JSON.parse(raw[k] ?? '[]') } catch { return [] as unknown as T } }
  return {
    monitoriasMinimas:    n('gestor_monitorias_minimas') || 13,
    retencaoFaixas:       j<FaixaGestor[]>('gestor_retracao_faixas').sort((a, b) => b.min - a.min),
    indispMeta:           n('gestor_indisp_meta'),
    indispValor:          n('gestor_indisp_valor'),
    tmaMetaSeg:           n('gestor_tma_meta_seg'),
    tmaValor:             n('gestor_tma_valor'),
    ticketFaixas:         j<FaixaGestor[]>('gestor_ticket_faixas').sort((a, b) => b.min - a.min),
    ticketMinRetracao:    n('gestor_ticket_min_retracao'),
    bonusRetencaoMin:     n('gestor_bonus_retracao_min'),
    bonusAbsMax:          n('gestor_bonus_abs_max'),
    bonusPercentual:      n('gestor_bonus_percentual'),
    tmaDeflatorPct:       n('gestor_tma_deflator_pct'),
    tmaDeflatorPerda:     n('gestor_tma_deflator_perda'),
    indispDeflatorPerda:  n('gestor_indisp_deflator_perda'),
    absDeflatorFaixas:    j<DeflatorABSFaixa[]>('gestor_abs_deflator_faixas').sort((a, b) => a.limite - b.limite),
  }
}

// ── Formatação ────────────────────────────────────────────────────────────────

export function segParaMMSSGestor(seg: number): string {
  const m = Math.floor(seg / 60)
  const s = Math.round(seg % 60)
  return `${String(m).padStart(2, '0')}:${String(s).padStart(2, '0')}`
}

export function formatBRLGestor(v: number): string {
  return v.toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' })
}

// ── Cálculo ───────────────────────────────────────────────────────────────────

export function calcularRVGestor(
  dados: DadosGestorParsed,
  config: RVGestorConfig,
): ResultadoRVGestor {
  const { retencaoVal, indispVal, tmaValSeg, ticketVal, absVal, monitoriasCompletas, semDados } = dados

  // Elegibilidade — não interrompe o cálculo; RV é sempre computada
  const elegivel = !semDados && monitoriasCompletas >= config.monitoriasMinimas
  const motivoInelegivel = semDados
    ? 'Sem dados na planilha'
    : !elegivel
      ? `Monitorias incompletas: ${monitoriasCompletas}/${config.monitoriasMinimas} operadores com 4+ monitorias`
      : null

  if (semDados) {
    return {
      elegivel: false, motivoInelegivel, semDados,
      retencaoVal, retencaoFaixa: null, retencaoBase: 0,
      indispVal, indispBonus: 0,
      tmaValSeg, tmaBonus: 0,
      ticketVal, ticketFaixa: null, ticketBonus: 0, ticketAplicavel: false,
      rvBase: 0, bonusAplicado: false, bonusValor: 0, rvComBonus: 0,
      deflatores: [], totalDeflator: 0, rvFinal: 0,
    }
  }

  // 1. Remuneração base (Tx. Retenção)
  const retencaoFaixa = config.retencaoFaixas.find(f => retencaoVal >= f.min) ?? null
  const retencaoBase  = retencaoFaixa?.valor ?? 0

  // 2. Operacional
  const indispBonus = indispVal > 0 && indispVal <= config.indispMeta ? config.indispValor : 0
  const tmaBonus    = tmaValSeg > 0 && tmaValSeg <= config.tmaMetaSeg ? config.tmaValor : 0

  // 3. Variação Ticket (só se retenção >= ticketMinRetracao)
  const ticketAplicavel = retencaoVal >= config.ticketMinRetracao
  const ticketFaixa     = ticketAplicavel
    ? (config.ticketFaixas.find(f => ticketVal >= f.min) ?? null)
    : null
  const ticketBonus = ticketFaixa?.valor ?? 0

  const rvBase = retencaoBase + indispBonus + tmaBonus + ticketBonus

  // 4. Bônus 20%
  const bonusAplicado = retencaoVal >= config.bonusRetencaoMin && absVal <= config.bonusAbsMax
  const bonusValor    = bonusAplicado ? Math.round(rvBase * config.bonusPercentual / 100 * 100) / 100
                                      : 0
  const rvComBonus    = rvBase + bonusValor

  // 5. Deflatores
  const deflatores: DeflatorAplicado[] = []

  // TMA deflator: se TMA > metaSeg * (1 + deflatorPct/100)
  const tmaLimiteDeflator = Math.round(config.tmaMetaSeg * (1 + config.tmaDeflatorPct / 100))
  if (tmaValSeg > tmaLimiteDeflator) {
    const valorDeduzido = Math.round(rvComBonus * config.tmaDeflatorPerda / 100 * 100) / 100
    deflatores.push({
      motivo: `TMA ${segParaMMSSGestor(tmaValSeg)} > ${segParaMMSSGestor(tmaLimiteDeflator)}`,
      perda: config.tmaDeflatorPerda,
      valorDeduzido,
    })
  }

  // Indisp deflator
  if (indispVal > config.indispMeta) {
    const valorDeduzido = Math.round(rvComBonus * config.indispDeflatorPerda / 100 * 100) / 100
    deflatores.push({
      motivo: `Indisponibilidade ${indispVal.toFixed(1)}% > ${config.indispMeta}%`,
      perda: config.indispDeflatorPerda,
      valorDeduzido,
    })
  }

  // ABS deflator
  // Faixas sorted asc: [{limite:5,perda:0},{limite:6,perda:10},{limite:8,perda:20},{limite:10,perda:30},{limite:999,perda:50}]
  // Each entry means: if absVal <= limite, apply this perda.
  // Find the FIRST faixa where absVal <= limite.
  // e.g. absVal=8.8: 8.8<=5? No, 8.8<=6? No, 8.8<=8? No, 8.8<=10? Yes → perda=30 ✓
  let absDeflPerda = 0
  for (const f of config.absDeflatorFaixas) {
    if (absVal <= f.limite) {
      absDeflPerda = f.perda
      break
    }
  }
  if (absDeflPerda > 0) {
    const valorDeduzido = Math.round(rvComBonus * absDeflPerda / 100 * 100) / 100
    deflatores.push({
      motivo: `ABS ${absVal.toFixed(1)}%`,
      perda: absDeflPerda,
      valorDeduzido,
    })
  }

  const totalDeflator = Math.round(deflatores.reduce((s, d) => s + d.valorDeduzido, 0) * 100) / 100
  const rvFinal = Math.max(0, Math.round((rvComBonus - totalDeflator) * 100) / 100)

  return {
    elegivel, motivoInelegivel, semDados,
    retencaoVal, retencaoFaixa, retencaoBase,
    indispVal, indispBonus,
    tmaValSeg, tmaBonus,
    ticketVal, ticketFaixa, ticketBonus, ticketAplicavel,
    rvBase, bonusAplicado, bonusValor, rvComBonus,
    deflatores, totalDeflator, rvFinal,
  }
}
