// ── Constantes ────────────────────────────────────────────────────────────────
// Este arquivo NÃO importa googleapis nem qualquer lib Node.js.
// Pode ser importado em Client Components com segurança.

export const TIPOS_REGISTRO = ['Pausa justificada', 'Fora da jornada', 'Geral', 'Outros'] as const
export type TipoRegistro = (typeof TIPOS_REGISTRO)[number]

// ── Tipos ─────────────────────────────────────────────────────────────────────

export interface DiarioRegistro {
  /** Raw value da coluna A. Vazio = registro geral do setor. */
  colaborador: string
  tipo: TipoRegistro
  observacoes: string
  glpi: string
  tempo: string     // raw: "20min", "1:30", "5:30h"
  data: string      // raw: "14/04/2026"
  tempoMin: number  // resultado de parseTempo()
  dataObj: Date | null
  /** Índice 0-based da linha na planilha (0 = cabeçalho, 1 = primeira linha de dados). */
  sheetRowIndex: number
}

export interface NovoRegistroInput {
  colaborador: string   // username ou '' para geral
  tipo: TipoRegistro
  observacoes: string
  glpi: string
  tempo: string
  data: string          // "DD/MM/YYYY"
}

// ── Utilitários de tempo ──────────────────────────────────────────────────────

/**
 * Aceita: "20min" | "20 min" | "1:30" | "5:30h" | "32" (→ minutos)
 * Retorna minutos (number). Retorna 0 para strings inválidas.
 */
export function parseTempo(str: string): number {
  if (!str) return 0
  const s = str.trim().toLowerCase()

  // "05:20:31" → HH:MM:SS → h*60 + min (segundos ignorados)
  const hms = s.match(/^(\d+):(\d{1,2}):(\d{1,2})$/)
  if (hms) {
    return parseInt(hms[1]) * 60 + parseInt(hms[2])
  }

  // "1:30" ou "5:30h" → HH:MM se primeiro ≤ 23, senão MM:SS
  const hm = s.match(/^(\d+):(\d{1,2})h?$/)
  if (hm) {
    const first = parseInt(hm[1]), second = parseInt(hm[2])
    if (first > 23) {
      // Trata como MM:SS → retorna minutos
      return first + Math.round(second / 60)
    }
    return first * 60 + second
  }

  // "20min" | "20 min" | "20m"
  const minmatch = s.match(/^(\d+(?:[.,]\d+)?)\s*min?/)
  if (minmatch) return Math.round(parseFloat(minmatch[1].replace(',', '.')))

  // número puro → minutos
  const num = parseFloat(s.replace(',', '.'))
  if (!isNaN(num)) return Math.round(num)

  return 0
}

/**
 * Formata minutos:
 * - < 60 → "20 min"
 * - ≥ 60 → "1h 30min"
 */
export function formatTempo(min: number): string {
  if (!min || min <= 0) return '—'
  if (min < 60) return `${min} min`
  const h = Math.floor(min / 60)
  const m = min % 60
  return m > 0 ? `${h}h ${m}min` : `${h}h`
}

// ── Utilitários de data ───────────────────────────────────────────────────────

const MESES_ABREV = ['jan','fev','mar','abr','mai','jun','jul','ago','set','out','nov','dez']

/** "14/04/2026" → "14 abr" */
export function formatarDataCurta(raw: string): string {
  const dmy = raw.match(/^(\d{1,2})\/(\d{1,2})\/(\d{4})$/)
  if (dmy) {
    const mes = parseInt(dmy[2], 10) - 1
    return `${parseInt(dmy[1], 10)} ${MESES_ABREV[mes] ?? dmy[2]}`
  }
  return raw
}

/** "14/04/2026" → "14/04/2026" (padded) */
export function formatarDataCompleta(raw: string): string {
  const dmy = raw.match(/^(\d{1,2})\/(\d{1,2})\/(\d{4})$/)
  if (dmy) return `${dmy[1].padStart(2,'0')}/${dmy[2].padStart(2,'0')}/${dmy[3]}`
  return raw
}

/** Formata data de hoje para DD/MM/YYYY */
export function hojeFormatado(): string {
  const d = new Date()
  return `${String(d.getDate()).padStart(2,'0')}/${String(d.getMonth()+1).padStart(2,'0')}/${d.getFullYear()}`
}

// ── Filtragem ─────────────────────────────────────────────────────────────────

/** Match: nome do colaborador contém o primeiro token do username ou nome completo */
export function registroPertenceOperador(r: DiarioRegistro, username: string, nomeCompleto: string): boolean {
  if (!r.colaborador) return false
  const colab = r.colaborador.toLowerCase()
  const user  = username.toLowerCase()
  const nome  = nomeCompleto.toLowerCase()
  const primeiro = nome.split(' ')[0]
  return (
    colab.includes(user) ||
    colab.includes(primeiro) ||
    colab === nome
  )
}

export function filtrarPorOperador(registros: DiarioRegistro[], username: string, nomeCompleto: string): DiarioRegistro[] {
  return registros.filter((r) => registroPertenceOperador(r, username, nomeCompleto))
}

// ── Agregações ────────────────────────────────────────────────────────────────

export function somarTempos(registros: DiarioRegistro[]): number {
  return registros.reduce((sum, r) => sum + r.tempoMin, 0)
}

export function totalPausasJustificadas(registros: DiarioRegistro[]): number {
  return somarTempos(registros.filter((r) => r.tipo === 'Pausa justificada'))
}

export function totalForaJornada(registros: DiarioRegistro[]): number {
  return somarTempos(registros.filter((r) => r.tipo === 'Fora da jornada'))
}

export function contarComGLPI(registros: DiarioRegistro[]): number {
  return registros.filter((r) => r.glpi.length > 0).length
}
