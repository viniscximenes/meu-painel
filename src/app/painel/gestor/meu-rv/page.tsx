import { requireGestorOuAdmin } from '@/lib/auth'
import PainelShell from '@/components/PainelShell'
import { getPlanilhaAtiva, buscarLinhasPlanilha, encontrarColunaIdent, matchCelulaOperador } from '@/lib/sheets'
import { getRVGestorConfig, calcularRVGestor } from '@/lib/rv-gestor'
import type { ResultadoRVGestor } from '@/lib/rv-gestor-utils'
import { OPERADORES_DISPLAY } from '@/lib/operadores'
import type { OpKpiData } from '../GestorRVSection'
import MeuRVGestorClient from './MeuRVGestorClient'
import { AlertTriangle, Settings } from 'lucide-react'

export const dynamic = 'force-dynamic'

function normH(s: string): string {
  return s.replace(/\u00a0/g, ' ').replace(/\r|\t/g, ' ').toLowerCase().replace(/\s+/g, ' ').trim()
}

const KW: Record<string, string[]> = {
  retracao: ['tx de retenção','tx retencao','retenção bruta','retencao bruta','tx retenção','retenção','retencao','taxa de retenção'],
  indisp:   ['indisponibilidade','indisp'],
  tma:      ['tma bruto','tma medio','tma médio','tma','tempo médio de atendimento','tempo medio de atendimento'],
  ticket:   ['variação de ticket','variacao de ticket','% variação ticket','var ticket','variação ticket','variacao ticket','ticket'],
  abs:      ['absenteísmo','absenteismo','ausência','ausencia','abs'],
}

function detectIdx(headers: string[], campo: string): number {
  const normsH = headers.map(h => normH(h))
  for (const kw of (KW[campo] ?? [])) {
    const normKw = normH(kw)
    const exact = normsH.indexOf(normKw)
    if (exact !== -1) return exact
    const cont = normsH.findIndex(h => h.includes(normKw))
    if (cont !== -1) return cont
  }
  return -1
}

function parsePct(raw: string): number {
  if (!raw) return 0
  const n = parseFloat(raw.replace(/[%\s]/g, '').replace(',', '.'))
  return isNaN(n) ? 0 : n
}

function parseSeg(raw: string): number {
  if (!raw) return 0
  const hms = raw.trim().match(/^(\d+):(\d{1,2}):(\d{1,2})$/)
  if (hms) return parseInt(hms[1]) * 3600 + parseInt(hms[2]) * 60 + parseInt(hms[3])
  const ms = raw.trim().match(/^(\d+):(\d{2})$/)
  if (ms) return parseInt(ms[1]) * 60 + parseInt(ms[2])
  const n = parseFloat(raw.replace(',', '.').replace(/[^\d.]/g, ''))
  return isNaN(n) ? 0 : n
}

export default async function GestorMeuRvPage() {
  const profile  = await requireGestorOuAdmin()
  const planilha = await getPlanilhaAtiva().catch(() => null)
  const config   = await getRVGestorConfig()

  const cssVars = { '--void2': '#07070f', '--void3': '#0d0d1a' } as React.CSSProperties

  if (!planilha) {
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
  let dataAtualizacao: string | null = null
  let erroSheets: string | null      = null

  try {
    const [gestorData, monitoriaData, opData] = await Promise.all([
      buscarLinhasPlanilha(planilha.spreadsheet_id, 'KPI GESTOR', 5),
      buscarLinhasPlanilha(planilha.spreadsheet_id, 'MONITORIA').catch(() => ({ headers: [], rows: [] })),
      buscarLinhasPlanilha(planilha.spreadsheet_id, planilha.aba).catch(() => ({ headers: [], rows: [] })),
    ])

    const headers = gestorData.headers
    const dataRow = gestorData.rows[0] ?? []
    dataAtualizacao = gestorData.rows[2]?.[0]?.trim() || null

    // Monitorias — raw count from planilha
    const enviadas = monitoriaData.rows.filter(r => (r[13] ?? '').toLowerCase().trim() === 'sim')
    totalMonitorias = enviadas.length
    const porColaborador = new Map<string, number>()
    for (const r of enviadas) {
      const col = (r[0] ?? '').trim()
      if (col) porColaborador.set(col, (porColaborador.get(col) ?? 0) + 1)
    }

    // Cross-reference with OPERADORES_DISPLAY (canonical list — excludes inactive/hidden operators)
    // This prevents the planilha's extra rows (ex-employees, gestor herself) from polluting the count
    monitoriasCompletas = OPERADORES_DISPLAY.filter(op =>
      [...porColaborador.entries()].some(([nome, count]) =>
        count >= 4 && matchCelulaOperador(nome, op.username, op.nome)
      )
    ).length
    totalOperadores = OPERADORES_DISPLAY.length

    // Operator KPIs for hover popups
    if (opData.headers.length > 0) {
      const colIdent = encontrarColunaIdent(opData.headers)
      const idxRet   = detectIdx(opData.headers, 'retracao')
      const idxInd   = detectIdx(opData.headers, 'indisp')
      const idxTma   = detectIdx(opData.headers, 'tma')
      const idxTkt   = detectIdx(opData.headers, 'ticket')
      const idxAbs   = detectIdx(opData.headers, 'abs')

      opKpis = OPERADORES_DISPLAY.map(op => {
        const row = opData.rows.find(r => matchCelulaOperador(r[colIdent] ?? '', op.username, op.nome))
        if (!row) return null
        return {
          id: op.id,
          nome: op.nome,
          retencaoVal: parsePct(row[idxRet] ?? ''),
          indispVal:   parsePct(row[idxInd] ?? ''),
          tmaValSeg:   parseSeg(row[idxTma] ?? ''),
          ticketVal:   parsePct(row[idxTkt] ?? ''),
          absVal:      parsePct(row[idxAbs] ?? ''),
        } satisfies OpKpiData
      }).filter((o): o is OpKpiData => o !== null)

      console.log('[AUDIT gestorMeuRV]', {
        monitoriaRows: monitoriaData.rows.length,
        enviadas: enviadas.length,
        porColaboradorSize: porColaborador.size,
        monitoriasCompletas,
        totalOperadores,
        opKpisLength: opKpis.length,
      })
    }

    // Gestor KPI values
    const get = (campo: string) => {
      const idx = detectIdx(headers, campo)
      return idx >= 0 ? (dataRow[idx] ?? '') : ''
    }

    const retencaoVal = parsePct(get('retracao'))
    const indispVal   = parsePct(get('indisp'))
    const tmaValSeg   = parseSeg(get('tma'))
    const ticketVal   = parsePct(get('ticket'))
    absVal            = parsePct(get('abs'))

    rv = calcularRVGestor(
      { retencaoVal, indispVal, tmaValSeg, ticketVal, absVal, monitoriasCompletas, totalMonitorias },
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
