'use client'

import { useState } from 'react'
import type { ResultadoRV, ComponenteRV, RVConfig, BonusCriterios } from '@/lib/rv-utils'
import { formatBRL, segParaMMSS } from '@/lib/rv-utils'
import { XCircle, ChevronDown, Info } from 'lucide-react'
import { useCountUp } from '@/hooks/useCountUp'
import { PainelHeader, LinhaHorizontalDourada } from '@/components/painel/PainelHeader'
import { PainelSectionTitle } from '@/components/painel/PainelSectionTitle'

export interface MeuRVProps {
  resultado:       ResultadoRV
  nomeOperador:    string
  mesLabel:        string
  dataAtualizacao: string | null
  absValAtual:     number
  faltasNoMes:     number
}

const FF_SYNE = "'Syne', sans-serif"
const FF_DM   = "'DM Sans', sans-serif"

const COMP_LABELS: Record<string, string> = {
  retracao: 'TX. RETENÇÃO',
  indisp:   'INDISP.',
  tma:      'TMA',
  ticket:   'VR. TICKET',
}

// ── Main ──────────────────────────────────────────────────────────────────────

export default function MeuRVClient({
  resultado, absValAtual, faltasNoMes, mesLabel, dataAtualizacao,
}: MeuRVProps) {
  const {
    elegivel, motivosInelegivel, componentes,
    rvBase, pedidosRealizados, pedidosMeta, multiplicador, rvAposPedidos,
    bonusCriterios, bonus, rvTotal,
    penalidades, descontoIndividualAplicado, rvFinal,
    semDados, config,
  } = resultado

  const rvAnimado = useCountUp(rvFinal, 800)
  const [regrasOpen, setRegrasOpen] = useState(false)

  return (
    <>
      <style dangerouslySetInnerHTML={{ __html: `
        @keyframes rvSlideIn {
          from { opacity: 0; transform: translateY(10px); }
          to   { opacity: 1; transform: translateY(0); }
        }
        @media (max-width: 767px) {
          .rv-cols-grid { grid-template-columns: 1fr !important; }
        }
      `}} />

      <div className="halo-cards-bg" style={{ display: 'flex', flexDirection: 'column', gap: '14px' }}>

        <PainelHeader titulo="MEU RV" mesLabel={mesLabel} dataReferencia={dataAtualizacao} />
        <LinhaHorizontalDourada />

        <PainelSectionTitle>RV ESTIMADO</PainelSectionTitle>

        <RVHeroCard
          elegivel={elegivel}
          rvAnimado={rvAnimado}
          motivosInelegivel={motivosInelegivel}
          semDados={semDados}
          absValAtual={absValAtual}
          absMaximo={config.absMaximo}
          faltasNoMes={faltasNoMes}
        />

        {!semDados && (
          <>
            <PainelSectionTitle>COMPONENTES RV</PainelSectionTitle>

            <div className="rv-cols-grid" style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '24px' }}>

              {/* Esquerda — 4 cards */}
              <div style={{ display: 'flex', flexDirection: 'column', gap: '10px' }}>
                <ComponentesSection componentes={componentes} elegivel={elegivel} />
              </div>

              {/* Direita — cálculo */}
              <div style={{ display: 'flex', flexDirection: 'column', gap: '14px', paddingTop: '4px' }}>
                <PainelSectionTitle>CÁLCULO RV</PainelSectionTitle>
                <CalculoSection
                  componentes={componentes}
                  rvBase={rvBase}
                  pedidosRealizados={pedidosRealizados}
                  pedidosMeta={pedidosMeta}
                  multiplicador={multiplicador}
                  rvAposPedidos={rvAposPedidos}
                  bonusCriterios={bonusCriterios}
                  bonus={bonus}
                  rvTotal={rvTotal}
                  penalidades={penalidades}
                  descontoIndividualAplicado={descontoIndividualAplicado}
                  rvFinal={rvFinal}
                  elegivel={elegivel}
                  config={config}
                />
              </div>
            </div>
          </>
        )}

        <RegrasSection config={config} expanded={regrasOpen} onToggle={() => setRegrasOpen(v => !v)} />
      </div>
    </>
  )
}

// ── Hero Card ─────────────────────────────────────────────────────────────────

function RVHeroCard({ elegivel, rvAnimado, motivosInelegivel, semDados, absValAtual, absMaximo, faltasNoMes }: {
  elegivel: boolean
  rvAnimado: number
  motivosInelegivel: string[]
  semDados: boolean
  absValAtual: number
  absMaximo: number
  faltasNoMes: number
}) {
  if (semDados) {
    return (
      <div style={{
        background: '#070714', border: '1px solid rgba(244,212,124,0.15)',
        borderRadius: '20px', padding: '32px', textAlign: 'center',
      }}>
        <p style={{ color: 'var(--text-muted)', fontSize: '14px' }}>
          Dados insuficientes para calcular o RV deste mês.
        </p>
      </div>
    )
  }

  const badgeLabel     = elegivel ? 'ELEGÍVEL'   : 'INELEGÍVEL'
  const badgeTextColor = elegivel ? '#22c55e'     : '#E33939'
  const badgeBg        = elegivel ? 'rgba(74,222,128,0.13)'  : 'rgba(242,96,96,0.13)'
  const badgeBorder    = elegivel ? '1px solid rgba(34,197,94,0.72)' : '1px solid rgba(227,57,57,0.72)'

  const absOk    = absValAtual <= absMaximo
  const faltasOk = faltasNoMes < 2
  const pct      = (n: number) => n.toLocaleString('pt-BR', { minimumFractionDigits: 1, maximumFractionDigits: 1 })

  return (
    <div style={{
      background: '#070714', border: '1px solid rgba(244,212,124,0.15)',
      borderRadius: '20px', padding: '28px 32px',
      display: 'flex', alignItems: 'stretch', minHeight: '157px',
      boxShadow: '0 4px 24px rgba(0,0,0,0.4)',
    }}>
      {/* Left — valor RV */}
      <div style={{ flex: '0 0 auto', display: 'flex', alignItems: 'center', justifyContent: 'flex-start', paddingRight: '16px' }}>
        <span style={{
          fontFamily: FF_DM, fontSize: '64px', fontWeight: 900, lineHeight: 1,
          fontVariantNumeric: 'tabular-nums', color: '#B0AAFF', letterSpacing: '-0.02em',
        }}>
          {formatBRL(rvAnimado)}
        </span>
      </div>

      {/* Divisória vertical */}
      <div style={{ width: '1px', background: '#211F3C', margin: '8px 0', flexShrink: 0 }} />

      {/* Right — badge + elegibilidade */}
      <div style={{
        flex: 1, display: 'flex', flexDirection: 'column',
        alignItems: 'flex-start', justifyContent: 'flex-start',
        gap: '12px', paddingLeft: '16px', paddingTop: '8px',
      }}>
        <div style={{
          width: '147px', height: '29px',
          display: 'flex', alignItems: 'center', justifyContent: 'center',
          borderRadius: '0', background: badgeBg, border: badgeBorder,
        }}>
          <span style={{
            fontFamily: FF_SYNE, fontSize: '20px', fontWeight: 600,
            color: badgeTextColor, letterSpacing: '0.03em',
          }}>
            {badgeLabel}
          </span>
        </div>

        <div style={{ display: 'flex', flexDirection: 'column', gap: '5px' }}>
          <EligCritRow ok={absOk}    label="ABS"    valor={`${pct(absValAtual)}%`} meta={`≤ ${absMaximo}%`} />
          <EligCritRow ok={faltasOk} label="FALTAS" valor={String(faltasNoMes)}     meta="≤ 1" />
        </div>

        {!elegivel && motivosInelegivel.length > 0 && (
          <div style={{ display: 'flex', flexDirection: 'column', gap: '4px' }}>
            {motivosInelegivel.map((m, i) => (
              <div key={i} style={{ display: 'flex', alignItems: 'flex-start', gap: '6px' }}>
                <XCircle size={11} style={{ color: '#E33939', flexShrink: 0, marginTop: '2px' }} />
                <span style={{ fontFamily: FF_DM, fontSize: '11px', color: 'rgba(252,165,165,0.85)', lineHeight: 1.4 }}>
                  {m}
                </span>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  )
}

function EligCritRow({ ok, label, valor, meta }: {
  ok: boolean; label: string; valor: string; meta: string
}) {
  const cor = ok ? 'rgba(34,197,94,0.8)' : 'rgba(227,57,57,0.8)'
  return (
    <div style={{ display: 'inline-flex', alignItems: 'center', gap: '6px' }}>
      <span style={{ fontFamily: FF_SYNE, fontSize: '11px', fontWeight: 700, color: ok ? '#22c55e' : '#E33939' }}>
        {ok ? '✓' : '✗'}
      </span>
      <span style={{ fontFamily: FF_SYNE, fontSize: '11px', fontWeight: 600, color: cor, letterSpacing: '0.06em' }}>
        {label}
      </span>
      <span style={{ fontFamily: FF_DM, fontSize: '11px', color: cor, fontVariantNumeric: 'tabular-nums' }}>
        {valor}
      </span>
      <span style={{ fontFamily: FF_DM, fontSize: '10px', color: 'rgba(114,112,143,0.7)' }}>
        {meta}
      </span>
    </div>
  )
}

// ── Componentes (esquerda) ────────────────────────────────────────────────────

function ComponentesSection({ componentes, elegivel }: {
  componentes: ComponenteRV[]; elegivel: boolean
}) {
  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: '10px' }}>
      {componentes.map(comp => {
        const ganhou = comp.ganhou && elegivel && comp.aplicavel
        let badgeText: string
        if (!comp.aplicavel)     badgeText = 'N/A'
        else if (ganhou)         badgeText = `+${formatBRL(comp.premio)}`
        else                     badgeText = 'FORA'

        return (
          <ComponenteCard
            key={comp.id}
            label={COMP_LABELS[comp.id] ?? comp.label.toUpperCase()}
            valorDisplay={comp.valorDisplay}
            verde={ganhou}
            aplicavel={comp.aplicavel}
            badgeText={badgeText}
          />
        )
      })}
    </div>
  )
}

function ComponenteCard({ label, valorDisplay, verde, aplicavel, badgeText }: {
  label: string; valorDisplay: string; verde: boolean; aplicavel: boolean; badgeText: string
}) {
  const isMonetario = verde && /^\+R\$[\s ]/.test(badgeText)
  const badgeNumero = isMonetario ? badgeText.replace(/^\+R\$[\s ]/, '') : null

  return (
    <div style={{
      width: '100%', background: '#070714',
      border: '1px solid rgba(244,212,124,0.15)',
      borderRadius: '12px', padding: '12px 20px',
      display: 'flex', alignItems: 'center',
    }}>
      {/* Left — label + valor */}
      <div style={{ flex: '0 0 50%', display: 'flex', flexDirection: 'column', justifyContent: 'center', gap: '2px', paddingRight: '16px' }}>
        <span style={{
          fontFamily: FF_SYNE, fontWeight: 600, fontSize: '24px',
          textTransform: 'uppercase', letterSpacing: '1px', whiteSpace: 'nowrap',
          color: !aplicavel
            ? 'rgba(114,112,143,0.5)'
            : verde
              ? 'rgba(106,196,73,0.62)'
              : 'rgba(227,57,57,0.74)',
        }}>
          {label}
        </span>
        <span className="rv-num" style={{
          fontSize: '48px', lineHeight: 1,
          fontVariantNumeric: 'tabular-nums', color: '#72708F',
        }}>
          {valorDisplay || '—'}
        </span>
      </div>

      {/* Divisória */}
      <div style={{ width: '1px', background: '#211F3C', alignSelf: 'stretch', margin: '8px 0', flexShrink: 0 }} />

      {/* Right — badge */}
      <div style={{ flex: 1, display: 'flex', alignItems: 'center', justifyContent: 'center', paddingLeft: '16px' }}>
        {isMonetario ? (
          <span style={{
            display: 'inline-flex', alignItems: 'center', justifyContent: 'center',
            width: '230px', height: '30px',
            border: '1px solid #3F8D23', background: 'rgba(103,159,83,0.39)',
            borderRadius: '0', color: '#9ADE81',
            fontFamily: FF_DM, fontWeight: 900, fontSize: '20px',
            lineHeight: 1, fontFeatureSettings: "'tnum'",
          }}>
            {`+R$ ${badgeNumero}`}
          </span>
        ) : (
          <span style={{
            display: 'inline-flex', alignItems: 'center', justifyContent: 'center',
            width: '230px', height: '30px',
            border: `1px solid ${verde ? '#3F8D23' : aplicavel ? 'rgba(227,57,57,0.72)' : 'rgba(114,112,143,0.3)'}`,
            background: verde ? 'rgba(103,159,83,0.39)' : aplicavel ? 'rgba(242,96,96,0.13)' : 'rgba(114,112,143,0.08)',
            borderRadius: '0',
            color: verde ? '#9ADE81' : aplicavel ? '#E33939' : 'rgba(114,112,143,0.7)',
            fontFamily: FF_SYNE, fontWeight: 600, fontSize: '20px',
            lineHeight: 1, textTransform: 'uppercase',
          }}>
            {badgeText}
          </span>
        )}
      </div>
    </div>
  )
}

// ── Cálculo (direita) ─────────────────────────────────────────────────────────

function CalculoSection({
  componentes, rvBase,
  pedidosRealizados, pedidosMeta, multiplicador, rvAposPedidos,
  bonusCriterios, bonus, rvTotal,
  penalidades, descontoIndividualAplicado, rvFinal,
  elegivel, config,
}: {
  componentes: ComponenteRV[]
  rvBase: number; pedidosRealizados: number; pedidosMeta: number
  multiplicador: number; rvAposPedidos: number
  bonusCriterios: BonusCriterios; bonus: number; rvTotal: number
  penalidades: { metaLabel: string; percentual: number; valorDeduzido: number }[]
  descontoIndividualAplicado: { motivo: string; valor: number } | null
  rvFinal: number; elegivel: boolean; config: RVConfig
}) {
  const temMult     = pedidosMeta > 0
  const bonusGanhou = bonusCriterios.retracaoOk && bonusCriterios.indispOk && bonusCriterios.churnOk && elegivel && bonus > 0

  return (
    <div style={{
      background: '#070714', border: '1px solid rgba(244,212,124,0.15)',
      borderRadius: '12px', padding: '24px',
      display: 'flex', flexDirection: 'column',
    }}>
      {/* Linhas por componente */}
      {componentes.filter(c => c.aplicavel).map(comp => (
        <LinhaCalculo
          key={comp.id}
          label={COMP_LABELS[comp.id] ?? comp.label.toUpperCase()}
          valor={formatBRL(comp.premio)}
        />
      ))}

      <LinhaCalculo label="SUBTOTAL" valor={formatBRL(rvBase)} destaque />

      {/* Multiplicador de pedidos */}
      {temMult && (
        <div style={{ padding: '8px 0' }}>
          <div style={{ display: 'flex', alignItems: 'baseline' }}>
            <span style={{
              fontFamily: FF_SYNE, fontWeight: 600, fontSize: '14px',
              textTransform: 'uppercase', color: '#72708f', flexShrink: 0,
            }}>
              MULTIPLICADOR PEDIDOS
            </span>
            <span style={{
              flex: 1, borderBottom: '1px dotted rgba(114,112,143,0.3)',
              marginLeft: '12px', marginRight: '12px', marginBottom: '5px', alignSelf: 'end',
            }} />
            <span style={{
              fontFamily: FF_DM, fontWeight: 500, fontSize: '14px',
              color: multiplicador >= 1 ? '#22c55e' : '#f4d47c',
              fontVariantNumeric: 'tabular-nums', flexShrink: 0,
            }}>
              ×{multiplicador.toFixed(4)}
            </span>
          </div>
          <p style={{ fontFamily: FF_DM, fontSize: '11px', color: 'rgba(114,112,143,0.7)', marginTop: '2px' }}>
            {Math.round(pedidosRealizados)}/{pedidosMeta} pedidos
          </p>
          {multiplicador < 1 && (
            <LinhaCalculo label="RV PÓS-MULTIPLICADOR" valor={formatBRL(rvAposPedidos)} />
          )}
        </div>
      )}

      {/* Bônus de Qualidade */}
      <div style={{ padding: '8px 0' }}>
        <div style={{ display: 'flex', alignItems: 'baseline' }}>
          <span style={{ flexShrink: 0, display: 'inline-flex', alignItems: 'baseline' }}>
            <span style={{ fontFamily: FF_SYNE, fontWeight: 600, fontSize: '14px', textTransform: 'uppercase', color: '#72708f' }}>
              BÔNUS DE QUALIDADE&nbsp;
            </span>
            <span style={{ fontFamily: FF_DM, fontWeight: 500, fontSize: '14px', color: '#72708f' }}>
              ({formatBRL(config.bonusValor)})
            </span>
          </span>
          <span style={{
            flex: 1, borderBottom: '1px dotted rgba(114,112,143,0.3)',
            marginLeft: '12px', marginRight: '12px', marginBottom: '5px', alignSelf: 'end',
          }} />
          <span style={{
            fontFamily: FF_DM, fontWeight: 500, fontSize: '14px',
            color: bonusGanhou ? '#22c55e' : '#72708f',
            fontVariantNumeric: 'tabular-nums', flexShrink: 0,
          }}>
            {bonusGanhou ? `+${formatBRL(bonus)}` : 'R$ 0,00'}
          </span>
        </div>
        <div style={{ display: 'flex', gap: '14px', marginTop: '4px', flexWrap: 'wrap' }}>
          <BonusCondicao ok={bonusCriterios.retracaoOk} label={`RET ≥ ${config.bonusRetracaoMinima}%`} />
          <BonusCondicao ok={bonusCriterios.indispOk}   label={`INDISP ≤ ${config.bonusIndispMaxima}%`} />
          {config.churnMeta > 0 && (
            <BonusCondicao ok={bonusCriterios.churnOk} label={`CHURN ≤ ${config.churnMeta}`} />
          )}
        </div>
      </div>

      <LinhaCalculo label="SUBTOTAL + BÔNUS" valor={formatBRL(rvTotal)} destaque />

      {/* Deflatores */}
      <div style={{ paddingTop: '10px' }}>
        <span style={{
          fontFamily: FF_SYNE, fontWeight: 600, fontSize: '14px',
          textTransform: 'uppercase', letterSpacing: '0.08em', color: '#a1a3b8',
        }}>
          DEFLATORES
        </span>
      </div>

      {(penalidades.length === 0 && !descontoIndividualAplicado) ? (
        <p style={{
          fontFamily: FF_SYNE, fontSize: '13px',
          color: 'rgba(114,112,143,0.7)', fontStyle: 'italic', padding: '8px 0',
        }}>
          Nenhum deflator aplicado
        </p>
      ) : (
        <div style={{ display: 'flex', flexDirection: 'column' }}>
          {penalidades.map((pen, i) => (
            <DeflatorRow key={i} label={pen.metaLabel} percentual={pen.percentual} valor={pen.valorDeduzido} />
          ))}
          {descontoIndividualAplicado && (
            <DeflatorRow
              label={`Desconto: ${descontoIndividualAplicado.motivo}`}
              percentual={0}
              valor={descontoIndividualAplicado.valor}
            />
          )}
        </div>
      )}

      {/* RV FINAL */}
      <div style={{
        display: 'flex', alignItems: 'baseline',
        paddingTop: '16px', marginTop: '8px',
        borderTop: '1px solid rgba(244,212,124,0.15)',
      }}>
        <span style={{
          fontFamily: FF_SYNE, fontWeight: 700, fontSize: '16px',
          textTransform: 'uppercase', color: '#f4d47c',
        }}>
          RV FINAL
        </span>
        <span style={{ flex: 1 }} />
        <span style={{
          fontFamily: FF_DM, fontWeight: 900, fontSize: '22px',
          fontVariantNumeric: 'tabular-nums',
          background: 'linear-gradient(135deg, #f4d47c 0%, #d4a935 100%)',
          WebkitBackgroundClip: 'text', WebkitTextFillColor: 'transparent', backgroundClip: 'text',
        }}>
          {formatBRL(elegivel ? rvFinal : 0)}
        </span>
      </div>
    </div>
  )
}

function LinhaCalculo({ label, valor, destaque }: { label: string; valor: string; destaque?: boolean }) {
  return (
    <div style={{ display: 'flex', alignItems: 'baseline', padding: destaque ? '10px 0' : '6px 0' }}>
      <span style={{
        flex: '0 0 auto', fontFamily: FF_SYNE, fontWeight: 600, fontSize: '14px',
        textTransform: 'uppercase', color: destaque ? '#a1a3b8' : '#72708f',
      }}>
        {label}
      </span>
      {destaque ? (
        <span style={{ flex: 1 }} />
      ) : (
        <span style={{
          flex: 1, borderBottom: '1px dotted rgba(114,112,143,0.3)',
          marginLeft: '12px', marginRight: '12px', marginBottom: '5px', alignSelf: 'end',
        }} />
      )}
      <span style={{
        flex: '0 0 auto', fontFamily: FF_DM,
        fontWeight: destaque ? 600 : 500, fontSize: destaque ? '15px' : '14px',
        color: destaque ? '#a1a3b8' : '#72708f', fontVariantNumeric: 'tabular-nums',
      }}>
        {valor}
      </span>
    </div>
  )
}

function BonusCondicao({ ok, label }: { ok: boolean; label: string }) {
  const spaceIdx = label.indexOf(' ')
  const texto    = spaceIdx > -1 ? label.slice(0, spaceIdx) : label
  const numerico = spaceIdx > -1 ? label.slice(spaceIdx + 1) : ''
  const cor      = ok ? 'rgba(34,197,94,0.8)' : 'rgba(227,57,57,0.8)'
  return (
    <div style={{ display: 'inline-flex', alignItems: 'center', gap: '4px' }}>
      <span style={{ fontSize: '11px', fontWeight: 700, color: ok ? '#22c55e' : '#E33939' }}>
        {ok ? '✓' : '✗'}
      </span>
      <span style={{ display: 'inline-flex', alignItems: 'baseline', gap: '2px' }}>
        <span style={{ fontFamily: FF_SYNE, fontSize: '11px', color: cor }}>{texto}</span>
        <span style={{ fontFamily: FF_DM, fontSize: '11px', color: cor, fontVariantNumeric: 'tabular-nums' }}>{numerico}</span>
      </span>
    </div>
  )
}

function DeflatorRow({ label, percentual, valor }: { label: string; percentual: number; valor: number }) {
  return (
    <div style={{
      background: 'rgba(242,96,96,0.08)', border: '1px solid rgba(227,57,57,0.4)',
      borderRadius: '6px', padding: '8px 14px',
      display: 'flex', justifyContent: 'space-between', alignItems: 'center',
      marginTop: '8px', gap: '12px',
    }}>
      <span style={{
        fontFamily: FF_SYNE, fontWeight: 600, fontSize: '12px',
        color: '#E33939', textTransform: 'uppercase',
      }}>
        {label}{percentual > 0 ? ` (−${percentual}%)` : ''}
      </span>
      <span style={{
        fontFamily: FF_DM, fontWeight: 600, fontSize: '12px',
        color: '#E33939', fontVariantNumeric: 'tabular-nums', flexShrink: 0,
      }}>
        −{formatBRL(valor)}
      </span>
    </div>
  )
}

// ── Regras ────────────────────────────────────────────────────────────────────

function RegrasSection({ config, expanded, onToggle }: {
  config: RVConfig; expanded: boolean; onToggle: () => void
}) {
  return (
    <div style={{
      background: 'rgba(244,212,124,0.03)',
      border: '1px solid rgba(244,212,124,0.15)',
      borderRadius: '0', overflow: 'hidden',
    }}>
      <button
        type="button"
        onClick={onToggle}
        style={{
          width: '100%', display: 'flex', justifyContent: 'space-between', alignItems: 'center',
          padding: '14px 20px', background: 'transparent', border: 'none', cursor: 'pointer',
          transition: 'background 0.15s',
        }}
        onMouseEnter={e => { (e.currentTarget as HTMLElement).style.background = 'rgba(244,212,124,0.04)' }}
        onMouseLeave={e => { (e.currentTarget as HTMLElement).style.background = 'transparent' }}
      >
        <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
          <Info size={13} style={{ color: 'rgba(244,212,124,0.6)', flexShrink: 0 }} />
          <span style={{
            fontFamily: FF_SYNE, fontSize: '11px', fontWeight: 700,
            textTransform: 'uppercase', letterSpacing: '0.12em', color: 'rgba(244,212,124,0.7)',
          }}>
            Como é calculado meu RV
          </span>
        </div>
        <ChevronDown size={14} style={{
          color: 'rgba(244,212,124,0.5)',
          transition: 'transform 0.3s cubic-bezier(0.4,0,0.2,1)',
          transform: expanded ? 'rotate(180deg)' : 'rotate(0deg)',
        }} />
      </button>

      <div style={{
        maxHeight: expanded ? '900px' : '0', overflow: 'hidden',
        transition: 'max-height 0.4s cubic-bezier(0.4,0,0.2,1)',
      }}>
        <div style={{ padding: '0 20px 20px', display: 'flex', flexDirection: 'column', gap: '20px' }}>

          <RegraBloco titulo="ELEGIBILIDADE" desc="O RV só é pago quando os critérios mínimos são cumpridos no mês.">
            <RegraLine label="ABS máximo" valor={`≤ ${config.absMaximo}%`} />
            <RegraLine label="Faltas no mês" valor="Máximo 1 falta" />
          </RegraBloco>

          <RegraBloco titulo="COMPONENTES DO RV" desc="Cada indicador contribui com um valor fixo quando dentro da meta.">
            {config.retracaoFaixas.map((f, i) => (
              <RegraLine key={i} label={`TX de Retenção ≥ ${f.min}%`} valor={formatBRL(f.valor)} />
            ))}
            <RegraLine label={`Indisponibilidade ≤ ${config.indispLimite}%`} valor={formatBRL(config.indispValor)} />
            <RegraLine label={`TMA < ${segParaMMSS(config.tmaLimiteSeg)}`} valor={formatBRL(config.tmaValor)} />
            {config.ticketFaixas.map((f, i) => (
              <RegraLine
                key={`tkt${i}`}
                label={`Variação Ticket ≥ ${f.min}% (req. Ret ≥ ${config.ticketMinRetracao}%)`}
                valor={formatBRL(f.valor)}
              />
            ))}
          </RegraBloco>

          {config.pedidosMeta > 0 && (
            <RegraBloco titulo="MULTIPLICADOR DE PEDIDOS" desc="RV = RV Base × (Pedidos / Meta), máximo 1×.">
              <RegraLine label="Meta de pedidos" valor={String(config.pedidosMeta)} />
            </RegraBloco>
          )}

          {config.bonusValor > 0 && (
            <RegraBloco
              titulo={`BÔNUS DE QUALIDADE (${formatBRL(config.bonusValor)})`}
              desc="Adicionado quando todas as condições são atingidas simultaneamente."
            >
              <RegraLine label={`TX Retenção ≥ ${config.bonusRetracaoMinima}%`} valor="Obrigatório" />
              <RegraLine label={`Indisponibilidade ≤ ${config.bonusIndispMaxima}%`} valor="Obrigatório" />
              {config.churnMeta > 0 && (
                <RegraLine label={`Churn ≤ ${config.churnMeta}`} valor="Obrigatório" />
              )}
            </RegraBloco>
          )}

          {config.penalidades.filter(p => p.ativa).length > 0 && (
            <RegraBloco titulo="DEFLATORES" desc="Reduções aplicadas ao RV quando indicadores ultrapassam os limites tolerados.">
              {config.penalidades.filter(p => p.ativa).map((pen, i) => (
                <RegraLine key={i} label={pen.metaLabel} valor={`−${pen.percentual}% se vermelho`} />
              ))}
            </RegraBloco>
          )}

        </div>
      </div>
    </div>
  )
}

function RegraBloco({ titulo, desc, children }: { titulo: string; desc: string; children: React.ReactNode }) {
  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
      <span style={{
        fontFamily: FF_SYNE, fontSize: '10px', fontWeight: 700,
        textTransform: 'uppercase', letterSpacing: '0.12em', color: 'rgba(244,212,124,0.7)',
      }}>
        {titulo}
      </span>
      <p style={{ fontFamily: FF_DM, fontSize: '12px', color: 'rgba(114,112,143,0.9)', lineHeight: 1.5, margin: 0 }}>
        {desc}
      </p>
      <div style={{ display: 'flex', flexDirection: 'column', gap: '5px' }}>
        {children}
      </div>
    </div>
  )
}

function RegraLine({ label, valor }: { label: string; valor: string }) {
  return (
    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', gap: '8px' }}>
      <span style={{ fontFamily: FF_DM, fontSize: '12px', color: 'rgba(114,112,143,0.8)' }}>{label}</span>
      <span style={{ fontFamily: FF_DM, fontSize: '12px', fontWeight: 600, color: '#B0AAFF', flexShrink: 0 }}>{valor}</span>
    </div>
  )
}
