import { getProfile } from '@/lib/auth'
import { redirect } from 'next/navigation'
import {
  getPlanilhaAtiva,
  buscarLinhasPlanilha,
  encontrarColunaIdent,
  matchCelulaOperador,
} from '@/lib/sheets'
import { extrairABSeIndisp } from '@/lib/rv'
import { lerAbaABS } from '@/lib/abs-sheets'
import { getAppConfig } from '@/lib/app-config'
import PainelShell from '@/components/PainelShell'
import MeuABSClient from './MeuABSClient'
import type { MeuABSProps, DiaCalendario } from './MeuABSClient'
import { AlertTriangle, Settings } from 'lucide-react'
import Link from 'next/link'

export const dynamic = 'force-dynamic'

const DOW_NOMES = ['Dom', 'Seg', 'Ter', 'Qua', 'Qui', 'Sex', 'Sáb']

export default async function MeuABSPage() {
  const profile = await getProfile()
  if (profile.role === 'gestor') redirect('/painel')

  const [planilha, limiteRaw] = await Promise.all([
    getPlanilhaAtiva().catch(() => null),
    getAppConfig('kpi_consolidado_limite_linhas').catch(() => null),
  ])
  const limiteLinhas = limiteRaw ? parseInt(limiteRaw, 10) : 50

  const agora = new Date()
  const mesAtual = agora.getMonth() + 1
  const anoAtual = agora.getFullYear()
  const hojeNum = agora.getDate()
  const mesLabel = agora.toLocaleDateString('pt-BR', { month: 'long', year: 'numeric' }).toUpperCase()

  const cssVars = { '--void2': '#07070f', '--void3': '#0d0d1a' } as React.CSSProperties

  if (!planilha) {
    return (
      <PainelShell profile={profile} title="Meu ABS" iconName="CalendarDays">
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

  let dadosProps: MeuABSProps | null = null
  let erroSheets: string | null = null

  try {
    const [{ headers, rows }, absData] = await Promise.all([
      buscarLinhasPlanilha(planilha.spreadsheet_id, planilha.aba, limiteLinhas),
      lerAbaABS(planilha.spreadsheet_id).catch(() => null),
    ])

    // ABS% da planilha KPI
    const col = encontrarColunaIdent(headers)
    const meuRow = rows.find(r => matchCelulaOperador(r[col] ?? '', profile.username, profile.nome))
    const { absPercent } = meuRow ? extrairABSeIndisp(headers, meuRow) : { absPercent: 0 }

    // Linha do operador na aba ABS
    const meuABS = absData?.initialized
      ? (absData.operadores.find(op => op.username === profile.username) ?? null)
      : null

    const faltasNoMes  = meuABS?.status.filter(s => s === 'F').length ?? 0
    const presencasCount = meuABS?.status.filter(s => s === 'P').length ?? 0

    // Construir dias do calendário
    const diasNoMes = new Date(anoAtual, mesAtual, 0).getDate()
    const primeiroDow = new Date(anoAtual, mesAtual - 1, 1).getDay()

    const dias: DiaCalendario[] = []
    for (let d = 1; d <= diasNoMes; d++) {
      const date = new Date(anoAtual, mesAtual - 1, d)
      const dow = date.getDay()
      const isDomingo = dow === 0
      const isFuturo = d > hojeNum
      const isHoje = d === hojeNum

      let status: string | null = null
      if (meuABS && !isDomingo) {
        const dataStr = `${String(d).padStart(2, '0')}/${String(mesAtual).padStart(2, '0')}`
        const idx = absData!.datas.indexOf(dataStr)
        if (idx >= 0) {
          const s = meuABS.status[idx]
          status = s && s !== '-' ? s : null
        }
      }

      dias.push({
        dia: d,
        diaSemana: DOW_NOMES[dow],
        status,
        isDomingo,
        isFuturo,
        isHoje,
      })
    }

    dadosProps = {
      nomeOperador: profile.nome,
      mesLabel,
      absPercent,
      faltasNoMes,
      presencasCount,
      dias,
      primeiroDow,
      mesAtual,
      anoAtual,
    }
  } catch (e) {
    erroSheets = e instanceof Error ? e.message : 'Erro desconhecido'
  }

  return (
    <PainelShell profile={profile} title="Meu ABS" iconName="CalendarDays">
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
            Meu ABS
          </span>
          <div style={{ width: '1px', height: '16px', background: 'rgba(201,168,76,0.2)' }} />
          <span style={{ fontSize: '11px', textTransform: 'uppercase', letterSpacing: '0.06em', color: 'var(--text-muted)' }}>
            {dadosProps?.nomeOperador.split(' ').slice(0, 2).join(' ')}
          </span>
          <div style={{ width: '1px', height: '16px', background: 'rgba(201,168,76,0.2)' }} />
          <span style={{ fontSize: '11px', color: 'var(--text-muted)' }}>{mesLabel}</span>
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

        {dadosProps && <MeuABSClient {...dadosProps} />}
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
