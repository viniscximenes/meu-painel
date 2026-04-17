'use client'

import { useState, useTransition } from 'react'
import { Save, CheckCircle } from 'lucide-react'
import type { FaixaGestor, DeflatorABSFaixa, RVGestorConfigRaw } from '@/lib/rv-gestor-utils'
import { parseRVGestorConfig, segParaMMSSGestor } from '@/lib/rv-gestor-utils'
import { salvarRVGestorConfigAction } from './gestor-actions'

const INPUT: React.CSSProperties = {
  background: 'rgba(255,255,255,0.04)',
  border: '1px solid rgba(255,255,255,0.10)',
  borderRadius: '0.5rem',
  color: 'var(--text-primary)',
  padding: '0.4rem 0.6rem',
  fontSize: '0.8125rem',
  outline: 'none',
  width: '100%',
}

const SECTION: React.CSSProperties = {
  background: 'rgba(255,255,255,0.02)',
  border: '1px solid rgba(255,255,255,0.06)',
  borderRadius: '1rem',
  padding: '1.25rem',
}

function FaixaEditor({
  faixas, onChange, labelMin, step = 1,
}: {
  faixas: FaixaGestor[]
  onChange: (f: FaixaGestor[]) => void
  labelMin: string
  step?: number
}) {
  const atualizar = (idx: number, campo: keyof FaixaGestor, val: string) => {
    const novas = faixas.map((f, i) => i === idx ? { ...f, [campo]: parseFloat(val) || 0 } : f)
    onChange(novas.sort((a, b) => b.min - a.min))
  }
  const remover   = (idx: number) => onChange(faixas.filter((_, i) => i !== idx))
  const adicionar = () => {
    const last = faixas[faixas.length - 1]
    onChange([...faixas, { min: (last?.min ?? 0) - step, valor: 0 }].sort((a, b) => b.min - a.min))
  }

  return (
    <div className="space-y-2">
      {faixas.map((f, i) => (
        <div key={i} className="flex items-center gap-2">
          <span className="text-xs shrink-0" style={{ color: 'var(--text-muted)', width: 14 }}>≥</span>
          <input type="number" value={f.min} step={step}
            onChange={e => atualizar(i, 'min', e.target.value)}
            style={{ ...INPUT, width: '80px' }} />
          <span className="text-xs shrink-0" style={{ color: 'var(--text-muted)' }}>{labelMin}</span>
          <span className="text-xs shrink-0" style={{ color: 'var(--text-muted)' }}>→</span>
          <input type="number" value={f.valor} min={0} step={50}
            onChange={e => atualizar(i, 'valor', e.target.value)}
            style={{ ...INPUT, width: '90px' }} />
          <span className="text-xs shrink-0" style={{ color: 'var(--text-muted)' }}>R$</span>
          <button type="button" onClick={() => remover(i)}
            className="text-xs px-2 py-1 rounded-lg shrink-0"
            style={{ color: '#f87171', background: 'rgba(239,68,68,0.08)', border: '1px solid rgba(239,68,68,0.15)' }}>
            ×
          </button>
        </div>
      ))}
      <button type="button" onClick={adicionar}
        className="text-xs px-3 py-1.5 rounded-lg"
        style={{ color: 'var(--gold)', background: 'rgba(201,168,76,0.08)', border: '1px solid rgba(201,168,76,0.15)' }}>
        + Faixa
      </button>
    </div>
  )
}

function DeflatorABSEditor({
  faixas, onChange,
}: {
  faixas: DeflatorABSFaixa[]
  onChange: (f: DeflatorABSFaixa[]) => void
}) {
  const atualizar = (idx: number, campo: keyof DeflatorABSFaixa, val: string) => {
    const novas = faixas.map((f, i) => i === idx ? { ...f, [campo]: parseFloat(val) || 0 } : f)
    onChange(novas.sort((a, b) => a.limite - b.limite))
  }
  const remover   = (idx: number) => onChange(faixas.filter((_, i) => i !== idx))
  const adicionar = () => {
    const last = faixas[faixas.length - 1]
    onChange([...faixas, { limite: (last?.limite ?? 0) + 2, perda: 0 }].sort((a, b) => a.limite - b.limite))
  }

  return (
    <div className="space-y-2">
      {faixas.map((f, i) => (
        <div key={i} className="flex items-center gap-2">
          <span className="text-xs shrink-0" style={{ color: 'var(--text-muted)' }}>ABS &gt;</span>
          <input type="number" value={f.limite} step={1}
            onChange={e => atualizar(i, 'limite', e.target.value)}
            style={{ ...INPUT, width: '70px' }} />
          <span className="text-xs shrink-0" style={{ color: 'var(--text-muted)' }}>% →</span>
          <input type="number" value={f.perda} min={0} max={100} step={5}
            onChange={e => atualizar(i, 'perda', e.target.value)}
            style={{ ...INPUT, width: '70px' }} />
          <span className="text-xs shrink-0" style={{ color: 'var(--text-muted)' }}>% perda</span>
          <button type="button" onClick={() => remover(i)}
            className="text-xs px-2 py-1 rounded-lg shrink-0"
            style={{ color: '#f87171', background: 'rgba(239,68,68,0.08)', border: '1px solid rgba(239,68,68,0.15)' }}>
            ×
          </button>
        </div>
      ))}
      <button type="button" onClick={adicionar}
        className="text-xs px-3 py-1.5 rounded-lg"
        style={{ color: 'var(--gold)', background: 'rgba(201,168,76,0.08)', border: '1px solid rgba(201,168,76,0.15)' }}>
        + Faixa
      </button>
    </div>
  )
}

export default function RVGestorConfigClient({ raw }: { raw: RVGestorConfigRaw }) {
  const config = parseRVGestorConfig(raw)

  const [retencaoFaixas, setRetencaoFaixas]   = useState<FaixaGestor[]>(config.retencaoFaixas)
  const [indispMeta,     setIndispMeta]        = useState(config.indispMeta)
  const [indispValor,    setIndispValor]        = useState(config.indispValor)
  const [tmaMetaMMSS,    setTmaMetaMMSS]        = useState(segParaMMSSGestor(config.tmaMetaSeg))
  const [tmaValor,       setTmaValor]           = useState(config.tmaValor)
  const [ticketFaixas,   setTicketFaixas]       = useState<FaixaGestor[]>(config.ticketFaixas)
  const [ticketMinRet,   setTicketMinRet]        = useState(config.ticketMinRetracao)
  const [bonusRetMin,    setBonusRetMin]          = useState(config.bonusRetencaoMin)
  const [bonusAbsMax,    setBonusAbsMax]          = useState(config.bonusAbsMax)
  const [bonusPct,       setBonusPct]             = useState(config.bonusPercentual)
  const [tmaDeflPct,     setTmaDeflPct]           = useState(config.tmaDeflatorPct)
  const [tmaDeflPerda,   setTmaDeflPerda]         = useState(config.tmaDeflatorPerda)
  const [indispDeflPerda, setIndispDeflPerda]     = useState(config.indispDeflatorPerda)
  const [absDeflFaixas,  setAbsDeflFaixas]        = useState<DeflatorABSFaixa[]>(config.absDeflatorFaixas)

  const [salvo,   setSalvo]   = useState(false)
  const [erro,    setErro]    = useState<string | null>(null)
  const [pending, startTrans] = useTransition()

  function mmssParaSeg(mmss: string): number {
    const m = String(mmss).trim().match(/^(\d+):(\d{2})$/)
    if (m) return parseInt(m[1]) * 60 + parseInt(m[2])
    const n = parseInt(String(mmss))
    return isNaN(n) ? 0 : n
  }

  function handleSalvar() {
    setErro(null)
    startTrans(async () => {
      try {
        const dados: Record<string, string> = {
          gestor_retracao_faixas:       JSON.stringify(retencaoFaixas),
          gestor_indisp_meta:           String(indispMeta),
          gestor_indisp_valor:          String(indispValor),
          gestor_tma_meta_seg:          String(mmssParaSeg(tmaMetaMMSS)),
          gestor_tma_valor:             String(tmaValor),
          gestor_ticket_faixas:         JSON.stringify(ticketFaixas),
          gestor_ticket_min_retracao:   String(ticketMinRet),
          gestor_bonus_retracao_min:    String(bonusRetMin),
          gestor_bonus_abs_max:         String(bonusAbsMax),
          gestor_bonus_percentual:      String(bonusPct),
          gestor_tma_deflator_pct:      String(tmaDeflPct),
          gestor_tma_deflator_perda:    String(tmaDeflPerda),
          gestor_indisp_deflator_perda: String(indispDeflPerda),
          gestor_abs_deflator_faixas:   JSON.stringify(absDeflFaixas),
        }
        await salvarRVGestorConfigAction(dados)
        setSalvo(true)
        setTimeout(() => setSalvo(false), 2500)
      } catch (e) {
        setErro(e instanceof Error ? e.message : 'Erro ao salvar')
      }
    })
  }

  const F = ({ label, children }: { label: string; children: React.ReactNode }) => (
    <div className="space-y-1.5">
      <label className="text-xs font-medium" style={{ color: 'var(--text-muted)' }}>{label}</label>
      {children}
    </div>
  )

  const numInput = (val: number, set: (n: number) => void, step = 1) => (
    <input type="number" value={val} step={step}
      onChange={e => set(parseFloat(e.target.value) || 0)}
      style={INPUT} />
  )

  return (
    <div className="space-y-6">
      {/* Remuneração base */}
      <div style={SECTION} className="space-y-4">
        <h4 className="text-sm font-semibold" style={{ color: 'var(--text-primary)' }}>Remuneração Base (Tx. Retenção)</h4>
        <FaixaEditor faixas={retencaoFaixas} onChange={setRetencaoFaixas} labelMin="%" step={0.5} />
      </div>

      {/* Operacional */}
      <div style={SECTION} className="space-y-4">
        <h4 className="text-sm font-semibold" style={{ color: 'var(--text-primary)' }}>Operacional</h4>
        <div className="grid grid-cols-2 gap-4">
          <F label="Meta Indisponibilidade (%)">
            {numInput(indispMeta, setIndispMeta, 0.5)}
          </F>
          <F label="Valor Indisponibilidade (R$)">
            {numInput(indispValor, setIndispValor, 50)}
          </F>
          <F label="Meta TMA (MM:SS)">
            <input type="text" value={tmaMetaMMSS} onChange={e => setTmaMetaMMSS(e.target.value)}
              placeholder="12:11" style={INPUT} />
          </F>
          <F label="Valor TMA (R$)">
            {numInput(tmaValor, setTmaValor, 50)}
          </F>
        </div>
      </div>

      {/* Variação Ticket */}
      <div style={SECTION} className="space-y-4">
        <h4 className="text-sm font-semibold" style={{ color: 'var(--text-primary)' }}>Variação de Ticket</h4>
        <F label="Tx. Retenção mínima para ganhar ticket (%)">
          {numInput(ticketMinRet, setTicketMinRet, 0.5)}
        </F>
        <FaixaEditor faixas={ticketFaixas} onChange={setTicketFaixas} labelMin="%" step={0.5} />
      </div>

      {/* Bônus */}
      <div style={SECTION} className="space-y-4">
        <h4 className="text-sm font-semibold" style={{ color: 'var(--text-primary)' }}>Bônus</h4>
        <div className="grid grid-cols-3 gap-4">
          <F label="Tx. Retenção mínima (%)">
            {numInput(bonusRetMin, setBonusRetMin, 0.1)}
          </F>
          <F label="ABS máximo (%)">
            {numInput(bonusAbsMax, setBonusAbsMax, 0.5)}
          </F>
          <F label="Percentual bônus (%)">
            {numInput(bonusPct, setBonusPct, 5)}
          </F>
        </div>
      </div>

      {/* Deflatores */}
      <div style={SECTION} className="space-y-4">
        <h4 className="text-sm font-semibold" style={{ color: 'var(--text-primary)' }}>Deflatores</h4>
        <div className="grid grid-cols-2 gap-4">
          <F label="TMA: % acima do limite para deflatar">
            {numInput(tmaDeflPct, setTmaDeflPct, 1)}
          </F>
          <F label="TMA: perda % na RV">
            {numInput(tmaDeflPerda, setTmaDeflPerda, 5)}
          </F>
          <F label="Indisp: perda % na RV">
            {numInput(indispDeflPerda, setIndispDeflPerda, 5)}
          </F>
        </div>
        <div className="space-y-2">
          <label className="text-xs font-medium" style={{ color: 'var(--text-muted)' }}>Faixas ABS (deflator)</label>
          <DeflatorABSEditor faixas={absDeflFaixas} onChange={setAbsDeflFaixas} />
        </div>
      </div>

      {/* Botão salvar */}
      {erro && <p className="text-sm" style={{ color: '#f87171' }}>{erro}</p>}
      <button
        type="button"
        onClick={handleSalvar}
        disabled={pending}
        className="flex items-center gap-2 btn-primary"
        style={{ opacity: pending ? 0.7 : 1 }}
      >
        {salvo ? <CheckCircle size={15} /> : <Save size={15} />}
        {salvo ? 'Salvo!' : pending ? 'Salvando…' : 'Salvar RV Gestor'}
      </button>
    </div>
  )
}
