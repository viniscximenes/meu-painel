// SERVER ONLY — reads planilha KPI GESTOR via column mapping configurável
import { buscarLinhasPlanilha, getMapeamentoKpiGestorColunas, extrairDataAtualizacao } from '@/lib/sheets'
import { parseTempoSeg } from '@/lib/diario-utils'
import { extrairValor } from '@/lib/kpi-coluna-utils'

function parseNum(raw: string): number {
  const clean = raw.replace(/[%\s]/g, '').replace(',', '.')
  const n = parseFloat(clean)
  return isNaN(n) ? 0 : n
}

function parsePct(raw: string | null | undefined): number | null {
  if (!raw || raw === '—') return null
  const n = parseNum(raw)
  if (isNaN(n)) return null
  return n > 0 && n < 2 ? n * 100 : n
}

function parseIntSafe(raw: string | null | undefined): number | null {
  if (!raw || raw === '—') return null
  const noDecimal = raw.includes(',') ? raw.split(',')[0] : raw
  const clean = noDecimal.replace(/[^\d]/g, '')
  const n = parseInt(clean, 10)
  return isNaN(n) ? null : n
}

export interface KpiGestorData {
  supervisor:     string
  pedidos:        number | null
  churn:          number | null
  txRetBrutaPct:  number | null
  tmaSeg:         number | null
  tmaRaw:         string | null
  absPct:         number | null
  indispPct:      number | null
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

export async function lerKpiGestor(spreadsheet_id: string, aba: string): Promise<KpiGestorData | null> {
  const [{ rows }, mapeamento] = await Promise.all([
    buscarLinhasPlanilha(spreadsheet_id, aba, 50),
    getMapeamentoKpiGestorColunas(),
  ])
  if (!rows.length) return null

  const dados = rows[0]
  const dataReferencia = extrairDataAtualizacao(rows)

  function ev(key: string): string | null {
    return extrairValor(dados, mapeamento, key)
  }

  const tmaRaw = ev('tma')
  const tmaSeg = tmaRaw ? parseTempoSeg(tmaRaw) : null

  return {
    supervisor:     (dados[0] ?? '').trim(),
    pedidos:        parseIntSafe(ev('pedidos')),
    churn:          parseIntSafe(ev('churn')),
    txRetBrutaPct:  parsePct(ev('tx_ret_bruta')),
    tmaSeg:         tmaSeg && tmaSeg > 0 ? tmaSeg : null,
    tmaRaw,
    absPct:         parsePct(ev('abs')),
    indispPct:      parsePct(ev('indisp')),
    varTicket:      ev('var_ticket')      ?? '—',
    txRetLiq15d:    ev('tx_ret_liq_15d')  ?? '—',
    atendidas:      ev('atendidas')        ?? '—',
    transfer:       ev('transfer')         ?? '—',
    shortCall:      ev('short_call')       ?? '—',
    rechamadaD7:    ev('rechamada_d7')     ?? '—',
    txTabulacao:    ev('tx_tabulacao')     ?? '—',
    csat:           ev('csat')             ?? '—',
    engajamento:    ev('engajamento')      ?? '—',
    tempoProjetado: ev('tempo_projetado')  ?? '—',
    tempoLogin:     ev('tempo_login')      ?? '—',
    nr17:           ev('nr17')             ?? '—',
    pessoal:        ev('pessoal')          ?? '—',
    outrasPausas:   ev('outras_pausas')    ?? '—',
    dataReferencia,
  }
}
