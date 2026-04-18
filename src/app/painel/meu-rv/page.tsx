import { getProfile } from '@/lib/auth'
import { redirect } from 'next/navigation'
import { getMetas, computarKPIs } from '@/lib/kpi'
import {
  getPlanilhaAtiva,
  buscarLinhasPlanilha,
  encontrarColunaIdent,
  matchCelulaOperador,
  formatarDataCurta,
  extrairDataAtualizacao,
} from '@/lib/sheets'
import { getRVConfig, calcularRV, extrairABSeIndisp } from '@/lib/rv'
import { lerAbaABS, contarFaltasPorOperador } from '@/lib/abs-sheets'
import { getAppConfig } from '@/lib/app-config'
import PainelShell from '@/components/PainelShell'
import MeuRVClient from './MeuRVClient'
import type { MeuRVProps } from './MeuRVClient'
import { AlertTriangle, Settings } from 'lucide-react'
import Link from 'next/link'

export const dynamic = 'force-dynamic'

export default async function MeuRVPage() {
  const profile = await getProfile()
  if (profile.role === 'gestor') redirect('/painel')

  const [planilha, rvConfig, metas, limiteRaw] = await Promise.all([
    getPlanilhaAtiva().catch(() => null),
    getRVConfig().catch(() => null),
    getMetas().catch(() => []),
    getAppConfig('kpi_consolidado_limite_linhas').catch(() => null),
  ])
  const limiteLinhas = limiteRaw ? parseInt(limiteRaw, 10) : 50

  const agora = new Date()
  const mesLabel = agora.toLocaleDateString('pt-BR', { month: 'long', year: 'numeric' }).toUpperCase()
  const mesReferencia = agora.toISOString().slice(0, 7)

  const cssVars = { '--void2': '#07070f', '--void3': '#0d0d1a' } as React.CSSProperties

  if (!planilha || !rvConfig) {
    return (
      <PainelShell profile={profile} title="Meu RV" iconName="CircleDollarSign">
        <div style={cssVars} className="space-y-4">
          <GoldLine />
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
    const [{ headers, rows }, absData] = await Promise.all([
      buscarLinhasPlanilha(planilha.spreadsheet_id, planilha.aba, limiteLinhas),
      lerAbaABS(planilha.spreadsheet_id).catch(() => null),
    ])

    const col = encontrarColunaIdent(headers)
    const dataAtualizacao = extrairDataAtualizacao(rows)
    const faltasPorOp = absData ? contarFaltasPorOperador(absData) : {}
    const faltasNoMes = faltasPorOp[profile.username] ?? 0

    const meuRow = rows.find(r => matchCelulaOperador(r[col] ?? '', profile.username, profile.nome))

    if (!meuRow) {
      return (
        <PainelShell profile={profile} title="Meu RV" iconName="CircleDollarSign">
          <div style={cssVars} className="space-y-4">
            <GoldLine />
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

    const kpis = computarKPIs(headers, meuRow, metas)
    const { absPercent: absValAtual } = extrairABSeIndisp(headers, meuRow)
    const resultado = calcularRV(
      headers, meuRow, rvConfig, profile.username,
      kpis, profile.operador_id ?? 0, mesReferencia, faltasNoMes,
    )

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
    <PainelShell profile={profile} title="Meu RV" iconName="CircleDollarSign">
      <div style={cssVars} className="space-y-4">
        <GoldLine />

        {/* Header */}
        <div style={{
          background: 'var(--void2)',
          border: '1px solid rgba(201,168,76,0.1)',
          borderRadius: '14px',
          padding: '14px 20px',
          display: 'flex',
          alignItems: 'center',
          gap: '16px',
          flexWrap: 'wrap',
        }}>
          <span style={{
            fontFamily: 'var(--ff-display)',
            fontSize: '16px', fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.06em',
            background: 'linear-gradient(135deg, #e8c96d 0%, #c9a84c 100%)',
            WebkitBackgroundClip: 'text', WebkitTextFillColor: 'transparent', backgroundClip: 'text',
          }}>
            Meu RV
          </span>
          <div style={{ width: '1px', height: '16px', background: 'rgba(201,168,76,0.2)' }} />
          <span style={{ fontSize: '11px', textTransform: 'uppercase', letterSpacing: '0.06em', color: 'var(--text-muted)' }}>
            {dadosProps?.nomeOperador.split(' ').slice(0, 2).join(' ')}
          </span>
          <div style={{ width: '1px', height: '16px', background: 'rgba(201,168,76,0.2)' }} />
          <span style={{ fontSize: '11px', color: 'var(--text-muted)' }}>{mesLabel}</span>
          {dadosProps?.dataAtualizacao && (
            <>
              <div style={{ width: '1px', height: '16px', background: 'rgba(201,168,76,0.2)' }} />
              <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
                <div className="animate-pulse" style={{ width: '6px', height: '6px', borderRadius: '50%', background: '#10b981' }} />
                <span style={{ fontSize: '11px', color: 'var(--text-muted)' }}>
                  Até <strong style={{ color: 'var(--text-secondary)', fontWeight: 600 }}>{dadosProps.dataAtualizacao}</strong>
                </span>
              </div>
            </>
          )}
        </div>

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

function GoldLine() {
  return (
    <div style={{
      height: '1px',
      background: 'linear-gradient(90deg, transparent 0%, #c9a84c 25%, #e8c96d 50%, #c9a84c 75%, transparent 100%)',
    }} />
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
