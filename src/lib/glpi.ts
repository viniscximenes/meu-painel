// ── GLPI — operações Google Sheets ───────────────────────────────────────────
// Servidor apenas — importa googleapis.

import { google } from 'googleapis'

export type GLPIStatus   = 'Em Andamento' | 'Finalizado'
export type GLPIEtiqueta = 'Urgente' | 'Normal' | 'Baixa Prioridade'

export interface GLPIItem {
  rowIndex: number
  id: string
  responsavel: string
  fila: string
  codigoGLPI: string
  descricao: string
  dataAbertura: string
  status: GLPIStatus
  resposta: string
  emailRespondente: string
  dataResolucao: string
  etiqueta: GLPIEtiqueta
}

export interface GLPIDados {
  responsavel: string
  fila: string
  codigoGLPI: string
  descricao: string
  dataAbertura: string
  status?: GLPIStatus
  resposta?: string
  emailRespondente?: string
  dataResolucao?: string
  etiqueta: GLPIEtiqueta
}

export const ABA_GLPI = 'GLPI'

const HEADER = [
  'ID', 'Responsável', 'Fila', 'Código GLPI', 'Descrição',
  'Data Abertura', 'Status', 'Resposta', 'Email Respondente',
  'Data Resolução', 'Etiqueta',
]

// ── Auth ──────────────────────────────────────────────────────────────────────

function sheetsAPI() {
  const auth = new google.auth.GoogleAuth({
    credentials: {
      client_email: process.env.GOOGLE_SERVICE_ACCOUNT_EMAIL,
      private_key: process.env.GOOGLE_PRIVATE_KEY?.replace(/\\n/g, '\n'),
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

// ── Aba ───────────────────────────────────────────────────────────────────────

async function abaGLPIExiste(spreadsheetId: string): Promise<boolean> {
  try {
    const res = await withTimeout(
      sheetsAPI().spreadsheets.get({ spreadsheetId, fields: 'sheets.properties.title' })
    )
    return (res.data.sheets ?? []).some(s => s.properties?.title === ABA_GLPI)
  } catch {
    return false
  }
}

async function garantirAbaGLPI(spreadsheetId: string): Promise<void> {
  const exists = await abaGLPIExiste(spreadsheetId)
  if (!exists) {
    await withTimeout(
      sheetsAPI().spreadsheets.batchUpdate({
        spreadsheetId,
        requestBody: { requests: [{ addSheet: { properties: { title: ABA_GLPI } } }] },
      })
    )
  }
  await inicializarCabecalhoGLPI(spreadsheetId)
}

async function inicializarCabecalhoGLPI(spreadsheetId: string): Promise<void> {
  const res = await withTimeout(
    sheetsAPI().spreadsheets.values.get({
      spreadsheetId,
      range: `'${ABA_GLPI}'!A1:K1`,
    })
  )
  const linha1 = (res.data.values ?? [])[0] ?? []
  if (linha1[0] === 'ID') return // cabeçalho já presente
  console.log('[GLPI] Cabeçalho ausente — inicializando aba GLPI')
  await withTimeout(
    sheetsAPI().spreadsheets.values.update({
      spreadsheetId,
      range: `'${ABA_GLPI}'!A1`,
      valueInputOption: 'RAW',
      requestBody: { values: [HEADER] },
    })
  )
}

// ── Helpers ───────────────────────────────────────────────────────────────────

function rowToGLPI(row: string[], rowIndex: number): GLPIItem {
  return {
    rowIndex,
    id:               row[0]  ?? '',
    responsavel:      row[1]  ?? '',
    fila:             row[2]  ?? '',
    codigoGLPI:       row[3]  ?? '',
    descricao:        row[4]  ?? '',
    dataAbertura:     row[5]  ?? '',
    status:           (row[6] as GLPIStatus) || 'Em Andamento',
    resposta:         row[7]  ?? '',
    emailRespondente: row[8]  ?? '',
    dataResolucao:    row[9]  ?? '',
    etiqueta:         (row[10] as GLPIEtiqueta) || 'Normal',
  }
}

export function gerarProximoId(linhas: string[][]): string {
  const nums = linhas
    .map(r => r[0])
    .filter(id => /^GLPI-\d+$/.test(id ?? ''))
    .map(id => parseInt(id.replace('GLPI-', ''), 10))
  const max = nums.length > 0 ? Math.max(...nums) : 0
  return `GLPI-${String(max + 1).padStart(3, '0')}`
}

// ── Leitura ───────────────────────────────────────────────────────────────────

export async function buscarGLPIs(spreadsheetId: string): Promise<GLPIItem[]> {
  try {
    const exists = await abaGLPIExiste(spreadsheetId)
    if (!exists) return []
    await inicializarCabecalhoGLPI(spreadsheetId)
    const res = await withTimeout(
      sheetsAPI().spreadsheets.values.get({ spreadsheetId, range: `'${ABA_GLPI}'!A:K` })
    )
    const values = (res.data.values ?? []) as string[][]
    if (values.length <= 1) return []
    return values.slice(1).map((row, i) => rowToGLPI(row, i + 2))
  } catch (e) {
    console.error('[buscarGLPIs]', e)
    return []
  }
}

export async function contarGLPIsPendentes(spreadsheetId: string): Promise<number> {
  try {
    const exists = await abaGLPIExiste(spreadsheetId)
    if (!exists) return 0
    const res = await withTimeout(
      sheetsAPI().spreadsheets.values.get({ spreadsheetId, range: `'${ABA_GLPI}'!G2:G` })
    )
    const values = (res.data.values ?? []) as string[][]
    return values.filter(r => r[0] === 'Em Andamento').length
  } catch {
    return 0
  }
}

// ── SheetId da aba GLPI ──────────────────────────────────────────────────────

async function getGLPISheetId(spreadsheetId: string): Promise<number> {
  const res = await withTimeout(
    sheetsAPI().spreadsheets.get({ spreadsheetId, fields: 'sheets.properties' })
  )
  const sheet = (res.data.sheets ?? []).find(s => s.properties?.title === ABA_GLPI)
  if (!sheet?.properties) throw new Error('Aba GLPI não encontrada')
  return sheet.properties.sheetId!
}

// ── Escrita ───────────────────────────────────────────────────────────────────

export async function criarGLPI(spreadsheetId: string, dados: GLPIDados): Promise<void> {
  await garantirAbaGLPI(spreadsheetId)
  const colA = await withTimeout(
    sheetsAPI().spreadsheets.values.get({ spreadsheetId, range: `'${ABA_GLPI}'!A:A` })
  )
  const linhas = (colA.data.values ?? []) as string[][]
  const id = gerarProximoId(linhas.slice(1))
  const row = [
    id,
    dados.responsavel,
    dados.fila,
    dados.codigoGLPI,
    dados.descricao,
    dados.dataAbertura,
    dados.status ?? 'Em Andamento',
    dados.resposta ?? '',
    dados.emailRespondente ?? '',
    dados.dataResolucao ?? '',
    dados.etiqueta,
  ]
  await withTimeout(
    sheetsAPI().spreadsheets.values.append({
      spreadsheetId,
      range: `'${ABA_GLPI}'!A:K`,
      valueInputOption: 'RAW',
      requestBody: { values: [row] },
    })
  )
}

export async function atualizarGLPI(
  spreadsheetId: string,
  rowIndex: number,
  dados: Partial<GLPIDados & { status: GLPIStatus }>,
): Promise<void> {
  const res = await withTimeout(
    sheetsAPI().spreadsheets.values.get({
      spreadsheetId,
      range: `'${ABA_GLPI}'!A${rowIndex}:K${rowIndex}`,
    })
  )
  const cur = ((res.data.values ?? [[]])[0] ?? []) as string[]
  const merged = [
    cur[0]  ?? '',
    dados.responsavel      ?? cur[1]  ?? '',
    dados.fila             ?? cur[2]  ?? '',
    dados.codigoGLPI       ?? cur[3]  ?? '',
    dados.descricao        ?? cur[4]  ?? '',
    dados.dataAbertura     ?? cur[5]  ?? '',
    dados.status           ?? cur[6]  ?? 'Em Andamento',
    dados.resposta         ?? cur[7]  ?? '',
    dados.emailRespondente ?? cur[8]  ?? '',
    dados.dataResolucao    ?? cur[9]  ?? '',
    dados.etiqueta         ?? cur[10] ?? 'Normal',
  ]
  await withTimeout(
    sheetsAPI().spreadsheets.values.update({
      spreadsheetId,
      range: `'${ABA_GLPI}'!A${rowIndex}:K${rowIndex}`,
      valueInputOption: 'RAW',
      requestBody: { values: [merged] },
    })
  )
}

export async function excluirGLPI(spreadsheetId: string, rowIndex: number): Promise<void> {
  const sheetId = await getGLPISheetId(spreadsheetId)
  // rowIndex é 1-based; DeleteDimensionRequest usa 0-based [startIndex, endIndex)
  await withTimeout(
    sheetsAPI().spreadsheets.batchUpdate({
      spreadsheetId,
      requestBody: {
        requests: [{
          deleteDimension: {
            range: {
              sheetId,
              dimension: 'ROWS',
              startIndex: rowIndex - 1,
              endIndex: rowIndex,
            },
          },
        }],
      },
    })
  )
}
