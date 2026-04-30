import { requireGestorOuAdmin } from '@/lib/auth'
import { createAdminClient } from '@/lib/supabase/admin'
import PainelShell from '@/components/PainelShell'
import { getPlanilhaAtiva } from '@/lib/sheets'
import { lerKpiConsolidado } from '@/lib/kpi-consolidado-sheets'
import { buscarDiario } from '@/lib/diario'
import { OPERADORES_DISPLAY } from '@/lib/operadores'
import { calcularContestacao } from '@/lib/contestacao-utils'
import type { OperadorContestacao } from '@/lib/contestacao-utils'
import CopiarEColarClient from './CopiarEColarClient'
import { AlertTriangle, Settings } from 'lucide-react'

export const dynamic = 'force-dynamic'

export default async function CopiarEColarPage() {
  const profile  = await requireGestorOuAdmin()
  const planilha = await getPlanilhaAtiva().catch(() => null)

  const cssVars = { '--void2': '#07070f', '--void3': '#0d0d1a' } as React.CSSProperties

  if (!planilha) {
    return (
      <PainelShell profile={profile} title="Copiar e Colar" iconName="Copy">
        <div style={cssVars} className="p-6 space-y-4">
          <GoldLine />
          <EmptyState icon={<Settings size={24} style={{ color: 'var(--gold)' }} />}>
            <strong>Planilha não configurada</strong>
            <span style={{ color: 'var(--text-muted)', fontSize: '13px' }}>
              A supervisão ainda não ativou nenhuma planilha.
            </span>
          </EmptyState>
        </div>
      </PainelShell>
    )
  }

  let mesFiltro: number
  let anoFiltro: number
  if (planilha.referencia_mes && planilha.referencia_ano) {
    mesFiltro = planilha.referencia_mes
    anoFiltro = planilha.referencia_ano
  } else {
    const hoje = new Date()
    const anterior = new Date(hoje.getFullYear(), hoje.getMonth() - 1, 1)
    mesFiltro = anterior.getMonth() + 1
    anoFiltro = anterior.getFullYear()
  }

  const mesLabel = new Date(anoFiltro, mesFiltro - 1, 1)
    .toLocaleDateString('pt-BR', { month: 'long', year: 'numeric' })
    .toUpperCase()

  let operadores: OperadorContestacao[] = []
  let erroSheets: string | null = null
  let dataAtualizacao: string | null = null

  try {
    const admin = createAdminClient()
    const [kpiData, todosRegistros, profilesRes] = await Promise.all([
      lerKpiConsolidado(planilha.spreadsheet_id, planilha.aba),
      buscarDiario(planilha.spreadsheet_id),
      admin.from('profiles').select('operador_id, email, ativo').not('operador_id', 'is', null),
    ])

    dataAtualizacao = kpiData.dataAtualizacao

    const profileMap = new Map<number, string>()
    const ativosIds = new Set<number>()
    for (const p of (profilesRes.data ?? [])) {
      if (p.operador_id && p.email) profileMap.set(p.operador_id, p.email)
      if (p.operador_id && (p.ativo ?? true)) ativosIds.add(p.operador_id)
    }
    const operadoresAtivos = OPERADORES_DISPLAY.filter(op => ativosIds.has(op.id))

    const registrosMes = todosRegistros.filter(r => {
      if (!r.dataObj) return false
      return r.dataObj.getMonth() + 1 === mesFiltro && r.dataObj.getFullYear() === anoFiltro
    })

    operadores = operadoresAtivos.map(op => {
      const kpiRow = kpiData.operadores.find(k => k.id === op.id) ?? {
        id: op.id, nome: op.nome, username: op.username, encontrado: false,
        pedidos: null, churn: null, txRetBrutaPct: null, tmaSeg: null,
        absPct: null, indispPct: null,
        varTicket: '—', txRetLiq15d: '—', atendidas: '—', transfer: '—',
        shortCall: '—', rechamadaD7: '—', txTabulacao: '—', csat: '—',
        engajamento: '—', tempoProjetado: '—', tempoLogin: '—',
        nr17: '—', pessoal: '—', outrasPausas: '—',
      }
      const contestacao = calcularContestacao(kpiRow, registrosMes)
      contestacao.operadorEmail = profileMap.get(op.id) ?? ''
      return contestacao
    })
  } catch (e) {
    erroSheets = e instanceof Error ? e.message : 'Erro desconhecido'
  }

  const comRegistros = operadores.filter(op => op.registros.length > 0)

  return (
    <PainelShell profile={profile} title="Copiar e Colar" iconName="Copy">
      <div style={cssVars} className="p-6 space-y-4">
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

        {!erroSheets && (
          <CopiarEColarClient
            operadores={comRegistros}
            todosOperadores={operadores}
            mesLabel={mesLabel}
            dataAtualizacao={dataAtualizacao}
          />
        )}
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
