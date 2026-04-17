import { notFound } from 'next/navigation'
import { requireGestor } from '@/lib/auth'
import { getMetas } from '@/lib/kpi'
import {
  getSnapshotsByOperador,
  getSnapshotsDatasRecentes,
  getSnapshotsByDatas,
  getNomesFantasia,
} from '@/lib/snapshots'
import { OPERADORES_DISPLAY } from '@/lib/operadores'
import { normalizarChave, calcTotalPts, normalizarDados } from '@/lib/kpi-utils'
import type { Meta } from '@/lib/kpi-utils'
import PainelShell from '@/components/PainelShell'
import OperadorDashClient from './OperadorDashClient'

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

function getMesReferencia(): string {
  const d = new Date()
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}`
}

export default async function OperadorPage({
  params,
}: {
  params: Promise<{ operador_id: string }>
}) {
  const profile = await requireGestor()
  const { operador_id: opIdStr } = await params
  const opId = parseInt(opIdStr, 10)

  const operador = OPERADORES_DISPLAY.find((op) => op.id === opId)
  if (!operador) notFound()

  const mesReferencia = getMesReferencia()

  const [allSnaps, nomesFantasia, todasMetas, datasRecentes] = await Promise.all([
    getSnapshotsByOperador(opId),
    getNomesFantasia(mesReferencia),
    getMetas(),
    getSnapshotsDatasRecentes(2),
  ])

  const metas = filtrarMetas(todasMetas)

  const snapsNorm = allSnaps.map((s) => ({
    data_ref: s.data_ref,
    dados: normalizarDados(s.dados, metas),
  }))

  const score =
    snapsNorm.length >= 2
      ? calcTotalPts(
          snapsNorm[snapsNorm.length - 2].dados,
          snapsNorm[snapsNorm.length - 1].dados,
          metas
        )
      : 0

  // Ranking a partir dos 2 snapshots mais recentes globais
  let posicao: { tipo: 'melhor' | 'pior'; lugar: number } | null = null
  if (datasRecentes.length >= 2) {
    const rankSnaps = await getSnapshotsByDatas(datasRecentes)
    const snap2Map = new Map<number, Record<string, number>>()
    const snap1Map = new Map<number, Record<string, number>>()
    for (const s of rankSnaps) {
      if (s.data_ref === datasRecentes[0]) snap2Map.set(s.operador_id, s.dados)
      if (s.data_ref === datasRecentes[1]) snap1Map.set(s.operador_id, s.dados)
    }
    const scores = OPERADORES_DISPLAY
      .map((op) => {
        const s1 = snap1Map.get(op.id)
        const s2 = snap2Map.get(op.id)
        if (!s1 || !s2) return null
        return {
          opId: op.id,
          score: calcTotalPts(normalizarDados(s1, metas), normalizarDados(s2, metas), metas),
        }
      })
      .filter(Boolean) as { opId: number; score: number }[]

    const ordenados  = [...scores].sort((a, b) => b.score - a.score)
    const pioresOrdem = [...scores].sort((a, b) => a.score - b.score)
    const melhorIdx  = ordenados.findIndex((s) => s.opId === opId)
    const piorIdx    = pioresOrdem.findIndex((s) => s.opId === opId)

    if (melhorIdx !== -1 && melhorIdx < 3) {
      posicao = { tipo: 'melhor', lugar: melhorIdx + 1 }
    } else if (piorIdx !== -1 && piorIdx < 3) {
      posicao = { tipo: 'pior', lugar: piorIdx + 1 }
    }
  }

  const nomeMap = new Map(nomesFantasia.map((n) => [Number(n.operador_id), n.nome_fantasia]))

  return (
    <PainelShell profile={profile} title={operador.nome.split(' ')[0]}>
      <OperadorDashClient
        operador={{ id: operador.id, nome: operador.nome, username: operador.username }}
        nomeFantasia={nomeMap.get(opId) ?? null}
        snapshots={snapsNorm}
        metas={metas}
        posicao={posicao}
        score={score}
        mesReferencia={mesReferencia}
      />
    </PainelShell>
  )
}
