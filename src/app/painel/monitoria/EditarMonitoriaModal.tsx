'use client'

import { useState, useTransition, useEffect } from 'react'
import { X, ClipboardList, Save, AlertTriangle, CheckCircle, Copy, Check } from 'lucide-react'
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


const SIM_NAO = ['', 'Sim', 'Não'] as const

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
      className="p-1.5 rounded-lg transition-colors shrink-0 self-center"
      style={{ color: copied ? '#4ade80' : 'var(--text-muted)' }}
      onMouseEnter={(e) => { if (!copied) (e.currentTarget as HTMLElement).style.color = 'var(--text-primary)' }}
      onMouseLeave={(e) => { if (!copied) (e.currentTarget as HTMLElement).style.color = 'var(--text-muted)' }}
    >
      {copied ? <Check size={13} /> : <Copy size={13} />}
    </button>
  )
}

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

  useEffect(() => {
    function onKey(e: KeyboardEvent) {
      if (e.key === 'Escape') onFechar()
    }
    document.addEventListener('keydown', onKey)
    return () => document.removeEventListener('keydown', onKey)
  }, [onFechar])

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
      if (!result.ok) {
        setErroGlobal(result.erro ?? 'Erro ao salvar.')
        return
      }
      setSucesso(true)
      setTimeout(() => {
        onSalvo()
        setSucesso(false)
      }, 800)
    })
  }

  const si = STATUS_INFO[monitoria.status] ?? STATUS_INFO['amarelo']

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center p-4"
      style={{ background: 'rgba(0,0,0,0.75)', backdropFilter: 'blur(10px) saturate(160%)' }}
      onClick={(e) => { if (e.target === e.currentTarget) onFechar() }}
    >
      <div
        className="animate-fadeInScale w-full max-w-2xl rounded-2xl overflow-hidden flex flex-col glass-premium"
        style={{ border: '1px solid rgba(201,168,76,0.25)', maxHeight: '92vh' }}
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
              <h3 className="text-base font-bold" style={{ color: 'var(--text-primary)' }}>Editar Monitoria</h3>
              <div className="flex items-center gap-2 mt-0.5">
                <p className="text-xs" style={{ color: 'var(--text-muted)' }}>
                  {monitoria.colaborador || 'Colaborador não definido'}
                </p>
                <span
                  className="text-[10px] px-1.5 py-0.5 rounded-full font-semibold"
                  style={{ background: si.bg, color: si.color, border: `1px solid ${si.border}` }}
                >
                  {si.label}
                </span>
              </div>
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
        <div className="overflow-y-auto flex-1 px-6 py-5 space-y-5">

          {/* ── Seção 1: Dados principais ── */}
          <div>
            <p className="text-[10px] font-bold uppercase mb-3" style={{ color: 'var(--text-muted)', letterSpacing: '0.10em' }}>
              Dados Principais
            </p>
            <div className="space-y-3">
              {/* Colaborador */}
              <div>
                <label className="block text-xs font-semibold mb-1.5 uppercase" style={{ color: 'var(--text-muted)', letterSpacing: '0.08em' }}>
                  Colaborador <span style={{ color: '#f87171' }}>*</span>
                </label>
                <select
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

              {/* ID + Data + Contrato */}
              <div className="grid grid-cols-3 gap-3">
                <div>
                  <label className="block text-xs font-semibold mb-1.5 uppercase" style={{ color: 'var(--text-muted)', letterSpacing: '0.08em' }}>
                    ID Chamada <span style={{ color: '#f87171' }}>*</span>
                  </label>
                  <div className="flex items-center gap-1">
                    <input type="text" value={idChamada} onChange={(e) => setIdChamada(e.target.value)}
                      placeholder="000123456"
                      className="input"
                      style={{ flex: 1, borderColor: erros.idChamada ? 'rgba(239,68,68,0.5)' : undefined }}
                    />
                    <CopyButton value={idChamada} />
                  </div>
                  {erros.idChamada && <p className="text-[10px] mt-1" style={{ color: '#f87171' }}>{erros.idChamada}</p>}
                </div>
                <div>
                  <label className="block text-xs font-semibold mb-1.5 uppercase" style={{ color: 'var(--text-muted)', letterSpacing: '0.08em' }}>
                    Data <span style={{ color: '#f87171' }}>*</span>
                  </label>
                  <div className="flex items-center gap-1">
                    <input type="text" value={dataAtendimento} onChange={(e) => setDataAtendimento(e.target.value)}
                      placeholder="DD/MM/AAAA"
                      className="input"
                      style={{ flex: 1, borderColor: erros.dataAtendimento ? 'rgba(239,68,68,0.5)' : undefined }}
                    />
                    <CopyButton value={dataAtendimento} />
                  </div>
                  {erros.dataAtendimento && <p className="text-[10px] mt-1" style={{ color: '#f87171' }}>{erros.dataAtendimento}</p>}
                </div>
                <div>
                  <label className="block text-xs font-semibold mb-1.5 uppercase" style={{ color: 'var(--text-muted)', letterSpacing: '0.08em' }}>
                    Contrato <span style={{ color: '#f87171' }}>*</span>
                  </label>
                  <div className="flex items-center gap-1">
                    <input type="text" value={contratoCliente} onChange={(e) => setContratoCliente(e.target.value)}
                      placeholder="123456789"
                      className="input"
                      style={{ flex: 1, borderColor: erros.contratoCliente ? 'rgba(239,68,68,0.5)' : undefined }}
                    />
                    <CopyButton value={contratoCliente} />
                  </div>
                  {erros.contratoCliente && <p className="text-[10px] mt-1" style={{ color: '#f87171' }}>{erros.contratoCliente}</p>}
                </div>
              </div>
            </div>
          </div>

          <div className="divider" />

          {/* ── Seção 2: Avaliação ── */}
          <div>
            <p className="text-[10px] font-bold uppercase mb-3" style={{ color: 'var(--text-muted)', letterSpacing: '0.10em' }}>
              Avaliação da Chamada
            </p>
            <div className="space-y-3">

              {/* Encaminhou pesquisa + Sinalização */}
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs font-semibold mb-1.5 uppercase" style={{ color: 'var(--text-muted)', letterSpacing: '0.08em' }}>
                    Encaminhou Pesquisa
                  </label>
                  <select value={encaminhouPesquisa} onChange={(e) => setEncaminhouPesquisa(e.target.value)} className="select">
                    {SIM_NAO.map((v) => <option key={v} value={v}>{v || '—'}</option>)}
                  </select>
                </div>
                <div>
                  <label className="block text-xs font-semibold mb-1.5 uppercase" style={{ color: 'var(--text-muted)', letterSpacing: '0.08em' }}>
                    Sinalização
                  </label>
                  <select value={sinalizacao} onChange={(e) => setSinalizacao(e.target.value)} className="select">
                    <option value="">—</option>
                    {SINALIZACOES.map((s) => <option key={s} value={s}>{s}</option>)}
                  </select>
                </div>
              </div>

              {/* Notas: Apresentação, Comunicação, Processo */}
              <div className="grid grid-cols-3 gap-3">
                {([
                  { label: 'Apresentação', val: apresentacao, set: setApresentacao },
                  { label: 'Comunicação',  val: comunicacao,  set: setComunicacao  },
                  { label: 'Processo',     val: processo,     set: setProcesso     },
                ] as const).map(({ label, val, set }) => (
                  <div key={label}>
                    <label className="block text-xs font-semibold mb-1.5 uppercase" style={{ color: 'var(--text-muted)', letterSpacing: '0.08em' }}>
                      {label}
                    </label>
                    <select value={val} onChange={(e) => (set as (v: string) => void)(e.target.value)} className="select">
                      <option value="">—</option>
                      {NOTAS.map((n) => <option key={n} value={n}>{n}</option>)}
                    </select>
                  </div>
                ))}
              </div>

              {/* Resumo */}
              <div>
                <label className="block text-xs font-semibold mb-1.5 uppercase" style={{ color: 'var(--text-muted)', letterSpacing: '0.08em' }}>
                  Resumo / Observações
                </label>
                <div className="flex items-start gap-1">
                  <textarea
                    value={resumo}
                    onChange={(e) => setResumo(e.target.value)}
                    rows={3}
                    placeholder="Descreva pontos relevantes da monitoria..."
                    className="input"
                    style={{ flex: 1, resize: 'vertical', minHeight: '72px' }}
                  />
                  <CopyButton value={resumo} />
                </div>
              </div>

              {/* Anexo + Enviado Forms */}
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs font-semibold mb-1.5 uppercase" style={{ color: 'var(--text-muted)', letterSpacing: '0.08em' }}>
                    Anexo (link)
                  </label>
                  <div className="flex items-center gap-1">
                    <input
                      type="text"
                      value={anexo}
                      onChange={(e) => setAnexo(e.target.value)}
                      placeholder="https://…"
                      className="input"
                      style={{ flex: 1 }}
                    />
                    <CopyButton value={anexo} />
                  </div>
                </div>
                <div>
                  <label className="block text-xs font-semibold mb-1.5 uppercase" style={{ color: 'var(--text-muted)', letterSpacing: '0.08em' }}>
                    Enviado ao Forms
                  </label>
                  <select value={enviadoForms} onChange={(e) => setEnviadoForms(e.target.value)} className="select">
                    {SIM_NAO.map((v) => <option key={v} value={v}>{v || '—'}</option>)}
                  </select>
                </div>
              </div>
            </div>
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
              <HaloSpinner size="sm" />
            ) : sucesso ? (
              <CheckCircle size={15} />
            ) : (
              <Save size={15} />
            )}
            {saving ? 'Salvando…' : sucesso ? 'Salvo!' : 'Salvar alterações'}
          </button>
        </div>
      </div>
    </div>
  )
}
