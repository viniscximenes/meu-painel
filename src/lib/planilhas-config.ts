export type TipoPlanilha = 'mes_atual' | 'mes_passado' | 'kpi_quartil'

export const ABAS_ESPERADAS: Record<TipoPlanilha, string[]> = {
  mes_atual:   ['DIARIO DE BORDO', 'ABS', 'MONITORIA', 'GLPI'],
  mes_passado: ['DIARIO DE BORDO', 'ABS', 'MONITORIA', 'GLPI'],
  kpi_quartil: ['KPI CONSOLIDADO', 'QUARTIL', 'KPI GESTOR'],
}

/** Case-insensitive + trim match */
export function abaEncontrada(abasReais: string[], nomeAlvo: string): boolean {
  const alvo = nomeAlvo.trim().toLowerCase()
  return abasReais.some(a => a.trim().toLowerCase() === alvo)
}
