'use server'

import { requireGestorAdminOuAux, requireGestorOuAdmin } from '@/lib/auth'
import { getPlanilhaAtiva } from '@/lib/sheets'
import { criarGLPI, atualizarGLPI, excluirGLPI, type GLPIDados } from '@/lib/glpi'
import { revalidatePath } from 'next/cache'

export async function criarGLPIAction(dados: GLPIDados): Promise<{ ok: boolean; erro?: string }> {
  try {
    await requireGestorAdminOuAux()
    const planilha = await getPlanilhaAtiva()
    if (!planilha) return { ok: false, erro: 'Nenhuma planilha ativa.' }
    await criarGLPI(planilha.spreadsheet_id, dados)
    revalidatePath('/painel/glpi')
    return { ok: true }
  } catch (e) {
    return { ok: false, erro: e instanceof Error ? e.message : 'Erro ao criar.' }
  }
}

export async function atualizarGLPIAction(
  rowIndex: number,
  dados: Partial<GLPIDados & { status: 'Em Andamento' | 'Finalizado' }>,
): Promise<{ ok: boolean; erro?: string }> {
  try {
    await requireGestorAdminOuAux()
    const planilha = await getPlanilhaAtiva()
    if (!planilha) return { ok: false, erro: 'Nenhuma planilha ativa.' }
    await atualizarGLPI(planilha.spreadsheet_id, rowIndex, dados)
    revalidatePath('/painel/glpi')
    return { ok: true }
  } catch (e) {
    return { ok: false, erro: e instanceof Error ? e.message : 'Erro ao atualizar.' }
  }
}

export async function finalizarGLPIAction(
  rowIndex: number,
  resposta: string,
  email: string,
  dataResolucao: string,
): Promise<{ ok: boolean; erro?: string }> {
  try {
    await requireGestorAdminOuAux()
    const planilha = await getPlanilhaAtiva()
    if (!planilha) return { ok: false, erro: 'Nenhuma planilha ativa.' }
    await atualizarGLPI(planilha.spreadsheet_id, rowIndex, {
      status: 'Finalizado',
      resposta,
      emailRespondente: email,
      dataResolucao,
    })
    revalidatePath('/painel/glpi')
    return { ok: true }
  } catch (e) {
    return { ok: false, erro: e instanceof Error ? e.message : 'Erro ao finalizar.' }
  }
}

export async function excluirGLPIAction(rowIndex: number): Promise<{ ok: boolean; erro?: string }> {
  try {
    await requireGestorOuAdmin()
    const planilha = await getPlanilhaAtiva()
    if (!planilha) return { ok: false, erro: 'Nenhuma planilha ativa.' }
    await excluirGLPI(planilha.spreadsheet_id, rowIndex)
    revalidatePath('/painel/glpi')
    return { ok: true }
  } catch (e) {
    return { ok: false, erro: e instanceof Error ? e.message : 'Erro ao excluir.' }
  }
}
