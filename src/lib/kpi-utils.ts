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

function calcStatus(v: number, meta: Meta): Status {
  const { tipo } = meta
  // Usa verde_inicio se configurado; caso contrário, cai de volta para valor_meta
  const limite = meta.verde_inicio > 0 ? meta.verde_inicio : meta.valor_meta
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
      let valorNum = parseNum(raw)

      if (meta && (meta.unidade === 'porcentagem' || meta.unidade === '%')) {
        const limite = meta.verde_inicio > 0 ? meta.verde_inicio : meta.valor_meta
        const escala = Math.abs(limite)
        if (valorNum > 0 && valorNum <= 1 && escala > 1) {
          valorNum = Math.round(valorNum * 10000) / 100
        }
      }

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
        valor: raw || '—',
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
    const pct = n > 0 && n <= 1 ? n * 100 : n
    const rounded = Math.round(pct * 100) / 100
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
