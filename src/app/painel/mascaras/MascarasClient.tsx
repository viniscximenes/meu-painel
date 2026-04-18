'use client'

import { useState } from 'react'
import { Search, Copy, Check } from 'lucide-react'
import type { Mascara } from '@/lib/mascaras'

// ── Helpers ───────────────────────────────────────────────────────────────────

function slaBorderColor(sla: string) {
  return sla.includes('24') ? 'var(--gold)' : '#3b82f6'
}

function slaBadgeBg(sla: string) {
  return sla.includes('24')
    ? { bg: 'rgba(201,168,76,0.10)', border: 'rgba(201,168,76,0.22)', color: 'var(--gold)' }
    : { bg: 'rgba(59,130,246,0.10)', border: 'rgba(59,130,246,0.22)', color: '#60a5fa' }
}

function slaLabel(sla: string) {
  return sla.includes('24') ? '⏱ 24h' : '⏱ 48h'
}

// ── CopyButton ────────────────────────────────────────────────────────────────

function CopyButton({ text }: { text: string }) {
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
        padding: '6px 14px', borderRadius: '7px', fontSize: '12px', fontWeight: 600,
        background: copied ? 'rgba(74,222,128,0.10)' : 'rgba(201,168,76,0.10)',
        border: `1px solid ${copied ? 'rgba(74,222,128,0.28)' : 'rgba(201,168,76,0.25)'}`,
        color: copied ? '#4ade80' : 'var(--gold)',
        cursor: 'pointer', transition: 'all 0.2s', whiteSpace: 'nowrap',
      }}
    >
      {copied ? <><Check size={12} /> Copiado!</> : <><Copy size={12} /> Copiar</>}
    </button>
  )
}

// ── MascaraCard ───────────────────────────────────────────────────────────────

function MascaraCard({ mascara, delay }: { mascara: Mascara; delay: number }) {
  const borderColor = slaBorderColor(mascara.sla)
  const badge       = slaBadgeBg(mascara.sla)

  return (
    <div
      className="mascara-card"
      style={{
        background: '#0d0d1a',
        border: '1px solid rgba(201,168,76,0.08)',
        borderLeft: `4px solid ${borderColor}`,
        borderRadius: '14px',
        padding: '24px 28px',
        marginBottom: '16px',
        animation: `mascaraFadeUp 0.45s cubic-bezier(0.22,1,0.36,1) ${delay}ms both`,
        transition: 'border-left-color 0.2s, transform 0.2s',
      }}
    >
      {/* ZONA 1 — Header */}
      <div style={{ display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between', gap: '12px', marginBottom: '16px' }}>
        <span style={{
          fontFamily: 'var(--ff-display)', fontSize: '15px', fontWeight: 600,
          textTransform: 'uppercase', letterSpacing: '0.04em',
          color: 'var(--text-primary)', lineHeight: 1.2,
        }}>
          {mascara.fila}
        </span>
        <span style={{
          fontSize: '11px', fontWeight: 600, padding: '3px 10px', borderRadius: '99px',
          background: badge.bg, border: `1px solid ${badge.border}`,
          color: badge.color, whiteSpace: 'nowrap', flexShrink: 0,
        }}>
          {slaLabel(mascara.sla)}
        </span>
      </div>

      {/* ZONA 2 — Utilização */}
      <div style={{ paddingBottom: '16px', borderBottom: '1px solid rgba(201,168,76,0.07)' }}>
        <p style={{
          fontSize: '9px', fontWeight: 700, textTransform: 'uppercase',
          letterSpacing: '0.14em', color: 'var(--gold)', opacity: 0.7, marginBottom: '6px',
        }}>
          Quando usar:
        </p>
        <p style={{ fontSize: '13px', color: 'var(--text-secondary)', fontStyle: 'italic', lineHeight: 1.6, margin: 0 }}>
          {mascara.utilizacao}
        </p>
      </div>

      {/* ZONA 3 — Máscara */}
      <div style={{ paddingTop: '16px' }}>
        <p style={{
          fontSize: '9px', fontWeight: 700, textTransform: 'uppercase',
          letterSpacing: '0.14em', color: 'var(--gold)', opacity: 0.7, marginBottom: '8px',
        }}>
          Máscara:
        </p>
        <div style={{
          background: '#050508',
          border: '1px solid rgba(201,168,76,0.10)',
          borderRadius: '8px',
          padding: '14px 16px',
          fontFamily: 'monospace',
          fontSize: '12px',
          color: '#94a3b8',
          whiteSpace: 'pre-wrap',
          lineHeight: 1.7,
          maxHeight: '200px',
          overflowY: 'auto',
          marginBottom: '10px',
        }}>
          {mascara.mascara}
        </div>
        <div style={{ display: 'flex', justifyContent: 'flex-end' }}>
          <CopyButton text={mascara.mascara} />
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
        .mascara-card:hover {
          transform: translateX(2px);
          border-left-width: 4px;
          border-left-color: var(--gold-light, #e8c96d) !important;
        }
      `}} />

      {/* Busca + filtros */}
      <div style={{ display: 'flex', flexDirection: 'column', gap: '10px', marginBottom: '20px' }}>
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
              <button
                key={seg}
                onClick={() => setSegmento(seg)}
                style={{
                  padding: '4px 12px', borderRadius: '99px', fontSize: '11px', fontWeight: 600,
                  cursor: 'pointer', transition: 'all 0.15s',
                  background: segmento === seg ? 'rgba(201,168,76,0.15)' : 'rgba(255,255,255,0.04)',
                  border: `1px solid ${segmento === seg ? 'rgba(201,168,76,0.35)' : 'rgba(255,255,255,0.08)'}`,
                  color: segmento === seg ? 'var(--gold)' : 'var(--text-muted)',
                }}
              >
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

      {/* Lista de cards */}
      {filtradas.length === 0 ? (
        <div style={{ textAlign: 'center', padding: '48px 0', color: 'var(--text-muted)', fontSize: '14px' }}>
          Nenhuma máscara encontrada.
        </div>
      ) : (
        <div>
          {filtradas.map((m, i) => (
            <MascaraCard key={m.id} mascara={m} delay={i * 35} />
          ))}
        </div>
      )}
    </>
  )
}
