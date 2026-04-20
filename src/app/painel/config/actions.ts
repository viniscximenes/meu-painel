'use server'

import { requireAdmin, getProfile } from '@/lib/auth'
import { addPlanilha, ativarPlanilha, deletarPlanilha, atualizarPlanilha } from '@/lib/sheets'
import { setAppConfig } from '@/lib/app-config'
import { criarLink, excluirLink, atualizarLink } from '@/lib/links'
import { criarMascara, atualizarMascara, excluirMascara } from '@/lib/mascaras'
import { revalidatePath } from 'next/cache'

export async function adicionarPlanilha(formData: FormData) {
  await requireAdmin()
  const nome           = (formData.get('nome') as string).trim()
  const spreadsheet_id = (formData.get('spreadsheet_id') as string).trim()
  const aba            = (formData.get('aba') as string).trim()
  const ativar         = formData.get('ativar') === 'true'
  if (!nome || !spreadsheet_id) throw new Error('Nome e ID são obrigatórios')
  const id = await addPlanilha(nome, spreadsheet_id, aba)
  if (ativar) await ativarPlanilha(id)
  revalidatePath('/painel/config')
}

export async function definirPlanilhaAtiva(formData: FormData) {
  await requireAdmin()
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
  await requireAdmin()
  const id = (formData.get('id') as string).trim()
  if (!id) throw new Error('ID inválido')
  await deletarPlanilha(id)
  revalidatePath('/painel/config')
}

export async function editarPlanilha(formData: FormData) {
  await requireAdmin()
  const id             = (formData.get('id') as string).trim()
  const nome           = (formData.get('nome') as string).trim()
  const spreadsheet_id = (formData.get('spreadsheet_id') as string).trim()
  const aba            = (formData.get('aba') as string).trim()
  if (!id || !nome || !spreadsheet_id) throw new Error('Campos obrigatórios ausentes')
  await atualizarPlanilha(id, { nome, spreadsheet_id, aba })
  revalidatePath('/painel/config')
}

export async function salvarKPIConsolidadoConfig(limiteLinhas: number): Promise<void> {
  await requireAdmin()
  const valor = Math.max(10, Math.min(500, limiteLinhas))
  await setAppConfig('kpi_consolidado_limite_linhas', String(valor))
  revalidatePath('/painel/config')
  revalidatePath('/painel/kpis-equipe')
}

export async function adicionarLinkUtil(formData: FormData) {
  await getProfile()
  const nome      = (formData.get('nome') as string).trim()
  const url       = (formData.get('url') as string).trim()
  const descricao = (formData.get('descricao') as string | null)?.trim() || undefined
  const categoria = (formData.get('categoria') as string).trim()
  const ordem     = parseInt((formData.get('ordem') as string) || '0', 10)
  if (!nome || !url || !categoria) throw new Error('Nome, URL e categoria são obrigatórios')
  await criarLink({ nome, url, descricao, categoria, ordem })
  revalidatePath('/painel/config')
  revalidatePath('/painel/links')
}

export async function excluirLinkUtil(formData: FormData) {
  await getProfile()
  const id = (formData.get('id') as string).trim()
  if (!id) throw new Error('ID inválido')
  await excluirLink(id)
  revalidatePath('/painel/config')
  revalidatePath('/painel/links')
}

export async function editarLinkUtil(formData: FormData) {
  await getProfile()
  const id        = (formData.get('id') as string).trim()
  const nome      = (formData.get('nome') as string).trim()
  const url       = (formData.get('url') as string).trim()
  const descricao = (formData.get('descricao') as string | null)?.trim() || null
  const categoria = (formData.get('categoria') as string).trim()
  if (!id || !nome || !url || !categoria) throw new Error('Campos obrigatórios ausentes')
  await atualizarLink(id, { nome, url, descricao, categoria })
  revalidatePath('/painel/config')
  revalidatePath('/painel/links')
}

export async function criarMascaraAction(formData: FormData) {
  await requireAdmin()
  const segmento   = (formData.get('segmento') as string).trim()
  const fila       = (formData.get('fila') as string).trim()
  const sla        = (formData.get('sla') as string).trim()
  const utilizacao = (formData.get('utilizacao') as string).trim()
  const mascara    = (formData.get('mascara') as string).trim()
  const ordem      = parseInt((formData.get('ordem') as string) || '0', 10)
  if (!fila || !mascara) throw new Error('Fila e máscara são obrigatórios')
  await criarMascara({ segmento, fila, sla, utilizacao, mascara, ordem })
  revalidatePath('/painel/config')
  revalidatePath('/painel/mascaras')
}

export async function editarMascaraAction(formData: FormData) {
  await requireAdmin()
  const id         = (formData.get('id') as string).trim()
  const segmento   = (formData.get('segmento') as string).trim()
  const fila       = (formData.get('fila') as string).trim()
  const sla        = (formData.get('sla') as string).trim()
  const utilizacao = (formData.get('utilizacao') as string).trim()
  const mascara    = (formData.get('mascara') as string).trim()
  const ordem      = parseInt((formData.get('ordem') as string) || '0', 10)
  if (!id || !fila || !mascara) throw new Error('Campos obrigatórios ausentes')
  await atualizarMascara(id, { segmento, fila, sla, utilizacao, mascara, ordem })
  revalidatePath('/painel/config')
  revalidatePath('/painel/mascaras')
}

export async function excluirMascaraAction(formData: FormData) {
  await requireAdmin()
  const id = (formData.get('id') as string).trim()
  if (!id) throw new Error('ID inválido')
  await excluirMascara(id)
  revalidatePath('/painel/config')
  revalidatePath('/painel/mascaras')
}
