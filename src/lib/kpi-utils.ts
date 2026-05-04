// ── Utilitários puros de KPI ──────────────────────────────────────────────────
// Este arquivo NÃO importa supabase/admin nem qualquer lib Node.js.
// Pode ser importado em Client Components com segurança.

// ── Tipos ─────────────────────────────────────────────────────────────────────

export type Status = 'verde' | 'amarelo' | 'vermelho' | 'neutro'

export interface Meta {
  id: string
  nome_coluna: string
  label: string
  valor_meta: number
  tipo: 'maior_melhor' | 'menor_melhor'
  tipoAcumulo?: 'acumulavel' | 'media' | 'pontual'
  amarelo_inicio: number
  verde_inicio: number
  unidade: string
  basico: boolean
  ordem: number
  icone?: string
  descricao?: string
}

export interface KPIItem {
  nome_coluna: string
  label: string
  valor: string
  valorNum: number
  unidade: string
  status: Status
  progresso: number
  meta?: Meta
  basico: boolean
  indice: number
  metaIndividual?: number
  opConfig?: MetaOperadorConfig
}

export interface MetaOperadorConfig {
  kpi_key: string
  modo: 'limiar_global' | 'coluna_individual'
  verde_op?: string | null
  verde_valor?: number | null
  amarelo_op?: string | null
  amarelo_valor?: number | null
  coluna_meta?: string | null
}

/** Estruturalmente idêntico a MetaOperadorConfig — tabela separada (metas_gestor_config). */
export type MetaGestorConfig = MetaOperadorConfig

/** Calcula status para KPIs do gestor usando metas_gestor_config, sem depender da tabela metas legada. */
export function calcStatusGestor(
  v: number | null | undefined,
  config?: MetaGestorConfig,
  metaIndividual?: number | null,
): Status {
  if (v == null) return 'neutro'
  if (!config) return 'neutro'

  if (config.modo === 'coluna_individual') {
    if (metaIndividual == null) return 'neutro'
    return v <= metaIndividual ? 'verde' : 'vermelho'
  }

  if (config.modo === 'limiar_global') {
    const { verde_op, verde_valor, amarelo_valor } = config
    if (verde_valor == null || verde_valor <= 0) return 'neutro'
    if (verde_op === '>=') {
      if (v >= verde_valor) return 'verde'
      if (amarelo_valor != null && v >= amarelo_valor) return 'amarelo'
      return 'vermelho'
    }
    if (verde_op === '<=') {
      if (v <= verde_valor) return 'verde'
      if (amarelo_valor != null && v <= amarelo_valor) return 'amarelo'
      return 'vermelho'
    }
  }

  return 'neutro'
}

// ── Normalização de chave de coluna ──────────────────────────────────────────

export function normalizarChave(s: string): string {
  return s
    .replace(/\u00a0/g, ' ')
    .replace(/\r|\t/g, ' ')
    .trim()
    .toLowerCase()
    .replace(/\s+/g, ' ')
}

// ── Parser interno ────────────────────────────────────────────────────────────

function parseNum(raw: string | undefined): number {
  if (!raw) return 0
  const clean = raw.replace(/[%R$\s]/g, '').replace(',', '.')
  const n = parseFloat(clean)
  return isNaN(n) ? 0 : n
}

function parseTempoSeg(raw: string): number {
  if (!raw) return 0
  // Aceita HH:MM:SS ou H:M:S (dígitos variáveis)
  const hms = raw.trim().match(/^(\d+):(\d{1,2}):(\d{1,2})$/)
  if (hms) return parseInt(hms[1]) * 3600 + parseInt(hms[2]) * 60 + parseInt(hms[3])
  // Aceita MM:SS ou M:S
  const ms = raw.trim().match(/^(\d+):(\d{1,2})$/)
  if (ms) return parseInt(ms[1]) * 60 + parseInt(ms[2])
  // Número puro (segundos)
  const n = parseFloat(raw.replace(',', '.').replace(/[^\d.]/g, ''))
  return isNaN(n) ? 0 : n
}

const ABS_PALAVRAS = ['absenteísmo', 'absenteismo', 'ausência', 'ausencia']
function isAbsHeader(header: string): boolean {
  const h = normalizarChave(header)
  if (h === 'abs') return true
  return ABS_PALAVRAS.some((kw) => h.includes(normalizarChave(kw)))
}

function isTmaMeta(meta: Meta): boolean {
  const col = normalizarChave(meta.nome_coluna)
  const lbl = normalizarChave(meta.label)
  return col.includes('tma') || lbl.includes('tma') ||
    col.includes('tempo medio') || col.includes('tempo médio') ||
    lbl.includes('tempo medio') || lbl.includes('tempo médio')
}

function isChurn(meta: Meta): boolean {
  const col = normalizarChave(meta.nome_coluna)
  const lbl = normalizarChave(meta.label)
  return col === 'churn' || lbl === 'churn'
}

function isIndisp(meta: Meta): boolean {
  const col = normalizarChave(meta.nome_coluna)
  const lbl = normalizarChave(meta.label)
  return col.includes('indisp') || lbl.includes('indisp')
}

function detectKpiKey(meta: Meta): string | null {
  if (isTxRetencao(meta)) return 'tx_ret_bruta'
  if (isPedidos(meta))    return 'pedidos'
  if (isTmaMeta(meta))    return 'tma'
  if (isAbsHeader(meta.nome_coluna) || isAbsHeader(meta.label)) return 'abs'
  if (isIndisp(meta))     return 'indisp'
  if (isChurn(meta))      return 'churn'
  return null
}

/** Retorna true se a meta corresponde a um dos 6 KPIs principais gerenciados por metas_operador_config. */
export function isMetaPrincipal(meta: Meta): boolean {
  return detectKpiKey(meta) !== null
}

function isTxRetencao(meta: Meta): boolean {
  const col = normalizarChave(meta.nome_coluna)
  const lbl = normalizarChave(meta.label)
  return col.includes('retenc') || col.includes('retenç') ||
    lbl.includes('retenc') || lbl.includes('retenç')
}

function isPedidos(meta: Meta): boolean {
  const col = normalizarChave(meta.nome_coluna)
  const lbl = normalizarChave(meta.label)
  return col.includes('pedido') || lbl.includes('pedido')
}

function calcStatus(
  v: number,
  meta: Meta,
  opConfig?: MetaOperadorConfig,
  metaIndividual?: number,
): Status {
  // Config estruturada tem prioridade quando fornecida
  if (opConfig) {
    if (opConfig.modo === 'coluna_individual') {
      if (metaIndividual == null || metaIndividual <= 0) return 'neutro'
      if (opConfig.kpi_key === 'pedidos') return v >= metaIndividual ? 'verde' : 'vermelho'
      if (opConfig.kpi_key === 'churn')   return v <= metaIndividual ? 'verde' : 'vermelho'
      return 'neutro'
    }
    if (opConfig.modo === 'limiar_global') {
      const { verde_op, verde_valor, amarelo_valor } = opConfig
      if (verde_valor == null) return 'neutro'
      if (verde_op === '>=') {
        if (v >= verde_valor) return 'verde'
        if (amarelo_valor != null && v >= amarelo_valor) return 'amarelo'
        return 'vermelho'
      }
      if (verde_op === '<=') {
        if (v <= verde_valor) return 'verde'
        if (amarelo_valor != null && v <= amarelo_valor) return 'amarelo'
        return 'vermelho'
      }
      return 'neutro'
    }
  }

  // Fallback: comportamento legado com hardcodes
  if (isTxRetencao(meta)) {
    if (v >= 66) return 'verde'
    if (v >= 60) return 'amarelo'
    return 'vermelho'
  }

  const limite = meta.verde_inicio > 0 ? meta.verde_inicio : meta.valor_meta

  if (isPedidos(meta)) return v >= limite ? 'verde' : 'vermelho'

  const { tipo } = meta

  if (isTmaMeta(meta)) return v <= limite ? 'verde' : 'vermelho'

  const limiarAmarelo = limite > 0 ? limite * 0.8 : 0

  if (tipo === 'maior_melhor') {
    if (v >= limite) return 'verde'
    if (limite > 0 && v >= limiarAmarelo) return 'amarelo'
    return 'vermelho'
  } else {
    if (limite > 0 && v < limiarAmarelo) return 'verde'
    if (v <= limite) return 'amarelo'
    return 'vermelho'
  }
}

function calcProgresso(v: number, meta: Meta): number {
  const alvo = meta.verde_inicio > 0 ? meta.verde_inicio : meta.valor_meta
  if (alvo === 0) return 0
  let pct: number
  if (meta.tipo === 'maior_melhor') {
    pct = (v / alvo) * 100
  } else {
    pct = (alvo / Math.max(v, 0.001)) * 100
  }
  return Math.min(Math.round(pct), 100)
}

// ── Computar KPIs a partir de headers + row + metas ──────────────────────────

export function computarKPIs(
  headers: string[],
  row: string[],
  metas: Meta[],
  debugLabel?: string,
  opConfigs?: Record<string, MetaOperadorConfig>,
  metasIndividuais?: Record<string, number>,
): KPIItem[] {
  // Mapa: chave normalizada → meta
  const metaMap = new Map(metas.map((m) => [normalizarChave(m.nome_coluna), m]))

  // Índice da primeira ocorrência de cada coluna normalizada
  // Garante que colunas duplicadas sejam processadas apenas uma vez
  const primeiraOcorrencia = new Map<string, number>()
  headers.forEach((h, i) => {
    const key = normalizarChave(h)
    if (!primeiraOcorrencia.has(key)) primeiraOcorrencia.set(key, i)
  })

  if (debugLabel) {
    console.log(`\n[KPI Debug] ── Operador: ${debugLabel} ──`)
    console.log(`[KPI Debug] Metas configuradas (${metas.length}):`)
    metas.forEach((m) => {
      const chave = normalizarChave(m.nome_coluna)
      const idx = primeiraOcorrencia.get(chave)
      console.log(
        `  meta "${m.nome_coluna}" → chave:"${chave}" → ` +
        (idx !== undefined ? `col[${idx}] ENCONTRADA` : 'NÃO ENCONTRADA na planilha')
      )
    })
    console.log(`[KPI Debug] Cabeçalhos da planilha (${headers.length}):`)
    headers.forEach((h, i) => {
      const chave = normalizarChave(h)
      const meta = metaMap.get(chave)
      const isDup = primeiraOcorrencia.get(chave) !== i
      console.log(`  col[${i}] "${h}" → chave:"${chave}" → ${isDup ? 'DUPLICATA (ignorada)' : meta ? `MATCH "${meta.label}"` : 'sem meta'}`)
    })
  }

  return headers
    .map((header, idx) => {
      if (!header.trim()) return null

      const chave = normalizarChave(header)

      // Processa apenas a primeira ocorrência de cada coluna (pula duplicatas)
      if (primeiraOcorrencia.get(chave) !== idx) return null

      // Correspondência por nome exato da coluna, não por posição
      const meta = metaMap.get(chave)
      const raw  = row[idx] ?? ''
      // Usa parser de tempo quando a unidade é temporal OU a coluna/label indica TMA
      const unidadeLower = meta?.unidade.trim().toLowerCase() ?? ''
      const isTempo = meta && (
        ['tempo', 'seg', 's', 'segundos', 'mm:ss', 'hh:mm', 'hh:mm:ss'].includes(unidadeLower) ||
        isTmaMeta(meta)
      )
      let valorNum = isTempo ? parseTempoSeg(raw) : parseNum(raw)

      // ABS: planilha pode armazenar % de presença (ex: 97.8%); exibir como % de ausência (2.2%)
      const valorDisplay = isAbsHeader(header) && valorNum > 50
        ? `${Math.round((100 - valorNum) * 100) / 100}%`
        : raw || '—'

      const kpiKey    = meta ? detectKpiKey(meta) : null
      const opConfig  = (kpiKey && opConfigs) ? opConfigs[kpiKey] : undefined
      const metaInd   = (kpiKey && metasIndividuais) ? metasIndividuais[kpiKey] : undefined
      const status    = meta ? calcStatus(valorNum, meta, opConfig, metaInd) : 'neutro'
      const progresso = meta ? calcProgresso(valorNum, meta) : 0

      if (kpiKey === 'pedidos' || kpiKey === 'churn') {
        console.log(`[meta-${kpiKey}]`, {
          operador: row[0],
          configNova: opConfig ?? '(não encontrado em opConfigs)',
          modo: opConfig?.modo,
          colunaMeta: opConfig?.coluna_meta,
          metaIndividualParseada: metaInd ?? '(não encontrado em metasIndividuais)',
          valorOperador: valorNum,
          statusFinal: status,
          metaLegadoVerde: meta?.verde_inicio,
          metaLegadoValor: meta?.valor_meta,
          opConfigsKeys: opConfigs ? Object.keys(opConfigs) : '(opConfigs undefined)',
        })
      }

      if (debugLabel) {
        const limite = meta ? (meta.verde_inicio > 0 ? meta.verde_inicio : meta.valor_meta) : 0
        const limAm  = meta ? Math.round(limite * 0.8 * 100) / 100 : 0
        const tag = meta
          ? `→ "${meta.label}" | col="${header}" raw="${raw}" val=${valorNum} | limite=${limite} amarelo~${limAm} | status=${status}`
          : `→ sem meta | raw="${raw}"`
        console.log(`  col[${idx}] ${tag}`)
      }

      return {
        nome_coluna: header,
        label: meta?.label ?? header,
        valor: valorDisplay,
        valorNum,
        unidade: meta?.unidade ?? '',
        status,
        progresso,
        meta,
        basico: meta?.basico ?? false,
        indice: idx,
        metaIndividual: metaInd,
        opConfig,
      } satisfies KPIItem
    })
    .filter((item): item is NonNullable<typeof item> => item !== null) as KPIItem[]
}

// ── Formatação de valor para exibição ────────────────────────────────────────

export function formatarExibicao(valor: string, unidade: string): string {
  if (!valor || valor === '—') return '—'
  const uni = unidade.trim().toLowerCase()

  if (/^\d{1,3}:\d{2}(:\d{2})?$/.test(valor.trim())) return valor.trim()

  if (uni === '%' || uni === 'porcentagem') {
    const clean = valor.replace('%', '').replace(',', '.').trim()
    const n = parseFloat(clean)
    if (isNaN(n)) return valor
    const rounded = Math.round(n * 100) / 100
    return `${Number.isInteger(rounded) ? rounded : rounded}%`
  }

  if (uni === 'seg' || uni === 's' || uni === 'segundos' || uni === 'tempo') {
    const n = parseFloat(valor.replace(',', '.').replace(/[^\d.]/g, ''))
    if (!isNaN(n)) {
      const m = Math.floor(n / 60)
      const s = Math.round(n % 60)
      return `${String(m).padStart(2, '0')}:${String(s).padStart(2, '0')}`
    }
  }

  return valor
}

export function sufixoUnidade(unidade: string): string {
  const uni = unidade.trim().toLowerCase()
  if ([
    '%', 'seg', 's', 'segundos', 'tempo', 'min', 'hh:mm', 'mm:ss',
    'porcentagem', 'numero', 'texto', '',
  ].includes(uni)) return ''
  return unidade
}

export function getLabelStatus(status: Status, tipo?: 'maior_melhor' | 'menor_melhor'): string {
  if (status === 'verde')    return 'Dentro da meta'
  if (status === 'vermelho') return 'Fora da meta'
  if (status === 'amarelo')  return tipo === 'menor_melhor' ? 'Atenção' : 'Quase na meta'
  return ''
}

// ── Pontuação de evolução semanal ─────────────────────────────────────────────

export function calcKpiPts(nomeColuna: string, v1: number, v2: number): number {
  const key = normalizarChave(nomeColuna)
  if (key.includes('retenc') || key.includes('retenç')) {
    const d = v2 - v1
    if (d >= 2) return 3; if (d > 0) return 1
    if (d < 0 && d > -2) return -1; if (d <= -2) return -3; return 0
  }
  if (key === 'pedidos') {
    const d = v2 - v1
    if (d >= 5) return 3; if (d >= 1) return 1
    if (d <= -1 && d >= -4) return -1; if (d <= -5) return -3; return 0
  }
  if (key === 'churn') {
    const r = v1 - v2
    if (r >= 3) return 3; if (r >= 1) return 1
    if (r <= -1 && r >= -2) return -1; if (r <= -3) return -3; return 0
  }
  if (key.startsWith('abs')) {
    const r = v1 - v2
    if (r >= 0.5) return 3; if (r > 0) return 1
    if (r < 0 && r > -0.5) return -1; if (r <= -0.5) return -3; return 0
  }
  if (key.includes('indisp')) {
    const r = v1 - v2
    if (r >= 1) return 3; if (r > 0) return 1
    if (r < 0 && r > -1) return -1; if (r <= -1) return -3; return 0
  }
  if (key === 'tma') {
    const r = v1 - v2
    if (r >= 30) return 3; if (r >= 1) return 1
    if (r <= -1 && r >= -29) return -1; if (r <= -30) return -3; return 0
  }
  return 0
}

export function calcTotalPts(
  snap1: Record<string, number>,
  snap2: Record<string, number>,
  metas: Meta[]
): number {
  let total = 0
  for (const meta of metas) {
    const v1 = snap1[meta.nome_coluna]
    const v2 = snap2[meta.nome_coluna]
    if (v1 !== undefined && v2 !== undefined) total += calcKpiPts(meta.nome_coluna, v1, v2)
  }
  return total
}

export function normalizarDados(
  dados: Record<string, number>,
  metas: Meta[]
): Record<string, number> {
  const metaMap = new Map(metas.map((m) => [normalizarChave(m.nome_coluna), m]))
  const out: Record<string, number> = {}
  for (const [key, val] of Object.entries(dados)) {
    const meta = metaMap.get(normalizarChave(key))
    if (meta) out[meta.nome_coluna] = val
  }
  return out
}

// ── Dias úteis ────────────────────────────────────────────────────────────────

/** Peso do dia da semana: Seg–Sex=1, Sáb=0.5, Dom=0 */
function pesoDia(date: Date): number {
  const dow = date.getDay() // 0=Dom, 6=Sáb
  if (dow === 0) return 0
  if (dow === 6) return 0.5
  return 1
}

/**
 * Calcula dias úteis (ponderados) de um mês.
 * @param ano  ex: 2026
 * @param mes  1-12
 * @returns { diasNoMes, diasUteisTotal, diasUteisDecorridos, diasUteisRestantes }
 */
export function calcularDiasUteisNoMes(ano: number, mes: number) {
  const diasNoMes = new Date(ano, mes, 0).getDate()
  const hoje = new Date()
  const diaHoje = hoje.getFullYear() === ano && hoje.getMonth() + 1 === mes
    ? hoje.getDate()
    : diasNoMes

  let diasUteisTotal = 0
  let diasUteisDecorridos = 0

  for (let d = 1; d <= diasNoMes; d++) {
    const peso = pesoDia(new Date(ano, mes - 1, d))
    diasUteisTotal += peso
    if (d <= diaHoje) diasUteisDecorridos += peso
  }

  return {
    diasNoMes,
    diasUteisTotal: Math.round(diasUteisTotal * 100) / 100,
    diasUteisDecorridos: Math.round(diasUteisDecorridos * 100) / 100,
    diasUteisRestantes: Math.round((diasUteisTotal - diasUteisDecorridos) * 100) / 100,
  }
}

// ── Ritmo e projeção ──────────────────────────────────────────────────────────

export interface RitmoInfo {
  /** Valor que precisa atingir por dia útil restante para bater a meta */
  ritmoNecessario: number | null
  /** Projeção de fechamento mantendo ritmo atual */
  projecaoFechamento: number | null
  /** true se a meta já foi batida */
  metaBatida: boolean
  /** true se não é possível bater a meta com os dias restantes */
  impossivel: boolean
}

/**
 * Calcula ritmo necessário e projeção de fechamento do mês.
 */
export function calcularRitmoNecessario(
  valorAtual: number,
  meta: Meta,
  diasUteisDecorridos: number,
  diasUteisRestantes: number
): RitmoInfo {
  const alvo = meta.verde_inicio > 0 ? meta.verde_inicio : meta.valor_meta
  const tipoAcumulo = meta.tipoAcumulo ?? 'acumulavel'

  // Métrica pontual: não tem projeção de ritmo (valor é independente do tempo)
  if (tipoAcumulo === 'pontual') {
    return { ritmoNecessario: null, projecaoFechamento: null, metaBatida: false, impossivel: false }
  }

  // Métrica de média: compara valor atual com alvo diretamente
  if (tipoAcumulo === 'media') {
    const batida = meta.tipo === 'maior_melhor' ? valorAtual >= alvo : valorAtual <= alvo
    return { ritmoNecessario: null, projecaoFechamento: valorAtual, metaBatida: batida, impossivel: false }
  }

  // Acumulável
  const diasTotais = diasUteisDecorridos + diasUteisRestantes
  const ritmoAtual = diasUteisDecorridos > 0 ? valorAtual / diasUteisDecorridos : 0
  const projecaoFechamento = diasTotais > 0
    ? Math.round(ritmoAtual * diasTotais * 10) / 10
    : valorAtual

  if (meta.tipo === 'maior_melhor') {
    const metaBatida = valorAtual >= alvo
    if (metaBatida) return { ritmoNecessario: 0, projecaoFechamento, metaBatida: true, impossivel: false }

    const restante = alvo - valorAtual
    if (diasUteisRestantes <= 0) return { ritmoNecessario: null, projecaoFechamento, metaBatida: false, impossivel: true }

    const ritmoNecessario = Math.round((restante / diasUteisRestantes) * 10) / 10
    return { ritmoNecessario, projecaoFechamento, metaBatida: false, impossivel: false }
  } else {
    // menor_melhor (ex: churn): acumulado deve ficar abaixo do alvo
    const metaBatida = valorAtual <= alvo
    if (diasUteisRestantes <= 0) return { ritmoNecessario: null, projecaoFechamento, metaBatida, impossivel: !metaBatida }

    // Ritmo máximo permitido por dia para não ultrapassar o alvo
    const permitidoRestante = alvo - valorAtual
    if (permitidoRestante <= 0) return { ritmoNecessario: 0, projecaoFechamento, metaBatida: false, impossivel: true }

    const ritmoNecessario = Math.round((permitidoRestante / diasUteisRestantes) * 10) / 10
    return { ritmoNecessario, projecaoFechamento, metaBatida, impossivel: false }
  }
}

// ── Formatação de data de sincronização ──────────────────────────────────────

/**
 * Formata string de atualização para exibição compacta.
 * Entrada pode ser "DD/MM/YYYY HH:MM" ou só "DD/MM/YYYY".
 */
export function formatarSincronizacao(raw: string | null | undefined): string {
  if (!raw) return '—'
  const s = raw.trim()
  // Detecta padrão com horário "dd/MM/yyyy HH:MM" ou "dd/MM/yyyy HH:MM:SS"
  const comHora = s.match(/^(\d{2}\/\d{2}\/\d{4})\s+(\d{2}:\d{2})/)
  if (comHora) return `${comHora[1]} às ${comHora[2]}`
  // Só data
  const soData = s.match(/^(\d{2}\/\d{2}\/\d{4})/)
  if (soData) return soData[1]
  return s
}

// ── Alias de formatação ───────────────────────────────────────────────────────

/** Alias de formatarExibicao para uso consistente em novos componentes */
export function formatMetricValue(valor: string, unidade: string): string {
  return formatarExibicao(valor, unidade)
}
