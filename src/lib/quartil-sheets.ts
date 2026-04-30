// ── Aba QUARTIL — leitura genérica de dados de quartil por tópico ─────────────
// Servidor apenas — importa googleapis.

import { google } from 'googleapis'
import { getPlanilhaAtiva, escaparNomeAba } from '@/lib/sheets'
import {
  QUARTIL_TOPICOS,
  getMapeamentoQuartil,
  type QuartilTopicoDef,
  type QuartilTopicoId,
  type MapeamentoQuartilTopico,
} from '@/lib/quartil-config'
import { letraColunaParaIndice } from '@/lib/kpi-coluna-utils'

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
  metrica:          number
  metricaFormatada: string
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

// ── Config interna fixo por tópico (não configurável) ─────────────────────────

interface QuartilTopicoInterno {
  nomeTopico:      string
  sortOrder:       'asc' | 'desc'
  parseMetrica:    (raw: string | undefined) => number | null
  formatarMetrica: (n: number) => string
}

const TOPICO_INTERNO: Record<QuartilTopicoId, QuartilTopicoInterno> = {
  churn:      { nomeTopico: 'Cancelados',        sortOrder: 'asc',  parseMetrica: parseInt_,        formatarMetrica: formatInt },
  txretencao: { nomeTopico: 'Taxa de Retenção',  sortOrder: 'desc', parseMetrica: parsePct,         formatarMetrica: formatPct },
  tma:        { nomeTopico: 'TMA',               sortOrder: 'asc',  parseMetrica: parseTMA,         formatarMetrica: formatTMA },
  abs:        { nomeTopico: 'ABS',               sortOrder: 'asc',  parseMetrica: parsePctAbsoluto, formatarMetrica: formatPct },
  indisp:     { nomeTopico: 'Indisponibilidade', sortOrder: 'asc',  parseMetrica: parsePct,         formatarMetrica: formatPct },
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

export function parsePct(raw: string | undefined): number | null {
  if (!raw) return null
  const s = raw.toString().replace(/\s/g, '').replace(',', '.')
  if (s.startsWith('#') || s === '') return null
  const n = parseFloat(s.replace('%', ''))
  if (isNaN(n)) return null
  return n <= 1 ? n * 100 : n
}

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

export async function getEmailsEquipeAtiva(): Promise<Set<string>> {
  try {
    const planilha = await getPlanilhaAtiva()
    if (!planilha) {
      console.warn('[getEmailsEquipeAtiva] Nenhuma planilha ativa')
      return new Set()
    }
    const aba = planilha.aba || ''
    const range = aba ? `${escaparNomeAba(aba)}!A1:A300` : 'A1:A300'
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
        emails.add(celula.split('@')[0])
      }
    }
    return emails
  } catch (e) {
    console.error('[getEmailsEquipeAtiva]', e)
    return new Set()
  }
}

// ── Leitura genérica de um tópico ────────────────────────────────────────────

async function lerQuartilTopico(
  topicoDef: QuartilTopicoDef,
  configColunas: MapeamentoQuartilTopico,
  spreadsheetId: string,
  username: string,
): Promise<QuartilTopico> {
  const interno = TOPICO_INTERNO[topicoDef.id]
  const vazio: QuartilTopico = {
    id: topicoDef.id, nomeTopico: interno.nomeTopico,
    dataAtualizacao: null, operadorAtual: null,
    rankGlobal: null, totalOperadores: 0,
  }

  if (!configColunas.metrica || !configColunas.quadrante) return vazio

  const colMetricaIdx   = letraColunaParaIndice(configColunas.metrica)
  const colQuadranteIdx = letraColunaParaIndice(configColunas.quadrante)
  const colDataIdx      = configColunas.data ? letraColunaParaIndice(configColunas.data) : null

  try {
    const res = await withTimeout(
      sheetsAPI().spreadsheets.values.get({
        spreadsheetId,
        range: `${escaparNomeAba(topicoDef.aba)}!A1:ZZ300`,
      })
    )
    const values = (res.data.values ?? []) as string[][]
    if (values.length < 2) return vazio

    const dataAtualizacao = colDataIdx !== null
      ? (values[1]?.[colDataIdx] ?? '').trim() || null
      : null

    type Row = { email: string; metrica: number; metricaFormatada: string; quartil: 1 | 2 | 3 | 4 }
    const lista: Row[] = []
    for (let i = 1; i < values.length; i++) {
      const row    = values[i]
      const email  = (row[0] ?? '').trim()
      if (!email) continue
      const metrica = interno.parseMetrica(row[colMetricaIdx])
      const quartil = parseQuartil(row[colQuadranteIdx])
      if (metrica === null || quartil === null) continue
      lista.push({ email, metrica, metricaFormatada: interno.formatarMetrica(metrica), quartil })
    }

    if (!lista.length) return { ...vazio, dataAtualizacao }

    const ordenados = [...lista].sort((a, b) =>
      interno.sortOrder === 'desc' ? b.metrica - a.metrica : a.metrica - b.metrica
    )
    const rankIdx = ordenados.findIndex(op => matchEmail(op.email, username))
    const found   = rankIdx >= 0 ? ordenados[rankIdx] : null

    return {
      id:              topicoDef.id,
      nomeTopico:      interno.nomeTopico,
      dataAtualizacao,
      operadorAtual:   found
        ? { email: found.email, metrica: found.metrica, metricaFormatada: found.metricaFormatada, quartil: found.quartil }
        : null,
      rankGlobal:      rankIdx >= 0 ? rankIdx + 1 : null,
      totalOperadores: lista.length,
    }
  } catch (e) {
    console.error(`[lerQuartilTopico:${topicoDef.id}]`, e)
    return vazio
  }
}

// ── Ponto de entrada público ──────────────────────────────────────────────────

export async function lerTodosQuartis(
  spreadsheetId: string,
  username: string,
): Promise<QuartilTopico[]> {
  const mapeamento = await getMapeamentoQuartil()
  return Promise.all(
    QUARTIL_TOPICOS.map(topico => lerQuartilTopico(topico, mapeamento[topico.id], spreadsheetId, username))
  )
}

// ── Leitura para equipe ───────────────────────────────────────────────────────

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
  operadores:      QuartilOperadorEquipe[]
}

async function lerQuartilTopicoEquipe(
  topicoDef: QuartilTopicoDef,
  configColunas: MapeamentoQuartilTopico,
  spreadsheetId: string,
  usernames: string[],
): Promise<QuartilTopicoEquipe> {
  const interno = TOPICO_INTERNO[topicoDef.id]
  const empty: QuartilTopicoEquipe = {
    id: topicoDef.id, nomeTopico: interno.nomeTopico,
    dataAtualizacao: null, totalOperadores: 0, operadores: [],
  }

  if (!configColunas.metrica || !configColunas.quadrante) return empty

  const colMetricaIdx   = letraColunaParaIndice(configColunas.metrica)
  const colQuadranteIdx = letraColunaParaIndice(configColunas.quadrante)
  const colDataIdx      = configColunas.data ? letraColunaParaIndice(configColunas.data) : null

  try {
    const res = await withTimeout(
      sheetsAPI().spreadsheets.values.get({
        spreadsheetId,
        range: `${escaparNomeAba(topicoDef.aba)}!A1:ZZ300`,
      })
    )
    const values = (res.data.values ?? []) as string[][]
    if (values.length < 2) return empty

    const dataAtualizacao = colDataIdx !== null
      ? (values[1]?.[colDataIdx] ?? '').trim() || null
      : null

    type Row = { email: string; metrica: number; metricaFormatada: string; quartil: 1 | 2 | 3 | 4 }
    const lista: Row[] = []
    for (let i = 1; i < values.length; i++) {
      const row    = values[i]
      const email  = (row[0] ?? '').trim()
      if (!email) continue
      const metrica = interno.parseMetrica(row[colMetricaIdx])
      const quartil = parseQuartil(row[colQuadranteIdx])
      if (metrica === null || quartil === null) continue
      lista.push({ email, metrica, metricaFormatada: interno.formatarMetrica(metrica), quartil })
    }
    if (!lista.length) return { ...empty, dataAtualizacao }

    const ordenados = [...lista].sort((a, b) =>
      interno.sortOrder === 'desc' ? b.metrica - a.metrica : a.metrica - b.metrica
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
      id: topicoDef.id, nomeTopico: interno.nomeTopico,
      dataAtualizacao, totalOperadores: lista.length, operadores,
    }
  } catch (e) {
    console.error(`[lerQuartilTopicoEquipe:${topicoDef.id}]`, e)
    return empty
  }
}

export async function lerQuartilEquipe(
  spreadsheetId: string,
  usernames: string[],
): Promise<QuartilTopicoEquipe[]> {
  const mapeamento = await getMapeamentoQuartil()
  return Promise.all(
    QUARTIL_TOPICOS.map(topico => lerQuartilTopicoEquipe(topico, mapeamento[topico.id], spreadsheetId, usernames))
  )
}
