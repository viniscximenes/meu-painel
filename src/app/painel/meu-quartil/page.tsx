import { getProfile } from '@/lib/auth'
import { redirect } from 'next/navigation'
import { getPlanilhaAtiva } from '@/lib/sheets'
import { lerTodosQuartis } from '@/lib/quartil-sheets'
import PainelShell from '@/components/PainelShell'
import MeuQuartilClient from './MeuQuartilClient'
import type { MeuQuartilProps } from './MeuQuartilClient'
import { AlertTriangle } from 'lucide-react'

export const dynamic = 'force-dynamic'

const cssVars = { '--void2': '#07070f', '--void3': '#0d0d1a' } as React.CSSProperties

export default async function MeuQuartilPage() {
  const profile = await getProfile()
  if (profile.role === 'gestor') redirect('/painel')

  const agora    = new Date()
  const mesLabel = agora.toLocaleDateString('pt-BR', { month: 'long', year: 'numeric' }).toUpperCase()

  const planilha = await getPlanilhaAtiva().catch(() => null)

  if (!planilha) {
    return (
      <PainelShell profile={profile} title="Meu Quartil" iconName="BarChart3">
        <div style={cssVars} className="space-y-4 login-grid-bg">
          <GoldLine />
          <div className="flex items-start gap-3 rounded-xl border px-4 py-3"
            style={{ background: 'rgba(239,68,68,0.05)', borderColor: 'rgba(239,68,68,0.2)' }}>
            <AlertTriangle size={15} className="text-rose-400 shrink-0 mt-0.5" />
            <p className="text-sm text-rose-300">Planilha não configurada.</p>
          </div>
        </div>
      </PainelShell>
    )
  }

  let dadosProps: MeuQuartilProps | null = null
  let erroSheets: string | null = null

  try {
    const topicos = await lerTodosQuartis(planilha.spreadsheet_id, profile.username)

    // Data de atualização vem apenas da aba TXRETENCAO (primeiro tópico)
    const dataAtualizacao = topicos[0]?.dataAtualizacao ?? null

    dadosProps = {
      mesLabel,
      dataAtualizacao,
      topicos: topicos.map(t => ({
        id:               t.id,
        nomeTopico:       t.nomeTopico,
        quartil:          t.operadorAtual?.quartil          ?? null,
        metricaFormatada: t.operadorAtual?.metricaFormatada ?? null,
        rankGlobal:       t.rankGlobal,
        totalOperadores:  t.totalOperadores,
      })),
    }
  } catch (e) {
    erroSheets = e instanceof Error ? e.message : 'Erro desconhecido'
  }

  return (
    <PainelShell profile={profile} title="Meu Quartil" iconName="BarChart3">
      <div style={cssVars} className="space-y-4 login-grid-bg">
        <GoldLine />

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

        {dadosProps && <MeuQuartilClient {...dadosProps} />}
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
