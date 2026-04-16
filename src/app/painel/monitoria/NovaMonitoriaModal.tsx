'use client'

import { useState, useTransition, useRef, useEffect } from 'react'
import { X, ClipboardList, Save, AlertTriangle, CheckCircle } from 'lucide-react'

interface Operador { id: number; nome: string; username: string }

interface Props {
  aberto:    boolean
  operadores: Operador[]
  onFechar:  () => void
  onSalvo:   () => Promise<void>
}

function hojeFormatado(): string {
  const d = new Date()
  return `${String(d.getDate()).padStart(2, '0')}/${String(d.getMonth() + 1).padStart(2, '0')}/${d.getFullYear()}`
}

const INPUT_STYLE: React.CSSProperties = {
  width: '100%',
  padding: '0.625rem 0.875rem',
  borderRadius: '0.625rem',
  fontSize: '0.875rem',
  background: 'rgba(5,5,8,0.7)',
  border: '1px solid rgba(59,130,246,0.12)',
  color: 'var(--text-primary)',
  outline: 'none',
  transition: 'border-color 200ms ease, box-shadow 200ms ease',
}

export default function NovaMonitoriaModal({ aberto, operadores, onFechar, onSalvo }: Props) {
  const [colaborador,     setColaborador]     = useState('')
  const [idChamada,       setIdChamada]       = useState('')
  const [contratoCliente, setContratoCliente] = useState('')
  const [dataAtendimento, setDataAtendimento] = useState(hojeFormatado())
  const [erros,           setErros]           = useState<Record<string, string>>({})
  const [saving,          startSave]          = useTransition()
  const [sucesso,         setSucesso]         = useState(false)
  const [erroGlobal,      setErroGlobal]      = useState('')
  const firstRef = useRef<HTMLSelectElement>(null)

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
      try {
        const res = await fetch('/api/monitoria', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ colaborador, idChamada, contratoCliente, dataAtendimento }),
        })
        if (!res.ok) {
          const data = await res.json().catch(() => ({}))
          setErroGlobal(data.error ?? 'Erro ao salvar.')
          return
        }
        setSucesso(true)
        setTimeout(async () => {
          await onSalvo()
          setColaborador('')
          setIdChamada('')
          setContratoCliente('')
          setDataAtendimento(hojeFormatado())
          setSucesso(false)
        }, 800)
      } catch {
        setErroGlobal('Erro de rede.')
      }
    })
  }

  if (!aberto) return null

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center p-4"
      style={{ background: 'rgba(0,0,0,0.75)', backdropFilter: 'blur(10px) saturate(160%)' }}
      onClick={(e) => { if (e.target === e.currentTarget) onFechar() }}
    >
      <div
        className="animate-fadeInScale w-full max-w-lg rounded-2xl border overflow-hidden flex flex-col"
        style={{
          background: 'linear-gradient(180deg, rgba(17,24,39,0.99) 0%, rgba(8,12,20,0.99) 100%)',
          borderColor: 'rgba(201,168,76,0.20)',
          boxShadow: '0 32px 96px rgba(0,0,0,0.85)',
          maxHeight: '90vh',
        }}
      >
        {/* Header */}
        <div
          className="flex items-center justify-between px-6 py-4 shrink-0"
          style={{ borderBottom: '1px solid rgba(255,255,255,0.06)' }}
        >
          <div className="flex items-center gap-3">
            <div className="p-2 rounded-xl" style={{ background: 'rgba(201,168,76,0.10)', color: 'var(--gold-light)' }}>
              <ClipboardList size={16} />
            </div>
            <div>
              <h3 className="text-base font-bold" style={{ color: 'var(--text-primary)' }}>Nova Monitoria</h3>
              <p className="text-xs mt-0.5" style={{ color: 'var(--text-muted)' }}>Passo 1 — Dados principais</p>
            </div>
          </div>
          <button
            type="button"
            onClick={onFechar}
            aria-label="Fechar"
            className="p-2 rounded-xl transition-colors"
            style={{ color: 'var(--text-muted)' }}
            onMouseEnter={(e) => { const el = e.currentTarget as HTMLElement; el.style.background = 'rgba(255,255,255,0.06)'; el.style.color = 'var(--text-primary)' }}
            onMouseLeave={(e) => { const el = e.currentTarget as HTMLElement; el.style.background = 'transparent'; el.style.color = 'var(--text-muted)' }}
          >
            <X size={16} />
          </button>
        </div>

        {/* Corpo */}
        <div className="overflow-y-auto flex-1 px-6 py-5 space-y-4">

          {/* Colaborador */}
          <div>
            <label className="block text-xs font-semibold mb-1.5 uppercase" style={{ color: 'var(--text-muted)', letterSpacing: '0.08em' }}>
              Colaborador <span style={{ color: '#f87171' }}>*</span>
            </label>
            <select
              ref={firstRef}
              value={colaborador}
              onChange={(e) => setColaborador(e.target.value)}
              className="select"
              style={{ borderColor: erros.colaborador ? 'rgba(239,68,68,0.5)' : undefined }}
            >
              <option value="">Selecione…</option>
              {operadores.map((op) => (
                <option key={op.id} value={op.nome}>{op.nome}</option>
              ))}
            </select>
            {erros.colaborador && <p className="text-[10px] mt-1" style={{ color: '#f87171' }}>{erros.colaborador}</p>}
          </div>

          {/* ID Chamada + Data */}
          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="block text-xs font-semibold mb-1.5 uppercase" style={{ color: 'var(--text-muted)', letterSpacing: '0.08em' }}>
                ID da Chamada <span style={{ color: '#f87171' }}>*</span>
              </label>
              <input
                type="text"
                value={idChamada}
                onChange={(e) => setIdChamada(e.target.value)}
                placeholder="Ex: 000123456"
                style={{ ...INPUT_STYLE, borderColor: erros.idChamada ? 'rgba(239,68,68,0.5)' : undefined }}
                onFocus={(e) => { e.currentTarget.style.borderColor = 'rgba(201,168,76,0.5)'; e.currentTarget.style.boxShadow = '0 0 0 3px rgba(201,168,76,0.10)' }}
                onBlur={(e)  => { e.currentTarget.style.borderColor = erros.idChamada ? 'rgba(239,68,68,0.5)' : 'rgba(59,130,246,0.12)'; e.currentTarget.style.boxShadow = 'none' }}
              />
              {erros.idChamada && <p className="text-[10px] mt-1" style={{ color: '#f87171' }}>{erros.idChamada}</p>}
            </div>
            <div>
              <label className="block text-xs font-semibold mb-1.5 uppercase" style={{ color: 'var(--text-muted)', letterSpacing: '0.08em' }}>
                Data do Atendimento <span style={{ color: '#f87171' }}>*</span>
              </label>
              <input
                type="text"
                value={dataAtendimento}
                onChange={(e) => setDataAtendimento(e.target.value)}
                placeholder="DD/MM/AAAA"
                style={{ ...INPUT_STYLE, borderColor: erros.dataAtendimento ? 'rgba(239,68,68,0.5)' : undefined }}
                onFocus={(e) => { e.currentTarget.style.borderColor = 'rgba(201,168,76,0.5)'; e.currentTarget.style.boxShadow = '0 0 0 3px rgba(201,168,76,0.10)' }}
                onBlur={(e)  => { e.currentTarget.style.borderColor = erros.dataAtendimento ? 'rgba(239,68,68,0.5)' : 'rgba(59,130,246,0.12)'; e.currentTarget.style.boxShadow = 'none' }}
              />
              {erros.dataAtendimento && <p className="text-[10px] mt-1" style={{ color: '#f87171' }}>{erros.dataAtendimento}</p>}
            </div>
          </div>

          {/* Contrato Cliente */}
          <div>
            <label className="block text-xs font-semibold mb-1.5 uppercase" style={{ color: 'var(--text-muted)', letterSpacing: '0.08em' }}>
              Contrato do Cliente <span style={{ color: '#f87171' }}>*</span>
            </label>
            <input
              type="text"
              value={contratoCliente}
              onChange={(e) => setContratoCliente(e.target.value)}
              placeholder="Ex: 123456789"
              style={{ ...INPUT_STYLE, borderColor: erros.contratoCliente ? 'rgba(239,68,68,0.5)' : undefined }}
              onFocus={(e) => { e.currentTarget.style.borderColor = 'rgba(201,168,76,0.5)'; e.currentTarget.style.boxShadow = '0 0 0 3px rgba(201,168,76,0.10)' }}
              onBlur={(e)  => { e.currentTarget.style.borderColor = erros.contratoCliente ? 'rgba(239,68,68,0.5)' : 'rgba(59,130,246,0.12)'; e.currentTarget.style.boxShadow = 'none' }}
            />
            {erros.contratoCliente && <p className="text-[10px] mt-1" style={{ color: '#f87171' }}>{erros.contratoCliente}</p>}
          </div>

          {erroGlobal && (
            <div
              className="flex items-start gap-2.5 rounded-xl px-4 py-3 text-sm"
              style={{ background: 'rgba(239,68,68,0.08)', border: '1px solid rgba(239,68,68,0.25)', color: '#f87171' }}
              role="alert"
            >
              <AlertTriangle size={14} className="shrink-0 mt-0.5" />
              {erroGlobal}
            </div>
          )}
        </div>

        {/* Footer */}
        <div
          className="px-6 py-4 flex items-center justify-between gap-3 shrink-0"
          style={{ borderTop: '1px solid rgba(255,255,255,0.06)' }}
        >
          <button type="button" onClick={onFechar} className="btn-ghost text-sm">
            Cancelar
          </button>
          <button
            type="button"
            onClick={handleSave}
            disabled={saving || sucesso}
            className="btn-primary flex items-center gap-2"
            style={{ minWidth: '150px', opacity: saving || sucesso ? 0.9 : 1 }}
          >
            {saving ? (
              <span className="w-4 h-4 rounded-full border-2 border-[#050508]/30 border-t-[#050508] animate-spin" />
            ) : sucesso ? (
              <CheckCircle size={15} />
            ) : (
              <Save size={15} />
            )}
            {saving ? 'Salvando…' : sucesso ? 'Salvo!' : 'Criar monitoria'}
          </button>
        </div>
      </div>
    </div>
  )
}
