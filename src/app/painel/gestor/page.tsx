import { requireGestor } from '@/lib/auth'
import PainelShell from '@/components/PainelShell'
import { getPlanilhaAtiva, buscarLinhasPlanilha, formatarDataCurta, encontrarColunaIdent, matchCelulaOperador } from '@/lib/sheets'
import { getRVGestorConfig, calcularRVGestor, segParaMMSSGestor } from '@/lib/rv-gestor'
import type { ResultadoRVGestor } from '@/lib/rv-gestor-utils'
import { AlertTriangle } from 'lucide-react'
import { OPERADORES_DISPLAY } from '@/lib/operadores'
import GestorRVSection, { type OpKpiData } from './GestorRVSection'

// ── Detecção de colunas por keyword ───────────────────────────────────────────

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

// ── Helpers de status ──────────────────────────────────────────────────────────

type Cor = 'verde' | 'amarelo' | 'vermelho' | 'neutro'

const COR_HEX: Record<Cor, string> = {
  verde:    '#22c55e',
  amarelo:  '#f59e0b',
  vermelho: '#ef4444',
  neutro:   'var(--text-muted)',
}

// ── Componente de card KPI ─────────────────────────────────────────────────────

function KPICard({
  label, valor, meta, cor, progresso,
}: {
  label: string
  valor: string
  meta: string
  cor: Cor
  progresso: number  // 0-100
}) {
  const hex = COR_HEX[cor]
  return (
    <div style={{
      background: '#0d0d1a',
      border: '1px solid rgba(201,168,76,0.08)',
      borderRadius: '14px',
      padding: '16px',
      display: 'flex',
      flexDirection: 'column',
      gap: '10px',
      borderTop: `2px solid ${cor === 'neutro' ? 'rgba(255,255,255,0.04)' : hex}`,
    }}>
      <p style={{ fontSize: '9px', fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.14em', color: 'var(--text-muted)' }}>
        {label}
      </p>
      <p style={{ fontSize: '22px', fontWeight: 700, fontVariantNumeric: 'tabular-nums', color: hex, lineHeight: 1 }}>
        {valor}
      </p>
      {/* Barra de progresso */}
      <div style={{ height: '3px', background: 'rgba(255,255,255,0.06)', borderRadius: '99px', overflow: 'hidden' }}>
        <div style={{
          height: '100%',
          width: `${Math.min(100, Math.max(0, progresso))}%`,
          background: hex,
          borderRadius: '99px',
          transition: 'width 0.6s ease',
        }} />
      </div>
      <p style={{ fontSize: '10px', color: 'var(--text-muted)' }}>
        Meta: <span style={{ color: 'var(--text-secondary)', fontWeight: 500 }}>{meta}</span>
      </p>
    </div>
  )
}

// ── Colunas complementares ────────────────────────────────────────────────────

const COLS_COMP = [
  'Pedidos','Churn','Retido Bruto','Retidos Líquidos 15d','Tx. Retenção Líquida 15d (%)',
  'Atendidas','Transfer (%)','Short Call (%)','Rechamada D+7 (%)','Tx. Tabulação (%)',
  'CSAT','Engajamento','Tempo Projetado','Tempo de Login',
  'NR17 (%)','Pessoal (%)','Outras Pausas (%)',
]

// ── Página ────────────────────────────────────────────────────────────────────

export default async function GestorPage() {
  const profile = await requireGestor()

  const planilha = await getPlanilhaAtiva().catch(() => null)

  let headers: string[]       = []
  let dataRow: string[]       = []
  let dataResultado: string | null = null
  let totalMonitorias         = 0
  let monitoriasCompletas     = 0
  let erroSheets: string | null = null
  let opKpis: OpKpiData[]     = []

  const config = await getRVGestorConfig()

  if (planilha) {
    try {
      const [gestorData, monitoriaData, opData] = await Promise.all([
        buscarLinhasPlanilha(planilha.spreadsheet_id, 'KPI GESTOR', 5),
        buscarLinhasPlanilha(planilha.spreadsheet_id, 'MONITORIA').catch(() => ({ headers: [], rows: [] })),
        buscarLinhasPlanilha(planilha.spreadsheet_id, planilha.aba).catch(() => ({ headers: [], rows: [] })),
      ])

      headers  = gestorData.headers
      dataRow  = gestorData.rows[0] ?? []
      dataResultado = gestorData.rows[2]?.[0] ?? null

      // Monitoria: col A = colaborador, col N (índice 13) = enviadoForms
      const enviadas = monitoriaData.rows.filter(r => (r[13] ?? '').toLowerCase().trim() === 'sim')
      totalMonitorias = enviadas.length
      const porColaborador = new Map<string, number>()
      for (const r of enviadas) {
        const col = (r[0] ?? '').trim()
        if (col) porColaborador.set(col, (porColaborador.get(col) ?? 0) + 1)
      }
      monitoriasCompletas = Array.from(porColaborador.values()).filter(v => v >= 4).length

      // Dados de KPI por operador (para popup de hover)
      if (opData.headers.length > 0) {
        const colIdent = encontrarColunaIdent(opData.headers)
        const idxRet  = detectIdx(opData.headers, 'retracao')
        const idxInd  = detectIdx(opData.headers, 'indisp')
        const idxTma  = detectIdx(opData.headers, 'tma')
        const idxTkt  = detectIdx(opData.headers, 'ticket')
        const idxAbs  = detectIdx(opData.headers, 'abs')

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
      }
    } catch (e) {
      erroSheets = e instanceof Error ? e.message : 'Erro ao ler planilha'
    }
  }

  // ── Extrair valores da linha do gestor ────────────────────────────────────
  const get = (campo: string) => {
    const idx = detectIdx(headers, campo)
    return idx >= 0 ? (dataRow[idx] ?? '') : ''
  }

  const rawRetracao = get('retracao')
  const rawIndisp   = get('indisp')
  const rawTma      = get('tma')
  const rawTicket   = get('ticket')
  const rawAbs      = get('abs')

  const retencaoVal = parsePct(rawRetracao)
  const indispVal   = parsePct(rawIndisp)
  const tmaValSeg   = parseSeg(rawTma)
  const ticketVal   = parsePct(rawTicket)
  const absVal      = parsePct(rawAbs)

  const dados = { retencaoVal, indispVal, tmaValSeg, ticketVal, absVal, monitoriasCompletas, totalMonitorias }
  const rv: ResultadoRVGestor = calcularRVGestor(dados, config)

  // ── Status dos KPIs ───────────────────────────────────────────────────────
  const statusRetracao: Cor = retencaoVal >= 65 ? 'verde' : retencaoVal >= 58 ? 'amarelo' : retencaoVal > 0 ? 'vermelho' : 'neutro'
  const statusIndisp: Cor   = indispVal > 0 && indispVal <= 14.5 ? 'verde' : indispVal <= 16 ? 'amarelo' : indispVal > 0 ? 'vermelho' : 'neutro'
  const statusTma: Cor      = tmaValSeg > 0 && tmaValSeg <= 731 ? 'verde' : tmaValSeg > 0 ? 'vermelho' : 'neutro'
  const statusTicket: Cor   = ticketVal >= -12 ? 'verde' : ticketVal >= -15 ? 'amarelo' : ticketVal < -15 ? 'vermelho' : 'neutro'
  const statusAbs: Cor      = absVal > 0 && absVal <= 5 ? 'verde' : absVal <= 8 ? 'amarelo' : absVal > 0 ? 'vermelho' : 'neutro'
  const statusMon: Cor      = totalMonitorias >= 52 ? 'verde' : totalMonitorias >= 40 ? 'amarelo' : totalMonitorias > 0 ? 'vermelho' : 'neutro'

  const progMon      = (totalMonitorias / 52) * 100
  const progRetracao = Math.max(0, Math.min(100, (retencaoVal - 55) / 10 * 100))
  const progIndisp   = Math.max(0, Math.min(100, (16 - indispVal) / 1.5 * 100))
  const progTma      = Math.max(0, Math.min(100, (800 - tmaValSeg) / 70 * 100))
  const progTicket   = Math.max(0, Math.min(100, (ticketVal + 18) / 6 * 100))
  const progAbs      = Math.max(0, Math.min(100, (10 - absVal) / 5 * 100))

  // ── Dados complementares ──────────────────────────────────────────────────
  const dadosComp = COLS_COMP.map(nome => {
    const idx = headers.findIndex(h => normH(h) === normH(nome))
    const valor = idx >= 0 ? (dataRow[idx] ?? '') : ''
    return { label: nome, valor: valor || '' }
  }).filter(d => d.valor)

  const mesAno = new Date().toLocaleDateString('pt-BR', { month: 'long', year: 'numeric' }).toUpperCase()

  const cssVars = {
    '--void2': '#07070f',
    '--void3': '#0d0d1a',
    '--gold2': '#e8c96d',
    '--gold4': 'rgba(201,168,76,0.15)',
  } as React.CSSProperties

  return (
    <PainelShell profile={profile} title="KPI Gestor & RV" iconName="TrendingUp">
      <div style={cssVars} className="space-y-6">

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
              KPI Gestor & RV
            </span>

            <div style={{ width: '1px', height: '16px', background: 'rgba(201,168,76,0.2)', flexShrink: 0 }} />

            <span style={{ fontSize: '11px', textTransform: 'uppercase', letterSpacing: '0.06em', color: 'var(--text-muted)' }}>
              {mesAno}
            </span>

            {dataResultado && (
              <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
                <div
                  className="animate-pulse"
                  style={{ width: '6px', height: '6px', borderRadius: '50%', background: '#10b981', flexShrink: 0 }}
                />
                <span style={{ fontSize: '11px', color: 'var(--text-muted)' }}>
                  Resultado de{' '}
                  <strong style={{ color: 'var(--text-secondary)', fontWeight: 600 }}>
                    {formatarDataCurta(dataResultado)}
                  </strong>
                </span>
              </div>
            )}
          </div>

          {planilha && (
            <span style={{ fontSize: '10px', color: 'var(--text-muted)', letterSpacing: '0.05em' }}>
              {planilha.nome}
            </span>
          )}
        </div>

        {/* ── Erro de planilha ── */}
        {erroSheets && (
          <div className="flex items-start gap-3 rounded-xl border px-4 py-3"
            style={{ background: 'rgba(239,68,68,0.05)', borderColor: 'rgba(239,68,68,0.2)' }}>
            <AlertTriangle size={15} className="text-rose-400 shrink-0 mt-0.5" />
            <div>
              <p className="text-sm font-medium text-rose-300">Erro ao carregar planilha</p>
              <p className="text-xs mt-0.5 text-rose-500">{erroSheets}</p>
            </div>
          </div>
        )}

        {!planilha && !erroSheets && (
          <div className="text-center py-12" style={{ color: 'var(--text-muted)', fontSize: '14px' }}>
            Nenhuma planilha ativa configurada.
          </div>
        )}

        {planilha && (
          <>
            {/* ── Seção 1: KPIs Principais ── */}
            <div className="space-y-3">
              <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
                <span style={{ fontSize: '9px', fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.14em', color: 'var(--text-muted)' }}>
                  KPIs Principais
                </span>
                <div style={{ flex: 1, height: '1px', background: 'linear-gradient(90deg, rgba(201,168,76,0.12) 0%, transparent 100%)' }} />
              </div>

              <div className="grid grid-cols-2 md:grid-cols-3 xl:grid-cols-6 gap-3">
                <KPICard
                  label="Monitorias"
                  valor={`${totalMonitorias}/52`}
                  meta="52 total (4 por op.)"
                  cor={statusMon}
                  progresso={progMon}
                />
                <KPICard
                  label="TX Retenção Bruta"
                  valor={rawRetracao || '—'}
                  meta="≥ 65%"
                  cor={statusRetracao}
                  progresso={progRetracao}
                />
                <KPICard
                  label="Indisponibilidade"
                  valor={rawIndisp || '—'}
                  meta="≤ 14.5%"
                  cor={statusIndisp}
                  progresso={progIndisp}
                />
                <KPICard
                  label="TMA"
                  valor={tmaValSeg > 0 ? segParaMMSSGestor(tmaValSeg) : (rawTma || '—')}
                  meta="≤ 12:11"
                  cor={statusTma}
                  progresso={progTma}
                />
                <KPICard
                  label="% Variação Ticket"
                  valor={rawTicket || '—'}
                  meta="≥ −12%"
                  cor={statusTicket}
                  progresso={progTicket}
                />
                <KPICard
                  label="ABS"
                  valor={rawAbs || '—'}
                  meta="≤ 5%"
                  cor={statusAbs}
                  progresso={progAbs}
                />
              </div>
            </div>

            {/* ── Seção 2: RV Calculada ── */}
            <div className="space-y-3">
              <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
                <span style={{ fontSize: '9px', fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.14em', color: 'var(--text-muted)' }}>
                  RV Calculada
                </span>
                <div style={{ flex: 1, height: '1px', background: 'linear-gradient(90deg, rgba(201,168,76,0.12) 0%, transparent 100%)' }} />
              </div>

              <div className="space-y-3">
                {/* Banner de inelegibilidade */}
                {!rv.elegivel && !rv.semDados && (
                  <div style={{
                    display: 'flex',
                    alignItems: 'flex-start',
                    gap: '10px',
                    background: 'rgba(239,68,68,0.10)',
                    border: '1px solid rgba(239,68,68,0.30)',
                    borderRadius: '10px',
                    padding: '12px 16px',
                    maxWidth: '480px',
                  }}>
                    <AlertTriangle size={15} style={{ color: '#f87171', flexShrink: 0, marginTop: 1 }} />
                    <div>
                      <p style={{ fontSize: '12px', fontWeight: 600, color: '#f87171' }}>
                        Inelegível ao RV
                      </p>
                      <p style={{ fontSize: '11px', color: 'rgba(248,113,113,0.8)', marginTop: '2px' }}>
                        {`Motivo: ${monitoriasCompletas} de 13 operadores com 4 monitorias completas. Faltam ${Math.max(0, 52 - totalMonitorias)} monitorias.`}
                      </p>
                    </div>
                  </div>
                )}
                <div style={{ opacity: rv.elegivel ? 1 : 0.6 }}>
                  <GestorRVSection rv={rv} config={config} opKpis={opKpis} absVal={absVal} />
                </div>
              </div>
            </div>

            {/* ── Seção 3: Dados Complementares ── */}
            {dadosComp.length > 0 && (
              <div className="space-y-3">
                <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
                  <span style={{ fontSize: '9px', fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.14em', color: 'var(--text-muted)' }}>
                    Dados Complementares
                  </span>
                  <div style={{ flex: 1, height: '1px', background: 'linear-gradient(90deg, rgba(255,255,255,0.08) 0%, transparent 100%)' }} />
                </div>

                <div className="grid gap-2" style={{ gridTemplateColumns: 'repeat(auto-fill, minmax(130px, 1fr))' }}>
                  {dadosComp.map(({ label, valor }) => (
                    <div key={label} className="rounded-xl px-3 py-2.5"
                      style={{ background: 'rgba(255,255,255,0.02)', border: '1px solid rgba(255,255,255,0.06)' }}>
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
          </>
        )}
      </div>
    </PainelShell>
  )
}
