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
import type { Meta, Status } from '@/lib/kpi-utils'
import PainelShell from '@/components/PainelShell'
import SemanalClient, { type OperadorRow } from './SemanalClient'

// ── Status inline (espelha lógica de kpi-utils sem importar o privado) ─────────

function getStatus(val: number, meta: Meta): Status {
  const limite = meta.verde_inicio > 0 ? meta.verde_inicio : meta.valor_meta
  if (limite === 0) return 'neutro'

  const isTma =
    normalizarChave(meta.nome_coluna).includes('tma') ||
    normalizarChave(meta.label).includes('tma') ||
    normalizarChave(meta.nome_coluna).includes('tempo') ||
    normalizarChave(meta.label).includes('tempo')

  if (isTma) return val <= limite ? 'verde' : 'vermelho'

  const limiarAmarelo = limite * 0.8

  if (meta.tipo === 'maior_melhor') {
    if (val >= limite) return 'verde'
    if (val >= limiarAmarelo) return 'amarelo'
    return 'vermelho'
  } else {
    if (val < limiarAmarelo) return 'verde'
    if (val <= limite) return 'amarelo'
    return 'vermelho'
  }
}

function buildStatuses(
  dados: Record<string, number>,
  metas: Meta[]
): Record<string, Status> {
  const metaMap = new Map(metas.map((m) => [normalizarChave(m.nome_coluna), m]))
  const out: Record<string, Status> = {}
  for (const [key, val] of Object.entries(dados)) {
    const meta = metaMap.get(normalizarChave(key))
    if (meta) out[meta.nome_coluna] = getStatus(val, meta)
  }
  return out
}

function calcScore(dados: Record<string, number>, metas: Meta[]): number {
  let soma = 0, total = 0
  const metaMap = new Map(metas.map((m) => [normalizarChave(m.nome_coluna), m]))
  for (const [key, val] of Object.entries(dados)) {
    const meta = metaMap.get(normalizarChave(key))
    if (!meta) continue
    const s = getStatus(val, meta)
    soma += s === 'verde' ? 2 : s === 'amarelo' ? 1 : 0
    total++
  }
  return total > 0 ? soma / total : 0
}

// ── Auto-snapshot (apenas segundas-feiras) ─────────────────────────────────────

async function tentarAutoSnapshot(metas: Meta[]): Promise<void> {
  try {
    const hoje = new Date()
    if (hoje.getDay() !== 1) return               // só segunda-feira

    const dataRef = hoje.toISOString().slice(0, 10) // 'YYYY-MM-DD'
    const jaExiste = await existeSnapshotParaData(dataRef)
    if (jaExiste) return

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

// ── Utilitários de data ────────────────────────────────────────────────────────

function getMesReferencia(): string {
  const d = new Date()
  const y = d.getFullYear()
  const m = String(d.getMonth() + 1).padStart(2, '0')
  return `${y}-${m}`
}

// ── Page ──────────────────────────────────────────────────────────────────────

export default async function SemanalPage() {
  const profile = await requireGestor()

  const mesReferencia = getMesReferencia()

  // Busca metas básicas primeiro (necessário para auto-snapshot e score)
  const todasMetas = await getMetas()
  const metas = todasMetas.filter((m) => m.basico).sort((a, b) => a.ordem - b.ordem)

  // Tentativa de auto-snapshot (silenciosa se falhar)
  await tentarAutoSnapshot(metas)

  // Fetch paralelo: datas + nomes fantasia
  const [datas, nomesFantasia] = await Promise.all([
    getSnapshotsDatasRecentes(2),
    getNomesFantasia(mesReferencia),
  ])

  // Snapshots para as datas encontradas
  const snapshots = datas.length > 0 ? await getSnapshotsByDatas(datas) : []

  // Mapas para acesso rápido
  const data2 = datas[0] ?? null  // mais recente
  const data1 = datas[1] ?? null  // mais antiga

  const snapMap2 = new Map<number, Record<string, number>>()  // opId → dados snap2
  const snapMap1 = new Map<number, Record<string, number>>()  // opId → dados snap1

  for (const s of snapshots) {
    if (s.data_ref === data2) snapMap2.set(s.operador_id, s.dados)
    if (s.data_ref === data1) snapMap1.set(s.operador_id, s.dados)
  }

  const nomeMap = new Map(nomesFantasia.map((n) => [n.operador_id, n.nome_fantasia]))

  // Monta rows
  const rows: OperadorRow[] = OPERADORES_DISPLAY.map((op) => {
    const snap2 = snapMap2.get(op.id) ?? null
    const snap1 = snapMap1.get(op.id) ?? null
    const dadosRef = snap2 ?? snap1 ?? {}
    const score = Object.keys(dadosRef).length > 0 && metas.length > 0
      ? calcScore(dadosRef, metas)
      : 0
    const statuses2 = snap2 ? buildStatuses(snap2, metas) : {}

    return {
      opId: op.id,
      nomeReal: op.nome,
      username: op.username,
      nomeFantasia: nomeMap.get(op.id) ?? null,
      snap1,
      snap2,
      score,
      statuses2,
    }
  })

  // Ranking: operadores que têm ao menos um snapshot
  const rowsComDados = rows.filter((r) => r.snap2 !== null || r.snap1 !== null)
  const rowsOrdenados = [...rowsComDados].sort((a, b) => b.score - a.score)
  const melhores = rowsOrdenados.slice(0, 3).map((r) => r.opId)
  const piores   = rowsOrdenados.slice(-3).reverse().map((r) => r.opId)

  return (
    <PainelShell profile={profile} title="Acompanhamento Semanal">
      <SemanalClient
        datas={datas}
        rows={rows}
        metas={metas}
        mesReferencia={mesReferencia}
        melhores={melhores}
        piores={piores}
      />
    </PainelShell>
  )
}
