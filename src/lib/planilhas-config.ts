export type TipoPlanilha = 'mes_atual' | 'mes_passado' | 'kpi_quartil'

export const QUARTIL_SUB_ABAS = [
  'QUARTIL.TXRETENCAO',
  'QUARTIL.TMA',
  'QUARTIL.CHURN',
  'QUARTIL.ABS',
  'QUARTIL.INDISPONIBILIDADE',
] as const

export const ABAS_ESPERADAS: Record<TipoPlanilha, string[]> = {
  mes_atual:   ['DIARIO DE BORDO', 'ABS', 'MONITORIA', 'GLPI'],
  mes_passado: ['DIARIO DE BORDO', 'ABS', 'MONITORIA', 'GLPI'],
  kpi_quartil: ['KPI CONSOLIDADO', 'KPI GESTOR', ...QUARTIL_SUB_ABAS],
}

/** Case-insensitive + trim match */
export function abaEncontrada(abasReais: string[], nomeAlvo: string): boolean {
  const alvo = nomeAlvo.trim().toLowerCase()
  return abasReais.some(a => a.trim().toLowerCase() === alvo)
}
