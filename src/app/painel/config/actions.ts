'use server'

import { requireGestor } from '@/lib/auth'
import { addPlanilha, ativarPlanilha, deletarPlanilha, atualizarPlanilha } from '@/lib/sheets'
import { getNomesFantasia, upsertNomeFantasia } from '@/lib/snapshots'
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

export async function copiarNomesDoMesAnteriorAction(mesAtual: string): Promise<
  | { ok: true; copiados: number; nomes: Record<number, string> }
  | { ok: false; erro: string }
> {
  try {
    await requireGestor()
    const [y, m] = mesAtual.split('-').map(Number)
    const prev   = new Date(y, m - 2, 1)
    const mesPrev = `${prev.getFullYear()}-${String(prev.getMonth() + 1).padStart(2, '0')}`

    const nomesPrev = await getNomesFantasia(mesPrev)
    if (!nomesPrev.length) return { ok: false, erro: `Nenhum nome encontrado em ${mesPrev}.` }

    await Promise.all(
      nomesPrev.map((n) =>
        upsertNomeFantasia(Number(n.operador_id), mesAtual, n.nome_fantasia)
      )
    )

    const nomes: Record<number, string> = {}
    nomesPrev.forEach((n) => { nomes[Number(n.operador_id)] = n.nome_fantasia })

    revalidatePath('/painel/config')
    revalidatePath('/painel/semanal')
    return { ok: true, copiados: nomesPrev.length, nomes }
  } catch (e) {
    console.error('[copiarNomesDoMesAnteriorAction]', e)
    return { ok: false, erro: 'Erro ao copiar nomes.' }
  }
}
