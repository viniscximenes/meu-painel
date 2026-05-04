import { redirect } from 'next/navigation'
import { getProfile } from '@/lib/auth'
import { getMetas, computarKPIs, getMetasOperadorConfig } from '@/lib/kpi'
import { normalizarChave } from '@/lib/kpi-utils'
import type { MetaOperadorConfig } from '@/lib/kpi-utils'
import { getPlanilhaAtiva, buscarLinhaOperador } from '@/lib/sheets'
import { buildMetasIndividuais } from '@/lib/kpi-coluna-utils'
import PainelShell from '@/components/PainelShell'
import KPIBasico from '@/components/kpi/KPIBasico'
import KPICompleto from '@/components/kpi/KPICompleto'
import { AlertTriangle, Settings } from 'lucide-react'
import Link from 'next/link'

const COLUNAS_COMPLEMENTARES = [
  '% Variação Ticket',
  'Retidos Brutos',
  'Retidos Líquidos 15d',
  'Tx. Retenção Líquida 15d (%)',
  'Atendidas',
  'Transfer (%)',
  'Short Call (%)',
  'Rechamada D+7 (%)',
  'Tx. Tabulação (%)',
  'CSAT',
  'Engajamento',
  'Tempo Projetado',
  'Tempo de Login',
  'NR17 (%)',
  'Pessoal',
  'Pessoal (%)',
  'Outras Pausas',
  'Outras Pausas (%)',
]

interface PageProps {
  searchParams: Promise<{ view?: string }>
}

export default async function KPIPage({ searchParams }: PageProps) {
  const profile = await getProfile()

  if (profile.role === 'gestor') redirect('/painel/kpis-equipe')

  const { view } = await searchParams
  const completo = view === 'completo'

  const [planilha, metas, opConfigs] = await Promise.all([
    getPlanilhaAtiva(),
    getMetas(),
    getMetasOperadorConfig().catch(() => ({} as Record<string, MetaOperadorConfig>)),
  ])

  if (!planilha) {
    return (
      <PainelShell profile={profile} title="Meus KPIs" iconName="UserCircle">
        <AvisoSemPlanilha />
      </PainelShell>
    )
  }

  const resultado = await buscarLinhaOperador(profile.username, planilha.spreadsheet_id, planilha.aba)

  if (!resultado) {
    return (
      <PainelShell profile={profile} title="Meus KPIs" iconName="UserCircle">
        <AvisoSemDados username={profile.username} planilhaNome={planilha.nome} />
      </PainelShell>
    )
  }

  const metasIndividuais = buildMetasIndividuais(resultado.row, opConfigs)
  const kpis = computarKPIs(resultado.headers, resultado.row, metas, undefined, opConfigs, metasIndividuais)

  const dadosComplementares = COLUNAS_COMPLEMENTARES.map((nome) => {
    const key = normalizarChave(nome)
    const idx = resultado.headers.findIndex((h) => normalizarChave(h) === key)
    return { label: nome, valor: idx >= 0 ? (resultado.row[idx] ?? '—') : '—' }
  }).filter((d) => d.valor !== '—' && d.valor !== '')

  return (
    <PainelShell profile={profile} title={completo ? 'KPI Completo' : 'Meus KPIs'} iconName="UserCircle">
      {completo ? (
        <KPICompleto kpis={kpis} nomeOperador={profile.nome} linkVoltar="/painel/kpi" podeOrdenar={false} />
      ) : (
        <div className="space-y-8">
          <KPIBasico kpis={kpis} nomeOperador={profile.nome} />

          {dadosComplementares.length > 0 && (
            <div className="space-y-4">
              <div className="flex items-center gap-3">
                <span className="text-xs font-bold uppercase" style={{ color: 'var(--text-muted)', letterSpacing: '0.10em' }}>
                  Dados Complementares
                </span>
                <div style={{ flex: 1, height: 1, background: 'linear-gradient(90deg, rgba(255,255,255,0.08) 0%, transparent 100%)' }} />
              </div>

              <div
                className="grid gap-2"
                style={{ gridTemplateColumns: 'repeat(auto-fill, minmax(130px, 1fr))' }}
              >
                {dadosComplementares.map(({ label, valor }) => (
                  <div
                    key={label}
                    className="rounded-xl px-3 py-2.5"
                    style={{
                      background: 'rgba(255,255,255,0.02)',
                      border: '1px solid rgba(255,255,255,0.06)',
                    }}
                  >
                    <p className="text-[10px] uppercase truncate" style={{ color: 'var(--text-muted)', letterSpacing: '0.06em' }}>
                      {label}
                    </p>
                    <p className="text-base font-semibold mt-0.5 tabular-nums" style={{ color: 'var(--text-primary)' }}>
                      {valor}
                    </p>
                  </div>
                ))}
              </div>
            </div>
          )}
        </div>
      )}
    </PainelShell>
  )
}

function AvisoSemPlanilha() {
  return (
    <div className="flex flex-col items-center justify-center min-h-[50vh] gap-4 text-center">
      <div
        className="w-14 h-14 rounded-2xl flex items-center justify-center"
        style={{ background: 'rgba(201,168,76,0.08)' }}
      >
        <Settings size={24} style={{ color: 'var(--gold)' }} />
      </div>
      <div>
        <h3 className="font-semibold text-lg" style={{ color: 'var(--text-primary)' }}>
          Planilha não configurada
        </h3>
        <p className="text-sm mt-1 max-w-xs" style={{ color: 'var(--text-muted)' }}>
          A supervisão ainda não ativou nenhuma planilha.
        </p>
      </div>
    </div>
  )
}

function AvisoSemDados({ username, planilhaNome }: { username: string; planilhaNome: string }) {
  return (
    <div className="flex flex-col items-center justify-center min-h-[50vh] gap-4 text-center">
      <div
        className="w-14 h-14 rounded-2xl flex items-center justify-center"
        style={{ background: 'rgba(245,158,11,0.08)' }}
      >
        <AlertTriangle size={24} className="text-amber-400" />
      </div>
      <div>
        <h3 className="font-semibold text-lg" style={{ color: 'var(--text-primary)' }}>
          Dados não encontrados
        </h3>
        <p className="text-sm mt-1 max-w-sm" style={{ color: 'var(--text-muted)' }}>
          Nenhuma linha para <strong style={{ color: 'var(--text-secondary)' }}>{username}</strong>{' '}
          na planilha <strong style={{ color: 'var(--text-secondary)' }}>{planilhaNome}</strong>.
        </p>
        <p className="text-xs mt-2" style={{ color: 'var(--text-muted)' }}>
          Verifique se a coluna de email/usuário contém o seu login.
        </p>
      </div>
    </div>
  )
}
