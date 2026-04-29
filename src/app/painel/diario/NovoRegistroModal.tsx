'use client'

import { useState, useTransition, useRef, useEffect, useId, forwardRef } from 'react'
import { X, BookOpen, Save, AlertTriangle, CheckCircle, Info, ChevronDown, Check } from 'lucide-react'
import { HaloSpinner } from '@/components/HaloSpinner'
import { OPERADORES_DISPLAY } from '@/lib/operadores'
import { TIPOS_REGISTRO, hojeFormatado, calcularDeficitForaJornada, JORNADA_OBRIGATORIA_SEGUNDOS, type TipoRegistro } from '@/lib/diario-utils'
import { salvarRegistroDiarioAction } from './actions'

interface Props {
  aberto: boolean
  onFechar: () => void
  onSalvo: () => void
}

const FF_SYNE = "'Syne', sans-serif"
const FF_DM   = "'DM Sans', sans-serif"

const LABEL_STYLE: React.CSSProperties = {
  display: 'block',
  fontFamily: FF_SYNE,
  fontSize: '11px',
  fontWeight: 600,
  textTransform: 'uppercase',
  letterSpacing: '0.06em',
  color: '#474658',
  marginBottom: '8px',
}

function inputStyle(hasError?: boolean): React.CSSProperties {
  return {
    width: '100%',
    backgroundColor: '#03040C',
    border: `1px solid ${hasError ? 'rgba(227,57,57,0.6)' : 'rgba(114,112,143,0.5)'}`,
    borderRadius: '10px',
    padding: '10px 14px',
    fontSize: '13px',
    fontWeight: 600,
    fontFamily: FF_SYNE,
    color: '#A6A2A2',
    outline: 'none',
    transition: 'border-color 150ms ease, box-shadow 150ms ease',
    boxSizing: 'border-box' as const,
  }
}

function numInputStyle(hasError?: boolean): React.CSSProperties {
  return {
    ...inputStyle(hasError),
    fontFamily: FF_DM,
    fontVariantNumeric: 'tabular-nums',
  }
}

function focusRing(e: React.FocusEvent<HTMLElement>) {
  const el = e.currentTarget as HTMLElement
  el.style.borderColor = 'rgba(244,212,124,0.5)'
  el.style.boxShadow = '0 0 0 3px rgba(244,212,124,0.08)'
}

function blurRing(e: React.FocusEvent<HTMLElement>, hasError?: boolean) {
  const el = e.currentTarget as HTMLElement
  el.style.borderColor = hasError ? 'rgba(227,57,57,0.6)' : 'rgba(114,112,143,0.5)'
  el.style.boxShadow = 'none'
}

// ── SelectHalo ────────────────────────────────────────────────────────────────

interface SelectHaloOption {
  value: string
  label: string
}

interface SelectHaloProps {
  value: string
  onChange: (val: string) => void
  options: SelectHaloOption[]
  disabled?: boolean
  hasError?: boolean
  showDividerAfterFirst?: boolean
}

const SelectHalo = forwardRef<HTMLButtonElement, SelectHaloProps>(
  ({ value, onChange, options, disabled = false, hasError = false, showDividerAfterFirst = false }, ref) => {
    const [aberto, setAberto] = useState(false)
    const [highlighted, setHighlighted] = useState(-1)
    const containerRef = useRef<HTMLDivElement>(null)
    const uid = useId()
    const listboxId = `listbox-${uid}`

    const selectedLabel = options.find(o => o.value === value)?.label ?? ''

    // Close on click outside
    useEffect(() => {
      if (!aberto) return
      function onDown(e: MouseEvent) {
        if (!containerRef.current?.contains(e.target as Node)) {
          setAberto(false)
          setHighlighted(-1)
        }
      }
      document.addEventListener('mousedown', onDown)
      return () => document.removeEventListener('mousedown', onDown)
    }, [aberto])

    function open() {
      if (disabled) return
      setAberto(true)
      const idx = options.findIndex(o => o.value === value)
      setHighlighted(idx >= 0 ? idx : 0)
    }

    function close() {
      setAberto(false)
      setHighlighted(-1)
    }

    function select(val: string) {
      onChange(val)
      close()
    }

    function handleKeyDown(e: React.KeyboardEvent) {
      if (disabled) return
      if (e.key === 'ArrowDown') {
        e.preventDefault()
        if (!aberto) { open(); return }
        setHighlighted(p => Math.min(p + 1, options.length - 1))
      } else if (e.key === 'ArrowUp') {
        e.preventDefault()
        if (!aberto) { open(); return }
        setHighlighted(p => Math.max(p - 1, 0))
      } else if (e.key === 'Enter') {
        e.preventDefault()
        if (aberto && highlighted >= 0) select(options[highlighted].value)
        else if (!aberto) open()
      } else if (e.key === 'Escape') {
        if (aberto) {
          e.nativeEvent.stopPropagation() // prevent modal Esc from firing
          close()
        }
      } else if (e.key === 'Tab') {
        close()
      }
    }

    const triggerBorder = hasError
      ? 'rgba(227,57,57,0.6)'
      : aberto
        ? 'rgba(244,212,124,0.5)'
        : 'rgba(114,112,143,0.5)'

    return (
      <div ref={containerRef} style={{ position: 'relative' }}>
        <button
          ref={ref}
          type="button"
          role="combobox"
          aria-haspopup="listbox"
          aria-expanded={aberto}
          aria-controls={listboxId}
          disabled={disabled}
          onClick={() => aberto ? close() : open()}
          onKeyDown={handleKeyDown}
          style={{
            width: '100%',
            display: 'flex', alignItems: 'center', justifyContent: 'space-between',
            backgroundColor: '#03040C',
            border: `1px solid ${triggerBorder}`,
            borderRadius: '10px',
            padding: '10px 14px',
            fontSize: '13px',
            fontWeight: 600,
            fontFamily: FF_SYNE,
            color: '#A6A2A2',
            cursor: disabled ? 'not-allowed' : 'pointer',
            opacity: disabled ? 0.5 : 1,
            outline: 'none',
            boxShadow: aberto ? '0 0 0 3px rgba(244,212,124,0.08)' : 'none',
            transition: 'border-color 150ms ease, box-shadow 150ms ease',
            textAlign: 'left',
            boxSizing: 'border-box',
          }}
          onMouseEnter={e => {
            if (!aberto && !disabled)
              (e.currentTarget as HTMLElement).style.borderColor = 'rgba(244,212,124,0.35)'
          }}
          onMouseLeave={e => {
            if (!aberto && !disabled)
              (e.currentTarget as HTMLElement).style.borderColor = triggerBorder
          }}
        >
          <span style={{ overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap', flex: 1 }}>
            {selectedLabel}
          </span>
          <ChevronDown
            size={16}
            style={{
              color: '#f4d47c', flexShrink: 0, marginLeft: '8px',
              transform: aberto ? 'rotate(180deg)' : 'none',
              transition: 'transform 200ms ease',
            }}
          />
        </button>

        {aberto && (
          <div
            role="listbox"
            id={listboxId}
            style={{
              position: 'absolute',
              top: 'calc(100% + 4px)',
              left: 0, right: 0,
              background: '#070714',
              border: '1px solid rgba(244,212,124,0.20)',
              borderRadius: '10px',
              boxShadow: '0 12px 32px rgba(0,0,0,0.6)',
              padding: '4px',
              maxHeight: '280px',
              overflowY: 'auto',
              zIndex: 200,
            }}
          >
            {options.map((opt, idx) => {
              const isSelected = opt.value === value
              const isHighlighted = highlighted === idx
              return (
                <div key={opt.value || '__geral__'}>
                  <div
                    role="option"
                    aria-selected={isSelected}
                    onMouseDown={(e) => { e.preventDefault(); select(opt.value) }}
                    onMouseEnter={() => setHighlighted(idx)}
                    style={{
                      display: 'flex', alignItems: 'center', justifyContent: 'space-between',
                      padding: '8px 12px',
                      borderRadius: '6px',
                      fontFamily: FF_SYNE,
                      fontSize: '13px',
                      fontWeight: 600,
                      color: isSelected ? '#f4d47c' : isHighlighted ? '#e8c96d' : '#A6A2A2',
                      background: isSelected ? 'rgba(244,212,124,0.10)' : isHighlighted ? 'rgba(244,212,124,0.06)' : 'transparent',
                      cursor: 'pointer',
                      transition: 'background 100ms ease, color 100ms ease',
                    }}
                  >
                    <span>{opt.label}</span>
                    {isSelected && <Check size={14} style={{ color: '#f4d47c', flexShrink: 0 }} />}
                  </div>
                  {showDividerAfterFirst && idx === 0 && (
                    <div style={{ height: '1px', background: '#211F3C', margin: '4px 2px' }} />
                  )}
                </div>
              )
            })}
          </div>
        )}
      </div>
    )
  }
)
SelectHalo.displayName = 'SelectHalo'

// ── Main component ─────────────────────────────────────────────────────────────

export default function NovoRegistroModal({ aberto, onFechar, onSalvo }: Props) {
  const [tipo,         setTipo]         = useState<TipoRegistro>('Pausa justificada')
  const [colaborador,  setColaborador]  = useState('')
  const [observacoes,  setObservacoes]  = useState('')
  const [glpi,         setGlpi]         = useState('')
  const [tempo,        setTempo]        = useState('')
  const [data,         setData]         = useState(hojeFormatado())
  const [erros,        setErros]        = useState<Record<string, string>>({})
  const [saving,       startSave]       = useTransition()
  const [sucesso,      setSucesso]      = useState(false)
  const [erroGlobal,   setErroGlobal]   = useState('')
  const firstRef = useRef<HTMLButtonElement>(null)

  useEffect(() => {
    if (aberto) {
      setTimeout(() => firstRef.current?.focus(), 80)
      setSucesso(false)
      setErroGlobal('')
      setErros({})
    }
  }, [aberto])

  useEffect(() => {
    function onKey(e: KeyboardEvent) {
      if (e.key === 'Escape' && aberto) onFechar()
    }
    document.addEventListener('keydown', onKey)
    return () => document.removeEventListener('keydown', onKey)
  }, [aberto, onFechar])

  function handleTipo(t: TipoRegistro) {
    setTipo(t as TipoRegistro)
    if (t === 'Geral') setColaborador('')
  }

  const precisaTempo  = tipo === 'Pausa justificada' || tipo === 'Fora da jornada'
  const isForaJornada = tipo === 'Fora da jornada'
  const isGeral       = tipo === 'Geral'

  const isTempoValido = isForaJornada && /^\d{1,2}:\d{2}:\d{2}$/.test(tempo.trim())
  const deficitInfo   = isTempoValido ? calcularDeficitForaJornada(tempo.trim()) : null

  const tipoOptions = TIPOS_REGISTRO.map(t => ({ value: t, label: t }))
  const colaboradorOptions = [
    { value: '', label: 'Geral — Setor inteiro' },
    ...OPERADORES_DISPLAY.map(op => ({ value: op.nome, label: op.nome })),
  ]

  function validar(): boolean {
    const e: Record<string, string> = {}
    if (!tipo) e.tipo = 'Selecione o tipo.'
    if (!observacoes.trim()) e.observacoes = 'Observações obrigatórias.'
    if (!data) e.data = 'Informe a data.'
    if (precisaTempo) {
      if (!tempo.trim()) {
        e.tempo = 'Tempo obrigatório para este tipo.'
      } else if (isForaJornada && !/^\d{1,2}:\d{2}:\d{2}$/.test(tempo.trim())) {
        e.tempo = 'Formato inválido. Use HH:MM:SS (ex: 01:35:05)'
      }
    }
    setErros(e)
    return Object.keys(e).length === 0
  }

  function handleSave() {
    if (!validar()) return
    setErroGlobal('')
    startSave(async () => {
      const result = await salvarRegistroDiarioAction({
        colaborador,
        tipo,
        observacoes: observacoes.trim(),
        glpi: glpi.trim(),
        tempo: tempo.trim(),
        data,
      })
      if (result.ok) {
        setSucesso(true)
        setTimeout(() => {
          onSalvo()
          onFechar()
          setColaborador('')
          setObservacoes('')
          setGlpi('')
          setTempo('')
          setData(hojeFormatado())
          setTipo('Pausa justificada')
          setSucesso(false)
        }, 900)
      } else {
        setErroGlobal(result.erro ?? 'Erro desconhecido.')
      }
    })
  }

  if (!aberto) return null

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center p-4"
      style={{ background: 'rgba(0,0,0,0.75)', backdropFilter: 'blur(4px)' }}
      onClick={(e) => { if (e.target === e.currentTarget) onFechar() }}
    >
      <div
        role="dialog"
        aria-modal="true"
        aria-labelledby="novo-registro-title"
        className="animate-fadeInScale w-full flex flex-col"
        style={{
          maxWidth: '560px',
          borderRadius: '20px',
          overflow: 'hidden',
          background: '#070714',
          border: '1px solid rgba(244,212,124,0.15)',
          boxShadow: '0 24px 64px rgba(0,0,0,0.70)',
          maxHeight: '90vh',
        }}
      >
        {/* ── Header ── */}
        <div
          style={{
            display: 'flex', alignItems: 'center', justifyContent: 'space-between',
            padding: '20px 24px',
            borderBottom: '1px solid #211F3C',
            flexShrink: 0,
          }}
        >
          <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
            <BookOpen size={20} style={{ color: '#f4d47c', flexShrink: 0 }} />
            <div>
              <h3
                id="novo-registro-title"
                style={{
                  fontFamily: FF_SYNE, fontSize: '18px', fontWeight: 600,
                  textTransform: 'uppercase', letterSpacing: '0.04em',
                  color: '#A6A2A2', margin: 0, lineHeight: 1,
                }}
              >
                Novo Registro
              </h3>
              <p style={{
                fontFamily: FF_SYNE, fontSize: '11px', fontWeight: 600,
                textTransform: 'uppercase', letterSpacing: '0.06em',
                color: '#72708F', margin: '4px 0 0',
              }}>
                Diário de Bordo
              </p>
            </div>
          </div>
          <button
            type="button"
            onClick={onFechar}
            aria-label="Fechar"
            style={{
              color: '#72708F', background: 'none', border: 'none',
              cursor: 'pointer', padding: '4px', lineHeight: 0,
              transition: 'color 150ms ease',
            }}
            onMouseEnter={e => { (e.currentTarget as HTMLElement).style.color = '#A6A2A2' }}
            onMouseLeave={e => { (e.currentTarget as HTMLElement).style.color = '#72708F' }}
          >
            <X size={18} />
          </button>
        </div>

        {/* ── Corpo ── */}
        <div
          style={{
            overflowY: 'auto', flex: 1,
            padding: '24px',
            display: 'flex', flexDirection: 'column', gap: '20px',
          }}
        >
          {/* Linha 1: Tipo + Colaborador */}
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '16px' }}>
            <div>
              <label style={LABEL_STYLE}>
                Tipo <span style={{ color: 'rgba(227,57,57,0.74)' }}>*</span>
              </label>
              <SelectHalo
                ref={firstRef}
                value={tipo}
                onChange={(v) => handleTipo(v as TipoRegistro)}
                options={tipoOptions}
                hasError={!!erros.tipo}
              />
              {erros.tipo && (
                <p style={{ fontFamily: FF_DM, fontSize: '10px', marginTop: '4px', color: 'rgba(227,57,57,0.9)' }}>
                  {erros.tipo}
                </p>
              )}
            </div>

            <div>
              <label style={LABEL_STYLE}>Colaborador</label>
              <SelectHalo
                value={colaborador}
                onChange={setColaborador}
                options={colaboradorOptions}
                disabled={isGeral}
                showDividerAfterFirst
              />
              {isGeral && (
                <p style={{ fontFamily: FF_DM, fontSize: '10px', marginTop: '4px', color: '#474658' }}>
                  Registro Geral é sempre do setor inteiro.
                </p>
              )}
            </div>
          </div>

          {/* Observações */}
          <div>
            <label style={LABEL_STYLE}>
              Observações <span style={{ color: 'rgba(227,57,57,0.74)' }}>*</span>
            </label>
            <textarea
              value={observacoes}
              onChange={(e) => setObservacoes(e.target.value)}
              rows={4}
              placeholder="Descreva o ocorrido em detalhes..."
              style={{
                ...inputStyle(!!erros.observacoes),
                resize: 'vertical',
                minHeight: '100px',
              }}
              onFocus={focusRing}
              onBlur={e => blurRing(e, !!erros.observacoes)}
            />
            {erros.observacoes && (
              <p style={{ fontFamily: FF_DM, fontSize: '10px', marginTop: '4px', color: 'rgba(227,57,57,0.9)' }}>
                {erros.observacoes}
              </p>
            )}
          </div>

          {/* Linha 3: GLPI + Tempo + Data */}
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr 1fr', gap: '16px' }}>
            <div>
              <label style={LABEL_STYLE}>GLPI</label>
              <input
                type="text"
                value={glpi}
                onChange={(e) => setGlpi(e.target.value)}
                placeholder="#0000"
                style={numInputStyle()}
                onFocus={focusRing}
                onBlur={e => blurRing(e)}
              />
            </div>

            <div>
              <label style={LABEL_STYLE}>
                {isForaJornada ? 'Tempo logado' : 'Tempo'}{' '}
                {precisaTempo && <span style={{ color: 'rgba(227,57,57,0.74)' }}>*</span>}
              </label>
              <input
                type="text"
                value={tempo}
                onChange={(e) => setTempo(e.target.value)}
                placeholder="00:00:00"
                style={numInputStyle(!!erros.tempo)}
                onFocus={focusRing}
                onBlur={e => blurRing(e, !!erros.tempo)}
              />
              {erros.tempo && (
                <p style={{ fontFamily: FF_DM, fontSize: '10px', marginTop: '4px', color: 'rgba(227,57,57,0.9)' }}>
                  {erros.tempo}
                </p>
              )}
              {isForaJornada && (
                <p style={{ fontFamily: FF_SYNE, fontWeight: 600, fontSize: '10px', color: '#474658', marginTop: '4px' }}>
                  Ex: 06:20:00 = jornada completa | 00:00:00 = não logou
                </p>
              )}
            </div>

            <div>
              <label style={LABEL_STYLE}>
                Data <span style={{ color: 'rgba(227,57,57,0.74)' }}>*</span>
              </label>
              <input
                type="text"
                value={data}
                onChange={(e) => setData(e.target.value)}
                placeholder="DD/MM/AAAA"
                style={numInputStyle(!!erros.data)}
                onFocus={focusRing}
                onBlur={e => blurRing(e, !!erros.data)}
              />
              {erros.data && (
                <p style={{ fontFamily: FF_DM, fontSize: '10px', marginTop: '4px', color: 'rgba(227,57,57,0.9)' }}>
                  {erros.data}
                </p>
              )}
            </div>
          </div>

          {/* Preview déficit — Fora da jornada */}
          {deficitInfo && (
            <div style={{
              display: 'flex', alignItems: 'flex-start', gap: '10px',
              padding: '12px 16px',
              background: 'rgba(96,165,250,0.06)',
              border: '1px solid rgba(96,165,250,0.20)',
              borderRadius: '10px',
            }}>
              <Info size={14} style={{ color: '#60a5fa', flexShrink: 0, marginTop: '1px' }} />
              <div style={{ display: 'flex', flexDirection: 'column', gap: '4px' }}>
                <p style={{ fontFamily: FF_DM, fontSize: '12px', color: '#A6A2A2', margin: 0 }}>
                  Tempo logado: <strong style={{ color: '#93c5fd' }}>{tempo.trim()}</strong>
                </p>
                {deficitInfo.deficitSeg === 0 ? (
                  <p style={{ fontFamily: FF_SYNE, fontSize: '11px', fontWeight: 600, color: 'rgba(106,196,73,0.95)', margin: 0 }}>
                    Déficit: 00:00:00 — jornada completa.
                  </p>
                ) : (
                  <p style={{ fontFamily: FF_SYNE, fontSize: '11px', fontWeight: 600, margin: 0,
                    color: deficitInfo.deficitSeg === JORNADA_OBRIGATORIA_SEGUNDOS ? 'rgba(227,57,57,0.9)' : '#FFB922',
                  }}>
                    Déficit: {deficitInfo.deficitFormatado}
                  </p>
                )}
              </div>
            </div>
          )}

          {erroGlobal && (
            <div
              style={{
                display: 'flex', alignItems: 'flex-start', gap: '10px',
                padding: '12px 16px',
                background: 'rgba(227,57,57,0.06)',
                border: '1px solid rgba(227,57,57,0.22)',
                borderRadius: '10px',
                fontFamily: FF_DM, fontSize: '13px', color: 'rgba(227,57,57,0.9)',
              }}
              role="alert"
            >
              <AlertTriangle size={14} style={{ flexShrink: 0, marginTop: '1px' }} />
              {erroGlobal}
            </div>
          )}
        </div>

        {/* ── Footer ── */}
        <div
          style={{
            padding: '16px 24px',
            borderTop: '1px solid #211F3C',
            display: 'flex', alignItems: 'center', justifyContent: 'space-between',
            gap: '12px', flexShrink: 0,
          }}
        >
          <button
            type="button"
            onClick={onFechar}
            style={{
              fontFamily: FF_SYNE, fontWeight: 600, fontSize: '12px',
              textTransform: 'uppercase', letterSpacing: '0.05em',
              color: '#72708F', cursor: 'pointer',
              background: 'none', border: 'none', padding: '6px 0',
              transition: 'color 150ms ease',
            }}
            onMouseEnter={e => { (e.currentTarget as HTMLElement).style.color = '#A6A2A2' }}
            onMouseLeave={e => { (e.currentTarget as HTMLElement).style.color = '#72708F' }}
          >
            Cancelar
          </button>
          <button
            type="button"
            onClick={handleSave}
            disabled={saving || sucesso}
            className="btn-primary flex items-center gap-2"
            style={{
              fontFamily: FF_SYNE, fontWeight: 600, fontSize: '12px',
              textTransform: 'uppercase', letterSpacing: '0.05em',
              minWidth: '150px', opacity: saving || sucesso ? 0.9 : 1,
            }}
          >
            {saving ? (
              <HaloSpinner size="sm" />
            ) : sucesso ? (
              <CheckCircle size={15} />
            ) : (
              <Save size={15} />
            )}
            {saving ? 'Salvando…' : sucesso ? 'Salvo!' : 'Salvar registro'}
          </button>
        </div>
      </div>
    </div>
  )
}
