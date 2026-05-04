import { getProfile } from '@/lib/auth'
import { redirect }   from 'next/navigation'
import PainelShell    from '@/components/PainelShell'
import { getMetas }   from '@/lib/kpi'
import {
  getPlanilhaAtiva,
  buscarLinhasPlanilha,
  encontrarColunaIdent,
  extrairDataAtualizacao,
  formatarDataPtBR,
  matchCelulaOperador,
} from '@/lib/sheets'
import { getOperadorPorId } from '@/lib/operadores'
import {
  getRVConfig,
  calcularRV,
  formatBRL,
  segParaMMSS,
  type ResultadoRV,
  type ComponenteRV,
} from '@/lib/rv'
import {
  Trophy, CheckCircle, XCircle, AlertTriangle,
  TrendingUp, TrendingDown, Minus, Info,
  Percent, Clock, ShoppingCart, Ticket, CalendarCheck,
} from 'lucide-react'

// ── Ícone por componente ──────────────────────────────────────────────────────
const ICONES: Record<string, React.ReactNode> = {
  retracao: <TrendingUp  size={15} />,
  indisp:   <TrendingDown size={15} />,
  tma:      <Clock       size={15} />,
  ticket:   <Ticket      size={15} />,
}

// ── Card de componente ────────────────────────────────────────────────────────
function ComponenteCard({ c, idx }: { c: ComponenteRV; idx: number }) {
  const ganhou    = c.ganhou
  const naoAplica = !c.aplicavel

  const cor     = naoAplica ? 'var(--text-muted)'
                : ganhou    ? '#34d399'
                : '#f87171'
  const bg      = naoAplica ? 'rgba(255,255,255,0.02)'
                : ganhou    ? 'rgba(16,185,129,0.05)'
                : 'rgba(239,68,68,0.05)'
  const borda   = naoAplica ? 'rgba(255,255,255,0.06)'
                : ganhou    ? 'rgba(16,185,129,0.18)'
                : 'rgba(239,68,68,0.18)'

  const IconeStatus = naoAplica ? Minus : ganhou ? CheckCircle : XCircle

  return (
    <div
      className="rounded-2xl border px-5 py-4 animate-fadeInUp"
      style={{
        background: bg,
        borderColor: borda,
        animationDelay: `${idx * 60}ms`,
        borderLeft: `3px solid ${cor}`,
      }}
    >
      <div className="flex items-center justify-between flex-wrap gap-3">
        {/* Esquerda: ícone + label + valor */}
        <div className="flex items-center gap-3">
          <div
            className="p-2 rounded-xl shrink-0"
            style={{ background: `${bg}`, color: cor, border: `1px solid ${borda}` }}
          >
            {ICONES[c.id] ?? <Percent size={15} />}
          </div>
          <div>
            <p className="text-xs font-bold uppercase" style={{ color: 'var(--text-muted)', letterSpacing: '0.08em' }}>
              {c.label}
            </p>
            <p className="text-xl font-extrabold tabular-nums mt-0.5" style={{ color: cor }}>
              {c.valorDisplay}
            </p>
          </div>
        </div>

        {/* Centro: regra */}
        <div className="text-xs" style={{ color: 'var(--text-muted)' }}>
          {c.regraDisplay}
          {c.detalhe && (
            <p className="mt-0.5 text-[10px]" style={{ color: 'var(--text-muted)', fontStyle: 'italic' }}>
              {c.detalhe}
            </p>
          )}
        </div>

        {/* Direita: badge + prêmio */}
        <div className="flex items-center gap-2 shrink-0">
          <span
            className="inline-flex items-center gap-1 text-[10px] font-bold px-2 py-1 rounded-full border uppercase"
            style={{ background: bg, color: cor, borderColor: borda, letterSpacing: '0.06em' }}
          >
            <IconeStatus size={9} />
            {naoAplica ? 'N/A' : ganhou ? 'Ganhou' : 'Perdeu'}
          </span>
          <span
            className="text-base font-extrabold tabular-nums"
            style={{ color: ganhou ? '#34d399' : 'var(--text-muted)' }}
          >
            {formatBRL(c.premio)}
          </span>
        </div>
      </div>
    </div>
  )
}

// ── Página ────────────────────────────────────────────────────────────────────
export default async function RVEstimadaPage() {
  const profile = await getProfile()
  if (!profile.operador_id) redirect('/painel')

  const operador = getOperadorPorId(profile.operador_id)
  if (!operador) redirect('/painel')

  const [planilha, rvConfig] = await Promise.all([
    getPlanilhaAtiva(),
    getRVConfig(),
  ])

  let rv: ResultadoRV | null = null
  let dataAtualizacao: string | null = null

  if (planilha) {
    try {
      const { headers, rows } = await buscarLinhasPlanilha(planilha.spreadsheet_id, planilha.aba)
      dataAtualizacao = extrairDataAtualizacao(rows)
      const col = encontrarColunaIdent(headers)
      const row = rows.find(r => matchCelulaOperador(r[col] ?? '', operador.username, operador.nome))
      if (row) rv = calcularRV(headers, row, rvConfig)
    } catch { /* planilha indisponível */ }
  }

  const rvTotalFormatado = rv && !rv.semDados ? formatBRL(rv.rvTotal) : '—'
  const corTotal         = rv?.elegivel ? 'var(--gold-light)' : rv?.semDados ? 'var(--text-muted)' : '#f87171'

  return (
    <PainelShell profile={profile} title="RV Estimada">
      <div className="space-y-8 max-w-2xl">

        {/* Header */}
        <div>
          <h2
            className="text-2xl font-extrabold"
            style={{
              background: 'linear-gradient(135deg, var(--gold-bright) 0%, var(--gold-light) 100%)',
              WebkitBackgroundClip: 'text', WebkitTextFillColor: 'transparent',
              backgroundClip: 'text', letterSpacing: '-0.02em',
            }}
          >
            RV Estimada
          </h2>
          <p className="text-sm mt-1" style={{ color: 'var(--text-muted)' }}>
            {dataAtualizacao
              ? `Dados até ${formatarDataPtBR(dataAtualizacao)}`
              : 'Cálculo com base na planilha ativa'}
          </p>
        </div>

        {/* ── Card principal ── */}
        <div
          className="rounded-2xl border p-6 relative overflow-hidden"
          style={{
            background: rv?.elegivel
              ? 'linear-gradient(135deg, rgba(201,168,76,0.06) 0%, rgba(201,168,76,0.02) 100%)'
              : 'rgba(255,255,255,0.02)',
            borderColor: rv?.elegivel ? 'rgba(201,168,76,0.25)' : 'rgba(255,255,255,0.08)',
          }}
        >
          {/* Radial corner */}
          <div className="absolute top-0 right-0 w-40 h-40 pointer-events-none" style={{
            background: rv?.elegivel
              ? 'radial-gradient(circle at top right, rgba(201,168,76,0.12) 0%, transparent 70%)'
              : 'radial-gradient(circle at top right, rgba(255,255,255,0.03) 0%, transparent 70%)',
          }} />

          <div className="relative flex items-start justify-between flex-wrap gap-4">
            <div>
              <div className="flex items-center gap-3 mb-1">
                <div
                  className="p-2.5 rounded-xl"
                  style={{
                    background: rv?.elegivel ? 'rgba(201,168,76,0.12)' : 'rgba(255,255,255,0.05)',
                    color: rv?.elegivel ? 'var(--gold-light)' : 'var(--text-muted)',
                  }}
                >
                  <Trophy size={20} />
                </div>
                <p className="text-xs font-bold uppercase" style={{ color: 'var(--text-muted)', letterSpacing: '0.10em' }}>
                  Valor Estimado
                </p>
              </div>
              <p
                className="text-5xl font-extrabold tabular-nums mt-2"
                style={{ color: corTotal, letterSpacing: '-0.03em' }}
              >
                {rvTotalFormatado}
              </p>
            </div>

            {/* Badge elegibilidade */}
            {rv && !rv.semDados && (
              <span
                className="flex items-center gap-1.5 px-3 py-1.5 rounded-full text-xs font-bold uppercase border"
                style={rv.elegivel
                  ? { background: 'rgba(16,185,129,0.10)', color: '#34d399', borderColor: 'rgba(16,185,129,0.25)', letterSpacing: '0.08em' }
                  : { background: 'rgba(239,68,68,0.10)',  color: '#f87171', borderColor: 'rgba(239,68,68,0.25)',  letterSpacing: '0.08em' }
                }
              >
                {rv.elegivel ? <CheckCircle size={11} /> : <XCircle size={11} />}
                {rv.elegivel ? 'Elegível' : 'Inelegível'}
              </span>
            )}
          </div>

          {/* Motivos de inelegibilidade */}
          {rv && !rv.elegivel && rv.motivosInelegivel.length > 0 && (
            <div
              className="mt-4 flex items-start gap-2 rounded-xl px-4 py-3"
              style={{ background: 'rgba(239,68,68,0.06)', border: '1px solid rgba(239,68,68,0.18)' }}
            >
              <AlertTriangle size={14} className="shrink-0 mt-0.5" style={{ color: '#f87171' }} />
              <div className="space-y-0.5">
                {rv.motivosInelegivel.map((m) => (
                  <p key={m} className="text-xs font-semibold" style={{ color: '#f87171' }}>{m}</p>
                ))}
              </div>
            </div>
          )}

          {/* Sem dados */}
          {(!rv || rv.semDados) && (
            <div className="mt-4 flex items-start gap-2 rounded-xl px-4 py-3"
              style={{ background: 'rgba(59,130,246,0.06)', border: '1px solid rgba(59,130,246,0.15)' }}>
              <Info size={14} className="shrink-0 mt-0.5" style={{ color: '#60a5fa' }} />
              <p className="text-xs" style={{ color: 'var(--text-secondary)' }}>
                {planilha
                  ? `Sem dados na planilha para ${operador.username}. Verifique o mapeamento de colunas.`
                  : 'Nenhuma planilha ativa configurada.'}
              </p>
            </div>
          )}
        </div>

        {/* ── Breakdown dos componentes ── */}
        {rv && !rv.semDados && (
          <div className="space-y-3">
            <h3 className="text-sm font-bold" style={{ color: 'var(--text-secondary)' }}>
              Como sua RV foi calculada
            </h3>

            {rv.componentes.map((c, i) => (
              <ComponenteCard key={c.id} c={c} idx={i} />
            ))}

            {/* RV Base */}
            <div
              className="rounded-2xl border px-5 py-3 flex items-center justify-between animate-fadeInUp"
              style={{
                background: 'rgba(255,255,255,0.02)',
                borderColor: 'rgba(255,255,255,0.08)',
                animationDelay: `${rv.componentes.length * 60}ms`,
              }}
            >
              <p className="text-sm font-semibold" style={{ color: 'var(--text-secondary)' }}>RV Base</p>
              <p className="text-lg font-extrabold tabular-nums" style={{ color: 'var(--text-primary)' }}>
                {formatBRL(rv.rvBase)}
              </p>
            </div>

            {/* Multiplicador pedidos */}
            {rv.pedidosMeta > 0 && (
              <div
                className="rounded-2xl border px-5 py-4 animate-fadeInUp"
                style={{
                  background: 'rgba(59,130,246,0.04)',
                  borderColor: 'rgba(59,130,246,0.15)',
                  borderLeft: '3px solid rgba(59,130,246,0.5)',
                  animationDelay: `${(rv.componentes.length + 1) * 60}ms`,
                }}
              >
                <div className="flex items-center justify-between flex-wrap gap-3">
                  <div className="flex items-center gap-3">
                    <div className="p-2 rounded-xl" style={{ background: 'rgba(59,130,246,0.10)', color: '#60a5fa' }}>
                      <ShoppingCart size={15} />
                    </div>
                    <div>
                      <p className="text-xs font-bold uppercase" style={{ color: 'var(--text-muted)', letterSpacing: '0.08em' }}>
                        Multiplicador de Pedidos
                      </p>
                      <p className="text-sm mt-0.5" style={{ color: '#93c5fd' }}>
                        {rv.pedidosRealizados > 0
                          ? `${rv.pedidosRealizados} realizados / ${rv.pedidosMeta} meta = ${Math.round(rv.multiplicador * 100)}%`
                          : `Meta: ${rv.pedidosMeta} pedidos`}
                      </p>
                    </div>
                  </div>
                  <div className="text-right">
                    <p className="text-xs" style={{ color: 'var(--text-muted)' }}>
                      × {rv.multiplicador.toFixed(4).replace(/0+$/, '').replace(/\.$/, '')}
                    </p>
                    <p className="text-lg font-extrabold tabular-nums" style={{ color: '#93c5fd' }}>
                      {formatBRL(rv.rvAposPedidos)}
                    </p>
                  </div>
                </div>
              </div>
            )}

            {/* Bônus */}
            {(() => {
              const b  = rv.bonusCriterios
              const ok = rv.bonus > 0
              return (
                <div
                  className="rounded-2xl border px-5 py-4 animate-fadeInUp"
                  style={{
                    background: ok ? 'rgba(201,168,76,0.05)' : 'rgba(255,255,255,0.02)',
                    borderColor: ok ? 'rgba(201,168,76,0.25)' : 'rgba(255,255,255,0.08)',
                    borderLeft:  `3px solid ${ok ? 'var(--gold)' : 'rgba(255,255,255,0.15)'}`,
                    animationDelay: `${(rv.componentes.length + 2) * 60}ms`,
                  }}
                >
                  <div className="flex items-start justify-between flex-wrap gap-3">
                    <div className="flex items-center gap-3">
                      <div className="p-2 rounded-xl" style={{
                        background: ok ? 'rgba(201,168,76,0.12)' : 'rgba(255,255,255,0.04)',
                        color: ok ? 'var(--gold-light)' : 'var(--text-muted)',
                      }}>
                        <Trophy size={15} />
                      </div>
                      <div>
                        <p className="text-xs font-bold uppercase mb-2" style={{ color: ok ? 'var(--gold)' : 'var(--text-muted)', letterSpacing: '0.08em' }}>
                          Bônus {formatBRL(rv.config.bonusValor)}
                        </p>
                        <div className="flex items-center gap-2 flex-wrap">
                          {[
                            { label: `TX ≥${rv.config.bonusRetracaoMinima}%`, ok: b.retracaoOk },
                            { label: rv.metaChurnUsada > 0 ? `Churn ≤${rv.metaChurnUsada}` : 'Churn (N/A)', ok: b.churnOk },
                            { label: `Indisp ≤${rv.config.bonusIndispMaxima}%`, ok: b.indispOk },
                          ].map(({ label, ok: c }) => (
                            <span
                              key={label}
                              className="inline-flex items-center gap-1 text-[10px] px-2 py-0.5 rounded-full"
                              style={{
                                background: c ? 'rgba(16,185,129,0.10)' : 'rgba(239,68,68,0.10)',
                                color:      c ? '#34d399' : '#f87171',
                                border: `1px solid ${c ? 'rgba(16,185,129,0.25)' : 'rgba(239,68,68,0.25)'}`,
                              }}
                            >
                              {c ? <CheckCircle size={8} /> : <XCircle size={8} />}
                              {label}
                            </span>
                          ))}
                        </div>
                      </div>
                    </div>
                    <p className="text-lg font-extrabold tabular-nums" style={{ color: ok ? 'var(--gold-light)' : 'var(--text-muted)' }}>
                      {formatBRL(rv.bonus)}
                    </p>
                  </div>
                </div>
              )
            })()}

            {/* RV Total */}
            <div
              className="rounded-2xl border px-6 py-5 animate-fadeInUp relative overflow-hidden"
              style={{
                background: 'linear-gradient(135deg, rgba(201,168,76,0.10) 0%, rgba(201,168,76,0.04) 60%, rgba(201,168,76,0.07) 100%)',
                borderColor: 'rgba(201,168,76,0.35)',
                boxShadow: '0 8px 32px rgba(201,168,76,0.10), 0 0 0 1px rgba(201,168,76,0.06) inset',
                animationDelay: `${(rv.componentes.length + 3) * 60}ms`,
              }}
            >
              {/* Radial glow corner */}
              <div className="absolute top-0 right-0 w-32 h-32 pointer-events-none" style={{
                background: 'radial-gradient(circle at top right, rgba(201,168,76,0.18) 0%, transparent 70%)',
              }} />
              <div className="relative flex items-center justify-between">
                <div>
                  <p
                    className="text-[10px] font-bold uppercase mb-1"
                    style={{
                      background: 'linear-gradient(135deg, var(--gold-bright) 0%, var(--gold-light) 100%)',
                      WebkitBackgroundClip: 'text', WebkitTextFillColor: 'transparent', backgroundClip: 'text',
                      letterSpacing: '0.12em',
                    }}
                  >
                    RV Total do Mês
                  </p>
                  {!rv.elegivel && (
                    <span className="text-[10px] px-2 py-0.5 rounded-full inline-block" style={{ background: 'rgba(239,68,68,0.12)', color: '#f87171', border: '1px solid rgba(239,68,68,0.22)' }}>
                      Inelegível ao RV
                    </span>
                  )}
                </div>
                <p
                  className="text-4xl font-extrabold tabular-nums"
                  style={{
                    background: 'linear-gradient(135deg, var(--gold-bright) 0%, var(--gold-light) 100%)',
                    WebkitBackgroundClip: 'text', WebkitTextFillColor: 'transparent', backgroundClip: 'text',
                    letterSpacing: '-0.02em',
                    textShadow: 'none',
                  }}
                >
                  {formatBRL(rv.rvTotal)}
                </p>
              </div>
            </div>
          </div>
        )}

        {/* Regras do mês (resumo config) */}
        <div
          className="rounded-2xl border px-5 py-4"
          style={{ background: 'rgba(255,255,255,0.01)', borderColor: 'rgba(255,255,255,0.06)' }}
        >
          <h3 className="text-xs font-bold uppercase mb-3" style={{ color: 'var(--text-muted)', letterSpacing: '0.10em' }}>
            Regras do Mês
          </h3>
          <div className="grid grid-cols-2 gap-2 text-xs" style={{ color: 'var(--text-muted)' }}>
            <p>Meta de pedidos: <span style={{ color: 'var(--text-secondary)' }}>{rvConfig.pedidosMeta}</span></p>
            <p>ABS máximo: <span style={{ color: 'var(--text-secondary)' }}>{rvConfig.absMaximo}%</span></p>
            <p>TMA limite: <span style={{ color: 'var(--text-secondary)' }}>{segParaMMSS(rvConfig.tmaLimiteSeg)}</span></p>
            <p>Indisp limite: <span style={{ color: 'var(--text-secondary)' }}>{rvConfig.indispLimite}%</span></p>
            {(rv?.metaChurnUsada ?? 0) > 0 && (
              <p>Meta churn: <span style={{ color: 'var(--text-secondary)' }}>{rv!.metaChurnUsada}</span></p>
            )}
          </div>
        </div>

      </div>
    </PainelShell>
  )
}
