// ── SERVIDOR APENAS ──────────────────────────────────────────────────────────
// Este arquivo importa googleapis (Node.js). NUNCA importar em Client Components.
// Utilitários puros estão em @/lib/diario-utils — importe daí nos Client Components.

import { google } from 'googleapis'
import { getPlanilhaAtiva } from '@/lib/sheets'

// Re-exporta tudo que é seguro usar no servidor também
export * from '@/lib/diario-utils'

import type { DiarioRegistro, NovoRegistroInput, TipoRegistro } from '@/lib/diario-utils'
import { TIPOS_REGISTRO, parseTempo } from '@/lib/diario-utils'

// ── Constante interna ─────────────────────────────────────────────────────────

const ABA_DIARIO = 'DIARIO DE BORDO'

// ── Auth ─────────────────────────────────────────────────────────────────────

function getAuth() {
  return new google.auth.GoogleAuth({
    credentials: {
      client_email: process.env.GOOGLE_SERVICE_ACCOUNT_EMAIL,
      private_key:  process.env.GOOGLE_PRIVATE_KEY?.replace(/\\n/g, '\n'),
    },
    scopes: ['https://www.googleapis.com/auth/spreadsheets'],
  })
}

function sheetsAPI() {
  return google.sheets({ version: 'v4', auth: getAuth() })
}

function withTimeout<T>(promise: Promise<T>, ms = 12_000): Promise<T> {
  return Promise.race([
    promise,
    new Promise<never>((_, reject) =>
      setTimeout(() => reject(new Error(`Timeout ${ms}ms`)), ms)
    ),
  ])
}

// ── Parsing interno ───────────────────────────────────────────────────────────

function parseData(raw: string): Date | null {
  if (!raw) return null
  const dmy = raw.match(/^(\d{1,2})\/(\d{1,2})\/(\d{4})$/)
  if (dmy) {
    const d = new Date(parseInt(dmy[3]), parseInt(dmy[2]) - 1, parseInt(dmy[1]))
    return isNaN(d.getTime()) ? null : d
  }
  const ymd = raw.match(/^(\d{4})-(\d{2})-(\d{2})$/)
  if (ymd) {
    const d = new Date(parseInt(ymd[1]), parseInt(ymd[2]) - 1, parseInt(ymd[3]))
    return isNaN(d.getTime()) ? null : d
  }
  return null
}

function normalizarTipo(raw: string): TipoRegistro {
  const t = raw.trim()
  if (TIPOS_REGISTRO.includes(t as TipoRegistro)) return t as TipoRegistro
  const found = TIPOS_REGISTRO.find((r) => r.toLowerCase() === t.toLowerCase())
  return found ?? 'Outros'
}

function rowToRegistro(row: string[], sheetRowIndex: number): DiarioRegistro {
  const colaborador = (row[0] ?? '').trim()
  const tipo        = normalizarTipo(row[1] ?? 'Outros')
  const observacoes = (row[2] ?? '').trim()
  const glpi        = (row[3] ?? '').trim()
  const tempo       = (row[4] ?? '').trim()
  const data        = (row[5] ?? '').trim()
  return {
    colaborador,
    tipo,
    observacoes,
    glpi,
    tempo,
    data,
    tempoMin:      parseTempo(tempo),
    dataObj:       parseData(data),
    sheetRowIndex,
  }
}

// ── Leitura da planilha ───────────────────────────────────────────────────────

/**
 * Busca todos os registros da aba "DIARIO DE BORDO".
 * Preserva o índice original da linha na planilha (sheetRowIndex, 0-based)
 * para permitir deleção exata mesmo na presença de linhas vazias intercaladas.
 */
export async function buscarDiario(spreadsheetId: string): Promise<DiarioRegistro[]> {
  try {
    const res = await withTimeout(
      sheetsAPI().spreadsheets.values.get({
        spreadsheetId,
        range: `${ABA_DIARIO}!A:F`,
      })
    )
    const values = (res.data.values ?? []) as string[][]

    // Mapeia ANTES do filter para preservar índices originais.
    // values[0] = cabeçalho (sheetRowIndex 0)
    // values[1] = primeira linha de dados (sheetRowIndex 1)
    const indexed = values
      .slice(1)
      .map((row, i) => ({ row, sheetRowIndex: i + 1 }))
      .filter(({ row }) => row.some((c) => c?.trim()))

    const registros = indexed.map(({ row, sheetRowIndex }) => rowToRegistro(row, sheetRowIndex))

    return registros.sort((a, b) => {
      if (!a.dataObj && !b.dataObj) return b.sheetRowIndex - a.sheetRowIndex
      if (!a.dataObj) return 1
      if (!b.dataObj) return -1
      const dateDiff = b.dataObj.getTime() - a.dataObj.getTime()
      if (dateDiff !== 0) return dateDiff
      // mesmo dia: linha mais alta na planilha (maior índice) aparece primeiro
      return b.sheetRowIndex - a.sheetRowIndex
    })
  } catch (e) {
    console.error('[buscarDiario]', e)
    return []
  }
}

/** Wrapper que busca a planilha ativa e lê o diário. */
export async function buscarDiarioAtivo(): Promise<{ registros: DiarioRegistro[]; spreadsheetId: string | null }> {
  const planilha = await getPlanilhaAtiva()
  if (!planilha) return { registros: [], spreadsheetId: null }
  const registros = await buscarDiario(planilha.spreadsheet_id)
  return { registros, spreadsheetId: planilha.spreadsheet_id }
}

// ── Escrita na planilha ───────────────────────────────────────────────────────

/**
 * Adiciona uma nova linha no final da aba "DIARIO DE BORDO".
 * Colunas: A=Colaborador B=Tipo C=Observações D=GLPI E=Tempo F=Data
 */
export async function escreverRegistro(
  spreadsheetId: string,
  dados: NovoRegistroInput
): Promise<void> {
  const row = [
    dados.colaborador,
    dados.tipo,
    dados.observacoes,
    dados.glpi,
    dados.tempo,
    dados.data,
  ]
  await withTimeout(
    sheetsAPI().spreadsheets.values.append({
      spreadsheetId,
      range: `${ABA_DIARIO}!A:F`,
      valueInputOption: 'USER_ENTERED',
      requestBody: { values: [row] },
    })
  )
}

// ── Deleção na planilha ───────────────────────────────────────────────────────

/** Retorna o sheetId numérico de uma aba pelo título. */
async function getAbaSheetId(spreadsheetId: string, abaTitle: string): Promise<number> {
  const res = await withTimeout(sheetsAPI().spreadsheets.get({ spreadsheetId }))
  const sheet = res.data.sheets?.find((s) => s.properties?.title === abaTitle)
  return sheet?.properties?.sheetId ?? 0
}

/**
 * Deleta a linha cujo índice 0-based na planilha é `sheetRowIndex`
 * (0 = cabeçalho, 1 = primeira linha de dados).
 * Usa batchUpdate → DeleteDimensionRequest para deleção exata.
 */
export async function deletarRegistro(spreadsheetId: string, sheetRowIndex: number): Promise<void> {
  const sheetId = await getAbaSheetId(spreadsheetId, ABA_DIARIO)
  await withTimeout(
    sheetsAPI().spreadsheets.batchUpdate({
      spreadsheetId,
      requestBody: {
        requests: [
          {
            deleteDimension: {
              range: {
                sheetId,
                dimension: 'ROWS',
                startIndex: sheetRowIndex,       // 0-based, inclusivo
                endIndex:   sheetRowIndex + 1,   // 0-based, exclusivo
              },
            },
          },
        ],
      },
    })
  )
}
