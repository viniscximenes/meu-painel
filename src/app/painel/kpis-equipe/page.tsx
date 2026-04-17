import { requireGestor } from '@/lib/auth'
import { getMetas, computarKPIs, type KPIItem } from '@/lib/kpi'
import { getPlanilhaAtiva, buscarLinhasPlanilha, encontrarColunaIdent, extrairDataAtualizacao, formatarDataCurta } from '@/lib/sheets'
import { OPERADORES_DISPLAY } from '@/lib/operadores'
import PainelShell from '@/components/PainelShell'
import Link from 'next/link'
import { Settings, AlertTriangle } from 'lucide-react'
import EquipeTabela from './EquipeTabela'

export type DadosOperador = {
  op: typeof OPERADORES_DISPLAY[0]
  kpis: KPIItem[]
  encontrado: boolean
}

export default async function KPIsEquipePage() {
  const profile = await requireGestor()

  const [planilha, metas] = await Promise.all([
    getPlanilhaAtiva().catch(() => null),
    getMetas().catch(() => []),
  ])

  const basicos = metas.filter((m) => m.basico).sort((a, b) => a.ordem - b.ordem)

  let dadosEquipe: DadosOperador[] = OPERADORES_DISPLAY.map((op) => ({ op, kpis: [], encontrado: false }))
  let erroSheets: string | null = null
  let dataAtualizacao: string | null = null

  if (planilha) {
    try {
      const { headers, rows } = await buscarLinhasPlanilha(planilha.spreadsheet_id, planilha.aba)
      const col = encontrarColunaIdent(headers)
      dataAtualizacao = extrairDataAtualizacao(rows)

      console.log(`\n[KPI Equipe] Planilha: "${planilha.nome}" | aba: "${planilha.aba}"`)
      console.log(`[KPI Equipe] Coluna identificadora: col ${col} = "${headers[col]}"`)
      console.log(`[KPI Equipe] Total de linhas na planilha: ${rows.length}`)
      console.log(`[KPI Equipe] Amostra de valores na col ident: ${rows.slice(0, 5).map(r => `"${(r[col] ?? '').slice(0, 30)}"`).join(', ')}`)

      let primeiroDebugFeito = false

      dadosEquipe = OPERADORES_DISPLAY.map((op) => {
        const row = rows.find((r) => {
          const val = (r[col] ?? '').trim().split('@')[0].toLowerCase()
          return val === op.username.toLowerCase()
        })

        const debugLabel = (!primeiroDebugFeito && row) ? op.username : undefined
        if (debugLabel) primeiroDebugFeito = true

        const kpis = row ? computarKPIs(headers, row, metas, debugLabel) : []
        if (!row) console.log(`[KPI Equipe] Operador "${op.username}" NÃO encontrado na planilha`)
        return { op, kpis, encontrado: !!row }
      })
    } catch (e) {
      console.error('[KPIsEquipePage] erro ao buscar planilha:', e)
      erroSheets = e instanceof Error ? e.message : 'Erro desconhecido'
    }
  }

  const cssVars = {
    '--void2': '#07070f',
    '--void3': '#0d0d1a',
    '--gold2': '#e8c96d',
    '--gold4': 'rgba(201,168,76,0.15)',
  } as React.CSSProperties

  return (
    <PainelShell profile={profile} title="KPIs da Equipe" iconName="Users">
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
            {/* Título gradient */}
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
              KPIs da Equipe
            </span>

            {/* Separador vertical */}
            <div style={{ width: '1px', height: '16px', background: 'rgba(201,168,76,0.2)', flexShrink: 0 }} />

            {/* Planilha */}
            <span style={{ fontSize: '11px', textTransform: 'uppercase', letterSpacing: '0.06em', color: 'var(--text-muted)' }}>
              {planilha ? planilha.nome : 'Nenhuma planilha ativa'}
            </span>

            {/* Dot pulsante + data */}
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

          {/* Ações */}
          <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
            {!planilha && (
              <Link href="/painel/config" className="btn-secondary text-xs flex items-center gap-1.5">
                <Settings size={13} />
                Configurar planilha
              </Link>
            )}
          </div>
        </div>

        {/* ── Erro sheets ── */}
        {erroSheets && (
          <div
            className="flex items-start gap-3 rounded-xl border px-4 py-3"
            style={{ background: 'rgba(239,68,68,0.05)', borderColor: 'rgba(239,68,68,0.2)' }}
          >
            <AlertTriangle size={15} className="text-rose-400 shrink-0 mt-0.5" />
            <div>
              <p className="text-sm font-medium text-rose-300">Erro ao carregar planilha</p>
              <p className="text-xs mt-0.5 text-rose-500">{erroSheets}</p>
            </div>
          </div>
        )}

        <EquipeTabela dadosEquipe={dadosEquipe} basicos={basicos} />
      </div>
    </PainelShell>
  )
}
