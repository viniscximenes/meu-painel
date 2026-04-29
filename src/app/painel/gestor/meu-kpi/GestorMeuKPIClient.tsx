'use client'

import { useState, useMemo, useEffect } from 'react'
import type { ReactNode } from 'react'
import { Flame, Shield, Package, CalendarX, Activity, Clock, ChevronRight } from 'lucide-react'
import { formatHHMMSS } from '@/lib/diario-utils'
import type { KpiGestorData } from '@/lib/kpi-gestor-sheets'
import { PainelHeader, LinhaHorizontalDourada } from '@/components/painel/PainelHeader'
import { PainelSectionTitle } from '@/components/painel/PainelSectionTitle'

const FF_SYNE = "'Syne', sans-serif"
const FF_DM   = "'DM Sans', sans-serif"

// ── Metas ─────────────────────────────────────────────────────────────────────
const META_CHURN              = 1097
const META_TX_RET_VERDE_PCT   = 66
const META_TX_RET_AMARELO_PCT = 60
const META_TMA_SEG            = 731   // 00:12:11
const META_ABS_PCT            = 5
const META_INDISP_PCT         = 14.5

// ── Status ────────────────────────────────────────────────────────────────────
type Status = 'verde' | 'amarelo' | 'vermelho' | 'neutro'

// Cor do badge (texto, fundo, borda)
const BADGE_CFG: Record<Status, { label: string; textColor: string; bg: string; border: string }> = {
  verde:    { label: 'DENTRO',       textColor: '#22c55e',  bg: 'rgba(74,222,128,0.13)',  border: 'rgba(34,197,94,0.72)' },
  amarelo:  { label: 'ATENÇÃO',      textColor: '#fbba2d',  bg: 'rgba(255,193,60,0.30)',  border: 'rgba(255,193,60,0.62)' },
  vermelho: { label: 'FORA DA META', textColor: '#e33939',  bg: 'rgba(242,96,96,0.13)',   border: 'rgba(227,57,57,0.72)' },
  neutro:   { label: 'SEM META',     textColor: '#72708f',  bg: 'rgba(114,112,143,0.13)', border: 'rgba(114,112,143,0.5)' },
}

// Cor do valor gigante (72%)
const VALUE_COLOR: Record<Status, string> = {
  verde:    'rgba(74,222,128,0.72)',
  amarelo:  'rgba(255,193,60,0.72)',
  vermelho: 'rgba(227,57,57,0.72)',
  neutro:   '#72708f',
}

// Cor do título, ícone e flor (herda status)
const TITLE_COLOR: Record<Status, string> = {
  verde:    '#72708f',                // dentro: neutro-lavanda
  amarelo:  'rgba(255,193,60,0.62)', // atenção: amarelo 62%
  vermelho: 'rgba(227,57,57,0.74)',  // fora: vermelho 74%
  neutro:   '#72708f',                // sem meta: neutro-lavanda
}

// ── Helpers ───────────────────────────────────────────────────────────────────
function formatNum(n: number): string { return n.toLocaleString('pt-BR') }
function formatPct(n: number): string {
  return n.toLocaleString('pt-BR', { minimumFractionDigits: 1, maximumFractionDigits: 1 }) + '%'
}
function mesLabelDeData(dataStr: string | null): string {
  if (dataStr) {
    const parts = dataStr.split('/')
    if (parts.length === 3) {
      const d = new Date(parseInt(parts[2]), parseInt(parts[1]) - 1, 1)
      if (!isNaN(d.getTime()))
        return d.toLocaleDateString('pt-BR', { month: 'long', year: 'numeric' }).toUpperCase()
    }
  }
  return new Date().toLocaleDateString('pt-BR', { month: 'long', year: 'numeric' }).toUpperCase()
}

// ── KPI Cards data ─────────────────────────────────────────────────────────────
interface KPICard {
  label:  string
  icon:   ReactNode
  valor:  string | null
  status: Status
  meta:   string | null
}

function computarKPICards(data: KpiGestorData): KPICard[] {
  const txRet  = data.txRetBrutaPct
  const tma    = data.tmaSeg
  const abs    = data.absPct
  const indisp = data.indispPct

  const churnStatus:  Status = data.churn === null ? 'neutro'
    : data.churn <= META_CHURN ? 'verde' : 'vermelho'
  const txRetStatus:  Status = txRet === null ? 'neutro'
    : txRet >= META_TX_RET_VERDE_PCT ? 'verde'
    : txRet >= META_TX_RET_AMARELO_PCT ? 'amarelo' : 'vermelho'
  const tmaStatus:    Status = tma === null ? 'neutro'
    : tma > 0 && tma <= META_TMA_SEG ? 'verde'
    : tma > META_TMA_SEG ? 'vermelho' : 'neutro'
  const absStatus:    Status = abs === null ? 'neutro' : abs <= META_ABS_PCT ? 'verde' : 'vermelho'
  const indispStatus: Status = indisp === null ? 'neutro' : indisp <= META_INDISP_PCT ? 'verde' : 'vermelho'

  return [
    {
      label:  'Pedidos',
      icon:   <Package size={40} strokeWidth={1.25} />,
      valor:  data.pedidos !== null ? formatNum(data.pedidos) : null,
      status: 'neutro',
      meta:   null,
    },
    {
      label:  'Churn',
      icon:   <Flame size={40} strokeWidth={1.25} />,
      valor:  data.churn !== null ? formatNum(data.churn) : null,
      status: churnStatus,
      meta:   data.churn !== null ? `META: ≤${formatNum(META_CHURN)}` : null,
    },
    {
      label:  'Tx. Retenção',
      icon:   <Shield size={40} strokeWidth={1.25} />,
      valor:  txRet !== null ? formatPct(txRet) : null,
      status: txRetStatus,
      meta:   txRet !== null ? `META: ≥${META_TX_RET_VERDE_PCT}%` : null,
    },
    {
      label:  'TMA',
      icon:   <Clock size={40} strokeWidth={1.25} />,
      valor:  tma !== null && tma > 0 ? formatHHMMSS(tma) : null,
      status: tmaStatus,
      meta:   tma !== null ? 'META: ≤12:11' : null,
    },
    {
      label:  'ABS',
      icon:   <CalendarX size={40} strokeWidth={1.25} />,
      valor:  abs !== null ? formatPct(abs) : null,
      status: absStatus,
      meta:   abs !== null ? `META: ≤${META_ABS_PCT}%` : null,
    },
    {
      label:  'Indisponibilidade',
      icon:   <Activity size={40} strokeWidth={1.25} />,
      valor:  indisp !== null ? formatPct(indisp) : null,
      status: indispStatus,
      meta:   indisp !== null ? `META: ≤${META_INDISP_PCT.toFixed(1).replace('.', ',')}%` : null,
    },
  ]
}

// ── Complementares state ───────────────────────────────────────────────────────
const LS_KEY = 'halo:gestor-kpi:subsecoes-expandidas'
type SubKey  = 'ganhos' | 'qualidade' | 'comportamento' | 'presenca'
const SUB_DEFAULT: Record<SubKey, boolean> = {
  ganhos: true, qualidade: true, comportamento: true, presenca: true,
}

// ── SVG: Flor dourada (cor parametrizável) ─────────────────────────────────────
function FlorDourada({ size = 10, color = '#c9a24a' }: { size?: number; color?: string }) {
  return (
    <svg width={size} height={size} viewBox="0 0 10 10" fill="none" aria-hidden="true" style={{ flexShrink: 0 }}>
      <rect x="0"   y="3.5" width="3" height="3" fill={color} transform="rotate(45 1.5 5)"  />
      <rect x="3.5" y="0"   width="3" height="3" fill={color} transform="rotate(45 5 1.5)"  />
      <rect x="7"   y="3.5" width="3" height="3" fill={color} transform="rotate(45 8.5 5)"  />
      <rect x="3.5" y="7"   width="3" height="3" fill={color} transform="rotate(45 5 8.5)"  />
    </svg>
  )
}

// ── Badge semáforo ─────────────────────────────────────────────────────────────
function MeuKpiBadge({ status }: { status: Status }) {
  const cfg = BADGE_CFG[status]
  return (
    <span style={{
      fontFamily: FF_SYNE,
      fontSize: '20px', fontWeight: 600, lineHeight: 1,
      textTransform: 'uppercase', letterSpacing: '1px',
      display: 'inline-flex', alignItems: 'center', justifyContent: 'center',
      width: '100%', maxWidth: '193px', height: '29px',
      borderRadius: '6px', border: `1px solid ${cfg.border}`,
      background: cfg.bg, color: cfg.textColor,
      flexShrink: 0,
    }}>
      {cfg.label}
    </span>
  )
}

// ── Section title com flor + linha ─────────────────────────────────────────────
function MeuKpiSectionTitle({ children }: { children: ReactNode }) {
  return (
    <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
      <FlorDourada />
      <span style={{
        fontFamily: FF_SYNE,
        fontSize: '12px', fontWeight: 600,
        letterSpacing: '0.14em',
        color: '#f4d47c', whiteSpace: 'nowrap',
      }}>
        {children}
      </span>
      <div style={{ flex: 1, height: '1px', background: 'linear-gradient(90deg, rgba(244,212,124,0.2) 0%, transparent 100%)' }} />
    </div>
  )
}

// ── KPI Card ───────────────────────────────────────────────────────────────────
function MeuKpiCard({ card, delay }: { card: KPICard; delay: number }) {
  const hasValue   = card.valor !== null
  const titleColor = hasValue ? TITLE_COLOR[card.status] : '#474658'
  const valColor   = hasValue ? VALUE_COLOR[card.status] : '#474658'
  const label      = card.label === 'Indisponibilidade' ? 'Indisp.' : card.label

  return (
    <div style={{
      background: '#070714',
      border: '1px solid rgba(244,212,124,0.15)',
      borderRadius: '10px',
      padding: '20px 24px',
      display: 'flex',
      alignItems: 'stretch',
      gap: '20px',
      animation: 'kpiCardIn 0.4s ease both',
      animationDelay: `${delay}ms`,
    }}>

      {/* Coluna esquerda: header (topo) + valor (base) */}
      <div style={{
        flex: '0 0 48%',
        display: 'flex',
        flexDirection: 'column',
        justifyContent: 'space-between',
        minHeight: '120px',
      }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
          <span style={{ color: titleColor, display: 'flex', alignItems: 'center', flexShrink: 0 }}>
            {card.icon}
          </span>
          <span style={{
            fontFamily: FF_SYNE,
            fontSize: '20px', fontWeight: 600,
            textTransform: 'uppercase', letterSpacing: '0.06em',
            color: titleColor,
            overflow: 'hidden', textOverflow: 'ellipsis',
          }}>
            {label}
          </span>
        </div>

        <div>
          <div style={{
            fontFamily: FF_DM,
            fontSize: '64px', fontWeight: 900, lineHeight: 1,
            color: valColor,
            fontVariantNumeric: 'tabular-nums',
            letterSpacing: '-0.02em',
          }}>
            {card.valor ?? '—'}
          </div>
          {!hasValue && (
            <span style={{ fontFamily: FF_SYNE, fontSize: '11px', fontWeight: 600, color: '#474658', marginTop: '4px', display: 'block' }}>
              Sem dados
            </span>
          )}
        </div>
      </div>

      {/* Linha divisória vertical — dentro do padding */}
      <div style={{
        width: '1px',
        background: '#211F3C',
        flexShrink: 0,
        marginTop: '8px',
        marginBottom: '8px',
      }} />

      {/* Coluna direita: badge no topo + meta abaixo */}
      <div style={{
        flex: '1 1 auto',
        display: 'flex',
        flexDirection: 'column',
        justifyContent: 'flex-start',
        alignItems: 'center',
        gap: '10px',
        paddingTop: '8px',
      }}>
        {hasValue ? (
          <>
            <MeuKpiBadge status={card.status} />
            {card.meta && (
              <div style={{
                display: 'inline-flex',
                alignItems: 'baseline',
                gap: '4px',
                color: '#72708f',
                lineHeight: 1.2,
              }}>
                <span style={{ fontFamily: FF_SYNE, fontSize: '20px', fontWeight: 600 }}>
                  META:
                </span>
                <span style={{
                  fontFamily: FF_DM,
                  fontSize: '20px', fontWeight: 500,
                  fontVariantNumeric: 'tabular-nums',
                }}>
                  {card.meta.replace('META: ', '')}
                </span>
              </div>
            )}
          </>
        ) : (
          <span style={{ fontFamily: FF_SYNE, fontSize: '11px', fontWeight: 600, color: '#474658' }}>
            Sem mapeamento
          </span>
        )}
      </div>

    </div>
  )
}

// ── Dados Complementares ───────────────────────────────────────────────────────
function DadosComplementares({ data }: { data: KpiGestorData }) {
  const [expanded, setExpanded] = useState<Record<SubKey, boolean>>(SUB_DEFAULT)

  useEffect(() => {
    try {
      const raw = localStorage.getItem(LS_KEY)
      if (raw) setExpanded(prev => ({ ...prev, ...(JSON.parse(raw) as Partial<Record<SubKey, boolean>>) }))
    } catch { /* ignore */ }
  }, [])

  function toggle(key: SubKey) {
    setExpanded(prev => {
      const next = { ...prev, [key]: !prev[key] }
      try { localStorage.setItem(LS_KEY, JSON.stringify(next)) } catch { /* ignore */ }
      return next
    })
  }

  const SUBSECOES: Array<{ key: SubKey; titulo: string; items: Array<{ label: string; valor: string }> }> = [
    {
      key: 'ganhos', titulo: 'GANHOS & RETENÇÃO',
      items: [
        { label: '% Variação Ticket',     valor: data.varTicket },
        { label: 'Tx. Retenção Liq. 15d', valor: data.txRetLiq15d },
      ],
    },
    {
      key: 'qualidade', titulo: 'QUALIDADE DO ATENDIMENTO',
      items: [
        { label: 'Atendidas',         valor: data.atendidas },
        { label: 'Transfer (%)',       valor: data.transfer },
        { label: 'Short Call (%)',     valor: data.shortCall },
        { label: 'Rechamada D+7 (%)', valor: data.rechamadaD7 },
        { label: 'Tx. Tabulação (%)', valor: data.txTabulacao },
        { label: 'CSAT',              valor: data.csat },
      ],
    },
    {
      key: 'comportamento', titulo: 'COMPORTAMENTO E PAUSAS',
      items: [
        { label: 'Engajamento',        valor: data.engajamento },
        { label: 'NR17 (%)',           valor: data.nr17 },
        { label: 'Pessoal (%)',        valor: data.pessoal },
        { label: 'Outras Pausas (%)', valor: data.outrasPausas },
      ],
    },
    {
      key: 'presenca', titulo: 'PRESENÇA',
      items: [
        { label: 'Tempo Projetado', valor: data.tempoProjetado },
        { label: 'Tempo de Login',  valor: data.tempoLogin },
      ],
    },
  ]

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: '4px' }}>
      {SUBSECOES.map(sub => {
        const isOpen = expanded[sub.key]
        return (
          <div key={sub.key}>
            <button type="button" className="mkpi-sub-btn" onClick={() => toggle(sub.key)}>
              <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                <span style={{ fontFamily: FF_SYNE, fontSize: '11px', fontWeight: 600, textTransform: 'uppercase', letterSpacing: '0.10em', color: '#f4d47c' }}>
                  {sub.titulo}
                </span>
                <span style={{ color: 'rgba(114,112,143,0.4)', userSelect: 'none' }}>·</span>
                <span style={{ fontFamily: FF_SYNE, fontSize: '10px', fontWeight: 600, color: 'rgba(114,112,143,0.7)' }}>
                  {sub.items.length} indicadores
                </span>
              </div>
              <ChevronRight size={14} style={{
                color: '#72708f', flexShrink: 0,
                transform: isOpen ? 'rotate(90deg)' : 'rotate(0deg)',
                transition: 'transform 250ms cubic-bezier(0.4,0,0.2,1)',
              }} />
            </button>

            <div className={`mkpi-sub-content${isOpen ? ' open' : ''}`}>
              <div className="mkpi-sub-inner">
                <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(140px, 1fr))', gap: '8px', padding: '6px 0 10px' }}>
                  {sub.items.map(({ label, valor }) => {
                    const empty = !valor || valor === '—'
                    return (
                      <div key={label} title={empty ? 'Sem dados disponíveis ainda' : undefined} style={{
                        background: '#070714',
                        border: '1px solid rgba(244,212,124,0.15)',
                        borderRadius: '10px', padding: '10px 12px',
                        minHeight: '72px', display: 'flex', flexDirection: 'column', justifyContent: 'space-between',
                      }}>
                        <p style={{ fontFamily: FF_SYNE, fontSize: '10px', fontWeight: 600, textTransform: 'uppercase', letterSpacing: '0.06em', color: '#72708f', lineHeight: 1.3, margin: 0 }}>
                          {label}
                        </p>
                        <p style={{ fontFamily: FF_DM, fontSize: '13px', fontWeight: 600, fontVariantNumeric: 'tabular-nums', margin: '4px 0 0', color: empty ? 'rgba(114,112,143,0.3)' : '#72708f' }}>
                          {empty ? '—' : valor}
                        </p>
                      </div>
                    )
                  })}
                </div>
              </div>
            </div>
          </div>
        )
      })}
    </div>
  )
}

// ── Componente principal ───────────────────────────────────────────────────────
export default function GestorMeuKPIClient({ data }: { data: KpiGestorData }) {
  const mesLabel = useMemo(() => mesLabelDeData(data.dataReferencia), [data.dataReferencia])
  const kpiCards = useMemo(() => computarKPICards(data), [data])

  return (
    <>
      <style dangerouslySetInnerHTML={{ __html: `
        @keyframes kpiCardIn {
          from { opacity: 0; transform: translateY(14px); }
          to   { opacity: 1; transform: translateY(0); }
        }

        .mkpi-bg {
          background-color: #01020a;
          background-image:
            linear-gradient(to right, rgba(244,212,124,0.035) 1px, transparent 1px),
            linear-gradient(to bottom, rgba(244,212,124,0.035) 1px, transparent 1px);
          background-size: 28px 28px;
          border-radius: 14px;
          padding: 20px;
          display: flex;
          flex-direction: column;
          gap: 24px;
        }

        .mkpi-grid {
          display: grid;
          grid-template-columns: repeat(2, 1fr);
          gap: 16px;
          align-items: stretch;
        }
        @media (max-width: 640px) {
          .mkpi-grid { grid-template-columns: 1fr; }
        }

        .mkpi-sub-btn {
          all: unset;
          box-sizing: border-box;
          width: 100%;
          display: flex;
          align-items: center;
          justify-content: space-between;
          padding: 7px 10px;
          border-radius: 8px;
          cursor: pointer;
        }
        .mkpi-sub-btn:hover { background: rgba(201,168,76,0.04); }
        .mkpi-sub-btn:focus-visible { outline: 1px solid rgba(201,168,76,0.3); outline-offset: 2px; }

        .mkpi-sub-content {
          display: grid;
          grid-template-rows: 0fr;
          transition: grid-template-rows 250ms cubic-bezier(0.4,0,0.2,1);
        }
        .mkpi-sub-content.open { grid-template-rows: 1fr; }
        .mkpi-sub-inner { overflow: hidden; min-height: 0; }

        @media (prefers-reduced-motion: reduce) {
          .mkpi-sub-content { transition: none; }
          .kpiCardIn { animation: none; }
        }
      `}} />

      <div className="mkpi-bg">

        {/* ── Header ──────────────────────────────────────────────────────── */}
        <PainelHeader titulo="Meu KPI" mesLabel={mesLabel} dataReferencia={data.dataReferencia} />

        {/* ── Linha dourada HALO ────────────────────────────────────────────── */}
        <LinhaHorizontalDourada />

        {/* ── KPIs Principais ───────────────────────────────────────────────── */}
        <div style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
          <PainelSectionTitle>KPIs PRINCIPAIS</PainelSectionTitle>
          <div className="mkpi-grid">
            {kpiCards.map((card, i) => (
              <MeuKpiCard key={card.label} card={card} delay={i * 70} />
            ))}
          </div>
        </div>

        {/* ── KPIs Complementares ───────────────────────────────────────────── */}
        <div style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
          <PainelSectionTitle>KPIs COMPLEMENTARES</PainelSectionTitle>
          <DadosComplementares data={data} />
        </div>

      </div>
    </>
  )
}
