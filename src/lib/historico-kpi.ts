// Servidor apenas — leitura de KPI de planilhas históricas
// Estrutura fixa: aba "KPI CONSOLIDADO", 12 colunas A-L

import { buscarLinhasPlanilha, matchCelulaOperador } from '@/lib/sheets'
import type { Planilha } from '@/lib/sheets'
import {
  formatPct,
  parseTMA, formatTMA,
  parseInt_, formatInt,
} from '@/lib/quartil-sheets'

// Parser de percentual para planilhas históricas.
// Nas abas KPI CONSOLIDADO todos os percentuais vêm com "%" (ex: "0.3%", "67.5%").
// NÃO multiplica por 100: "0.3%" → 0.3, não 30.
// Diferença intencional vs parsePct do quartil-sheets, que lida com decimais crus (0.685).
function parsePctHist(raw: string | undefined): number | null {
  if (!raw) return null
  const s = raw.toString().replace(/\s/g, '').replace(',', '.')
  if (s.startsWith('#') || s === '') return null
  const n = parseFloat(s.replace('%', ''))
  return isNaN(n) ? null : n
}

// ── Mapeamento de colunas (0-based) ──────────────────────────────────────────

const C_EMAIL         = 0
const C_PEDIDO        = 1
const C_CHURN         = 2
const C_TICKET        = 3
const C_TX_BRUTA      = 4
const C_TX_LIQUIDA    = 5
const C_TRANSFERENCIA = 6
const C_SHORT_CALL    = 7
const C_TMA           = 8
const C_RECHAMADA     = 9
const C_ABS           = 10
const C_INDISP        = 11

const MESES_PT = [
  'Janeiro','Fevereiro','Março','Abril','Maio','Junho',
  'Julho','Agosto','Setembro','Outubro','Novembro','Dezembro',
]

// ── Helpers de formatação ────────────────────────────────────────────────────

function fmtInt(raw: string | undefined): string {
  const n = parseInt_(raw)
  return n !== null ? formatInt(n) : '—'
}

function fmtPct(raw: string | undefined): string {
  const n = parsePctHist(raw)
  return n !== null ? formatPct(n) : '—'
}

function fmtTMA(raw: string | undefined): string {
  const secs = parseTMA(raw)
  return secs !== null ? formatTMA(secs) : '—'
}

// ── Tipos públicos ────────────────────────────────────────────────────────────

export interface KpiHistoricoItem {
  label: string
  valor: string
}

export interface KpiHistoricoMes {
  mes:            number
  ano:            number
  mesLabel:       string
  planilhaNome:   string
  encontrado:     boolean
  emAndamento:    boolean
  principais:     KpiHistoricoItem[]
  complementares: KpiHistoricoItem[]
}

// ── Leitura ───────────────────────────────────────────────────────────────────

export async function lerKpiHistoricoPlanilha(
  planilha: Planilha,
  username: string,
  nomeCompleto: string,
): Promise<KpiHistoricoMes> {
  const mes      = planilha.referencia_mes!
  const ano      = planilha.referencia_ano!
  const mesLabel = `${MESES_PT[mes - 1].toUpperCase()} ${ano}`
  const base = { mes, ano, mesLabel, planilhaNome: planilha.nome, emAndamento: false }

  try {
    const aba = planilha.aba || 'KPI CONSOLIDADO'
    const { rows } = await buscarLinhasPlanilha(planilha.spreadsheet_id, aba, 300)

    if (!rows.length) {
      return { ...base, encontrado: false, principais: [], complementares: [] }
    }

    const meuRow = rows.find(r => matchCelulaOperador(r[C_EMAIL] ?? '', username, nomeCompleto))
    if (!meuRow) {
      return { ...base, encontrado: false, principais: [], complementares: [] }
    }

    const principais: KpiHistoricoItem[] = [
      { label: 'Pedido',            valor: fmtInt(meuRow[C_PEDIDO])         },
      { label: 'Churn',             valor: fmtInt(meuRow[C_CHURN])          },
      { label: 'Tx. Retenção',      valor: fmtPct(meuRow[C_TX_BRUTA])       },
      { label: 'TMA',               valor: fmtTMA(meuRow[C_TMA])            },
      { label: 'ABS',               valor: fmtPct(meuRow[C_ABS])            },
      { label: 'Indisponibilidade', valor: fmtPct(meuRow[C_INDISP])         },
    ]

    const complementares: KpiHistoricoItem[] = [
      { label: 'Ticket',           valor: fmtPct(meuRow[C_TICKET])        },
      { label: 'Tx. Ret. Líquida', valor: fmtPct(meuRow[C_TX_LIQUIDA])    },
      { label: 'Transferência',    valor: fmtPct(meuRow[C_TRANSFERENCIA]) },
      { label: 'Short Call',       valor: fmtPct(meuRow[C_SHORT_CALL])    },
      { label: 'Rechamada',        valor: fmtPct(meuRow[C_RECHAMADA])     },
    ].filter(c => c.valor !== '—')

    return { ...base, encontrado: true, principais, complementares }
  } catch (e) {
    console.error(`[lerKpiHistoricoPlanilha:${planilha.nome}]`, e)
    return { ...base, encontrado: false, principais: [], complementares: [] }
  }
}
