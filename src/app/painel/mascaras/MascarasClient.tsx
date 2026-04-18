'use client'

import { useState } from 'react'
import { Search, Copy, Check, FileText } from 'lucide-react'
import type { Mascara } from '@/lib/mascaras'

// ── Paletas ───────────────────────────────────────────────────────────────────

interface Palette {
  headerBg:    string
  border:      string
  titulo:      string
  iconStroke:  string
  iconBg:      string
  whenBorder:  string
  label:       string
  mascBorder:  string
  btnBg:       string
  btnBorder:   string
  btnText:     string
}

const PALETTES: Palette[] = [
  {
    headerBg:   'rgba(201,168,76,0.06)',
    border:     'rgba(201,168,76,0.1)',
    titulo:     '#e8c96d',
    iconStroke: '#c9a84c',
    iconBg:     'rgba(201,168,76,0.12)',
    whenBorder: 'rgba(201,168,76,0.2)',
    label:      '#c9a84c',
    mascBorder: 'rgba(201,168,76,0.15)',
    btnBg:      'rgba(201,168,76,0.12)',
    btnBorder:  'rgba(201,168,76,0.25)',
    btnText:    '#e8c96d',
  },
  {
    headerBg:   'rgba(59,130,246,0.06)',
    border:     'rgba(59,130,246,0.1)',
    titulo:     '#93c5fd',
    iconStroke: '#3b82f6',
    iconBg:     'rgba(59,130,246,0.1)',
    whenBorder: 'rgba(59,130,246,0.2)',
    label:      '#60a5fa',
    mascBorder: 'rgba(59,130,246,0.15)',
    btnBg:      'rgba(59,130,246,0.1)',
    btnBorder:  'rgba(59,130,246,0.25)',
    btnText:    '#93c5fd',
  },
  {
    headerBg:   'rgba(148,163,184,0.06)',
    border:     'rgba(148,163,184,0.1)',
    titulo:     '#cbd5e1',
    iconStroke: '#94a3b8',
    iconBg:     'rgba(148,163,184,0.1)',
    whenBorder: 'rgba(148,163,184,0.2)',
    label:      '#94a3b8',
    mascBorder: 'rgba(148,163,184,0.15)',
    btnBg:      'rgba(148,163,184,0.1)',
    btnBorder:  'rgba(148,163,184,0.2)',
    btnText:    '#cbd5e1',
  },
  {
    headerBg:   'rgba(167,139,250,0.06)',
    border:     'rgba(167,139,250,0.1)',
    titulo:     '#c4b5fd',
    iconStroke: '#a78bfa',
    iconBg:     'rgba(167,139,250,0.1)',
    whenBorder: 'rgba(167,139,250,0.2)',
    label:      '#a78bfa',
    mascBorder: 'rgba(167,139,250,0.15)',
    btnBg:      'rgba(167,139,250,0.1)',
    btnBorder:  'rgba(167,139,250,0.25)',
    btnText:    '#c4b5fd',
  },
]

// ── SLA badge — sempre na cor do SLA, não da paleta ──────────────────────────

function SlaBadge({ sla }: { sla: string }) {
  const is24 = sla.includes('24')
  return (
    <span style={{
      fontSize: '10px', fontWeight: 700, padding: '3px 10px', borderRadius: '99px',
      background: is24 ? 'rgba(245,158,11,0.12)' : 'rgba(59,130,246,0.12)',
      border: `1px solid ${is24 ? 'rgba(245,158,11,0.28)' : 'rgba(59,130,246,0.28)'}`,
      color: is24 ? '#fbbf24' : '#60a5fa',
      letterSpacing: '0.06em', whiteSpace: 'nowrap' as const,
    }}>
      ⏱ {sla.toUpperCase()}
    </span>
  )
}

// ── CopyButton ────────────────────────────────────────────────────────────────

function CopyButton({ text, p }: { text: string; p: Palette }) {
  const [copied, setCopied] = useState(false)

  async function handleCopy() {
    try {
      await navigator.clipboard.writeText(text)
      setCopied(true)
      setTimeout(() => setCopied(false), 2000)
    } catch { /* fallback silencioso */ }
  }

  return (
    <button
      onClick={handleCopy}
      style={{
        display: 'flex', alignItems: 'center', gap: '6px',
        padding: '7px 16px', borderRadius: '8px', fontSize: '12px', fontWeight: 600,
        background: copied ? 'rgba(74,222,128,0.10)' : p.btnBg,
        border: `1px solid ${copied ? 'rgba(74,222,128,0.28)' : p.btnBorder}`,
        color: copied ? '#4ade80' : p.btnText,
        cursor: 'pointer', transition: 'all 0.2s', whiteSpace: 'nowrap' as const,
      }}
    >
      {copied ? <><Check size={13} /> Copiado!</> : <><Copy size={13} /> Copiar máscara</>}
    </button>
  )
}

// ── MascaraCard ───────────────────────────────────────────────────────────────

function MascaraCard({ mascara, index, delay }: { mascara: Mascara; index: number; delay: number }) {
  const p = PALETTES[index % 4]

  return (
    <div style={{
      background: '#0c1018',
      border: `1px solid ${p.border}`,
      borderRadius: '16px',
      overflow: 'hidden',
      marginBottom: '20px',
      animation: `mascaraFadeUp 0.45s cubic-bezier(0.22,1,0.36,1) ${delay}ms both`,
    }}>
      {/* ── HEADER ── */}
      <div style={{
        background: p.headerBg,
        borderBottom: `1px solid ${p.border}`,
        padding: '16px 24px',
        display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: '12px',
      }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: '12px', minWidth: 0 }}>
          {/* Ícone */}
          <div style={{
            width: 36, height: 36, borderRadius: '8px', flexShrink: 0,
            background: p.iconBg,
            border: `1px solid ${p.border}`,
            display: 'flex', alignItems: 'center', justifyContent: 'center',
          }}>
            <FileText size={16} style={{ color: p.iconStroke }} />
          </div>

          <div style={{ minWidth: 0 }}>
            <p style={{
              fontFamily: 'var(--ff-display)', fontSize: '13px', fontWeight: 700,
              textTransform: 'uppercase', letterSpacing: '0.06em',
              color: p.titulo, lineHeight: 1.2, margin: 0,
            }}>
              {mascara.fila}
            </p>
            <p style={{ fontSize: '11px', color: 'var(--text-muted)', margin: '3px 0 0', lineHeight: 1 }}>
              Financeiro · {mascara.segmento}
            </p>
          </div>
        </div>

        <SlaBadge sla={mascara.sla} />
      </div>

      {/* ── BODY ── */}
      <div style={{ padding: '20px 24px' }}>
        {/* Quando usar */}
        <div style={{ marginBottom: '20px' }}>
          <p style={{
            fontSize: '9px', fontWeight: 700, textTransform: 'uppercase',
            letterSpacing: '0.12em', color: p.label, margin: '0 0 8px',
          }}>
            Quando usar
          </p>
          <p style={{
            fontSize: '13px', color: 'var(--text-secondary)', fontStyle: 'italic',
            lineHeight: 1.7, margin: 0,
            paddingLeft: '12px',
            borderLeft: `2px solid ${p.whenBorder}`,
          }}>
            {mascara.utilizacao}
          </p>
        </div>

        {/* Máscara */}
        <div>
          <p style={{
            fontSize: '9px', fontWeight: 700, textTransform: 'uppercase',
            letterSpacing: '0.12em', color: p.label, margin: '0 0 8px',
          }}>
            Máscara — copie e cole no AIR
          </p>

          <div style={{
            background: '#050508',
            border: `1px solid ${p.mascBorder}`,
            borderRadius: '10px',
            overflow: 'hidden',
            marginBottom: '12px',
          }}>
            {/* Linha decorativa no topo */}
            <div style={{
              height: '2px',
              background: `linear-gradient(90deg, transparent, ${p.iconStroke}, transparent)`,
              opacity: 0.6,
            }} />
            <div style={{
              padding: '18px 20px',
              fontFamily: 'var(--ff-body)',
              fontSize: '14px',
              color: '#e2e8f0',
              whiteSpace: 'pre-wrap',
              lineHeight: 2,
            }}>
              {mascara.mascara}
            </div>
          </div>

          <div style={{ display: 'flex', justifyContent: 'flex-end' }}>
            <CopyButton text={mascara.mascara} p={p} />
          </div>
        </div>
      </div>
    </div>
  )
}

// ── Componente principal ──────────────────────────────────────────────────────

interface MascarasClientProps {
  mascaras: Mascara[]
}

export default function MascarasClient({ mascaras }: MascarasClientProps) {
  const [busca, setBusca]       = useState('')
  const [segmento, setSegmento] = useState('TODOS')

  const segmentos = ['TODOS', ...Array.from(new Set(mascaras.map(m => m.segmento.toUpperCase())))]

  const filtradas = mascaras.filter(m => {
    const matchSeg   = segmento === 'TODOS' || m.segmento.toUpperCase() === segmento
    const matchBusca = busca.trim() === '' ||
      m.fila.toLowerCase().includes(busca.toLowerCase()) ||
      m.utilizacao.toLowerCase().includes(busca.toLowerCase())
    return matchSeg && matchBusca
  })

  return (
    <>
      <style dangerouslySetInnerHTML={{ __html: `
        @keyframes mascaraFadeUp {
          from { opacity: 0; transform: translateY(12px); }
          to   { opacity: 1; transform: translateY(0); }
        }
      `}} />

      {/* Busca + filtros */}
      <div style={{ display: 'flex', flexDirection: 'column', gap: '10px', marginBottom: '24px' }}>
        <div style={{ position: 'relative' }}>
          <Search size={14} style={{
            position: 'absolute', left: '12px', top: '50%', transform: 'translateY(-50%)',
            color: 'var(--text-muted)', pointerEvents: 'none',
          }} />
          <input
            value={busca}
            onChange={e => setBusca(e.target.value)}
            placeholder="Buscar por fila..."
            style={{
              width: '100%', padding: '9px 12px 9px 36px', borderRadius: '10px',
              background: 'rgba(255,255,255,0.04)', border: '1px solid rgba(201,168,76,0.10)',
              color: 'var(--text-primary)', fontSize: '13px', outline: 'none',
            }}
          />
        </div>

        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', flexWrap: 'wrap', gap: '8px' }}>
          <div style={{ display: 'flex', gap: '6px', flexWrap: 'wrap' }}>
            {segmentos.map(seg => (
              <button key={seg} onClick={() => setSegmento(seg)} style={{
                padding: '4px 12px', borderRadius: '99px', fontSize: '11px', fontWeight: 600,
                cursor: 'pointer', transition: 'all 0.15s',
                background: segmento === seg ? 'rgba(201,168,76,0.15)' : 'rgba(255,255,255,0.04)',
                border: `1px solid ${segmento === seg ? 'rgba(201,168,76,0.35)' : 'rgba(255,255,255,0.08)'}`,
                color: segmento === seg ? 'var(--gold)' : 'var(--text-muted)',
              }}>
                {seg}
              </button>
            ))}
          </div>
          <span style={{ fontSize: '12px', color: 'var(--text-muted)' }}>
            {filtradas.length} máscara{filtradas.length !== 1 ? 's' : ''}
            {busca ? ` para "${busca}"` : ''}
          </span>
        </div>
      </div>

      {/* Cards */}
      {filtradas.length === 0 ? (
        <div style={{ textAlign: 'center', padding: '48px 0', color: 'var(--text-muted)', fontSize: '14px' }}>
          Nenhuma máscara encontrada.
        </div>
      ) : (
        <div>
          {filtradas.map((m, i) => (
            <MascaraCard key={m.id} mascara={m} index={i} delay={i * 35} />
          ))}
        </div>
      )}
    </>
  )
}
