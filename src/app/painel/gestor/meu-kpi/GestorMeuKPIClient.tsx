'use client'

import { useMemo } from 'react'
import { Flame, Shield, Package, CalendarX, Activity, Clock } from 'lucide-react'
import { formatHHMMSS } from '@/lib/diario-utils'
import type { KpiGestorData } from '@/lib/kpi-gestor-sheets'
import { PainelHeader, LinhaHorizontalDourada } from '@/components/painel/PainelHeader'
import { PainelSectionTitle } from '@/components/painel/PainelSectionTitle'
import { MeuKpiCard, type KpiCardData, type Status } from '@/components/kpi-individual/MeuKpiCard'
import { DadosComplementares, type SubsecaoConfig } from '@/components/kpi-individual/DadosComplementares'

// ── Metas ─────────────────────────────────────────────────────────────────────
const META_CHURN              = 1097
const META_TX_RET_VERDE_PCT   = 66
const META_TX_RET_AMARELO_PCT = 60
const META_TMA_SEG            = 731   // 00:12:11
const META_ABS_PCT            = 5
const META_INDISP_PCT         = 14.5

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

// ── KPI Cards ─────────────────────────────────────────────────────────────────
function computarKPICards(data: KpiGestorData): KpiCardData[] {
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

// ── Subsecões Complementares ───────────────────────────────────────────────────
function gestorSubsecoes(data: KpiGestorData): SubsecaoConfig[] {
  return [
    {
      key: 'ganhos', titulo: 'GANHOS & RETENÇÃO',
      items: [
        { label: '% Variação Ticket',     valor: data.varTicket    ?? '—' },
        { label: 'Tx. Retenção Liq. 15d', valor: data.txRetLiq15d  ?? '—' },
      ],
    },
    {
      key: 'qualidade', titulo: 'QUALIDADE DO ATENDIMENTO',
      items: [
        { label: 'Atendidas',         valor: data.atendidas   ?? '—' },
        { label: 'Transfer (%)',       valor: data.transfer    ?? '—' },
        { label: 'Short Call (%)',     valor: data.shortCall   ?? '—' },
        { label: 'Rechamada D+7 (%)', valor: data.rechamadaD7 ?? '—' },
        { label: 'Tx. Tabulação (%)', valor: data.txTabulacao ?? '—' },
        { label: 'CSAT',              valor: data.csat        ?? '—' },
      ],
    },
    {
      key: 'comportamento', titulo: 'COMPORTAMENTO E PAUSAS',
      items: [
        { label: 'Engajamento',       valor: data.engajamento  ?? '—' },
        { label: 'NR17 (%)',          valor: data.nr17         ?? '—' },
        { label: 'Pessoal (%)',       valor: data.pessoal      ?? '—' },
        { label: 'Outras Pausas (%)', valor: data.outrasPausas ?? '—' },
      ],
    },
    {
      key: 'presenca', titulo: 'PRESENÇA',
      items: [
        { label: 'Tempo Projetado', valor: data.tempoProjetado ?? '—' },
        { label: 'Tempo de Login',  valor: data.tempoLogin     ?? '—' },
      ],
    },
  ]
}

// ── Componente principal ───────────────────────────────────────────────────────
export default function GestorMeuKPIClient({ data }: { data: KpiGestorData }) {
  const mesLabel = useMemo(() => mesLabelDeData(data.dataReferencia), [data.dataReferencia])
  const kpiCards = useMemo(() => computarKPICards(data), [data])
  const subsecoes = useMemo(() => gestorSubsecoes(data), [data])

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
          <DadosComplementares
            subsecoes={subsecoes}
            lsKey="halo:gestor-kpi:subsecoes-expandidas"
          />
        </div>

      </div>
    </>
  )
}
