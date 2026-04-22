'use client'

import {
  BarChart3, Clock, XCircle, Activity, CalendarX,
  MinusCircle, type LucideIcon,
} from 'lucide-react'
import { useCountUp } from '@/hooks/useCountUp'

// ── Props ─────────────────────────────────────────────────────────────────────

export interface QuartilTopicoData {
  id:               string
  nomeTopico:       string
  quartil:          1 | 2 | 3 | 4 | null
  metricaFormatada: string | null
  rankGlobal:       number | null
  totalOperadores:  number
}

export interface MeuQuartilProps {
  mesLabel:        string
  dataAtualizacao: string | null
  topicos:         QuartilTopicoData[]
}

// ── Paleta por quartil ────────────────────────────────────────────────────────

const QUARTIL_PALETA = {
  1: { label: 'EXCELENTE',    cor: '#4ade80', fundo: 'linear-gradient(to right, #15181f 0%, #0f1219 100%)', borda: 'rgba(74,222,128,0.25)'  },
  2: { label: 'SATISFATÓRIO', cor: '#facc15', fundo: 'linear-gradient(to right, #15181f 0%, #0f1219 100%)', borda: 'rgba(250,204,21,0.25)'  },
  3: { label: 'ABAIXO',       cor: '#fb923c', fundo: 'linear-gradient(to right, #15181f 0%, #0f1219 100%)', borda: 'rgba(251,146,60,0.25)'  },
  4: { label: 'CRÍTICO',      cor: '#f87171', fundo: 'linear-gradient(to right, #15181f 0%, #0f1219 100%)', borda: 'rgba(248,113,113,0.25)' },
} as const

// ── Config visual por tópico ──────────────────────────────────────────────────

interface TopicoVisual {
  Icon:        LucideIcon
  nomeCard:    string
  labelRodape: (v: string) => string
}

const TOPICO_VISUAL: Record<string, TopicoVisual> = {
  txretencao: { Icon: BarChart3, nomeCard: 'TAXA DE RETENÇÃO',   labelRodape: v => `Sua taxa: ${v}` },
  tma:        { Icon: Clock,     nomeCard: 'TMA',                labelRodape: v => `Seu TMA: ${v}` },
  churn:      { Icon: XCircle,   nomeCard: 'CANCELADOS',         labelRodape: v => `Seus cancelados: ${v}` },
  indisp:     { Icon: Activity,  nomeCard: 'INDISPONIBILIDADE',  labelRodape: v => `Sua indisponibilidade: ${v}` },
  abs:        { Icon: CalendarX, nomeCard: 'ABS',                labelRodape: v => `Seu ABS: ${v}` },
}

// ── Subcomponentes ────────────────────────────────────────────────────────────

function SectionLabel({ children }: { children: React.ReactNode }) {
  return (
    <div style={{ display: 'flex', alignItems: 'center', gap: '10px', paddingBottom: '2px' }}>
      <span style={{
        fontSize: '9px', fontWeight: 700, letterSpacing: '0.14em',
        textTransform: 'uppercase', color: 'rgba(244,212,124,0.7)',
      }}>
        {children}
      </span>
      <div style={{ flex: 1, height: '1px', background: 'linear-gradient(90deg, rgba(201,168,76,0.18) 0%, transparent 100%)' }} />
    </div>
  )
}

function CardIndisponivel({ id }: { id: string }) {
  const visual = TOPICO_VISUAL[id]
  const Icon   = visual?.Icon ?? BarChart3
  const nome   = visual?.nomeCard ?? id.toUpperCase()

  return (
    <div style={{
      background: 'linear-gradient(to right, #15181f 0%, #0f1219 100%)',
      border: '1px solid rgba(201, 168, 76, 0.10)',
      borderRadius: '12px',
      padding: '40px 24px',
      display: 'flex', flexDirection: 'column', alignItems: 'center',
      gap: '12px', textAlign: 'center',
    }}>
      <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
        <Icon size={18} style={{ color: 'rgba(244,212,124,0.8)', flexShrink: 0 }} />
        <span style={{
          fontSize: '11px', fontWeight: 600, letterSpacing: '0.1em',
          textTransform: 'uppercase', color: 'rgba(244,212,124,0.7)',
        }}>
          {nome}
        </span>
      </div>
      <MinusCircle size={44} style={{ color: 'rgba(255,255,255,0.20)', marginTop: '8px' }} />
      <p style={{
        fontSize: '14px', fontWeight: 600, letterSpacing: '0.08em',
        textTransform: 'uppercase', color: 'rgba(255,255,255,0.50)', margin: 0,
      }}>
        DADOS INDISPONÍVEIS
      </p>
      <p style={{ fontSize: '13px', color: 'rgba(255,255,255,0.40)', margin: 0, maxWidth: '280px' }}>
        Seu email ainda não tem dados para este tópico no mês.
      </p>
    </div>
  )
}

function QuartilCard({ topico }: { topico: QuartilTopicoData }) {
  const visual  = TOPICO_VISUAL[topico.id]
  const Icon    = visual?.Icon    ?? BarChart3
  const nome    = visual?.nomeCard ?? topico.nomeTopico.toUpperCase()
  const paleta  = QUARTIL_PALETA[topico.quartil!]
  const rankAnim  = useCountUp(topico.rankGlobal      ?? 0, 800)
  const totalAnim = useCountUp(topico.totalOperadores ?? 0, 800)

  return (
    <div style={{
      background:    paleta.fundo,
      border:        `1px solid ${paleta.borda}`,
      borderRadius:  '12px',
      padding:       '32px 28px 24px',
      display:       'flex',
      flexDirection: 'column',
    }}>
      {/* Header */}
      <div style={{ display: 'flex', alignItems: 'center', gap: '8px', marginBottom: '28px' }}>
        <Icon size={18} style={{ color: 'rgba(244,212,124,0.8)', flexShrink: 0 }} />
        <span style={{
          fontSize: '13px', fontWeight: 600, letterSpacing: '0.1em',
          textTransform: 'uppercase', color: 'rgba(244,212,124,0.8)',
        }}>
          {nome}
        </span>
      </div>

      {/* Bloco central */}
      <div style={{ display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between' }}>

        {/* Q number + label */}
        <div style={{ display: 'flex', flexDirection: 'column', gap: '6px' }}>
          <span style={{
            fontSize: '68px', fontWeight: 800, lineHeight: 1,
            color: paleta.cor, fontVariantNumeric: 'tabular-nums',
          }}>
            Q{topico.quartil}
          </span>
          <div style={{ width: '28px', height: '2px', background: paleta.cor, opacity: 0.6, borderRadius: '2px' }} />
          <span style={{
            fontSize: '11px', fontWeight: 700, letterSpacing: '0.12em',
            textTransform: 'uppercase', color: paleta.cor, opacity: 0.85, marginTop: '4px',
          }}>
            {paleta.label}
          </span>
        </div>

        {/* Rank global */}
        {topico.rankGlobal !== null && (
          <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'flex-end', gap: '4px', paddingTop: '4px' }}>
            <span style={{
              fontSize: '34px', fontWeight: 700, lineHeight: 1,
              color: 'rgba(255,255,255,0.95)', fontVariantNumeric: 'tabular-nums',
            }}>
              {Math.round(rankAnim)}º de {Math.round(totalAnim)}
            </span>
            <span style={{ fontSize: '11px', color: 'rgba(255,255,255,0.50)' }}>operadores</span>
          </div>
        )}
      </div>

      {/* Rodapé: métrica */}
      {topico.metricaFormatada && (
        <p style={{ fontSize: '13px', color: 'rgba(255,255,255,0.55)', margin: '24px 0 0' }}>
          {visual?.labelRodape(topico.metricaFormatada) ?? topico.metricaFormatada}
        </p>
      )}
    </div>
  )
}

// ── Componente principal ──────────────────────────────────────────────────────

export default function MeuQuartilClient({
  mesLabel,
  dataAtualizacao,
  topicos,
}: MeuQuartilProps) {
  return (
    <>
      <style>{`
        @keyframes qFadeUp {
          from { opacity: 0; transform: translateY(10px); }
          to   { opacity: 1; transform: translateY(0);    }
        }
        .q-section { animation: qFadeUp 0.4s ease both; }
        .q-card    { animation: qFadeUp 0.4s ease both; }
        .q-section:nth-child(1) { animation-delay:  0ms; }
        .q-section:nth-child(2) { animation-delay: 60ms; }
        .q-section:nth-child(3) { animation-delay: 120ms; }
        @media (prefers-reduced-motion: reduce) {
          .q-section, .q-card { animation: none; }
        }
      `}</style>

      {/* Header da página */}
      <div className="q-section" style={{
        background: 'var(--void2)',
        border: '1px solid rgba(201,168,76,0.1)',
        borderRadius: '12px',
        padding: '14px 20px',
        display: 'flex', alignItems: 'center', gap: '16px', flexWrap: 'wrap',
      }}>
        <span style={{
          fontFamily: 'var(--ff-display)',
          fontSize: '16px', fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.06em',
          background: 'linear-gradient(135deg, #e8c96d 0%, #c9a84c 100%)',
          WebkitBackgroundClip: 'text', WebkitTextFillColor: 'transparent', backgroundClip: 'text',
        }}>
          Meu Quartil
        </span>
        <div style={{ width: '1px', height: '16px', background: 'rgba(201,168,76,0.2)' }} />
        <span style={{ fontSize: '11px', color: 'var(--text-muted)' }}>{mesLabel}</span>
        {dataAtualizacao && (
          <>
            <div style={{ width: '1px', height: '16px', background: 'rgba(201,168,76,0.2)' }} />
            <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
              <div className="animate-pulse" style={{ width: '6px', height: '6px', borderRadius: '50%', background: '#10b981' }} />
              <span style={{ fontSize: '11px', color: 'var(--text-muted)' }}>
                Sincronizado <strong style={{ color: 'var(--text-secondary)', fontWeight: 600 }}>{dataAtualizacao}</strong>
              </span>
            </div>
          </>
        )}
      </div>

      {/* Como funciona */}
      <div className="q-section space-y-3">
        <SectionLabel>Como Funciona</SectionLabel>
        <div style={{
          background: 'rgba(255,255,255,0.03)',
          border: '1px solid rgba(255,255,255,0.07)',
          borderRadius: '12px',
          padding: '16px 20px',
        }}>
          <p style={{ fontSize: '13px', lineHeight: '1.65', color: 'rgba(255,255,255,0.70)', margin: 0 }}>
            O Quartil divide os operadores em 4 grupos baseado em performance.
            <br />
            Q1 é o melhor (top 25%), Q4 o grupo com resultado fora do esperado.
          </p>
        </div>
      </div>

      {/* Cards por tópico */}
      <div className="q-section space-y-3">
        <SectionLabel>Resultado por Tópico</SectionLabel>
        <div className="space-y-3">
          {topicos.map((t, i) => (
            <div
              key={t.id}
              className="q-card"
              style={{ animationDelay: `${i * 60}ms` }}
            >
              {t.quartil !== null && t.metricaFormatada !== null
                ? <QuartilCard topico={t} />
                : <CardIndisponivel id={t.id} />
              }
            </div>
          ))}
        </div>
      </div>
    </>
  )
}
