'use server'

import { requireGestor } from '@/lib/auth'
import { upsertNomeFantasia } from '@/lib/snapshots'

export async function atualizarNomeFantasiaAction(
  operador_id: number,
  mes_referencia: string,
  nome_fantasia: string
): Promise<{ ok: true } | { ok: false; erro: string }> {
  try {
    await requireGestor()
    const nome = nome_fantasia.trim()
    if (!nome || nome.length < 2) return { ok: false, erro: 'Nome deve ter ao menos 2 caracteres.' }
    if (nome.length > 40)         return { ok: false, erro: 'Nome muito longo (máx. 40 caracteres).' }
    await upsertNomeFantasia(operador_id, mes_referencia, nome)
    return { ok: true }
  } catch (e) {
    console.error('[atualizarNomeFantasiaAction]', e)
    return { ok: false, erro: 'Erro ao salvar nome fantasia.' }
  }
}
