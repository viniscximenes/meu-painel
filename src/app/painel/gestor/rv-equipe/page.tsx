import React from 'react'
import { requireGestorOuAdmin } from '@/lib/auth'
import { mesLabelDaPlanilha } from '@/lib/planilha-utils'
import {
  getPlanilhaAtiva,
  getPlanilhaPorTipo,
  buscarLinhasPlanilha,
  encontrarColunaIdent,
  matchCelulaOperador,
  formatarDataCurta,
  extrairDataAtualizacao,
  resolverNomeAba,
} from '@/lib/sheets'
import { getRVConfig, calcularRV } from '@/lib/rv'
import { getMetas, computarKPIs, getMetasOperadorConfig } from '@/lib/kpi'
import type { MetaOperadorConfig } from '@/lib/kpi-utils'
import { buildMetasIndividuais } from '@/lib/kpi-coluna-utils'
import { getAppConfig } from '@/lib/app-config'
import { lerAbaABS, contarFaltasPorOperador } from '@/lib/abs-sheets'
import { OPERADORES_DISPLAY } from '@/lib/operadores'
import { createAdminClient } from '@/lib/supabase/admin'
import PainelShell from '@/components/PainelShell'
import RvEquipeClient from './RvEquipeClient'
import type { OperadorRvData } from './RvEquipeClient'
import { AlertTriangle, Settings } from 'lucide-react'
import Link from 'next/link'

export const dynamic = 'force-dynamic'

export default async function RvEquipePage() {
  const profile = await requireGestorOuAdmin()

  const admin = createAdminClient()

  const [planilhaKpi, planilhaMes, rvConfig, metas, limiteRaw, ativosRes, opConfigs] = await Promise.all([
    getPlanilhaPorTipo('kpi_quartil').catch(() => null),
    getPlanilhaAtiva().catch(() => null),
    getRVConfig().catch(() => null),
    getMetas().catch(() => []),
    getAppConfig('kpi_consolidado_limite_linhas').catch(() => null),
    admin.from('profiles').select('operador_id').eq('ativo', true).not('operador_id', 'is', null),
    getMetasOperadorConfig().catch(() => ({} as Record<string, MetaOperadorConfig>)),
  ])

  const ativosIds = new Set((ativosRes.data ?? []).map(p => p.operador_id as number))
  const operadoresAtivos = OPERADORES_DISPLAY.filter(op => ativosIds.has(op.id))
  const limiteLinhas = limiteRaw ? parseInt(limiteRaw, 10) : 80

  const mesLabel = mesLabelDaPlanilha(planilhaKpi)
  const mesReferencia = new Date().toISOString().slice(0, 7)
  const cssVars = { '--void2': '#07070f', '--void3': '#0d0d1a' } as React.CSSProperties

  if (!planilhaKpi) {
    return (
      <PainelShell profile={profile} title="RV Equipe" iconName="Coins">
        <div style={cssVars} className="space-y-4">
          <EmptyState icon={<Settings size={24} style={{ color: 'var(--gold)' }} />}>
            <strong>Planilha não configurada</strong>
            <span style={{ color: 'var(--text-muted)', fontSize: '13px' }}>
              Nenhuma planilha está ativa.{' '}
              <Link href="/painel/config" style={{ color: '#c9a84c', textDecoration: 'underline' }}>
                Configurar
              </Link>
            </span>
          </EmptyState>
        </div>
      </PainelShell>
    )
  }

  if (!rvConfig) {
    return (
      <PainelShell profile={profile} title="RV Equipe" iconName="Coins">
        <div style={cssVars} className="space-y-4">
          <EmptyState icon={<Settings size={24} style={{ color: 'var(--gold)' }} />}>
            <strong>RV não configurado</strong>
            <span style={{ color: 'var(--text-muted)', fontSize: '13px' }}>
              Configure o RV antes de usar esta tela.
            </span>
          </EmptyState>
        </div>
      </PainelShell>
    )
  }

  let operadores: OperadorRvData[] = []
  let dataAtualizacao: string | null = null
  let erroSheets: string | null = null

  try {
    const abaKpi = await resolverNomeAba(planilhaKpi.spreadsheet_id, 'KPI CONSOLIDADO').catch(() => 'KPI CONSOLIDADO')

    const [{ headers, rows }, absData] = await Promise.all([
      buscarLinhasPlanilha(planilhaKpi.spreadsheet_id, abaKpi, limiteLinhas),
      planilhaMes ? lerAbaABS(planilhaMes.spreadsheet_id).catch(() => null) : Promise.resolve(null),
    ])

    const col = encontrarColunaIdent(headers)
    dataAtualizacao = extrairDataAtualizacao(rows)
    const faltasPorOp = absData ? contarFaltasPorOperador(absData) : {}

    operadores = operadoresAtivos.map(op => {
      const row = rows.find(r => matchCelulaOperador(r[col] ?? '', op.username, op.nome))
      if (!row) {
        return { id: op.id, nome: op.nome, username: op.username, encontrado: false, resultado: null }
      }
      const metasIndividuais = buildMetasIndividuais(row, opConfigs)
      const kpis = computarKPIs(headers, row, metas, undefined, opConfigs, metasIndividuais)
      const faltasNoMes = faltasPorOp[op.username] ?? 0
      const { config: _cfg, ...rvData } = calcularRV(
        headers, row, rvConfig, op.username, kpis, op.id, mesReferencia, faltasNoMes,
        metasIndividuais['pedidos'] ?? null,
        metasIndividuais['churn'] ?? null,
      )
      return { id: op.id, nome: op.nome, username: op.username, encontrado: true, resultado: rvData }
    })
  } catch (e) {
    erroSheets = e instanceof Error ? e.message : 'Erro desconhecido ao carregar planilha'
  }

  return (
    <PainelShell profile={profile} title="RV Equipe" iconName="Coins">
      <div style={cssVars} className="space-y-4">
        {erroSheets && (
          <div className="flex items-start gap-3 rounded-xl border px-4 py-3"
            style={{ background: 'rgba(239,68,68,0.05)', borderColor: 'rgba(239,68,68,0.2)' }}>
            <AlertTriangle size={15} className="text-rose-400 shrink-0 mt-0.5" />
            <div>
              <p className="text-sm font-medium text-rose-300">Erro ao carregar dados</p>
              <p className="text-xs mt-0.5 text-rose-500">{erroSheets}</p>
            </div>
          </div>
        )}

        {!erroSheets && (
          <RvEquipeClient
            operadores={operadores}
            dataAtualizacao={dataAtualizacao ? formatarDataCurta(dataAtualizacao) : null}
            mesLabel={mesLabel}
          />
        )}
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
