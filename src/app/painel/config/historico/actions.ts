'use server'

import { requireAdmin } from '@/lib/auth'
import { associarReferencia, cadastrarPlanilhaHistorica } from '@/lib/sheets'
import { extrairSpreadsheetId } from '@/lib/planilha-utils'
import { revalidatePath } from 'next/cache'

export async function salvarReferenciaAction(
  id: string,
  mes: number | null,
  ano: number | null,
): Promise<{ ok: boolean; error?: string }> {
  try {
    await requireAdmin()
    if (mes !== null && (mes < 1 || mes > 12)) return { ok: false, error: 'Mês inválido' }
    if (ano !== null && (ano < 2020 || ano > 2100)) return { ok: false, error: 'Ano inválido' }
    await associarReferencia(id, mes, ano)
    revalidatePath('/painel/config/historico')
    return { ok: true }
  } catch (e) {
    return { ok: false, error: e instanceof Error ? e.message : 'Erro desconhecido' }
  }
}

export async function cadastrarPlanilhaHistoricaAction(
  nome: string,
  spreadsheetIdOuUrl: string,
  mes: number,
  ano: number,
): Promise<{ ok: boolean; error?: string }> {
  try {
    await requireAdmin()

    const nomeTrim = (nome ?? '').trim()
    if (!nomeTrim) return { ok: false, error: 'Informe o nome da planilha.' }

    if (!Number.isInteger(mes) || mes < 1 || mes > 12) {
      return { ok: false, error: 'Mês inválido (use 1 a 12).' }
    }
    if (!Number.isInteger(ano) || ano < 2020 || ano > 2100) {
      return { ok: false, error: 'Ano inválido (use 2020 a 2100).' }
    }

    const spreadsheet_id = extrairSpreadsheetId(spreadsheetIdOuUrl ?? '')
    if (!spreadsheet_id) {
      return { ok: false, error: 'ID ou URL inválida. Cole o ID da planilha ou a URL completa do Google Sheets.' }
    }

    const res = await cadastrarPlanilhaHistorica(nomeTrim, spreadsheet_id, mes, ano)
    if (!res.ok) return { ok: false, error: res.error ?? 'Erro ao cadastrar.' }

    revalidatePath('/painel/config/historico')
    return { ok: true }
  } catch (e) {
    return { ok: false, error: e instanceof Error ? e.message : 'Erro desconhecido' }
  }
}
