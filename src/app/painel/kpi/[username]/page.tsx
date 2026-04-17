import { notFound } from 'next/navigation'
import { requireGestor } from '@/lib/auth'
import { getMetas, computarKPIs } from '@/lib/kpi'
import { normalizarChave } from '@/lib/kpi-utils'
import { getPlanilhaAtiva, buscarLinhaOperador } from '@/lib/sheets'
import { OPERADORES } from '@/lib/operadores'
import PainelShell from '@/components/PainelShell'
import KPIBasico from '@/components/kpi/KPIBasico'
import KPICompleto from '@/components/kpi/KPICompleto'
import { AlertTriangle } from 'lucide-react'

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
  params: Promise<{ username: string }>
  searchParams: Promise<{ view?: string }>
}

export default async function KPIOperadorPage({ params, searchParams }: PageProps) {
  const { username } = await params
  const { view } = await searchParams
  const completo = view === 'completo'

  const profile = await requireGestor()
  const operador = OPERADORES.find((o) => o.username === username)
  if (!operador) notFound()

  const [planilha, metas] = await Promise.all([getPlanilhaAtiva(), getMetas()])

  if (!planilha) {
    return (
      <PainelShell profile={profile} title={`KPI — ${operador.nome}`}>
        <div className="flex flex-col items-center justify-center min-h-[50vh] gap-3 text-center">
          <p className="text-sm" style={{ color: 'var(--text-muted)' }}>
            Nenhuma planilha ativa configurada.
          </p>
        </div>
      </PainelShell>
    )
  }

  const resultado = await buscarLinhaOperador(username, planilha.spreadsheet_id, planilha.aba)

  if (!resultado) {
    return (
      <PainelShell profile={profile} title={`KPI — ${operador.nome}`}>
        <div className="flex flex-col items-center justify-center min-h-[50vh] gap-4 text-center">
          <div
            className="w-14 h-14 rounded-2xl flex items-center justify-center"
            style={{ background: 'rgba(245,158,11,0.08)' }}
          >
            <AlertTriangle size={24} className="text-amber-400" />
          </div>
          <div>
            <h3 className="font-semibold" style={{ color: 'var(--text-primary)' }}>
              Dados não encontrados
            </h3>
            <p className="text-sm mt-1" style={{ color: 'var(--text-muted)' }}>
              Nenhuma linha para <strong style={{ color: 'var(--text-secondary)' }}>{username}</strong>{' '}
              na planilha <strong style={{ color: 'var(--text-secondary)' }}>{planilha.nome}</strong>.
            </p>
          </div>
        </div>
      </PainelShell>
    )
  }

  const kpis = computarKPIs(resultado.headers, resultado.row, metas)
  const linkBase = `/painel/kpi/${username}`

  const dadosComplementares = COLUNAS_COMPLEMENTARES.map((nome) => {
    const key = normalizarChave(nome)
    const idx = resultado.headers.findIndex((h) => normalizarChave(h) === key)
    return { label: nome, valor: idx >= 0 ? (resultado.row[idx] ?? '—') : '—' }
  }).filter((d) => d.valor !== '—' && d.valor !== '')

  return (
    <PainelShell profile={profile} title={`KPI — ${operador.nome}`}>
      {completo ? (
        <KPICompleto kpis={kpis} nomeOperador={operador.nome} linkVoltar={linkBase} podeOrdenar={true} />
      ) : (
        <div className="space-y-8">
          <KPIBasico kpis={kpis} nomeOperador={operador.nome} />

          {dadosComplementares.length > 0 && (
            <div className="space-y-4">
              {/* Divider */}
              <div className="flex items-center gap-3">
                <span className="text-xs font-bold uppercase" style={{ color: 'var(--text-muted)', letterSpacing: '0.10em' }}>
                  Dados Complementares
                </span>
                <div style={{ flex: 1, height: 1, background: 'linear-gradient(90deg, rgba(255,255,255,0.08) 0%, transparent 100%)' }} />
              </div>

              {/* Grid */}
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
