'use server'

import { revalidatePath } from 'next/cache'
import { requireGestor } from '@/lib/auth'
import { getMetas } from '@/lib/kpi'
import {
  getPlanilhaAtiva,
  buscarLinhasPlanilha,
  encontrarColunaIdent,
  matchCelulaOperador,
  lerRangeCelulas,
  listarAbas,
} from '@/lib/sheets'
import { upsertNomeFantasia, upsertSnapshot, existeSnapshotParaData } from '@/lib/snapshots'
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

// ── Helpers de data ───────────────────────────────────────────────────────────

/** Converte "DD/MM/YYYY" ou "YYYY-MM-DD" para "YYYY-MM-DD". Retorna null se inválido. */
function parseDataKpi(raw: string): string | null {
  const dmy = raw.match(/^(\d{1,2})\/(\d{1,2})\/(\d{4})$/)
  if (dmy) return `${dmy[3]}-${dmy[2].padStart(2, '0')}-${dmy[1].padStart(2, '0')}`
  if (/^\d{4}-\d{2}-\d{2}$/.test(raw)) return raw
  return null
}

/** Dada uma data ISO, retorna a segunda-feira mais recente ≤ essa data (ISO). */
function ultimaSegundaISO(iso: string): string {
  const [y, m, d] = iso.split('-').map(Number)
  const date = new Date(y, m - 1, d)
  const dow = date.getDay() // 0=Dom … 6=Sáb
  const diasAtras = dow === 0 ? 6 : dow - 1
  date.setDate(date.getDate() - diasAtras)
  return `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, '0')}-${String(date.getDate()).padStart(2, '0')}`
}

/** Lê A1:A10, procura "ATUALIZADO" e retorna a célula imediatamente abaixo. */
async function lerDataKpi(spreadsheet_id: string): Promise<string | null> {
  const abas = await listarAbas(spreadsheet_id)
  console.log('[lerDataKpi] abas disponíveis:', abas)

  const abaKpi = abas.find((a) => /kpi/i.test(a) && /consolidado/i.test(a)) ?? 'KPI CONSOLIDADO'
  console.log('[lerDataKpi] usando aba:', abaKpi)

  const valores = await lerRangeCelulas(spreadsheet_id, abaKpi, 'A1:A20')
  console.log('[lerDataKpi] A1:A20 valores:', valores)

  for (let i = 0; i < valores.length - 1; i++) {
    if (/atualizado/i.test(valores[i])) {
      const candidata = valores[i + 1]
      console.log(`[lerDataKpi] "ATUALIZADO" em A${i + 1}, data candidata em A${i + 2}: "${candidata}"`)
      const parsed = parseDataKpi(candidata)
      if (parsed) {
        console.log('[lerDataKpi] data parseada:', parsed)
        return parsed
      }
      console.warn('[lerDataKpi] célula abaixo de "ATUALIZADO" não é uma data válida:', candidata)
    }
  }

  console.warn('[lerDataKpi] "ATUALIZADO" não encontrado em A1:A20, valores:', valores)
  return null
}

// ── Salvar snapshots de todos os operadores para uma data ─────────────────────

async function salvarSnapshotsParaData(
  dataRef: string,
  spreadsheet_id: string,
  aba: string
): Promise<{ salvos: number } | { erro: string }> {
  const [metas, { headers, rows }] = await Promise.all([
    getMetas(),
    buscarLinhasPlanilha(spreadsheet_id, aba),
  ])

  if (!headers.length) return { erro: 'Planilha sem dados.' }

  const col     = encontrarColunaIdent(headers)
  const metaMap = new Map(metas.map((m) => [normalizarChave(m.nome_coluna), m]))

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
  if (salvos === 0) return { erro: 'Nenhum operador encontrado na planilha.' }
  return { salvos }
}

// ── Actions públicas ──────────────────────────────────────────────────────────

export async function salvarSnapshotHojeAction(): Promise<
  { ok: true; data: string; salvos: number } | { ok: false; erro: string }
> {
  try {
    await requireGestor()

    const planilha = await getPlanilhaAtiva()
    if (!planilha) return { ok: false, erro: 'Nenhuma planilha ativa configurada.' }

    const dataRef = await lerDataKpi(planilha.spreadsheet_id)
    if (!dataRef) return { ok: false, erro: 'Não foi possível ler a data na aba "KPI CONSOLIDADO" (A2).' }

    const res = await salvarSnapshotsParaData(dataRef, planilha.spreadsheet_id, planilha.aba)
    if ('erro' in res) return { ok: false, erro: res.erro }

    revalidatePath('/painel/semanal')
    return { ok: true, data: dataRef, salvos: res.salvos }
  } catch (e) {
    console.error('[salvarSnapshotHojeAction]', e)
    return { ok: false, erro: 'Erro ao salvar snapshot.' }
  }
}

export async function salvarSnapshotSemanaAnteriorAction(forcar = false): Promise<
  | { ok: true; data: string; salvos: number }
  | { ok: false; erro: string }
  | { ok: 'confirmar'; data: string }
> {
  try {
    await requireGestor()

    const planilha = await getPlanilhaAtiva()
    if (!planilha) return { ok: false, erro: 'Nenhuma planilha ativa configurada.' }

    const dataKpi = await lerDataKpi(planilha.spreadsheet_id)
    if (!dataKpi) return { ok: false, erro: 'Não foi possível ler a data na aba "KPI CONSOLIDADO" (A2).' }

    const dataRef = ultimaSegundaISO(dataKpi)

    if (!forcar && (await existeSnapshotParaData(dataRef))) {
      return { ok: 'confirmar', data: dataRef }
    }

    const res = await salvarSnapshotsParaData(dataRef, planilha.spreadsheet_id, planilha.aba)
    if ('erro' in res) return { ok: false, erro: res.erro }

    revalidatePath('/painel/semanal')
    return { ok: true, data: dataRef, salvos: res.salvos }
  } catch (e) {
    console.error('[salvarSnapshotSemanaAnteriorAction]', e)
    return { ok: false, erro: 'Erro ao salvar snapshot.' }
  }
}
