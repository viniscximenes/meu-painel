'use server'

import { requireGestor } from '@/lib/auth'
import { getPlanilhaAtiva } from '@/lib/sheets'
import { criarMonitoria, atualizarMonitoria, deletarMonitoria } from '@/lib/monitoria'
import type { NovaMonitoriaInput, AtualizarMonitoriaInput } from '@/lib/monitoria-utils'
import { revalidatePath } from 'next/cache'

export async function criarMonitoriaAction(
  dados: NovaMonitoriaInput
): Promise<{ ok: boolean; erro?: string }> {
  try {
    await requireGestor()
    const planilha = await getPlanilhaAtiva()
    if (!planilha) return { ok: false, erro: 'Nenhuma planilha ativa configurada.' }
    await criarMonitoria(planilha.spreadsheet_id, dados)
    revalidatePath('/painel/monitoria')
    return { ok: true }
  } catch (e) {
    console.error('[criarMonitoriaAction]', e)
    return { ok: false, erro: e instanceof Error ? e.message : 'Erro ao criar monitoria.' }
  }
}

export async function atualizarMonitoriaAction(
  dados: AtualizarMonitoriaInput
): Promise<{ ok: boolean; erro?: string }> {
  try {
    await requireGestor()
    const planilha = await getPlanilhaAtiva()
    if (!planilha) return { ok: false, erro: 'Nenhuma planilha ativa configurada.' }
    await atualizarMonitoria(planilha.spreadsheet_id, dados)
    revalidatePath('/painel/monitoria')
    return { ok: true }
  } catch (e) {
    console.error('[atualizarMonitoriaAction]', e)
    return { ok: false, erro: e instanceof Error ? e.message : 'Erro ao atualizar monitoria.' }
  }
}

export async function deletarMonitoriaAction(
  sheetRowIndex: number
): Promise<{ ok: boolean; erro?: string }> {
  try {
    await requireGestor()
    const planilha = await getPlanilhaAtiva()
    if (!planilha) return { ok: false, erro: 'Nenhuma planilha ativa configurada.' }
    await deletarMonitoria(planilha.spreadsheet_id, sheetRowIndex)
    revalidatePath('/painel/monitoria')
    return { ok: true }
  } catch (e) {
    console.error('[deletarMonitoriaAction]', e)
    return { ok: false, erro: e instanceof Error ? e.message : 'Erro ao deletar monitoria.' }
  }
}
