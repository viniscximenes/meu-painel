'use server'

import { requireGestorAdminOuAux, requireGestorOuAdmin } from '@/lib/auth'
import { getPlanilhaAtiva } from '@/lib/sheets'
import { escreverRegistro, deletarRegistro, editarRegistro, type NovoRegistroInput, type EditarRegistroInput } from '@/lib/diario'
import { revalidatePath } from 'next/cache'

export async function salvarRegistroDiarioAction(dados: NovoRegistroInput): Promise<{ ok: boolean; erro?: string }> {
  try {
    const profile = await requireGestorAdminOuAux()
    const planilha = await getPlanilhaAtiva()
    if (!planilha) return { ok: false, erro: 'Nenhuma planilha ativa configurada.' }
    await escreverRegistro(planilha.spreadsheet_id, dados, profile.username)
    revalidatePath('/painel/diario')
    revalidatePath('/painel/diario/[username]', 'page')
    return { ok: true }
  } catch (e) {
    console.error('[salvarRegistroDiarioAction]', e)
    return { ok: false, erro: e instanceof Error ? e.message : 'Erro ao salvar registro.' }
  }
}

export async function editarRegistroDiarioAction(
  sheetRowIndex: number,
  dados: EditarRegistroInput,
): Promise<{ ok: boolean; erro?: string }> {
  try {
    await requireGestorOuAdmin()
    const planilha = await getPlanilhaAtiva()
    if (!planilha) return { ok: false, erro: 'Nenhuma planilha ativa configurada.' }
    await editarRegistro(planilha.spreadsheet_id, sheetRowIndex, dados)
    revalidatePath('/painel/diario')
    revalidatePath('/painel/diario/[username]', 'page')
    return { ok: true }
  } catch (e) {
    console.error('[editarRegistroDiarioAction]', e)
    return { ok: false, erro: e instanceof Error ? e.message : 'Erro ao editar registro.' }
  }
}

export async function deletarRegistroDiarioAction(sheetRowIndex: number): Promise<{ ok: boolean; erro?: string }> {
  try {
    await requireGestorOuAdmin()
    const planilha = await getPlanilhaAtiva()
    if (!planilha) return { ok: false, erro: 'Nenhuma planilha ativa configurada.' }
    await deletarRegistro(planilha.spreadsheet_id, sheetRowIndex)
    revalidatePath('/painel/diario')
    revalidatePath('/painel/diario/[username]', 'page')
    return { ok: true }
  } catch (e) {
    console.error('[deletarRegistroDiarioAction]', e)
    return { ok: false, erro: e instanceof Error ? e.message : 'Erro ao apagar registro.' }
  }
}
