'use client'

import { useState, useTransition } from 'react'
import { Save, Plus, Trash2, CheckCircle, AlertTriangle, ShieldAlert, Check, X } from 'lucide-react'
import { HaloSpinner } from '@/components/HaloSpinner'
import type { FaixaRV, RVConfigRaw, PenalidadeRV, DescontoIndividual } from '@/lib/rv-utils'
import { mmssParaSeg, segParaMMSS, formatBRL } from '@/lib/rv-utils'
import type { Meta } from '@/lib/kpi-utils'
import { OPERADORES_DISPLAY, getAvatarStyle, getIniciaisNome } from '@/lib/operadores'
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
  penalidades: PenalidadeRV[]
  descontosIndividuais: DescontoIndividual[]
}

export default function RVConfigForm({ raw, metas }: { raw: RVConfigRaw; metas: Meta[] }) {
  const [e, setE] = useState<Estado>(() => {
    const j = <T,>(k: string, fb: T): T => {
      try { return JSON.parse(raw[k] ?? '') } catch { return fb }
    }
    const s = (k: string) => (raw[k] ?? '').trim()
    return {
      absMaximo:           s('abs_maximo'),
      bonusValor:          s('bonus_valor'),
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
      penalidades:         (() => {
        const saved: PenalidadeRV[] = j<PenalidadeRV[]>('penalidades', [])
        // Mescla metas existentes com penalidades salvas
        return metas.map((m) => {
          const found = saved.find((p) => p.metaId === m.id)
          return found ?? { metaId: m.id, metaLabel: m.label, ativa: false, percentual: 10 }
        })
      })(),
      descontosIndividuais: j<DescontoIndividual[]>('descontos_individuais', []),
    }
  })

  const upd = (k: keyof Estado) => (v: string | FaixaRV[]) =>
    setE(prev => ({ ...prev, [k]: v }))

  const [saving, startSave] = useTransition()
  const [ok, setOk]         = useState(false)
  const [erro, setErro]     = useState('')
  const [adicionandoDesconto, setAdicionandoDesconto] = useState(false)

  function handleSave() {
    setErro('')
    const dados: Record<string, string> = {
      abs_maximo:            e.absMaximo,
      bonus_valor:           e.bonusValor,
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
      penalidades:           JSON.stringify(e.penalidades),
      descontos_individuais: JSON.stringify(e.descontosIndividuais),
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

      {/* ── Penalidades por Meta Não Atingida ── */}
      <div style={SECTION}>
        {sectionTitle('Penalidades por Meta Não Atingida')}
        <p className="text-xs mb-4" style={{ color: 'var(--text-muted)' }}>
          Quando uma meta está <b style={{ color: '#f87171' }}>vermelha</b>, desconta o percentual configurado do RV total do operador.
          Ative apenas as metas que devem gerar penalidade.
        </p>
        {metas.length === 0 ? (
          <p className="text-xs" style={{ color: 'var(--text-muted)' }}>Nenhuma meta cadastrada. Acesse "Metas KPI" para adicionar.</p>
        ) : (
          <div className="space-y-2">
            {e.penalidades.map((pen, idx) => (
              <div
                key={pen.metaId}
                className="flex items-center gap-3 rounded-xl px-3 py-2.5 border transition-colors"
                style={{
                  background: pen.ativa ? 'rgba(239,68,68,0.04)' : 'rgba(255,255,255,0.02)',
                  borderColor: pen.ativa ? 'rgba(239,68,68,0.20)' : 'rgba(255,255,255,0.06)',
                }}
              >
                <button
                  type="button"
                  onClick={() => setE(prev => ({
                    ...prev,
                    penalidades: prev.penalidades.map((p, i) => i === idx ? { ...p, ativa: !p.ativa } : p),
                  }))}
                  className="w-9 h-5 rounded-full relative shrink-0 transition-colors"
                  style={{
                    background: pen.ativa ? '#ef4444' : 'rgba(255,255,255,0.08)',
                    border: '1px solid ' + (pen.ativa ? '#ef4444' : 'rgba(255,255,255,0.12)'),
                  }}
                  aria-checked={pen.ativa}
                  role="switch"
                >
                  <span
                    className="absolute top-0.5 w-3.5 h-3.5 rounded-full bg-white transition-all"
                    style={{ left: pen.ativa ? 'calc(100% - 1.125rem)' : '2px' }}
                  />
                </button>
                <span className="flex-1 text-sm truncate" style={{ color: pen.ativa ? 'var(--text-primary)' : 'var(--text-muted)' }}>
                  {pen.metaLabel}
                </span>
                <div className="flex items-center gap-1 shrink-0">
                  <span className="text-xs" style={{ color: 'var(--text-muted)' }}>−</span>
                  <input
                    type="number"
                    value={pen.percentual}
                    min={1}
                    max={100}
                    step={1}
                    disabled={!pen.ativa}
                    onChange={ev => setE(prev => ({
                      ...prev,
                      penalidades: prev.penalidades.map((p, i) =>
                        i === idx ? { ...p, percentual: parseFloat(ev.target.value) || 0 } : p
                      ),
                    }))}
                    style={{ ...INPUT, width: 56, opacity: pen.ativa ? 1 : 0.4 }}
                  />
                  <span className="text-xs shrink-0" style={{ color: 'var(--text-muted)' }}>%</span>
                </div>
              </div>
            ))}
          </div>
        )}
        {e.penalidades.some(p => p.ativa) && (
          <div className="flex items-center gap-2 mt-3 text-xs px-3 py-2 rounded-xl"
            style={{ background: 'rgba(239,68,68,0.06)', border: '1px solid rgba(239,68,68,0.15)', color: '#f87171' }}>
            <ShieldAlert size={12} />
            {e.penalidades.filter(p => p.ativa).length} penalidade(s) ativa(s).
            O RV final é calculado após deduzir as penalidades.
          </div>
        )}
      </div>

      {/* ── Descontos Individuais ── */}
      <div style={SECTION}>
        {sectionTitle('Descontos Individuais')}
        <p className="text-xs mb-4" style={{ color: 'var(--text-muted)' }}>
          Descontos pontuais aplicados a operadores específicos em um determinado mês.
          Deduzidos do RV após penalidades e bônus.
        </p>

        {/* Lista de descontos */}
        {e.descontosIndividuais.length > 0 && (
          <div className="space-y-2 mb-4">
            {e.descontosIndividuais.map((d) => (
              <div
                key={d.id}
                className="flex items-center gap-3 rounded-xl border px-3 py-2.5"
                style={{ background: 'rgba(239,68,68,0.04)', borderColor: 'rgba(239,68,68,0.15)' }}
              >
                <span
                  className="w-7 h-7 rounded-lg flex items-center justify-center text-[9px] font-bold shrink-0 border-2"
                  style={getAvatarStyle(d.operadorId)}
                >
                  {getIniciaisNome(d.operadorNome)}
                </span>
                <div className="flex-1 min-w-0">
                  <p className="text-xs font-semibold truncate" style={{ color: 'var(--text-primary)' }}>{d.operadorNome}</p>
                  <p className="text-[10px] truncate" style={{ color: 'var(--text-muted)' }}>
                    {d.motivo} · {d.mesReferencia}
                  </p>
                </div>
                <span className="text-xs font-bold shrink-0" style={{ color: '#f87171' }}>
                  −{d.tipo === 'fixo' ? formatBRL(d.valor) : `${d.valor}%`}
                </span>
                <button
                  type="button"
                  onClick={() => setE(prev => ({
                    ...prev,
                    descontosIndividuais: prev.descontosIndividuais.filter(x => x.id !== d.id),
                  }))}
                  className="p-1 rounded transition-colors shrink-0"
                  style={{ color: 'var(--text-muted)' }}
                  onMouseEnter={ev => ((ev.currentTarget as HTMLElement).style.color = '#f87171')}
                  onMouseLeave={ev => ((ev.currentTarget as HTMLElement).style.color = 'var(--text-muted)')}
                >
                  <Trash2 size={13} />
                </button>
              </div>
            ))}
          </div>
        )}

        {/* Formulário inline */}
        {adicionandoDesconto ? (
          <DescontoForm
            onSalvar={(d) => {
              setE(prev => ({ ...prev, descontosIndividuais: [...prev.descontosIndividuais, d] }))
              setAdicionandoDesconto(false)
            }}
            onCancelar={() => setAdicionandoDesconto(false)}
          />
        ) : (
          <button
            type="button"
            onClick={() => setAdicionandoDesconto(true)}
            className="flex items-center gap-1.5 text-xs px-2.5 py-1 rounded-lg"
            style={{
              color: 'var(--gold-light)',
              background: 'rgba(201,168,76,0.06)',
              border: '1px solid rgba(201,168,76,0.15)',
            }}
          >
            <Plus size={11} /> Adicionar desconto individual
          </button>
        )}
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
            <HaloSpinner size="sm" />
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

// ── Formulário de novo desconto individual ────────────────────────────────────

function DescontoForm({
  onSalvar,
  onCancelar,
}: {
  onSalvar: (d: DescontoIndividual) => void
  onCancelar: () => void
}) {
  const mesAtual = new Date().toISOString().slice(0, 7)
  const [opId,   setOpId]   = useState<number>(OPERADORES_DISPLAY[0]?.id ?? 0)
  const [motivo, setMotivo] = useState('')
  const [tipo,   setTipo]   = useState<'fixo' | 'percentual'>('fixo')
  const [valor,  setValor]  = useState('')
  const [mes,    setMes]    = useState(mesAtual)

  function handleAdd() {
    const op = OPERADORES_DISPLAY.find(o => o.id === opId)
    if (!op || !motivo.trim() || !valor) return
    onSalvar({
      id: Date.now().toString(36),
      operadorId: opId,
      operadorNome: op.nome,
      motivo: motivo.trim(),
      tipo,
      valor: parseFloat(valor) || 0,
      mesReferencia: mes,
    })
  }

  return (
    <div
      className="rounded-xl border p-4 space-y-3"
      style={{ background: 'rgba(239,68,68,0.04)', borderColor: 'rgba(239,68,68,0.18)' }}
    >
      <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
        <Campo label="Operador">
          <select
            value={opId}
            onChange={ev => setOpId(Number(ev.target.value))}
            style={INPUT}
          >
            {OPERADORES_DISPLAY.map(op => (
              <option key={op.id} value={op.id}>{op.nome}</option>
            ))}
          </select>
        </Campo>

        <Campo label="Mês de referência">
          <input
            type="month"
            value={mes}
            onChange={ev => setMes(ev.target.value)}
            style={INPUT}
          />
        </Campo>

        <Campo label="Motivo" hint="Aparece no breakdown do operador">
          <input
            type="text"
            placeholder="ex: Feedback negativo, advertência…"
            value={motivo}
            onChange={ev => setMotivo(ev.target.value)}
            style={INPUT}
          />
        </Campo>

        <Campo label="Valor do desconto">
          <div className="flex items-center gap-2">
            <button
              type="button"
              onClick={() => setTipo(tipo === 'fixo' ? 'percentual' : 'fixo')}
              className="shrink-0 text-xs px-2 py-1.5 rounded-lg border transition-colors"
              style={{
                background: 'rgba(201,168,76,0.06)',
                borderColor: 'rgba(201,168,76,0.18)',
                color: 'var(--gold-light)',
                minWidth: 36,
              }}
            >
              {tipo === 'fixo' ? 'R$' : '%'}
            </button>
            <input
              type="number"
              min="0"
              step={tipo === 'fixo' ? 50 : 1}
              placeholder="0"
              value={valor}
              onChange={ev => setValor(ev.target.value)}
              style={INPUT}
            />
          </div>
        </Campo>
      </div>

      <div className="flex gap-2">
        <button
          type="button"
          onClick={handleAdd}
          disabled={!motivo.trim() || !valor}
          className="btn-primary flex items-center gap-1.5 text-xs py-1.5"
          style={{ opacity: (!motivo.trim() || !valor) ? 0.5 : 1 }}
        >
          <Check size={13} /> Adicionar
        </button>
        <button
          type="button"
          onClick={onCancelar}
          className="btn-ghost flex items-center gap-1.5 text-xs py-1.5"
        >
          <X size={13} /> Cancelar
        </button>
      </div>
    </div>
  )
}
