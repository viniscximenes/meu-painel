'use server'

import { revalidatePath } from 'next/cache'
import { requireGestor } from '@/lib/auth'
import { getMetas } from '@/lib/kpi'
import {
  getPlanilhaAtiva,
  buscarLinhasPlanilha,
  encontrarColunaIdent,
  matchCelulaOperador,
} from '@/lib/sheets'
import { upsertNomeFantasia, upsertSnapshot } from '@/lib/snapshots'
import { OPERADORES_DISPLAY } from '@/lib/operadores'
import { normalizarChave } from '@/lib/kpi-utils'

export async function atualizarNomeFantasiaAction(
  operador_id: number,
  mes_referencia: string,
  nome_fantasia: string
): Promise<{ ok: true } | { ok: false; erro: string }> {
  try {
    await requireGestor()
    const nome = nome_fantasia.trim()
    if (!nome || nome.length < 2) return { ok: false, erro: 'Nome deve ter ao menos 2 caracteres.' }
    if (nome.length > 40)         return { ok: false, erro: 'Nome muito longo (máx. 40 caracteres).' }
    await upsertNomeFantasia(operador_id, mes_referencia, nome)
    return { ok: true }
  } catch (e) {
    console.error('[atualizarNomeFantasiaAction]', e)
    return { ok: false, erro: 'Erro ao salvar nome fantasia.' }
  }
}

export async function salvarSnapshotHojeAction(): Promise<
  { ok: true; data: string; salvos: number } | { ok: false; erro: string }
> {
  try {
    await requireGestor()

    const dataRef = new Date().toISOString().slice(0, 10)

    const planilha = await getPlanilhaAtiva()
    if (!planilha) return { ok: false, erro: 'Nenhuma planilha ativa configurada.' }

    const [metas, { headers, rows }] = await Promise.all([
      getMetas(),
      buscarLinhasPlanilha(planilha.spreadsheet_id, planilha.aba),
    ])

    if (!headers.length) return { ok: false, erro: 'Planilha sem dados.' }

    const col      = encontrarColunaIdent(headers)
    const metaMap  = new Map(metas.map((m) => [normalizarChave(m.nome_coluna), m]))

    const results = await Promise.all(
      OPERADORES_DISPLAY.map(async (op) => {
        const row = rows.find((r) =>
          matchCelulaOperador(r[col] ?? '', op.username, op.nome)
        )
        if (!row) return false

        const dados: Record<string, number> = {}
        headers.forEach((header, idx) => {
          if (!header.trim()) return
          const meta = metaMap.get(normalizarChave(header))
          if (!meta) return
          const raw = (row[idx] ?? '').replace(/[%R$\s]/g, '').replace(',', '.')
          const n = parseFloat(raw)
          if (!isNaN(n)) dados[meta.nome_coluna] = n
        })

        if (Object.keys(dados).length === 0) return false
        await upsertSnapshot(dataRef, op.id, dados)
        return true
      })
    )

    const salvos = results.filter(Boolean).length
    if (salvos === 0) return { ok: false, erro: 'Nenhum operador encontrado na planilha.' }

    revalidatePath('/painel/semanal')
    return { ok: true, data: dataRef, salvos }
  } catch (e) {
    console.error('[salvarSnapshotHojeAction]', e)
    return { ok: false, erro: 'Erro ao salvar snapshot.' }
  }
}
