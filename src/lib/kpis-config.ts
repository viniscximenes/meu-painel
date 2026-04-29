// ── Tipos ─────────────────────────────────────────────────────────────────────

export type KpiKey =
  | 'pedidos' | 'churn' | 'tx_ret_bruta' | 'tma' | 'abs' | 'indisp'
  | 'var_ticket' | 'tx_ret_liq_15d'
  | 'atendidas' | 'transfer' | 'short_call' | 'rechamada_d7' | 'tx_tabulacao' | 'csat' | 'engajamento'
  | 'nr17' | 'pessoal' | 'outras_pausas'
  | 'tempo_projetado' | 'tempo_login'

export type KpiCategoria = 'principal' | 'ganhos_retencao' | 'qualidade' | 'pausas' | 'presenca'

export interface KpiDef {
  key: KpiKey
  label: string
  categoria: KpiCategoria
}

// ── Definições canônicas ───────────────────────────────────────────────────────

export const KPIS_PRINCIPAIS: KpiDef[] = [
  { key: 'pedidos',     label: 'PEDIDOS',           categoria: 'principal' },
  { key: 'churn',       label: 'CHURN',             categoria: 'principal' },
  { key: 'tx_ret_bruta',label: 'TX. RETENÇÃO',      categoria: 'principal' },
  { key: 'tma',         label: 'TMA',               categoria: 'principal' },
  { key: 'abs',         label: 'ABS',               categoria: 'principal' },
  { key: 'indisp',      label: 'INDISPONIBILIDADE', categoria: 'principal' },
]

export const KPIS_SECUNDARIOS: KpiDef[] = [
  // Ganhos & Retenção
  { key: 'var_ticket',     label: '% VARIAÇÃO TICKET',        categoria: 'ganhos_retencao' },
  { key: 'tx_ret_liq_15d', label: 'TX. RETENÇÃO LÍQUIDA 15D', categoria: 'ganhos_retencao' },
  // Qualidade do Atendimento
  { key: 'atendidas',    label: 'ATENDIDAS',        categoria: 'qualidade' },
  { key: 'transfer',     label: 'TRANSFER (%)',      categoria: 'qualidade' },
  { key: 'short_call',   label: 'SHORT CALL (%)',   categoria: 'qualidade' },
  { key: 'rechamada_d7', label: 'RECHAMADA D+7 (%)',categoria: 'qualidade' },
  { key: 'tx_tabulacao', label: 'TX. TABULAÇÃO (%)',categoria: 'qualidade' },
  { key: 'csat',         label: 'CSAT',             categoria: 'qualidade' },
  { key: 'engajamento',  label: 'ENGAJAMENTO',      categoria: 'qualidade' },
  // Comportamento e Pausas
  { key: 'nr17',         label: 'NR17 (%)',         categoria: 'pausas' },
  { key: 'pessoal',      label: 'PESSOAL (%)',      categoria: 'pausas' },
  { key: 'outras_pausas',label: 'OUTRAS PAUSAS (%)',categoria: 'pausas' },
  // Presença
  { key: 'tempo_projetado', label: 'TEMPO PROJETADO', categoria: 'presenca' },
  { key: 'tempo_login',     label: 'TEMPO DE LOGIN',  categoria: 'presenca' },
]

export const KPIS_TODOS: KpiDef[] = [...KPIS_PRINCIPAIS, ...KPIS_SECUNDARIOS]

/** Coluna técnica fixa — não configurável pelo admin, não entra em KPIS_TODOS. */
export const COLUNA_EMAIL_OPERADOR = 'A'

/** Coluna A da aba KPI GESTOR — identificador do supervisor. Não configurável. */
export const COLUNA_SUPERVISOR_GESTOR = 'A'

export const CATEGORIA_LABEL: Record<KpiCategoria, string> = {
  principal:       'PRINCIPAL',
  ganhos_retencao: 'GANHOS & RETENÇÃO',
  qualidade:       'QUALIDADE DO ATENDIMENTO',
  pausas:          'COMPORTAMENTO E PAUSAS',
  presenca:        'PRESENÇA',
}
