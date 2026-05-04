// Utilitários compartilhados para extração de colunas de KPI por letra de coluna.
// Importado por: /painel/meu-kpi/page.tsx, kpi-consolidado-sheets.ts

import type { MetaOperadorConfig } from '@/lib/kpi-utils'

/** Converte letra(s) de coluna para índice 0-based. Ex: 'A'→0, 'Z'→25, 'AA'→26, 'AR'→43 */
export function letraColunaParaIndice(letra: string): number {
  return letra.toUpperCase().trim().split('').reduce((acc, c) => acc * 26 + (c.charCodeAt(0) - 64), 0) - 1
}

/**
 * Lê a meta individual de cada KPI configurado como coluna_individual.
 * Retorna um mapa { kpiKey → valorNumérico } com os valores encontrados na row.
 */
export function buildMetasIndividuais(
  row: string[],
  opConfigs: Record<string, MetaOperadorConfig>,
): Record<string, number> {
  const out: Record<string, number> = {}

  console.log('[buildMetasIndividuais] opConfigs keys:', Object.keys(opConfigs))

  for (const [kpiKey, config] of Object.entries(opConfigs)) {
    if (config.modo === 'coluna_individual' && config.coluna_meta) {
      const idx = letraColunaParaIndice(config.coluna_meta)
      const rawCell = idx >= 0 && idx < row.length ? row[idx] : '(fora do range)'
      const raw = idx >= 0 && idx < row.length
        ? (row[idx] ?? '').replace(',', '.').replace(/[^\d.]/g, '').trim()
        : ''
      const num = parseFloat(raw)
      const adicionou = !isNaN(num) && num > 0

      console.log(`[buildMetasIndividuais:${kpiKey}]`, {
        operador: row[0],
        coluna_meta: config.coluna_meta,
        idx,
        valorBruto: rawCell,
        valorParsed: isNaN(num) ? 'NaN' : num,
        adicionadoAoMapa: adicionou,
      })

      if (adicionou) out[kpiKey] = num
    } else {
      console.log(`[buildMetasIndividuais:${kpiKey}]`, {
        modo: config.modo,
        coluna_meta: config.coluna_meta ?? '(null)',
        ignorado: true,
      })
    }
  }
  return out
}

/**
 * Lê o valor bruto de uma célula usando o mapeamento de colunas configurado pelo admin.
 * Retorna null se: KPI não mapeado, índice fora do range, ou célula vazia.
 */
export function extrairValor(
  row: string[],
  mapeamento: Record<string, string>,
  kpiKey: string,
): string | null {
  const letra = mapeamento[kpiKey]
  if (!letra) return null
  const idx = letraColunaParaIndice(letra)
  if (idx < 0 || idx >= row.length) return null
  const v = (row[idx] ?? '').trim()
  return v || null
}
