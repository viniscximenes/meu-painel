'use server'

import { requireAdmin } from '@/lib/auth'
import { upsertMeta, deleteMeta, salvarOrdemMetas, upsertMetaOperadorConfig, upsertMetaGestorConfig, type Meta } from '@/lib/kpi'
import { revalidatePath } from 'next/cache'

export async function salvarMeta(formData: FormData): Promise<{ ok: boolean; erro?: string }> {
  try {
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

    if (!meta.nome_coluna) return { ok: false, erro: 'Selecione um KPI.' }

    await upsertMeta(meta)

    revalidatePath('/painel/metas')
    revalidatePath('/painel/kpi')
    revalidatePath('/painel/kpis-equipe')
    return { ok: true }
  } catch (e) {
    return { ok: false, erro: e instanceof Error ? e.message : 'Erro ao salvar meta.' }
  }
}

export async function excluirMeta(id: string): Promise<{ ok: boolean; erro?: string }> {
  try {
    await requireAdmin()
    await deleteMeta(id)
    revalidatePath('/painel/metas')
    revalidatePath('/painel/kpi')
    revalidatePath('/painel/kpis-equipe')
    return { ok: true }
  } catch (e) {
    return { ok: false, erro: e instanceof Error ? e.message : 'Erro ao excluir meta.' }
  }
}

export async function reordenarMetas(ordens: { id: string; ordem: number }[]): Promise<{ ok: boolean; erro?: string }> {
  try {
    await requireAdmin()
    await salvarOrdemMetas(ordens)
    revalidatePath('/painel/kpi', 'layout')
    revalidatePath('/painel/kpis-equipe')
    revalidatePath('/painel/metas')
    return { ok: true }
  } catch (e) {
    return { ok: false, erro: e instanceof Error ? e.message : 'Erro ao reordenar metas.' }
  }
}

const VALID_KPI_KEYS        = ['tx_ret_bruta', 'abs', 'indisp', 'tma', 'pedidos', 'churn'] as const
const VALID_GESTOR_KPI_KEYS = ['tx_ret_bruta', 'abs', 'indisp', 'tma', 'churn'] as const

export async function salvarMetaOperadorAction(
  kpiKey: string,
  config: {
    modo: 'limiar_global' | 'coluna_individual'
    verde_op?: string | null
    verde_valor?: number | null
    amarelo_op?: string | null
    amarelo_valor?: number | null
    coluna_meta?: string | null
  },
): Promise<{ ok: boolean; erro?: string }> {
  try {
    await requireAdmin()

    if (!VALID_KPI_KEYS.includes(kpiKey as typeof VALID_KPI_KEYS[number]))
      return { ok: false, erro: 'kpi_key inválido.' }

    if (config.modo === 'limiar_global') {
      if (config.verde_valor == null || config.verde_valor <= 0)
        return { ok: false, erro: 'Informe um valor verde válido (> 0).' }
      if (config.amarelo_valor != null && config.verde_op === '>=' && config.amarelo_valor >= config.verde_valor)
        return { ok: false, erro: 'Valor amarelo deve ser menor que o verde.' }
      if (config.amarelo_valor != null && config.verde_op === '<=' && config.amarelo_valor <= config.verde_valor)
        return { ok: false, erro: 'Valor amarelo deve ser maior que o verde.' }
    }

    if (config.modo === 'coluna_individual') {
      const col = (config.coluna_meta ?? '').trim().toUpperCase()
      if (!/^[A-Z]{1,3}$/.test(col))
        return { ok: false, erro: 'Informe uma letra de coluna válida (ex: F).' }
      config = { ...config, coluna_meta: col }
    }

    await upsertMetaOperadorConfig({
      kpi_key: kpiKey,
      modo: config.modo,
      verde_op:     config.verde_op    ?? null,
      verde_valor:  config.verde_valor ?? null,
      amarelo_op:   config.amarelo_op  ?? null,
      amarelo_valor: config.amarelo_valor ?? null,
      coluna_meta:  config.modo === 'coluna_individual' ? (config.coluna_meta ?? null) : null,
    })

    revalidatePath('/painel/metas')
    revalidatePath('/painel/kpi')
    revalidatePath('/painel/kpis-equipe')
    revalidatePath('/painel/meu-kpi')
    return { ok: true }
  } catch (e) {
    return { ok: false, erro: e instanceof Error ? e.message : 'Erro ao salvar configuração.' }
  }
}

export async function salvarMetaGestorAction(
  kpiKey: string,
  config: {
    modo: 'limiar_global' | 'coluna_individual'
    verde_op?: string | null
    verde_valor?: number | null
    amarelo_op?: string | null
    amarelo_valor?: number | null
    coluna_meta?: string | null
  },
): Promise<{ ok: boolean; erro?: string }> {
  try {
    await requireAdmin()

    if (!VALID_GESTOR_KPI_KEYS.includes(kpiKey as typeof VALID_GESTOR_KPI_KEYS[number]))
      return { ok: false, erro: 'kpi_key inválido.' }

    if (config.modo === 'limiar_global') {
      if (config.verde_valor == null || config.verde_valor <= 0)
        return { ok: false, erro: 'Informe um valor verde válido (> 0).' }
      if (config.amarelo_valor != null && config.verde_op === '>=' && config.amarelo_valor >= config.verde_valor)
        return { ok: false, erro: 'Valor amarelo deve ser menor que o verde.' }
      if (config.amarelo_valor != null && config.verde_op === '<=' && config.amarelo_valor <= config.verde_valor)
        return { ok: false, erro: 'Valor amarelo deve ser maior que o verde.' }
    }

    if (config.modo === 'coluna_individual') {
      const col = (config.coluna_meta ?? '').trim().toUpperCase()
      if (!/^[A-Z]{1,3}$/.test(col))
        return { ok: false, erro: 'Informe uma letra de coluna válida (ex: K).' }
      config = { ...config, coluna_meta: col }
    }

    await upsertMetaGestorConfig({
      kpi_key:      kpiKey,
      modo:         config.modo,
      verde_op:     config.verde_op    ?? null,
      verde_valor:  config.verde_valor ?? null,
      amarelo_op:   config.amarelo_op  ?? null,
      amarelo_valor: config.amarelo_valor ?? null,
      coluna_meta:  config.modo === 'coluna_individual' ? (config.coluna_meta ?? null) : null,
    })

    revalidatePath('/painel/metas')
    revalidatePath('/painel/gestor/meu-kpi')
    revalidatePath('/painel/gestor')
    return { ok: true }
  } catch (e) {
    return { ok: false, erro: e instanceof Error ? e.message : 'Erro ao salvar configuração do gestor.' }
  }
}
