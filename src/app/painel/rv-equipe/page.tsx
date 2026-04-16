import { requireGestor } from '@/lib/auth'
import PainelShell from '@/components/PainelShell'
import { OPERADORES_DISPLAY } from '@/lib/operadores'
import { getMetas, computarKPIs, type KPIItem, type Status } from '@/lib/kpi'
import {
  getPlanilhaAtiva,
  buscarLinhasPlanilha,
  encontrarColunaIdent,
  extrairDataAtualizacao,
  formatarDataCurta,
  matchCelulaOperador,
} from '@/lib/sheets'
import { getRVConfig, calcularRV, formatBRL, type ResultadoRV } from '@/lib/rv'
import Link from 'next/link'
import { SlidersHorizontal, Users, CheckCircle, XCircle, Trophy, Database, CalendarCheck } from 'lucide-react'
import RVEquipeTabela, { type OpRV } from './RVEquipeTabela'

function globalStatus(kpis: KPIItem[]): Status {
  const com = kpis.filter((k) => k.status !== 'neutro')
  if (com.some((k) => k.status === 'vermelho')) return 'vermelho'
  if (com.some((k) => k.status === 'amarelo'))  return 'amarelo'
  if (com.some((k) => k.status === 'verde'))    return 'verde'
  return 'neutro'
}

export default async function RVEquipePage() {
  const profile = await requireGestor()

  const [planilha, metas, rvConfig] = await Promise.all([
    getPlanilhaAtiva(),
    getMetas(),
    getRVConfig(),
  ])

  let operadores: OpRV[] = OPERADORES_DISPLAY.map((op) => ({
    id: op.id, nome: op.nome, username: op.username,
    gs: 'neutro' as Status, encontrado: false, motivosVermelhos: [],
    rv: null,
  }))

  let dataAtualizacao: string | null = null

  if (planilha) {
    try {
      const { headers, rows } = await buscarLinhasPlanilha(planilha.spreadsheet_id, planilha.aba)
      const col = encontrarColunaIdent(headers)
      dataAtualizacao = extrairDataAtualizacao(rows)

      operadores = OPERADORES_DISPLAY.map((op) => {
        const row = rows.find((r) =>
          matchCelulaOperador(r[col] ?? '', op.username, op.nome)
        )
        if (!row) return { id: op.id, nome: op.nome, username: op.username, gs: 'neutro' as Status, encontrado: false, motivosVermelhos: [], rv: null }

        const kpis = metas.length > 0 ? computarKPIs(headers, row, metas) : []
        const gs   = globalStatus(kpis)
        const motivosVermelhos = kpis.filter((k) => k.status === 'vermelho').map((k) => k.label)

        let rv: ResultadoRV | null = null
        try { rv = calcularRV(headers, row, rvConfig) } catch { /* continua */ }

        return { id: op.id, nome: op.nome, username: op.username, gs, encontrado: true, motivosVermelhos, rv }
      })
    } catch { /* planilha indisponível */ }
  }

  // Cards de resumo
  const elegiveis   = operadores.filter(o => o.rv?.elegivel === true).length
  const inelegiveis = operadores.filter(o => o.rv?.elegivel === false && !o.rv?.semDados).length
  const rvTotalEquipe = operadores.reduce((s, o) => s + (o.rv?.rvTotal ?? 0), 0)
  const maiorRV       = Math.max(0, ...operadores.map(o => o.rv?.rvTotal ?? 0))

  return (
    <PainelShell profile={profile} title="RV da Equipe">
      <div className="space-y-8">

        {/* Header */}
        <div className="flex items-center justify-between flex-wrap gap-4">
          <div>
            <h2
              className="text-2xl font-extrabold"
              style={{
                background: 'linear-gradient(135deg, var(--gold-bright) 0%, var(--gold-light) 100%)',
                WebkitBackgroundClip: 'text', WebkitTextFillColor: 'transparent',
                backgroundClip: 'text', letterSpacing: '-0.02em',
              }}
            >
              RV da Equipe
            </h2>
            <p className="text-sm mt-1" style={{ color: 'var(--text-muted)' }}>
              {dataAtualizacao
                ? `Dados até ${formatarDataCurta(dataAtualizacao)}`
                : 'Cálculo com base na planilha ativa'}
            </p>
          </div>
          <Link href="/painel/rv-config" className="btn-secondary flex items-center gap-2 text-sm">
            <SlidersHorizontal size={14} />
            Configurar Regras de RV
          </Link>
        </div>

        {/* 4 cards de resumo */}
        <div className="grid grid-cols-2 xl:grid-cols-4 gap-4">
          {[
            {
              label: 'Total Elegíveis',
              valor: String(elegiveis),
              icone: <CheckCircle size={16} />,
              iconeBg: 'rgba(16,185,129,0.10)',
              iconeColor: '#10b981',
              valorColor: '#34d399',
            },
            {
              label: 'Não Elegíveis',
              valor: String(inelegiveis),
              icone: <XCircle size={16} />,
              iconeBg: 'rgba(239,68,68,0.10)',
              iconeColor: '#ef4444',
              valorColor: '#f87171',
            },
            {
              label: 'RV Total Equipe',
              valor: formatBRL(rvTotalEquipe),
              icone: <Users size={16} />,
              iconeBg: 'rgba(201,168,76,0.10)',
              iconeColor: 'var(--gold)',
              valorColor: 'var(--gold-light)',
            },
            {
              label: 'Maior RV Individual',
              valor: formatBRL(maiorRV),
              icone: <Trophy size={16} />,
              iconeBg: 'rgba(201,168,76,0.12)',
              iconeColor: 'var(--gold)',
              valorColor: 'var(--gold-light)',
            },
          ].map((card) => (
            <div key={card.label} className="card flex flex-col gap-3 relative overflow-hidden" style={{ minHeight: '120px' }}>
              {/* Accent top */}
              <div
                className="absolute top-0 left-0 right-0 h-[2px]"
                style={{ background: `linear-gradient(90deg, ${card.iconeBg} 0%, transparent 100%)` }}
              />
              <div className="flex items-start justify-between">
                <p className="text-xs font-semibold uppercase" style={{ color: 'var(--text-muted)', letterSpacing: '0.08em' }}>
                  {card.label}
                </p>
                <div
                  className="p-2.5 rounded-xl shrink-0"
                  style={{
                    background: card.iconeBg,
                    color: card.iconeColor,
                    boxShadow: `0 4px 16px ${card.iconeBg}88`,
                  }}
                >
                  {card.icone}
                </div>
              </div>
              <p className="text-3xl font-extrabold tabular-nums leading-none tracking-tight" style={{ color: card.valorColor }}>
                {card.valor}
              </p>
            </div>
          ))}
        </div>

        {/* Info planilha */}
        {planilha && (
          <div className="flex items-center gap-3 flex-wrap text-xs px-3 py-2 rounded-xl w-fit"
            style={{ background: 'rgba(201,168,76,0.05)', border: '1px solid rgba(201,168,76,0.10)' }}>
            <div className="flex items-center gap-1.5">
              <Database size={12} style={{ color: 'var(--text-muted)' }} />
              <span style={{ color: 'var(--text-muted)' }}>
                Planilha: <span style={{ color: 'var(--text-secondary)' }}>{planilha.nome}</span>
              </span>
            </div>
            {dataAtualizacao && (
              <div className="flex items-center gap-1.5">
                <CalendarCheck size={12} style={{ color: 'var(--gold)' }} />
                <span style={{ color: 'var(--gold-light)' }}>Dados até {formatarDataCurta(dataAtualizacao)}</span>
              </div>
            )}
          </div>
        )}

        {/* Tabela com filtro */}
        <RVEquipeTabela operadores={operadores} />
      </div>
    </PainelShell>
  )
}
