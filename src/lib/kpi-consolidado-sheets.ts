// SERVER ONLY — reads planilha KPI CONSOLIDADO via column mapping configurável
import { buscarLinhasPlanilha, matchCelulaOperador, extrairDataAtualizacao, getMapeamentoKpiColunas } from '@/lib/sheets'
import { parseTempoSeg } from '@/lib/diario-utils'
import { parsePctAbsoluto } from '@/lib/quartil-sheets'
import { OPERADORES_DISPLAY } from '@/lib/operadores'
import { extrairValor } from '@/lib/kpi-coluna-utils'

function parseIntSafe(raw: string | null | undefined): number | null {
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
  // 6 principais (null = KPI não mapeado ou célula vazia)
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
  const [{ rows }, mapeamento] = await Promise.all([
    buscarLinhasPlanilha(spreadsheet_id, aba),
    getMapeamentoKpiColunas(),
  ])
  const dataAtualizacao = extrairDataAtualizacao(rows)

  function ev(row: string[], key: string): string | null {
    return extrairValor(row, mapeamento, key)
  }

  const operadores: OperadorKpiRow[] = OPERADORES_DISPLAY.map(op => {
    // Coluna A (índice 0) é sempre o identificador do operador
    const row = rows.find(r => matchCelulaOperador((r[0] ?? '').trim(), op.username, op.nome))

    if (!row) {
      return {
        id: op.id, nome: op.nome, username: op.username, encontrado: false,
        pedidos: null, churn: null, txRetBrutaPct: null, tmaSeg: null, absPct: null, indispPct: null,
        varTicket: '—', txRetLiq15d: '—', atendidas: '—', transfer: '—', shortCall: '—',
        rechamadaD7: '—', txTabulacao: '—', csat: '—', engajamento: '—',
        tempoProjetado: '—', tempoLogin: '—', nr17: '—', pessoal: '—', outrasPausas: '—',
      }
    }

    const tmaRaw = ev(row, 'tma')
    const tmaSeg = tmaRaw ? parseTempoSeg(tmaRaw) : 0

    return {
      id: op.id, nome: op.nome, username: op.username, encontrado: true,
      pedidos:       parseIntSafe(ev(row, 'pedidos')),
      churn:         parseIntSafe(ev(row, 'churn')),
      txRetBrutaPct: parsePctAbsoluto(ev(row, 'tx_ret_bruta') ?? ''),
      tmaSeg:        tmaSeg > 0 ? tmaSeg : null,
      absPct:        parsePctAbsoluto(ev(row, 'abs') ?? ''),
      indispPct:     parsePctAbsoluto(ev(row, 'indisp') ?? ''),
      varTicket:     ev(row, 'var_ticket')      ?? '—',
      txRetLiq15d:   ev(row, 'tx_ret_liq_15d')  ?? '—',
      atendidas:     ev(row, 'atendidas')        ?? '—',
      transfer:      ev(row, 'transfer')         ?? '—',
      shortCall:     ev(row, 'short_call')       ?? '—',
      rechamadaD7:   ev(row, 'rechamada_d7')     ?? '—',
      txTabulacao:   ev(row, 'tx_tabulacao')     ?? '—',
      csat:          ev(row, 'csat')             ?? '—',
      engajamento:   ev(row, 'engajamento')      ?? '—',
      tempoProjetado: ev(row, 'tempo_projetado') ?? '—',
      tempoLogin:    ev(row, 'tempo_login')      ?? '—',
      nr17:          ev(row, 'nr17')             ?? '—',
      pessoal:       ev(row, 'pessoal')          ?? '—',
      outrasPausas:  ev(row, 'outras_pausas')    ?? '—',
    }
  })

  return { operadores, dataAtualizacao }
}
