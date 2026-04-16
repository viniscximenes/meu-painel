import { Profile } from '@/types'
import { OPERADORES_DISPLAY } from '@/lib/operadores'
import MetricCard from '@/components/MetricCard'
import { getMetas, computarKPIs, type KPIItem } from '@/lib/kpi'
import { getPlanilhaAtiva, buscarLinhasPlanilha, encontrarColunaIdent, extrairDataAtualizacao, formatarDataPtBR, matchCelulaOperador } from '@/lib/sheets'
import { getRVConfig, calcularRV } from '@/lib/rv'
import { Users, CheckCircle, XCircle, Database, CalendarCheck } from 'lucide-react'
import OperadoresCollapsible from '@/components/OperadoresCollapsible'
import InelegiveisRVCard, { type OpInelegivel } from '@/components/InelegiveisRVCard'

interface PainelGestorProps {
  profile: Profile
}

/** Retorna a fração de metas verdes (0–1). Ignora KPIs sem meta (neutro). */
function porcentagemVerde(kpis: KPIItem[]): number {
  const comMeta = kpis.filter((k) => k.status !== 'neutro')
  if (comMeta.length === 0) return -1   // -1 = sem dados
  return comMeta.filter((k) => k.status === 'verde').length / comMeta.length
}

export default async function PainelGestor({ profile }: PainelGestorProps) {
  const [metas, planilha, rvConfig] = await Promise.all([getMetas(), getPlanilhaAtiva(), getRVConfig()])

  const hora = new Date().getHours()
  const saudacao = hora < 12 ? 'Bom dia' : hora < 18 ? 'Boa tarde' : 'Boa noite'

  let dentroMeta  = 0
  let foraMeta    = 0
  let dataAtualizacao: string | null = null
  const inelegiveis: OpInelegivel[]  = []

  if (planilha) {
    try {
      const { headers, rows } = await buscarLinhasPlanilha(planilha.spreadsheet_id, planilha.aba)
      const col = encontrarColunaIdent(headers)
      dataAtualizacao = extrairDataAtualizacao(rows)

      if (metas.length === 0) {
        console.log('[PainelGestor] Nenhuma meta configurada — contadores mantidos em 0')
      } else {
        let encontrados = 0
        OPERADORES_DISPLAY.forEach((op) => {
          const row = rows.find((r) =>
            matchCelulaOperador(r[col] ?? '', op.username, op.nome)
          )
          if (!row) {
            const amostras = rows.slice(0, 5).map((r) => r[col] ?? '').join(' | ')
            console.log(`[PainelGestor] NÃO encontrado: "${op.username}" / "${op.nome}" | amostras col${col}: [${amostras}]`)
            return
          }
          encontrados++
          const kpis = computarKPIs(headers, row, metas)
          const pct  = porcentagemVerde(kpis)
          console.log(`[PainelGestor] ${op.username} → ${encontrados}º, pct_verde=${pct.toFixed(2)}, com_meta=${kpis.filter(k=>k.status!=='neutro').length}`)
          if (pct >= 0) {
            if (pct >= 0.5) dentroMeta++
            else            foraMeta++
          }
          // RV eligibility
          try {
            const rv = calcularRV(headers, row, rvConfig)
            if (!rv.elegivel && !rv.semDados) {
              inelegiveis.push({ id: op.id, nome: op.nome, username: op.username, motivos: rv.motivosInelegivel })
            }
          } catch { /* ignora erros de RV no painel principal */ }
        })
        console.log(`[PainelGestor] Total=${OPERADORES_DISPLAY.length} | encontrados=${encontrados} | dentro=${dentroMeta} | fora=${foraMeta}`)
      }
    } catch (e) {
      console.error('[PainelGestor] erro ao buscar planilha:', e)
    }
  }

  return (
    <div className="space-y-8">
      {/* Saudação */}
      <div>
        <h2
          className="text-2xl font-extrabold"
          style={{
            background: 'linear-gradient(135deg, var(--text-primary) 0%, var(--text-secondary) 100%)',
            WebkitBackgroundClip: 'text',
            WebkitTextFillColor: 'transparent',
            backgroundClip: 'text',
            letterSpacing: '-0.03em',
          }}
        >
          {saudacao}, {profile.nome.split(' ')[0]}!
        </h2>
        <p className="mt-1 text-sm" style={{ color: 'var(--text-muted)' }}>
          Visão geral de todos os operadores.
        </p>
      </div>

      {/* Cards de métricas */}
      <div className="grid grid-cols-2 xl:grid-cols-4 gap-4">
        <MetricCard
          label="Total de Operadores"
          valor={OPERADORES_DISPLAY.length}
          icone={<Users size={16} />}
          descricao="Operadores cadastrados"
        />
        <MetricCard
          label="Dentro da Meta"
          valor={dentroMeta}
          icone={<CheckCircle size={16} />}
          descricao={planilha ? 'Status geral verde' : 'Sem planilha ativa'}
          iconeBg="rgba(16,185,129,0.10)"
          iconeColor="#10b981"
          valorColor="#34d399"
        />
        <MetricCard
          label="Fora da Meta"
          valor={foraMeta}
          icone={<XCircle size={16} />}
          descricao={planilha ? 'Status geral vermelho' : 'Sem planilha ativa'}
          iconeBg="rgba(239,68,68,0.10)"
          iconeColor="#ef4444"
          valorColor="#f87171"
        />
        <InelegiveisRVCard valor={inelegiveis.length} operadores={inelegiveis} />
      </div>

      {/* Planilha ativa (info discreta) */}
      {planilha && (
        <div
          className="flex items-center gap-3 flex-wrap text-xs px-3 py-2 rounded-xl w-fit"
          style={{ background: 'rgba(201,168,76,0.05)', border: '1px solid rgba(201,168,76,0.10)' }}
        >
          <div className="flex items-center gap-1.5">
            <Database size={12} style={{ color: 'var(--text-muted)' }} />
            <span style={{ color: 'var(--text-muted)' }}>
              Planilha: <span style={{ color: 'var(--text-secondary)' }}>{planilha.nome}</span>
            </span>
          </div>
          {dataAtualizacao && (
            <div className="flex items-center gap-1.5">
              <CalendarCheck size={12} style={{ color: 'var(--gold)' }} />
              <span style={{ color: 'var(--gold-light)' }}>
                Atualizado até {formatarDataPtBR(dataAtualizacao)}
              </span>
            </div>
          )}
        </div>
      )}

      {/* Grid de operadores (recolhível) */}
      <OperadoresCollapsible operadores={OPERADORES_DISPLAY} />
    </div>
  )
}
