import { requireGestor } from '@/lib/auth'
import PainelShell from '@/components/PainelShell'
import { getPlanilhaAtiva, buscarLinhasPlanilha, formatarDataCurta } from '@/lib/sheets'
import { getRVGestorConfig, calcularRVGestor, segParaMMSSGestor, formatBRLGestor } from '@/lib/rv-gestor'
import type { ResultadoRVGestor, RVGestorConfig } from '@/lib/rv-gestor-utils'
import { CheckCircle, XCircle, AlertTriangle } from 'lucide-react'

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

// ── Card de RV ────────────────────────────────────────────────────────────────

function RVCard({ rv, config }: { rv: ResultadoRVGestor; config: RVGestorConfig }) {
  if (rv.semDados) {
    return (
      <div style={{ background: '#0d0d1a', border: '1px solid rgba(201,168,76,0.08)', borderRadius: '16px', padding: '24px', textAlign: 'center' }}>
        <p style={{ color: 'var(--text-muted)', fontSize: '14px' }}>Sem dados na planilha.</p>
      </div>
    )
  }

  return (
    <div style={{
      background: '#0d0d1a',
      border: '1px solid rgba(201,168,76,0.08)',
      borderRadius: '16px',
      overflow: 'hidden',
    }}>
      {/* Header do card */}
      <div style={{
        background: 'rgba(201,168,76,0.04)',
        borderBottom: '1px solid rgba(201,168,76,0.08)',
        padding: '14px 20px',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'space-between',
        gap: '12px',
        flexWrap: 'wrap',
      }}>
        <span style={{
          fontFamily: 'var(--ff-display)',
          fontSize: '13px',
          fontWeight: 700,
          textTransform: 'uppercase',
          letterSpacing: '0.08em',
          background: 'linear-gradient(135deg, #e8c96d 0%, #c9a84c 100%)',
          WebkitBackgroundClip: 'text',
          WebkitTextFillColor: 'transparent',
          backgroundClip: 'text',
        }}>
          RV Calculada
        </span>

        {/* Elegibilidade badge */}
        <span style={{
          display: 'inline-flex',
          alignItems: 'center',
          gap: '5px',
          fontSize: '10px',
          fontWeight: 700,
          letterSpacing: '0.06em',
          textTransform: 'uppercase',
          padding: '4px 12px',
          borderRadius: '99px',
          background: rv.elegivel ? 'rgba(34,197,94,0.10)' : 'rgba(239,68,68,0.10)',
          border: rv.elegivel ? '1px solid rgba(34,197,94,0.30)' : '1px solid rgba(239,68,68,0.30)',
          color: rv.elegivel ? '#34d399' : '#f87171',
        }}>
          {rv.elegivel ? <CheckCircle size={11} /> : <XCircle size={11} />}
          {rv.elegivel ? 'Elegível' : 'Inelegível'}
        </span>
      </div>

      <div className="p-5 space-y-3">
        {/* Motivo de inelegibilidade */}
        {!rv.elegivel && rv.motivoInelegivel && (
          <div className="flex items-start gap-2 rounded-xl px-3 py-2.5"
            style={{ background: 'rgba(239,68,68,0.06)', border: '1px solid rgba(239,68,68,0.15)' }}>
            <AlertTriangle size={13} style={{ color: '#f87171', flexShrink: 0, marginTop: 1 }} />
            <p style={{ fontSize: '12px', color: '#f87171' }}>{rv.motivoInelegivel}</p>
          </div>
        )}

        {/* Linhas do breakdown */}
        {[
          {
            label: 'TX Retenção',
            detail: rv.retencaoFaixa ? `≥${rv.retencaoFaixa.min}%` : '<58%',
            valor: formatBRLGestor(rv.retencaoBase),
            cor: rv.retencaoBase > 0 ? '#34d399' : 'var(--text-muted)',
          },
          {
            label: 'Indisponibilidade',
            detail: rv.indispBonus > 0 ? `≤${config.indispMeta}%` : `>${config.indispMeta}%`,
            valor: formatBRLGestor(rv.indispBonus),
            cor: rv.indispBonus > 0 ? '#34d399' : 'var(--text-muted)',
          },
          {
            label: 'TMA',
            detail: rv.tmaBonus > 0 ? `≤${segParaMMSSGestor(config.tmaMetaSeg)}` : `>${segParaMMSSGestor(config.tmaMetaSeg)}`,
            valor: formatBRLGestor(rv.tmaBonus),
            cor: rv.tmaBonus > 0 ? '#34d399' : 'var(--text-muted)',
          },
          ...(rv.ticketAplicavel ? [{
            label: 'Variação Ticket',
            detail: rv.ticketFaixa ? `≥${rv.ticketFaixa.min}%` : '<-18%',
            valor: formatBRLGestor(rv.ticketBonus),
            cor: rv.ticketBonus > 0 ? '#34d399' : 'var(--text-muted)' as string,
          }] : []),
        ].map(({ label, detail, valor, cor }) => (
          <div key={label} style={{
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'space-between',
            padding: '8px 12px',
            borderRadius: '10px',
            background: 'rgba(255,255,255,0.02)',
            border: '1px solid rgba(255,255,255,0.04)',
          }}>
            <div>
              <p style={{ fontSize: '11px', fontWeight: 500, color: 'var(--text-secondary)' }}>{label}</p>
              <p style={{ fontSize: '10px', color: 'var(--text-muted)', marginTop: '1px' }}>{detail}</p>
            </div>
            <span style={{ fontSize: '13px', fontWeight: 700, fontVariantNumeric: 'tabular-nums', color: cor }}>
              {valor}
            </span>
          </div>
        ))}

        {/* RV Base subtotal */}
        <div style={{
          display: 'flex', justifyContent: 'space-between', alignItems: 'center',
          padding: '8px 12px', borderTop: '1px solid rgba(255,255,255,0.06)',
        }}>
          <span style={{ fontSize: '11px', color: 'var(--text-muted)' }}>Subtotal (RV Base)</span>
          <span style={{ fontSize: '13px', fontWeight: 700, fontVariantNumeric: 'tabular-nums', color: 'var(--text-secondary)' }}>
            {formatBRLGestor(rv.rvBase)}
          </span>
        </div>

        {/* Bônus */}
        {rv.bonusAplicado && (
          <div style={{
            display: 'flex', justifyContent: 'space-between', alignItems: 'center',
            padding: '8px 12px', borderRadius: '10px',
            background: 'rgba(201,168,76,0.06)', border: '1px solid rgba(201,168,76,0.15)',
          }}>
            <span style={{ fontSize: '11px', color: 'var(--gold-light)' }}>
              Bônus {config.bonusPercentual}% (Retenção ≥{config.bonusRetencaoMin}% e ABS ≤{config.bonusAbsMax}%)
            </span>
            <span style={{ fontSize: '13px', fontWeight: 700, color: 'var(--gold-light)', fontVariantNumeric: 'tabular-nums' }}>
              +{formatBRLGestor(rv.bonusValor)}
            </span>
          </div>
        )}

        {/* Deflatores */}
        {rv.deflatores.length > 0 && (
          <div className="space-y-2">
            <p style={{ fontSize: '9px', fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.10em', color: '#f87171' }}>
              Deflatores
            </p>
            {rv.deflatores.map((d, i) => (
              <div key={i} style={{
                display: 'flex', justifyContent: 'space-between', alignItems: 'center',
                padding: '7px 12px', borderRadius: '10px',
                background: 'rgba(239,68,68,0.05)', border: '1px solid rgba(239,68,68,0.12)',
              }}>
                <span style={{ fontSize: '11px', color: 'var(--text-muted)' }}>
                  {d.motivo} (−{d.perda}%)
                </span>
                <span style={{ fontSize: '12px', fontWeight: 600, color: '#f87171', fontVariantNumeric: 'tabular-nums' }}>
                  −{formatBRLGestor(d.valorDeduzido)}
                </span>
              </div>
            ))}
          </div>
        )}

        {/* RV FINAL */}
        <div style={{
          display: 'flex', justifyContent: 'space-between', alignItems: 'center',
          padding: '14px 16px', borderRadius: '12px',
          background: rv.elegivel ? 'rgba(201,168,76,0.08)' : 'rgba(255,255,255,0.03)',
          border: rv.elegivel ? '1px solid rgba(201,168,76,0.25)' : '1px solid rgba(255,255,255,0.06)',
          marginTop: '4px',
        }}>
          <span style={{
            fontFamily: 'var(--ff-display)',
            fontSize: '13px',
            fontWeight: 700,
            textTransform: 'uppercase',
            letterSpacing: '0.08em',
            color: rv.elegivel ? 'var(--gold)' : 'var(--text-muted)',
          }}>
            RV Final
          </span>
          <span style={{
            fontFamily: 'var(--ff-display)',
            fontSize: '22px',
            fontWeight: 700,
            fontVariantNumeric: 'tabular-nums',
            background: rv.elegivel
              ? 'linear-gradient(135deg, #e8c96d 0%, #c9a84c 100%)'
              : 'none',
            WebkitBackgroundClip: rv.elegivel ? 'text' : undefined,
            WebkitTextFillColor: rv.elegivel ? 'transparent' : undefined,
            backgroundClip: rv.elegivel ? 'text' : undefined,
            color: rv.elegivel ? undefined : 'var(--text-muted)',
          }}>
            {formatBRLGestor(rv.rvFinal)}
          </span>
        </div>
      </div>
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

  const config = await getRVGestorConfig()

  if (planilha) {
    try {
      const [gestorData, monitoriaData] = await Promise.all([
        buscarLinhasPlanilha(planilha.spreadsheet_id, 'KPI GESTOR', 5),
        buscarLinhasPlanilha(planilha.spreadsheet_id, 'MONITORIA').catch(() => ({ headers: [], rows: [] })),
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

              <div className="max-w-lg">
                <RVCard rv={rv} config={config} />
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
