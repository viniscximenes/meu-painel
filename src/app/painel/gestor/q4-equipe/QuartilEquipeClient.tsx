'use client'

import { useState, useMemo } from 'react'
import { getIniciaisNome } from '@/lib/operadores'

// ── Types ─────────────────────────────────────────────────────────────────────

export interface Q4MetricData {
  topicoId:         string
  nomeTopico:       string
  rankGlobal:       number
  totalOperadores:  number
  metricaFormatada: string
}

export interface OperadorQuartilData {
  id:       number
  nome:     string
  username: string
  q4:       Q4MetricData[]
}

interface Props {
  operadores:      OperadorQuartilData[]
  dataAtualizacao: string | null
  mesLabel:        string
}

// ── Constantes visuais ────────────────────────────────────────────────────────

const NOMES_METRICA: Record<string, string> = {
  txretencao: 'TAXA DE RETENÇÃO',
  tma:        'TMA',
  churn:      'CANCELADOS',
  indisp:     'INDISPONIBILIDADE',
  abs:        'ABS',
}
const TOPICO_ORDER  = ['txretencao', 'tma', 'churn', 'indisp', 'abs']
const TOPICO_LABELS: Record<string, string> = {
  txretencao: 'TX RETENÇÃO', tma: 'TMA', churn: 'CANCELADOS', indisp: 'INDISP', abs: 'ABS',
}

function avatarStyle(id: number): React.CSSProperties {
  return id % 2 !== 0
    ? { background: 'linear-gradient(135deg, #0f1729, #1a2540)', border: '1px solid rgba(66,139,255,0.25)', color: '#fff' }
    : { background: 'linear-gradient(135deg, #0a1020, #111830)', border: '1px solid rgba(66,139,255,0.15)', color: '#fff' }
}

// ── Linha de métrica compacta ─────────────────────────────────────────────────

function MetricaLinha({ t }: { t: Q4MetricData }) {
  return (
    <div style={{
      display: 'grid',
      gridTemplateColumns: '56px 1fr auto auto',
      alignItems: 'center',
      gap: '0 16px',
      padding: '7px 0',
    }}>
      {/* Q4 — destaque vermelho */}
      <span style={{
        fontSize: '36px', fontWeight: 800, lineHeight: 1,
        color: '#f87171', fontVariantNumeric: 'tabular-nums',
      }}>
        Q4
      </span>

      {/* Nome da métrica */}
      <span style={{
        fontSize: '11px', fontWeight: 600, letterSpacing: '0.09em',
        textTransform: 'uppercase', color: 'rgba(244,212,124,0.75)',
      }}>
        {NOMES_METRICA[t.topicoId] ?? t.nomeTopico.toUpperCase()}
      </span>

      {/* Valor real */}
      <span style={{
        fontSize: '15px', fontWeight: 600,
        color: 'rgba(255,255,255,0.85)',
        textAlign: 'right',
      }}>
        {t.metricaFormatada}
      </span>

      {/* Rank */}
      <span style={{
        fontSize: '12px', color: 'rgba(255,255,255,0.40)',
        textAlign: 'right', whiteSpace: 'nowrap', minWidth: '110px',
      }}>
        {t.rankGlobal}º de {t.totalOperadores}
      </span>
    </div>
  )
}

// ── Card de operador ──────────────────────────────────────────────────────────

function OperadorCard({ op }: { op: OperadorQuartilData }) {
  // linhas: rank pior primeiro (maior rankGlobal/total)
  const linhas = useMemo(() =>
    [...op.q4].sort((a, b) =>
      b.rankGlobal / (b.totalOperadores || 1) - a.rankGlobal / (a.totalOperadores || 1)
    )
  , [op.q4])

  return (
    <div style={{
      background: 'linear-gradient(to right, #15181f 0%, #0f1219 100%)',
      border: '1px solid rgba(248,113,113,0.2)',
      borderRadius: '14px',
      padding: '16px 20px',
    }}>
      {/* Header: avatar + nome */}
      <div style={{ display: 'flex', alignItems: 'center', gap: '10px', marginBottom: '10px' }}>
        <div style={{
          width: '30px', height: '30px', borderRadius: '50%', flexShrink: 0,
          display: 'flex', alignItems: 'center', justifyContent: 'center',
          fontSize: '11px', fontWeight: 700,
          ...avatarStyle(op.id),
        }}>
          {getIniciaisNome(op.nome)}
        </div>
        <span style={{ fontSize: '13px', fontWeight: 600, color: 'rgba(255,255,255,0.90)' }}>
          {op.nome}
        </span>
      </div>

      {/* Divisor */}
      <div style={{ height: '1px', background: 'rgba(255,255,255,0.06)', marginBottom: '4px' }} />

      {/* Linhas de métrica */}
      {linhas.map((t, i) => (
        <div key={t.topicoId}>
          {i > 0 && <div style={{ height: '1px', background: 'rgba(255,255,255,0.04)' }} />}
          <MetricaLinha t={t} />
        </div>
      ))}
    </div>
  )
}

// ── Main component ────────────────────────────────────────────────────────────

export default function QuartilEquipeClient({ operadores, dataAtualizacao, mesLabel }: Props) {
  const [activeFilter, setActiveFilter] = useState<string | null>(null)

  // Operadores filtrados: mostrar todos se sem filtro; senão, só quem tem Q4 na métrica
  const filtered = useMemo(() => {
    if (!activeFilter) return operadores
    return operadores.filter(op => op.q4.some(t => t.topicoId === activeFilter))
  }, [operadores, activeFilter])

  // Chips: só métricas com algum Q4 nos dados reais
  const topicosPresentes = useMemo(() => {
    const ids = new Set(operadores.flatMap(op => op.q4.map(t => t.topicoId)))
    return TOPICO_ORDER.filter(id => ids.has(id))
  }, [operadores])

  const emQ4Count = operadores.length

  return (
    <div className="login-grid-bg" style={{
      borderRadius: '16px', padding: '4px',
      display: 'flex', flexDirection: 'column', gap: '14px',
    }}>

      {/* ── Header ── */}
      <div style={{
        background: 'var(--void2)',
        border: '1px solid rgba(201,168,76,0.1)',
        borderRadius: '14px',
        padding: '14px 20px',
        display: 'flex', alignItems: 'center', justifyContent: 'space-between',
        flexWrap: 'wrap', gap: '12px',
      }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: '14px', flexWrap: 'wrap' }}>
          <span style={{
            fontFamily: 'var(--ff-display)', fontSize: '16px', fontWeight: 700,
            textTransform: 'uppercase', letterSpacing: '0.06em',
            background: 'linear-gradient(135deg, #e8c96d 0%, #c9a84c 100%)',
            WebkitBackgroundClip: 'text', WebkitTextFillColor: 'transparent', backgroundClip: 'text',
          }}>
            Q4 Equipe
          </span>
          <div style={{ width: '1px', height: '16px', background: 'rgba(201,168,76,0.2)', flexShrink: 0 }} />
          <span style={{ fontSize: '11px', color: 'var(--text-muted)', textTransform: 'uppercase', letterSpacing: '0.06em' }}>
            {mesLabel}
          </span>
          {dataAtualizacao && (
            <>
              <div style={{ width: '1px', height: '16px', background: 'rgba(201,168,76,0.2)', flexShrink: 0 }} />
              <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
                <div className="animate-pulse" style={{ width: '6px', height: '6px', borderRadius: '50%', background: '#10b981', flexShrink: 0 }} />
                <span style={{ fontSize: '11px', color: 'var(--text-muted)' }}>Sincronizado {dataAtualizacao}</span>
              </div>
            </>
          )}
        </div>
        <span style={{ fontSize: '12px', color: 'var(--text-muted)' }}>
          {emQ4Count} {emQ4Count === 1 ? 'operador' : 'operadores'} em Q4
        </span>
      </div>

      {/* ── Bloco explicativo ── */}
      <div style={{
        background: 'var(--void2)',
        border: '1px solid rgba(201,168,76,0.06)',
        borderRadius: '12px',
        padding: '10px 16px',
      }}>
        <p style={{ fontSize: '12px', color: '#52525b', margin: 0 }}>
          Só aparecem operadores que estão no pior quartil da empresa (Q4) em pelo menos uma métrica.
        </p>
      </div>

      {/* ── Estado vazio total ── */}
      {operadores.length === 0 && (
        <div style={{
          background: 'var(--void2)',
          border: '1px solid rgba(74,222,128,0.1)',
          borderRadius: '14px',
          padding: '56px 24px',
          textAlign: 'center',
        }}>
          <p style={{ fontSize: '20px', marginBottom: '10px' }}>✨</p>
          <p style={{ fontSize: '15px', fontWeight: 600, color: '#4ade80', marginBottom: '8px' }}>
            Nenhum operador da sua equipe está no pior quartil da empresa
          </p>
          <p style={{ fontSize: '13px', color: '#52525b' }}>
            Parabéns, seu time está acima da média!
          </p>
        </div>
      )}

      {/* ── Filtros (só se há 2+ métricas distintas) ── */}
      {operadores.length > 0 && topicosPresentes.length > 1 && (
        <div style={{
          background: 'var(--void2)',
          border: '1px solid rgba(201,168,76,0.08)',
          borderRadius: '14px',
          padding: '10px 16px',
          display: 'flex', alignItems: 'center', gap: '8px', flexWrap: 'wrap',
        }}>
          <span style={{ fontSize: '10px', color: '#52525b', textTransform: 'uppercase', letterSpacing: '0.07em', marginRight: '4px' }}>
            Filtrar por métrica:
          </span>
          {topicosPresentes.map(id => (
            <button
              key={id}
              onClick={() => setActiveFilter(prev => prev === id ? null : id)}
              style={{
                fontSize: '10px', fontWeight: 700, letterSpacing: '0.05em',
                padding: '4px 12px', borderRadius: '6px', border: '1px solid',
                cursor: 'pointer', transition: 'all 150ms',
                ...(activeFilter === id
                  ? { background: 'rgba(201,168,76,0.12)', borderColor: 'rgba(201,168,76,0.45)', color: '#e8c96d', boxShadow: '0 0 0 2px rgba(201,168,76,0.15)' }
                  : { background: 'transparent', borderColor: 'rgba(255,255,255,0.08)', color: '#71717a' }),
              }}
            >
              {TOPICO_LABELS[id] ?? id.toUpperCase()}
            </button>
          ))}
          {activeFilter && (
            <button
              onClick={() => setActiveFilter(null)}
              style={{
                fontSize: '10px', padding: '4px 12px', borderRadius: '6px',
                border: '1px solid rgba(255,255,255,0.06)', background: 'transparent',
                color: '#52525b', cursor: 'pointer', marginLeft: 'auto',
              }}
            >
              LIMPAR
            </button>
          )}
        </div>
      )}

      {/* ── Estado vazio de filtro ── */}
      {activeFilter && filtered.length === 0 && (
        <div style={{
          background: 'var(--void2)',
          border: '1px solid rgba(74,222,128,0.08)',
          borderRadius: '14px',
          padding: '36px 24px',
          textAlign: 'center',
        }}>
          <p style={{ fontSize: '13px', color: '#52525b' }}>
            Nenhum operador da sua equipe está em Q4 de{' '}
            <strong style={{ color: '#71717a' }}>{TOPICO_LABELS[activeFilter] ?? activeFilter}</strong> ✨
          </p>
        </div>
      )}

      {/* ── Cards de operadores ── */}
      {filtered.length > 0 && (
        <div style={{ display: 'flex', flexDirection: 'column', gap: '10px' }}>
          {filtered.map(op => <OperadorCard key={op.id} op={op} />)}
        </div>
      )}

    </div>
  )
}
