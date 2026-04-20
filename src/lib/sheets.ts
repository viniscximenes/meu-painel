import { google } from 'googleapis'
import { createAdminClient } from '@/lib/supabase/admin'

// ── Timeout helper ────────────────────────────────────────────────────────────

function withTimeout<T>(promise: Promise<T>, ms = 12_000): Promise<T> {
  return Promise.race([
    promise,
    new Promise<never>((_, reject) =>
      setTimeout(() => reject(new Error(`Timeout após ${ms}ms`)), ms)
    ),
  ])
}

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

// ── Tipos ─────────────────────────────────────────────────────────────────────

export interface Planilha {
  id: string
  nome: string
  spreadsheet_id: string
  aba: string           // aba/tab dentro da planilha; vazio = primeira aba
  ativa: boolean
  created_at: string
  referencia_mes: number | null
  referencia_ano: number | null
}

export interface LinhasPlanilha {
  headers: string[]
  rows: string[][]
}

export interface LinhaOperador {
  headers: string[]
  row: string[]
}

// ── CRUD de planilhas (Supabase) ──────────────────────────────────────────────

export async function listarPlanilhas(): Promise<Planilha[]> {
  try {
    const db = createAdminClient()
    const { data } = await db
      .from('planilhas')
      .select('*')
      .order('created_at', { ascending: false })
    return (data ?? []) as Planilha[]
  } catch {
    return []
  }
}

export async function getPlanilhaAtiva(): Promise<Planilha | null> {
  try {
    const db = createAdminClient()
    const { data } = await db
      .from('planilhas')
      .select('*')
      .eq('ativa', true)
      .single()
    return (data ?? null) as Planilha | null
  } catch {
    return null
  }
}

export async function addPlanilha(
  nome: string,
  spreadsheet_id: string,
  aba: string
): Promise<string> {
  const db = createAdminClient()
  const { data, error } = await db
    .from('planilhas')
    .insert({ nome, spreadsheet_id, aba, ativa: false })
    .select('id')
    .single()
  if (error) throw error
  return (data as { id: string }).id
}

export async function ativarPlanilha(id: string): Promise<void> {
  const db = createAdminClient()
  // Desativa todas, depois ativa a escolhida
  await db.from('planilhas').update({ ativa: false }).neq('id', id)
  await db.from('planilhas').update({ ativa: true }).eq('id', id)
}

export async function atualizarPlanilha(
  id: string,
  dados: Partial<Pick<Planilha, 'nome' | 'spreadsheet_id' | 'aba'>>
): Promise<void> {
  const db = createAdminClient()
  await db.from('planilhas').update(dados).eq('id', id)
}

export async function deletarPlanilha(id: string): Promise<void> {
  const db = createAdminClient()
  await db.from('planilhas').delete().eq('id', id)
}

export async function associarReferencia(
  id: string,
  mes: number | null,
  ano: number | null,
): Promise<void> {
  const db = createAdminClient()
  await db.from('planilhas').update({ referencia_mes: mes, referencia_ano: ano }).eq('id', id)
}

export async function listarPlanilhasHistorico(): Promise<Planilha[]> {
  try {
    const db = createAdminClient()
    const { data } = await db
      .from('planilhas')
      .select('*')
      .not('referencia_mes', 'is', null)
      .order('referencia_ano', { ascending: false })
      .order('referencia_mes', { ascending: false })
    return (data ?? []) as Planilha[]
  } catch {
    return []
  }
}

export async function getPlanilhaPorMes(mes: number, ano: number): Promise<Planilha | null> {
  try {
    const db = createAdminClient()
    const { data } = await db
      .from('planilhas')
      .select('*')
      .eq('referencia_mes', mes)
      .eq('referencia_ano', ano)
      .single()
    return (data ?? null) as Planilha | null
  } catch {
    return null
  }
}

export async function getUltimasNPlanilhasHistorico(n: number): Promise<Planilha[]> {
  try {
    const db = createAdminClient()
    const { data } = await db
      .from('planilhas')
      .select('*')
      .not('referencia_mes', 'is', null)
      .order('referencia_ano', { ascending: false })
      .order('referencia_mes', { ascending: false })
      .limit(n)
    return (data ?? []) as Planilha[]
  } catch {
    return []
  }
}

// ── Google Sheets: listar abas ────────────────────────────────────────────────

export async function listarAbas(spreadsheet_id: string): Promise<string[]> {
  if (!spreadsheet_id) return []
  try {
    const res = await withTimeout(
      sheetsAPI().spreadsheets.get({
        spreadsheetId: spreadsheet_id,
        fields: 'sheets.properties.title',
      })
    )
    return (
      res.data.sheets
        ?.map((s) => s.properties?.title ?? '')
        .filter(Boolean) ?? []
    )
  } catch (e) {
    console.error('[listarAbas]', e)
    return []
  }
}

// ── Google Sheets: ler dados ──────────────────────────────────────────────────

export async function buscarLinhasPlanilha(
  spreadsheet_id: string,
  aba: string,
  limiteLinhas?: number
): Promise<LinhasPlanilha> {
  if (!spreadsheet_id) return { headers: [], rows: [] }
  try {
    // Se aba não especificada, pega a primeira da planilha
    let tabName = aba
    if (!tabName) {
      const abas = await listarAbas(spreadsheet_id)
      tabName = abas[0] ?? ''
    }
    if (!tabName) return { headers: [], rows: [] }

    const range = limiteLinhas
      ? `${tabName}!A1:ZZ${limiteLinhas}`
      : `${tabName}!A:ZZ`

    const res = await withTimeout(
      sheetsAPI().spreadsheets.values.get({
        spreadsheetId: spreadsheet_id,
        range,
      })
    )
    const values = (res.data.values ?? []) as string[][]
    if (!values.length) return { headers: [], rows: [] }
    return { headers: values[0], rows: values.slice(1) }
  } catch (e) {
    console.error('[buscarLinhasPlanilha]', e)
    return { headers: [], rows: [] }
  }
}

// ── Detectar coluna identificadora ───────────────────────────────────────────
// Procura por palavras-chave no cabeçalho; fallback = coluna 0

const PALAVRAS_IDENT = [
  'email', 'usuário', 'usuario', 'operador',
  'login', 'user', 'agente', 'colaborador',
]

export function encontrarColunaIdent(headers: string[]): number {
  for (let i = 0; i < headers.length; i++) {
    const h = headers[i].toLowerCase().trim()
    if (PALAVRAS_IDENT.some((p) => h.includes(p))) return i
  }
  return 0 // fallback: primeira coluna (coluna A)
}

// ── Extrair data de atualização da planilha ───────────────────────────────────
// A coluna A tem emails/usernames dos operadores; após a última linha de operador
// existe uma célula com a data de atualização (primeiro valor não-email, não-vazio).

/**
 * Estrutura da coluna A (após o cabeçalho):
 *   - linhas de operadores: email (ex: sara.secundo@alloha.com)
 *   - célula com label:     "ATUALIZADO ATE:" (ou variações)
 *   - célula seguinte:      a data real (ex: 12/04/2026)
 */
export function extrairDataAtualizacao(rows: string[][]): string | null {
  for (let i = 0; i < rows.length; i++) {
    const val = (rows[i][0] ?? '').trim().toUpperCase()
    if (!val) continue
    // Detecta o label "ATUALIZADO ATE" (com ou sem acento, dois pontos, espaços)
    const ehLabel = val.replace(/[^A-Z]/g, '').includes('ATUALIZADOATE')
                 || val.includes('ATUALIZADO')
    if (ehLabel) {
      // Pega a próxima célula não-vazia da coluna A
      for (let j = i + 1; j < rows.length; j++) {
        const next = (rows[j][0] ?? '').trim()
        if (next) return next
      }
    }
  }
  return null
}

const MESES_PT = [
  'janeiro','fevereiro','março','abril','maio','junho',
  'julho','agosto','setembro','outubro','novembro','dezembro',
]

/** Converte "12/04/2026" ou "2026-04-12" para "12 de abril de 2026" */
export function formatarDataPtBR(raw: string): string {
  // DD/MM/YYYY
  const dmy = raw.match(/^(\d{1,2})\/(\d{1,2})\/(\d{4})$/)
  if (dmy) {
    const mes = parseInt(dmy[2], 10) - 1
    if (mes >= 0 && mes < 12)
      return `${parseInt(dmy[1], 10)} de ${MESES_PT[mes]} de ${dmy[3]}`
  }
  // YYYY-MM-DD
  const ymd = raw.match(/^(\d{4})-(\d{2})-(\d{2})/)
  if (ymd) {
    const mes = parseInt(ymd[2], 10) - 1
    if (mes >= 0 && mes < 12)
      return `${parseInt(ymd[3], 10)} de ${MESES_PT[mes]} de ${ymd[1]}`
  }
  // fallback: retorna como está
  return raw
}

const MESES_IDX: Record<string, string> = {
  janeiro:'01', fevereiro:'02', março:'03', marco:'03',
  abril:'04', maio:'05', junho:'06', julho:'07',
  agosto:'08', setembro:'09', outubro:'10',
  novembro:'11', dezembro:'12',
}

/** Versão curta: qualquer formato → DD/MM/YYYY */
export function formatarDataCurta(raw: string): string {
  const dmy = raw.match(/^(\d{1,2})\/(\d{1,2})\/(\d{4})$/)
  if (dmy) return `${dmy[1].padStart(2,'0')}/${dmy[2].padStart(2,'0')}/${dmy[3]}`
  const ymd = raw.match(/^(\d{4})-(\d{2})-(\d{2})/)
  if (ymd) return `${ymd[3]}/${ymd[2]}/${ymd[1]}`
  // "12 de abril de 2026" ou "12 de abril 2026"
  const ext = raw.trim().toLowerCase().match(/^(\d{1,2})\s+de\s+([a-zç]+)(?:\s+de)?\s+(\d{4})$/)
  if (ext) {
    const mes = MESES_IDX[ext[2]]
    if (mes) return `${ext[1].padStart(2,'0')}/${mes}/${ext[3]}`
  }
  return raw
}

// ── Match de célula com operador ─────────────────────────────────────────────
// Estratégia em camadas para lidar com divergências entre username do sistema
// e o email/nome real presente na planilha.

/**
 * Retorna true se `cellValue` identifica o operador descrito por `username` / `nomeCompleto`.
 *
 * Ordem de tentativas:
 *  1. Exact: parte antes do '@' === username
 *  2. First-token: primeiro segmento do email corresponde ao primeiro nome OU
 *     primeiro segmento do username  (cobre casos como "reyzo.miranda" vs "reyzo.deus")
 *  3. Full-name: célula contém o nome completo do operador
 *  4. First-two-words: célula começa com "PrimeiroNome Segundo" do nome completo
 */
export function matchCelulaOperador(
  cellValue: string,
  username: string,
  nomeCompleto: string
): boolean {
  const cell = cellValue.trim()
  if (!cell) return false

  const cellLow    = cell.toLowerCase()
  const beforeAt   = cellLow.split('@')[0].trim()
  const userLow    = username.trim().toLowerCase()

  // 1. Exact username match
  if (beforeAt === userLow) return true

  // 2. First-token match  (handles different last parts in email username)
  const cellFirst  = beforeAt.split(/[.\s_-]/)[0]
  const userFirst  = userLow.split('.')[0]
  const nameFirst  = nomeCompleto.trim().toLowerCase().split(' ')[0]
  if (cellFirst && cellFirst === userFirst)  return true
  if (cellFirst && cellFirst === nameFirst)  return true

  // 3. Full normalized name match
  const cellNorm = cellLow.replace(/\s+/g, ' ').trim()
  const nomeNorm = nomeCompleto.toLowerCase().replace(/\s+/g, ' ').trim()
  if (cellNorm === nomeNorm) return true

  // 4. First two words of nome match beginning of cell
  const nomeParts = nomeNorm.split(' ')
  if (nomeParts.length >= 2) {
    const firstTwo = `${nomeParts[0]} ${nomeParts[1]}`
    if (cellNorm.startsWith(firstTwo)) return true
  }

  return false
}

// ── Ler célula única ─────────────────────────────────────────────────────────

export async function lerCelula(
  spreadsheet_id: string,
  aba: string,
  celula: string
): Promise<string | null> {
  if (!spreadsheet_id) return null
  try {
    const res = await withTimeout(
      sheetsAPI().spreadsheets.values.get({
        spreadsheetId: spreadsheet_id,
        range: `'${aba}'!${celula}`,
      })
    )
    const val = (res.data.values?.[0]?.[0] ?? '').toString().trim()
    console.log(`[lerCelula] aba="${aba}" celula="${celula}" raw="${val}"`)
    return val || null
  } catch (e) {
    console.error('[lerCelula]', e)
    return null
  }
}

// ── Ler faixa de células (coluna única) ───────────────────────────────────────

export async function lerRangeCelulas(
  spreadsheet_id: string,
  aba: string,
  range: string
): Promise<string[]> {
  if (!spreadsheet_id) return []
  try {
    const res = await withTimeout(
      sheetsAPI().spreadsheets.values.get({
        spreadsheetId: spreadsheet_id,
        range: `'${aba}'!${range}`,
      })
    )
    return (res.data.values ?? []).flat().map((v) => (v ?? '').toString().trim())
  } catch (e) {
    console.error('[lerRangeCelulas]', e)
    return []
  }
}

// ── Buscar linha de um operador ───────────────────────────────────────────────

export async function buscarLinhaOperador(
  username: string,
  spreadsheet_id: string,
  aba: string,
  nomeCompleto = ''
): Promise<LinhaOperador | null> {
  const { headers, rows } = await buscarLinhasPlanilha(spreadsheet_id, aba)
  if (!headers.length) return null

  const col = encontrarColunaIdent(headers)

  const row = rows.find((r) =>
    matchCelulaOperador(r[col] ?? '', username, nomeCompleto)
  )

  return row ? { headers, row } : null
}
