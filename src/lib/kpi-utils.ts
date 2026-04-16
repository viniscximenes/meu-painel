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
  const { tipo, verde_inicio } = meta
  // Limiar amarelo automático: 80% do verde_inicio
  const limiarAmarelo = verde_inicio > 0 ? verde_inicio * 0.8 : 0

  if (tipo === 'maior_melhor') {
    if (v >= verde_inicio) return 'verde'
    if (verde_inicio > 0 && v >= limiarAmarelo) return 'amarelo'
    return 'vermelho'
  } else {
    if (verde_inicio > 0 && v < limiarAmarelo) return 'verde'
    if (v <= verde_inicio) return 'amarelo'
    return 'vermelho'
  }
}

function calcProgresso(v: number, meta: Meta): number {
  const alvo = meta.verde_inicio === 0 ? meta.valor_meta : meta.verde_inicio
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
  const metaMap = new Map(
    metas.map((m) => [normalizarChave(m.nome_coluna), m])
  )

  if (debugLabel) {
    console.log(`\n[KPI Debug] ── Operador: ${debugLabel} ──`)
    console.log(`[KPI Debug] Metas cadastradas (${metas.length}):`)
    metas.forEach((m) => console.log(`  meta "${m.nome_coluna}" → chave: "${normalizarChave(m.nome_coluna)}"`))
    console.log(`[KPI Debug] Cabeçalhos da planilha (${headers.length}):`)
    headers.forEach((h) => {
      const chave = normalizarChave(h)
      const achou = metaMap.has(chave)
      console.log(`  header "${h}" → chave: "${chave}" → ${achou ? `MATCH com meta "${metaMap.get(chave)!.label}"` : 'sem meta'}`)
    })
  }

  return headers
    .map((header, idx) => {
      const raw = row[idx] ?? ''
      const meta = metaMap.get(normalizarChave(header))
      let valorNum = parseNum(raw)

      if (meta && (meta.unidade === 'porcentagem' || meta.unidade === '%')) {
        const escala = Math.max(Math.abs(meta.verde_inicio), Math.abs(meta.amarelo_inicio))
        if (valorNum > 0 && valorNum <= 1 && escala > 1) {
          valorNum = Math.round(valorNum * 10000) / 100
        }
      }

      const status = meta ? calcStatus(valorNum, meta) : 'neutro'
      const progresso = meta ? calcProgresso(valorNum, meta) : 0

      if (debugLabel && meta) {
        console.log(`  [${meta.label}] raw="${raw}" valorNum=${valorNum} | amarelo≥${meta.amarelo_inicio} verde≥${meta.verde_inicio} | status=${status}`)
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
    .filter((item) => item.nome_coluna.trim() !== '')
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
