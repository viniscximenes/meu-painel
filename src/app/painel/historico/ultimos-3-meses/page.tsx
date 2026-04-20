import { getProfile } from '@/lib/auth'
import { redirect } from 'next/navigation'
import { getMetas, computarKPIs } from '@/lib/kpi'
import { normalizarChave } from '@/lib/kpi-utils'
import {
  getUltimasNPlanilhasHistorico,
  buscarLinhasPlanilha,
  encontrarColunaIdent,
  matchCelulaOperador,
  formatarDataCurta,
  extrairDataAtualizacao,
} from '@/lib/sheets'
import PainelShell from '@/components/PainelShell'
import Ultimos3MesesClient, { type MesHistorico, type Ultimos3MesesProps } from './Ultimos3MesesClient'
import { AlertTriangle, History } from 'lucide-react'

const COLUNAS_COMPLEMENTARES = [
  '% Variação Ticket','Retidos Brutos','Retidos Líquidos 15d',
  'Tx. Retenção Líquida 15d (%)','Atendidas','Transfer (%)','Short Call (%)',
  'Rechamada D+7 (%)','Tx. Tabulação (%)','CSAT','Engajamento',
  'Tempo Projetado','Tempo de Login','Logins Mês','NR17 (%)','Pessoal','Pessoal (%)',
  'Outras Pausas','Outras Pausas (%)',
]

const MESES_PT = [
  'Janeiro','Fevereiro','Março','Abril','Maio','Junho',
  'Julho','Agosto','Setembro','Outubro','Novembro','Dezembro',
]

export const dynamic = 'force-dynamic'

const cssVars = { '--void2': '#07070f', '--void3': '#0d0d1a' } as React.CSSProperties

export default async function Ultimos3MesesPage() {
  const profile = await getProfile()
  if (profile.role === 'gestor') redirect('/painel')

  const [planilhas, metas] = await Promise.all([
    getUltimasNPlanilhasHistorico(3),
    getMetas().catch(() => []),
  ])

  let erroGeral: string | null = null
  let dadosProps: Ultimos3MesesProps | null = null

  try {
    const mesesData = await Promise.all(
      planilhas.map(async (planilha): Promise<MesHistorico> => {
        const mesLabel = planilha.referencia_mes && planilha.referencia_ano
          ? `${MESES_PT[planilha.referencia_mes - 1]} ${planilha.referencia_ano}`
          : planilha.nome

        try {
          const { headers, rows } = await buscarLinhasPlanilha(
            planilha.spreadsheet_id,
            planilha.aba,
            100,
          )

          if (!headers.length) {
            return { planilhaNome: planilha.nome, mesLabel, dataAtualizacao: null, kpis: [], complementares: [] }
          }

          const col = encontrarColunaIdent(headers)
          const dataAtualizacao = extrairDataAtualizacao(rows)
          const meuRow = rows.find(r => matchCelulaOperador(r[col] ?? '', profile.username, profile.nome))

          if (!meuRow) {
            return { planilhaNome: planilha.nome, mesLabel, dataAtualizacao: dataAtualizacao ? formatarDataCurta(dataAtualizacao) : null, kpis: [], complementares: [] }
          }

          const kpis = computarKPIs(headers, meuRow, metas)

          const complementares = COLUNAS_COMPLEMENTARES
            .map(nome => {
              const key = normalizarChave(nome)
              const idx = headers.findIndex(h => normalizarChave(h) === key)
              return { label: nome, valor: idx >= 0 ? (meuRow[idx] ?? '—') : '—' }
            })
            .filter(d => d.valor !== '—' && d.valor !== '')

          return {
            planilhaNome: planilha.nome,
            mesLabel,
            dataAtualizacao: dataAtualizacao ? formatarDataCurta(dataAtualizacao) : null,
            kpis,
            complementares,
          }
        } catch {
          return { planilhaNome: planilha.nome, mesLabel, dataAtualizacao: null, kpis: [], complementares: [] }
        }
      })
    )

    dadosProps = { meses: mesesData }
  } catch (e) {
    erroGeral = e instanceof Error ? e.message : 'Erro desconhecido'
  }

  return (
    <PainelShell profile={profile} title="Histórico" iconName="History">
      <div style={cssVars} className="space-y-4 login-grid-bg">
        <GoldLine />

        {/* Header */}
        <div style={{
          background: 'var(--void2)',
          border: '1px solid rgba(201,168,76,0.1)',
          borderRadius: '12px',
          padding: '14px 20px',
          display: 'flex', alignItems: 'center', gap: '12px',
        }}>
          <History size={16} style={{ color: 'rgba(244,212,124,0.7)', flexShrink: 0 }} />
          <span style={{
            fontFamily: 'var(--ff-display)',
            fontSize: '16px', fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.06em',
            background: 'linear-gradient(135deg, #e8c96d 0%, #c9a84c 100%)',
            WebkitBackgroundClip: 'text', WebkitTextFillColor: 'transparent', backgroundClip: 'text',
          }}>
            Últimos 3 Meses
          </span>
          <div style={{ width: '1px', height: '16px', background: 'rgba(201,168,76,0.2)' }} />
          <span style={{ fontSize: '11px', color: 'var(--text-muted)' }}>
            {planilhas.length} {planilhas.length === 1 ? 'mês disponível' : 'meses disponíveis'}
          </span>
        </div>

        {erroGeral && (
          <div className="flex items-start gap-3 rounded-xl border px-4 py-3"
            style={{ background: 'rgba(239,68,68,0.05)', borderColor: 'rgba(239,68,68,0.2)' }}>
            <AlertTriangle size={15} className="text-rose-400 shrink-0 mt-0.5" />
            <div>
              <p className="text-sm font-medium text-rose-300">Erro ao carregar histórico</p>
              <p className="text-xs mt-0.5 text-rose-500">{erroGeral}</p>
            </div>
          </div>
        )}

        {dadosProps && <Ultimos3MesesClient {...dadosProps} />}
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
