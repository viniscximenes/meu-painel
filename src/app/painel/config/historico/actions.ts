'use server'

import { requireAdmin } from '@/lib/auth'
import { associarReferencia } from '@/lib/sheets'
import { revalidatePath } from 'next/cache'

export async function salvarReferenciaAction(
  id: string,
  mes: number | null,
  ano: number | null,
): Promise<{ ok: boolean; error?: string }> {
  try {
    await requireAdmin()
    if (mes !== null && (mes < 1 || mes > 12)) return { ok: false, error: 'Mês inválido' }
    if (ano !== null && (ano < 2020 || ano > 2100)) return { ok: false, error: 'Ano inválido' }
    await associarReferencia(id, mes, ano)
    revalidatePath('/painel/config/historico')
    return { ok: true }
  } catch (e) {
    return { ok: false, error: e instanceof Error ? e.message : 'Erro desconhecido' }
  }
}
