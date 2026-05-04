'use client'

import { useMemo } from 'react'
import type { ReactNode } from 'react'
import {
  type KPIItem,
  formatMetricValue,
} from '@/lib/kpi-utils'
import {
  Shield, Clock, Flame, Package, CalendarX, Activity, BarChart2,
} from 'lucide-react'
import { PainelHeader, LinhaHorizontalDourada } from '@/components/painel/PainelHeader'
import { MeuKpiCard, MeuKpiSectionTitle, type KpiCardData, type Status } from '@/components/kpi-individual/MeuKpiCard'
import { DadosComplementares, type SubsecaoConfig } from '@/components/kpi-individual/DadosComplementares'
import { BannerAguardandoKPI } from '@/components/painel/BannerAguardandoKPI'

export interface MeuKPIProps {
  kpis:            KPIItem[]
  complementares:  { label: string; valor: string }[]
  posicaoRanking:  number
  meuTxRet:        number
  totalNoRanking:  number
  nomeOperador:    string
  planilhaNome:    string
  dataAtualizacao: string | null
  mesLabel:        string
  vizinhoAcima?:   { posicao: number; txRet: number }
  vizinhoAbaixo?:  { posicao: number; txRet: number }
  txRetLider?:     number
  modoHistorico?:  boolean
  mesFechamento?:  { mes: number; ano: number }
}

// ── Helpers de mapeamento ──────────────────────────────────────────────────────

function kpiIcon(label: string): ReactNode {
  const l = label.toLowerCase()
  if (l.includes('retenc') || l.includes('retenç')) return <Shield    size={40} strokeWidth={1.25} />
  if (l.includes('tma') || l.includes('tempo'))      return <Clock     size={40} strokeWidth={1.25} />
  if (l.includes('cancel') || l.includes('churn'))   return <Flame     size={40} strokeWidth={1.25} />
  if (l.includes('pedido'))                          return <Package   size={40} strokeWidth={1.25} />
  if (l.includes('abs') || l.includes('ausên'))      return <CalendarX size={40} strokeWidth={1.25} />
  if (l.includes('indisp'))                          return <Activity  size={40} strokeWidth={1.25} />
  return <BarChart2 size={40} strokeWidth={1.25} />
}

function isTempoKPI(kpi: KPIItem): boolean {
  const u = (kpi.meta?.unidade ?? '').trim().toLowerCase()
  const l = kpi.label.toLowerCase()
  return ['seg', 's', 'segundos', 'tempo', 'mm:ss', 'hh:mm', 'hh:mm:ss'].includes(u) ||
    l.includes('tma') || l.includes('tempo')
}

function formatSeg(s: number): string {
  const m = Math.floor(Math.abs(s) / 60)
  const sec = Math.round(Math.abs(s) % 60)
  return `${String(m).padStart(2,'0')}:${String(sec).padStart(2,'0')}`
}

function formatMetaStr(kpi: KPIItem): string | null {
  const tipo = kpi.meta?.tipo ?? (kpi.opConfig?.verde_op === '<=' ? 'menor_melhor' : 'maior_melhor')
  const prefix = tipo === 'menor_melhor' ? '≤' : '≥'
  const uni = kpi.meta?.unidade ?? ''

  // 1. Meta individual lida da coluna (coluna_individual)
  if (kpi.metaIndividual != null && kpi.metaIndividual > 0) {
    const fmtAlvo = isTempoKPI(kpi) ? formatSeg(kpi.metaIndividual) : formatMetricValue(String(kpi.metaIndividual), uni)
    return `META: ${prefix}${fmtAlvo}`
  }

  // 2. Limiar global da config nova
  if (kpi.opConfig?.modo === 'limiar_global' && kpi.opConfig.verde_valor != null && kpi.opConfig.verde_valor > 0) {
    const fmtAlvo = isTempoKPI(kpi) ? formatSeg(kpi.opConfig.verde_valor) : formatMetricValue(String(kpi.opConfig.verde_valor), uni)
    return `META: ${prefix}${fmtAlvo}`
  }

  // 3. Meta legada (tabela metas — KPIs secundários)
  if (!kpi.meta) return null
  const alvo = kpi.meta.verde_inicio > 0 ? kpi.meta.verde_inicio : kpi.meta.valor_meta
  const fmtAlvo = isTempoKPI(kpi) ? formatSeg(alvo) : formatMetricValue(String(alvo), kpi.meta.unidade)
  return `META: ${prefix}${fmtAlvo}`
}

function kpiItemsToCards(kpis: KPIItem[]): KpiCardData[] {
  return kpis.map(kpi => ({
    label:  kpi.label,
    icon:   kpiIcon(kpi.label),
    valor:  kpi.valor === '—' ? null : formatMetricValue(kpi.valor, kpi.unidade),
    status: kpi.status as Status,
    meta:   formatMetaStr(kpi),
  }))
}

// ── Subsecões complementares ───────────────────────────────────────────────────

const CAMPO_LABEL: Record<string, string> = {
  var_ticket:      'Ticket',
  tx_ret_liq_15d:  'Tx. Retenção Líquida',
  csat:            'CSAT',
  rechamada_d7:    'Rechamada',
  short_call:      'Short Call',
  transfer:        'Transferência',
  atendidas:       'Atendidas',
  nr17:            'NR17',
  pessoal:         'Pessoal (%)',
  outras_pausas:   'Outras Pausas (%)',
  engajamento:     'Engajamento',
  tx_tabulacao:    'Tx. Tabulação',
  tempo_projetado: 'Tempo Projetado',
  tempo_login:     'Tempo de Login',
}

const SUBSECOES_DEF: Array<{ key: string; titulo: string; campos: string[] }> = [
  { key: 'ganhos',        titulo: 'GANHOS & RETENÇÃO',        campos: ['var_ticket', 'tx_ret_liq_15d'] },
  { key: 'qualidade',     titulo: 'QUALIDADE DO ATENDIMENTO', campos: ['csat', 'rechamada_d7', 'short_call', 'transfer', 'atendidas'] },
  { key: 'comportamento', titulo: 'COMPORTAMENTO E PAUSAS',   campos: ['nr17', 'pessoal', 'outras_pausas', 'engajamento', 'tx_tabulacao'] },
  { key: 'presenca',      titulo: 'PRESENÇA',                 campos: ['tempo_projetado', 'tempo_login'] },
]

const COMPLEMENTARES_DEFAULT_EXPANDED = {
  ganhos: true, qualidade: false, comportamento: false, presenca: false,
}

function buildSubsecoes(complementares: { label: string; valor: string }[]): SubsecaoConfig[] {
  const lookup = new Map(complementares.map(c => [c.label, c.valor]))
  return SUBSECOES_DEF.map(({ key, titulo, campos }) => ({
    key,
    titulo,
    items: campos.map(campo => ({
      label: CAMPO_LABEL[campo] ?? campo,
      valor: lookup.get(campo) ?? '—',
    })),
  }))
}

// ── Componente principal ───────────────────────────────────────────────────────

export default function MeuKPIClient({
  kpis, complementares,
  dataAtualizacao, mesLabel,
  modoHistorico, mesFechamento,
}: MeuKPIProps) {
  const cards    = useMemo(() => kpiItemsToCards(kpis),            [kpis])
  const subsecoes = useMemo(() => buildSubsecoes(complementares),  [complementares])

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

        {/* ── Header ── */}
        <PainelHeader titulo="Meu KPI" mesLabel={mesLabel} dataReferencia={modoHistorico ? null : dataAtualizacao} />

        {/* ── Linha dourada HALO ── */}
        <LinhaHorizontalDourada />

        {/* ── Banner modo histórico ── */}
        {modoHistorico && <BannerAguardandoKPI mesFechamento={mesFechamento} />}

        {/* ── KPIs Principais ── */}
        {cards.length > 0 && (
          <div style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
            <MeuKpiSectionTitle>KPIs PRINCIPAIS</MeuKpiSectionTitle>
            <div className="mkpi-grid">
              {cards.map((card, i) => (
                <MeuKpiCard key={card.label} card={card} delay={i * 70} />
              ))}
            </div>
          </div>
        )}

        {/* ── KPIs Complementares — oculto no modo histórico ── */}
        {!modoHistorico && (
          <div style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
            <MeuKpiSectionTitle>KPIs COMPLEMENTARES</MeuKpiSectionTitle>
            <DadosComplementares
              subsecoes={subsecoes}
              lsKey="halo:meu-kpi:subsecoes-expandidas"
              defaultExpanded={COMPLEMENTARES_DEFAULT_EXPANDED}
            />
          </div>
        )}

      </div>
    </>
  )
}
