'use client'

import Link from 'next/link'
import clsx from 'clsx'
import type { KPIItem, Status } from '@/lib/kpi-utils'
import { formatarExibicao, sufixoUnidade } from '@/lib/kpi-utils'
import { ExternalLink } from 'lucide-react'

const VALOR_COR: Record<Status, string> = {
  verde:    '#10b981',
  amarelo:  '#f59e0b',
  vermelho: '#ef4444',
  neutro:   'var(--text-secondary)',
}

const DOT_COR: Record<Status, string> = {
  verde:    'bg-emerald-400',
  amarelo:  'bg-amber-400',
  vermelho: 'bg-rose-400',
  neutro:   'bg-slate-600',
}

const BORDA_TOP: Record<Status, string> = {
  verde:    '#10b981',
  amarelo:  '#f59e0b',
  vermelho: '#ef4444',
  neutro:   'transparent',
}

const GLOW: Record<Status, string> = {
  verde:    '0 0 12px rgba(16,185,129,0.25)',
  amarelo:  '0 0 12px rgba(245,158,11,0.25)',
  vermelho: '0 0 12px rgba(239,68,68,0.25)',
  neutro:   'none',
}

// ── Tooltip (i) ───────────────────────────────────────────────────────────────

function descreverKPI(label: string): string {
  const l = label.toLowerCase()
  if (l.includes('pedido') || l.includes('venda'))           return 'Total de pedidos/vendas no período.'
  if (l.includes('cancel'))                                   return 'Total de cancelamentos no período.'
  if (l.includes('churn'))                                    return 'Taxa de clientes perdidos.'
  if (l.includes('ticket'))                                   return 'Valor médio por venda.'
  if (l.includes('tma') || l.includes('tempo médio'))        return 'Tempo Médio de Atendimento por chamada.'
  if (l.includes('tabulação') || l.includes('tabulacao'))    return 'Tempo de pós-atendimento após a chamada.'
  if (l.includes('five9') || l.includes('ligaç') || l.includes('ligac')) return 'Total de ligações realizadas/recebidas.'
  if (l.includes('abs') || l.includes('ausência'))           return 'Absenteísmo no período.'
  if (l.includes('indisp'))                                   return 'Tempo em indisponibilidade.'
  if (l.includes('pausa') || l.includes('nr17'))             return 'Tempo em pausa (NR-17).'
  if (l.includes('csat') || l.includes('satisf'))            return 'Nota de satisfação do cliente.'
  if (l.includes('retenção') || l.includes('retencao'))      return 'Taxa de retenção de clientes.'
  if (l.includes('transferência') || l.includes('transferencia')) return 'Chamadas transferidas.'
  if (l.includes('short'))                                   return 'Chamadas com duração muito curta.'
  if (l.includes('login') || l.includes('logado'))           return 'Tempo logado no sistema.'
  return ''
}

function InfoTooltip({ texto }: { texto: string }) {
  if (!texto) return null
  return (
    <div className="relative group/tip inline-flex shrink-0">
      <span
        className="w-3 h-3 rounded-full text-[7px] font-bold flex items-center justify-center cursor-help select-none transition-all"
        style={{ background: 'rgba(201,168,76,0.12)', color: 'var(--text-muted)' }}
      >
        i
      </span>
      <div
        className="absolute bottom-full left-1/2 -translate-x-1/2 mb-2 w-40 rounded-xl px-3 py-2 text-[10px] leading-relaxed opacity-0 group-hover/tip:opacity-100 pointer-events-none z-50 text-center"
        style={{
          background: 'rgba(10,14,24,0.96)',
          backdropFilter: 'blur(12px)',
          border: '1px solid rgba(201,168,76,0.25)',
          color: 'var(--text-secondary)',
          boxShadow: '0 12px 40px rgba(0,0,0,0.6)',
          transition: 'opacity 150ms ease',
        }}
      >
        {texto}
        <span className="absolute top-full left-1/2 -translate-x-1/2 border-4 border-transparent" style={{ borderTopColor: 'rgba(10,14,24,0.96)' }} />
      </div>
    </div>
  )
}

// ── Texto da meta ─────────────────────────────────────────────────────────────

function metaTexto(kpi: KPIItem): string | null {
  const tipo = kpi.meta?.tipo ?? (kpi.opConfig?.verde_op === '<=' ? 'menor_melhor' : 'maior_melhor')
  const sinal = tipo === 'maior_melhor' ? '≥' : '≤'
  const uni = kpi.meta?.unidade ?? ''

  if (kpi.metaIndividual != null && kpi.metaIndividual > 0) {
    return `meta ${sinal} ${formatarExibicao(String(kpi.metaIndividual), uni)}`
  }
  if (kpi.opConfig?.modo === 'limiar_global' && kpi.opConfig.verde_valor != null && kpi.opConfig.verde_valor > 0) {
    return `meta ${sinal} ${formatarExibicao(String(kpi.opConfig.verde_valor), uni)}`
  }
  if (!kpi.meta) return null
  return `meta ${sinal} ${formatarExibicao(String(kpi.meta.verde_inicio), kpi.meta.unidade)}`
}

// ── Barra de progresso ────────────────────────────────────────────────────────

const FILL_COR: Record<Status, string> = {
  verde:    'var(--verde)',
  amarelo:  'var(--amarelo)',
  vermelho: 'var(--vermelho)',
  neutro:   'rgba(255,255,255,0.15)',
}

function KPIProgressBar({ kpi }: { kpi: KPIItem }) {
  if (!kpi.meta) return null
  const pct  = Math.min(kpi.progresso, 100)
  const fill = FILL_COR[kpi.status]
  return (
    <div style={{ marginTop: 8 }}>
      {/* Track */}
      <div style={{
        height: 4, borderRadius: 2,
        background: 'rgba(255,255,255,0.06)',
        overflow: 'hidden', position: 'relative',
      }}>
        {/* Fill com animação via CSS custom property */}
        <div
          className="kpi-bar-fill"
          style={{
            height: '100%',
            borderRadius: 2,
            background: fill,
            boxShadow: kpi.status !== 'neutro' ? `0 0 6px ${fill}` : 'none',
            ['--fill-pct' as string]: `${pct}%`,
          } as React.CSSProperties}
        />
      </div>
      {/* Label */}
      <p style={{ fontSize: 9, marginTop: 3, color: 'var(--text-muted)', fontVariantNumeric: 'tabular-nums' }}>
        {pct}% da meta
      </p>
    </div>
  )
}

// ── Componente ────────────────────────────────────────────────────────────────

interface KPIBasicoProps {
  kpis: KPIItem[]
  nomeOperador: string
}

export default function KPIBasico({ kpis, nomeOperador }: KPIBasicoProps) {
  const basicos = kpis
    .filter((k) => k.basico)
    .sort((a, b) => (a.meta?.ordem ?? 99) - (b.meta?.ordem ?? 99))

  return (
    <div className="space-y-4">
      <style>{`
        @keyframes kpiFill {
          from { width: 0; }
          to   { width: var(--fill-pct); }
        }
        .kpi-bar-fill {
          animation: kpiFill 0.6s ease-out forwards;
        }
      `}</style>
      {/* Header */}
      <div>
        <h2 className="text-lg font-bold" style={{ color: 'var(--text-primary)', letterSpacing: '-0.02em' }}>
          Seus KPIs
        </h2>
        <p className="text-xs mt-0.5" style={{ color: 'var(--text-muted)' }}>{nomeOperador}</p>
      </div>

      {basicos.length === 0 ? (
        <div
          className="rounded-2xl border p-8 text-center"
          style={{
            background: 'rgba(255,255,255,0.02)',
            backdropFilter: 'blur(20px)',
            borderColor: 'rgba(255,255,255,0.06)',
          }}
        >
          <p className="text-sm" style={{ color: 'var(--text-secondary)' }}>Nenhum KPI básico configurado.</p>
          <p className="text-xs mt-1" style={{ color: 'var(--text-muted)' }}>
            O gestor precisa marcar as metas como &quot;básico&quot; na configuração.
          </p>
        </div>
      ) : (
        <div
          className="rounded-2xl border overflow-hidden"
          style={{
            background: 'rgba(255,255,255,0.02)',
            backdropFilter: 'blur(20px)',
            borderColor: 'rgba(255,255,255,0.06)',
            boxShadow: '0 8px 32px rgba(0,0,0,0.3)',
          }}
        >
          {/* Wrapper com scroll horizontal em telas pequenas */}
          <div className="overflow-x-auto">
            {/* Linha de labels */}
            <div
              className="grid"
              style={{
                gridTemplateColumns: `repeat(${basicos.length}, minmax(110px, 1fr))`,
                borderBottom: '1px solid rgba(255,255,255,0.05)',
                background: 'linear-gradient(180deg, rgba(17,24,39,0.95) 0%, rgba(17,24,39,0.65) 100%)',
                minWidth: `${basicos.length * 110}px`,
              }}
            >
              {basicos.map((kpi, i) => (
                <div
                  key={kpi.nome_coluna}
                  className="px-4 py-3"
                  style={{
                    borderTop: `3px solid ${BORDA_TOP[kpi.status]}`,
                    borderRight: i < basicos.length - 1 ? '1px solid rgba(255,255,255,0.04)' : 'none',
                  }}
                >
                  <div className="flex items-center gap-1.5">
                    <span
                      className={clsx('w-1.5 h-1.5 rounded-full shrink-0 animate-dotPulse', DOT_COR[kpi.status])}
                      style={{ boxShadow: GLOW[kpi.status] }}
                    />
                    <span
                      className="text-[10px] font-bold truncate uppercase"
                      style={{ color: 'var(--text-muted)', letterSpacing: '0.08em' }}
                    >
                      {kpi.label}
                    </span>
                    <InfoTooltip texto={descreverKPI(kpi.label)} />
                  </div>
                </div>
              ))}
            </div>

            {/* Linha de valores */}
            <div
              className="grid"
              style={{
                gridTemplateColumns: `repeat(${basicos.length}, minmax(110px, 1fr))`,
                minWidth: `${basicos.length * 110}px`,
              }}
            >
              {basicos.map((kpi, i) => {
                const valorFmt = formatarExibicao(kpi.valor, kpi.unidade)
                const sufixo   = sufixoUnidade(kpi.unidade)
                return (
                  <div
                    key={kpi.nome_coluna}
                    className="px-4 py-4"
                    style={{
                      borderRight: i < basicos.length - 1 ? '1px solid rgba(255,255,255,0.04)' : 'none',
                    }}
                  >
                    <p
                      className="text-2xl font-bold leading-none tracking-tight tabular-nums"
                      style={{
                        color: VALOR_COR[kpi.status],
                        textShadow: GLOW[kpi.status],
                        fontVariantNumeric: 'tabular-nums',
                      }}
                    >
                      {valorFmt}
                      {valorFmt !== '—' && sufixo && (
                        <span className="text-xs font-normal ml-0.5" style={{ color: 'var(--text-muted)' }}>{sufixo}</span>
                      )}
                    </p>
                    <p className="text-[10px] mt-1.5" style={{ color: 'var(--text-muted)' }}>
                      {metaTexto(kpi) ?? '—'}
                    </p>
                    <KPIProgressBar kpi={kpi} />
                  </div>
                )
              })}
            </div>
          </div>
        </div>
      )}
    </div>
  )
}
