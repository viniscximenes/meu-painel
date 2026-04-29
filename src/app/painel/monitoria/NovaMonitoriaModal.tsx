'use client'

import React, { useState, useTransition, useRef, useEffect, forwardRef, type CSSProperties } from 'react'
import { X, ClipboardList, Save, AlertTriangle, CheckCircle, ChevronDown } from 'lucide-react'
import { HaloSpinner } from '@/components/HaloSpinner'
import { criarMonitoriaAction } from './actions'

interface Operador { id: number; nome: string; username: string }

interface Props {
  aberto:     boolean
  operadores: Operador[]
  onFechar:   () => void
  onSalvo:    () => void
}

// ── tokens ───────────────────────────────────────────────────────────────────
const FF_SYNE = "'Syne', sans-serif"
const FF_DM   = "'DM Sans', sans-serif"

const LABEL_STYLE: CSSProperties = {
  fontFamily: FF_SYNE,
  fontSize: '10px',
  fontWeight: 600,
  textTransform: 'uppercase',
  letterSpacing: '0.08em',
  color: '#72708F',
  display: 'block',
  marginBottom: '6px',
}

function inputStyle(hasError?: boolean): CSSProperties {
  return {
    width: '100%',
    background: '#03040C',
    border: `1px solid ${hasError ? 'rgba(227,57,57,0.50)' : '#211F3C'}`,
    borderRadius: '8px',
    padding: '9px 12px',
    fontFamily: FF_DM,
    fontSize: '13px',
    color: '#A6A2A2',
    outline: 'none',
    boxSizing: 'border-box',
  }
}

function focusRing(el: HTMLElement) {
  el.style.borderColor = 'rgba(244,212,124,0.50)'
  el.style.boxShadow   = '0 0 0 3px rgba(244,212,124,0.08)'
}
function blurRing(el: HTMLElement, hasError?: boolean) {
  el.style.borderColor = hasError ? 'rgba(227,57,57,0.50)' : '#211F3C'
  el.style.boxShadow   = 'none'
}

// ── SelectHalo ───────────────────────────────────────────────────────────────
type SelectOption = { value: string; label: string }

interface SelectHaloProps {
  options:      SelectOption[]
  value:        string
  onChange:     (v: string) => void
  placeholder?: string
  hasError?:    boolean
  ariaLabel?:   string
}

const SelectHalo = forwardRef<HTMLButtonElement, SelectHaloProps>(
  function SelectHalo({ options, value, onChange, placeholder = 'Selecione…', hasError, ariaLabel }, ref) {
    const [open, setOpen]           = useState(false)
    const [focused, setFocused]     = useState(false)
    const [activeIdx, setActiveIdx] = useState(-1)
    const containerRef              = useRef<HTMLDivElement>(null)

    const selectedLabel = options.find((o) => o.value === value)?.label ?? ''

    useEffect(() => {
      if (!open) return
      function handleOutside(e: MouseEvent) {
        if (containerRef.current && !containerRef.current.contains(e.target as Node)) setOpen(false)
      }
      document.addEventListener('mousedown', handleOutside)
      return () => document.removeEventListener('mousedown', handleOutside)
    }, [open])

    function handleKeyDown(e: React.KeyboardEvent<HTMLButtonElement>) {
      if (e.key === 'ArrowDown') {
        e.preventDefault()
        if (!open) { setOpen(true); setActiveIdx(0); return }
        setActiveIdx((i) => Math.min(i + 1, options.length - 1))
      } else if (e.key === 'ArrowUp') {
        e.preventDefault()
        setActiveIdx((i) => Math.max(i - 1, 0))
      } else if (e.key === 'Enter') {
        e.preventDefault()
        if (open && activeIdx >= 0) { onChange(options[activeIdx].value); setOpen(false) }
        else setOpen((o) => !o)
      } else if (e.key === ' ') {
        e.preventDefault()
        setOpen((o) => !o)
      } else if (e.key === 'Escape') {
        if (open) { e.stopPropagation(); setOpen(false) }
      } else if (e.key === 'Tab') {
        setOpen(false)
      }
    }

    const borderColor = hasError
      ? 'rgba(227,57,57,0.50)'
      : focused || open ? 'rgba(244,212,124,0.50)' : '#211F3C'
    const boxShadow = (focused || open) && !hasError ? '0 0 0 3px rgba(244,212,124,0.08)' : 'none'

    return (
      <div ref={containerRef} style={{ position: 'relative' }}>
        <button
          ref={ref}
          type="button"
          role="combobox"
          aria-haspopup="listbox"
          aria-expanded={open}
          aria-label={ariaLabel}
          onClick={() => setOpen((o) => !o)}
          onKeyDown={handleKeyDown}
          onFocus={() => setFocused(true)}
          onBlur={() => setFocused(false)}
          style={{
            width: '100%',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'space-between',
            gap: '8px',
            background: '#03040C',
            border: `1px solid ${borderColor}`,
            borderRadius: '8px',
            padding: '9px 12px',
            fontFamily: FF_DM,
            fontSize: '13px',
            color: value ? '#A6A2A2' : '#474658',
            cursor: 'pointer',
            textAlign: 'left',
            transition: 'border-color 150ms ease, box-shadow 150ms ease',
            boxShadow,
          }}
        >
          <span style={{ flex: 1, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
            {selectedLabel || placeholder}
          </span>
          <ChevronDown
            size={14}
            style={{
              color: '#72708F',
              flexShrink: 0,
              transform: open ? 'rotate(180deg)' : 'rotate(0deg)',
              transition: 'transform 200ms ease',
            }}
          />
        </button>
        {open && (
          <ul
            role="listbox"
            style={{
              position: 'absolute',
              top: 'calc(100% + 4px)',
              left: 0,
              right: 0,
              zIndex: 100,
              background: '#070714',
              border: '1px solid #211F3C',
              borderRadius: '8px',
              padding: '4px',
              maxHeight: '200px',
              overflowY: 'auto',
              boxShadow: '0 8px 24px rgba(0,0,0,0.50)',
              listStyle: 'none',
              margin: 0,
            }}
          >
            {options.map((opt, idx) => {
              const isSelected = opt.value === value
              const isActive   = idx === activeIdx
              return (
                <li
                  key={opt.value}
                  role="option"
                  aria-selected={isSelected}
                  onMouseEnter={() => setActiveIdx(idx)}
                  onClick={() => { onChange(opt.value); setOpen(false) }}
                  style={{
                    padding: '8px 10px',
                    borderRadius: '6px',
                    fontFamily: FF_DM,
                    fontSize: '13px',
                    color: isSelected ? '#f4d47c' : isActive ? '#A6A2A2' : '#72708F',
                    background: isSelected
                      ? 'rgba(244,212,124,0.08)'
                      : isActive ? 'rgba(255,255,255,0.04)' : 'transparent',
                    cursor: 'pointer',
                  }}
                >
                  {opt.label}
                </li>
              )
            })}
          </ul>
        )}
      </div>
    )
  }
)

// ── helpers ──────────────────────────────────────────────────────────────────
function hojeFormatado(): string {
  const d = new Date()
  return `${String(d.getDate()).padStart(2, '0')}/${String(d.getMonth() + 1).padStart(2, '0')}/${d.getFullYear()}`
}

// ── Component ─────────────────────────────────────────────────────────────────
export default function NovaMonitoriaModal({ aberto, operadores, onFechar, onSalvo }: Props) {
  const [colaborador,     setColaborador]     = useState('')
  const [idChamada,       setIdChamada]       = useState('')
  const [contratoCliente, setContratoCliente] = useState('')
  const [dataAtendimento, setDataAtendimento] = useState(hojeFormatado())
  const [anexo,           setAnexo]           = useState('')
  const [erros,           setErros]           = useState<Record<string, string>>({})
  const [saving,          startSave]          = useTransition()
  const [sucesso,         setSucesso]         = useState(false)
  const [erroGlobal,      setErroGlobal]      = useState('')
  const firstRef = useRef<HTMLButtonElement>(null)

  useEffect(() => {
    if (aberto) {
      setTimeout(() => firstRef.current?.focus(), 80)
      setSucesso(false)
      setErroGlobal('')
      setErros({})
    }
  }, [aberto])

  function validar(): boolean {
    const e: Record<string, string> = {}
    if (!colaborador)             e.colaborador     = 'Selecione o colaborador.'
    if (!idChamada.trim())        e.idChamada       = 'Obrigatório.'
    if (!contratoCliente.trim())  e.contratoCliente = 'Obrigatório.'
    if (!dataAtendimento.trim())  e.dataAtendimento = 'Obrigatório.'
    setErros(e)
    return Object.keys(e).length === 0
  }

  function handleSave() {
    if (!validar()) return
    setErroGlobal('')
    startSave(async () => {
      const result = await criarMonitoriaAction({
        colaborador, idChamada, contratoCliente, dataAtendimento,
        anexo: anexo.trim() || undefined,
      })
      if (!result.ok) { setErroGlobal(result.erro ?? 'Erro ao salvar.'); return }
      setSucesso(true)
      setTimeout(() => {
        onSalvo()
        setColaborador('')
        setIdChamada('')
        setContratoCliente('')
        setDataAtendimento(hojeFormatado())
        setAnexo('')
        setSucesso(false)
      }, 800)
    })
  }

  if (!aberto) return null

  const operadorOptions: SelectOption[] = [
    { value: '', label: 'Selecione…' },
    ...operadores.map((op) => ({ value: op.nome, label: op.nome })),
  ]

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center p-4"
      style={{ background: 'rgba(0,0,0,0.80)', backdropFilter: 'blur(4px)' }}
      onClick={(e) => { if (e.target === e.currentTarget && !saving) onFechar() }}
      onKeyDown={(e) => { if (e.key === 'Escape' && !saving) onFechar() }}
    >
      <div
        role="dialog"
        aria-modal="true"
        aria-labelledby="nova-monitoria-title"
        className="animate-fadeInScale w-full"
        style={{
          maxWidth: '512px',
          borderRadius: '20px',
          overflow: 'hidden',
          background: '#070714',
          border: '1px solid rgba(244,212,124,0.20)',
          boxShadow: '0 24px 64px rgba(0,0,0,0.70)',
          maxHeight: '90vh',
          display: 'flex',
          flexDirection: 'column',
        }}
      >
        {/* Header */}
        <div style={{
          display: 'flex', alignItems: 'center', justifyContent: 'space-between',
          padding: '20px 24px',
          borderBottom: '1px solid #211F3C',
          flexShrink: 0,
        }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
            <div style={{ padding: '8px', borderRadius: '8px', background: 'rgba(244,212,124,0.10)', lineHeight: 0 }}>
              <ClipboardList size={16} style={{ color: '#f4d47c' }} />
            </div>
            <div>
              <h3
                id="nova-monitoria-title"
                style={{ fontFamily: FF_SYNE, fontSize: '14px', fontWeight: 600, color: '#A6A2A2', margin: 0, lineHeight: 1 }}
              >
                Nova Monitoria
              </h3>
              <p style={{ fontFamily: FF_SYNE, fontSize: '11px', fontWeight: 600, textTransform: 'uppercase', letterSpacing: '0.06em', color: '#72708F', margin: '4px 0 0' }}>
                Passo 1 — Dados principais
              </p>
            </div>
          </div>
          {!saving && (
            <button
              type="button"
              onClick={onFechar}
              aria-label="Fechar"
              style={{ color: '#72708F', background: 'none', border: 'none', cursor: 'pointer', padding: '4px', lineHeight: 0, transition: 'color 150ms ease' }}
              onMouseEnter={(e) => { (e.currentTarget as HTMLElement).style.color = '#A6A2A2' }}
              onMouseLeave={(e) => { (e.currentTarget as HTMLElement).style.color = '#72708F' }}
            >
              <X size={16} />
            </button>
          )}
        </div>

        {/* Corpo */}
        <div style={{ overflowY: 'auto', flex: 1, padding: '20px 24px', display: 'flex', flexDirection: 'column', gap: '16px' }}>

          {/* Colaborador */}
          <div>
            <label style={LABEL_STYLE}>
              Colaborador <span style={{ color: 'rgba(227,57,57,0.95)' }}>*</span>
            </label>
            <SelectHalo
              ref={firstRef}
              options={operadorOptions}
              value={colaborador}
              onChange={setColaborador}
              hasError={!!erros.colaborador}
            />
            {erros.colaborador && (
              <p style={{ fontFamily: FF_DM, fontSize: '10px', color: 'rgba(227,57,57,0.95)', marginTop: '4px', marginBottom: 0 }}>
                {erros.colaborador}
              </p>
            )}
          </div>

          {/* ID Chamada + Data */}
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '12px' }}>
            <div>
              <label style={LABEL_STYLE}>
                ID da Chamada <span style={{ color: 'rgba(227,57,57,0.95)' }}>*</span>
              </label>
              <input
                type="text"
                value={idChamada}
                onChange={(e) => setIdChamada(e.target.value)}
                placeholder="Ex: 000123456"
                style={inputStyle(!!erros.idChamada)}
                onFocus={(e) => focusRing(e.currentTarget)}
                onBlur={(e) => blurRing(e.currentTarget, !!erros.idChamada)}
              />
              {erros.idChamada && (
                <p style={{ fontFamily: FF_DM, fontSize: '10px', color: 'rgba(227,57,57,0.95)', marginTop: '4px', marginBottom: 0 }}>
                  {erros.idChamada}
                </p>
              )}
            </div>
            <div>
              <label style={LABEL_STYLE}>
                Data do Atendimento <span style={{ color: 'rgba(227,57,57,0.95)' }}>*</span>
              </label>
              <input
                type="text"
                value={dataAtendimento}
                onChange={(e) => setDataAtendimento(e.target.value)}
                placeholder="DD/MM/AAAA"
                style={inputStyle(!!erros.dataAtendimento)}
                onFocus={(e) => focusRing(e.currentTarget)}
                onBlur={(e) => blurRing(e.currentTarget, !!erros.dataAtendimento)}
              />
              {erros.dataAtendimento && (
                <p style={{ fontFamily: FF_DM, fontSize: '10px', color: 'rgba(227,57,57,0.95)', marginTop: '4px', marginBottom: 0 }}>
                  {erros.dataAtendimento}
                </p>
              )}
            </div>
          </div>

          {/* Contrato Cliente */}
          <div>
            <label style={LABEL_STYLE}>
              Contrato do Cliente <span style={{ color: 'rgba(227,57,57,0.95)' }}>*</span>
            </label>
            <input
              type="text"
              value={contratoCliente}
              onChange={(e) => setContratoCliente(e.target.value)}
              placeholder="Ex: 123456789"
              style={inputStyle(!!erros.contratoCliente)}
              onFocus={(e) => focusRing(e.currentTarget)}
              onBlur={(e) => blurRing(e.currentTarget, !!erros.contratoCliente)}
            />
            {erros.contratoCliente && (
              <p style={{ fontFamily: FF_DM, fontSize: '10px', color: 'rgba(227,57,57,0.95)', marginTop: '4px', marginBottom: 0 }}>
                {erros.contratoCliente}
              </p>
            )}
          </div>

          {/* Link do Anexo */}
          <div>
            <label style={LABEL_STYLE}>Link do Anexo</label>
            <input
              type="text"
              value={anexo}
              onChange={(e) => setAnexo(e.target.value)}
              placeholder="https://…"
              style={inputStyle()}
              onFocus={(e) => focusRing(e.currentTarget)}
              onBlur={(e) => blurRing(e.currentTarget)}
            />
          </div>

          {erroGlobal && (
            <div
              role="alert"
              style={{
                display: 'flex', alignItems: 'flex-start', gap: '10px',
                background: 'rgba(227,57,57,0.06)',
                border: '1px solid rgba(227,57,57,0.25)',
                borderRadius: '10px',
                padding: '12px 16px',
              }}
            >
              <AlertTriangle size={14} style={{ color: 'rgba(227,57,57,0.95)', flexShrink: 0, marginTop: '1px' }} />
              <p style={{ fontFamily: FF_DM, fontSize: '12px', color: 'rgba(227,57,57,0.95)', margin: 0 }}>{erroGlobal}</p>
            </div>
          )}
        </div>

        {/* Footer */}
        <div style={{
          padding: '16px 24px',
          borderTop: '1px solid #211F3C',
          display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: '12px',
          flexShrink: 0,
        }}>
          <button
            type="button"
            onClick={onFechar}
            disabled={saving}
            style={{
              fontFamily: FF_SYNE, fontWeight: 600, fontSize: '12px',
              textTransform: 'uppercase', letterSpacing: '0.05em',
              color: '#72708F', cursor: saving ? 'not-allowed' : 'pointer',
              background: 'none', border: 'none', padding: '6px 0',
              opacity: saving ? 0.5 : 1,
              transition: 'color 150ms ease',
            }}
            onMouseEnter={(e) => { if (!saving) (e.currentTarget as HTMLElement).style.color = '#A6A2A2' }}
            onMouseLeave={(e) => { (e.currentTarget as HTMLElement).style.color = '#72708F' }}
          >
            Cancelar
          </button>
          <button
            type="button"
            onClick={handleSave}
            disabled={saving || sucesso}
            style={{
              display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '8px',
              fontFamily: FF_SYNE, fontWeight: 600, fontSize: '12px',
              textTransform: 'uppercase', letterSpacing: '0.05em',
              color: sucesso ? 'rgba(106,196,73,0.95)' : '#f4d47c',
              background: sucesso ? 'rgba(106,196,73,0.10)' : 'rgba(244,212,124,0.10)',
              border: `1px solid ${sucesso ? 'rgba(106,196,73,0.40)' : 'rgba(244,212,124,0.40)'}`,
              borderRadius: '10px',
              padding: '10px 20px',
              cursor: saving || sucesso ? 'not-allowed' : 'pointer',
              minWidth: '150px',
              transition: 'border-color 150ms ease, background 150ms ease',
              opacity: saving || sucesso ? 0.9 : 1,
            }}
            onMouseEnter={(e) => {
              if (!saving && !sucesso) {
                const el = e.currentTarget as HTMLElement
                el.style.background   = 'rgba(244,212,124,0.16)'
                el.style.borderColor  = 'rgba(244,212,124,0.60)'
              }
            }}
            onMouseLeave={(e) => {
              if (!sucesso) {
                const el = e.currentTarget as HTMLElement
                el.style.background  = 'rgba(244,212,124,0.10)'
                el.style.borderColor = 'rgba(244,212,124,0.40)'
              }
            }}
          >
            {saving ? <HaloSpinner size="sm" /> : sucesso ? <CheckCircle size={15} /> : <Save size={15} />}
            {saving ? 'Salvando…' : sucesso ? 'Salvo!' : 'Criar monitoria'}
          </button>
        </div>
      </div>
    </div>
  )
}
