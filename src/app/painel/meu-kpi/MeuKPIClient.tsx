'use client'

import { useState, useEffect, useMemo } from 'react'
import {
  type KPIItem, type Meta,
  formatMetricValue, sufixoUnidade,
  calcularDiasUteisNoMes, calcularRitmoNecessario,
} from '@/lib/kpi-utils'
import { useMotivationalMessage } from '@/hooks/useMotivationalMessages'
import {
  Clock, Shield, XCircle, Package, CalendarX, Activity,
  BarChart2, TrendingUp, AlertTriangle, CheckCircle2, ChevronRight, Crown,
} from 'lucide-react'
import { setCursorStyle } from '@/components/CursorProvider'

export interface MeuKPIProps {
  kpis:            KPIItem[]
  basicos:         Meta[]
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
}

// ── Helpers ───────────────────────────────────────────────────────────────────

const STATUS_COLOR = { verde: '#4ade80', amarelo: '#facc15', vermelho: '#f87171', neutro: '#94a3b8' }
const STATUS_BG    = { verde: 'rgba(74,222,128,0.08)', amarelo: 'rgba(250,204,21,0.08)', vermelho: 'rgba(248,113,113,0.08)', neutro: 'rgba(148,163,184,0.06)' }
const STATUS_BORDER= { verde: 'rgba(74,222,128,0.15)', amarelo: 'rgba(250,204,21,0.15)', vermelho: 'rgba(248,113,113,0.15)', neutro: 'rgba(148,163,184,0.10)' }
const STATUS_LABEL = { verde: 'Na Meta ✓', amarelo: 'Atenção', vermelho: 'Fora da Meta', neutro: '' }

function kpiIcon(label: string) {
  const l = label.toLowerCase()
  if (l.includes('retenc') || l.includes('retenç')) return <Shield size={16} />
  if (l.includes('tma') || l.includes('tempo'))      return <Clock size={16} />
  if (l.includes('cancel') || l.includes('churn'))   return <XCircle size={16} />
  if (l.includes('pedido'))                          return <Package size={16} />
  if (l.includes('abs') || l.includes('ausên'))      return <CalendarX size={16} />
  if (l.includes('indisp'))                          return <Activity size={16} />
  return <BarChart2 size={16} />
}

function formatSeg(s: number): string {
  const m = Math.floor(Math.abs(s) / 60)
  const sec = Math.round(Math.abs(s) % 60)
  return `${String(m).padStart(2,'0')}:${String(sec).padStart(2,'0')}`
}

function contextLabel(kpi: KPIItem): string | null {
  const t = kpi.meta?.tipoAcumulo ?? 'acumulavel'
  if (t === 'acumulavel') return 'Acumulado do mês'
  if (t === 'media') return 'Média do mês'
  return null
}

function isTempoKPI(kpi: KPIItem): boolean {
  const u = (kpi.meta?.unidade ?? '').trim().toLowerCase()
  const l = kpi.label.toLowerCase()
  return ['seg', 's', 'segundos', 'tempo', 'mm:ss', 'hh:mm', 'hh:mm:ss'].includes(u) ||
    l.includes('tma') || l.includes('tempo')
}

function formatarMetaRodape(meta: Meta): string {
  const alvo = meta.verde_inicio > 0 ? meta.verde_inicio : meta.valor_meta
  const prefix = meta.tipo === 'menor_melhor' ? '≤' : ''
  const u = meta.unidade.trim().toLowerCase()
  const l = meta.label.toLowerCase()
  const isT = ['seg', 's', 'segundos', 'tempo', 'mm:ss', 'hh:mm', 'hh:mm:ss'].includes(u) ||
    l.includes('tma') || l.includes('tempo')
  const fmtAlvo = isT ? formatSeg(alvo) : formatMetricValue(String(alvo), meta.unidade)
  return `${prefix}${fmtAlvo}`
}

function formatarDistancia(kpi: KPIItem): string {
  if (!kpi.meta) return ''
  const alvo = kpi.meta.verde_inicio > 0 ? kpi.meta.verde_inicio : kpi.meta.valor_meta
  const diff = kpi.valorNum - alvo
  const absDiff = Math.abs(diff)
  const isT = isTempoKPI(kpi)
  const isPercent = ['%', 'porcentagem'].includes(kpi.meta.unidade.trim().toLowerCase())
  const diffFmt = isT
    ? formatSeg(absDiff)
    : formatMetricValue(String(Math.round(absDiff * 100) / 100), kpi.meta.unidade)

  if (kpi.meta.tipo === 'maior_melhor') {
    return diff >= 0 ? `+${diffFmt} de folga` : `\u2212${diffFmt} para bater`
  } else {
    if (diff > 0) return `+${diffFmt} acima`
    if (diff < 0) return isPercent ? 'Dentro do limite' : `${diffFmt} abaixo do limite`
    return 'No limite'
  }
}

function calcBarWidth(kpi: KPIItem): number {
  if (!kpi.meta) return 0
  const alvo = kpi.meta.verde_inicio > 0 ? kpi.meta.verde_inicio : kpi.meta.valor_meta
  if (alvo <= 0) return kpi.valorNum === 0 ? 100 : 0
  if (kpi.meta.tipo === 'maior_melhor') {
    return Math.min((kpi.valorNum / alvo) * 100, 120)
  } else {
    if (kpi.valorNum <= 0) return 100
    return Math.min((alvo / kpi.valorNum) * 100, 100)
  }
}

function calcTMAAlvo(
  tmaAtualSeg: number,
  metaTMASeg: number,
  atendidasPassadas: number,
  diasDecorridos: number,
  diasRestantes: number,
): { tmaAlvoSeg: number; ligacoesFuturas: number } | null {
  if (atendidasPassadas <= 0 || diasDecorridos <= 0) return null
  const mediaDiaria = atendidasPassadas / diasDecorridos
  const ligacoesFuturas = Math.round(mediaDiaria * diasRestantes)
  if (ligacoesFuturas <= 0) return null
  const totalFim = atendidasPassadas + ligacoesFuturas
  const tmaAlvoSeg = (metaTMASeg * totalFim - tmaAtualSeg * atendidasPassadas) / ligacoesFuturas
  if (tmaAlvoSeg < 0 || tmaAlvoSeg < metaTMASeg * 0.5) return null
  return { tmaAlvoSeg, ligacoesFuturas }
}

function calcDiasEvitarPausa(excesso: number, diasRestantes: number): number {
  return Math.min(Math.ceil(excesso * 1.5), Math.round(diasRestantes))
}

function acaoRodape(
  kpi: KPIItem,
  diasDecorridos: number,
  diasRestantes: number,
  motivMsg: string | null,
  atendidas?: number,
): string {
  if (kpi.status === 'verde') return motivMsg ?? 'Meta batida com folga'
  if (!kpi.meta) return ''

  const tipoAcumulo = kpi.meta.tipoAcumulo ?? 'acumulavel'
  const isT = isTempoKPI(kpi)
  const label = kpi.label.toLowerCase()
  const isPedido = label.includes('pedido')
  const isIndisp = label.includes('indisp')
  const isAbs = label.includes('abs') || label.includes('ausên')
  const isCancel = label.includes('cancel') || label.includes('churn')
  const alvo = kpi.meta.verde_inicio > 0 ? kpi.meta.verde_inicio : kpi.meta.valor_meta
  const diasInt = Math.round(diasRestantes)

  // TMA — cálculo especializado, independente do tipoAcumulo no banco
  if (isT) {
    if (atendidas && atendidas > 0 && diasDecorridos > 0) {
      const res = calcTMAAlvo(kpi.valorNum, alvo, atendidas, diasDecorridos, diasRestantes)
      if (res) return `\u2264${formatSeg(res.tmaAlvoSeg)} em ~${res.ligacoesFuturas} lig`
    }
    return 'Foque em abaixar o TMA'
  }

  // Indisponibilidade — cálculo especializado, independente do tipoAcumulo no banco
  if (isIndisp) {
    const excesso = kpi.valorNum - alvo
    if (excesso > 0) {
      const dias = calcDiasEvitarPausa(excesso, diasRestantes)
      if (dias >= diasInt) return 'Minimize pausas no mês'
      return `Sem pausas part. por ${dias} dias`
    }
    return 'Mantenha o ritmo atual'
  }

  if (tipoAcumulo === 'pontual') return 'Mantenha o ritmo'

  // ABS
  if (isAbs) {
    if (kpi.status === 'amarelo') return 'Próximo do limite de ausências'
    return diasInt > 0 ? `Evite faltas por mais ${diasInt} dias` : 'Minimize ausências'
  }

  // Acumulável
  const info = calcularRitmoNecessario(kpi.valorNum, kpi.meta, diasDecorridos, diasRestantes)

  if (info.impossivel) {
    if (isPedido) return 'Foque no próximo mês'
    if (isCancel) return 'Minimize cancelamentos'
    return 'Mantenha o ritmo do mês'
  }

  if (info.ritmoNecessario !== null && info.ritmoNecessario > 0 && diasInt > 0) {
    if (isPedido) {
      const n = Math.ceil(info.ritmoNecessario)
      return kpi.status === 'amarelo'
        ? `~${n}/dia para bater a meta`
        : `~${n}/dia por ${diasInt} dias`
    }
    if (isCancel) {
      const max = Math.floor(info.ritmoNecessario)
      return `\u2264${max} canc/dia`
    }
    const ritmoFmt = formatMetricValue(String(info.ritmoNecessario), kpi.meta.unidade)
    return kpi.meta.tipo === 'menor_melhor' ? `Max ~${ritmoFmt}/dia` : `~${ritmoFmt}/dia`
  }

  if (info.projecaoFechamento !== null) {
    const pct = alvo > 0 ? Math.round((info.projecaoFechamento / alvo) * 100) : 0
    return `Proj: ${pct}% da meta`
  }

  return kpi.status === 'amarelo' ? 'Próximo do limite' : 'Aguardando dados'
}

// ── Alerta Inteligente — tipos e helpers ──────────────────────────────────────

type TipoAlerta = 'critico' | 'atencao' | 'oportunidade' | 'celebracao'

interface AlertaInteligente {
  tipo:       TipoAlerta
  texto:      string
  prioridade: number  // within-type sort — lower = more urgent
}

const ALERTA_CONFIG: Record<TipoAlerta, { color: string; bg: string; border: string }> = {
  critico:      { color: '#f87171', bg: 'rgba(248,113,113,0.04)', border: '#f87171' },
  atencao:      { color: '#f59e0b', bg: 'rgba(245,158,11,0.04)',  border: '#f59e0b' },
  oportunidade: { color: '#38bdf8', bg: 'rgba(56,189,248,0.04)',  border: '#38bdf8' },
  celebracao:   { color: '#22c55e', bg: 'rgba(34,197,94,0.04)',   border: '#22c55e' },
}

const TIPO_ORDER: Record<TipoAlerta, number> = { critico: 0, atencao: 1, oportunidade: 2, celebracao: 3 }

function gerarTextoCritico(kpi: KPIItem, alvo: number): string {
  const label = kpi.label.toLowerCase()
  if (isTempoKPI(kpi)) {
    const diff = Math.abs(kpi.valorNum - alvo)
    return `Seu TMA está ${formatSeg(diff)} acima da meta`
  }
  if (kpi.meta?.tipo === 'menor_melhor') {
    const diff = kpi.valorNum - alvo
    if (diff > 0) {
      const diffFmt = formatMetricValue(String(Math.round(diff * 100) / 100), kpi.meta.unidade)
      if (label.includes('indisp')) return `Sua indisponibilidade está ${diffFmt} acima do limite`
      return `Sua ${kpi.label} está ${diffFmt} acima do limite`
    }
  } else if (kpi.meta) {
    const diff = alvo - kpi.valorNum
    if (diff > 0) {
      const diffFmt = formatMetricValue(String(Math.round(diff)), kpi.meta.unidade)
      if (label.includes('pedido')) return `Você está ${diffFmt} abaixo da meta em Pedidos`
      return `Você está ${diffFmt} abaixo da meta em ${kpi.label}`
    }
  }
  return `${kpi.label} fora da meta — atenção urgente`
}

/** Gera até 3 alertas acionáveis, priorizados por tipo e desvio. Função pura. */
export function gerarAlertasOperador(
  kpis: KPIItem[],
  posicaoRanking: number,
  vizinhoAcima?: { posicao: number; txRet: number },
  meuTxRet?: number,
): AlertaInteligente[] {
  const candidatos: AlertaInteligente[] = []

  // CRÍTICO: KPIs vermelho, ordenados por desvio proporcional decrescente
  for (const kpi of kpis.filter(k => k.status === 'vermelho')) {
    if (!kpi.meta) continue
    const alvo = kpi.meta.verde_inicio > 0 ? kpi.meta.verde_inicio : kpi.meta.valor_meta
    if (alvo <= 0) continue
    const propDev = Math.abs(kpi.valorNum - alvo) / alvo
    candidatos.push({ tipo: 'critico', texto: gerarTextoCritico(kpi, alvo), prioridade: -propDev })
  }

  // ATENÇÃO: KPIs amarelo
  for (const kpi of kpis.filter(k => k.status === 'amarelo')) {
    candidatos.push({
      tipo: 'atencao',
      texto: `Você está próximo do limite em ${kpi.label} — ritmo de atenção`,
      prioridade: 0,
    })
  }

  // OPORTUNIDADE: gap até vizinho acima < 1.5 p.p.
  if (vizinhoAcima && meuTxRet !== undefined && posicaoRanking > 1) {
    const gap = vizinhoAcima.txRet - meuTxRet
    if (gap > 0 && gap < 1.5) {
      candidatos.push({
        tipo: 'oportunidade',
        texto: `Você está a ${gap.toFixed(1)} p.p. de subir para ${vizinhoAcima.posicao}º lugar`,
        prioridade: gap,
      })
    }
  }

  // CELEBRAÇÃO: KPIs verdes
  const verdes = kpis.filter(k => k.status === 'verde')
  if (verdes.length > 0) {
    candidatos.push({
      tipo: 'celebracao',
      texto: verdes.length === 1
        ? `Meta principal batida em ${verdes[0].label} este mês`
        : `${verdes.length} metas principais batidas este mês`,
      prioridade: -verdes.length,
    })
  }

  candidatos.sort((a, b) => {
    const td = TIPO_ORDER[a.tipo] - TIPO_ORDER[b.tipo]
    return td !== 0 ? td : a.prioridade - b.prioridade
  })

  return candidatos.slice(0, 3)
}

/**
 * Seleciona os 3 KPIs Principais mais relevantes para o Modo Visão Rápida.
 * Prioridade: fora_da_meta (maior desvio) → atenção → na_meta.
 * NOTA: quando Tx. Retenção for promovida a KPI Principal (basico === true),
 * reativar a seleção via KPIS_VISAO_RAPIDA_KEYWORDS aqui.
 */
export function selecionarKPIsVisaoRapida(kpisPrincipais: KPIItem[]): KPIItem[] {
  const ESTADO_ORDER: Record<string, number> = { vermelho: 0, amarelo: 1, verde: 2, neutro: 3 }

  return [...kpisPrincipais]
    .sort((a, b) => {
      const so = (ESTADO_ORDER[a.status] ?? 3) - (ESTADO_ORDER[b.status] ?? 3)
      if (so !== 0) return so
      if (a.status === 'vermelho' && b.status === 'vermelho' && a.meta && b.meta) {
        const aAlvo = a.meta.verde_inicio > 0 ? a.meta.verde_inicio : a.meta.valor_meta
        const bAlvo = b.meta.verde_inicio > 0 ? b.meta.verde_inicio : b.meta.valor_meta
        const aDev = aAlvo > 0 ? Math.abs(a.valorNum - aAlvo) / aAlvo : 0
        const bDev = bAlvo > 0 ? Math.abs(b.valorNum - bAlvo) / bAlvo : 0
        return bDev - aDev
      }
      return 0
    })
    .slice(0, 3)
}

const LS_KEY_VISAO_RAPIDA = 'halo:meu-kpi:visao-rapida'

// ── Componente Principal ──────────────────────────────────────────────────────

export default function MeuKPIClient({
  kpis, basicos, complementares,
  posicaoRanking, meuTxRet, totalNoRanking,
  vizinhoAcima, vizinhoAbaixo, txRetLider,
}: MeuKPIProps) {
  const basicosKPI = basicos.map(m => kpis.find(k => k.nome_coluna === m.nome_coluna)).filter(Boolean) as KPIItem[]
  const is1 = posicaoRanking === 1

  const diasInfo = useMemo(() => {
    const agora = new Date()
    return calcularDiasUteisNoMes(agora.getFullYear(), agora.getMonth() + 1)
  }, [])

  const atendidas = useMemo(() => {
    const raw = complementares.find(c => c.label === 'Atendidas')?.valor ?? ''
    const n = parseFloat(raw.replace(/[^\d.,]/g, '').replace(',', '.'))
    return isNaN(n) ? 0 : n
  }, [complementares])

  // Informa CursorProvider da posição no pódio (1º=ouro, 2º=prata, 3º=bronze)
  // Sem cleanup no unmount: cursor persiste ao navegar entre telas do painel.
  // Limpeza ocorre apenas no logout (Header.tsx).
  useEffect(() => {
    if (posicaoRanking === 1) setCursorStyle('gold')
    else if (posicaoRanking === 2) setCursorStyle('silver')
    else if (posicaoRanking === 3) setCursorStyle('bronze')
    else setCursorStyle(null)
  }, [posicaoRanking])

  // Visão Rápida — SSR-safe: inicia false, sincroniza com localStorage após mount
  const [visaoRapida, setVisaoRapida] = useState(false)

  useEffect(() => {
    try { setVisaoRapida(localStorage.getItem(LS_KEY_VISAO_RAPIDA) === '1') } catch {}
    const handler = (e: Event) => {
      setVisaoRapida((e as CustomEvent<{ active: boolean }>).detail.active)
    }
    window.addEventListener('halo:visao-rapida-changed', handler)
    return () => window.removeEventListener('halo:visao-rapida-changed', handler)
  }, [])

  const alertas = useMemo(
    () => gerarAlertasOperador(basicosKPI, posicaoRanking, vizinhoAcima, meuTxRet),
    // kpis e basicos são props estáticas por render; deps granulares evitam re-cálculo
    // eslint-disable-next-line react-hooks/exhaustive-deps
    [kpis, basicos, posicaoRanking, vizinhoAcima, meuTxRet],
  )

  const kpisVisaoRapida = useMemo(
    () => selecionarKPIsVisaoRapida(basicosKPI),
    // eslint-disable-next-line react-hooks/exhaustive-deps
    [kpis, basicos],
  )
  const kpisVisiveis = visaoRapida ? kpisVisaoRapida : basicosKPI

  return (
    <>
      <style dangerouslySetInnerHTML={{ __html: `
        @keyframes kpiCardIn {
          0%   { opacity: 0; transform: translateY(16px); }
          100% { opacity: 1; transform: translateY(0); }
        }

        @property --angle {
          syntax: '<angle>';
          initial-value: 0deg;
          inherits: false;
        }
        @keyframes borderRotate {
          to { --angle: 360deg; }
        }
        @keyframes breathe {
          0%, 100% { opacity: 0.4; }
          50%       { opacity: 0.7; }
        }
        @keyframes leaderPulse {
          0%, 100% { box-shadow: 0 0 0 0 rgba(201,168,76,0); }
          50%       { box-shadow: 0 0 8px 3px rgba(201,168,76,0.45); }
        }
        @keyframes silverPulse {
          0%, 100% { box-shadow: 0 0 0 0 rgba(192,192,192,0); }
          50%       { box-shadow: 0 0 16px 4px rgba(192,192,192,0.25); }
        }
        .rank1-beam {
          padding: 2px;
          border-radius: 22px;
          background: conic-gradient(
            from var(--angle),
            transparent 0deg,
            rgba(201,168,76,0.5) 55deg,
            rgba(232,201,109,0.9) 85deg,
            rgba(245,217,122,1)  90deg,
            rgba(232,201,109,0.9) 95deg,
            rgba(201,168,76,0.5) 125deg,
            transparent 175deg
          );
        }
        .rank2-beam {
          padding: 2px;
          border-radius: 22px;
          background: conic-gradient(
            from var(--angle),
            transparent 0deg,
            rgba(192,192,192,0.3) 55deg,
            rgba(232,232,232,0.7) 85deg,
            rgba(255,255,255,0.9) 90deg,
            rgba(232,232,232,0.7) 95deg,
            rgba(192,192,192,0.3) 125deg,
            transparent 175deg
          );
        }
        .rank3-beam {
          padding: 2px;
          border-radius: 22px;
          background: conic-gradient(
            from var(--angle),
            transparent 0deg,
            rgba(166,120,72,0.3) 55deg,
            rgba(205,127,50,0.65) 85deg,
            rgba(216,147,90,0.85) 90deg,
            rgba(205,127,50,0.65) 95deg,
            rgba(166,120,72,0.3) 125deg,
            transparent 175deg
          );
        }
        .rank-beam-base {
          padding: 2px;
          border-radius: 22px;
          background: conic-gradient(
            from var(--angle),
            transparent 0deg,
            rgba(201,168,76,0.06) 55deg,
            rgba(201,168,76,0.14) 85deg,
            rgba(201,168,76,0.18) 90deg,
            rgba(201,168,76,0.14) 95deg,
            rgba(201,168,76,0.06) 125deg,
            transparent 175deg
          );
        }
        @keyframes motivFadeIn {
          from { opacity: 0; transform: translateY(4px); }
          to   { opacity: 1; transform: translateY(0); }
        }

        .subsecao-btn {
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
        .subsecao-btn:hover { background: rgba(201,168,76,0.04); }
        .subsecao-btn:focus-visible { outline: 1px solid rgba(201,168,76,0.3); outline-offset: 2px; }

        .subsecao-content {
          display: grid;
          grid-template-rows: 0fr;
          transition: grid-template-rows 250ms cubic-bezier(0.4,0,0.2,1);
        }
        .subsecao-content.open { grid-template-rows: 1fr; }
        .subsecao-inner { overflow: hidden; min-height: 0; }

        @media (prefers-reduced-motion: reduce) {
          .subsecao-content { transition: none; }
          .subsecao-btn { transition: none; }
        }

        @media (prefers-reduced-motion: no-preference) {

          /* ── 1º lugar ── */
          @keyframes rank1Entrance {
            0%   { transform: scale(0) rotate(-6deg); opacity: 0; }
            55%  { transform: scale(1.12) rotate(2deg); opacity: 1; }
            75%  { transform: scale(0.94) rotate(-1deg); }
            100% { transform: scale(1) rotate(0deg); }
          }
          @keyframes num1Bounce {
            0%   { transform: scale(0); opacity: 0; }
            50%  { transform: scale(1.3); opacity: 1; }
            70%  { transform: scale(0.9); }
            100% { transform: scale(1); opacity: 1; }
          }
          @keyframes borderGlow {
            0%   { box-shadow: 0 0 0 0 rgba(201,168,76,0); border-color: rgba(201,168,76,0.35); }
            33%  { box-shadow: 0 0 32px 10px rgba(201,168,76,0.30); border-color: rgba(232,201,109,0.9); }
            66%  { box-shadow: 0 0 20px 4px rgba(201,168,76,0.15); border-color: rgba(201,168,76,0.6); }
            100% { box-shadow: 0 0 28px 8px rgba(201,168,76,0.25); border-color: rgba(232,201,109,0.8); }
          }
          @keyframes firework {
            0%   { transform: translate(0,0) scale(0);              opacity: 0; }
            20%  { opacity: 1; }
            60%  { transform: translate(var(--fx), var(--fy)) scale(1);  opacity: 1; }
            100% { transform: translate(var(--fx2), var(--fy2)) scale(0); opacity: 0; }
          }
          @keyframes motivText {
            0%   { opacity: 0; transform: translateY(8px); }
            100% { opacity: 1; transform: translateY(0); }
          }
          @keyframes shimmerGold {
            0%   { background-position: -200% center; }
            100% { background-position: 200% center; }
          }

          /* ── 2º lugar ── */
          @keyframes rank2Entrance {
            0%   { transform: translateX(60px); opacity: 0; }
            70%  { transform: translateX(-5px); opacity: 1; }
            100% { transform: translateX(0); opacity: 1; }
          }
          @keyframes twinkle {
            0%   { opacity: 0; transform: scale(0.5); }
            50%  { opacity: 1; transform: scale(1.2); }
            100% { opacity: 0; transform: scale(0.5); }
          }
          @keyframes crystalFall {
            0%   { transform: translateY(-10px) rotate(45deg) scale(0); opacity: 0; }
            20%  { opacity: 1; transform: translateY(0) rotate(45deg) scale(1); }
            80%  { opacity: 0.6; }
            100% { transform: translateY(120px) rotate(225deg) scale(0.3); opacity: 0; }
          }

          /* ── 3º lugar ── */
          @keyframes num3Flip {
            0%   { transform: rotateY(90deg); opacity: 0; }
            100% { transform: rotateY(0deg); opacity: 1; }
          }
          @keyframes flicker {
            0%, 100% { transform: scaleY(1) scaleX(1); }
            25%       { transform: scaleY(1.12) scaleX(0.92); }
            50%       { transform: scaleY(0.94) scaleX(1.05); }
            75%       { transform: scaleY(1.08) scaleX(0.96); }
          }
          @keyframes bronzePulse {
            0%, 100% { border-color: rgba(205,127,50,0.25); }
            50%       { border-color: rgba(205,127,50,0.55); box-shadow: 0 0 16px 2px rgba(205,127,50,0.15); }
          }

          /* ── 4º+ ── */
          @keyframes rankFade {
            0%   { opacity: 0; transform: scale(0.95) translateY(8px); }
            100% { opacity: 1; transform: scale(1) translateY(0); }
          }
        }

        @media (prefers-reduced-motion: reduce) {
          @keyframes rank1Entrance { from { opacity:0; } to { opacity:1; } }
          @keyframes num1Bounce    { from { opacity:0; } to { opacity:1; } }
          @keyframes rank2Entrance { from { opacity:0; } to { opacity:1; } }
          @keyframes num3Flip      { from { opacity:0; } to { opacity:1; } }
          @keyframes rankFade      { from { opacity:0; } to { opacity:1; } }
        }

        .alerta-dot {
          all: unset;
          width: 6px; height: 6px; border-radius: 50%;
          cursor: pointer; flex-shrink: 0; box-sizing: border-box;
          display: inline-block;
        }
        .alerta-dot:focus-visible { outline: 1px solid rgba(255,255,255,0.5); outline-offset: 2px; }
      `}} />

      <div className="login-grid-bg space-y-6" style={{ borderRadius: '16px', padding: '4px' }}>
        {/* ── Alerta Inteligente ── */}
        {alertas.length > 0 && <AlertaBanner alertas={alertas} />}

        {/* ── Seção 1: Ranking ── */}
        <div className="login-stagger-1">
          <RankingCard posicao={posicaoRanking} txRet={meuTxRet} total={totalNoRanking} vizinhoAcima={vizinhoAcima} vizinhoAbaixo={vizinhoAbaixo} txRetLider={txRetLider ?? 0} />
        </div>

        {/* ── Seção 2: KPIs Principais ── */}
        {kpisVisiveis.length > 0 && (
          <div className="login-stagger-2 space-y-3">
            <SectionTitle>KPIs Principais</SectionTitle>
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(290px, 1fr))', gap: '14px' }}>
              {kpisVisiveis.map((kpi, i) => (
                <KPICard key={kpi.nome_coluna} kpi={kpi} delay={i * 80} cardIndex={i} diasInfo={diasInfo} atendidas={atendidas} podioPos={posicaoRanking <= 3 && posicaoRanking > 0 ? posicaoRanking as 1|2|3 : undefined} />
              ))}
            </div>
          </div>
        )}

        {/* ── Seção 3: Dados do Mês (oculto em Visão Rápida) ── */}
        {!visaoRapida && (
          <div className="login-stagger-3 space-y-3">
            <SectionTitle>Dados do Mês</SectionTitle>
            <DadosDoMes complementares={complementares} />
          </div>
        )}
      </div>
    </>
  )
}

// ── Ranking Card ──────────────────────────────────────────────────────────────

// TODO: badge de movimento de ranking (↑↓) quando houver histórico de posições salvo.
// Comparação sugerida: posicao atual vs posicao no início do mês.
// Requer: mecanismo de snapshot diário da lista ordenada de operadores.
function RankingCard({ posicao, txRet, total, vizinhoAcima, vizinhoAbaixo, txRetLider }: {
  posicao: number
  txRet: number
  total: number
  vizinhoAcima?:  { posicao: number; txRet: number }
  vizinhoAbaixo?: { posicao: number; txRet: number }
  txRetLider:     number
}) {
  if (posicao === 0) {
    return (
      <div style={{
        background: '#0d0d1a',
        border: '1px solid rgba(201,168,76,0.08)',
        borderRadius: '20px',
        padding: '28px 32px',
        display: 'flex',
        alignItems: 'center',
        gap: '20px',
        animation: 'rankFade 0.4s ease both',
      }}>
        <div style={{
          width: '56px', height: '56px', borderRadius: '16px', flexShrink: 0,
          background: 'rgba(148,163,184,0.06)', border: '1px solid rgba(148,163,184,0.12)',
          display: 'flex', alignItems: 'center', justifyContent: 'center',
        }}>
          <BarChart2 size={24} style={{ color: 'var(--text-muted)' }} />
        </div>
        <div>
          <p style={{ fontFamily: 'var(--ff-display)', fontSize: '16px', fontWeight: 700, color: 'var(--text-secondary)', marginBottom: '4px' }}>
            Sem posição no ranking
          </p>
          <p style={{ fontSize: '13px', color: 'var(--text-muted)', lineHeight: 1.5 }}>
            Seus dados ainda não foram encontrados no ranking de Tx. Retenção deste mês.
          </p>
        </div>
      </div>
    )
  }

  const is1    = posicao === 1
  const is2    = posicao === 2
  const is3    = posicao === 3
  const isLast = posicao > 0 && posicao === total

  const gapAcima  = vizinhoAcima  ? (vizinhoAcima.txRet  - txRet).toFixed(1) : null
  const gapAbaixo = vizinhoAbaixo ? (txRet - vizinhoAbaixo.txRet).toFixed(1) : null

  // Fanfarra Web Audio — 1º lugar
  useEffect(() => {
    if (!is1) return
    const timer = setTimeout(() => {
      try {
        const ctx = new (window.AudioContext || (window as unknown as { webkitAudioContext: typeof AudioContext }).webkitAudioContext)()
        ;[440, 550, 660].forEach((freq, i) => {
          const osc  = ctx.createOscillator()
          const gain = ctx.createGain()
          osc.connect(gain); gain.connect(ctx.destination)
          osc.frequency.value = freq; osc.type = 'sine'
          const t = ctx.currentTime + i * 0.15
          gain.gain.setValueAtTime(0.07, t)
          gain.gain.exponentialRampToValueAtTime(0.001, t + 0.12)
          osc.start(t); osc.stop(t + 0.13)
        })
      } catch { /* silent */ }
    }, 700)
    return () => clearTimeout(timer)
  }, [is1])

  // ── conteúdo compartilhado ────────────────────────────────────────────────
  const content = (
    <>
      {/* ── Brilho canto sup. direito — semântico por posição ── */}
      {(is1 || is2 || is3) && (
        <div style={{
          position: 'absolute', top: 0, right: 0,
          width: '200px', height: '120px',
          background: is1
            ? 'radial-gradient(ellipse at top right, rgba(201,168,76,0.25) 0%, transparent 70%)'
            : is2
              ? 'radial-gradient(ellipse at top right, rgba(192,192,192,0.18) 0%, transparent 70%)'
              : 'radial-gradient(ellipse at top right, rgba(205,127,50,0.18) 0%, transparent 70%)',
          borderRadius: '20px',
          pointerEvents: 'none', zIndex: 0,
          opacity: 0.4,
          animation: is1 ? 'breathe 3s ease-in-out infinite' : undefined,
        }} />
      )}

      {/* ── Número ── */}
      <div style={{ position: 'relative', zIndex: 1, flexShrink: 0, textAlign: 'center' }}>

        {/* ícone de posição acima do número */}
        {is1 && (
          <Crown size={28} style={{ color: '#f4d47c', display: 'block', margin: '0 auto 4px' }} />
        )}
        {is2 && (
          <svg width="16" height="16" viewBox="0 0 14 14" style={{ display: 'block', margin: '0 auto 4px' }}>
            <path d="M7 0 L14 7 L7 14 L0 7 Z" fill="rgba(192,192,192,0.75)" />
          </svg>
        )}
        {is3 && (
          <svg width="16" height="16" viewBox="0 0 14 14" style={{ display: 'block', margin: '0 auto 4px' }}>
            <path d="M7 0 L14 7 L7 14 L0 7 Z" fill="rgba(205,127,50,0.75)" />
          </svg>
        )}
        {posicao >= 4 && (
          <svg width="14" height="14" viewBox="0 0 14 14" style={{ display: 'block', margin: '0 auto 4px' }}>
            <path d="M7 0 L14 7 L7 14 L0 7 Z" fill="rgba(125,211,252,0.55)" />
          </svg>
        )}

        {/* Número principal */}
        <div style={{
          fontFamily: 'var(--ff-display)', lineHeight: 1, fontWeight: 900,
          ...(is1 ? {
            fontSize: '80px',
            background: 'linear-gradient(90deg, #c9a84c, #e8c96d, #f5d97a, #e8c96d, #c9a84c)',
            backgroundSize: '200% auto',
            WebkitBackgroundClip: 'text', WebkitTextFillColor: 'transparent', backgroundClip: 'text',
            animation: 'num1Bounce 0.6s cubic-bezier(0.34,1.56,0.64,1) 0.1s both, shimmerGold 2.5s linear 1s infinite',
          } : is2 ? {
            fontSize: '72px',
            background: 'linear-gradient(135deg, #e8e8e8 0%, #c0c0c0 50%, #a0a0a0 100%)',
            WebkitBackgroundClip: 'text', WebkitTextFillColor: 'transparent', backgroundClip: 'text',
            animation: 'rank2Entrance 0.7s ease-out both',
          } : is3 ? {
            fontSize: '68px',
            background: 'linear-gradient(135deg, #a67848 0%, #d8935a 100%)',
            WebkitBackgroundClip: 'text', WebkitTextFillColor: 'transparent', backgroundClip: 'text',
            animation: 'num3Flip 0.6s ease 0.1s both',
          } : {
            fontSize: '56px',
            background: 'linear-gradient(135deg, #7dd3fc 0%, #38bdf8 100%)',
            WebkitBackgroundClip: 'text', WebkitTextFillColor: 'transparent', backgroundClip: 'text',
            animation: 'rankFade 0.4s ease both',
          }),
        }}>
          {posicao}º
        </div>

      </div>

      {/* ── Info ── */}
      <div style={{ position: 'relative', zIndex: 1, flex: 1, minWidth: '160px' }}>
        {/* Vizinho acima — micro */}
        {vizinhoAcima && (
          <div style={{ display: 'flex', alignItems: 'center', gap: '5px', fontFamily: 'var(--ff-body)', fontSize: '11px', fontWeight: 400, color: 'rgba(255,255,255,0.40)', lineHeight: 1, marginBottom: '5px' }}>
            <span>{vizinhoAcima.posicao}º</span>
            <span style={{ fontVariantNumeric: 'tabular-nums' }}>{vizinhoAcima.txRet.toFixed(1)}%</span>
            <div style={{ width: '60px', height: '2px', background: 'rgba(255,255,255,0.05)', borderRadius: '1px', flexShrink: 0, overflow: 'hidden' }}>
              <div style={{ height: '100%', width: `${txRetLider > 0 ? Math.min((vizinhoAcima.txRet / txRetLider) * 100, 100) : 0}%`, background: 'rgba(201,168,76,0.35)', borderRadius: '1px' }} />
            </div>
            <span style={{ color: 'rgba(255,255,255,0.28)' }}>+{gapAcima} p.p. à frente</span>
          </div>
        )}

        <p style={{
          fontFamily: 'var(--ff-display)', fontSize: is1 ? '20px' : '17px', fontWeight: 700,
          color: is1 ? '#e8c96d' : is2 ? '#e8e8e8' : is3 ? '#cd7f32' : 'var(--text-secondary)',
          marginBottom: '4px',
        }}>
          {is1 ? '1º NO RANKING' : is2 ? '2º no Ranking' : is3 ? '3º no Ranking' : `${posicao}º no Ranking`}
        </p>

        {/* Vizinho abaixo — micro */}
        {vizinhoAbaixo && (
          <div style={{ display: 'flex', alignItems: 'center', gap: '5px', fontFamily: 'var(--ff-body)', fontSize: '11px', fontWeight: 400, color: 'rgba(255,255,255,0.40)', lineHeight: 1, margin: '6px 0 8px' }}>
            <span>{vizinhoAbaixo.posicao}º</span>
            <span style={{ fontVariantNumeric: 'tabular-nums' }}>{vizinhoAbaixo.txRet.toFixed(1)}%</span>
            <div style={{ width: '60px', height: '2px', background: 'rgba(255,255,255,0.05)', borderRadius: '1px', flexShrink: 0, overflow: 'hidden' }}>
              <div style={{ height: '100%', width: `${txRetLider > 0 ? Math.min((vizinhoAbaixo.txRet / txRetLider) * 100, 100) : 0}%`, background: 'rgba(201,168,76,0.35)', borderRadius: '1px' }} />
            </div>
            <span style={{ color: 'rgba(255,255,255,0.28)' }}>{gapAbaixo} p.p. atrás</span>
          </div>
        )}

        <p style={{ fontSize: '13px', color: 'var(--text-muted)', marginBottom: '8px' }}>
          de {total} operadores em Tx. Retenção
        </p>

        <div style={{
          display: 'inline-flex', alignItems: 'center', gap: '8px',
          padding: '6px 14px', borderRadius: '10px',
          background: is1 ? '#0a0800' : is2 ? '#0f0f16' : is3 ? '#1a1208' : 'rgba(201,168,76,0.06)',
          border: is2 ? '1px solid rgba(192,192,192,0.18)' : is3 ? '1px solid rgba(216,147,90,0.22)' : '1px solid rgba(201,168,76,0.12)',
        }}>
          <TrendingUp size={13} style={{ color: is2 ? '#c0c0d0' : is3 ? '#d8935a' : '#c9a84c' }} />
          <span style={{ fontSize: '18px', fontWeight: 700, fontVariantNumeric: 'tabular-nums', color: is2 ? '#e8e8e8' : is3 ? '#d8935a' : '#e8c96d' }}>
            {txRet.toFixed(1)}%
          </span>
          <span style={{ fontSize: '11px', color: 'var(--text-muted)' }}>Tx. Retenção</span>
        </div>

        {/* Mensagem situacional — último lugar */}
        {isLast && vizinhoAcima && (
          <p style={{ fontFamily: 'var(--ff-body)', fontSize: '11px', color: 'rgba(255,255,255,0.45)', marginTop: '8px', lineHeight: 1.4 }}>
            Foco no próximo degrau — {gapAcima} p.p. para subir.
          </p>
        )}
      </div>
    </>
  )

  // ── is1: wrapper beam dourado + inner card ────────────────────────────────────
  if (is1) {
    return (
      <div
        className="rank1-beam"
        style={{
          animation: 'rank1Entrance 0.7s cubic-bezier(0.34,1.56,0.64,1) both, borderRotate 3s linear 0.8s infinite',
        }}
      >
        <div
          style={{
            position: 'relative', borderRadius: '20px',
            padding: '28px 32px', display: 'flex',
            alignItems: 'center', gap: '32px', flexWrap: 'wrap',
            overflow: 'hidden',
            background: 'linear-gradient(135deg, #0f0c02 0%, #1a1400 50%, #0a0900 100%)',
          }}
        >
          {content}
        </div>
      </div>
    )
  }

  // ── is2: wrapper beam prata + inner card prateado ────────────────────────────
  if (is2) {
    return (
      <div
        className="rank2-beam"
        style={{
          animation: 'rank2Entrance 0.7s ease-out both, borderRotate 5s linear 0.8s infinite',
        }}
      >
        <div
          style={{
            position: 'relative', borderRadius: '20px',
            padding: '28px 32px', display: 'flex',
            alignItems: 'center', gap: '32px', flexWrap: 'wrap',
            overflow: 'hidden',
            background: '#1a1a24',
            border: '1px solid #c0c0d0',
          }}
        >
          {content}
        </div>
      </div>
    )
  }

  // ── is3: wrapper beam bronze + inner card bronze ──────────────────────────────
  if (is3) {
    return (
      <div
        className="rank3-beam"
        style={{
          animation: 'rankFade 0.45s ease both, borderRotate 6s linear 0.5s infinite',
        }}
      >
        <div
          style={{
            position: 'relative', borderRadius: '20px',
            padding: '28px 32px', display: 'flex',
            alignItems: 'center', gap: '32px', flexWrap: 'wrap',
            overflow: 'hidden',
            background: '#2a1d10',
            border: '1px solid #d8935a',
            animationName: 'bronzePulse',
            animationDuration: '3s',
            animationDelay: '0.5s',
            animationTimingFunction: 'ease-in-out',
            animationIterationCount: 'infinite',
          }}
        >
          {content}
        </div>
      </div>
    )
  }

  // ── 4+: wrapper beam sutil ────────────────────────────────────────────────────
  return (
    <div
      className="rank-beam-base"
      style={{ animation: 'rankFade 0.4s ease both, borderRotate 10s linear 0.5s infinite' }}
    >
      <div
        style={{
          position: 'relative', borderRadius: '20px',
          padding: '28px 32px', display: 'flex',
          alignItems: 'center', gap: '32px', flexWrap: 'wrap',
          overflow: 'hidden',
          background: '#0d0d1a',
          border: '1px solid rgba(201,168,76,0.08)',
          animation: 'rankFade 0.4s ease both',
        }}
      >
        {content}
      </div>
    </div>
  )
}

// ── Alerta Inteligente — componentes ─────────────────────────────────────────

function AlertaIcon({ tipo }: { tipo: TipoAlerta }) {
  const c = ALERTA_CONFIG[tipo].color
  if (tipo === 'critico') {
    return (
      <svg width="14" height="13" viewBox="0 0 14 13" style={{ flexShrink: 0 }}>
        <path d="M7 1.5L13 12H1L7 1.5Z" fill={c} />
      </svg>
    )
  }
  if (tipo === 'atencao') {
    return (
      <svg width="14" height="13" viewBox="0 0 14 13" fill="none" style={{ flexShrink: 0 }}>
        <path d="M7 1L13.5 12H0.5L7 1Z" stroke={c} strokeWidth="1.4" strokeLinejoin="round" />
        <line x1="7" y1="4.5" x2="7" y2="7.5" stroke={c} strokeWidth="1.4" strokeLinecap="round" />
        <circle cx="7" cy="9.5" r="0.7" fill={c} />
      </svg>
    )
  }
  if (tipo === 'oportunidade') {
    return (
      <svg width="12" height="14" viewBox="0 0 12 14" fill="none" style={{ flexShrink: 0 }}>
        <line x1="6" y1="13" x2="6" y2="1" stroke={c} strokeWidth="1.4" strokeLinecap="round" />
        <path d="M2 5L6 1L10 5" stroke={c} strokeWidth="1.4" strokeLinecap="round" strokeLinejoin="round" />
      </svg>
    )
  }
  return (
    <svg width="14" height="14" viewBox="0 0 14 14" fill="none" style={{ flexShrink: 0 }}>
      <path d="M2 7.5L5.5 11L12 3" stroke={c} strokeWidth="1.4" strokeLinecap="round" strokeLinejoin="round" />
    </svg>
  )
}

function AlertaBanner({ alertas }: { alertas: AlertaInteligente[] }) {
  const [activeIdx,    setActiveIdx]    = useState(0)
  const [isHovered,    setIsHovered]    = useState(false)
  const [fadeOut,      setFadeOut]      = useState(false)
  const [prefersReduced, setPrefersReduced] = useState(false)

  useEffect(() => {
    setPrefersReduced(window.matchMedia('(prefers-reduced-motion: reduce)').matches)
  }, [])

  useEffect(() => {
    if (isHovered || prefersReduced || alertas.length <= 1) return
    let fadeTimer: ReturnType<typeof setTimeout> | null = null
    const id = setInterval(() => {
      setFadeOut(true)
      fadeTimer = setTimeout(() => {
        setActiveIdx(prev => (prev + 1) % alertas.length)
        setFadeOut(false)
      }, 200)
    }, 15000)
    return () => {
      clearInterval(id)
      if (fadeTimer) clearTimeout(fadeTimer)
    }
  }, [isHovered, prefersReduced, alertas.length])

  function goTo(idx: number) {
    if (idx === activeIdx) return
    if (prefersReduced) { setActiveIdx(idx); return }
    setFadeOut(true)
    setTimeout(() => { setActiveIdx(idx); setFadeOut(false) }, 200)
  }

  const safeIdx = Math.min(activeIdx, alertas.length - 1)
  const alerta  = alertas[safeIdx]
  const cfg     = ALERTA_CONFIG[alerta.tipo]

  return (
    <div
      onMouseEnter={() => setIsHovered(true)}
      onMouseLeave={() => setIsHovered(false)}
      style={{
        display: 'flex', alignItems: 'center', gap: '10px',
        padding: '0 14px', height: '44px',
        background: cfg.bg,
        borderRadius: '10px',
        border: '1px solid rgba(255,255,255,0.05)',
        borderLeft: `2px solid ${cfg.border}`,
        opacity: fadeOut ? 0 : 1,
        transition: prefersReduced ? 'none' : 'opacity 200ms ease',
      }}
    >
      <AlertaIcon tipo={alerta.tipo} />
      <span style={{
        flex: 1, fontSize: '13px', color: 'rgba(255,255,255,0.88)',
        fontFamily: 'var(--ff-body)', lineHeight: 1.4,
      }}>
        {alerta.texto}
      </span>
      {alertas.length > 1 && (
        <div style={{ display: 'flex', gap: '4px', alignItems: 'center', flexShrink: 0 }}>
          {alertas.map((a, i) => (
            <button
              key={i}
              type="button"
              className="alerta-dot"
              onClick={() => goTo(i)}
              aria-label={`Alerta ${i + 1} de ${alertas.length}`}
              style={{ background: i === safeIdx ? ALERTA_CONFIG[a.tipo].color : 'rgba(255,255,255,0.20)' }}
            />
          ))}
        </div>
      )}
    </div>
  )
}

// ── KPI Card ──────────────────────────────────────────────────────────────────

interface DiasInfo {
  diasUteisDecorridos: number
  diasUteisRestantes: number
}

function KPICard({ kpi, delay, cardIndex, diasInfo, atendidas, podioPos }: {
  kpi: KPIItem
  delay: number
  cardIndex: number
  diasInfo: DiasInfo
  atendidas?: number
  podioPos?: 1 | 2 | 3
}) {
  const color  = STATUS_COLOR[kpi.status]
  const bg     = STATUS_BG[kpi.status]
  const border = STATUS_BORDER[kpi.status]

  const podioBorder = podioPos === 1
    ? '1px solid var(--halo-gold)'
    : podioPos === 2
      ? '1px solid var(--halo-silver)'
      : podioPos === 3
        ? '1px solid var(--halo-bronze)'
        : undefined

  const motivMsg     = useMotivationalMessage(cardIndex)
  const displayValue = formatMetricValue(kpi.valor, kpi.unidade)
  const ctxLabel     = contextLabel(kpi)
  const barWidth     = calcBarWidth(kpi)
  const metaRodape   = kpi.meta ? formatarMetaRodape(kpi.meta) : null
  const distancia    = kpi.meta ? formatarDistancia(kpi) : null
  const acao         = acaoRodape(kpi, diasInfo.diasUteisDecorridos, diasInfo.diasUteisRestantes, motivMsg, atendidas)

  const acaoColor = kpi.status === 'verde'
    ? 'rgba(74,222,128,0.85)'
    : kpi.status === 'amarelo'
      ? 'rgba(250,204,21,0.85)'
      : 'rgba(248,113,113,0.85)'

  return (
    <div style={{
      background: '#0d0d1a',
      border: podioBorder ?? `1px solid rgba(201,168,76,0.08)`,
      borderRadius: '16px',
      padding: '20px 22px',
      display: 'flex',
      flexDirection: 'column',
      minHeight: '220px',
      animation: `kpiCardIn 0.4s ease both`,
      animationDelay: `${delay}ms`,
    }}>

      {/* ── Zona 1: Header ── */}
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: '8px', marginBottom: '16px' }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: '8px', minWidth: 0, flex: 1, overflow: 'hidden' }}>
          <div style={{ width: '28px', height: '28px', borderRadius: '7px', display: 'flex', alignItems: 'center', justifyContent: 'center', background: bg, border: `1px solid ${border}`, color, flexShrink: 0 }}>
            {kpiIcon(kpi.label)}
          </div>
          <span
            title={kpi.label}
            style={{ fontFamily: 'var(--ff-display)', fontSize: '11px', fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.04em', color: 'var(--text-secondary)', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}
          >
            {kpi.label.toLowerCase().includes('indisp') ? 'Indisp.' : kpi.label}
          </span>
        </div>
        {kpi.status !== 'neutro' && (
          <span style={{ fontFamily: 'var(--ff-body)', fontSize: '10px', fontWeight: 700, padding: '3px 7px', borderRadius: '4px', textTransform: 'uppercase', letterSpacing: '0.06em', background: bg, color, border: `1px solid ${border}`, flexShrink: 0, whiteSpace: 'nowrap' }}>
            {STATUS_LABEL[kpi.status]}
          </span>
        )}
      </div>

      {/* ── Zona 2: Valor principal ── */}
      <div style={{ flex: 1, marginBottom: '14px' }}>
        <span style={{ fontFamily: 'var(--ff-body)', fontSize: '48px', fontWeight: 600, lineHeight: 1, color: 'rgba(255,255,255,0.95)', fontVariantNumeric: 'tabular-nums', letterSpacing: '-0.02em', display: 'block' }}>
          {displayValue}
        </span>
        {ctxLabel && (
          <span style={{ fontFamily: 'var(--ff-body)', fontSize: '11px', color: 'rgba(255,255,255,0.38)', marginTop: '4px', display: 'block' }}>
            {ctxLabel}
          </span>
        )}
      </div>

      {/* ── Zona 3: Barra ── */}
      {kpi.meta && (
        <div style={{ marginBottom: '10px' }}>
          <div style={{ height: '4px', borderRadius: '99px', background: 'rgba(255,255,255,0.08)', overflow: 'hidden' }}>
            <div style={{
              height: '100%',
              width: `${Math.min(barWidth, 100)}%`,
              borderRadius: '99px',
              background: kpi.status === 'verde'
                ? 'linear-gradient(90deg, #16a34a, #4ade80)'
                : kpi.status === 'amarelo'
                  ? 'linear-gradient(90deg, #ca8a04, #facc15)'
                  : 'linear-gradient(90deg, #dc2626, #f87171)',
              transition: 'width 0.8s cubic-bezier(0.4,0,0.2,1)',
            }} />
          </div>
        </div>
      )}

      {/* ── Zona 4: Rodapé (linha única) ── */}
      {kpi.meta && metaRodape && (
        <div
          title={`Meta: ${metaRodape}${distancia ? ` · ${distancia}` : ''}${acao ? ` · ${acao}` : ''}`}
          style={{ fontFamily: 'var(--ff-body)', fontSize: '10.5px', color: 'rgba(255,255,255,0.55)', lineHeight: 1.4 }}
        >
          <span>Meta: {metaRodape}</span>
          {distancia && (
            <>
              <span style={{ opacity: 0.35 }}> · </span>
              <span>{distancia}</span>
            </>
          )}
          {acao && (
            <>
              <span style={{ opacity: 0.35 }}> · </span>
              <span key={motivMsg ?? '__init__'} style={{ color: acaoColor, animation: kpi.status === 'verde' && motivMsg ? 'motivFadeIn 0.2s ease both' : undefined }}>
                {acao}
              </span>
            </>
          )}
        </div>
      )}

    </div>
  )
}

// ── Dados do Mês — subseções colapsáveis ────────────────────────────────────

const LS_KEY_SUBSECOES = 'halo:meu-kpi:subsecoes-expandidas'

type SubsecoesState = {
  ganhos:        boolean
  qualidade:     boolean
  comportamento: boolean
  presenca:      boolean
}

const SUBSECOES_DEFAULT: SubsecoesState = {
  ganhos:        true,
  qualidade:     false,
  comportamento: false,
  presenca:      false,
}

interface SubsecaoItem { campo: string; displayLabel: string }
interface SubsecaoConfig { key: keyof SubsecoesState; titulo: string; items: SubsecaoItem[] }

const SUBSECOES_CONFIG: SubsecaoConfig[] = [
  {
    key: 'ganhos',
    titulo: 'GANHOS & RETENÇÃO',
    items: [
      { campo: '% Variação Ticket',            displayLabel: 'Ticket' },
      { campo: 'Tx. Retenção Líquida 15d (%)', displayLabel: 'Tx. Retenção Líquida' },
      { campo: 'Retidos Brutos',               displayLabel: 'Retidos Brutos' },
      { campo: 'Retidos Líquidos 15d',         displayLabel: 'Retidos Líquidos' },
    ],
  },
  {
    key: 'qualidade',
    titulo: 'QUALIDADE DO ATENDIMENTO',
    items: [
      { campo: 'CSAT',              displayLabel: 'CSAT' },
      { campo: 'Rechamada D+7 (%)', displayLabel: 'Rechamada' },
      { campo: 'Short Call (%)',    displayLabel: 'Short Call' },
      { campo: 'Transfer (%)',      displayLabel: 'Transferência' },
      { campo: 'Atendidas',         displayLabel: 'Atendidas' },
    ],
  },
  {
    key: 'comportamento',
    titulo: 'COMPORTAMENTO E PAUSAS',
    items: [
      { campo: 'NR17 (%)',          displayLabel: 'NR17' },
      { campo: 'Pessoal (%)',       displayLabel: 'Pessoal (%)' },
      { campo: 'Outras Pausas (%)', displayLabel: 'Outras Pausas (%)' },
      { campo: 'Pessoal',           displayLabel: 'Pessoal' },
      { campo: 'Outras Pausas',     displayLabel: 'Outras Pausas' },
      { campo: 'Engajamento',       displayLabel: 'Engajamento' },
      { campo: 'Tx. Tabulação (%)', displayLabel: 'Tx. Tabulação' },
    ],
  },
  {
    key: 'presenca',
    titulo: 'PRESENÇA',
    items: [
      { campo: 'Tempo Projetado', displayLabel: 'Tempo Projetado' },
      { campo: 'Tempo de Login',  displayLabel: 'Tempo de Login' },
      { campo: 'Logins Mês',      displayLabel: 'Logins Mês' },
    ],
  },
]

function DadosDoMes({ complementares }: { complementares: { label: string; valor: string }[] }) {
  const [expanded, setExpanded] = useState<SubsecoesState>(SUBSECOES_DEFAULT)

  useEffect(() => {
    try {
      const raw = localStorage.getItem(LS_KEY_SUBSECOES)
      if (raw) {
        const parsed = JSON.parse(raw) as Partial<SubsecoesState>
        setExpanded(prev => ({ ...prev, ...parsed }))
      }
    } catch { /* ignore */ }
  }, [])

  function toggle(key: keyof SubsecoesState) {
    setExpanded(prev => {
      const next = { ...prev, [key]: !prev[key] }
      try { localStorage.setItem(LS_KEY_SUBSECOES, JSON.stringify(next)) } catch { /* ignore */ }
      return next
    })
  }

  const lookup = useMemo(
    () => new Map(complementares.map(c => [c.label, c.valor])),
    [complementares]
  )

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: '4px' }}>
      {SUBSECOES_CONFIG.map(subsecao => {
        const isOpen = expanded[subsecao.key]
        return (
          <div key={subsecao.key}>

            {/* ── Cabeçalho clicável ── */}
            <button
              type="button"
              className="subsecao-btn"
              onClick={() => toggle(subsecao.key)}
            >
              <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                <span style={{
                  fontFamily: 'var(--ff-display)',
                  fontSize: '11px', fontWeight: 700,
                  textTransform: 'uppercase', letterSpacing: '0.12em',
                  color: '#c9a84c',
                }}>
                  {subsecao.titulo}
                </span>
                <span style={{ color: 'rgba(255,255,255,0.25)', userSelect: 'none' }}>·</span>
                <span style={{ fontFamily: 'var(--ff-body)', fontSize: '10px', color: 'rgba(255,255,255,0.35)' }}>
                  {subsecao.items.length} indicadores
                </span>
              </div>
              <ChevronRight size={14} style={{
                color: 'rgba(255,255,255,0.35)',
                flexShrink: 0,
                transform: isOpen ? 'rotate(90deg)' : 'rotate(0deg)',
                transition: 'transform 250ms cubic-bezier(0.4,0,0.2,1)',
              }} />
            </button>

            {/* ── Conteúdo colapsável ── */}
            <div className={`subsecao-content${isOpen ? ' open' : ''}`}>
              <div className="subsecao-inner">
                <div style={{
                  display: 'grid',
                  gridTemplateColumns: 'repeat(auto-fill, minmax(140px, 1fr))',
                  gap: '8px',
                  padding: '6px 0 10px',
                }}>
                  {subsecao.items.map(({ campo, displayLabel }) => {
                    const rawValor = lookup.get(campo)
                    const semDados = rawValor === undefined || rawValor === '' || rawValor === '—'
                    const valor = semDados ? '\u2014' : rawValor!
                    return (
                      <div
                        key={campo}
                        title={semDados ? 'Sem dados disponíveis ainda' : undefined}
                        style={{
                          background: 'rgba(255,255,255,0.02)',
                          border: '1px solid rgba(201,168,76,0.06)',
                          borderRadius: '12px',
                          padding: '10px 12px',
                          minHeight: '72px',
                          display: 'flex',
                          flexDirection: 'column',
                          justifyContent: 'space-between',
                        }}
                      >
                        <p style={{
                          fontFamily: 'var(--ff-display)',
                          fontSize: '10px', fontWeight: 700,
                          textTransform: 'uppercase', letterSpacing: '0.06em',
                          color: 'rgba(255,255,255,0.55)',
                          lineHeight: 1.3, margin: 0,
                        }}>
                          {displayLabel}
                        </p>
                        <p style={{
                          fontFamily: 'var(--ff-body)',
                          fontSize: '16px', fontWeight: 600,
                          color: semDados ? 'rgba(255,255,255,0.25)' : 'rgba(255,255,255,0.95)',
                          fontVariantNumeric: 'tabular-nums',
                          margin: 0, marginTop: '4px',
                        }}>
                          {valor}
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

// ── Section Title ─────────────────────────────────────────────────────────────

function SectionTitle({ children }: { children: React.ReactNode }) {
  return (
    <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
      <span style={{
        fontFamily: 'var(--ff-display)',
        fontSize: '11px', fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.12em',
        color: '#c9a84c',
      }}>{children}</span>
      <div style={{ flex: 1, height: '1px', background: 'linear-gradient(90deg, rgba(201,168,76,0.15) 0%, transparent 100%)' }} />
    </div>
  )
}
