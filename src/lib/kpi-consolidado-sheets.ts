// SERVER ONLY — reads planilha.aba (KPI CONSOLIDADO, 44 colunas A-AR)
import { buscarLinhasPlanilha, matchCelulaOperador, extrairDataAtualizacao } from '@/lib/sheets'
import { parseTempoSeg } from '@/lib/diario-utils'
import { parsePctAbsoluto } from '@/lib/quartil-sheets'
import { OPERADORES_DISPLAY } from '@/lib/operadores'

// Mapeamento posicional confirmado pelo owner (índice 0-based, A=0 … AR=43)
const COL = {
  colaborador:     0,   // A
  pedidos:         4,   // E
  churn:           8,   // I
  variacaoTicket:  13,  // N
  txRetencao:      17,  // R — Tx. Retenção Bruta (%)
  txRetLiq15d:     19,  // T — Tx. Retenção Líquida 15d (%)
  atendidas:       21,  // V
  transferPct:     23,  // X — Transfer (%)
  shortCallPct:    24,  // Y
  tma:             25,  // Z
  rechamadaD7Pct:  27,  // AB
  tabulacaoPct:    28,  // AC
  csat:            29,  // AD
  engajamento:     31,  // AF
  tempoProjetado:  32,  // AG
  tempoLogin:      33,  // AH
  abs:             35,  // AJ — ABS (%)
  nr17Pct:         36,  // AK
  pessoalPct:      40,  // AO — Pessoal (%), não a quantidade AN
  outrasPausasPct: 42,  // AQ — Outras Pausas (%), não a quantidade AP
  indisp:          43,  // AR — Indisp Total (%)
} as const

// Todos os percentuais em KPI CONSOLIDADO são armazenados em escala absoluta
// (ex: "67.5%" = 67.5%, "1.4%" = 1.4%). Reusar parsePctAbsoluto de quartil-sheets.ts
// que NÃO multiplica por 100 — idêntica regra de historico-kpi.ts.

function cell(row: string[], col: number): string {
  return (row[col] ?? '').trim()
}

function parseIntSafe(raw: string): number | null {
  if (!raw || raw === '—') return null
  const noDecimal = raw.includes(',') ? raw.split(',')[0] : raw
  const clean = noDecimal.replace(/[^\d]/g, '')
  const n = parseInt(clean, 10)
  return isNaN(n) ? null : n
}

export interface OperadorKpiRow {
  id:       number
  nome:     string
  username: string
  encontrado: boolean
  // 6 principais (null = sem dados)
  pedidos:       number | null
  churn:         number | null
  txRetBrutaPct: number | null
  tmaSeg:        number | null
  absPct:        number | null
  indispPct:     number | null
  // 14 complementares (string raw para exibição, '—' = sem dados)
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
}

export interface KpiConsolidadoData {
  operadores:      OperadorKpiRow[]
  dataAtualizacao: string | null
}

export async function lerKpiConsolidado(
  spreadsheet_id: string,
  aba: string,
): Promise<KpiConsolidadoData> {
  const { headers, rows } = await buscarLinhasPlanilha(spreadsheet_id, aba)
  const dataAtualizacao = extrairDataAtualizacao(rows)

  // ── AUDIT LOG — remover após validação pelo owner ──────────────────────────
  console.log('[AUDIT KPI CONSOLIDADO] aba:', aba)
  console.log('[AUDIT KPI CONSOLIDADO] headers completos:', headers)
  console.log('[AUDIT KPI CONSOLIDADO] total colunas header:', headers.length)
  console.log('[AUDIT KPI CONSOLIDADO] total rows de dados:', rows.length)

  if (rows.length > 0) {
    const r = rows[0]
    console.log('[AUDIT KPI CONSOLIDADO]', {
      operador: r[0],
      linha_completa: r,
      total_colunas: r.length,
    })
    console.log('[AUDIT KPI CONSOLIDADO] crus dos campos mapeados:', {
      pedidos:         r[COL.pedidos],
      churn:           r[COL.churn],
      variacaoTicket:  r[COL.variacaoTicket],
      txRetencao:      r[COL.txRetencao],
      txRetLiq15d:     r[COL.txRetLiq15d],
      atendidas:       r[COL.atendidas],
      transferPct:     r[COL.transferPct],
      shortCallPct:    r[COL.shortCallPct],
      tma:             r[COL.tma],
      rechamadaD7Pct:  r[COL.rechamadaD7Pct],
      tabulacaoPct:    r[COL.tabulacaoPct],
      csat:            r[COL.csat],
      engajamento:     r[COL.engajamento],
      tempoProjetado:  r[COL.tempoProjetado],
      tempoLogin:      r[COL.tempoLogin],
      abs:             r[COL.abs],
      nr17Pct:         r[COL.nr17Pct],
      pessoalPct:      r[COL.pessoalPct],
      outrasPausasPct: r[COL.outrasPausasPct],
      indisp:          r[COL.indisp],
    })
    console.log('[AUDIT KPI CONSOLIDADO] pós-parse (parsePctAbsoluto):', {
      txRetencao: parsePctAbsoluto(r[COL.txRetencao]),
      abs:        parsePctAbsoluto(r[COL.abs]),
      indisp:     parsePctAbsoluto(r[COL.indisp]),
    })
  }
  // ── fim AUDIT LOG ──────────────────────────────────────────────────────────

  const operadores: OperadorKpiRow[] = OPERADORES_DISPLAY.map(op => {
    const row = rows.find(r =>
      matchCelulaOperador(r[COL.colaborador] ?? '', op.username, op.nome)
    )

    if (!row) {
      console.log('[AUDIT KPI CONSOLIDADO] não encontrado:', op.username)
      return {
        id: op.id, nome: op.nome, username: op.username, encontrado: false,
        pedidos: null, churn: null, txRetBrutaPct: null, tmaSeg: null, absPct: null, indispPct: null,
        varTicket: '—', txRetLiq15d: '—', atendidas: '—', transfer: '—', shortCall: '—',
        rechamadaD7: '—', txTabulacao: '—', csat: '—', engajamento: '—',
        tempoProjetado: '—', tempoLogin: '—', nr17: '—', pessoal: '—', outrasPausas: '—',
      }
    }

    const tmaRaw = cell(row, COL.tma)
    const tmaSeg = parseTempoSeg(tmaRaw)

    return {
      id: op.id, nome: op.nome, username: op.username, encontrado: true,
      pedidos:       parseIntSafe(cell(row, COL.pedidos)),
      churn:         parseIntSafe(cell(row, COL.churn)),
      txRetBrutaPct: parsePctAbsoluto(cell(row, COL.txRetencao)),
      tmaSeg:        tmaSeg > 0 ? tmaSeg : null,
      absPct:        parsePctAbsoluto(cell(row, COL.abs)),
      indispPct:     parsePctAbsoluto(cell(row, COL.indisp)),
      varTicket:      cell(row, COL.variacaoTicket)  || '—',
      txRetLiq15d:    cell(row, COL.txRetLiq15d)     || '—',
      atendidas:      cell(row, COL.atendidas)       || '—',
      transfer:       cell(row, COL.transferPct)     || '—',
      shortCall:      cell(row, COL.shortCallPct)    || '—',
      rechamadaD7:    cell(row, COL.rechamadaD7Pct)  || '—',
      txTabulacao:    cell(row, COL.tabulacaoPct)    || '—',
      csat:           cell(row, COL.csat)            || '—',
      engajamento:    cell(row, COL.engajamento)     || '—',
      tempoProjetado: cell(row, COL.tempoProjetado)  || '—',
      tempoLogin:     cell(row, COL.tempoLogin)      || '—',
      nr17:           cell(row, COL.nr17Pct)         || '—',
      pessoal:        cell(row, COL.pessoalPct)      || '—',
      outrasPausas:   cell(row, COL.outrasPausasPct) || '—',
    }
  })

  const encontrados = operadores.filter(o => o.encontrado).length
  console.log('[AUDIT KPI CONSOLIDADO] matching:', encontrados, '/', operadores.length, 'encontrados')

  return { operadores, dataAtualizacao }
}
