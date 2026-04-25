// SERVER ONLY — importa sheets.ts (Google Sheets API)
import { buscarLinhasPlanilha } from '@/lib/sheets'
import { parseTempoSeg } from '@/lib/diario-utils'

// Column positions (0-indexed): A=0, B=1, ..., Z=25, AA=26, ..., AG=32
const C = {
  SUPERVISOR:       0,
  PEDIDOS:          1,
  CHURN:            2,
  META_CHURN:       3,
  SALDO_CHURN:      4,
  DELTA_CHURN:      5,
  VAR_TICKET:       6,
  RETIDO_BRUTO:     7,
  RETIDO_LIQ_7D:    8,
  RETIDO_LIQ_15D:   9,
  TX_RET_BRUTA:    10,
  TX_RET_LIQ_7D:   11,
  TX_RET_LIQ_15D:  12,
  D1:              13,
  ATENDIDAS:       14,
  TRANSFER:        15,
  SHORT_CALL:      16,
  TMA:             17,
  RECHAMADA_D1:    18,
  RECHAMADA_D7:    19,
  TX_TABULACAO:    20,
  CSAT:            21,
  CSAT_0:          22,
  ENGAJAMENTO:     23,
  TEMPO_PROJETADO: 24,
  TEMPO_LOGIN:     25,
  ABS:             26,
  NR17:            27,
  QTS_PRE_PAUSA:   28,
  PRE_PAUSA:       29,
  PESSOAL:         30,
  OUTRAS_PAUSAS:   31,
  INDISP:          32,
} as const

export interface KpiGestorData {
  supervisor:     string
  pedidos:        number
  churn:          number
  txRetBrutaPct:  number
  tmaSeg:         number
  tmaRaw:         string
  absPct:         number
  indispPct:      number
  // complementares
  varTicket:      string
  txRetLiq15d:    string
  atendidas:      string
  transfer:       string
  shortCall:      string
  rechamadaD7:    string
  txTabulacao:    string
  csat:           string
  engajamento:    string
  tempoProjetado: string
  tempoLogin:     string
  nr17:           string
  pessoal:        string
  outrasPausas:   string
  dataReferencia: string | null
}

function cell(row: string[], col: number): string {
  return (row[col] ?? '').trim()
}

function parseNum(raw: string): number {
  const clean = raw.replace(/[%\s]/g, '').replace(',', '.')
  const n = parseFloat(clean)
  return isNaN(n) ? 0 : n
}

// Handles percentage stored as fraction (0.612) or absolute (61.2)
function parsePct(raw: string): number {
  const n = parseNum(raw)
  return n > 0 && n < 2 ? n * 100 : n
}

function parseIntSafe(raw: string): number {
  // Handle pt-BR thousands separator (dot) and decimal comma
  const noDecimal = raw.includes(',') ? raw.split(',')[0] : raw
  const clean = noDecimal.replace(/[^\d]/g, '')
  const n = parseInt(clean, 10)
  return isNaN(n) ? 0 : n
}

export async function lerKpiGestor(spreadsheet_id: string): Promise<KpiGestorData | null> {
  const { rows } = await buscarLinhasPlanilha(spreadsheet_id, 'KPI GESTOR', 10)
  if (!rows.length) return null

  const dados = rows[0]                        // Row 2 = gestor data
  const dataReferencia = rows[2]?.[0]?.trim() || null  // A4

  const tmaRaw = cell(dados, C.TMA)
  const tmaSeg = parseTempoSeg(tmaRaw)

  // Temporary log — remove after confirming percentage format
  console.log('[KPI GESTOR] TMA raw:', tmaRaw, '→', tmaSeg, 's')
  console.log('[KPI GESTOR] Tx.Ret Bruta raw:', cell(dados, C.TX_RET_BRUTA))
  console.log('[KPI GESTOR] ABS raw:', cell(dados, C.ABS))
  console.log('[KPI GESTOR] INDISP raw:', cell(dados, C.INDISP))
  console.log('[KPI GESTOR] Churn raw:', cell(dados, C.CHURN))
  console.log('[KPI GESTOR] Pedidos raw:', cell(dados, C.PEDIDOS))
  console.log('[KPI GESTOR] Data ref:', dataReferencia)

  return {
    supervisor:     cell(dados, C.SUPERVISOR),
    pedidos:        parseIntSafe(cell(dados, C.PEDIDOS)),
    churn:          parseIntSafe(cell(dados, C.CHURN)),
    txRetBrutaPct:  parsePct(cell(dados, C.TX_RET_BRUTA)),
    tmaSeg,
    tmaRaw,
    absPct:         parsePct(cell(dados, C.ABS)),
    indispPct:      parsePct(cell(dados, C.INDISP)),
    varTicket:      cell(dados, C.VAR_TICKET),
    txRetLiq15d:    cell(dados, C.TX_RET_LIQ_15D),
    atendidas:      cell(dados, C.ATENDIDAS),
    transfer:       cell(dados, C.TRANSFER),
    shortCall:      cell(dados, C.SHORT_CALL),
    rechamadaD7:    cell(dados, C.RECHAMADA_D7),
    txTabulacao:    cell(dados, C.TX_TABULACAO),
    csat:           cell(dados, C.CSAT),
    engajamento:    cell(dados, C.ENGAJAMENTO),
    tempoProjetado: cell(dados, C.TEMPO_PROJETADO),
    tempoLogin:     cell(dados, C.TEMPO_LOGIN),
    nr17:           cell(dados, C.NR17),
    pessoal:        cell(dados, C.PESSOAL),
    outrasPausas:   cell(dados, C.OUTRAS_PAUSAS),
    dataReferencia,
  }
}
