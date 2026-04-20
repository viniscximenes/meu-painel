'use server'

import { requireAdmin } from '@/lib/auth'
import { upsertMeta, deleteMeta, salvarOrdemMetas, type Meta } from '@/lib/kpi'
import { revalidatePath } from 'next/cache'

export async function salvarMeta(formData: FormData) {
  await requireAdmin()

  const meta: Omit<Meta, 'id'> & { id?: string } = {
    id:             formData.get('id') as string || undefined,
    nome_coluna:    (formData.get('nome_coluna') as string).trim(),
    label:          (formData.get('label') as string).trim(),
    valor_meta:     parseFloat(formData.get('valor_meta') as string) || 0,
    tipo:           (formData.get('tipo') as 'maior_melhor' | 'menor_melhor'),
    amarelo_inicio: parseFloat(formData.get('amarelo_inicio') as string) || 0,
    verde_inicio:   parseFloat(formData.get('verde_inicio') as string) || 0,
    unidade:        (formData.get('unidade') as string) || 'numero',
    basico:         formData.get('basico') === 'true',
    ordem:          parseInt(formData.get('ordem') as string) || 0,
    icone:          (formData.get('icone') as string) || 'BarChart2',
    descricao:      (formData.get('descricao') as string) || '',
  }

  await upsertMeta(meta)

  revalidatePath('/painel/metas')
  revalidatePath('/painel/kpi')
  revalidatePath('/painel/kpis-equipe')
}

export async function excluirMeta(id: string) {
  await requireAdmin()
  await deleteMeta(id)
  revalidatePath('/painel/metas')
  revalidatePath('/painel/kpi')
  revalidatePath('/painel/kpis-equipe')
}

export async function reordenarMetas(ordens: { id: string; ordem: number }[]) {
  await requireAdmin()
  await salvarOrdemMetas(ordens)
  revalidatePath('/painel/kpi', 'layout')
  revalidatePath('/painel/kpis-equipe')
  revalidatePath('/painel/metas')
}
