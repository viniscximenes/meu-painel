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
