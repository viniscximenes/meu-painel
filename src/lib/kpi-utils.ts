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

function calcStatus(v: number, meta: Meta): Status {
  const { tipo } = meta
  // Usa verde_inicio se configurado; caso contrário, cai de volta para valor_meta
  const limite = meta.verde_inicio > 0 ? meta.verde_inicio : meta.valor_meta

  // TMA é binário: verde/vermelho sem zona amarela (menor_melhor: verde se ≤ limite)
  if (isTmaMeta(meta)) {
    return v <= limite ? 'verde' : 'vermelho'
  }

  // Limiar amarelo automático: 80% do limite
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
  debugLabel?: string
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

      const status   = meta ? calcStatus(valorNum, meta) : 'neutro'
      const progresso = meta ? calcProgresso(valorNum, meta) : 0

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
