'use client'

import { useState, useRef, useEffect } from 'react'
import { ChevronDown, Copy, Check, X, AlertCircle } from 'lucide-react'
import type { OperadorContestacao } from '@/lib/contestacao-utils'
import { formatarRegistrosParaCopia } from '@/lib/contestacao-utils'

interface Props {
  operadores: OperadorContestacao[]      // com registros no mês
  todosOperadores: OperadorContestacao[] // todos (para o select)
  mesLabel: string
  dataAtualizacao: string | null
}

interface Toast { message: string; type: 'success' | 'error' }

export default function CopiarEColarClient({ operadores, todosOperadores, mesLabel, dataAtualizacao }: Props) {
  const firstOp   = operadores[0] ?? null
  const autoGen   = firstOp ? formatarRegistrosParaCopia(firstOp.registros) : ''

  const [selectedId, setSelectedId] = useState<number | null>(firstOp?.operadorId ?? null)
  const [texto,      setTexto]      = useState<string>(autoGen)
  const [autoTexto,  setAutoTexto]  = useState<string>(autoGen)
  const [copiado,    setCopiado]    = useState(false)
  const [btnHover,   setBtnHover]   = useState(false)
  const [toast,      setToast]      = useState<Toast | null>(null)

  const textareaRef = useRef<HTMLTextAreaElement>(null)
  const copyTimer   = useRef<ReturnType<typeof setTimeout> | null>(null)

  const op = selectedId !== null
    ? (operadores.find(o => o.operadorId === selectedId) ?? null)
    : null

  const semRegistros = operadores.length === 0
  const isDirty      = texto !== autoTexto

  function showToast(t: Toast) {
    setToast(t)
    setTimeout(() => setToast(null), 2500)
  }

  function handleSelectOperador(id: number | null) {
    if (id === selectedId) return
    if (isDirty && texto.trim() !== '') {
      if (!confirm('Há edições não salvas. Trocar de operador vai descartá-las. Continuar?')) return
    }
    const newOp    = operadores.find(o => o.operadorId === id) ?? null
    const newTexto = newOp ? formatarRegistrosParaCopia(newOp.registros) : ''
    setSelectedId(id)
    setTexto(newTexto)
    setAutoTexto(newTexto)
    setCopiado(false)
  }

  async function handleCopy() {
    if (!texto.trim() || copiado) return

    if (copyTimer.current) clearTimeout(copyTimer.current)

    if (navigator.clipboard) {
      try {
        await navigator.clipboard.writeText(texto)
        setCopiado(true)
        showToast({ message: 'Texto copiado!', type: 'success' })
        copyTimer.current = setTimeout(() => setCopiado(false), 2000)
      } catch {
        showToast({ message: 'Erro ao copiar. Selecione o texto e use Ctrl+C.', type: 'error' })
      }
    } else {
      // Fallback: select text in textarea
      textareaRef.current?.focus()
      textareaRef.current?.select()
      showToast({ message: 'Selecione o texto e pressione Ctrl+C para copiar.', type: 'error' })
    }
  }

  // Cleanup timer on unmount
  useEffect(() => () => { if (copyTimer.current) clearTimeout(copyTimer.current) }, [])

  return (
    <div className="space-y-5">

      {/* ── Header ──────────────────────────────────────────────────────────── */}
      <div style={{
        background: 'var(--void2)',
        border: '1px solid rgba(201,168,76,0.1)',
        borderRadius: '14px',
        padding: '14px 20px',
        display: 'flex',
        alignItems: 'center',
        gap: '16px',
        flexWrap: 'wrap',
      }}>
        <span style={{
          fontFamily: 'var(--ff-display)',
          fontSize: '16px', fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.06em',
          background: 'linear-gradient(135deg, #e8c96d 0%, #c9a84c 100%)',
          WebkitBackgroundClip: 'text', WebkitTextFillColor: 'transparent', backgroundClip: 'text',
        }}>
          Copiar e Colar
        </span>
        <div style={{ width: '1px', height: '16px', background: 'rgba(201,168,76,0.2)' }} />
        <span style={{ fontSize: '11px', color: 'var(--text-muted)' }}>{mesLabel}</span>
        {dataAtualizacao && (
          <>
            <div style={{ width: '1px', height: '16px', background: 'rgba(201,168,76,0.2)' }} />
            <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
              <div className="animate-pulse" style={{ width: '6px', height: '6px', borderRadius: '50%', background: '#10b981' }} />
              <span style={{ fontSize: '11px', color: 'var(--text-muted)' }}>
                Sincronizado até <strong style={{ color: 'var(--text-secondary)', fontWeight: 600 }}>{dataAtualizacao}</strong>
              </span>
            </div>
          </>
        )}
      </div>

      {/* ── Seletor de operador ─────────────────────────────────────────────── */}
      <OperadorSelect
        operadores={operadores}
        todosOperadores={todosOperadores}
        selectedId={selectedId}
        onSelect={handleSelectOperador}
      />

      {/* ── Estado vazio (sem nenhum operador com registros) ────────────────── */}
      {semRegistros && (
        <div className="flex flex-col items-center justify-center gap-3 rounded-xl py-12 text-center"
          style={{ background: 'rgba(255,255,255,0.02)', border: '1px solid rgba(255,255,255,0.05)' }}>
          <AlertCircle size={20} style={{ color: '#f4d47c' }} />
          <div>
            <p className="text-sm font-medium" style={{ color: 'var(--text-secondary)' }}>
              Nenhum operador com registros em {mesLabel}
            </p>
            <p className="text-xs mt-1" style={{ color: 'var(--text-muted)' }}>
              Adicione registros de Pausa justificada ou Fora da jornada no Diário de Bordo.
            </p>
          </div>
        </div>
      )}

      {/* ── Área de texto + botão ───────────────────────────────────────────── */}
      {op && (
        <div className="space-y-4">

          {/* Label + textarea */}
          <div className="space-y-2">
            <div style={{ display: 'flex', alignItems: 'baseline', gap: '10px' }}>
              <span style={{
                fontSize: '10px', fontWeight: 600, textTransform: 'uppercase',
                letterSpacing: '0.1em', color: '#f4d47c',
              }}>
                Texto Formatado
              </span>
              <span style={{ fontSize: '11px', color: 'var(--text-muted)' }}>
                ({op.registros.length} {op.registros.length === 1 ? 'registro' : 'registros'} · clique para editar se necessário)
              </span>
            </div>

            <textarea
              ref={textareaRef}
              value={texto}
              onChange={e => setTexto(e.target.value)}
              spellCheck={false}
              style={{
                width: '100%',
                minHeight: '400px',
                maxHeight: '60vh',
                background: '#0d1117',
                border: isDirty
                  ? '1px solid rgba(244,212,124,0.30)'
                  : '1px solid rgba(244,212,124,0.15)',
                borderRadius: '12px',
                padding: '20px',
                fontFamily: "ui-monospace, 'Menlo', 'Consolas', monospace",
                fontSize: '13px',
                color: '#e5e5e5',
                lineHeight: 1.6,
                resize: 'vertical',
                overflowY: 'auto',
                outline: 'none',
                transition: 'border-color 0.2s',
              }}
            />

            {/* Estado vazio do textarea (operador sem registros) */}
            {op.registros.length === 0 && texto === '' && (
              <p style={{ fontSize: '12px', color: 'var(--text-muted)', marginTop: '8px' }}>
                Este operador não tem registros no Diário para o mês de referência.
              </p>
            )}
          </div>

          {/* Separador + Botão Copiar */}
          <div style={{ marginTop: '8px' }}>
            <div style={{ height: '1px', background: 'rgba(244,212,124,0.15)', marginBottom: '20px' }} />
            <button
              type="button"
              onClick={handleCopy}
              disabled={!texto.trim() || copiado}
              onMouseEnter={() => { if (texto.trim() && !copiado) setBtnHover(true) }}
              onMouseLeave={() => setBtnHover(false)}
              style={{
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                gap: '10px',
                width: '100%',
                height: '52px',
                borderRadius: '10px',
                border: 'none',
                background: copiado ? '#16a34a' : '#f4d47c',
                color: copiado ? '#ffffff' : '#0a0a0a',
                fontSize: '15px',
                fontWeight: 600,
                cursor: (!texto.trim() || copiado) ? 'not-allowed' : 'pointer',
                opacity: !texto.trim() ? 0.5 : 1,
                boxShadow: (texto.trim() && !copiado && btnHover)
                  ? '0 0 20px rgba(244,212,124,0.30)'
                  : copiado
                    ? '0 0 20px rgba(22,163,74,0.25)'
                    : 'none',
                transition: 'background 300ms ease, color 300ms ease, box-shadow 200ms ease',
              }}
            >
              {copiado
                ? <><Check size={18} strokeWidth={2} />Copiado!</>
                : <><Copy size={18} strokeWidth={2} />Copiar tudo</>
              }
            </button>
          </div>

        </div>
      )}

      {/* ── Toast ──────────────────────────────────────────────────────────── */}
      {toast && (
        <div style={{
          position: 'fixed', bottom: '24px', right: '24px', zIndex: 60,
          display: 'flex', alignItems: 'center', gap: '8px',
          padding: '10px 16px', borderRadius: '10px',
          background: '#0d1117',
          border: `1px solid ${toast.type === 'success' ? 'rgba(16,185,129,0.30)' : 'rgba(239,68,68,0.30)'}`,
          color: toast.type === 'success' ? '#34d399' : '#f87171',
          fontSize: '13px', fontWeight: 500,
          boxShadow: '0 4px 24px rgba(0,0,0,0.5)',
        }}>
          {toast.type === 'success' ? <Check size={14} /> : <X size={14} />}
          {toast.message}
        </div>
      )}

    </div>
  )
}

// ── Seletor de operador ───────────────────────────────────────────────────────

function OperadorSelect({
  operadores, todosOperadores, selectedId, onSelect,
}: {
  operadores: OperadorContestacao[]
  todosOperadores: OperadorContestacao[]
  selectedId: number | null
  onSelect: (id: number | null) => void
}) {
  const [open, setOpen] = useState(false)
  const ref = useRef<HTMLDivElement>(null)

  const semRegistros = todosOperadores.filter(
    o => !operadores.some(r => r.operadorId === o.operadorId),
  )

  const selected = selectedId !== null
    ? operadores.find(o => o.operadorId === selectedId) ?? null
    : null

  useEffect(() => {
    function handle(e: MouseEvent) {
      if (ref.current && !ref.current.contains(e.target as Node)) setOpen(false)
    }
    document.addEventListener('mousedown', handle)
    return () => document.removeEventListener('mousedown', handle)
  }, [])

  const triggerStyle: React.CSSProperties = {
    width: '100%',
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'space-between',
    gap: '8px',
    padding: '10px 14px',
    borderRadius: '8px',
    border: open ? '1px solid rgba(244,212,124,0.35)' : '1px solid rgba(244,212,124,0.15)',
    background: '#0d1117',
    color: selected ? '#e2e8f0' : '#526a85',
    fontSize: '13px',
    fontWeight: selected ? 500 : 400,
    cursor: 'pointer',
    transition: 'border-color 0.15s',
    textAlign: 'left',
  }

  const dropdownStyle: React.CSSProperties = {
    position: 'absolute',
    top: 'calc(100% + 4px)',
    left: 0,
    right: 0,
    zIndex: 50,
    background: '#0d1117',
    border: '1px solid rgba(244,212,124,0.2)',
    borderRadius: '8px',
    overflow: 'hidden',
    boxShadow: '0 8px 32px rgba(0,0,0,0.5)',
    maxHeight: '320px',
    overflowY: 'auto',
  }

  const groupLabelStyle: React.CSSProperties = {
    padding: '8px 14px 4px',
    fontSize: '10px',
    fontWeight: 600,
    letterSpacing: '0.1em',
    textTransform: 'uppercase',
    color: '#526a85',
    borderTop: '1px solid rgba(255,255,255,0.05)',
  }

  function ItemRow({ op, disabled = false }: { op: OperadorContestacao; disabled?: boolean }) {
    const isSelected = op.operadorId === selectedId
    return (
      <button
        type="button"
        disabled={disabled}
        onClick={() => { onSelect(op.operadorId); setOpen(false) }}
        style={{
          width: '100%',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'space-between',
          gap: '10px',
          padding: '8px 14px',
          background: isSelected ? 'rgba(244,212,124,0.1)' : 'transparent',
          color: disabled ? '#374151' : isSelected ? '#f4d47c' : '#e2e8f0',
          fontSize: '13px',
          fontWeight: isSelected ? 600 : 400,
          textAlign: 'left',
          cursor: disabled ? 'default' : 'pointer',
          transition: 'background 0.1s',
          border: 'none',
        }}
        onMouseEnter={e => {
          if (!disabled && !isSelected)
            (e.currentTarget as HTMLButtonElement).style.background = 'rgba(255,255,255,0.04)'
        }}
        onMouseLeave={e => {
          if (!disabled && !isSelected)
            (e.currentTarget as HTMLButtonElement).style.background = 'transparent'
        }}
      >
        <span className="truncate">{op.operadorNome}</span>
        {isSelected && <span className="text-[10px] shrink-0" style={{ color: '#f4d47c' }}>✓</span>}
      </button>
    )
  }

  return (
    <div className="space-y-1.5">
      <label className="text-[11px] font-semibold uppercase tracking-wider" style={{ color: 'var(--text-muted)' }}>
        Operador
      </label>
      <div ref={ref} style={{ position: 'relative' }}>
        <button type="button" style={triggerStyle} onClick={() => setOpen(v => !v)}>
          <span className="truncate">
            {selected ? selected.operadorNome : '— Selecione um operador —'}
          </span>
          <ChevronDown size={14} style={{
            color: '#526a85', flexShrink: 0,
            transform: open ? 'rotate(180deg)' : 'rotate(0deg)',
            transition: 'transform 0.15s',
          }} />
        </button>

        {open && (
          <div style={dropdownStyle}>
            {operadores.length > 0 && (
              <>
                <div style={{ ...groupLabelStyle, borderTop: 'none' }}>— Com registros —</div>
                {operadores.map(o => <ItemRow key={o.operadorId} op={o} />)}
              </>
            )}
            {semRegistros.length > 0 && (
              <>
                <div style={groupLabelStyle}>— Sem registros —</div>
                {semRegistros.map(o => <ItemRow key={o.operadorId} op={o} disabled />)}
              </>
            )}
          </div>
        )}
      </div>
    </div>
  )
}
