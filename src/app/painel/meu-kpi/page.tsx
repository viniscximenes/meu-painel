import { getProfile } from '@/lib/auth'
import { redirect } from 'next/navigation'
import { mesLabelDaPlanilha } from '@/lib/planilha-utils'
import { getMetas, computarKPIs, getMetasOperadorConfig } from '@/lib/kpi'
import type { MetaOperadorConfig } from '@/lib/kpi-utils'
import {
  getPlanilhaAtiva,
  getPlanilhaPorTipo,
  buscarLinhasPlanilha,
  buscarColunaA,
  encontrarColunaIdent,
  matchCelulaOperador,
  resolverNomeAba,
  formatarDataCurta,
  extrairDataAtualizacao,
  getMapeamentoKpiColunas,
} from '@/lib/sheets'
import { KPIS_PRINCIPAIS, KPIS_SECUNDARIOS } from '@/lib/kpis-config'
import { letraColunaParaIndice, buildMetasIndividuais } from '@/lib/kpi-coluna-utils'
import { OPERADORES_DISPLAY } from '@/lib/operadores'
import { getAppConfig } from '@/lib/app-config'
import {
  buscarPlanilhaHistoricaMaisRecente,
  lerHistoricoFechamento,
  extrairKPIsHistorico,
  encontrarRowOperador,
  buildKPIsHistorico,
  mesLabelFechamento,
} from '@/lib/historico-fechamento'
import PainelShell from '@/components/PainelShell'
import MeuKPIClient, { type MeuKPIProps } from './MeuKPIClient'
import { AlertTriangle, Settings } from 'lucide-react'
import Link from 'next/link'

export const dynamic = 'force-dynamic'

export default async function MeuKPIPage() {
  const profile = await getProfile()
  if (profile.role === 'gestor') redirect('/painel')

  const [kpiQuartilPlanilha, metas, limiteRaw, mapeamento, opConfigs] = await Promise.all([
    getPlanilhaPorTipo('kpi_quartil').catch(() => null),
    getMetas().catch(() => []),
    getAppConfig('kpi_consolidado_limite_linhas').catch(() => null),
    getMapeamentoKpiColunas().catch(() => ({} as Record<string, string>)),
    getMetasOperadorConfig().catch(() => ({} as Record<string, MetaOperadorConfig>)),
  ])
  const limiteLinhas = limiteRaw ? parseInt(limiteRaw, 10) : 50
  const modoHistorico = !kpiQuartilPlanilha

  const mesLabel = mesLabelDaPlanilha(kpiQuartilPlanilha)

  const cssVars = {
    '--void2': '#07070f',
    '--void3': '#0d0d1a',
  } as React.CSSProperties

  // ── MODO HISTÓRICO ──────────────────────────────────────────────────────────
  if (modoHistorico) {
    let dadosHistorico: MeuKPIProps | null = null
    let erroHistorico: string | null = null

    try {
      const planilhaHist = await buscarPlanilhaHistoricaMaisRecente()

      console.log('[modo-historico] meu-kpi', {
        modoHistorico,
        kpiQuartilPlanilha: null,
        planilhaHistorica: planilhaHist?.spreadsheet_id ?? null,
        refMes: planilhaHist?.referencia_mes ?? null,
        refAno: planilhaHist?.referencia_ano ?? null,
      })

      if (planilhaHist?.referencia_mes && planilhaHist?.referencia_ano) {
        const { rows } = await lerHistoricoFechamento(planilhaHist.spreadsheet_id)
        const meuRow = encontrarRowOperador(rows, profile.username, profile.nome)

        console.log('[modo-historico] meu-kpi rows', { total: rows.length, encontrado: !!meuRow })

        if (!meuRow) {
          return (
            <PainelShell profile={profile} title="Meu KPI" iconName="Gauge">
              <div style={cssVars} className="space-y-4">
                <EmptyState icon={<AlertTriangle size={24} className="text-amber-400" />}>
                  <strong>Sem dados no fechamento</strong>
                  <span style={{ color: 'var(--text-muted)', fontSize: '13px' }}>
                    Você não aparece no fechamento de {mesLabelFechamento(planilhaHist.referencia_mes, planilhaHist.referencia_ano).replace('FECHAMENTO ', '')}.
                    Aguarde o KPI do mês atual.
                  </span>
                </EmptyState>
              </div>
            </PainelShell>
          )
        }

        const kpisHist = extrairKPIsHistorico(meuRow)
        const kpis     = buildKPIsHistorico(kpisHist, opConfigs)

        dadosHistorico = {
          kpis,
          complementares: [],
          posicaoRanking: 0,
          meuTxRet: 0,
          totalNoRanking: 0,
          nomeOperador: profile.nome,
          planilhaNome: planilhaHist.nome,
          dataAtualizacao: null,
          mesLabel: mesLabelFechamento(planilhaHist.referencia_mes, planilhaHist.referencia_ano),
          modoHistorico: true,
          mesFechamento: { mes: planilhaHist.referencia_mes, ano: planilhaHist.referencia_ano },
        }
      }
    } catch (e) {
      erroHistorico = e instanceof Error ? e.message : 'Erro desconhecido'
    }

    return (
      <PainelShell profile={profile} title="Meu KPI" iconName="Gauge">
        <div style={cssVars} className="space-y-4">
          {erroHistorico && (
            <div className="flex items-start gap-3 rounded-xl border px-4 py-3"
              style={{ background: 'rgba(239,68,68,0.05)', borderColor: 'rgba(239,68,68,0.2)' }}>
              <AlertTriangle size={15} className="text-rose-400 shrink-0 mt-0.5" />
              <div>
                <p className="text-sm font-medium text-rose-300">Erro ao carregar fechamento</p>
                <p className="text-xs mt-0.5 text-rose-500">{erroHistorico}</p>
              </div>
            </div>
          )}
          {dadosHistorico && <MeuKPIClient {...dadosHistorico} />}
          {!dadosHistorico && !erroHistorico && (
            <MeuKPIClient
              kpis={[]} complementares={[]} posicaoRanking={0}
              meuTxRet={0} totalNoRanking={0}
              nomeOperador={profile.nome} planilhaNome="—"
              dataAtualizacao={null} mesLabel="AGUARDANDO KPI"
              modoHistorico={true}
            />
          )}
        </div>
      </PainelShell>
    )
  }

  // ── MODO NORMAL ──────────────────────────────────────────────────────────────
  const planilha = kpiQuartilPlanilha

  if (!planilha) {
    return (
      <PainelShell profile={profile} title="Meu KPI" iconName="Gauge">
        <div style={cssVars} className="space-y-4">
          <EmptyState icon={<Settings size={24} style={{ color: 'var(--gold)' }} />}>
            <strong>Planilha não configurada</strong>
            <span style={{ color: 'var(--text-muted)', fontSize: '13px' }}>A supervisão ainda não ativou nenhuma planilha.</span>
            <Link href="/painel/config" className="btn-secondary text-xs">Configurar planilha</Link>
          </EmptyState>
        </div>
      </PainelShell>
    )
  }

  let dadosProps: MeuKPIProps | null = null
  let erroSheets: string | null = null

  try {
    const abaResolvida = await resolverNomeAba(planilha.spreadsheet_id, 'KPI CONSOLIDADO').catch(() => planilha.aba)
    const [{ headers, rows }, colA] = await Promise.all([
      buscarLinhasPlanilha(planilha.spreadsheet_id, abaResolvida, limiteLinhas),
      buscarColunaA(planilha.spreadsheet_id, abaResolvida),
    ])
    if (!headers.length) throw new Error('Falha ao carregar dados da planilha. Verifique a conexão com o Google Sheets ou tente novamente.')
    const col = encontrarColunaIdent(headers)
    const dataAtualizacao = extrairDataAtualizacao(colA)

    const meuRow = rows.find(r => matchCelulaOperador(r[col] ?? '', profile.username, profile.nome))

    if (!meuRow) {
      return (
        <PainelShell profile={profile} title="Meu KPI" iconName="Gauge">
          <div style={cssVars} className="space-y-4">
            <EmptyState icon={<AlertTriangle size={24} className="text-amber-400" />}>
              <strong>Dados não encontrados</strong>
              <span style={{ color: 'var(--text-muted)', fontSize: '13px' }}>
                Nenhuma linha para <strong style={{ color: 'var(--text-secondary)' }}>{profile.username}</strong> na planilha{' '}
                <strong style={{ color: 'var(--text-secondary)' }}>{planilha.nome}</strong>.
              </span>
            </EmptyState>
          </div>
        </PainelShell>
      )
    }

    const metasIndividuais = buildMetasIndividuais(meuRow, opConfigs)
    const kpis = computarKPIs(headers, meuRow, metas, undefined, opConfigs, metasIndividuais)

    // 6 KPIs principais — sempre presentes, valor vem do mapeamento de colunas
    const kpisPrincipais = KPIS_PRINCIPAIS.map(kpiDef => {
      const letra = mapeamento[kpiDef.key]
      const placeholder = {
        nome_coluna: kpiDef.key, label: kpiDef.label, valor: '—', valorNum: 0,
        unidade: '', status: 'neutro' as const, progresso: 0, basico: true, indice: -1,
      }
      if (!letra) return placeholder
      const idx = letraColunaParaIndice(letra)
      if (idx < 0 || idx >= headers.length) return placeholder
      const existingKpi = kpis.find(k => k.indice === idx)
      if (existingKpi) return { ...existingKpi, basico: true, label: kpiDef.label }
      return { ...placeholder, indice: idx }
    })

    // Ranking por Tx. Retenção — via mapeamento de coluna
    const txRetLetra = mapeamento['tx_ret_bruta']
    const txRetIdx = txRetLetra ? letraColunaParaIndice(txRetLetra) : -1

    const parseNum = (v: string) => parseFloat(v.replace('%','').replace(',','.').trim() || '0') || 0

    const todosComTxRet = OPERADORES_DISPLAY
      .map(op => {
        const r = rows.find(row => matchCelulaOperador(row[col] ?? '', op.username, op.nome))
        if (!r || txRetIdx < 0) return null
        return { username: op.username, txRet: parseNum(r[txRetIdx] ?? '0') }
      })
      .filter((x): x is { username: string; txRet: number } => x !== null)
      .sort((a, b) => b.txRet - a.txRet)

    const posicaoRanking = todosComTxRet.findIndex(r => r.username === profile.username) + 1
    const meuTxRet = todosComTxRet.find(r => r.username === profile.username)?.txRet ?? 0
    const totalNoRanking = todosComTxRet.length
    const txRetLider = todosComTxRet[0]?.txRet ?? 0

    const myIdx = posicaoRanking > 0 ? posicaoRanking - 1 : -1
    const vizinhoAcima = myIdx > 0
      ? { posicao: myIdx, txRet: todosComTxRet[myIdx - 1].txRet }
      : undefined
    const vizinhoAbaixo = myIdx >= 0 && myIdx < totalNoRanking - 1
      ? { posicao: myIdx + 2, txRet: todosComTxRet[myIdx + 1].txRet }
      : undefined

    // Dados complementares — 14 KPIs secundários via mapeamento de colunas
    const complementares = KPIS_SECUNDARIOS
      .map(kpiDef => {
        const letra = mapeamento[kpiDef.key]
        if (!letra) return null
        const idx = letraColunaParaIndice(letra)
        if (idx < 0 || idx >= meuRow.length) return null
        const val = (meuRow[idx] ?? '').trim()
        if (!val || val === '—') return null
        return { label: kpiDef.key, valor: val }
      })
      .filter(Boolean) as { label: string; valor: string }[]

    dadosProps = {
      kpis: kpisPrincipais,
      complementares,
      posicaoRanking,
      meuTxRet,
      totalNoRanking,
      nomeOperador: profile.nome,
      planilhaNome: planilha.nome,
      dataAtualizacao: dataAtualizacao ? formatarDataCurta(dataAtualizacao) : null,
      mesLabel,
      vizinhoAcima,
      vizinhoAbaixo,
      txRetLider,
    }
  } catch (e) {
    erroSheets = e instanceof Error ? e.message : 'Erro desconhecido'
  }

  return (
    <PainelShell profile={profile} title="Meu KPI" iconName="Gauge">
      <div style={cssVars} className="space-y-4">

        {erroSheets && (
          <div className="flex items-start gap-3 rounded-xl border px-4 py-3"
            style={{ background: 'rgba(239,68,68,0.05)', borderColor: 'rgba(239,68,68,0.2)' }}>
            <AlertTriangle size={15} className="text-rose-400 shrink-0 mt-0.5" />
            <div>
              <p className="text-sm font-medium text-rose-300">Erro ao carregar planilha</p>
              <p className="text-xs mt-0.5 text-rose-500">{erroSheets}</p>
            </div>
          </div>
        )}

        {dadosProps && <MeuKPIClient {...dadosProps} />}
      </div>
    </PainelShell>
  )
}

function EmptyState({ icon, children }: { icon: React.ReactNode; children: React.ReactNode }) {
  return (
    <div className="flex flex-col items-center justify-center min-h-[50vh] gap-4 text-center">
      <div className="w-14 h-14 rounded-2xl flex items-center justify-center"
        style={{ background: 'rgba(201,168,76,0.08)', border: '1px solid rgba(201,168,76,0.10)' }}>
        {icon}
      </div>
      <div className="flex flex-col items-center gap-2">{children}</div>
    </div>
  )
}
