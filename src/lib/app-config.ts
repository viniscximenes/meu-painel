import { createAdminClient } from '@/lib/supabase/admin'

// Usa a tabela rv_config (chave/valor) para configurações gerais do app.

export async function getAppConfig(chave: string): Promise<string | null> {
  try {
    const db = createAdminClient()
    const { data } = await db
      .from('rv_config')
      .select('valor')
      .eq('chave', chave)
      .single()
    return data?.valor ?? null
  } catch {
    return null
  }
}

export async function setAppConfig(chave: string, valor: string): Promise<void> {
  const db = createAdminClient()
  await db
    .from('rv_config')
    .upsert({ chave, valor, updated_at: new Date().toISOString() }, { onConflict: 'chave' })
}
