import { requireGestor } from '@/lib/auth'
import { getMetas } from '@/lib/kpi'
import {
  getPlanilhaAtiva,
  buscarLinhasPlanilha,
  encontrarColunaIdent,
  matchCelulaOperador,
} from '@/lib/sheets'
import {
  getSnapshotsDatasRecentes,
  getSnapshotsByDatas,
  getNomesFantasia,
  existeSnapshotParaData,
  upsertSnapshot,
} from '@/lib/snapshots'
import { OPERADORES_DISPLAY } from '@/lib/operadores'
import { normalizarChave } from '@/lib/kpi-utils'
import type { Meta } from '@/lib/kpi-utils'
import PainelShell from '@/components/PainelShell'
import SemanalClient, { type OperadorRow } from './SemanalClient'

// ── Metas excluídas desta página ──────────────────────────────────────────────
// Apenas os 6 KPIs principais são usados no Acompanhamento Semanal.
const METAS_EXCLUIR = ['transfer', 'rechamada', 'transf']

function filtrarMetas(metas: Meta[]): Meta[] {
  return metas
    .filter((m) => m.basico)
    .filter((m) => {
      const key = normalizarChave(m.nome_coluna)
      return !METAS_EXCLUIR.some((excl) => key.includes(excl))
    })
    .sort((a, b) => a.ordem - b.ordem)
}

// ── Sistema de pontos ─────────────────────────────────────────────────────────
// Espelhado em SemanalClient.tsx. Qualquer alteração deve ser feita nos dois.

function calcKpiPts(nomeColuna: string, v1: number, v2: number): number {
  const key = normalizarChave(nomeColuna)

  // Tx. Retenção Bruta — maior melhor, threshold 2pp
  if (key.includes('retenc') || key.includes('retenç')) {
    const d = v2 - v1
    if (d >= 2) return 3
    if (d > 0) return 1
    if (d < 0 && d > -2) return -1
    if (d <= -2) return -3
    return 0
  }

  // Pedidos — maior melhor, threshold 5
  if (key === 'pedidos') {
    const d = v2 - v1
    if (d >= 5) return 3
    if (d >= 1) return 1
    if (d <= -1 && d >= -4) return -1
    if (d <= -5) return -3
    return 0
  }

  // Churn — menor melhor, threshold 3
  if (key === 'churn') {
    const r = v1 - v2  // positivo = reduziu
    if (r >= 3) return 3
    if (r >= 1) return 1
    if (r <= -1 && r >= -2) return -1
    if (r <= -3) return -3
    return 0
  }

  // ABS — menor melhor, threshold 0.5pp
  if (key.startsWith('abs')) {
    const r = v1 - v2
    if (r >= 0.5) return 3
    if (r > 0) return 1
    if (r < 0 && r > -0.5) return -1
    if (r <= -0.5) return -3
    return 0
  }

  // Indisp Total — menor melhor, threshold 1pp
  if (key.includes('indisp')) {
    const r = v1 - v2
    if (r >= 1) return 3
    if (r > 0) return 1
    if (r < 0 && r > -1) return -1
    if (r <= -1) return -3
    return 0
  }

  // TMA — menor melhor em segundos, threshold 30s
  if (key === 'tma') {
    const r = v1 - v2
    if (r >= 30) return 3
    if (r >= 1) return 1
    if (r <= -1 && r >= -29) return -1
    if (r <= -30) return -3
    return 0
  }

  return 0
}

/** Soma de pontos para um par de snapshots (-18 a +18). */
function calcTotalPts(
  snap1: Record<string, number>,
  snap2: Record<string, number>,
  metas: Meta[]
): number {
  let total = 0
  for (const meta of metas) {
    const v1 = snap1[meta.nome_coluna]
    const v2 = snap2[meta.nome_coluna]
    if (v1 !== undefined && v2 !== undefined) {
      total += calcKpiPts(meta.nome_coluna, v1, v2)
    }
  }
  return total
}

// ── Normalização de chaves do JSONB → nome_coluna canônico ────────────────────

function normalizarDados(
  dados: Record<string, number>,
  metas: Meta[]
): Record<string, number> {
  const metaMap = new Map(metas.map((m) => [normalizarChave(m.nome_coluna), m]))
  const out: Record<string, number> = {}
  for (const [key, val] of Object.entries(dados)) {
    const meta = metaMap.get(normalizarChave(key))
    if (meta) out[meta.nome_coluna] = val
  }
  return out
}

// ── Auto-snapshot (apenas segundas-feiras) ─────────────────────────────────────

async function tentarAutoSnapshot(metas: Meta[]): Promise<void> {
  try {
    const hoje = new Date()
    if (hoje.getDay() !== 1) return

    const dataRef = hoje.toISOString().slice(0, 10)
    if (await existeSnapshotParaData(dataRef)) return

    const planilha = await getPlanilhaAtiva()
    if (!planilha) return

    const { headers, rows } = await buscarLinhasPlanilha(planilha.spreadsheet_id, planilha.aba)
    if (!headers.length) return

    const col = encontrarColunaIdent(headers)
    const metaMap = new Map(metas.map((m) => [normalizarChave(m.nome_coluna), m]))

    await Promise.all(
      OPERADORES_DISPLAY.map(async (op) => {
        const row = rows.find((r) =>
          matchCelulaOperador(r[col] ?? '', op.username, op.nome)
        )
        if (!row) return

        const dados: Record<string, number> = {}
        headers.forEach((header, idx) => {
          if (!header.trim()) return
          const meta = metaMap.get(normalizarChave(header))
          if (!meta) return
          const raw = (row[idx] ?? '').replace(/[%R$\s]/g, '').replace(',', '.')
          const n = parseFloat(raw)
          if (!isNaN(n)) dados[meta.nome_coluna] = n
        })

        if (Object.keys(dados).length > 0) {
          await upsertSnapshot(dataRef, op.id, dados)
        }
      })
    )

    console.log(`[Auto-snapshot] Criado para ${dataRef}`)
  } catch (e) {
    console.error('[Auto-snapshot] Erro:', e)
  }
}

function getMesReferencia(): string {
  const d = new Date()
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}`
}

// ── Page ──────────────────────────────────────────────────────────────────────

export default async function SemanalPage() {
  const profile = await requireGestor()

  const mesReferencia = getMesReferencia()

  const todasMetas = await getMetas()
  const metas = filtrarMetas(todasMetas)

  await tentarAutoSnapshot(metas)

  const hoje = new Date().toISOString().slice(0, 10)

  const [datas, nomesFantasia, existeSnapshotHoje] = await Promise.all([
    getSnapshotsDatasRecentes(2),
    getNomesFantasia(mesReferencia),
    existeSnapshotParaData(hoje),
  ])

  const snapshots = datas.length > 0 ? await getSnapshotsByDatas(datas) : []

  const data2 = datas[0] ?? null
  const data1 = datas[1] ?? null

  const snapMap2 = new Map<number, Record<string, number>>()
  const snapMap1 = new Map<number, Record<string, number>>()

  for (const s of snapshots) {
    if (s.data_ref === data2) snapMap2.set(s.operador_id, s.dados)
    if (s.data_ref === data1) snapMap1.set(s.operador_id, s.dados)
  }

  const nomeMap = new Map(nomesFantasia.map((n) => [Number(n.operador_id), n.nome_fantasia]))

  const rows: OperadorRow[] = OPERADORES_DISPLAY.map((op) => {
    const snap2 = snapMap2.has(op.id) ? normalizarDados(snapMap2.get(op.id)!, metas) : null
    const snap1 = snapMap1.has(op.id) ? normalizarDados(snapMap1.get(op.id)!, metas) : null
    const score = snap1 && snap2 ? calcTotalPts(snap1, snap2, metas) : 0

    return {
      opId: op.id,
      nomeReal: op.nome,
      username: op.username,
      nomeFantasia: nomeMap.get(op.id) ?? null,
      snap1,
      snap2,
      score,
    }
  })

  // Ranking: apenas operadores com AMBOS os snapshots
  const comAmbos = rows.filter((r) => r.snap1 !== null && r.snap2 !== null)
  const ordenados = [...comAmbos].sort((a, b) => b.score - a.score)
  const melhores = ordenados.slice(0, 3).map((r) => r.opId)
  const piores   = [...ordenados].reverse().slice(0, 3).map((r) => r.opId)

  return (
    <PainelShell profile={profile} title="Acompanhamento Semanal">
      <SemanalClient
        datas={datas}
        rows={rows}
        metas={metas}
        mesReferencia={mesReferencia}
        melhores={melhores}
        piores={piores}
        existeSnapshotHoje={existeSnapshotHoje}
      />
    </PainelShell>
  )
}
