'use client'

import React, { useState, useTransition, useEffect, forwardRef, useRef, type CSSProperties } from 'react'
import { X, ClipboardList, Save, AlertTriangle, CheckCircle, Copy, Check, ChevronDown } from 'lucide-react'
import { HaloSpinner } from '@/components/HaloSpinner'
import { SINALIZACOES, NOTAS, STATUS_INFO } from '@/lib/monitoria-utils'
import type { Monitoria } from '@/lib/monitoria-utils'
import { atualizarMonitoriaAction } from './actions'

interface Operador { id: number; nome: string; username: string }

interface Props {
  monitoria:  Monitoria
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

const SECTION_TITLE_STYLE: CSSProperties = {
  fontFamily: FF_SYNE,
  fontSize: '10px',
  fontWeight: 700,
  textTransform: 'uppercase',
  letterSpacing: '0.10em',
  color: '#474658',
  margin: '0 0 12px',
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

const SIM_NAO = ['', 'Sim', 'Não'] as const

// ── SelectHalo ───────────────────────────────────────────────────────────────
type SelectOption = { value: string; label: string }

interface SelectHaloProps {
  options:      SelectOption[]
  value:        string
  onChange:     (v: string) => void
  placeholder?: string
  hasError?:    boolean
}

const SelectHalo = forwardRef<HTMLButtonElement, SelectHaloProps>(
  function SelectHalo({ options, value, onChange, placeholder = 'Selecione…', hasError }, ref) {
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

// ── CopyButton ────────────────────────────────────────────────────────────────
function CopyButton({ value }: { value: string }) {
  const [copied, setCopied] = useState(false)
  function handleCopy() {
    navigator.clipboard.writeText(value)
    setCopied(true)
    setTimeout(() => setCopied(false), 1500)
  }
  return (
    <button
      type="button"
      onClick={handleCopy}
      title="Copiar"
      style={{
        width: '24px',
        height: '24px',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        borderRadius: '6px',
        border: '1px solid transparent',
        background: 'transparent',
        cursor: 'pointer',
        color: copied ? 'rgba(106,196,73,0.95)' : '#72708F',
        flexShrink: 0,
        transition: 'color 150ms ease, border-color 150ms ease',
      }}
      onMouseEnter={(e) => {
        if (!copied) {
          const el = e.currentTarget as HTMLElement
          el.style.color       = '#f4d47c'
          el.style.borderColor = 'rgba(244,212,124,0.25)'
        }
      }}
      onMouseLeave={(e) => {
        if (!copied) {
          const el = e.currentTarget as HTMLElement
          el.style.color       = '#72708F'
          el.style.borderColor = 'transparent'
        }
      }}
    >
      {copied ? <Check size={12} /> : <Copy size={12} />}
    </button>
  )
}

// ── Component ─────────────────────────────────────────────────────────────────
export default function EditarMonitoriaModal({ monitoria, operadores, onFechar, onSalvo }: Props) {
  const [colaborador,        setColaborador]        = useState(monitoria.colaborador)
  const [idChamada,          setIdChamada]          = useState(monitoria.idChamada)
  const [contratoCliente,    setContratoCliente]    = useState(monitoria.contratoCliente)
  const [dataAtendimento,    setDataAtendimento]    = useState(monitoria.dataAtendimento)
  const [encaminhouPesquisa, setEncaminhouPesquisa] = useState(monitoria.encaminhouPesquisa)
  const [sinalizacao,        setSinalizacao]        = useState(monitoria.sinalizacao)
  const [apresentacao,       setApresentacao]       = useState(monitoria.apresentacao)
  const [comunicacao,        setComunicacao]        = useState(monitoria.comunicacao)
  const [processo,           setProcesso]           = useState(monitoria.processo)
  const [resumo,             setResumo]             = useState(monitoria.resumo)
  const [anexo,              setAnexo]              = useState(monitoria.anexo)
  const [enviadoForms,       setEnviadoForms]       = useState(monitoria.enviadoForms)

  const [erros,      setErros]      = useState<Record<string, string>>({})
  const [saving,     startSave]     = useTransition()
  const [sucesso,    setSucesso]    = useState(false)
  const [erroGlobal, setErroGlobal] = useState('')

  function validar(): boolean {
    const e: Record<string, string> = {}
    if (!colaborador)            e.colaborador     = 'Selecione o colaborador.'
    if (!idChamada.trim())       e.idChamada       = 'Obrigatório.'
    if (!contratoCliente.trim()) e.contratoCliente = 'Obrigatório.'
    if (!dataAtendimento.trim()) e.dataAtendimento = 'Obrigatório.'
    setErros(e)
    return Object.keys(e).length === 0
  }

  function handleSave() {
    if (!validar()) return
    setErroGlobal('')
    startSave(async () => {
      const result = await atualizarMonitoriaAction({
        sheetRowIndex: monitoria.sheetRowIndex,
        colaborador, idChamada, contratoCliente, dataAtendimento,
        encaminhouPesquisa, sinalizacao, apresentacao, comunicacao,
        processo, resumo, anexo, enviadoForms,
      })
      if (!result.ok) { setErroGlobal(result.erro ?? 'Erro ao salvar.'); return }
      setSucesso(true)
      setTimeout(() => { onSalvo(); setSucesso(false) }, 800)
    })
  }

  const si = STATUS_INFO[monitoria.status] ?? STATUS_INFO['amarelo']

  const operadorOptions: SelectOption[]    = [{ value: '', label: 'Selecione…' }, ...operadores.map((op) => ({ value: op.nome, label: op.nome }))]
  const simNaoOptions: SelectOption[]      = SIM_NAO.map((v) => ({ value: v, label: v || '—' }))
  const sinalizacaoOptions: SelectOption[] = [{ value: '', label: '—' }, ...SINALIZACOES.map((s) => ({ value: s, label: s }))]
  const notasOptions: SelectOption[]       = [{ value: '', label: '—' }, ...NOTAS.map((n) => ({ value: n, label: n }))]

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
        aria-labelledby="editar-monitoria-title"
        className="animate-fadeInScale w-full"
        style={{
          maxWidth: '672px',
          borderRadius: '20px',
          overflow: 'hidden',
          background: '#070714',
          border: '1px solid rgba(244,212,124,0.20)',
          boxShadow: '0 24px 64px rgba(0,0,0,0.70)',
          maxHeight: '92vh',
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
                id="editar-monitoria-title"
                style={{ fontFamily: FF_SYNE, fontSize: '14px', fontWeight: 600, color: '#A6A2A2', margin: 0, lineHeight: 1 }}
              >
                Editar Monitoria
              </h3>
              <div style={{ display: 'flex', alignItems: 'center', gap: '8px', marginTop: '4px' }}>
                <p style={{ fontFamily: FF_DM, fontSize: '12px', color: '#72708F', margin: 0 }}>
                  {monitoria.colaborador || 'Colaborador não definido'}
                </p>
                <span style={{
                  fontFamily: FF_SYNE, fontSize: '10px', fontWeight: 600,
                  padding: '2px 8px', borderRadius: '20px',
                  background: si.bg, color: si.color, border: `1px solid ${si.border}`,
                }}>
                  {si.label}
                </span>
              </div>
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
        <div style={{ overflowY: 'auto', flex: 1, padding: '20px 24px', display: 'flex', flexDirection: 'column', gap: '20px' }}>

          {/* ── Seção 1: Dados principais ── */}
          <div>
            <p style={SECTION_TITLE_STYLE}>Dados Principais</p>
            <div style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>

              {/* Colaborador */}
              <div>
                <label style={LABEL_STYLE}>
                  Colaborador <span style={{ color: 'rgba(227,57,57,0.95)' }}>*</span>
                </label>
                <SelectHalo
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

              {/* ID + Data + Contrato */}
              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr 1fr', gap: '12px' }}>
                <div>
                  <label style={LABEL_STYLE}>
                    ID Chamada <span style={{ color: 'rgba(227,57,57,0.95)' }}>*</span>
                  </label>
                  <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
                    <input
                      type="text"
                      value={idChamada}
                      onChange={(e) => setIdChamada(e.target.value)}
                      placeholder="000123456"
                      style={{ ...inputStyle(!!erros.idChamada), flex: 1, width: 'auto' }}
                      onFocus={(e) => focusRing(e.currentTarget)}
                      onBlur={(e) => blurRing(e.currentTarget, !!erros.idChamada)}
                    />
                    <CopyButton value={idChamada} />
                  </div>
                  {erros.idChamada && (
                    <p style={{ fontFamily: FF_DM, fontSize: '10px', color: 'rgba(227,57,57,0.95)', marginTop: '4px', marginBottom: 0 }}>
                      {erros.idChamada}
                    </p>
                  )}
                </div>
                <div>
                  <label style={LABEL_STYLE}>
                    Data <span style={{ color: 'rgba(227,57,57,0.95)' }}>*</span>
                  </label>
                  <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
                    <input
                      type="text"
                      value={dataAtendimento}
                      onChange={(e) => setDataAtendimento(e.target.value)}
                      placeholder="DD/MM/AAAA"
                      style={{ ...inputStyle(!!erros.dataAtendimento), flex: 1, width: 'auto' }}
                      onFocus={(e) => focusRing(e.currentTarget)}
                      onBlur={(e) => blurRing(e.currentTarget, !!erros.dataAtendimento)}
                    />
                    <CopyButton value={dataAtendimento} />
                  </div>
                  {erros.dataAtendimento && (
                    <p style={{ fontFamily: FF_DM, fontSize: '10px', color: 'rgba(227,57,57,0.95)', marginTop: '4px', marginBottom: 0 }}>
                      {erros.dataAtendimento}
                    </p>
                  )}
                </div>
                <div>
                  <label style={LABEL_STYLE}>
                    Contrato <span style={{ color: 'rgba(227,57,57,0.95)' }}>*</span>
                  </label>
                  <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
                    <input
                      type="text"
                      value={contratoCliente}
                      onChange={(e) => setContratoCliente(e.target.value)}
                      placeholder="123456789"
                      style={{ ...inputStyle(!!erros.contratoCliente), flex: 1, width: 'auto' }}
                      onFocus={(e) => focusRing(e.currentTarget)}
                      onBlur={(e) => blurRing(e.currentTarget, !!erros.contratoCliente)}
                    />
                    <CopyButton value={contratoCliente} />
                  </div>
                  {erros.contratoCliente && (
                    <p style={{ fontFamily: FF_DM, fontSize: '10px', color: 'rgba(227,57,57,0.95)', marginTop: '4px', marginBottom: 0 }}>
                      {erros.contratoCliente}
                    </p>
                  )}
                </div>
              </div>
            </div>
          </div>

          {/* Divider */}
          <div style={{ height: '1px', background: '#211F3C' }} />

          {/* ── Seção 2: Avaliação ── */}
          <div>
            <p style={SECTION_TITLE_STYLE}>Avaliação da Chamada</p>
            <div style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>

              {/* Encaminhou pesquisa + Sinalização */}
              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '12px' }}>
                <div>
                  <label style={LABEL_STYLE}>Encaminhou Pesquisa</label>
                  <SelectHalo
                    options={simNaoOptions}
                    value={encaminhouPesquisa}
                    onChange={setEncaminhouPesquisa}
                  />
                </div>
                <div>
                  <label style={LABEL_STYLE}>Sinalização</label>
                  <SelectHalo
                    options={sinalizacaoOptions}
                    value={sinalizacao}
                    onChange={setSinalizacao}
                  />
                </div>
              </div>

              {/* Notas: Apresentação, Comunicação, Processo */}
              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr 1fr', gap: '12px' }}>
                {([
                  { label: 'Apresentação', val: apresentacao, set: setApresentacao },
                  { label: 'Comunicação',  val: comunicacao,  set: setComunicacao  },
                  { label: 'Processo',     val: processo,     set: setProcesso     },
                ] as { label: string; val: string; set: (v: string) => void }[]).map(({ label, val, set }) => (
                  <div key={label}>
                    <label style={LABEL_STYLE}>{label}</label>
                    <SelectHalo
                      options={notasOptions}
                      value={val}
                      onChange={set}
                    />
                  </div>
                ))}
              </div>

              {/* Resumo */}
              <div>
                <label style={LABEL_STYLE}>Resumo / Observações</label>
                <div style={{ display: 'flex', alignItems: 'flex-start', gap: '6px' }}>
                  <textarea
                    value={resumo}
                    onChange={(e) => setResumo(e.target.value)}
                    rows={3}
                    placeholder="Descreva pontos relevantes da monitoria..."
                    style={{
                      flex: 1,
                      background: '#03040C',
                      border: '1px solid #211F3C',
                      borderRadius: '8px',
                      padding: '9px 12px',
                      fontFamily: FF_DM,
                      fontSize: '13px',
                      color: '#A6A2A2',
                      outline: 'none',
                      resize: 'vertical',
                      minHeight: '72px',
                    }}
                    onFocus={(e) => focusRing(e.currentTarget)}
                    onBlur={(e) => blurRing(e.currentTarget)}
                  />
                  <CopyButton value={resumo} />
                </div>
              </div>

              {/* Anexo + Enviado Forms */}
              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '12px' }}>
                <div>
                  <label style={LABEL_STYLE}>Anexo (link)</label>
                  <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
                    <input
                      type="text"
                      value={anexo}
                      onChange={(e) => setAnexo(e.target.value)}
                      placeholder="https://…"
                      style={{ ...inputStyle(), flex: 1, width: 'auto' }}
                      onFocus={(e) => focusRing(e.currentTarget)}
                      onBlur={(e) => blurRing(e.currentTarget)}
                    />
                    <CopyButton value={anexo} />
                  </div>
                </div>
                <div>
                  <label style={LABEL_STYLE}>Enviado ao Forms</label>
                  <SelectHalo
                    options={simNaoOptions}
                    value={enviadoForms}
                    onChange={setEnviadoForms}
                  />
                </div>
              </div>
            </div>
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
                el.style.background  = 'rgba(244,212,124,0.16)'
                el.style.borderColor = 'rgba(244,212,124,0.60)'
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
            {saving ? 'Salvando…' : sucesso ? 'Salvo!' : 'Salvar alterações'}
          </button>
        </div>
      </div>
    </div>
  )
}
