// ── SERVIDOR APENAS ──────────────────────────────────────────────────────────
// Este arquivo importa createAdminClient. NUNCA importar em Client Components.
// Tipos e utilitários puros estão em @/lib/rv-gestor-utils.

import { createAdminClient } from '@/lib/supabase/admin'

export * from '@/lib/rv-gestor-utils'
import { RV_GESTOR_DEFAULTS, parseRVGestorConfig, type RVGestorConfigRaw, type RVGestorConfig } from '@/lib/rv-gestor-utils'

export async function getRVGestorConfigRaw(): Promise<RVGestorConfigRaw> {
  try {
    const db = createAdminClient()
    const { data } = await db.from('rv_config').select('chave, valor').like('chave', 'gestor_%')
    const map: RVGestorConfigRaw = { ...RV_GESTOR_DEFAULTS }
    for (const row of data ?? []) map[row.chave] = row.valor
    return map
  } catch {
    return { ...RV_GESTOR_DEFAULTS }
  }
}

export async function getRVGestorConfig(): Promise<RVGestorConfig> {
  return parseRVGestorConfig(await getRVGestorConfigRaw())
}

export async function salvarRVGestorConfig(dados: Record<string, string>): Promise<void> {
  const db = createAdminClient()
  const rows = Object.entries(dados).map(([chave, valor]) => ({
    chave, valor, updated_at: new Date().toISOString(),
  }))
  await db.from('rv_config').upsert(rows, { onConflict: 'chave' })
}
