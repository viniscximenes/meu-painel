'use client'

import { useState, useTransition, useEffect } from 'react'
import { X, Pencil, Save, AlertTriangle, CheckCircle, Info } from 'lucide-react'
import { HaloSpinner } from '@/components/HaloSpinner'
import { OPERADORES_DISPLAY } from '@/lib/operadores'
import { TIPOS_REGISTRO, parseTempo, type TipoRegistro, type DiarioRegistro } from '@/lib/diario-utils'
import { editarRegistroDiarioAction } from './actions'
import { DicasPreenchimentoAccordion } from '@/components/diario/DicasPreenchimentoAccordion'

interface Props {
  registro: DiarioRegistro | null
  onFechar: () => void
  onSalvo: () => void
}

const TIPO_CORES: Record<TipoRegistro, string> = {
  'Pausa justificada': '#f59e0b',
  'Fora da jornada':   '#60a5fa',
  'Geral':             '#a78bfa',
  'Outros':            '#94a3b8',
}

const JORNADA_PADRAO_MIN = 380

function fmtHHMM(min: number): string {
  const h = Math.floor(min / 60)
  const m = min % 60
  return `${String(h).padStart(2, '0')}:${String(m).padStart(2, '0')}`
}

export default function EditarRegistroModal({ registro, onFechar, onSalvo }: Props) {
  const [tipo,        setTipo]        = useState<TipoRegistro>('Pausa justificada')
  const [colaborador, setColaborador] = useState('')
  const [observacoes, setObservacoes] = useState('')
  const [glpi,        setGlpi]        = useState('')
  const [tempo,       setTempo]       = useState('')
  const [data,        setData]        = useState('')
  const [erros,       setErros]       = useState<Record<string, string>>({})
  const [saving,      startSave]      = useTransition()
  const [sucesso,     setSucesso]     = useState(false)
  const [erroGlobal,  setErroGlobal]  = useState('')

  // Pré-preencher ao abrir
  useEffect(() => {
    if (registro) {
      setTipo(registro.tipo)
      setColaborador(registro.colaborador)
      setObservacoes(registro.observacoes)
      setGlpi(registro.glpi)
      setTempo(registro.tempo)
      setData(registro.data)
      setSucesso(false)
      setErroGlobal('')
      setErros({})
    }
  }, [registro])

  useEffect(() => {
    function onKey(e: KeyboardEvent) {
      if (e.key === 'Escape' && registro) onFechar()
    }
    document.addEventListener('keydown', onKey)
    return () => document.removeEventListener('keydown', onKey)
  }, [registro, onFechar])

  function handleTipo(t: TipoRegistro) {
    setTipo(t)
    if (t === 'Geral') setColaborador('')
  }

  const precisaTempo  = tipo === 'Pausa justificada' || tipo === 'Fora da jornada'
  const isForaJornada = tipo === 'Fora da jornada'
  const isGeral       = tipo === 'Geral'

  const logadoMin  = isForaJornada && tempo.trim() ? parseTempo(tempo.trim()) : 0
  const deficitMin = isForaJornada && logadoMin > 0 ? Math.max(0, JORNADA_PADRAO_MIN - logadoMin) : null

  function validar(): boolean {
    const e: Record<string, string> = {}
    if (!tipo) e.tipo = 'Selecione o tipo.'
    if (!observacoes.trim()) e.observacoes = 'Observações obrigatórias.'
    if (!data) e.data = 'Informe a data.'
    if (precisaTempo && !tempo.trim()) e.tempo = 'Tempo obrigatório para este tipo.'
    setErros(e)
    return Object.keys(e).length === 0
  }

  function handleSave() {
    if (!registro || !validar()) return
    setErroGlobal('')
    startSave(async () => {
      const result = await editarRegistroDiarioAction(registro.sheetRowIndex, {
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
          setSucesso(false)
        }, 900)
      } else {
        setErroGlobal(result.erro ?? 'Erro desconhecido.')
      }
    })
  }

  if (!registro) return null

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center p-4"
      style={{ background: 'rgba(0,0,0,0.75)', backdropFilter: 'blur(10px) saturate(160%)' }}
      onClick={(e) => { if (e.target === e.currentTarget) onFechar() }}
    >
      <div
        className="animate-fadeInScale w-full max-w-xl rounded-2xl overflow-hidden flex flex-col glass-premium"
        style={{ border: '1px solid rgba(201,168,76,0.25)', maxHeight: '90vh' }}
      >
        {/* Header */}
        <div
          className="flex items-center justify-between px-6 py-4 shrink-0"
          style={{ borderBottom: '1px solid var(--border)' }}
        >
          <div className="flex items-center gap-3">
            <div className="p-2 rounded-xl" style={{ background: 'rgba(201,168,76,0.10)', color: 'var(--gold-light)' }}>
              <Pencil size={15} />
            </div>
            <div>
              <h3 className="text-base font-bold" style={{ color: 'var(--text-primary)' }}>Editar Registro</h3>
              <p className="text-xs mt-0.5" style={{ color: 'var(--text-muted)' }}>Diário de Bordo</p>
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

          <DicasPreenchimentoAccordion />

          {/* Linha 1: Tipo + Colaborador */}
          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="block text-xs font-semibold mb-1.5 uppercase" style={{ color: 'var(--text-muted)', letterSpacing: '0.08em' }}>
                Tipo <span style={{ color: '#f87171' }}>*</span>
              </label>
              <select
                value={tipo}
                onChange={(e) => handleTipo(e.target.value as TipoRegistro)}
                className="select"
                style={{ borderColor: erros.tipo ? 'rgba(239,68,68,0.5)' : undefined }}
              >
                {TIPOS_REGISTRO.map((t) => (
                  <option key={t} value={t}>{t}</option>
                ))}
              </select>
              {erros.tipo && <p className="text-[10px] mt-1" style={{ color: '#f87171' }}>{erros.tipo}</p>}
              <span
                className="inline-block mt-1.5 px-2 py-0.5 rounded-full text-[10px] font-semibold"
                style={{ background: `${TIPO_CORES[tipo]}18`, color: TIPO_CORES[tipo], border: `1px solid ${TIPO_CORES[tipo]}30` }}
              >
                {tipo}
              </span>
            </div>

            <div>
              <label className="block text-xs font-semibold mb-1.5 uppercase" style={{ color: 'var(--text-muted)', letterSpacing: '0.08em' }}>
                Colaborador
              </label>
              <select
                value={colaborador}
                onChange={(e) => setColaborador(e.target.value)}
                className="select"
                disabled={isGeral}
                style={{ opacity: isGeral ? 0.5 : 1, cursor: isGeral ? 'not-allowed' : undefined }}
              >
                <option value="">Geral — Setor inteiro</option>
                {OPERADORES_DISPLAY.map((op) => (
                  <option key={op.id} value={op.nome}>{op.nome}</option>
                ))}
              </select>
              {isGeral && (
                <p className="text-[10px] mt-1" style={{ color: 'var(--text-muted)' }}>
                  Registro Geral é sempre do setor inteiro.
                </p>
              )}
            </div>
          </div>

          {/* Observações */}
          <div>
            <label className="block text-xs font-semibold mb-1.5 uppercase" style={{ color: 'var(--text-muted)', letterSpacing: '0.08em' }}>
              Observações <span style={{ color: '#f87171' }}>*</span>
            </label>
            <textarea
              value={observacoes}
              onChange={(e) => setObservacoes(e.target.value)}
              rows={3}
              placeholder="Descreva o ocorrido em detalhes..."
              className="input"
              style={{ resize: 'vertical', minHeight: '80px', borderColor: erros.observacoes ? 'rgba(239,68,68,0.5)' : undefined }}
            />
            {erros.observacoes && (
              <p className="text-[10px] mt-0.5" style={{ color: '#f87171' }}>{erros.observacoes}</p>
            )}
          </div>

          {/* Linha 3: GLPI + Tempo + Data */}
          <div className="grid grid-cols-3 gap-4">
            <div>
              <label className="block text-xs font-semibold mb-1.5 uppercase" style={{ color: 'var(--text-muted)', letterSpacing: '0.08em' }}>
                GLPI
              </label>
              <input
                type="text"
                value={glpi}
                onChange={(e) => setGlpi(e.target.value)}
                placeholder="#0000"
                className="input"
              />
            </div>

            <div>
              <label className="block text-xs font-semibold mb-1.5 uppercase" style={{ color: 'var(--text-muted)', letterSpacing: '0.08em' }}>
                {isForaJornada ? 'Tempo logado no dia' : 'Tempo'} {precisaTempo && <span style={{ color: '#f87171' }}>*</span>}
              </label>
              <input
                type="text"
                value={tempo}
                onChange={(e) => setTempo(e.target.value)}
                placeholder={isForaJornada ? '06:15:00' : '20min, 1:30'}
                className="input"
                style={{ borderColor: erros.tempo ? 'rgba(239,68,68,0.5)' : undefined }}
              />
              {erros.tempo && <p className="text-[10px] mt-0.5" style={{ color: '#f87171' }}>{erros.tempo}</p>}
            </div>

            <div>
              <label className="block text-xs font-semibold mb-1.5 uppercase" style={{ color: 'var(--text-muted)', letterSpacing: '0.08em' }}>
                Data <span style={{ color: '#f87171' }}>*</span>
              </label>
              <input
                type="text"
                value={data}
                onChange={(e) => setData(e.target.value)}
                placeholder="DD/MM/AAAA"
                className="input"
                style={{ borderColor: erros.data ? 'rgba(239,68,68,0.5)' : undefined }}
              />
              {erros.data && <p className="text-[10px] mt-0.5" style={{ color: '#f87171' }}>{erros.data}</p>}
            </div>
          </div>

          {/* Preview déficit — Fora da jornada */}
          {isForaJornada && tempo.trim() && logadoMin > 0 && (
            <div
              className="rounded-xl px-4 py-3 flex items-start gap-3"
              style={{
                background: 'rgba(96,165,250,0.07)',
                border: '1px solid rgba(96,165,250,0.22)',
              }}
            >
              <Info size={14} className="shrink-0 mt-0.5" style={{ color: '#60a5fa' }} />
              <div className="space-y-1">
                <p className="text-xs" style={{ color: 'var(--text-secondary)' }}>
                  Você digitou <strong style={{ color: '#93c5fd' }}>{tempo.trim()}</strong> (tempo logado no dia)
                </p>
                {deficitMin !== null && deficitMin > 0 ? (
                  <p className="text-xs font-semibold" style={{ color: '#f87171' }}>
                    Será salvo como déficit: <strong>{fmtHHMM(deficitMin)}</strong>
                    <span style={{ fontWeight: 400, color: 'var(--text-muted)', marginLeft: '4px' }}>
                      (06:20:00 esperado − {fmtHHMM(logadoMin)} trabalhado)
                    </span>
                  </p>
                ) : (
                  <p className="text-xs font-semibold" style={{ color: '#34d399' }}>
                    Jornada completa — nenhum déficit registrado.
                  </p>
                )}
              </div>
            </div>
          )}

          {isForaJornada && !tempo.trim() && (
            <p className="text-[11px]" style={{ color: 'var(--text-muted)' }}>
              Jornada padrão: 06:20:00. O tempo que for informado acima será convertido em déficit ao salvar.
            </p>
          )}

          {erroGlobal && (
            <div className="flex items-start gap-2.5 rounded-xl px-4 py-3 text-sm animate-shake"
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
            style={{ minWidth: '140px', opacity: saving || sucesso ? 0.9 : 1 }}
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
