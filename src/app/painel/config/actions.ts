'use server'

import { requireGestor } from '@/lib/auth'
import { addPlanilha, ativarPlanilha, deletarPlanilha, atualizarPlanilha } from '@/lib/sheets'
import { setAppConfig } from '@/lib/app-config'
import { revalidatePath } from 'next/cache'

export async function adicionarPlanilha(formData: FormData) {
  await requireGestor()
  const nome           = (formData.get('nome') as string).trim()
  const spreadsheet_id = (formData.get('spreadsheet_id') as string).trim()
  const aba            = (formData.get('aba') as string).trim()
  if (!nome || !spreadsheet_id) throw new Error('Nome e ID são obrigatórios')
  await addPlanilha(nome, spreadsheet_id, aba)
  revalidatePath('/painel/config')
}

export async function definirPlanilhaAtiva(formData: FormData) {
  await requireGestor()
  const id = (formData.get('id') as string).trim()
  if (!id) throw new Error('ID inválido')
  await ativarPlanilha(id)
  revalidatePath('/painel')
  revalidatePath('/painel/config')
  revalidatePath('/painel/kpi', 'layout')
  revalidatePath('/painel/kpis-equipe')
  revalidatePath('/painel/metas')
}

export async function removerPlanilha(formData: FormData) {
  await requireGestor()
  const id = (formData.get('id') as string).trim()
  if (!id) throw new Error('ID inválido')
  await deletarPlanilha(id)
  revalidatePath('/painel/config')
}

export async function editarPlanilha(formData: FormData) {
  await requireGestor()
  const id             = (formData.get('id') as string).trim()
  const nome           = (formData.get('nome') as string).trim()
  const spreadsheet_id = (formData.get('spreadsheet_id') as string).trim()
  const aba            = (formData.get('aba') as string).trim()
  if (!id || !nome || !spreadsheet_id) throw new Error('Campos obrigatórios ausentes')
  await atualizarPlanilha(id, { nome, spreadsheet_id, aba })
  revalidatePath('/painel/config')
}

export async function salvarKPIConsolidadoConfig(limiteLinhas: number): Promise<void> {
  await requireGestor()
  const valor = Math.max(10, Math.min(500, limiteLinhas))
  await setAppConfig('kpi_consolidado_limite_linhas', String(valor))
  revalidatePath('/painel/config')
  revalidatePath('/painel/kpis-equipe')
}
