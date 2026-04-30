// ── ABS (Controle de Presença) — operações Google Sheets ─────────────────────
// Servidor apenas — importa googleapis.

import { google } from 'googleapis'
import { escaparNomeAba } from '@/lib/sheets'

export type { ABSStatus, ABSSheetData } from '@/lib/abs-utils'
export { ABS_STATUS_OPTIONS, ABA_ABS, contarFaltasPorOperador } from '@/lib/abs-utils'
import type { ABSStatus, ABSSheetData } from '@/lib/abs-utils'
import { ABA_ABS } from '@/lib/abs-utils'

// ── Auth ──────────────────────────────────────────────────────────────────────

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

// ── Gerar datas do mês (exceto domingos) ─────────────────────────────────────

const DIAS_SEMANA = ['Dom', 'Seg', 'Ter', 'Qua', 'Qui', 'Sex', 'Sáb']

export function gerarDatasDoMes(mes: number, ano: number): { data: string; diaSemana: string }[] {
  const result: { data: string; diaSemana: string }[] = []
  const diasNoMes = new Date(ano, mes, 0).getDate() // mes 1-based
  for (let d = 1; d <= diasNoMes; d++) {
    const date = new Date(ano, mes - 1, d)
    const dow = date.getDay()
    if (dow === 0) continue // pular domingos
    result.push({
      data: `${String(d).padStart(2, '0')}/${String(mes).padStart(2, '0')}`,
      diaSemana: DIAS_SEMANA[dow],
    })
  }
  return result
}

// ── Verificar se aba existe ───────────────────────────────────────────────────

export async function abaABSExiste(spreadsheetId: string): Promise<boolean> {
  try {
    const res = await withTimeout(
      sheetsAPI().spreadsheets.get({
        spreadsheetId,
        fields: 'sheets.properties.title',
      })
    )
    return (res.data.sheets ?? []).some((s) => s.properties?.title === ABA_ABS)
  } catch {
    return false
  }
}

// ── Inicializar aba ABS ───────────────────────────────────────────────────────

export async function inicializarAbaABS(
  spreadsheetId: string,
  usernames: string[],
  mes: number,
  ano: number,
): Promise<void> {
  const api = sheetsAPI()

  const jaExiste = await abaABSExiste(spreadsheetId)

  if (!jaExiste) {
    // Criar aba
    await withTimeout(
      api.spreadsheets.batchUpdate({
        spreadsheetId,
        requestBody: {
          requests: [{ addSheet: { properties: { title: ABA_ABS } } }],
        },
      })
    )
  }

  const datas = gerarDatasDoMes(mes, ano)

  // Cabeçalho: ["Operador", "01/04", "02/04", ...]
  const header = ['Operador', ...datas.map((d) => d.data)]

  // Linhas de operadores
  const rows = usernames.map((u) => [u, ...datas.map(() => '-')])

  const values = [header, ...rows]

  await withTimeout(
    api.spreadsheets.values.update({
      spreadsheetId,
      range: `${escaparNomeAba(ABA_ABS)}!A1`,
      valueInputOption: 'RAW',
      requestBody: { values },
    })
  )
}

// ── Ler aba ABS ───────────────────────────────────────────────────────────────

export async function lerAbaABS(spreadsheetId: string): Promise<ABSSheetData> {
  const vazia: ABSSheetData = { datas: [], diasSemana: [], operadores: [], initialized: false }
  try {
    const exists = await abaABSExiste(spreadsheetId)
    if (!exists) return vazia

    const res = await withTimeout(
      sheetsAPI().spreadsheets.values.get({
        spreadsheetId,
        range: `${escaparNomeAba(ABA_ABS)}!A:ZZ`,
      })
    )
    const values = (res.data.values ?? []) as string[][]
    if (!values.length) return vazia

    const [header, ...dataRows] = values
    // header[0] = "Operador", header[1..] = datas "DD/MM"
    const datas = header.slice(1)

    // Inferir dias da semana a partir das datas
    const diasSemana = datas.map((d) => {
      const [dd, mm] = d.split('/').map(Number)
      const ano = new Date().getFullYear()
      const date = new Date(ano, mm - 1, dd)
      return DIAS_SEMANA[date.getDay()] ?? '?'
    })

    const operadores = dataRows
      .filter((r) => r[0]?.trim())
      .map((r, i) => ({
        username: r[0].trim(),
        rowIndex: i + 2, // 1-based: row 1 = header, row 2 = first op
        status: datas.map((_, j) => ((r[j + 1] ?? '-') as ABSStatus) || '-'),
      }))

    return { datas, diasSemana, operadores, initialized: true }
  } catch (e) {
    console.error('[lerAbaABS]', e)
    return vazia
  }
}

// ── Atualizar célula ─────────────────────────────────────────────────────────

// colIndex: 0-based index into datas array (0 = first date = col B)
export async function atualizarCelulaABS(
  spreadsheetId: string,
  rowIndex: number,   // 1-based sheet row
  colIndex: number,   // 0-based date index → sheet col = colIndex + 2 (B=2)
  status: ABSStatus,
): Promise<void> {
  // Col A=1 = Operador, Col B=2 = first date, etc.
  const sheetCol = colIndex + 2
  const colLetter = colIndexToLetter(sheetCol)
  const cellRef = `${escaparNomeAba(ABA_ABS)}!${colLetter}${rowIndex}`

  await withTimeout(
    sheetsAPI().spreadsheets.values.update({
      spreadsheetId,
      range: cellRef,
      valueInputOption: 'RAW',
      requestBody: { values: [[status]] },
    })
  )
}

function colIndexToLetter(n: number): string {
  let s = ''
  while (n > 0) {
    const rem = (n - 1) % 26
    s = String.fromCharCode(65 + rem) + s
    n = Math.floor((n - 1) / 26)
  }
  return s
}

