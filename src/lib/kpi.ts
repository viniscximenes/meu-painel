// ── SERVIDOR APENAS ──────────────────────────────────────────────────────────
// Este arquivo importa createAdminClient (service role key). NUNCA importar em
// Client Components. Tipos e utilitários puros estão em @/lib/kpi-utils.

import { createAdminClient } from '@/lib/supabase/admin'

// Re-exporta tudo de kpi-utils para que imports de servidor continuem funcionando
export * from '@/lib/kpi-utils'

import type { Meta } from '@/lib/kpi-utils'

// ── Supabase: Metas ───────────────────────────────────────────────────────────

export async function getMetas(): Promise<Meta[]> {
  try {
    const db = createAdminClient()
    const { data, error } = await db
      .from('metas')
      .select('*')
      .order('ordem', { ascending: true })
      .order('label', { ascending: true })
    if (error) throw error
    return (data ?? []) as Meta[]
  } catch (e) {
    console.error('[getMetas]', e)
    return []
  }
}

export async function upsertMeta(
  meta: Omit<Meta, 'id' | 'created_at'> & { id?: string }
): Promise<void> {
  const db = createAdminClient()
  const { error } = await db
    .from('metas')
    .upsert({ ...meta, updated_at: new Date().toISOString() }, { onConflict: 'nome_coluna' })
  if (error) throw error
}

export async function deleteMeta(id: string): Promise<void> {
  const db = createAdminClient()
  const { error } = await db.from('metas').delete().eq('id', id)
  if (error) throw error
}

export async function salvarOrdemMetas(ordens: { id: string; ordem: number }[]): Promise<void> {
  const db = createAdminClient()
  await Promise.all(
    ordens.map(({ id, ordem }) => db.from('metas').update({ ordem }).eq('id', id))
  )
}

// ── Supabase: MetasOperadorConfig ─────────────────────────────────────────────

import type { MetaOperadorConfig, MetaGestorConfig } from '@/lib/kpi-utils'

export async function getMetasOperadorConfig(): Promise<Record<string, MetaOperadorConfig>> {
  try {
    const db = createAdminClient()
    const { data, error } = await db.from('metas_operador_config').select('*')
    if (error) throw error
    const out: Record<string, MetaOperadorConfig> = {}
    for (const row of data ?? []) out[row.kpi_key] = row as MetaOperadorConfig
    return out
  } catch (e) {
    console.error('[getMetasOperadorConfig]', e)
    return {}
  }
}

export async function upsertMetaOperadorConfig(config: MetaOperadorConfig): Promise<void> {
  const db = createAdminClient()
  const { error } = await db
    .from('metas_operador_config')
    .upsert({ ...config, atualizado_em: new Date().toISOString() }, { onConflict: 'kpi_key' })
  if (error) throw error
}

// ── Supabase: MetasGestorConfig ───────────────────────────────────────────────

export async function getMetasGestorConfig(): Promise<Record<string, MetaGestorConfig>> {
  try {
    const db = createAdminClient()
    const { data, error } = await db.from('metas_gestor_config').select('*')
    if (error) throw error
    const out: Record<string, MetaGestorConfig> = {}
    for (const row of data ?? []) out[row.kpi_key] = row as MetaGestorConfig
    return out
  } catch (e) {
    console.error('[getMetasGestorConfig]', e)
    return {}
  }
}

export async function upsertMetaGestorConfig(config: MetaGestorConfig): Promise<void> {
  const db = createAdminClient()
  const { error } = await db
    .from('metas_gestor_config')
    .upsert({ ...config, atualizado_em: new Date().toISOString() }, { onConflict: 'kpi_key' })
  if (error) throw error
}
