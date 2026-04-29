'use server'

import { revalidatePath } from 'next/cache'
import { requireAdmin } from '@/lib/auth'
import {
  verificarAcessoPlanilha,
  salvarPlanilhaPorTipo,
  apagarPlanilhaPorTipo,
  listarAbas,
  salvarMapeamentoKpiColunasDb,
  salvarMapeamentoKpiGestorColunasDb,
} from '@/lib/sheets'
import { KPIS_TODOS } from '@/lib/kpis-config'
import type { TipoPlanilha } from '@/lib/planilhas-config'

function extrairSpreadsheetId(raw: string): string | null {
  const trimmed = raw.trim()
  const match = trimmed.match(/\/spreadsheets\/d\/([a-zA-Z0-9_-]+)/)
  if (match) return match[1]
  if (/^[a-zA-Z0-9_-]{20,}$/.test(trimmed)) return trimmed
  return null
}

function nomeDefault(tipo: TipoPlanilha): string {
  if (tipo === 'mes_atual')   return 'Planilha Mês Atual'
  if (tipo === 'mes_passado') return 'Planilha Mês Passado'
  return 'Planilha KPI & Quartil'
}

export async function salvarPlanilhaOperacaoAction(
  tipo: TipoPlanilha,
  rawInput: string,
  nome?: string,
): Promise<{ ok: boolean; error?: string }> {
  try { await requireAdmin() } catch { return { ok: false, error: 'Acesso negado.' } }

  const spreadsheet_id = extrairSpreadsheetId(rawInput)
  if (!spreadsheet_id) {
    return { ok: false, error: 'ID ou URL inválida. Cole o ID da planilha ou a URL completa do Google Sheets.' }
  }

  const acessivel = await verificarAcessoPlanilha(spreadsheet_id)
  if (!acessivel) {
    return { ok: false, error: 'Planilha não acessível. Verifique se a conta de serviço tem permissão de leitura.' }
  }

  const abas = await listarAbas(spreadsheet_id)
  const aba = abas[0] ?? ''
  console.log('[salvarAction] tipo=%s id=%s aba=%s abas=%j', tipo, spreadsheet_id, aba, abas)

  const nomeUsado = (nome ?? '').trim() || nomeDefault(tipo)

  try {
    await salvarPlanilhaPorTipo(tipo, spreadsheet_id, aba, nomeUsado)
  } catch (e) {
    const msg = e instanceof Error ? e.message : String(e)
    console.error('[salvarAction] falha ao persistir:', msg)
    return { ok: false, error: msg }
  }

  revalidatePath('/painel/admin/configuracoes/planilhas')
  revalidatePath('/painel/diario')
  revalidatePath('/painel/abs')
  revalidatePath('/painel/monitoria')
  revalidatePath('/painel/meu-kpi')
  revalidatePath('/painel/gestor/kpi-equipe')
  revalidatePath('/painel/meu-rv')
  revalidatePath('/painel/gestor/meu-rv')
  revalidatePath('/painel')

  return { ok: true }
}

export async function apagarPlanilhaOperacaoAction(
  tipo: TipoPlanilha,
): Promise<{ ok: boolean; error?: string }> {
  try { await requireAdmin() } catch { return { ok: false, error: 'Acesso negado.' } }

  await apagarPlanilhaPorTipo(tipo)

  revalidatePath('/painel/admin/configuracoes/planilhas')
  revalidatePath('/painel')

  return { ok: true }
}

export async function salvarMapeamentoKpiColunasAction(
  mapeamento: Record<string, string>,
): Promise<{ ok: boolean; error?: string }> {
  try { await requireAdmin() } catch { return { ok: false, error: 'Acesso negado.' } }

  const keysValidas = new Set(KPIS_TODOS.map(k => k.key))
  const colunaValida = /^[A-Z]{1,3}$/

  for (const [key, coluna] of Object.entries(mapeamento)) {
    if (!keysValidas.has(key as never)) {
      return { ok: false, error: `KPI inválido: "${key}"` }
    }
    if (coluna.trim() !== '' && !colunaValida.test(coluna.trim().toUpperCase())) {
      return { ok: false, error: `Coluna inválida para "${key}": "${coluna}". Use apenas letras (A-Z).` }
    }
  }

  try {
    await salvarMapeamentoKpiColunasDb(mapeamento)
  } catch (e) {
    const msg = e instanceof Error ? e.message : String(e)
    console.error('[salvarMapeamentoAction]', msg)
    return { ok: false, error: msg }
  }

  revalidatePath('/painel/admin/configuracoes/planilhas')
  revalidatePath('/painel/meu-kpi')
  revalidatePath('/painel/gestor/kpi-equipe')
  revalidatePath('/painel/meu-rv')
  revalidatePath('/painel/gestor/meu-rv')

  return { ok: true }
}

export async function salvarMapeamentoKpiGestorColunasAction(
  mapeamento: Record<string, string>,
): Promise<{ ok: boolean; error?: string }> {
  try { await requireAdmin() } catch { return { ok: false, error: 'Acesso negado.' } }

  const keysValidas = new Set(KPIS_TODOS.map(k => k.key))
  const colunaValida = /^[A-Z]{1,3}$/

  for (const [key, coluna] of Object.entries(mapeamento)) {
    if (!keysValidas.has(key as never)) {
      return { ok: false, error: `KPI inválido: "${key}"` }
    }
    if (coluna.trim() !== '' && !colunaValida.test(coluna.trim().toUpperCase())) {
      return { ok: false, error: `Coluna inválida para "${key}": "${coluna}". Use apenas letras (A-Z).` }
    }
  }

  try {
    await salvarMapeamentoKpiGestorColunasDb(mapeamento)
  } catch (e) {
    const msg = e instanceof Error ? e.message : String(e)
    console.error('[salvarMapeamentoKpiGestorAction]', msg)
    return { ok: false, error: msg }
  }

  revalidatePath('/painel/admin/configuracoes/planilhas')
  revalidatePath('/painel/gestor/meu-kpi')
  revalidatePath('/painel/gestor/meu-rv')

  return { ok: true }
}
