// ── SERVIDOR APENAS ──────────────────────────────────────────────────────────
// Este arquivo importa googleapis (Node.js). NUNCA importar em Client Components.
// Utilitários puros estão em @/lib/diario-utils — importe daí nos Client Components.

import { google } from 'googleapis'
import { getPlanilhaAtiva, resolverNomeAba } from '@/lib/sheets'

// Re-exporta tudo que é seguro usar no servidor também
export * from '@/lib/diario-utils'

import type { DiarioRegistro, NovoRegistroInput, EditarRegistroInput, TipoRegistro } from '@/lib/diario-utils'
import { TIPOS_REGISTRO, parseTempo } from '@/lib/diario-utils'

// ── Constantes ───────────────────────────────────────────────────────────────

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
  const criadoPor   = (row[6] ?? '').trim()
  const criadoEm    = (row[7] ?? '').trim()
  return {
    colaborador,
    tipo,
    observacoes,
    glpi,
    tempo,
    data,
    criadoPor,
    criadoEm,
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
    const aba = await resolverNomeAba(spreadsheetId, ABA_DIARIO)
    const res = await withTimeout(
      sheetsAPI().spreadsheets.values.get({
        spreadsheetId,
        range: `'${aba}'!A:H`,
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
 * Colunas: A=Colaborador B=Tipo C=Observações D=GLPI E=Tempo F=Data G=CriadoPor H=CriadoEm
 */
export async function escreverRegistro(
  spreadsheetId: string,
  dados: NovoRegistroInput,
  criadoPor: string,
): Promise<void> {
  const aba = await resolverNomeAba(spreadsheetId, ABA_DIARIO)
  const now = new Date()
  const criadoEm = `${String(now.getDate()).padStart(2,'0')}/${String(now.getMonth()+1).padStart(2,'0')}/${now.getFullYear()} ${String(now.getHours()).padStart(2,'0')}:${String(now.getMinutes()).padStart(2,'0')}`

  const row = [
    dados.colaborador,
    dados.tipo,
    dados.observacoes,
    dados.glpi,
    dados.tempo,
    dados.data,
    criadoPor,
    criadoEm,
  ]
  await withTimeout(
    sheetsAPI().spreadsheets.values.append({
      spreadsheetId,
      range: `'${aba}'!A:H`,
      valueInputOption: 'USER_ENTERED',
      requestBody: { values: [row] },
    })
  )
}

/**
 * Atualiza colunas A–F de uma linha existente. G (CriadoPor) e H (CriadoEm) NÃO são alterados.
 * sheetRowIndex é 0-based (0 = cabeçalho, 1 = primeira linha de dados).
 */
export async function editarRegistro(
  spreadsheetId: string,
  sheetRowIndex: number,
  dados: EditarRegistroInput,
): Promise<void> {
  const aba = await resolverNomeAba(spreadsheetId, ABA_DIARIO)
  const sheetRow = sheetRowIndex + 1 // A1 notation: 1-based
  const row = [
    dados.colaborador,
    dados.tipo,
    dados.observacoes,
    dados.glpi,
    dados.tempo,
    dados.data,
  ]
  await withTimeout(
    sheetsAPI().spreadsheets.values.update({
      spreadsheetId,
      range: `'${aba}'!A${sheetRow}:F${sheetRow}`,
      valueInputOption: 'USER_ENTERED',
      requestBody: { values: [row] },
    })
  )
}

// ── Deleção na planilha ───────────────────────────────────────────────────────

/** Retorna o sheetId numérico de uma aba pelo título exato. */
async function getAbaSheetId(spreadsheetId: string, abaTitle: string): Promise<number> {
  const res = await withTimeout(sheetsAPI().spreadsheets.get({ spreadsheetId }))
  const sheet = res.data.sheets?.find((s) => s.properties?.title === abaTitle)
  if (!sheet?.properties?.sheetId) throw new Error(`Aba "${abaTitle}" não encontrada para deleção`)
  return sheet.properties.sheetId
}

/**
 * Deleta a linha cujo índice 0-based na planilha é `sheetRowIndex`
 * (0 = cabeçalho, 1 = primeira linha de dados).
 * Usa batchUpdate → DeleteDimensionRequest para deleção exata.
 */
export async function deletarRegistro(spreadsheetId: string, sheetRowIndex: number): Promise<void> {
  const aba = await resolverNomeAba(spreadsheetId, ABA_DIARIO)
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
