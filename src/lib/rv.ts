// ── SERVIDOR APENAS ──────────────────────────────────────────────────────────
// Este arquivo importa createAdminClient (service role key). NUNCA importar em
// Client Components. Tipos e utilitários puros estão em @/lib/rv-utils.

import { createAdminClient } from '@/lib/supabase/admin'
import { parseTempo } from '@/lib/diario-utils'

// Re-exporta tudo de rv-utils para que imports de servidor continuem funcionando
export * from '@/lib/rv-utils'

import {
  type RVConfig,
  type RVConfigRaw,
  type FaixaRV,
  type ComponenteRV,
  type BonusCriterios,
  type ResultadoRV,
  RV_CONFIG_DEFAULTS,
  parseRVConfig,
  formatBRL,
  segParaMMSS,
} from '@/lib/rv-utils'

// ── Supabase: ler / salvar config ─────────────────────────────────────────────

export async function getRVConfigRaw(): Promise<RVConfigRaw> {
  try {
    const db = createAdminClient()
    const { data } = await db.from('rv_config').select('chave, valor')
    const map: RVConfigRaw = { ...RV_CONFIG_DEFAULTS }
    for (const row of data ?? []) map[row.chave] = row.valor
    return map
  } catch {
    return { ...RV_CONFIG_DEFAULTS }
  }
}

export async function salvarRVConfig(dados: Record<string, string>): Promise<void> {
  const db = createAdminClient()
  const rows = Object.entries(dados).map(([chave, valor]) => ({
    chave, valor, updated_at: new Date().toISOString(),
  }))
  await db.from('rv_config').upsert(rows, { onConflict: 'chave' })
}

export async function getRVConfig(): Promise<RVConfig> {
  return parseRVConfig(await getRVConfigRaw())
}

/**
 * Extrai os valores brutos de ABS e Indisponibilidade de uma linha da planilha,
 * usando a mesma detecção automática de colunas do motor de RV.
 * Seguro para chamar em Server Components.
 */
export function extrairABSeIndisp(
  headers: string[],
  row: string[]
): { absPercent: number; indispPercent: number; colAbs: string; colIndisp: string } {
  const detAbs   = detectarIndice(headers, 'abs')
  const detIndisp = detectarIndice(headers, 'indisp')

  const rawAbs   = detAbs.idx   >= 0 ? (row[detAbs.idx]   ?? '') : ''
  const rawIndisp = detIndisp.idx >= 0 ? (row[detIndisp.idx] ?? '') : ''

  return {
    absPercent:   parsePct(rawAbs),
    indispPercent: parsePct(rawIndisp),
    colAbs:   detAbs.header,
    colIndisp: detIndisp.header,
  }
}

/**
 * Extrai indisponibilidade %, tempo logado e tempo projetado (forecast) da
 * linha do operador na planilha KPI consolidado.
 *
 * Colunas alvo (detectadas por keyword):
 *   tempo_logado   → "Tempo de Login", "AH", "Tempo Logado"…
 *   tempo_projetado→ "Tempo Projetado", "Horas Projetadas"…
 *   indisp_total   → "Indisp Total (%)", "AR"… (fallback: "Indisp")
 *
 * Formatos aceitos para tempo: "131:45:22" (HH:MM:SS) ou "131:45" (HH:MM).
 */
export function extrairDadosContestacao(
  headers: string[],
  row: string[]
): {
  indispPercent:      number
  tempoLogadoHoras:   number
  tempoProjetadoHoras: number
  colIndisp:          string
  colTempoLogado:     string
  colTempoProjetado:  string
} {
  const detIndispTotal  = detectarIndice(headers, 'indisp_total')
  const detIndisp       = detectarIndice(headers, 'indisp')
  const detTempo        = detectarIndice(headers, 'tempo_logado')
  const detProjetado    = detectarIndice(headers, 'tempo_projetado')

  const useIndisp = detIndispTotal.idx >= 0 ? detIndispTotal : detIndisp

  const rawIndisp    = useIndisp.idx    >= 0 ? (row[useIndisp.idx]    ?? '') : ''
  const rawTempo     = detTempo.idx     >= 0 ? (row[detTempo.idx]     ?? '') : ''
  const rawProjetado = detProjetado.idx >= 0 ? (row[detProjetado.idx] ?? '') : ''

  // parseTempo("131:45:22") → 131×60+45 = 7905 min ÷ 60 = 131.75h
  const tempoLogadoHoras    = parseTempo(rawTempo)     > 0 ? parseTempo(rawTempo)     / 60 : 0
  const tempoProjetadoHoras = parseTempo(rawProjetado) > 0 ? parseTempo(rawProjetado) / 60 : 0

  return {
    indispPercent:       parsePct(rawIndisp),
    tempoLogadoHoras,
    tempoProjetadoHoras,
    colIndisp:           useIndisp.header,
    colTempoLogado:      detTempo.header,
    colTempoProjetado:   detProjetado.header,
  }
}

// ── Auto-detecção de colunas por keywords ─────────────────────────────────────

function normH(s: string): string {
  return s
    .replace(/\u00a0/g, ' ')
    .replace(/\r|\t/g, ' ')
    .toLowerCase()
    .replace(/\s+/g, ' ')
    .trim()
}

const KEYWORDS: Record<string, string[]> = {
  retracao: [
    'tx de retenção', 'tx retencao', 'tx de retencao',
    'retenção bruta', 'retencao bruta',
    'tx retenção', 'tx retencao',
    'retenção', 'retencao', 'retencão',
    'taxa de retenção', 'taxa retencao',
  ],
  indisp: [
    'indisponibilidade',
    'indisp',
  ],
  indisp_total: [
    'indisp total (%)', 'indisp total',
    'indisponibilidade total',
    'ar',
  ],
  tempo_logado: [
    'tempo de login',
    'tempo login',
    'ah real', 'horas reais',
    'tempo logado real',
    'tempo logado',
    'horas logadas', 'horas trabalhadas',
    'login real',
    'ah',
  ],
  tempo_projetado: [
    'tempo projetado',
    'horas projetadas', 'forecast horas',
    'jornada projetada', 'jornada prevista',
    'horas previstas', 'tempo previsto',
  ],
  tma: [
    'tma bruto', 'tma medio', 'tma médio',
    'tma',
    'tempo médio de atendimento', 'tempo medio de atendimento',
    'tempo médio', 'tempo medio',
  ],
  ticket: [
    'variação de ticket', 'variacao de ticket',
    'var ticket', 'variação ticket', 'variacao ticket',
    'ticket médio', 'ticket medio',
    'ticket',
  ],
  pedidos: [
    'pedidos realizados', 'total pedidos realizados',
    'qtd pedidos', 'quantidade pedidos',
    'pedidos totais', 'total de pedidos',
    'pedidos',
  ],
  churn: [
    'churn',
    'cancelamento', 'cancelas',
    'taxa de churn', 'total churn',
  ],
  abs: [
    'absenteísmo', 'absenteismo',
    'ausência', 'ausencia',
    'abs',
  ],
}

function detectarIndice(headers: string[], campo: string): { idx: number; header: string } {
  const normsH  = headers.map(h => normH(h))
  const keywords = KEYWORDS[campo] ?? []

  for (const kw of keywords) {
    const normKw = normH(kw)
    const exact = normsH.indexOf(normKw)
    if (exact !== -1) return { idx: exact, header: headers[exact] }
    const cont = normsH.findIndex(h => h.includes(normKw))
    if (cont !== -1) return { idx: cont, header: headers[cont] }
    if (normKw.length <= 6) {
      const rev = normsH.findIndex(h => h.length > 1 && normKw.includes(h))
      if (rev !== -1) return { idx: rev, header: headers[rev] }
    }
  }
  return { idx: -1, header: '' }
}

// ── Parsers de valor ──────────────────────────────────────────────────────────

function parsePct(raw: string): number {
  if (!raw) return 0
  const clean = raw.replace(/[%\s]/g, '').replace(',', '.')
  const n = parseFloat(clean)
  if (isNaN(n)) return 0
  return n > 0 && n <= 1 ? Math.round(n * 10000) / 100 : n
}

function parseSeg(raw: string): number {
  if (!raw) return 0
  const mmss = raw.trim().match(/^(\d+):(\d{2})$/)
  if (mmss) return parseInt(mmss[1]) * 60 + parseInt(mmss[2])
  const n = parseFloat(raw.replace(',', '.').replace(/[^\d.]/g, ''))
  return isNaN(n) ? 0 : n
}

function parseNumSig(raw: string): number {
  if (!raw) return 0
  const clean = raw.replace(/[%\s]/g, '').replace(',', '.')
  const n = parseFloat(clean)
  return isNaN(n) ? 0 : n
}

function encontrarFaixa(valor: number, faixas: FaixaRV[]): FaixaRV | null {
  for (const f of faixas) {
    if (valor >= f.min) return f
  }
  return null
}

function fmtPct(v: number): string {
  return `${v % 1 === 0 ? v : v.toFixed(1)}%`
}

// ── Motor de cálculo ──────────────────────────────────────────────────────────

export function calcularRV(
  headers: string[],
  row: string[],
  config: RVConfig,
  label = '',
): ResultadoRV {
  const debug = !!label

  const det = {
    retracao: detectarIndice(headers, 'retracao'),
    indisp:   detectarIndice(headers, 'indisp'),
    tma:      detectarIndice(headers, 'tma'),
    ticket:   detectarIndice(headers, 'ticket'),
    pedidos:  detectarIndice(headers, 'pedidos'),
    churn:    detectarIndice(headers, 'churn'),
    abs:      detectarIndice(headers, 'abs'),
  }

  if (debug) {
    const totalH = headers.length
    console.log(`\n[RV] ══ ${label} ══ (${totalH} headers)`)
    console.log(`[RV] Config: absMax=${config.absMaximo}% | indispLim=${config.indispLimite}% | tmaLim=${segParaMMSS(config.tmaLimiteSeg)} | pedidosMeta=${config.pedidosMeta}`)
    console.log(`[RV] Faixas retenção: ${config.retracaoFaixas.map(f=>`≥${f.min}%→R$${f.valor}`).join(' | ')}`)
    console.log(`[RV] Colunas detectadas:`)
    for (const [campo, d] of Object.entries(det)) {
      console.log(`  ${campo.padEnd(10)}: ${d.idx >= 0 ? `col[${d.idx}] "${d.header}"` : 'NÃO ENCONTRADA'}`)
    }
  }

  const get = (d: { idx: number }) => d.idx >= 0 ? (row[d.idx] ?? '') : ''

  const rawRetracao = get(det.retracao)
  const rawIndisp   = get(det.indisp)
  const rawTma      = get(det.tma)
  const rawTicket   = get(det.ticket)
  const rawPedidos  = get(det.pedidos)
  const rawChurn    = get(det.churn)
  const rawAbs      = get(det.abs)

  const semDados = !rawRetracao && !rawIndisp && !rawTma

  const retracaoVal = parsePct(rawRetracao)
  const indispVal   = parsePct(rawIndisp)
  const tmaVal      = parseSeg(rawTma)
  const ticketVal   = parseNumSig(rawTicket)
  const pedidosVal  = parseNumSig(rawPedidos)
  const churnVal    = parseNumSig(rawChurn)
  const absVal      = parsePct(rawAbs)

  if (debug) {
    console.log(`[RV] Valores brutos: ret="${rawRetracao}" indisp="${rawIndisp}" tma="${rawTma}" ticket="${rawTicket}" pedidos="${rawPedidos}" churn="${rawChurn}" abs="${rawAbs}"`)
    console.log(`[RV] Valores parsed: ret=${retracaoVal}% indisp=${indispVal}% tma=${tmaVal}s ticket=${ticketVal}% pedidos=${pedidosVal} churn=${churnVal} abs=${absVal}%`)
    console.log(`[RV] semDados=${semDados}`)
  }

  const motivosInelegivel: string[] = []
  if (!semDados && absVal > config.absMaximo) {
    motivosInelegivel.push(`ABS ${fmtPct(absVal)} — máximo ${fmtPct(config.absMaximo)}`)
  }
  const elegivel = !semDados && motivosInelegivel.length === 0

  if (debug) {
    console.log(`[RV] Elegível: ${elegivel}${motivosInelegivel.length ? ' | Motivos: ' + motivosInelegivel.join(', ') : ''}`)
  }

  const componentes: ComponenteRV[] = []
  const menorFaixaR = config.retracaoFaixas[config.retracaoFaixas.length - 1]
  const menorFaixaT = config.ticketFaixas[config.ticketFaixas.length - 1]

  // 1. TX Retenção
  const retFaixa  = encontrarFaixa(retracaoVal, config.retracaoFaixas)
  const retPremio = elegivel && retFaixa ? retFaixa.valor : 0
  if (debug) console.log(`[RV] Retenção: ${retracaoVal}% → faixa ${retFaixa ? `≥${retFaixa.min}%` : 'nenhuma'} → R$${retPremio}`)
  componentes.push({
    id: 'retracao',
    label: 'TX de Retenção',
    valorDisplay: rawRetracao ? fmtPct(retracaoVal) : '—',
    valorNum: retracaoVal,
    regraDisplay: retFaixa
      ? `≥ ${retFaixa.min}% → ${formatBRL(retFaixa.valor)}`
      : `< ${menorFaixaR?.min ?? 57}% → ${formatBRL(0)}`,
    ganhou: elegivel && retPremio > 0,
    aplicavel: !semDados,
    premio: retPremio,
    colunaEncontrada: det.retracao.header || undefined,
  })

  // 2. Indisponibilidade
  const indispOk = !semDados && indispVal > 0 && indispVal <= config.indispLimite
  if (debug) console.log(`[RV] Indisp: ${indispVal}% ≤ ${config.indispLimite}%? ${indispOk} → R$${elegivel && indispOk ? config.indispValor : 0}`)
  componentes.push({
    id: 'indisp',
    label: 'Indisponibilidade',
    valorDisplay: rawIndisp ? fmtPct(indispVal) : '—',
    valorNum: indispVal,
    regraDisplay: `≤ ${fmtPct(config.indispLimite)} → ${formatBRL(config.indispValor)}`,
    ganhou: elegivel && indispOk,
    aplicavel: !semDados,
    premio: elegivel && indispOk ? config.indispValor : 0,
    colunaEncontrada: det.indisp.header || undefined,
  })

  // 3. TMA
  const tmaOk = !semDados && tmaVal > 0 && tmaVal < config.tmaLimiteSeg
  if (debug) console.log(`[RV] TMA: ${tmaVal}s < ${config.tmaLimiteSeg}s? ${tmaOk} → R$${elegivel && tmaOk ? config.tmaValor : 0}`)
  componentes.push({
    id: 'tma',
    label: 'TMA',
    valorDisplay: rawTma ? (tmaVal >= 60 ? segParaMMSS(tmaVal) : `${tmaVal}s`) : '—',
    valorNum: tmaVal,
    regraDisplay: `< ${segParaMMSS(config.tmaLimiteSeg)} → ${formatBRL(config.tmaValor)}`,
    ganhou: elegivel && tmaOk,
    aplicavel: !semDados,
    premio: elegivel && tmaOk ? config.tmaValor : 0,
    colunaEncontrada: det.tma.header || undefined,
  })

  // 4. Variação de Ticket
  const ticketAplicavel = !semDados && retracaoVal >= config.ticketMinRetracao
  const tickFaixa       = ticketAplicavel ? encontrarFaixa(ticketVal, config.ticketFaixas) : null
  const tickPremio      = elegivel && ticketAplicavel && tickFaixa ? tickFaixa.valor : 0
  const sinalT          = ticketVal >= 0 ? '+' : ''
  if (debug) console.log(`[RV] Ticket: ${ticketVal}% | aplicável=${ticketAplicavel} | faixa ${tickFaixa ? `≥${tickFaixa.min}%` : 'nenhuma'} → R$${tickPremio}`)
  componentes.push({
    id: 'ticket',
    label: 'Variação de Ticket',
    valorDisplay: rawTicket ? `${sinalT}${fmtPct(ticketVal)}` : '—',
    valorNum: ticketVal,
    regraDisplay: tickFaixa
      ? `≥ ${tickFaixa.min}% → ${formatBRL(tickFaixa.valor)}`
      : `< ${menorFaixaT?.min ?? -18}% → ${formatBRL(0)}`,
    ganhou: elegivel && ticketAplicavel && tickPremio > 0,
    aplicavel: ticketAplicavel,
    premio: tickPremio,
    colunaEncontrada: det.ticket.header || undefined,
    detalhe: !ticketAplicavel && !semDados
      ? `Requer TX Retenção ≥ ${config.ticketMinRetracao}% (atual: ${fmtPct(retracaoVal)})`
      : undefined,
  })

  const rvBase = componentes.reduce((s, c) => s + c.premio, 0)
  if (debug) console.log(`[RV] RV Base: R$${rvBase}`)

  let multiplicador = 1
  if (!semDados && config.pedidosMeta > 0 && pedidosVal > 0) {
    multiplicador = Math.round(Math.min(pedidosVal / config.pedidosMeta, 1) * 10000) / 10000
  }
  const rvAposPedidos = Math.round(rvBase * multiplicador * 100) / 100
  if (debug) console.log(`[RV] Pedidos: ${pedidosVal}/${config.pedidosMeta} = ×${multiplicador} → RV R$${rvAposPedidos}`)

  const bonusRetracaoOk = retracaoVal >= config.bonusRetracaoMinima
  const bonusIndispOk   = indispVal > 0 && indispVal <= config.bonusIndispMaxima
  const bonusChurnOk    = config.churnMeta <= 0 || (churnVal > 0 && churnVal <= config.churnMeta)
  const bonusCriterios: BonusCriterios = {
    retracaoOk: bonusRetracaoOk, retracaoAtual: retracaoVal,
    churnOk: bonusChurnOk,       churnAtual: churnVal,    churnMeta: config.churnMeta,
    indispOk: bonusIndispOk,     indispAtual: indispVal,
  }
  const bonus = elegivel && bonusRetracaoOk && bonusIndispOk && bonusChurnOk ? config.bonusValor : 0
  const rvTotal = Math.round((rvAposPedidos + bonus) * 100) / 100

  if (debug) {
    console.log(`[RV] Bônus: ret≥${config.bonusRetracaoMinima}%=${bonusRetracaoOk} | indisp≤${config.bonusIndispMaxima}%=${bonusIndispOk} | churn=${bonusChurnOk} → R$${bonus}`)
    console.log(`[RV] ★ RV TOTAL: R$${rvTotal}\n`)
  }

  return {
    elegivel, motivosInelegivel, componentes,
    rvBase, pedidosRealizados: pedidosVal, pedidosMeta: config.pedidosMeta,
    multiplicador, rvAposPedidos,
    bonusCriterios, bonus, rvTotal,
    semDados, config,
  }
}
