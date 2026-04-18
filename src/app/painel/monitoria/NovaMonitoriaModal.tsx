'use client'

import { useState, useTransition, useRef, useEffect } from 'react'
import { X, ClipboardList, Save, AlertTriangle, CheckCircle } from 'lucide-react'
import { criarMonitoriaAction } from './actions'

interface Operador { id: number; nome: string; username: string }

interface Props {
  aberto:    boolean
  operadores: Operador[]
  onFechar:  () => void
  onSalvo:   () => void
}

function hojeFormatado(): string {
  const d = new Date()
  return `${String(d.getDate()).padStart(2, '0')}/${String(d.getMonth() + 1).padStart(2, '0')}/${d.getFullYear()}`
}


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
      const result = await criarMonitoriaAction({ colaborador, idChamada, contratoCliente, dataAtendimento, anexo: anexo.trim() || undefined })
      if (!result.ok) {
        setErroGlobal(result.erro ?? 'Erro ao salvar.')
        return
      }
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

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center p-4"
      style={{ background: 'rgba(0,0,0,0.75)', backdropFilter: 'blur(10px) saturate(160%)' }}
      onClick={(e) => { if (e.target === e.currentTarget) onFechar() }}
    >
      <div
        className="animate-fadeInScale w-full max-w-lg rounded-2xl overflow-hidden flex flex-col glass-premium"
        style={{ border: '1px solid rgba(201,168,76,0.25)', maxHeight: '90vh' }}
      >
        {/* Header */}
        <div
          className="flex items-center justify-between px-6 py-4 shrink-0"
          style={{ borderBottom: '1px solid var(--border)' }}
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
                className="input"
                style={{ borderColor: erros.idChamada ? 'rgba(239,68,68,0.5)' : undefined }}
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
                className="input"
                style={{ borderColor: erros.dataAtendimento ? 'rgba(239,68,68,0.5)' : undefined }}
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
              className="input"
              style={{ borderColor: erros.contratoCliente ? 'rgba(239,68,68,0.5)' : undefined }}
            />
            {erros.contratoCliente && <p className="text-[10px] mt-1" style={{ color: '#f87171' }}>{erros.contratoCliente}</p>}
          </div>

          {/* Link do Anexo */}
          <div>
            <label className="block text-xs font-semibold mb-1.5 uppercase" style={{ color: 'var(--text-muted)', letterSpacing: '0.08em' }}>
              Link do Anexo
            </label>
            <input
              type="text"
              value={anexo}
              onChange={(e) => setAnexo(e.target.value)}
              placeholder="https://…"
              className="input"
            />
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
          style={{ borderTop: '1px solid var(--border)' }}
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
