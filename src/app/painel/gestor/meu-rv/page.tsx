import { requireGestorOuAdmin } from '@/lib/auth'
import PainelShell from '@/components/PainelShell'
import {
  getPlanilhaAtiva,
  getPlanilhaPorTipo,
  buscarLinhasPlanilha,
  getMapeamentoKpiGestorColunas,
  getMapeamentoKpiColunas,
  matchCelulaOperador,
  resolverNomeAba,
  encontrarColunaIdent,
} from '@/lib/sheets'
import { extrairValor } from '@/lib/kpi-coluna-utils'
import { getRVGestorConfig, calcularRVGestor } from '@/lib/rv-gestor'
import type { ResultadoRVGestor } from '@/lib/rv-gestor-utils'
import { OPERADORES_DISPLAY } from '@/lib/operadores'
import type { OpKpiData } from '../GestorRVSection'
import MeuRVGestorClient from './MeuRVGestorClient'
import { AlertTriangle, Settings } from 'lucide-react'

export const dynamic = 'force-dynamic'

// ── Parsers null-aware ────────────────────────────────────────────────────────
// Retornam null quando a célula está ausente ou inválida.
// Valor 0 legítimo é preservado como 0 (não confundido com ausência).

function parsePctRV(raw: string | null): number | null {
  if (!raw) return null
  const s = raw.trim().replace(/\s/g, '').replace(',', '.')
  if (!s || s.startsWith('#')) return null
  const n = parseFloat(s.replace('%', ''))
  if (isNaN(n)) return null
  return n > 0 && n < 2 ? n * 100 : n
}

function parseTMARV(raw: string | null): number | null {
  if (!raw) return null
  const s = raw.trim()
  if (!s || s.startsWith('#')) return null
  const parts = s.split(':').map(p => parseInt(p, 10))
  if (parts.some(isNaN)) return null
  let secs = 0
  if (parts.length === 3) secs = parts[0] * 3600 + parts[1] * 60 + parts[2]
  else if (parts.length === 2) secs = parts[0] * 60 + parts[1]
  else return null
  return secs === 0 ? null : secs
}

// ── Page ──────────────────────────────────────────────────────────────────────

export default async function GestorMeuRvPage() {
  const profile  = await requireGestorOuAdmin()
  const config   = await getRVGestorConfig()

  // KPI GESTOR vive na planilha kpi_quartil; MONITORIA e op data vivem na mes_atual.
  const [planilhaKpi, planilhaMes] = await Promise.all([
    getPlanilhaPorTipo('kpi_quartil').catch(() => null),
    getPlanilhaAtiva().catch(() => null),
  ])

  const cssVars = { '--void2': '#07070f', '--void3': '#0d0d1a' } as React.CSSProperties

  if (!planilhaKpi) {
    return (
      <PainelShell profile={profile} title="Meu RV" iconName="Wallet">
        <div style={cssVars} className="space-y-4">
          <GoldLine />
          <EmptyState icon={<Settings size={24} style={{ color: 'var(--gold)' }} />}>
            <strong>Planilha não configurada</strong>
            <span style={{ color: 'var(--text-muted)', fontSize: '13px' }}>A supervisão ainda não ativou nenhuma planilha.</span>
          </EmptyState>
        </div>
      </PainelShell>
    )
  }

  let rv: ResultadoRVGestor | null = null
  let opKpis: OpKpiData[]          = []
  let absVal                        = 0
  let monitoriasCompletas           = 0
  let totalMonitorias               = 0
  let totalOperadores               = 0
  let erroSheets: string | null = null

  try {
    const abaGestor = await resolverNomeAba(planilhaKpi.spreadsheet_id, 'KPI GESTOR').catch(() => 'KPI GESTOR')

    const [gestorData, monitoriaData, opData, mapeamentoGestor, mapeamentoOp] = await Promise.all([
      buscarLinhasPlanilha(planilhaKpi.spreadsheet_id, abaGestor, 50),
      planilhaMes
        ? buscarLinhasPlanilha(planilhaMes.spreadsheet_id, 'MONITORIA').catch(() => ({ headers: [], rows: [] }))
        : Promise.resolve({ headers: [], rows: [] }),
      planilhaMes
        ? buscarLinhasPlanilha(planilhaMes.spreadsheet_id, planilhaMes.aba).catch(() => ({ headers: [], rows: [] }))
        : Promise.resolve({ headers: [], rows: [] }),
      getMapeamentoKpiGestorColunas(),
      getMapeamentoKpiColunas(),
    ])

    // ── Monitorias ────────────────────────────────────────────────────────────
    const enviadas = monitoriaData.rows.filter(r => (r[13] ?? '').toLowerCase().trim() === 'sim')
    totalMonitorias = enviadas.length
    const porColaborador = new Map<string, number>()
    for (const r of enviadas) {
      const col = (r[0] ?? '').trim()
      if (col) porColaborador.set(col, (porColaborador.get(col) ?? 0) + 1)
    }
    monitoriasCompletas = OPERADORES_DISPLAY.filter(op =>
      [...porColaborador.entries()].some(([nome, count]) =>
        count >= 4 && matchCelulaOperador(nome, op.username, op.nome)
      )
    ).length
    totalOperadores = OPERADORES_DISPLAY.length

    // ── KPIs dos operadores (hover popups) ───────────────────────────────────
    if (opData.headers.length > 0) {
      const colIdent = encontrarColunaIdent(opData.headers)
      opKpis = OPERADORES_DISPLAY.map(op => {
        const row = opData.rows.find(r => matchCelulaOperador(r[colIdent] ?? '', op.username, op.nome))
        if (!row) return null
        return {
          id:         op.id,
          nome:       op.nome,
          retencaoVal: parsePctRV(extrairValor(row, mapeamentoOp, 'tx_ret_bruta')) ?? 0,
          indispVal:   parsePctRV(extrairValor(row, mapeamentoOp, 'indisp'))        ?? 0,
          tmaValSeg:   parseTMARV(extrairValor(row, mapeamentoOp, 'tma'))           ?? 0,
          ticketVal:   parsePctRV(extrairValor(row, mapeamentoOp, 'var_ticket'))    ?? 0,
          absVal:      parsePctRV(extrairValor(row, mapeamentoOp, 'abs'))           ?? 0,
        } satisfies OpKpiData
      }).filter((o): o is OpKpiData => o !== null)
    }

    // ── Linha do gestor na aba KPI GESTOR ─────────────────────────────────────
    const linhaGestor = gestorData.rows.find(row =>
      matchCelulaOperador(row[0] ?? '', profile.username, profile.nome)
    ) ?? null

    console.log('[RV GESTOR] mapeamento usado:', mapeamentoGestor)
    console.log('[RV GESTOR] linha do gestor encontrada:', linhaGestor)

    // ── Extração via mapeamento configurável ──────────────────────────────────
    const retencaoStr = linhaGestor ? extrairValor(linhaGestor, mapeamentoGestor, 'tx_ret_bruta') : null
    const indispStr   = linhaGestor ? extrairValor(linhaGestor, mapeamentoGestor, 'indisp')       : null
    const tmaStr      = linhaGestor ? extrairValor(linhaGestor, mapeamentoGestor, 'tma')          : null
    const ticketStr   = linhaGestor ? extrairValor(linhaGestor, mapeamentoGestor, 'var_ticket')   : null
    const absStr      = linhaGestor ? extrairValor(linhaGestor, mapeamentoGestor, 'abs')          : null

    const retencaoVal = parsePctRV(retencaoStr)
    const indispValN  = parsePctRV(indispStr)
    const tmaValSeg   = parseTMARV(tmaStr)
    const ticketVal   = parsePctRV(ticketStr)
    const absValN     = parsePctRV(absStr)

    absVal = absValN ?? 0

    // semDados: todos os 3 campos críticos são null (mapeamento não configurado ou gestor não encontrado)
    // Nota: 0 é valor válido — só null indica ausência real de dado.
    const semDados = retencaoVal === null && indispValN === null && tmaValSeg === null

    console.log('[RV GESTOR] valores extraídos:', { retencaoVal, indispVal: indispValN, tmaValSeg, ticketVal, absVal: absValN })
    console.log('[RV GESTOR] semDados motivo:', semDados ? 'todos os 3 valores críticos são null' : 'OK')

    rv = calcularRVGestor(
      {
        retencaoVal:        retencaoVal ?? 0,
        indispVal:          indispValN  ?? 0,
        tmaValSeg:          tmaValSeg   ?? 0,
        ticketVal:          ticketVal   ?? 0,
        absVal,
        monitoriasCompletas,
        totalMonitorias,
        semDados,
      },
      config,
    )
  } catch (e) {
    erroSheets = e instanceof Error ? e.message : 'Erro desconhecido ao carregar planilha'
  }

  const mesLabel = new Date().toLocaleDateString('pt-BR', { month: 'long', year: 'numeric' }).toUpperCase()

  return (
    <PainelShell profile={profile} title="Meu RV" iconName="Wallet">
      <div style={cssVars} className="space-y-4">

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

        {!erroSheets && !rv && (
          <EmptyState icon={<AlertTriangle size={24} className="text-amber-400" />}>
            <strong>Dados não encontrados</strong>
            <span style={{ color: 'var(--text-muted)', fontSize: '13px' }}>
              A aba <strong style={{ color: 'var(--text-secondary)' }}>KPI GESTOR</strong> não foi encontrada ou está vazia.
            </span>
          </EmptyState>
        )}

        {!erroSheets && rv && (
          <MeuRVGestorClient
            rv={rv}
            config={config}
            opKpis={opKpis}
            absVal={absVal}
            monitoriasCompletas={monitoriasCompletas}
            totalMonitorias={totalMonitorias}
            totalOperadores={totalOperadores}
            mesLabel={mesLabel}
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
