// ── Aba QUARTIL — leitura genérica de dados de quartil por tópico ─────────────
// Servidor apenas — importa googleapis.

import { google } from 'googleapis'
import { getPlanilhaAtiva } from '@/lib/sheets'

function sheetsAPI() {
  const auth = new google.auth.GoogleAuth({
    credentials: {
      client_email: process.env.GOOGLE_SERVICE_ACCOUNT_EMAIL,
      private_key:  process.env.GOOGLE_PRIVATE_KEY?.replace(/\\n/g, '\n'),
    },
    scopes: ['https://www.googleapis.com/auth/spreadsheets'],
  })
  return google.sheets({ version: 'v4', auth })
}

function withTimeout<T>(p: Promise<T>, ms = 15_000): Promise<T> {
  return Promise.race([
    p,
    new Promise<never>((_, r) => setTimeout(() => r(new Error(`Timeout ${ms}ms`)), ms)),
  ])
}

// ── Tipos públicos ────────────────────────────────────────────────────────────

export interface QuartilOperador {
  email:            string
  metrica:          number       // valor numérico bruto (para referência)
  metricaFormatada: string       // valor já formatado para exibição
  quartil:          1 | 2 | 3 | 4
}

export interface QuartilTopico {
  id:              string
  nomeTopico:      string
  dataAtualizacao: string | null
  operadorAtual:   QuartilOperador | null
  rankGlobal:      number | null
  totalOperadores: number
}

// ── Config declarativa ────────────────────────────────────────────────────────

interface QuartilTopicoConfig {
  id:              string
  nomeTopico:      string
  aba:             string
  colunaMetrica:   number                                    // índice 0-based
  colunaQuartil:   number
  sortOrder:       'asc' | 'desc'
  colunaData:      number | null                             // null = sem data
  parseMetrica:    (raw: string | undefined) => number | null
  formatarMetrica: (n: number) => string
}

// ── Funções de parse ──────────────────────────────────────────────────────────

function parseQuartil(v: string | undefined): 1 | 2 | 3 | 4 | null {
  if (!v) return null
  const n = parseInt(v.toString().trim(), 10)
  if (n === 1 || n === 2 || n === 3 || n === 4) return n
  return null
}

function matchEmail(emailPlanilha: string, username: string): boolean {
  const prefix = emailPlanilha.toLowerCase().trim().split('@')[0]
  return prefix === username.toLowerCase().trim()
}

// Taxa / percentual: aceita 0.685 ou 68.5%
// Input esperado: fração decimal (0.685 = 68,5%) OU já em % (68.5 = 68,5%)
export function parsePct(raw: string | undefined): number | null {
  if (!raw) return null
  const s = raw.toString().replace(/\s/g, '').replace(',', '.')
  if (s.startsWith('#') || s === '') return null
  const n = parseFloat(s.replace('%', ''))
  if (isNaN(n)) return null
  return n <= 1 ? n * 100 : n
}

// Percentual absoluto: planilha armazena valor já em % (ex: 0.4 = 0,4%, 5 = 5%)
// NÃO aplica *100 — usar quando a coluna já está em escala percentual direta.
export function parsePctAbsoluto(raw: string | undefined): number | null {
  if (!raw) return null
  const s = raw.toString().replace(/\s/g, '').replace(',', '.')
  if (s.startsWith('#') || s === '') return null
  const n = parseFloat(s.replace('%', ''))
  return isNaN(n) ? null : n
}

export function formatPct(n: number): string {
  const r = Math.round(n * 10) / 10
  return r % 1 === 0 ? `${r}%` : `${r.toFixed(1).replace('.', ',')}%`
}

// TMA: hh:mm:ss → segundos (0 = sem dados → null)
export function parseTMA(raw: string | undefined): number | null {
  if (!raw) return null
  const s = raw.toString().trim()
  if (!s || s.startsWith('#')) return null
  const parts = s.split(':').map(p => parseInt(p, 10))
  if (parts.some(isNaN)) return null
  let secs = 0
  if (parts.length === 3) secs = parts[0] * 3600 + parts[1] * 60 + parts[2]
  else if (parts.length === 2) secs = parts[0] * 60 + parts[1]
  else return null
  return secs === 0 ? null : secs
}

export function formatTMA(secs: number): string {
  const h = Math.floor(secs / 3600)
  const m = Math.floor((secs % 3600) / 60)
  const s = Math.floor(secs % 60)
  if (h > 0) return `${h}:${String(m).padStart(2, '0')}:${String(s).padStart(2, '0')}`
  return `${m}:${String(s).padStart(2, '0')}`
}

// Inteiro: cancelados
export function parseInt_(raw: string | undefined): number | null {
  if (raw === undefined || raw === null || raw === '') return null
  const s = raw.toString().trim()
  if (s.startsWith('#') || s === '') return null
  const n = parseInt(s, 10)
  return isNaN(n) ? null : n
}

export function formatInt(n: number): string {
  return Math.round(n).toString()
}

// ── Emails da equipe ativa ────────────────────────────────────────────────────

/**
 * Retorna Set<string> com prefixos de email dos operadores presentes na planilha ativa
 * (coluna A, normalizado: trim + lowercase + só a parte antes do @).
 *
 * USADO POR: telas de histórico futuras (Evolução, Por Mês) que precisam filtrar
 * ex-operadores ao comparar meses anteriores.
 * NÃO USADO NO MEU QUARTIL — quartil mostra rank da retenção inteira (toda Alloha).
 */
export async function getEmailsEquipeAtiva(): Promise<Set<string>> {
  try {
    const planilha = await getPlanilhaAtiva()
    if (!planilha) {
      console.warn('[getEmailsEquipeAtiva] Nenhuma planilha ativa')
      return new Set()
    }
    const aba = planilha.aba || ''
    const range = aba ? `'${aba}'!A1:A300` : 'A1:A300'
    const res = await withTimeout(
      sheetsAPI().spreadsheets.values.get({
        spreadsheetId: planilha.spreadsheet_id,
        range,
      })
    )
    const valores = (res.data.values ?? []).flat() as string[]
    const emails = new Set<string>()
    for (const v of valores) {
      const celula = v.toString().trim().toLowerCase()
      if (celula && celula.includes('@')) {
        emails.add(celula.split('@')[0])   // guarda só o prefixo (antes do @)
      }
    }
    return emails
  } catch (e) {
    console.error('[getEmailsEquipeAtiva]', e)
    return new Set()
  }
}

// ── Declaração dos tópicos ────────────────────────────────────────────────────

const TOPICOS: QuartilTopicoConfig[] = [
  {
    id: 'txretencao', nomeTopico: 'Taxa de Retenção',
    aba: 'QUARTIL.TXRETENCAO', colunaMetrica: 5, colunaQuartil: 6,
    sortOrder: 'desc', colunaData: 7,
    parseMetrica: parsePct, formatarMetrica: formatPct,
  },
  {
    id: 'tma', nomeTopico: 'TMA',
    aba: 'QUARTIL.TMA', colunaMetrica: 2, colunaQuartil: 4,
    sortOrder: 'asc', colunaData: null,
    parseMetrica: parseTMA, formatarMetrica: formatTMA,
  },
  {
    id: 'churn', nomeTopico: 'Cancelados',
    aba: 'QUARTIL.CHURN', colunaMetrica: 2, colunaQuartil: 4,
    sortOrder: 'asc', colunaData: null,
    parseMetrica: parseInt_, formatarMetrica: formatInt,
  },
  {
    id: 'indisp', nomeTopico: 'Indisponibilidade',
    aba: 'QUARTIL.INDISPONIBILIDADE', colunaMetrica: 6, colunaQuartil: 7,
    sortOrder: 'asc', colunaData: null,
    parseMetrica: parsePct, formatarMetrica: formatPct,
  },
  {
    id: 'abs', nomeTopico: 'ABS',
    aba: 'QUARTIL.ABS', colunaMetrica: 4, colunaQuartil: 5,
    sortOrder: 'asc', colunaData: null,
    // ABS armazena valor já em % (0.4 = 0,4%) — não multiplicar por 100
    parseMetrica: parsePctAbsoluto, formatarMetrica: formatPct,
  },
]

// ── Leitura genérica ──────────────────────────────────────────────────────────

async function lerQuartilTopico(
  config: QuartilTopicoConfig,
  spreadsheetId: string,
  username: string,
): Promise<QuartilTopico> {
  const vazio: QuartilTopico = {
    id: config.id, nomeTopico: config.nomeTopico,
    dataAtualizacao: null, operadorAtual: null,
    rankGlobal: null, totalOperadores: 0,
  }

  try {
    const res = await withTimeout(
      sheetsAPI().spreadsheets.values.get({
        spreadsheetId,
        range: `'${config.aba}'!A1:H300`,
      })
    )
    const values = (res.data.values ?? []) as string[][]
    if (values.length < 2) return vazio

    const dataAtualizacao = config.colunaData !== null
      ? (values[1]?.[config.colunaData] ?? '').trim() || null
      : null

    // Coletar dados a partir da linha 2 (índice 1), pular cabeçalho
    type Row = { email: string; metrica: number; metricaFormatada: string; quartil: 1 | 2 | 3 | 4 }
    const lista: Row[] = []
    for (let i = 1; i < values.length; i++) {
      const row    = values[i]
      const email  = (row[0] ?? '').trim()
      if (!email) continue
      const metrica = config.parseMetrica(row[config.colunaMetrica])
      const quartil = parseQuartil(row[config.colunaQuartil])
      if (metrica === null || quartil === null) continue
      lista.push({ email, metrica, metricaFormatada: config.formatarMetrica(metrica), quartil })
    }

    if (!lista.length) return { ...vazio, dataAtualizacao }

    // Sort estável sobre TODOS os operadores Alloha (sem filtro de equipe)
    const ordenados = [...lista].sort((a, b) =>
      config.sortOrder === 'desc' ? b.metrica - a.metrica : a.metrica - b.metrica
    )
    const rankIdx = ordenados.findIndex(op => matchEmail(op.email, username))
    const found   = rankIdx >= 0 ? ordenados[rankIdx] : null

    return {
      id:              config.id,
      nomeTopico:      config.nomeTopico,
      dataAtualizacao,
      operadorAtual:   found ? { email: found.email, metrica: found.metrica, metricaFormatada: found.metricaFormatada, quartil: found.quartil } : null,
      rankGlobal:      rankIdx >= 0 ? rankIdx + 1 : null,
      totalOperadores: lista.length,
    }
  } catch (e) {
    console.error(`[lerQuartilTopico:${config.id}]`, e)
    return vazio
  }
}

// ── Ponto de entrada público ─────────────────────────────────────────────────

export async function lerTodosQuartis(
  spreadsheetId: string,
  username: string,
): Promise<QuartilTopico[]> {
  return Promise.all(TOPICOS.map(c => lerQuartilTopico(c, spreadsheetId, username)))
}

// ── Leitura de quartil para equipe (uma leitura por aba, não 14×) ─────────────

export interface QuartilOperadorEquipe {
  username:         string
  quartil:          1 | 2 | 3 | 4
  rankGlobal:       number
  metrica:          number
  metricaFormatada: string
}

export interface QuartilTopicoEquipe {
  id:              string
  nomeTopico:      string
  dataAtualizacao: string | null
  totalOperadores: number
  operadores:      QuartilOperadorEquipe[]  // só membros da equipe encontrados
}

async function lerQuartilTopicoEquipe(
  config: QuartilTopicoConfig,
  spreadsheetId: string,
  usernames: string[],
): Promise<QuartilTopicoEquipe> {
  const empty: QuartilTopicoEquipe = {
    id: config.id, nomeTopico: config.nomeTopico,
    dataAtualizacao: null, totalOperadores: 0, operadores: [],
  }
  try {
    const res = await withTimeout(
      sheetsAPI().spreadsheets.values.get({
        spreadsheetId,
        range: `'${config.aba}'!A1:H300`,
      })
    )
    const values = (res.data.values ?? []) as string[][]
    if (values.length < 2) return empty

    const dataAtualizacao = config.colunaData !== null
      ? (values[1]?.[config.colunaData] ?? '').trim() || null
      : null

    type Row = { email: string; metrica: number; metricaFormatada: string; quartil: 1 | 2 | 3 | 4 }
    const lista: Row[] = []
    for (let i = 1; i < values.length; i++) {
      const row    = values[i]
      const email  = (row[0] ?? '').trim()
      if (!email) continue
      const metrica = config.parseMetrica(row[config.colunaMetrica])
      const quartil = parseQuartil(row[config.colunaQuartil])
      if (metrica === null || quartil === null) continue
      lista.push({ email, metrica, metricaFormatada: config.formatarMetrica(metrica), quartil })
    }
    if (!lista.length) return { ...empty, dataAtualizacao }

    const ordenados = [...lista].sort((a, b) =>
      config.sortOrder === 'desc' ? b.metrica - a.metrica : a.metrica - b.metrica
    )

    const operadores: QuartilOperadorEquipe[] = []
    for (const username of usernames) {
      const rankIdx = ordenados.findIndex(op => matchEmail(op.email, username))
      if (rankIdx < 0) continue
      const found = ordenados[rankIdx]
      operadores.push({
        username,
        quartil:          found.quartil,
        rankGlobal:       rankIdx + 1,
        metrica:          found.metrica,
        metricaFormatada: found.metricaFormatada,
      })
    }

    return {
      id: config.id, nomeTopico: config.nomeTopico,
      dataAtualizacao, totalOperadores: lista.length, operadores,
    }
  } catch (e) {
    console.error(`[lerQuartilTopicoEquipe:${config.id}]`, e)
    return empty
  }
}

export async function lerQuartilEquipe(
  spreadsheetId: string,
  usernames: string[],
): Promise<QuartilTopicoEquipe[]> {
  return Promise.all(TOPICOS.map(c => lerQuartilTopicoEquipe(c, spreadsheetId, usernames)))
}
