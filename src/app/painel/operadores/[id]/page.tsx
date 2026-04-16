import { notFound } from 'next/navigation'
import { requireOperador } from '@/lib/auth'
import PainelShell from '@/components/PainelShell'
import MetricCard from '@/components/MetricCard'
import { getOperadorPorId, getAvatarStyle, getIniciaisNome, OPERADORES } from '@/lib/operadores'
import { getMetas, computarKPIs } from '@/lib/kpi'
import { getPlanilhaAtiva, buscarLinhasPlanilha, encontrarColunaIdent, extrairDataAtualizacao, formatarDataPtBR, matchCelulaOperador } from '@/lib/sheets'
import KPIBasico from '@/components/kpi/KPIBasico'
import { buscarDiarioAtivo, filtrarPorOperador, totalPausasJustificadas, formatTempo } from '@/lib/diario'
import { BarChart2, CalendarCheck, Target, BookOpen, ChevronRight } from 'lucide-react'
import Link from 'next/link'

interface PageProps {
  params: Promise<{ id: string }>
}

export default async function OperadorDetalhe({ params }: PageProps) {
  const { id } = await params
  const operadorId = parseInt(id, 10)

  if (isNaN(operadorId) || operadorId < 1) notFound()

  const operador = getOperadorPorId(operadorId)
  if (!operador) notFound()

  const profile = await requireOperador(operadorId)

  const [planilha, metas, { registros: todosRegistros }] = await Promise.all([
    getPlanilhaAtiva(),
    getMetas(),
    buscarDiarioAtivo(),
  ])
  const registrosDiario = filtrarPorOperador(todosRegistros, operador.username, operador.nome)
  const minPausas = totalPausasJustificadas(registrosDiario)

  let kpis: ReturnType<typeof computarKPIs> = []
  let dataAtualizacao: string | null = null

  if (planilha) {
    const { headers, rows } = await buscarLinhasPlanilha(planilha.spreadsheet_id, planilha.aba)
    const col = encontrarColunaIdent(headers)
    dataAtualizacao = extrairDataAtualizacao(rows)

    const row = rows.find((r) =>
      matchCelulaOperador(r[col] ?? '', operador.username, operador.nome)
    )
    if (row) kpis = computarKPIs(headers, row, metas)
  }

  const metasAtingidas = kpis.filter((k) => k.status === 'verde').length
  const totalComMeta   = kpis.filter((k) => k.status !== 'neutro').length
  const dataLabel      = dataAtualizacao ? `Atualizado até ${formatarDataPtBR(dataAtualizacao)}` : 'Última consulta'
  const dataValor      = dataAtualizacao ?? new Date().toLocaleTimeString('pt-BR', { hour: '2-digit', minute: '2-digit' })

  return (
    <PainelShell profile={profile} title={operador.nome}>
      <div className="space-y-8">
        {/* Cabeçalho do operador */}
        <div className="card flex items-center gap-5">
          <div
            className="w-14 h-14 rounded-2xl flex items-center justify-center text-lg font-bold shrink-0 border-2"
            style={getAvatarStyle(operador.id)}
          >
            {getIniciaisNome(operador.nome)}
          </div>
          <div className="flex-1">
            <div className="flex items-center gap-2 flex-wrap">
              <h2 className="text-xl font-bold" style={{ color: 'var(--text-primary)' }}>
                {operador.nome}
              </h2>
            </div>
            <p className="text-sm mt-0.5" style={{ color: 'var(--text-muted)' }}>{operador.username}</p>
          </div>
          <div className="hidden sm:flex flex-col items-end gap-1">
            <span className="w-2.5 h-2.5 rounded-full bg-emerald-400 inline-block animate-dotPulse" style={{ boxShadow: '0 0 8px rgba(16,185,129,0.5)' }} />
            <span className="text-xs" style={{ color: 'var(--text-muted)' }}>Ativo</span>
          </div>
        </div>

        {/* Métricas */}
        <div className="grid grid-cols-1 sm:grid-cols-2 xl:grid-cols-3 gap-4">
          <MetricCard
            label="Metas Atingidas"
            valor={totalComMeta > 0 ? `${metasAtingidas}/${totalComMeta}` : '—'}
            icone={<Target size={16} />}
            descricao="KPIs dentro da meta"
          />
          <MetricCard
            label="Status"
            valor="Ativo"
            icone={<BarChart2 size={16} />}
            descricao="Acesso ao painel"
          />
          <MetricCard
            label={dataAtualizacao ? 'Dados até' : 'Atualizado'}
            valor={dataAtualizacao ? dataAtualizacao : new Date().toLocaleTimeString('pt-BR', { hour: '2-digit', minute: '2-digit' })}
            icone={<CalendarCheck size={16} />}
            descricao={dataAtualizacao ? `Atualizado até ${formatarDataPtBR(dataAtualizacao)}` : 'Hora atual'}
            iconeBg="rgba(201,168,76,0.10)"
            iconeColor="var(--gold)"
          />
        </div>

        {/* KPI Básico */}
        {kpis.length > 0 && (
          <KPIBasico
            kpis={kpis}
            nomeOperador={operador.nome}
            linkCompleto={`/painel/kpi/${operador.username}?view=completo`}
          />
        )}

        {kpis.length === 0 && (
          <div className="card text-center py-12">
            <p className="text-sm" style={{ color: 'var(--text-muted)' }}>
              {planilha
                ? `Nenhum dado para ${operador.username} na planilha "${planilha.nome}".`
                : 'Nenhuma planilha ativa configurada.'}
            </p>
          </div>
        )}

        {/* Diário de Bordo card */}
        <Link
          href={`/painel/diario/${operador.username}`}
          className="card flex items-center gap-4 transition-all hover:border-[rgba(201,168,76,0.25)]"
          style={{ textDecoration: 'none' }}
        >
          <div className="p-2.5 rounded-xl shrink-0" style={{ background: 'rgba(201,168,76,0.08)', color: 'var(--gold-light)' }}>
            <BookOpen size={18} />
          </div>
          <div className="flex-1">
            <p className="text-sm font-semibold" style={{ color: 'var(--text-primary)' }}>
              Diário de Bordo
            </p>
            <p className="text-xs mt-0.5" style={{ color: 'var(--text-muted)' }}>
              {registrosDiario.length > 0
                ? `${registrosDiario.length} registros no mês${minPausas > 0 ? ` · ${formatTempo(minPausas)} em pausas justificadas` : ''}`
                : 'Nenhum registro este mês'}
            </p>
          </div>
          <ChevronRight size={15} style={{ color: 'var(--text-muted)', flexShrink: 0 }} />
        </Link>
      </div>
    </PainelShell>
  )
}

export async function generateStaticParams() {
  return OPERADORES.map((op) => ({ id: String(op.id) }))
}
