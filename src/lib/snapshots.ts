// ── SERVIDOR APENAS ──────────────────────────────────────────────────────────
// Importa createAdminClient. NUNCA importar em Client Components.

import { createAdminClient } from '@/lib/supabase/admin'

// ── Tipos ─────────────────────────────────────────────────────────────────────

export interface KpiSnapshot {
  id: string
  data_ref: string                        // 'YYYY-MM-DD'
  operador_id: number
  dados: Record<string, number>           // { [nome_coluna]: valor_numerico }
  created_at: string
}

export interface NomeFantasia {
  id: string
  operador_id: number
  mes_referencia: string                  // 'YYYY-MM'
  nome_fantasia: string
  created_at: string
}

// ── Snapshots ─────────────────────────────────────────────────────────────────

/** Retorna as N datas mais recentes que têm ao menos um snapshot. */
export async function getSnapshotsDatasRecentes(limit = 2): Promise<string[]> {
  try {
    const db = createAdminClient()
    const { data } = await db
      .from('kpi_snapshots')
      .select('data_ref')
      .order('data_ref', { ascending: false })
    if (!data?.length) return []
    const unicas = [...new Set(data.map((r) => r.data_ref as string))]
    return unicas.slice(0, limit)
  } catch {
    return []
  }
}

/** Retorna todos os snapshots para as datas informadas. */
export async function getSnapshotsByDatas(datas: string[]): Promise<KpiSnapshot[]> {
  if (!datas.length) return []
  try {
    const db = createAdminClient()
    const { data } = await db
      .from('kpi_snapshots')
      .select('*')
      .in('data_ref', datas)
    return (data ?? []) as KpiSnapshot[]
  } catch {
    return []
  }
}

/** Verifica se já existe snapshot para uma data específica. */
export async function existeSnapshotParaData(data_ref: string): Promise<boolean> {
  try {
    const db = createAdminClient()
    const { count } = await db
      .from('kpi_snapshots')
      .select('id', { count: 'exact', head: true })
      .eq('data_ref', data_ref)
    return (count ?? 0) > 0
  } catch {
    return false
  }
}

/** Insere ou atualiza snapshot. */
export async function upsertSnapshot(
  data_ref: string,
  operador_id: number,
  dados: Record<string, number>
): Promise<void> {
  const db = createAdminClient()
  await db.from('kpi_snapshots').upsert(
    { data_ref, operador_id, dados },
    { onConflict: 'operador_id,data_ref' }
  )
}

// ── Nomes Fantasia ─────────────────────────────────────────────────────────────

/** Retorna todos os nomes fantasia do mês. */
export async function getNomesFantasia(mes_referencia: string): Promise<NomeFantasia[]> {
  try {
    const db = createAdminClient()
    const { data } = await db
      .from('nomes_fantasia')
      .select('*')
      .eq('mes_referencia', mes_referencia)
    return (data ?? []) as NomeFantasia[]
  } catch {
    return []
  }
}

/** Retorna todos os snapshots de um operador, ordenados por data asc. */
export async function getSnapshotsByOperador(operador_id: number): Promise<KpiSnapshot[]> {
  try {
    const db = createAdminClient()
    const { data } = await db
      .from('kpi_snapshots')
      .select('*')
      .eq('operador_id', operador_id)
      .order('data_ref', { ascending: true })
    return (data ?? []) as KpiSnapshot[]
  } catch {
    return []
  }
}

/** Deleta todos os snapshots de uma data. Retorna a contagem deletada. */
export async function deletarSnapshot(data_ref: string): Promise<number> {
  const db = createAdminClient()
  const { count } = await db
    .from('kpi_snapshots')
    .delete({ count: 'exact' })
    .eq('data_ref', data_ref)
  return count ?? 0
}

/** Insere ou atualiza nome fantasia. */
export async function upsertNomeFantasia(
  operador_id: number,
  mes_referencia: string,
  nome_fantasia: string
): Promise<void> {
  const db = createAdminClient()
  await db.from('nomes_fantasia').upsert(
    { operador_id, mes_referencia, nome_fantasia },
    { onConflict: 'operador_id,mes_referencia' }
  )
}
