import { requireGestor } from '@/lib/auth'
import { getMetas, computarKPIs, type KPIItem, type Status } from '@/lib/kpi'
import { getPlanilhaAtiva, buscarLinhasPlanilha, encontrarColunaIdent, extrairDataAtualizacao, formatarDataCurta } from '@/lib/sheets'
import { OPERADORES_DISPLAY } from '@/lib/operadores'
import PainelShell from '@/components/PainelShell'
import Link from 'next/link'
import { Settings, AlertTriangle } from 'lucide-react'
import EquipeTabela from './EquipeTabela'
import DeflatoresModal from './DeflatoresModal'

export type DadosOperador = {
  op: typeof OPERADORES_DISPLAY[0]
  kpis: KPIItem[]
  encontrado: boolean
}

function globalStatus(kpis: KPIItem[]): Status {
  const com = kpis.filter((k) => k.status !== 'neutro')
  if (com.some((k) => k.status === 'vermelho')) return 'vermelho'
  if (com.some((k) => k.status === 'amarelo')) return 'amarelo'
  if (com.some((k) => k.status === 'verde')) return 'verde'
  return 'neutro'
}

export { globalStatus }

export default async function KPIsEquipePage() {
  const profile = await requireGestor()

  // Busca planilha e metas com timeout implícito no Supabase (rápido)
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

        // Loga diagnóstico completo para o primeiro operador encontrado
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

  return (
    <PainelShell profile={profile} title="KPIs da Equipe">
      <div className="space-y-6">
        {/* Header */}
        <div className="flex items-start justify-between gap-4 flex-wrap">
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
              KPIs da Equipe
            </h2>
            <p className="text-xs mt-1 flex items-center gap-2 flex-wrap" style={{ color: 'var(--text-muted)' }}>
              <span>{planilha ? planilha.nome : 'Nenhuma planilha ativa'}</span>
              <span style={{ color: 'rgba(255,255,255,0.12)' }}>·</span>
              <span>{OPERADORES_DISPLAY.length} operadores</span>
              {dataAtualizacao && (
                <span
                  className="px-2 py-0.5 rounded-full text-[10px] font-semibold"
                  style={{ background: 'rgba(201,168,76,0.10)', color: 'var(--gold-light)', border: '1px solid rgba(201,168,76,0.15)' }}
                >
                  Dados até {formatarDataCurta(dataAtualizacao)}
                </span>
              )}
            </p>
          </div>
          <div className="flex items-center gap-2">
            {metas.length > 0 && (
              <DeflatoresModal metas={metas} dadosEquipe={dadosEquipe} />
            )}
            {!planilha && (
              <Link href="/painel/config" className="btn-secondary text-xs flex items-center gap-1.5">
                <Settings size={13} />
                Configurar planilha
              </Link>
            )}
          </div>
        </div>

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
