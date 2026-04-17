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
      const mesAtual = new Date().toISOString().slice(0, 7)

      operadores = OPERADORES_DISPLAY.map((op) => {
        const row = rows.find((r) =>
          matchCelulaOperador(r[col] ?? '', op.username, op.nome)
        )
        if (!row) return { id: op.id, nome: op.nome, username: op.username, gs: 'neutro' as Status, encontrado: false, motivosVermelhos: [], rv: null }

        const kpis = metas.length > 0 ? computarKPIs(headers, row, metas) : []
        const gs   = globalStatus(kpis)
        const motivosVermelhos = kpis.filter((k) => k.status === 'vermelho').map((k) => k.label)

        let rv: ResultadoRV | null = null
        try { rv = calcularRV(headers, row, rvConfig, '', kpis, op.id, mesAtual) } catch { /* continua */ }

        return { id: op.id, nome: op.nome, username: op.username, gs, encontrado: true, motivosVermelhos, rv }
      })
    } catch { /* planilha indisponível */ }
  }

  const elegiveis     = operadores.filter(o => o.rv?.elegivel === true).length
  const inelegiveis   = operadores.filter(o => o.rv?.elegivel === false && !o.rv?.semDados).length
  const rvTotalEquipe = operadores.reduce((s, o) => s + (o.rv?.rvFinal ?? 0), 0)
  const maiorRV       = Math.max(0, ...operadores.map(o => o.rv?.rvFinal ?? 0))

  const mesAno = new Date().toLocaleDateString('pt-BR', { month: 'long', year: 'numeric' }).toUpperCase()

  const cssVars = {
    '--void2': '#07070f',
    '--void3': '#0d0d1a',
    '--gold2': '#e8c96d',
    '--gold4': 'rgba(201,168,76,0.15)',
  } as React.CSSProperties

  return (
    <PainelShell profile={profile} title="RV da Equipe" iconName="CircleDollarSign">
      <div style={cssVars} className="space-y-4">

        {/* ── Linha dourada ── */}
        <div style={{
          height: '1px',
          background: 'linear-gradient(90deg, transparent 0%, #c9a84c 25%, #e8c96d 50%, #c9a84c 75%, transparent 100%)',
        }} />

        {/* ── Header ── */}
        <div style={{
          background: 'var(--void2)',
          border: '1px solid rgba(201,168,76,0.1)',
          borderRadius: '14px',
          padding: '14px 20px',
          display: 'flex',
          alignItems: 'center',
          gap: '16px',
          flexWrap: 'wrap',
          justifyContent: 'space-between',
        }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '14px', flexWrap: 'wrap' }}>
            <span style={{
              fontFamily: 'var(--ff-display)',
              fontSize: '16px',
              fontWeight: 700,
              textTransform: 'uppercase',
              letterSpacing: '0.06em',
              background: 'linear-gradient(135deg, #e8c96d 0%, #c9a84c 100%)',
              WebkitBackgroundClip: 'text',
              WebkitTextFillColor: 'transparent',
              backgroundClip: 'text',
            }}>
              RV da Equipe
            </span>

            <div style={{ width: '1px', height: '16px', background: 'rgba(201,168,76,0.2)', flexShrink: 0 }} />

            <span style={{ fontSize: '11px', textTransform: 'uppercase', letterSpacing: '0.06em', color: 'var(--text-muted)' }}>
              {mesAno}
            </span>

            {dataAtualizacao && (
              <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
                <div
                  className="animate-pulse"
                  style={{ width: '6px', height: '6px', borderRadius: '50%', background: '#10b981', flexShrink: 0 }}
                />
                <span style={{ fontSize: '11px', color: 'var(--text-muted)' }}>
                  Atualizado até{' '}
                  <strong style={{ color: 'var(--text-secondary)', fontWeight: 600 }}>
                    {formatarDataCurta(dataAtualizacao)}
                  </strong>
                </span>
              </div>
            )}
          </div>

        </div>

        {/* ── Cards de resumo ── */}
        <div className="grid grid-cols-2 xl:grid-cols-4 gap-4">
          {[
            { label: 'Total Elegíveis',      valor: String(elegiveis),       dotColor: '#22c55e',           valorColor: '#34d399' },
            { label: 'Não Elegíveis',        valor: String(inelegiveis),     dotColor: '#ef4444',           valorColor: '#f87171' },
            { label: 'RV Total Equipe',      valor: formatBRL(rvTotalEquipe), dotColor: '#c9a84c',          valorColor: 'var(--gold-light)' },
            { label: 'Maior RV Individual',  valor: formatBRL(maiorRV),      dotColor: '#c9a84c',           valorColor: 'var(--gold-light)' },
          ].map((card) => (
            <div
              key={card.label}
              style={{
                background: '#0d0d1a',
                border: '1px solid rgba(201,168,76,0.08)',
                borderRadius: '14px',
                padding: '1.25rem',
                display: 'flex',
                flexDirection: 'column',
                gap: '10px',
              }}
            >
              <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
                <div style={{ width: '6px', height: '6px', borderRadius: '50%', background: card.dotColor, flexShrink: 0 }} />
                <span className="label-uppercase">{card.label}</span>
              </div>
              <span className="metric-value" style={{ color: card.valorColor, fontSize: '26px' }}>
                {card.valor}
              </span>
            </div>
          ))}
        </div>

        {/* ── Tabela com filtro ── */}
        <RVEquipeTabela operadores={operadores} />
      </div>
    </PainelShell>
  )
}
