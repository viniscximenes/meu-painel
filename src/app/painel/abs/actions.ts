'use server'

import { requireGestor } from '@/lib/auth'
import { getPlanilhaAtiva } from '@/lib/sheets'
import { inicializarAbaABS, atualizarCelulaABS } from '@/lib/abs-sheets'
import type { ABSStatus } from '@/lib/abs-utils'
import { OPERADORES_DISPLAY } from '@/lib/operadores'
import { revalidatePath } from 'next/cache'

export async function inicializarABSAction(mes: number, ano: number): Promise<{ ok: boolean; erro?: string }> {
  try {
    await requireGestor()
    const planilha = await getPlanilhaAtiva()
    if (!planilha) return { ok: false, erro: 'Nenhuma planilha ativa.' }
    const usernames = OPERADORES_DISPLAY.map((op) => op.username)
    await inicializarAbaABS(planilha.spreadsheet_id, usernames, mes, ano)
    revalidatePath('/painel/abs')
    return { ok: true }
  } catch (e) {
    return { ok: false, erro: e instanceof Error ? e.message : 'Erro ao inicializar.' }
  }
}

export async function atualizarStatusABSAction(
  rowIndex: number,
  colIndex: number,
  status: ABSStatus,
): Promise<{ ok: boolean; erro?: string }> {
  try {
    await requireGestor()
    const planilha = await getPlanilhaAtiva()
    if (!planilha) return { ok: false, erro: 'Nenhuma planilha ativa.' }
    await atualizarCelulaABS(planilha.spreadsheet_id, rowIndex, colIndex, status)
    revalidatePath('/painel/abs')
    return { ok: true }
  } catch (e) {
    return { ok: false, erro: e instanceof Error ? e.message : 'Erro ao salvar.' }
  }
}
