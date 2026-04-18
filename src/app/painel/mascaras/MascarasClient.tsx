'use client'

import { useState } from 'react'
import { Search, Copy, Check } from 'lucide-react'
import type { Mascara } from '@/lib/mascaras'

interface MascarasClientProps {
  mascaras: Mascara[]
}

function SlaBadge({ sla }: { sla: string }) {
  const is24 = sla.includes('24')
  return (
    <span style={{
      fontSize: '10px', fontWeight: 600, padding: '2px 8px', borderRadius: '99px',
      background: is24 ? 'rgba(245,158,11,0.10)' : 'rgba(96,165,250,0.10)',
      border: `1px solid ${is24 ? 'rgba(245,158,11,0.22)' : 'rgba(96,165,250,0.22)'}`,
      color: is24 ? '#f59e0b' : '#60a5fa',
      whiteSpace: 'nowrap' as const,
    }}>
      ⏱ {sla}
    </span>
  )
}

function CopyButton({ text }: { text: string }) {
  const [copied, setCopied] = useState(false)

  async function handleCopy() {
    try {
      await navigator.clipboard.writeText(text)
      setCopied(true)
      setTimeout(() => setCopied(false), 2000)
    } catch {
      /* fallback silencioso */
    }
  }

  return (
    <button
      onClick={handleCopy}
      style={{
        width: '100%', display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '6px',
        padding: '8px', borderRadius: '8px', fontSize: '12px', fontWeight: 600,
        background: copied ? 'rgba(74,222,128,0.10)' : 'rgba(201,168,76,0.10)',
        border: `1px solid ${copied ? 'rgba(74,222,128,0.25)' : 'rgba(201,168,76,0.22)'}`,
        color: copied ? '#4ade80' : 'var(--gold)',
        cursor: 'pointer', transition: 'all 0.2s',
      }}
    >
      {copied ? <><Check size={13} /> Copiado!</> : <><Copy size={13} /> Copiar máscara</>}
    </button>
  )
}

function MascaraCard({ mascara, delay }: { mascara: Mascara; delay: number }) {
  return (
    <div style={{
      background: '#111827',
      border: '1px solid rgba(201,168,76,0.08)',
      borderRadius: '12px',
      padding: '16px',
      display: 'flex', flexDirection: 'column', gap: '10px',
      animation: `mascaraFadeUp 0.45s cubic-bezier(0.22,1,0.36,1) ${delay}ms both`,
    }}>
      {/* Header do card */}
      <div style={{ display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between', gap: '8px' }}>
        <span style={{
          fontFamily: 'var(--ff-display)', fontSize: '13px', fontWeight: 700,
          textTransform: 'uppercase', letterSpacing: '0.04em',
          background: 'linear-gradient(135deg, #e8c96d 0%, #c9a84c 100%)',
          WebkitBackgroundClip: 'text', WebkitTextFillColor: 'transparent', backgroundClip: 'text',
          lineHeight: 1.3,
        }}>
          {mascara.fila}
        </span>
        <SlaBadge sla={mascara.sla} />
      </div>

      {/* Utilização */}
      <p style={{ fontSize: '12px', color: 'var(--text-muted)', fontStyle: 'italic', lineHeight: 1.55 }}>
        {mascara.utilizacao}
      </p>

      {/* Separador */}
      <div style={{ height: '1px', background: 'linear-gradient(90deg, transparent, rgba(201,168,76,0.15), transparent)' }} />

      {/* Texto da máscara */}
      <div style={{
        background: '#0d0d1a',
        border: '1px solid rgba(201,168,76,0.06)',
        borderRadius: '8px',
        padding: '10px 12px',
        fontFamily: 'monospace',
        fontSize: '12px',
        color: 'var(--text-secondary)',
        whiteSpace: 'pre-wrap',
        lineHeight: 1.6,
        maxHeight: '160px',
        overflowY: 'auto',
      }}>
        {mascara.mascara}
      </div>

      {/* Botão copiar */}
      <CopyButton text={mascara.mascara} />
    </div>
  )
}

export default function MascarasClient({ mascaras }: MascarasClientProps) {
  const [busca, setBusca]           = useState('')
  const [segmento, setSegmento]     = useState('TODOS')

  const segmentos = ['TODOS', ...Array.from(new Set(mascaras.map(m => m.segmento.toUpperCase())))]

  const filtradas = mascaras.filter(m => {
    const matchSeg = segmento === 'TODOS' || m.segmento.toUpperCase() === segmento
    const matchBusca = busca.trim() === '' ||
      m.fila.toLowerCase().includes(busca.toLowerCase()) ||
      m.utilizacao.toLowerCase().includes(busca.toLowerCase())
    return matchSeg && matchBusca
  })

  return (
    <>
      <style dangerouslySetInnerHTML={{ __html: `
        @keyframes mascaraFadeUp {
          from { opacity: 0; transform: translateY(10px); }
          to   { opacity: 1; transform: translateY(0); }
        }
      `}} />

      {/* Barra de busca + filtros */}
      <div style={{ display: 'flex', flexDirection: 'column', gap: '10px' }}>
        {/* Search input */}
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

        {/* Pills de segmento */}
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
      </div>

      {/* Contagem */}
      {busca && (
        <p style={{ fontSize: '12px', color: 'var(--text-muted)' }}>
          {filtradas.length} resultado{filtradas.length !== 1 ? 's' : ''} para &ldquo;{busca}&rdquo;
        </p>
      )}

      {/* Grid de cards */}
      {filtradas.length === 0 ? (
        <div style={{ textAlign: 'center', padding: '48px 0', color: 'var(--text-muted)', fontSize: '14px' }}>
          Nenhuma máscara encontrada.
        </div>
      ) : (
        <div style={{
          display: 'grid',
          gridTemplateColumns: 'repeat(auto-fill, minmax(320px, 1fr))',
          gap: '12px',
        }}>
          {filtradas.map((m, i) => (
            <MascaraCard key={m.id} mascara={m} delay={i * 40} />
          ))}
        </div>
      )}
    </>
  )
}
