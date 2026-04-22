// Lógica de status compartilhada entre Por Mês e Últimos 3 Meses

export type Status     = 'bom' | 'atencao' | 'critico' | 'neutro'
export type StatusComp = 'bom' | 'critico' | 'neutro'

// ── Parsers ───────────────────────────────────────────────────────────────────

function parsePctStr(valor: string): number | null {
  if (!valor || valor === '—') return null
  const s = valor.replace('%', '').replace(',', '.').trim()
  const n = parseFloat(s)
  return isNaN(n) ? null : n
}

function parseTMAStr(valor: string): number | null {
  if (!valor || valor === '—') return null
  const parts = valor.split(':').map(p => parseInt(p, 10))
  if (parts.some(isNaN)) return null
  if (parts.length === 3) return parts[0] * 3600 + parts[1] * 60 + parts[2]
  if (parts.length === 2) return parts[0] * 60 + parts[1]
  return null
}

// ── Classificadores ───────────────────────────────────────────────────────────

export function calcularStatusPrincipal(label: string, valor: string): Status {
  const l = label.toLowerCase()

  if (l.includes('retenc') || l.includes('retenç')) {
    const n = parsePctStr(valor)
    if (n === null) return 'neutro'
    if (n < 60) return 'critico'
    if (n < 66) return 'atencao'
    return 'bom'
  }

  if (l.includes('tma') || l.includes('tempo')) {
    const secs = parseTMAStr(valor)
    if (secs === null) return 'neutro'
    return secs > 731 ? 'critico' : 'bom'
  }

  if (l === 'abs' || l.startsWith('abs')) {
    const n = parsePctStr(valor)
    if (n === null) return 'neutro'
    return n >= 5 ? 'critico' : 'bom'
  }

  if (l.includes('indisp')) {
    const n = parsePctStr(valor)
    if (n === null) return 'neutro'
    return n >= 14.5 ? 'critico' : 'bom'
  }

  return 'neutro'
}

export function calcularStatusComplementar(label: string, valor: string): StatusComp {
  const l = label.toLowerCase()
  const n = parsePctStr(valor)
  if (n === null) return 'neutro'

  if (l.startsWith('transfer')) return n > 5  ? 'critico' : 'bom'
  if (l.includes('short'))      return n > 2  ? 'critico' : 'bom'
  if (l.includes('rechamada'))  return n > 15 ? 'critico' : 'bom'

  return 'neutro'
}

// ── Mapas de cor ──────────────────────────────────────────────────────────────

export const STATUS_BG: Record<Status, string> = {
  bom:     'rgba(74,222,128,0.10)',
  atencao: 'rgba(250,204,21,0.10)',
  critico: 'rgba(248,113,113,0.12)',
  neutro:  'var(--bg-card)',
}

export const STATUS_BORDER: Record<Status, string> = {
  bom:     '1px solid rgba(74,222,128,0.35)',
  atencao: '1px solid rgba(250,204,21,0.35)',
  critico: '1px solid rgba(248,113,113,0.40)',
  neutro:  '1px solid rgba(201,168,76,0.08)',
}

export const STATUS_ICON_COLOR: Record<Status, string> = {
  bom:     '#4ade80',
  atencao: '#facc15',
  critico: '#f87171',
  neutro:  'rgba(244,212,124,0.65)',
}

export const STATUS_VALUE_COLOR: Record<Status, string> = {
  bom:     '#4ade80',
  atencao: '#facc15',
  critico: '#f87171',
  neutro:  'rgba(255,255,255,0.92)',
}

export const COMP_VALUE_COLOR: Record<StatusComp, string> = {
  bom:    '#4ade80',
  critico: '#f87171',
  neutro: 'rgba(255,255,255,0.75)',
}

// ── Referência por métrica (pra barra de progresso + linha "referência: …") ───

export interface MetricaRef {
  tipo:     'maior_melhor' | 'menor_melhor'
  refValor: number
  refLabel: string
  unidade:  'pct' | 'tma'
}

export function getMetricaRef(label: string): MetricaRef | null {
  const l = label.toLowerCase()
  if (l.includes('retenc') || l.includes('retenç')) {
    return { tipo: 'maior_melhor', refValor: 66,   refLabel: '≥ 66%',    unidade: 'pct' }
  }
  if (l.includes('tma') || l.includes('tempo')) {
    return { tipo: 'menor_melhor', refValor: 731,  refLabel: '≤ 12:11',  unidade: 'tma' }
  }
  if (l === 'abs' || l.startsWith('abs')) {
    return { tipo: 'menor_melhor', refValor: 5,    refLabel: '< 5%',     unidade: 'pct' }
  }
  if (l.includes('indisp')) {
    return { tipo: 'menor_melhor', refValor: 14.5, refLabel: '< 14.5%',  unidade: 'pct' }
  }
  return null
}

function parseValorInterno(label: string, valor: string): number | null {
  const ref = getMetricaRef(label)
  if (!ref) return null
  return ref.unidade === 'tma' ? parseTMAStr(valor) : parsePctStr(valor)
}

export function calcProgressBarPercent(label: string, valor: string): number {
  const ref = getMetricaRef(label)
  if (!ref) return 0
  const n = parseValorInterno(label, valor)
  if (n === null) return 0
  if (ref.tipo === 'maior_melhor') {
    if (ref.refValor <= 0) return 0
    return Math.min((n / ref.refValor) * 100, 100)
  }
  // menor_melhor
  if (n <= 0) return 100
  return Math.min((ref.refValor / n) * 100, 100)
}

function fmtTMASec(abs: number): string {
  const m = Math.floor(abs / 60)
  const s = Math.round(abs % 60)
  return `${m}:${String(s).padStart(2, '0')}`
}

export interface Distancia { texto: string; isBom: boolean }

export function formatDistanciaRef(label: string, valor: string): Distancia | null {
  const ref = getMetricaRef(label)
  if (!ref) return null
  const n = parseValorInterno(label, valor)
  if (n === null) return null
  const diff = n - ref.refValor
  const abs  = Math.abs(diff)
  const isBom = ref.tipo === 'maior_melhor' ? diff >= 0 : diff <= 0
  if (ref.unidade === 'tma') {
    if (Math.round(abs) === 0) return { texto: 'no limite', isBom: true }
    return { texto: `${fmtTMASec(abs)} ${diff > 0 ? 'acima' : 'abaixo'}`, isBom }
  }
  const rounded = Math.round(abs * 10) / 10
  const absFmt  = rounded % 1 === 0 ? rounded.toFixed(0) : rounded.toFixed(1)
  if (rounded === 0) return { texto: 'no limite', isBom: true }
  return { texto: `${absFmt} p.p. ${diff > 0 ? 'acima' : 'abaixo'}`, isBom }
}

export const STATUS_BADGE_LABEL: Record<Status, string> = {
  bom:     'BOM',
  atencao: 'ATENÇÃO',
  critico: 'CRÍTICO',
  neutro:  '',
}

// ── Redesign premium: barra + limite + delta vs meta ──────────────────────────

export interface BarraInfo { pct: number; status: Status }

export function calcBarraHistorico(label: string, valor: string): BarraInfo {
  const l = label.toLowerCase()

  if (l.includes('retenc') || l.includes('retenç')) {
    const n = parsePctStr(valor); if (n === null) return { pct: 0, status: 'neutro' }
    if (n >= 66) return { pct: 100, status: 'bom' }
    if (n >= 60) return { pct: Math.min((n / 66) * 100, 100), status: 'atencao' }
    return { pct: Math.min((n / 66) * 100, 100), status: 'critico' }
  }
  if (l.includes('tma') || l.includes('tempo')) {
    const s = parseTMAStr(valor); if (s === null) return { pct: 0, status: 'neutro' }
    if (s > 731) return { pct: 100, status: 'critico' }
    return { pct: Math.min((s / 731) * 100, 100), status: 'bom' }
  }
  if (l === 'abs' || l.startsWith('abs')) {
    const n = parsePctStr(valor); if (n === null) return { pct: 0, status: 'neutro' }
    if (n >= 5) return { pct: 100, status: 'critico' }
    return { pct: Math.min((n / 5) * 100, 100), status: 'bom' }
  }
  if (l.includes('indisp')) {
    const n = parsePctStr(valor); if (n === null) return { pct: 0, status: 'neutro' }
    if (n >= 14.5) return { pct: 100, status: 'critico' }
    return { pct: Math.min((n / 14.5) * 100, 100), status: 'bom' }
  }
  return { pct: 100, status: 'neutro' }
}

export function getLimiteTexto(label: string): string {
  const l = label.toLowerCase()
  if (l.includes('retenc') || l.includes('retenç')) return 'limite ≥ 66%'
  if (l.includes('tma') || l.includes('tempo'))     return 'limite ≤ 12:11'
  if (l === 'abs' || l.startsWith('abs'))           return 'limite < 5%'
  if (l.includes('indisp'))                          return 'limite < 14,5%'
  return ''
}

export interface DeltaMeta { texto: string; status: Status }

function fmtPP(diff: number): string {
  const r = Math.round(diff * 10) / 10
  const abs = Math.abs(r)
  const absFmt = abs % 1 === 0 ? abs.toFixed(0) : abs.toFixed(1).replace('.', ',')
  const sign = r >= 0 ? '+' : '-'
  return `${sign}${absFmt} p.p.`
}

function fmtTMAShort(diff: number): string {
  const sign = diff >= 0 ? '+' : '-'
  const abs = Math.abs(Math.round(diff))
  const m = Math.floor(abs / 60)
  const s = abs % 60
  return `${sign}${m}:${String(s).padStart(2, '0')}`
}

export function formatDeltaMeta(label: string, valor: string): DeltaMeta | null {
  const l = label.toLowerCase()

  if (l.includes('retenc') || l.includes('retenç')) {
    const n = parsePctStr(valor); if (n === null) return null
    const diff = n - 66
    const st: Status = n >= 66 ? 'bom' : n >= 60 ? 'atencao' : 'critico'
    if (Math.round(diff * 10) / 10 === 0) return { texto: 'no limite', status: 'bom' }
    return { texto: fmtPP(diff), status: st }
  }
  if (l.includes('tma') || l.includes('tempo')) {
    const s = parseTMAStr(valor); if (s === null) return null
    const diff = s - 731
    const st: Status = s > 731 ? 'critico' : 'bom'
    if (Math.abs(Math.round(diff)) === 0) return { texto: 'no limite', status: 'bom' }
    return { texto: fmtTMAShort(diff), status: st }
  }
  if (l === 'abs' || l.startsWith('abs')) {
    const n = parsePctStr(valor); if (n === null) return null
    const diff = n - 5
    const st: Status = n >= 5 ? 'critico' : 'bom'
    if (Math.round(diff * 10) / 10 === 0) return { texto: 'no limite', status: 'bom' }
    return { texto: fmtPP(diff), status: st }
  }
  if (l.includes('indisp')) {
    const n = parsePctStr(valor); if (n === null) return null
    const diff = n - 14.5
    const st: Status = n >= 14.5 ? 'critico' : 'bom'
    if (Math.round(diff * 10) / 10 === 0) return { texto: 'no limite', status: 'bom' }
    return { texto: fmtPP(diff), status: st }
  }
  return null
}

export function getLimiteComplementar(label: string): string {
  const l = label.toLowerCase()
  if (l.startsWith('transfer')) return 'limite < 5%'
  if (l.includes('short'))      return 'limite < 2%'
  if (l.includes('rechamada'))  return 'limite < 15%'
  return ''
}

export function contarStatusPrincipais(
  principais: { label: string; valor: string }[]
): { bons: number; atencoes: number; criticos: number; total: number } {
  let bons = 0, atencoes = 0, criticos = 0, total = 0
  for (const k of principais) {
    const st = calcularStatusPrincipal(k.label, k.valor)
    if (st === 'neutro') continue
    total++
    if (st === 'bom') bons++
    else if (st === 'atencao') atencoes++
    else if (st === 'critico') criticos++
  }
  return { bons, atencoes, criticos, total }
}
