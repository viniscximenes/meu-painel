import { getProfile } from '@/lib/auth'
import { redirect } from 'next/navigation'
import { mesLabelDaPlanilha } from '@/lib/planilha-utils'
import { getMetas, computarKPIs, getMetasOperadorConfig } from '@/lib/kpi'
import type { MetaOperadorConfig } from '@/lib/kpi-utils'
import {
  getPlanilhaAtiva,
  getPlanilhaPorTipo,
  buscarLinhasPlanilha,
  encontrarColunaIdent,
  matchCelulaOperador,
  resolverNomeAba,
  formatarDataCurta,
  extrairDataAtualizacao,
  getMapeamentoKpiColunas,
} from '@/lib/sheets'
import { extrairValor, buildMetasIndividuais } from '@/lib/kpi-coluna-utils'
import { getRVConfig, calcularRV, extrairABSeIndisp } from '@/lib/rv'
import type { ResultadoRV } from '@/lib/rv-utils'
import { lerAbaABS, contarFaltasPorOperador } from '@/lib/abs-sheets'
import { getAppConfig } from '@/lib/app-config'
import {
  buscarPlanilhaHistoricaMaisRecente,
  lerHistoricoFechamento,
  extrairKPIsHistorico,
  encontrarRowOperador,
  HISTORICO_FAKE_HEADERS,
  mesLabelFechamento,
} from '@/lib/historico-fechamento'
import PainelShell from '@/components/PainelShell'
import MeuRVClient from './MeuRVClient'
import type { MeuRVProps } from './MeuRVClient'
import { AlertTriangle, Settings } from 'lucide-react'
import Link from 'next/link'

export const dynamic = 'force-dynamic'

export default async function MeuRVPage() {
  const profile = await getProfile()
  if (profile.role === 'gestor') redirect('/painel')

  const [kpiQuartilPlanilha, planilhaMes, rvConfig, metas, limiteRaw, opConfigs] = await Promise.all([
    getPlanilhaPorTipo('kpi_quartil').catch(() => null),
    getPlanilhaAtiva().catch(() => null),   // para ABS/faltas no modo normal
    getRVConfig().catch(() => null),
    getMetas().catch(() => []),
    getAppConfig('kpi_consolidado_limite_linhas').catch(() => null),
    getMetasOperadorConfig().catch(() => ({} as Record<string, MetaOperadorConfig>)),
  ])
  const limiteLinhas = limiteRaw ? parseInt(limiteRaw, 10) : 50
  const modoHistorico = !kpiQuartilPlanilha

  const agora = new Date()
  const mesLabel = mesLabelDaPlanilha(kpiQuartilPlanilha)
  const mesReferencia = agora.toISOString().slice(0, 7)

  // ── MODO HISTÓRICO ──────────────────────────────────────────────────────────
  if (modoHistorico) {
    if (!rvConfig) {
      return (
        <PainelShell profile={profile} title="Meu RV" iconName="Wallet">
          <div className="space-y-4">
            <EmptyState icon={<Settings size={24} style={{ color: 'var(--gold)' }} />}>
              <strong>Configuração de RV não encontrada</strong>
              <span style={{ color: 'var(--text-muted)', fontSize: '13px' }}>A supervisão ainda não configurou o RV.</span>
            </EmptyState>
          </div>
        </PainelShell>
      )
    }

    let dadosHistorico: MeuRVProps | null = null
    let erroHistorico: string | null = null

    try {
      const planilhaHist = await buscarPlanilhaHistoricaMaisRecente()

      console.log('[modo-historico] meu-rv', {
        modoHistorico,
        kpiQuartilPlanilha: null,
        planilhaHistorica: planilhaHist?.spreadsheet_id ?? null,
        refMes: planilhaHist?.referencia_mes ?? null,
        refAno: planilhaHist?.referencia_ano ?? null,
      })

      if (planilhaHist?.referencia_mes && planilhaHist?.referencia_ano) {
        const { rows } = await lerHistoricoFechamento(planilhaHist.spreadsheet_id)
        const meuRow = encontrarRowOperador(rows, profile.username, profile.nome)

        console.log('[modo-historico] meu-rv rows', { total: rows.length, encontrado: !!meuRow })

        if (!meuRow) {
          return (
            <PainelShell profile={profile} title="Meu RV" iconName="Wallet">
              <div className="space-y-4">
                <EmptyState icon={<AlertTriangle size={24} className="text-amber-400" />}>
                  <strong>Sem dados no fechamento</strong>
                  <span style={{ color: 'var(--text-muted)', fontSize: '13px' }}>
                    Você não aparece no fechamento de {mesLabelFechamento(planilhaHist.referencia_mes, planilhaHist.referencia_ano).replace('FECHAMENTO ', '')}.
                    Aguarde o RV do mês atual.
                  </span>
                </EmptyState>
              </div>
            </PainelShell>
          )
        }

        const kpisHist = extrairKPIsHistorico(meuRow)
        const metaPedidosNum = kpisHist.metaPedidos ? parseFloat(kpisHist.metaPedidos.replace(/[^\d.,]/g, '').replace(',', '.')) || null : null
        const metaChurnNum   = kpisHist.metaChurn   ? parseFloat(kpisHist.metaChurn.replace(/[^\d.,]/g, '').replace(',', '.'))   || null : null
        const absValAtual    = parseFloat((kpisHist.abs ?? '0').replace(/[%\s]/g, '').replace(',', '.')) || 0

        const histMesRef = `${planilhaHist.referencia_ano}-${String(planilhaHist.referencia_mes).padStart(2, '0')}`

        const rvResult = calcularRV(
          HISTORICO_FAKE_HEADERS, meuRow, rvConfig, profile.username,
          [], profile.operador_id ?? 0, histMesRef, 0,
          metaPedidosNum, metaChurnNum,
        )

        dadosHistorico = {
          resultado:       rvResult,
          nomeOperador:    profile.nome,
          mesLabel:        mesLabelFechamento(planilhaHist.referencia_mes, planilhaHist.referencia_ano),
          dataAtualizacao: null,
          absValAtual,
          faltasNoMes:     0,
          modoHistorico:   true,
          mesFechamento:   { mes: planilhaHist.referencia_mes, ano: planilhaHist.referencia_ano },
        }
      }
    } catch (e) {
      erroHistorico = e instanceof Error ? e.message : 'Erro desconhecido'
    }

    return (
      <PainelShell profile={profile} title="Meu RV" iconName="Wallet">
        <div className="space-y-4">
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
          {dadosHistorico && <MeuRVClient {...dadosHistorico} />}
        </div>
      </PainelShell>
    )
  }

  // ── MODO NORMAL ──────────────────────────────────────────────────────────────
  const planilhaKpi = kpiQuartilPlanilha

  if (!planilhaKpi || !rvConfig) {
    return (
      <PainelShell profile={profile} title="Meu RV" iconName="Wallet">
        <div className="space-y-4">
          <EmptyState icon={<Settings size={24} style={{ color: 'var(--gold)' }} />}>
            <strong>Planilha não configurada</strong>
            <span style={{ color: 'var(--text-muted)', fontSize: '13px' }}>A supervisão ainda não ativou nenhuma planilha.</span>
            <Link href="/painel/config" className="btn-secondary text-xs">Configurar planilha</Link>
          </EmptyState>
        </div>
      </PainelShell>
    )
  }

  let dadosProps: MeuRVProps | null = null
  let erroSheets: string | null = null

  try {
    const abaKpi = await resolverNomeAba(planilhaKpi.spreadsheet_id, 'KPI CONSOLIDADO').catch(() => 'KPI CONSOLIDADO')

    const [{ headers, rows }, absData, mapeamento] = await Promise.all([
      buscarLinhasPlanilha(planilhaKpi.spreadsheet_id, abaKpi, limiteLinhas),
      planilhaMes ? lerAbaABS(planilhaMes.spreadsheet_id).catch(() => null) : Promise.resolve(null),
      getMapeamentoKpiColunas().catch(() => ({} as Record<string, string>)),
    ])

    if (!headers.length) throw new Error('Falha ao carregar dados da planilha. Verifique a conexão com o Google Sheets ou tente novamente.')
    const col = encontrarColunaIdent(headers)
    const dataAtualizacao = extrairDataAtualizacao(rows)
    const faltasPorOp = absData ? contarFaltasPorOperador(absData) : {}
    const faltasNoMes = faltasPorOp[profile.username] ?? 0

    const meuRow = rows.find(r => matchCelulaOperador(r[col] ?? '', profile.username, profile.nome))

    if (!meuRow) {
      return (
        <PainelShell profile={profile} title="Meu RV" iconName="Wallet">
          <div className="space-y-4">
            <EmptyState icon={<AlertTriangle size={24} className="text-amber-400" />}>
              <strong>Dados não encontrados</strong>
              <span style={{ color: 'var(--text-muted)', fontSize: '13px' }}>
                Nenhuma linha para <strong style={{ color: 'var(--text-secondary)' }}>{profile.username}</strong> na planilha{' '}
                <strong style={{ color: 'var(--text-secondary)' }}>{planilhaKpi.nome}</strong>.
              </span>
            </EmptyState>
          </div>
        </PainelShell>
      )
    }

    const metasIndividuais = buildMetasIndividuais(meuRow, opConfigs)
    const kpis = computarKPIs(headers, meuRow, metas, undefined, opConfigs, metasIndividuais)
    const { absPercent: absValAtual } = extrairABSeIndisp(headers, meuRow)

    // Extração null-aware via mapeamento configurável (para detecção precisa de semDados)
    const retencaoStr = extrairValor(meuRow, mapeamento, 'tx_ret_bruta')
    const indispStr   = extrairValor(meuRow, mapeamento, 'indisp')
    const tmaStr      = extrairValor(meuRow, mapeamento, 'tma')

    console.log('[RV OP] mapeamento:', mapeamento)
    console.log('[RV OP] strings extraídas:', { retencaoStr, indispStr, tmaStr })

    const rvResult = calcularRV(
      headers, meuRow, rvConfig, profile.username,
      kpis, profile.operador_id ?? 0, mesReferencia, faltasNoMes,
      metasIndividuais['pedidos'] ?? null,
      metasIndividuais['churn'] ?? null,
    )

    // semDados: se mapeamento encontrou ALGUM campo crítico → dados existem
    // caso mapeamento não esteja configurado, usa detecção por keyword do calcularRV
    const semDadosMapeamento = retencaoStr === null && indispStr === null && tmaStr === null
    const semDados = semDadosMapeamento ? rvResult.semDados : false
    const resultado: ResultadoRV = { ...rvResult, semDados }

    console.log('[RV OP] semDados:', semDados, '(mapeamento:', semDadosMapeamento, '| keyword:', rvResult.semDados, ')')

    dadosProps = {
      resultado,
      nomeOperador: profile.nome,
      mesLabel,
      dataAtualizacao: dataAtualizacao ? formatarDataCurta(dataAtualizacao) : null,
      absValAtual,
      faltasNoMes,
    }
  } catch (e) {
    erroSheets = e instanceof Error ? e.message : 'Erro desconhecido'
  }

  return (
    <PainelShell profile={profile} title="Meu RV" iconName="Wallet">
      <div className="space-y-4">
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

        {dadosProps && <MeuRVClient {...dadosProps} />}
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
