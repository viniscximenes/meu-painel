// ── SERVIDOR APENAS ──────────────────────────────────────────────────────────
// Este arquivo importa googleapis (Node.js). NUNCA importar em Client Components.
// Utilitários puros estão em @/lib/monitoria-utils — importe daí nos Client Components.

import { google } from 'googleapis'
import { getPlanilhaAtiva, resolverNomeAba, escaparNomeAba } from '@/lib/sheets'

export * from '@/lib/monitoria-utils'

import type { Monitoria, NovaMonitoriaInput, AtualizarMonitoriaInput } from '@/lib/monitoria-utils'
import { calcularStatusMonitoria } from '@/lib/monitoria-utils'

// ── Constantes ───────────────────────────────────────────────────────────────

const ABA_MONITORIA = 'MONITORIA'

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

function rowToMonitoria(row: string[], sheetRowIndex: number): Monitoria {
  const colaborador        = (row[0]  ?? '').trim()
  const idChamada          = (row[1]  ?? '').trim()
  const contratoCliente    = (row[2]  ?? '').trim()
  const dataAtendimento    = (row[3]  ?? '').trim()
  const encaminhouPesquisa = (row[4]  ?? '').trim()
  const sinalizacao        = (row[5]  ?? '').trim()
  // row[6] = G — sempre vazia
  const apresentacao       = (row[7]  ?? '').trim()
  const comunicacao        = (row[8]  ?? '').trim()
  const processo           = (row[9]  ?? '').trim()
  const resumo             = (row[10] ?? '').trim()
  const celula             = (row[11] ?? '').trim()
  const anexo              = (row[12] ?? '').trim()
  const enviadoForms       = (row[13] ?? '').trim()

  return {
    sheetRowIndex,
    colaborador,
    idChamada,
    contratoCliente,
    dataAtendimento,
    encaminhouPesquisa,
    sinalizacao,
    apresentacao,
    comunicacao,
    processo,
    resumo,
    celula,
    anexo,
    enviadoForms,
    status: calcularStatusMonitoria({ colaborador, idChamada, contratoCliente, dataAtendimento, enviadoForms }),
  }
}

function inputToRow(dados: NovaMonitoriaInput): string[] {
  return [
    dados.colaborador,
    dados.idChamada,
    dados.contratoCliente,
    dados.dataAtendimento,
    dados.encaminhouPesquisa ?? '',
    dados.sinalizacao        ?? '',
    '',                          // G — sempre vazia
    dados.apresentacao       ?? '',
    dados.comunicacao        ?? '',
    dados.processo           ?? '',
    dados.resumo             ?? '',
    'Retenção',                  // L — sempre "Retenção"
    dados.anexo              ?? '',
    dados.enviadoForms       ?? '',
  ]
}

// ── Leitura ───────────────────────────────────────────────────────────────────

export async function buscarMonitorias(spreadsheetId: string): Promise<Monitoria[]> {
  try {
    const aba = await resolverNomeAba(spreadsheetId, ABA_MONITORIA)
    const res = await withTimeout(
      sheetsAPI().spreadsheets.values.get({
        spreadsheetId,
        range: `${escaparNomeAba(aba)}!A:N`,
      })
    )
    const values = (res.data.values ?? []) as string[][]

    return values
      .slice(1) // pula cabeçalho (índice 0)
      .map((row, i) => ({ row, sheetRowIndex: i + 1 }))
      .filter(({ row }) => row.some((c) => c?.trim()))
      .map(({ row, sheetRowIndex }) => rowToMonitoria(row, sheetRowIndex))
  } catch (e) {
    console.error('[buscarMonitorias]', e)
    return []
  }
}

export async function buscarMonitoriasAtivas(): Promise<{
  monitorias: Monitoria[]
  spreadsheetId: string | null
}> {
  const planilha = await getPlanilhaAtiva()
  if (!planilha) return { monitorias: [], spreadsheetId: null }
  const monitorias = await buscarMonitorias(planilha.spreadsheet_id)
  return { monitorias, spreadsheetId: planilha.spreadsheet_id }
}

// ── Escrita ───────────────────────────────────────────────────────────────────

export async function criarMonitoria(
  spreadsheetId: string,
  dados: NovaMonitoriaInput
): Promise<void> {
  const aba = await resolverNomeAba(spreadsheetId, ABA_MONITORIA)
  await withTimeout(
    sheetsAPI().spreadsheets.values.append({
      spreadsheetId,
      range: `${escaparNomeAba(aba)}!A:N`,
      valueInputOption: 'USER_ENTERED',
      requestBody: { values: [inputToRow(dados)] },
    })
  )
}

export async function atualizarMonitoria(
  spreadsheetId: string,
  dados: AtualizarMonitoriaInput
): Promise<void> {
  const aba = await resolverNomeAba(spreadsheetId, ABA_MONITORIA)
  const rowNumber = dados.sheetRowIndex + 1 // sheetRowIndex é 0-based
  await withTimeout(
    sheetsAPI().spreadsheets.values.update({
      spreadsheetId,
      range: `${escaparNomeAba(aba)}!A${rowNumber}:N${rowNumber}`,
      valueInputOption: 'USER_ENTERED',
      requestBody: { values: [inputToRow(dados)] },
    })
  )
}

// ── Deleção ───────────────────────────────────────────────────────────────────

async function getAbaSheetId(spreadsheetId: string, abaTitle: string): Promise<number> {
  const res = await withTimeout(sheetsAPI().spreadsheets.get({ spreadsheetId }))
  const sheet = res.data.sheets?.find((s) => s.properties?.title === abaTitle)
  if (!sheet?.properties?.sheetId) throw new Error(`Aba "${abaTitle}" não encontrada para deleção`)
  return sheet.properties.sheetId
}

export async function deletarMonitoria(
  spreadsheetId: string,
  sheetRowIndex: number
): Promise<void> {
  const aba = await resolverNomeAba(spreadsheetId, ABA_MONITORIA)
  const sheetId = await getAbaSheetId(spreadsheetId, aba)
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
                startIndex: sheetRowIndex,
                endIndex:   sheetRowIndex + 1,
              },
            },
          },
        ],
      },
    })
  )
}
