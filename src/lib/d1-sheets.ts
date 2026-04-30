// ── Aba D1 — leitura de dados do dia anterior ─────────────────────────────────
// Servidor apenas — importa googleapis.

import { google } from 'googleapis'
import { resolverNomeAba, escaparNomeAba } from '@/lib/sheets'

const ABA_D1 = 'D1'

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

export interface D1OperadorData {
  email:       string
  retidos:     number
  cancelados:  number
  pedidos:     number
  txRetencao:  number | null  // null se #DIV/0! ou ausente
}

export interface D1SheetData {
  ultimaAtualizacao: string | null  // conteúdo de F2
  operadores:        D1OperadorData[]
}

function parseNum(v: string | undefined): number {
  if (!v) return 0
  const s = v.toString().replace(/[%\s]/g, '').replace(',', '.')
  const n = parseFloat(s)
  return isNaN(n) ? 0 : n
}

function parseTaxa(v: string | undefined): number | null {
  if (!v) return null
  const s = v.toString().trim()
  if (s.startsWith('#') || s === '') return null
  return parseNum(s)
}

export async function lerAbaD1(spreadsheetId: string): Promise<D1SheetData> {
  const vazia: D1SheetData = { ultimaAtualizacao: null, operadores: [] }
  try {
    const aba = await resolverNomeAba(spreadsheetId, ABA_D1)
    const res = await withTimeout(
      sheetsAPI().spreadsheets.values.get({
        spreadsheetId,
        range: `${escaparNomeAba(aba)}!A1:F200`,
      })
    )
    const values = (res.data.values ?? []) as string[][]
    if (!values.length) return vazia

    // F2 = row index 1 (0-based), col index 5
    const ultimaAtualizacao = (values[1]?.[5] ?? '').trim() || null

    // Linhas de operadores: A2:E (row index 1+)
    const operadores: D1OperadorData[] = []
    for (let i = 1; i < values.length; i++) {
      const row = values[i]
      const email = (row[0] ?? '').trim()
      if (!email) continue
      operadores.push({
        email,
        cancelados: parseNum(row[1]),  // col B
        retidos:    parseNum(row[2]),  // col C
        pedidos:    parseNum(row[3]),  // col D
        txRetencao: parseTaxa(row[4]), // col E — lido direto, sem recalcular
      })
    }

    return { ultimaAtualizacao, operadores }
  } catch (e) {
    console.error('[lerAbaD1]', e)
    return vazia
  }
}

// ── Matcher email D1 com username/nome ────────────────────────────────────────

export function matchEmailD1(email: string, username: string, nomeCompleto: string): boolean {
  const e = email.toLowerCase().trim()
  const beforeAt = e.split('@')[0]
  const u = username.toLowerCase().trim()
  const nome = nomeCompleto.toLowerCase().trim()

  if (beforeAt === u) return true
  const eFirst = beforeAt.split(/[.\s_-]/)[0]
  const uFirst = u.split('.')[0]
  const nFirst = nome.split(' ')[0]
  if (eFirst && (eFirst === uFirst || eFirst === nFirst)) return true
  return false
}
