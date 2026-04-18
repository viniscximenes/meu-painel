import { getProfile } from '@/lib/auth'
import { redirect } from 'next/navigation'
import { getRVConfig, calcularRV, extrairABSeIndisp } from '@/lib/rv'
import { getPlanilhaAtiva, buscarLinhasPlanilha, encontrarColunaIdent, matchCelulaOperador } from '@/lib/sheets'
import { lerAbaABS, contarFaltasPorOperador } from '@/lib/abs-sheets'
import { getAppConfig } from '@/lib/app-config'
import { getMetas, computarKPIs } from '@/lib/kpi'
import PainelShell from '@/components/PainelShell'
import CalculadoraRVClient from './CalculadoraRVClient'
import type { CalculadoraRVProps } from './CalculadoraRVClient'
import { AlertTriangle } from 'lucide-react'

export const dynamic = 'force-dynamic'

const cssVars = { '--void2': '#07070f', '--void3': '#0d0d1a' } as React.CSSProperties

export default async function CalculadoraRVPage() {
  const profile = await getProfile()
  if (profile.role === 'gestor') redirect('/painel')

  const agora = new Date()
  const mesLabel = agora.toLocaleDateString('pt-BR', { month: 'long', year: 'numeric' }).toUpperCase()
  const mesReferencia = agora.toISOString().slice(0, 7)

  const [rvConfig, planilha, metas, limiteRaw] = await Promise.all([
    getRVConfig(),
    getPlanilhaAtiva().catch(() => null),
    getMetas().catch(() => []),
    getAppConfig('kpi_consolidado_limite_linhas').catch(() => null),
  ])
  const limiteLinhas = limiteRaw ? parseInt(limiteRaw, 10) : 50

  let txRetracaoAtual = 0
  let tmaAtualSeg     = 0
  let absAtual        = 0
  let indispAtual     = 0
  let faltasAtual     = 0
  let pedidosAtual    = 0
  let ticketAtual     = 0
  let rvAtual                = 0
  let elegivelAtual          = false
  let motivosInelegivelAtual: string[] = []
  let semDadosKpi            = true
  let erroSheets: string | null = null

  if (planilha) {
    try {
      const [{ headers, rows }, absData] = await Promise.all([
        buscarLinhasPlanilha(planilha.spreadsheet_id, planilha.aba, limiteLinhas),
        lerAbaABS(planilha.spreadsheet_id).catch(() => null),
      ])

      const col    = encontrarColunaIdent(headers)
      const meuRow = rows.find(r => matchCelulaOperador(r[col] ?? '', profile.username, profile.nome))

      if (meuRow) {
        const kpis      = computarKPIs(headers, meuRow, metas)
        const faltasMap = absData ? contarFaltasPorOperador(absData) : {}
        faltasAtual     = faltasMap[profile.username] ?? 0

        const resultado = calcularRV(
          headers, meuRow, rvConfig, profile.username,
          kpis, profile.operador_id ?? 0, mesReferencia, faltasAtual,
        )

        const compRet    = resultado.componentes.find(c => c.id === 'retracao')
        const compTma    = resultado.componentes.find(c => c.id === 'tma')
        const compIndisp = resultado.componentes.find(c => c.id === 'indisp')
        const compTicket = resultado.componentes.find(c => c.id === 'ticket')

        txRetracaoAtual = compRet?.valorNum    ?? 0
        tmaAtualSeg     = compTma?.valorNum    ?? 0
        indispAtual     = compIndisp?.valorNum ?? 0
        ticketAtual     = compTicket?.valorNum ?? 0
        pedidosAtual    = resultado.pedidosRealizados

        const { absPercent } = extrairABSeIndisp(headers, meuRow)
        absAtual = absPercent

        rvAtual                = resultado.rvFinal
        elegivelAtual          = resultado.elegivel
        motivosInelegivelAtual = resultado.motivosInelegivel
        semDadosKpi            = resultado.semDados
      }
    } catch (e) {
      erroSheets = e instanceof Error ? e.message : 'Erro desconhecido'
    }
  }

  const dadosProps: CalculadoraRVProps = {
    rvConfig,
    txRetracaoAtual,
    tmaAtualSeg,
    absAtual,
    indispAtual,
    faltasAtual,
    pedidosAtual,
    ticketAtual,
    rvAtual,
    elegivelAtual,
    motivosInelegivelAtual,
    nomeOperador: profile.nome,
    mesLabel,
    semDadosKpi,
  }

  return (
    <PainelShell profile={profile} title="Calculadora RV" iconName="Calculator">
      <div style={cssVars} className="space-y-4">
        <GoldLine />

        {/* Header */}
        <div style={{
          background: 'var(--void2)',
          border: '1px solid rgba(201,168,76,0.1)',
          borderRadius: '14px',
          padding: '14px 20px',
        }}>
          <span style={{
            fontFamily: 'var(--ff-display)',
            fontSize: '16px', fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.06em',
            background: 'linear-gradient(135deg, #e8c96d 0%, #c9a84c 100%)',
            WebkitBackgroundClip: 'text', WebkitTextFillColor: 'transparent', backgroundClip: 'text',
            display: 'block',
          }}>
            Calculadora de RV
          </span>
          <p style={{ fontSize: '12px', color: 'var(--text-muted)', marginTop: '4px' }}>
            Simule diferentes cenários para o fechamento do mês
          </p>
        </div>

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

        <CalculadoraRVClient {...dadosProps} />
      </div>
    </PainelShell>
  )
}

function GoldLine() {
  return (
    <div style={{
      height: '1px',
      background: 'linear-gradient(90deg, transparent 0%, #c9a84c 25%, #e8c96d 50%, #c9a84c 75%, transparent 100%)',
    }} />
  )
}
