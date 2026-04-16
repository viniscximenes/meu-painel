'use client'

import { useState, useTransition } from 'react'
import { Save, Plus, Trash2, CheckCircle, AlertTriangle } from 'lucide-react'
import type { FaixaRV, RVConfigRaw } from '@/lib/rv-utils'
import { mmssParaSeg, segParaMMSS } from '@/lib/rv-utils'
import { salvarRVConfigAction } from './actions'

// ── Estilos compartilhados ────────────────────────────────────────────────────

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

// ── Componente de edição de faixas ────────────────────────────────────────────

function FaixaEditor({
  faixas,
  onChange,
  labelMin,
  step = 1,
}: {
  faixas: FaixaRV[]
  onChange: (f: FaixaRV[]) => void
  labelMin: string
  step?: number
}) {
  const atualizar = (idx: number, campo: keyof FaixaRV, val: string) => {
    const novas = faixas.map((f, i) =>
      i === idx ? { ...f, [campo]: parseFloat(val) || 0 } : f
    )
    onChange(novas.sort((a, b) => b.min - a.min))
  }
  const remover  = (idx: number) => onChange(faixas.filter((_, i) => i !== idx))
  const adicionar = () => {
    const last = faixas[faixas.length - 1]
    onChange([...faixas, { min: (last?.min ?? 0) - step, valor: 0 }].sort((a, b) => b.min - a.min))
  }

  return (
    <div className="space-y-2">
      {faixas.map((f, i) => (
        <div key={i} className="flex items-center gap-2">
          <span className="text-xs shrink-0" style={{ color: 'var(--text-muted)', width: 14 }}>≥</span>
          <input
            type="number"
            value={f.min}
            step={step}
            onChange={e => atualizar(i, 'min', e.target.value)}
            style={{ ...INPUT, width: 80 }}
          />
          <span className="text-xs shrink-0" style={{ color: 'var(--text-muted)' }}>{labelMin}</span>
          <span className="text-xs shrink-0 mx-1" style={{ color: 'var(--text-muted)' }}>→  R$</span>
          <input
            type="number"
            value={f.valor}
            step={50}
            onChange={e => atualizar(i, 'valor', e.target.value)}
            style={{ ...INPUT, width: 96 }}
          />
          <button
            type="button"
            onClick={() => remover(i)}
            className="p-1 rounded transition-colors shrink-0"
            style={{ color: 'var(--text-muted)' }}
            onMouseEnter={e => ((e.currentTarget as HTMLElement).style.color = '#f87171')}
            onMouseLeave={e => ((e.currentTarget as HTMLElement).style.color = 'var(--text-muted)')}
          >
            <Trash2 size={13} />
          </button>
        </div>
      ))}
      <button
        type="button"
        onClick={adicionar}
        className="flex items-center gap-1.5 text-xs px-2.5 py-1 rounded-lg"
        style={{
          color: 'var(--gold-light)',
          background: 'rgba(201,168,76,0.06)',
          border: '1px solid rgba(201,168,76,0.15)',
        }}
      >
        <Plus size={11} /> Adicionar faixa
      </button>
    </div>
  )
}

// ── Componente de campo com label ─────────────────────────────────────────────

function Campo({
  label,
  hint,
  children,
}: {
  label: string
  hint?: string
  children: React.ReactNode
}) {
  return (
    <div>
      <label className="block text-xs font-semibold mb-1" style={{ color: 'var(--text-secondary)' }}>
        {label}
      </label>
      {children}
      {hint && (
        <p className="text-[10px] mt-0.5" style={{ color: 'var(--text-muted)' }}>{hint}</p>
      )}
    </div>
  )
}

// ── Formulário principal ──────────────────────────────────────────────────────

interface Estado {
  absMaximo: string
  bonusValor: string
  horasMensais: string
  retracaoFaixas: FaixaRV[]
  indispLimite: string
  indispValor: string
  tmaMmss: string        // exibido como MM:SS, salvo como segundos
  tmaValor: string
  ticketFaixas: FaixaRV[]
  ticketMinRetracao: string
  pedidosMeta: string
  churnMeta: string
  bonusRetracaoMinima: string
  bonusIndispMaxima: string
}

export default function RVConfigForm({ raw }: { raw: RVConfigRaw }) {
  const [e, setE] = useState<Estado>(() => {
    const j = <T,>(k: string, fb: T): T => {
      try { return JSON.parse(raw[k] ?? '') } catch { return fb }
    }
    const s = (k: string) => (raw[k] ?? '').trim()
    return {
      absMaximo:           s('abs_maximo'),
      bonusValor:          s('bonus_valor'),
      horasMensais:        s('horas_mensais') || '132',
      retracaoFaixas:      j<FaixaRV[]>('retracao_faixas', [{min:66,valor:700},{min:63,valor:400},{min:60,valor:300},{min:57,valor:200}]).sort((a,b)=>b.min-a.min),
      indispLimite:        s('indisp_limite'),
      indispValor:         s('indisp_valor'),
      tmaMmss:             segParaMMSS(parseInt(s('tma_limite_seg')) || 731),
      tmaValor:            s('tma_valor'),
      ticketFaixas:        j<FaixaRV[]>('ticket_faixas', [{min:-6,valor:200},{min:-9,valor:150},{min:-15,valor:100},{min:-18,valor:50}]).sort((a,b)=>b.min-a.min),
      ticketMinRetracao:   s('ticket_min_retracao'),
      pedidosMeta:         s('pedidos_meta'),
      churnMeta:           s('churn_meta'),
      bonusRetracaoMinima: s('bonus_retracao_minima'),
      bonusIndispMaxima:   s('bonus_indisp_maxima'),
    }
  })

  const upd = (k: keyof Estado) => (v: string | FaixaRV[]) =>
    setE(prev => ({ ...prev, [k]: v }))

  const [saving, startSave] = useTransition()
  const [ok, setOk]         = useState(false)
  const [erro, setErro]     = useState('')

  function handleSave() {
    setErro('')
    const dados: Record<string, string> = {
      abs_maximo:            e.absMaximo,
      bonus_valor:           e.bonusValor,
      horas_mensais:         e.horasMensais,
      retracao_faixas:       JSON.stringify(e.retracaoFaixas),
      indisp_limite:         e.indispLimite,
      indisp_valor:          e.indispValor,
      tma_limite_seg:        String(mmssParaSeg(e.tmaMmss)),
      tma_valor:             e.tmaValor,
      ticket_faixas:         JSON.stringify(e.ticketFaixas),
      ticket_min_retracao:   e.ticketMinRetracao,
      pedidos_meta:          e.pedidosMeta,
      churn_meta:            e.churnMeta,
      bonus_retracao_minima: e.bonusRetracaoMinima,
      bonus_indisp_maxima:   e.bonusIndispMaxima,
    }
    startSave(async () => {
      try {
        await salvarRVConfigAction(dados)
        setOk(true)
        setTimeout(() => setOk(false), 3000)
      } catch {
        setErro('Erro ao salvar. Tente novamente.')
      }
    })
  }

  const sectionTitle = (t: string) => (
    <h4 className="text-xs font-bold uppercase mb-3" style={{ color: 'var(--gold)', letterSpacing: '0.10em' }}>
      {t}
    </h4>
  )

  return (
    <div className="space-y-5">

      {/* ── Elegibilidade ── */}
      <div style={SECTION}>
        {sectionTitle('Elegibilidade')}
        <div className="grid grid-cols-2 gap-4">
          <Campo label="ABS máximo (%)" hint="Operadores acima deste valor são inelegíveis">
            <div className="flex items-center gap-1.5">
              <input type="number" value={e.absMaximo} step="0.5"
                onChange={ev => upd('absMaximo')(ev.target.value)} style={INPUT} />
              <span className="text-sm shrink-0" style={{ color: 'var(--text-muted)' }}>%</span>
            </div>
          </Campo>
          <Campo label="Valor do Bônus (R$)" hint="Bônus pago quando todos os 3 critérios são atingidos">
            <div className="flex items-center gap-1.5">
              <span className="text-xs shrink-0" style={{ color: 'var(--text-muted)' }}>R$</span>
              <input type="number" value={e.bonusValor} step="50"
                onChange={ev => upd('bonusValor')(ev.target.value)} style={INPUT} />
            </div>
          </Campo>
          <Campo label="Horas mensais esperadas" hint="Usado para calcular indisponibilidade estimada contestada (padrão: 132h)">
            <div className="flex items-center gap-1.5">
              <input type="number" value={e.horasMensais} step="1" min="1"
                onChange={ev => upd('horasMensais')(ev.target.value)} style={INPUT} />
              <span className="text-xs shrink-0" style={{ color: 'var(--text-muted)' }}>h</span>
            </div>
          </Campo>
        </div>
      </div>

      {/* ── TX de Retenção ── */}
      <div style={SECTION}>
        {sectionTitle('TX de Retenção — Faixas de Prêmio')}
        <p className="text-xs mb-3" style={{ color: 'var(--text-muted)' }}>
          Cada faixa paga o valor indicado quando a TX ≥ ao limiar. Somente a faixa mais alta atingida é paga.
        </p>
        <FaixaEditor
          faixas={e.retracaoFaixas}
          onChange={upd('retracaoFaixas') as (f: FaixaRV[]) => void}
          labelMin="%"
          step={3}
        />
      </div>

      {/* ── Regras operacionais ── */}
      <div style={SECTION}>
        {sectionTitle('Regras Operacionais')}
        <div className="grid grid-cols-2 gap-x-6 gap-y-4">
          <Campo label="Limite de Indisponibilidade (%)" hint="Igual ou abaixo → recebe o prêmio">
            <div className="flex items-center gap-1.5">
              <input type="number" value={e.indispLimite} step="0.5"
                onChange={ev => upd('indispLimite')(ev.target.value)} style={INPUT} />
              <span className="text-xs shrink-0" style={{ color: 'var(--text-muted)' }}>%</span>
            </div>
          </Campo>
          <Campo label="Prêmio Indisponibilidade (R$)">
            <div className="flex items-center gap-1.5">
              <span className="text-xs shrink-0" style={{ color: 'var(--text-muted)' }}>R$</span>
              <input type="number" value={e.indispValor} step="50"
                onChange={ev => upd('indispValor')(ev.target.value)} style={INPUT} />
            </div>
          </Campo>
          <Campo label="Limite de TMA (MM:SS)" hint="Abaixo deste valor → recebe o prêmio">
            <input
              type="text"
              placeholder="12:11"
              value={e.tmaMmss}
              onChange={ev => upd('tmaMmss')(ev.target.value)}
              style={INPUT}
            />
          </Campo>
          <Campo label="Prêmio TMA (R$)">
            <div className="flex items-center gap-1.5">
              <span className="text-xs shrink-0" style={{ color: 'var(--text-muted)' }}>R$</span>
              <input type="number" value={e.tmaValor} step="50"
                onChange={ev => upd('tmaValor')(ev.target.value)} style={INPUT} />
            </div>
          </Campo>
        </div>
      </div>

      {/* ── Variação de Ticket ── */}
      <div style={SECTION}>
        {sectionTitle('Variação de Ticket')}
        <div className="mb-4">
          <Campo label="TX Retenção mínima para qualificar (%)"
            hint="Operadores abaixo desta TX não recebem bônus de Ticket">
            <div className="flex items-center gap-1.5" style={{ maxWidth: 160 }}>
              <input type="number" value={e.ticketMinRetracao} step="1"
                onChange={ev => upd('ticketMinRetracao')(ev.target.value)} style={INPUT} />
              <span className="text-xs shrink-0" style={{ color: 'var(--text-muted)' }}>%</span>
            </div>
          </Campo>
        </div>
        <p className="text-xs mb-3" style={{ color: 'var(--text-muted)' }}>
          Use limiares negativos (ex: -6 significa ≥ -6%). Somente a faixa mais alta atingida é paga.
        </p>
        <FaixaEditor
          faixas={e.ticketFaixas}
          onChange={upd('ticketFaixas') as (f: FaixaRV[]) => void}
          labelMin="%"
          step={3}
        />
      </div>

      {/* ── Multiplicador de pedidos ── */}
      <div style={SECTION}>
        {sectionTitle('Multiplicador de Pedidos')}
        <p className="text-xs mb-3" style={{ color: 'var(--text-muted)' }}>
          RV Base × (pedidos realizados / meta). O multiplicador é limitado a 1,0 (100%).
        </p>
        <div className="grid grid-cols-2 gap-4">
          <Campo label="Meta de Pedidos do Mês" hint="Número absoluto de pedidos esperados">
            <input type="number" value={e.pedidosMeta} step="10"
              onChange={ev => upd('pedidosMeta')(ev.target.value)} style={INPUT} />
          </Campo>
          <Campo label="Meta de Churn do Mês" hint="0 = critério de churn desabilitado para o bônus">
            <input type="number" value={e.churnMeta} step="1"
              onChange={ev => upd('churnMeta')(ev.target.value)} style={INPUT} />
          </Campo>
        </div>
      </div>

      {/* ── Critérios do Bônus ── */}
      <div style={SECTION}>
        {sectionTitle('Critérios do Bônus')}
        <p className="text-xs mb-3" style={{ color: 'var(--text-muted)' }}>
          Os 3 critérios abaixo precisam ser atendidos simultaneamente para receber o bônus.
        </p>
        <div className="grid grid-cols-2 gap-4">
          <Campo label="TX Retenção mínima para bônus (%)">
            <div className="flex items-center gap-1.5">
              <input type="number" value={e.bonusRetracaoMinima} step="1"
                onChange={ev => upd('bonusRetracaoMinima')(ev.target.value)} style={INPUT} />
              <span className="text-xs shrink-0" style={{ color: 'var(--text-muted)' }}>%</span>
            </div>
          </Campo>
          <Campo label="Indisponibilidade máxima para bônus (%)">
            <div className="flex items-center gap-1.5">
              <input type="number" value={e.bonusIndispMaxima} step="0.5"
                onChange={ev => upd('bonusIndispMaxima')(ev.target.value)} style={INPUT} />
              <span className="text-xs shrink-0" style={{ color: 'var(--text-muted)' }}>%</span>
            </div>
          </Campo>
        </div>
      </div>

      {/* ── Botão salvar (sticky) ── */}
      <div
        className="flex items-center justify-between gap-4 flex-wrap"
        style={{
          position: 'sticky',
          bottom: 0,
          zIndex: 8,
          background: 'linear-gradient(0deg, rgba(5,5,8,0.98) 0%, rgba(5,5,8,0.90) 100%)',
          backdropFilter: 'blur(12px)',
          borderTop: '1px solid rgba(201,168,76,0.10)',
          padding: '0.875rem 0',
          marginTop: '0.5rem',
        }}
      >
        <button
          type="button"
          onClick={handleSave}
          disabled={saving}
          className="btn-primary flex items-center gap-2"
          style={{ opacity: saving ? 0.75 : 1, minWidth: '180px' }}
        >
          {saving ? (
            <span className="w-4 h-4 rounded-full border-2 border-[#050508]/30 border-t-[#050508] animate-spin" />
          ) : ok ? (
            <CheckCircle size={15} />
          ) : (
            <Save size={15} />
          )}
          {saving ? 'Salvando…' : ok ? 'Configurações salvas!' : 'Salvar configurações'}
        </button>

        {erro && (
          <div className="flex items-center gap-1.5 text-xs animate-shake" style={{ color: '#f87171' }}>
            <AlertTriangle size={13} />
            {erro}
          </div>
        )}
      </div>
    </div>
  )
}
