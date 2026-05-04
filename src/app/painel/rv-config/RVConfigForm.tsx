'use client'

import { useState, useTransition } from 'react'
import { Plus, Trash2, Check, X, ShieldAlert } from 'lucide-react'
import type { FaixaRV, RVConfigRaw, PenalidadeRV, DescontoIndividual } from '@/lib/rv-utils'
import { mmssParaSeg, segParaMMSS, formatBRL } from '@/lib/rv-utils'
import type { Meta } from '@/lib/kpi-utils'
import { OPERADORES_DISPLAY, getAvatarStyle, getIniciaisNome } from '@/lib/operadores'
import { salvarRVConfigAction } from './actions'
import { PainelSectionTitle } from '@/components/painel/PainelSectionTitle'

const FF_SYNE = 'var(--ff-syne)'
const FF_DM   = 'var(--ff-body)'

// ── Design tokens ──────────────────────────────────────────────────────────────

const CARD: React.CSSProperties = {
  background: '#070714',
  border: '1px solid rgba(244,212,124,0.10)',
  borderRadius: '20px',
  padding: '24px 28px',
}

const INPUT_BASE: React.CSSProperties = {
  background: '#03040C',
  border: '1px solid rgba(114,112,143,0.5)',
  borderRadius: '10px',
  color: '#A6A2A2',
  fontFamily: FF_DM,
  fontWeight: 500,
  fontSize: '13px',
  fontVariantNumeric: 'tabular-nums',
  padding: '7px 10px',
  outline: 'none',
  width: '100%',
}

const LBL: React.CSSProperties = {
  fontFamily: FF_SYNE,
  fontSize: '10px',
  fontWeight: 600,
  textTransform: 'uppercase',
  letterSpacing: '0.10em',
  color: '#474658',
  marginBottom: '6px',
  display: 'block',
}

const HINT: React.CSSProperties = {
  fontFamily: FF_SYNE,
  fontSize: '10px',
  fontWeight: 600,
  color: '#72708F',
  marginTop: '5px',
  display: 'block',
}

const UNIT: React.CSSProperties = {
  fontFamily: FF_SYNE,
  fontSize: '11px',
  fontWeight: 600,
  textTransform: 'uppercase',
  color: '#72708F',
  flexShrink: 0,
}

const DESC: React.CSSProperties = {
  fontFamily: FF_DM,
  fontSize: '12px',
  color: '#72708F',
  lineHeight: 1.6,
  maxWidth: '640px',
  marginBottom: '20px',
}

type Toast = { tipo: 'ok' | 'erro'; msg: string } | null

// ── Helpers ────────────────────────────────────────────────────────────────────

function DivisorSecao() {
  return <div style={{ height: '1px', background: '#211F3C', margin: '40px 0' }} />
}

function Campo({ label, hint, children }: {
  label: string; hint?: string; children: React.ReactNode
}) {
  return (
    <div>
      <span style={LBL}>{label}</span>
      {children}
      {hint && <span style={HINT}>{hint}</span>}
    </div>
  )
}

function InputComUnidade({ unit, children }: { unit: string; children: React.ReactNode }) {
  return (
    <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
      <div style={{ flex: 1, minWidth: 0 }}>{children}</div>
      <span style={UNIT}>{unit}</span>
    </div>
  )
}

function Spinner() {
  return (
    <span className="animate-spin" style={{
      width: '11px', height: '11px', borderRadius: '50%',
      border: '2px solid rgba(232,201,109,0.25)',
      borderTopColor: '#e8c96d', display: 'inline-block', flexShrink: 0,
    }} />
  )
}

// ── FaixaEditor ────────────────────────────────────────────────────────────────

function FaixaEditor({ faixas, onChange, labelMin, step = 1, labelValor = 'VALOR (R$)', sortAsc = false }: {
  faixas: FaixaRV[]
  onChange: (f: FaixaRV[]) => void
  labelMin: string
  step?: number
  labelValor?: string
  sortAsc?: boolean
}) {
  const sorter = (a: FaixaRV, b: FaixaRV) => sortAsc ? a.min - b.min : b.min - a.min
  const atualizar = (idx: number, campo: keyof FaixaRV, val: string) => {
    const novas = faixas.map((f, i) =>
      i === idx ? { ...f, [campo]: parseFloat(val) || 0 } : f
    )
    onChange(novas.sort(sorter))
  }
  const remover   = (idx: number) => onChange(faixas.filter((_, i) => i !== idx))
  const adicionar = () => {
    const last = faixas[faixas.length - 1]
    const newMin = sortAsc ? (last?.min ?? 0) + step : (last?.min ?? 0) - step
    onChange([...faixas, { min: newMin, valor: 0 }].sort(sorter))
  }

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
      {faixas.length > 0 && (
        <div style={{ display: 'flex', alignItems: 'center', gap: '8px', paddingLeft: '20px' }}>
          <span style={{ ...LBL, marginBottom: 0, width: '80px' }}>MIN</span>
          <span style={{ width: '36px' }} />
          <span style={{ ...LBL, marginBottom: 0, width: '96px' }}>{labelValor}</span>
        </div>
      )}
      {faixas.map((f, i) => (
        <div key={i} style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
          <span style={{ fontFamily: FF_DM, fontSize: '13px', color: '#72708F', width: '12px', textAlign: 'center', flexShrink: 0 }}>≥</span>
          <input
            type="number" value={f.min} step={step}
            onChange={e => atualizar(i, 'min', e.target.value)}
            style={{ ...INPUT_BASE, width: '80px', flexShrink: 0 }}
          />
          <span style={{ ...UNIT, width: '20px' }}>{labelMin}</span>
          <span style={{ fontFamily: FF_DM, fontSize: '12px', color: '#72708F', width: '20px', textAlign: 'center' }}>→</span>
          <input
            type="number" value={f.valor} step={50}
            onChange={e => atualizar(i, 'valor', e.target.value)}
            style={{ ...INPUT_BASE, width: '96px', flexShrink: 0 }}
          />
          <button
            type="button" onClick={() => remover(i)}
            style={{ background: 'none', border: 'none', cursor: 'pointer', padding: '4px', color: '#474658', flexShrink: 0 }}
            onMouseEnter={ev => ((ev.currentTarget as HTMLElement).style.color = '#f87171')}
            onMouseLeave={ev => ((ev.currentTarget as HTMLElement).style.color = '#474658')}
          >
            <X size={14} />
          </button>
        </div>
      ))}
      <button
        type="button" onClick={adicionar}
        style={{
          fontFamily: FF_SYNE, fontWeight: 700, fontSize: '10px',
          textTransform: 'uppercase', letterSpacing: '0.08em',
          display: 'inline-flex', alignItems: 'center', gap: '5px',
          background: 'rgba(201,168,76,0.06)', border: '1px solid rgba(201,168,76,0.18)',
          borderRadius: '8px', padding: '5px 12px',
          color: '#e8c96d', cursor: 'pointer', marginTop: '4px', alignSelf: 'flex-start',
        }}
      >
        <Plus size={11} /> ADICIONAR FAIXA
      </button>
    </div>
  )
}

// ── Estado ─────────────────────────────────────────────────────────────────────

interface Estado {
  absMaximo: string
  faltasLimite: string
  bonusValor: string
  retracaoFaixas: FaixaRV[]
  indispLimite: string
  indispValor: string
  tmaMmss: string
  tmaValor: string
  ticketFaixas: FaixaRV[]
  ticketMinRetracao: string
  pedidosMeta: string
  churnMeta: string
  pedidosMultiplicadorMax: string
  bonusRetracaoMinima: string
  bonusIndispMaxima: string
  penalidades: PenalidadeRV[]
  descontosIndividuais: DescontoIndividual[]
  // Gestor
  gestorMonitoriasMinimas: string
  gestorRetencaoFaixas: FaixaRV[]
  gestorIndispMeta: string
  gestorIndispValor: string
  gestorTmaMmss: string
  gestorTmaValor: string
  gestorTicketMinRetracao: string
  gestorTicketFaixas: FaixaRV[]
  gestorBonusRetencaoMin: string
  gestorBonusAbsMax: string
  gestorBonusPercentual: string
  gestorTmaDeflatorPct: string
  gestorTmaDeflatorPerda: string
  gestorIndispDeflatorPerda: string
  gestorAbsDeflatorFaixas: FaixaRV[]
}

// ── Componente principal ───────────────────────────────────────────────────────

export default function RVConfigForm({ raw, metas }: { raw: RVConfigRaw; metas: Meta[] }) {
  const [e, setE] = useState<Estado>(() => {
    const j = <T,>(k: string, fb: T): T => {
      try { return JSON.parse(raw[k] ?? '') } catch { return fb }
    }
    const s = (k: string, def = '') => (raw[k] ?? def).trim()
    return {
      absMaximo:               s('abs_maximo', '5'),
      faltasLimite:            s('faltas_limite', '2'),
      bonusValor:              s('bonus_valor', '300'),
      retracaoFaixas:          j<FaixaRV[]>('retracao_faixas', [{min:66,valor:700},{min:63,valor:400},{min:60,valor:300},{min:57,valor:200}]).sort((a,b)=>b.min-a.min),
      indispLimite:            s('indisp_limite', '14.5'),
      indispValor:             s('indisp_valor', '150'),
      tmaMmss:                 segParaMMSS(parseInt(s('tma_limite_seg', '731')) || 731),
      tmaValor:                s('tma_valor', '150'),
      ticketFaixas:            j<FaixaRV[]>('ticket_faixas', [{min:-6,valor:200},{min:-9,valor:150},{min:-15,valor:100},{min:-18,valor:50}]).sort((a,b)=>b.min-a.min),
      ticketMinRetracao:       s('ticket_min_retracao', '60'),
      pedidosMeta:             s('pedidos_meta', '260'),
      churnMeta:               s('churn_meta', '0'),
      pedidosMultiplicadorMax: s('pedidos_multiplicador_max', '1'),
      bonusRetracaoMinima:     s('bonus_retracao_minima', '66'),
      bonusIndispMaxima:       s('bonus_indisp_maxima', '14.5'),
      penalidades: (() => {
        const saved: PenalidadeRV[] = j<PenalidadeRV[]>('penalidades', [])
        return metas.map(m => {
          const found = saved.find(p => p.metaId === m.id)
          return found ?? { metaId: m.id, metaLabel: m.label, ativa: false, percentual: 10 }
        })
      })(),
      descontosIndividuais: j<DescontoIndividual[]>('descontos_individuais', []),
      gestorMonitoriasMinimas: s('gestor_monitorias_minimas', '13'),
      gestorRetencaoFaixas: j<FaixaRV[]>('gestor_retracao_faixas', [{min:65,valor:800},{min:63,valor:500},{min:60,valor:400},{min:58,valor:200}]).sort((a,b)=>b.min-a.min),
      gestorIndispMeta: s('gestor_indisp_meta', '14.5'),
      gestorIndispValor: s('gestor_indisp_valor', '200'),
      gestorTmaMmss: segParaMMSS(parseInt(s('gestor_tma_meta_seg', '731')) || 731),
      gestorTmaValor: s('gestor_tma_valor', '200'),
      gestorTicketMinRetracao: s('gestor_ticket_min_retracao', '60'),
      gestorTicketFaixas: j<FaixaRV[]>('gestor_ticket_faixas', [{min:-12,valor:300},{min:-15,valor:200},{min:-18,valor:100}]).sort((a,b)=>b.min-a.min),
      gestorBonusRetencaoMin: s('gestor_bonus_retracao_min', '63.6'),
      gestorBonusAbsMax: s('gestor_bonus_abs_max', '5'),
      gestorBonusPercentual: s('gestor_bonus_percentual', '20'),
      gestorTmaDeflatorPct: s('gestor_tma_deflator_pct', '5'),
      gestorTmaDeflatorPerda: s('gestor_tma_deflator_perda', '15'),
      gestorIndispDeflatorPerda: s('gestor_indisp_deflator_perda', '15'),
      gestorAbsDeflatorFaixas: (() => {
        const fs = j<Array<{limite: number; perda: number}>>('gestor_abs_deflator_faixas', [
          {limite:5,perda:0},{limite:6,perda:10},{limite:8,perda:20},{limite:10,perda:30},{limite:999,perda:50},
        ])
        return fs.map(f => ({ min: f.limite, valor: f.perda })).sort((a,b) => a.min - b.min)
      })(),
    }
  })

  const upd = (k: keyof Estado) => (v: string | FaixaRV[]) => setE(prev => ({ ...prev, [k]: v }))

  const [saving, startSave] = useTransition()
  const [toast, setToast]   = useState<Toast>(null)
  const [adicionandoDesconto, setAdicionandoDesconto] = useState(false)

  function showToast(t: Toast) {
    setToast(t)
    if (t) setTimeout(() => setToast(null), 3500)
  }

  function handleSave() {
    const dados: Record<string, string> = {
      abs_maximo:               e.absMaximo,
      faltas_limite:            e.faltasLimite,
      bonus_valor:              e.bonusValor,
      retracao_faixas:          JSON.stringify(e.retracaoFaixas),
      indisp_limite:            e.indispLimite,
      indisp_valor:             e.indispValor,
      tma_limite_seg:           String(mmssParaSeg(e.tmaMmss)),
      tma_valor:                e.tmaValor,
      ticket_faixas:            JSON.stringify(e.ticketFaixas),
      ticket_min_retracao:      e.ticketMinRetracao,
      pedidos_meta:             e.pedidosMeta,
      churn_meta:               e.churnMeta,
      pedidos_multiplicador_max: e.pedidosMultiplicadorMax,
      bonus_retracao_minima:    e.bonusRetracaoMinima,
      bonus_indisp_maxima:      e.bonusIndispMaxima,
      penalidades:              JSON.stringify(e.penalidades),
      descontos_individuais:    JSON.stringify(e.descontosIndividuais),
      gestor_monitorias_minimas:    e.gestorMonitoriasMinimas,
      gestor_retracao_faixas:       JSON.stringify(e.gestorRetencaoFaixas),
      gestor_indisp_meta:           e.gestorIndispMeta,
      gestor_indisp_valor:          e.gestorIndispValor,
      gestor_tma_meta_seg:          String(mmssParaSeg(e.gestorTmaMmss)),
      gestor_tma_valor:             e.gestorTmaValor,
      gestor_ticket_min_retracao:   e.gestorTicketMinRetracao,
      gestor_ticket_faixas:         JSON.stringify(e.gestorTicketFaixas),
      gestor_bonus_retracao_min:    e.gestorBonusRetencaoMin,
      gestor_bonus_abs_max:         e.gestorBonusAbsMax,
      gestor_bonus_percentual:      e.gestorBonusPercentual,
      gestor_tma_deflator_pct:      e.gestorTmaDeflatorPct,
      gestor_tma_deflator_perda:    e.gestorTmaDeflatorPerda,
      gestor_indisp_deflator_perda: e.gestorIndispDeflatorPerda,
      gestor_abs_deflator_faixas:   JSON.stringify(e.gestorAbsDeflatorFaixas.map(f => ({ limite: f.min, perda: f.valor }))),
    }
    startSave(async () => {
      try {
        await salvarRVConfigAction(dados)
        showToast({ tipo: 'ok', msg: 'Configurações salvas com sucesso.' })
      } catch {
        showToast({ tipo: 'erro', msg: 'Erro ao salvar. Tente novamente.' })
      }
    })
  }

  return (
    <>
      {/* Toast HALO */}
      {toast && (
        <div style={{
          position: 'fixed', bottom: '24px', right: '24px', zIndex: 50,
          background: toast.tipo === 'ok' ? 'rgba(106,196,73,0.12)' : 'rgba(239,68,68,0.12)',
          border: `1px solid ${toast.tipo === 'ok' ? 'rgba(106,196,73,0.4)' : 'rgba(239,68,68,0.4)'}`,
          borderRadius: '10px', padding: '12px 18px',
          fontFamily: FF_SYNE, fontWeight: 600, fontSize: '13px', letterSpacing: '0.04em',
          color: toast.tipo === 'ok' ? '#4ade80' : '#f87171',
          pointerEvents: 'none',
        }}>
          {toast.msg}
        </div>
      )}

      <div style={{ display: 'flex', flexDirection: 'column' }}>

        {/* ── ELEGIBILIDADE ── */}
        <div style={CARD}>
          <div style={{ marginBottom: '16px' }}><PainelSectionTitle>ELEGIBILIDADE</PainelSectionTitle></div>
          <p style={DESC}>
            Defina os critérios que tornam um operador inelegível para receber RV.
            Operador inelegível tem todos os componentes zerados.
          </p>
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: '20px' }}>
            <Campo label="ABS MÁXIMO" hint="Inelegível se ABS acima deste valor">
              <InputComUnidade unit="%">
                <input type="number" value={e.absMaximo} step="0.5"
                  onChange={ev => upd('absMaximo')(ev.target.value)} style={INPUT_BASE} />
              </InputComUnidade>
            </Campo>
            <Campo label="FALTAS MÁXIMAS" hint="Inelegível se tiver X ou mais faltas no mês">
              <input type="number" value={e.faltasLimite} min="1" step="1"
                onChange={ev => upd('faltasLimite')(ev.target.value)} style={INPUT_BASE} />
            </Campo>
            <Campo label="VALOR DO BÔNUS" hint="Pago quando os 3 critérios são atingidos simultaneamente">
              <InputComUnidade unit="R$">
                <input type="number" value={e.bonusValor} step="50"
                  onChange={ev => upd('bonusValor')(ev.target.value)} style={INPUT_BASE} />
              </InputComUnidade>
            </Campo>
          </div>
        </div>

        <DivisorSecao />

        {/* ── FAIXAS DE TX. RETENÇÃO ── */}
        <div style={CARD}>
          <div style={{ marginBottom: '16px' }}><PainelSectionTitle>FAIXAS DE TX. RETENÇÃO</PainelSectionTitle></div>
          <p style={DESC}>
            Cada faixa paga o valor indicado quando a TX de Retenção ≥ ao limiar.
            Somente a faixa mais alta atingida é paga.
          </p>
          <FaixaEditor
            faixas={e.retracaoFaixas}
            onChange={upd('retracaoFaixas') as (f: FaixaRV[]) => void}
            labelMin="%" step={3}
          />
        </div>

        <DivisorSecao />

        {/* ── REGRAS OPERACIONAIS ── */}
        <div style={CARD}>
          <div style={{ marginBottom: '16px' }}><PainelSectionTitle>REGRAS OPERACIONAIS</PainelSectionTitle></div>
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(2, 1fr)', gap: '20px' }}>
            <Campo label="LIMITE DE INDISPONIBILIDADE" hint="Igual ou abaixo → recebe o prêmio">
              <InputComUnidade unit="%">
                <input type="number" value={e.indispLimite} step="0.5"
                  onChange={ev => upd('indispLimite')(ev.target.value)} style={INPUT_BASE} />
              </InputComUnidade>
            </Campo>
            <Campo label="PRÊMIO INDISPONIBILIDADE">
              <InputComUnidade unit="R$">
                <input type="number" value={e.indispValor} step="50"
                  onChange={ev => upd('indispValor')(ev.target.value)} style={INPUT_BASE} />
              </InputComUnidade>
            </Campo>
            <Campo label="LIMITE DE TMA (MM:SS)" hint="Abaixo deste valor → recebe o prêmio">
              <input type="text" placeholder="12:11" value={e.tmaMmss}
                onChange={ev => upd('tmaMmss')(ev.target.value)} style={INPUT_BASE} />
            </Campo>
            <Campo label="PRÊMIO TMA">
              <InputComUnidade unit="R$">
                <input type="number" value={e.tmaValor} step="50"
                  onChange={ev => upd('tmaValor')(ev.target.value)} style={INPUT_BASE} />
              </InputComUnidade>
            </Campo>
          </div>
        </div>

        <DivisorSecao />

        {/* ── VARIAÇÃO DE TICKET ── */}
        <div style={CARD}>
          <div style={{ marginBottom: '16px' }}><PainelSectionTitle>VARIAÇÃO DE TICKET</PainelSectionTitle></div>
          <div style={{ marginBottom: '20px', maxWidth: '260px' }}>
            <Campo label="TX RETENÇÃO MÍNIMA PARA QUALIFICAR"
              hint="Abaixo desta TX não recebe bônus de ticket">
              <InputComUnidade unit="%">
                <input type="number" value={e.ticketMinRetracao} step="1"
                  onChange={ev => upd('ticketMinRetracao')(ev.target.value)} style={INPUT_BASE} />
              </InputComUnidade>
            </Campo>
          </div>
          <p style={{ ...DESC, marginBottom: '16px' }}>
            Use limiares negativos (ex: −6 significa ≥ −6%). Somente a faixa mais alta atingida é paga.
          </p>
          <FaixaEditor
            faixas={e.ticketFaixas}
            onChange={upd('ticketFaixas') as (f: FaixaRV[]) => void}
            labelMin="%" step={3}
          />
        </div>

        <DivisorSecao />

        {/* ── MULTIPLICADOR DE PEDIDOS ── */}
        <div style={CARD}>
          <div style={{ marginBottom: '16px' }}><PainelSectionTitle>MULTIPLICADOR DE PEDIDOS</PainelSectionTitle></div>
          <p style={DESC}>
            RV Base × (pedidos realizados ÷ meta individual). A meta individual de pedidos de cada operador
            é lida da coluna configurada em <strong style={{ color: '#A6A2A2' }}>AJUSTE DE KPI</strong>.
            O resultado é limitado ao multiplicador máximo configurado.
          </p>
          <div style={{ maxWidth: '240px' }}>
            <Campo label="MULTIPLICADOR MÁXIMO"
              hint="1.0 = 100%. 1.2 = permite até 120% quando pedidos superam a meta.">
              <input type="number" value={e.pedidosMultiplicadorMax} step="0.05" min="0.1"
                onChange={ev => upd('pedidosMultiplicadorMax')(ev.target.value)} style={INPUT_BASE} />
            </Campo>
          </div>
        </div>

        <DivisorSecao />

        {/* ── CRITÉRIOS DO BÔNUS ── */}
        <div style={CARD}>
          <div style={{ marginBottom: '16px' }}><PainelSectionTitle>CRITÉRIOS DO BÔNUS</PainelSectionTitle></div>
          <p style={DESC}>
            Os 3 critérios precisam ser atendidos simultaneamente para o bônus ser pago.
            O critério de churn usa a meta individual de cada operador configurada em{' '}
            <strong style={{ color: '#A6A2A2' }}>AJUSTE DE KPI</strong>.
          </p>
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(2, 1fr)', gap: '20px' }}>
            <Campo label="TX RETENÇÃO MÍNIMA PARA BÔNUS">
              <InputComUnidade unit="%">
                <input type="number" value={e.bonusRetracaoMinima} step="1"
                  onChange={ev => upd('bonusRetracaoMinima')(ev.target.value)} style={INPUT_BASE} />
              </InputComUnidade>
            </Campo>
            <Campo label="INDISPONIBILIDADE MÁXIMA PARA BÔNUS">
              <InputComUnidade unit="%">
                <input type="number" value={e.bonusIndispMaxima} step="0.5"
                  onChange={ev => upd('bonusIndispMaxima')(ev.target.value)} style={INPUT_BASE} />
              </InputComUnidade>
            </Campo>
          </div>
        </div>

        <DivisorSecao />

        {/* ── PENALIDADES ── */}
        <div style={CARD}>
          <div style={{ marginBottom: '16px' }}><PainelSectionTitle>PENALIDADES</PainelSectionTitle></div>
          <p style={DESC}>
            Quando uma meta está <strong style={{ color: '#f87171' }}>vermelha</strong>, desconta o percentual configurado do RV total.
            Ative apenas as metas que devem gerar penalidade.
          </p>
          {metas.length === 0 ? (
            <p style={{ fontFamily: FF_DM, fontSize: '12px', color: '#72708F' }}>
              Nenhuma meta cadastrada. Acesse "Ajuste de KPI" para adicionar.
            </p>
          ) : (
            <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
              {e.penalidades.map((pen, idx) => (
                <div
                  key={pen.metaId}
                  style={{
                    display: 'flex', alignItems: 'center', gap: '12px',
                    background: pen.ativa ? 'rgba(239,68,68,0.04)' : 'rgba(255,255,255,0.02)',
                    border: `1px solid ${pen.ativa ? 'rgba(239,68,68,0.20)' : 'rgba(255,255,255,0.06)'}`,
                    borderRadius: '12px', padding: '10px 14px',
                  }}
                >
                  <button
                    type="button"
                    onClick={() => setE(prev => ({
                      ...prev,
                      penalidades: prev.penalidades.map((p, i) => i === idx ? { ...p, ativa: !p.ativa } : p),
                    }))}
                    role="switch"
                    aria-checked={pen.ativa}
                    style={{
                      width: '36px', height: '20px', borderRadius: '10px',
                      position: 'relative', flexShrink: 0, cursor: 'pointer',
                      background: pen.ativa ? '#ef4444' : 'rgba(255,255,255,0.08)',
                      border: `1px solid ${pen.ativa ? '#ef4444' : 'rgba(255,255,255,0.12)'}`,
                    }}
                  >
                    <span style={{
                      position: 'absolute', top: '2px',
                      left: pen.ativa ? 'calc(100% - 18px)' : '2px',
                      width: '14px', height: '14px', borderRadius: '50%',
                      background: '#fff', transition: 'left 150ms',
                    }} />
                  </button>
                  <span style={{
                    fontFamily: FF_SYNE, fontSize: '11px', fontWeight: 600,
                    textTransform: 'uppercase', letterSpacing: '0.06em',
                    color: pen.ativa ? '#A6A2A2' : '#474658', flex: 1, minWidth: 0,
                  }}>
                    {pen.metaLabel}
                  </span>
                  <div style={{ display: 'flex', alignItems: 'center', gap: '6px', flexShrink: 0 }}>
                    <span style={{ fontFamily: FF_DM, fontSize: '13px', color: '#72708F' }}>−</span>
                    <input
                      type="number" value={pen.percentual} min={1} max={100} step={1}
                      disabled={!pen.ativa}
                      onChange={ev => setE(prev => ({
                        ...prev,
                        penalidades: prev.penalidades.map((p, i) =>
                          i === idx ? { ...p, percentual: parseFloat(ev.target.value) || 0 } : p
                        ),
                      }))}
                      style={{ ...INPUT_BASE, width: '56px', opacity: pen.ativa ? 1 : 0.4 }}
                    />
                    <span style={UNIT}>%</span>
                  </div>
                </div>
              ))}
            </div>
          )}
          {e.penalidades.some(p => p.ativa) && (
            <div style={{
              display: 'flex', alignItems: 'center', gap: '8px', marginTop: '12px',
              background: 'rgba(239,68,68,0.06)', border: '1px solid rgba(239,68,68,0.15)',
              borderRadius: '10px', padding: '10px 14px',
              fontFamily: FF_SYNE, fontWeight: 600, fontSize: '11px',
              color: '#f87171', letterSpacing: '0.04em',
            }}>
              <ShieldAlert size={13} style={{ flexShrink: 0 }} />
              {e.penalidades.filter(p => p.ativa).length} PENALIDADE(S) ATIVA(S) — RV FINAL DEDUZIDO APÓS PENALIDADES.
            </div>
          )}
        </div>

        <DivisorSecao />

        {/* ── DESCONTOS INDIVIDUAIS ── */}
        <div style={CARD}>
          <div style={{ marginBottom: '16px' }}><PainelSectionTitle>DESCONTOS INDIVIDUAIS</PainelSectionTitle></div>
          <p style={DESC}>
            Descontos pontuais aplicados a operadores específicos em um determinado mês.
            Deduzidos do RV final após penalidades e bônus.
          </p>

          {e.descontosIndividuais.length > 0 && (
            <div style={{ display: 'flex', flexDirection: 'column', gap: '8px', marginBottom: '16px' }}>
              {e.descontosIndividuais.map(d => (
                <div
                  key={d.id}
                  style={{
                    display: 'flex', alignItems: 'center', gap: '12px',
                    background: 'rgba(239,68,68,0.04)', border: '1px solid rgba(239,68,68,0.15)',
                    borderRadius: '12px', padding: '10px 14px',
                  }}
                >
                  <span
                    style={{
                      width: '28px', height: '28px', borderRadius: '8px', flexShrink: 0,
                      display: 'flex', alignItems: 'center', justifyContent: 'center',
                      fontSize: '9px', fontWeight: 700, border: '2px solid',
                      ...getAvatarStyle(d.operadorId),
                    }}
                  >
                    {getIniciaisNome(d.operadorNome)}
                  </span>
                  <div style={{ flex: 1, minWidth: 0 }}>
                    <p style={{
                      fontFamily: FF_SYNE, fontSize: '11px', fontWeight: 600,
                      color: '#A6A2A2', textTransform: 'uppercase', letterSpacing: '0.04em',
                    }}>
                      {d.operadorNome}
                    </p>
                    <p style={{ fontFamily: FF_DM, fontSize: '11px', color: '#72708F', marginTop: '2px' }}>
                      {d.motivo} · {d.mesReferencia}
                    </p>
                  </div>
                  <span style={{ fontFamily: FF_DM, fontSize: '13px', fontWeight: 700, color: '#f87171', flexShrink: 0 }}>
                    −{d.tipo === 'fixo' ? formatBRL(d.valor) : `${d.valor}%`}
                  </span>
                  <button
                    type="button"
                    onClick={() => setE(prev => ({
                      ...prev,
                      descontosIndividuais: prev.descontosIndividuais.filter(x => x.id !== d.id),
                    }))}
                    style={{ background: 'none', border: 'none', cursor: 'pointer', padding: '4px', color: '#474658', flexShrink: 0 }}
                    onMouseEnter={ev => ((ev.currentTarget as HTMLElement).style.color = '#f87171')}
                    onMouseLeave={ev => ((ev.currentTarget as HTMLElement).style.color = '#474658')}
                  >
                    <Trash2 size={14} />
                  </button>
                </div>
              ))}
            </div>
          )}

          {adicionandoDesconto ? (
            <DescontoForm
              onSalvar={d => {
                setE(prev => ({ ...prev, descontosIndividuais: [...prev.descontosIndividuais, d] }))
                setAdicionandoDesconto(false)
              }}
              onCancelar={() => setAdicionandoDesconto(false)}
            />
          ) : (
            <button
              type="button"
              onClick={() => setAdicionandoDesconto(true)}
              style={{
                fontFamily: FF_SYNE, fontWeight: 700, fontSize: '10px',
                textTransform: 'uppercase', letterSpacing: '0.08em',
                display: 'inline-flex', alignItems: 'center', gap: '5px',
                background: 'rgba(201,168,76,0.06)', border: '1px solid rgba(201,168,76,0.18)',
                borderRadius: '8px', padding: '5px 12px',
                color: '#e8c96d', cursor: 'pointer',
              }}
            >
              <Plus size={11} /> ADICIONAR DESCONTO INDIVIDUAL
            </button>
          )}
        </div>

        <DivisorSecao />

        {/* ── GESTOR: MONITORIAS MÍNIMAS ── */}
        <div style={CARD}>
          <div style={{ marginBottom: '16px' }}><PainelSectionTitle>AJUSTE DE RV — GESTOR</PainelSectionTitle></div>
          <p style={DESC}>
            Parâmetros usados exclusivamente no cálculo do RV do gestor.
          </p>
          <div style={{ maxWidth: '240px' }}>
            <Campo label="MONITORIAS MÍNIMAS"
              hint="Nº mínimo de operadores com 4+ monitorias para elegibilidade">
              <input type="number" value={e.gestorMonitoriasMinimas} min="1" step="1"
                onChange={ev => upd('gestorMonitoriasMinimas')(ev.target.value)} style={INPUT_BASE} />
            </Campo>
          </div>
        </div>

        <DivisorSecao />

        {/* ── GESTOR: FAIXAS DE TX. RETENÇÃO ── */}
        <div style={CARD}>
          <div style={{ marginBottom: '16px' }}><PainelSectionTitle>FAIXAS DE TX. RETENÇÃO (GESTOR)</PainelSectionTitle></div>
          <p style={DESC}>
            Remuneração base do gestor conforme a TX de Retenção da equipe.
            Somente a faixa mais alta atingida é paga.
          </p>
          <FaixaEditor
            faixas={e.gestorRetencaoFaixas}
            onChange={upd('gestorRetencaoFaixas') as (f: FaixaRV[]) => void}
            labelMin="%" step={2}
          />
        </div>

        <DivisorSecao />

        {/* ── GESTOR: REGRAS OPERACIONAIS ── */}
        <div style={CARD}>
          <div style={{ marginBottom: '16px' }}><PainelSectionTitle>REGRAS OPERACIONAIS (GESTOR)</PainelSectionTitle></div>
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(2, 1fr)', gap: '20px' }}>
            <Campo label="META DE INDISPONIBILIDADE" hint="Igual ou abaixo → recebe o prêmio">
              <InputComUnidade unit="%">
                <input type="number" value={e.gestorIndispMeta} step="0.5"
                  onChange={ev => upd('gestorIndispMeta')(ev.target.value)} style={INPUT_BASE} />
              </InputComUnidade>
            </Campo>
            <Campo label="PRÊMIO INDISPONIBILIDADE">
              <InputComUnidade unit="R$">
                <input type="number" value={e.gestorIndispValor} step="50"
                  onChange={ev => upd('gestorIndispValor')(ev.target.value)} style={INPUT_BASE} />
              </InputComUnidade>
            </Campo>
            <Campo label="META DE TMA (MM:SS)" hint="Abaixo deste valor → recebe o prêmio">
              <input type="text" placeholder="12:11" value={e.gestorTmaMmss}
                onChange={ev => upd('gestorTmaMmss')(ev.target.value)} style={INPUT_BASE} />
            </Campo>
            <Campo label="PRÊMIO TMA">
              <InputComUnidade unit="R$">
                <input type="number" value={e.gestorTmaValor} step="50"
                  onChange={ev => upd('gestorTmaValor')(ev.target.value)} style={INPUT_BASE} />
              </InputComUnidade>
            </Campo>
          </div>
        </div>

        <DivisorSecao />

        {/* ── GESTOR: VARIAÇÃO DE TICKET ── */}
        <div style={CARD}>
          <div style={{ marginBottom: '16px' }}><PainelSectionTitle>VARIAÇÃO DE TICKET (GESTOR)</PainelSectionTitle></div>
          <div style={{ marginBottom: '20px', maxWidth: '260px' }}>
            <Campo label="TX RETENÇÃO MÍNIMA PARA QUALIFICAR"
              hint="Abaixo desta TX não recebe bônus de ticket">
              <InputComUnidade unit="%">
                <input type="number" value={e.gestorTicketMinRetracao} step="1"
                  onChange={ev => upd('gestorTicketMinRetracao')(ev.target.value)} style={INPUT_BASE} />
              </InputComUnidade>
            </Campo>
          </div>
          <p style={{ ...DESC, marginBottom: '16px' }}>
            Use limiares negativos (ex: −12 significa ≥ −12%). Somente a faixa mais alta atingida é paga.
          </p>
          <FaixaEditor
            faixas={e.gestorTicketFaixas}
            onChange={upd('gestorTicketFaixas') as (f: FaixaRV[]) => void}
            labelMin="%" step={3}
          />
        </div>

        <DivisorSecao />

        {/* ── GESTOR: BÔNUS ── */}
        <div style={CARD}>
          <div style={{ marginBottom: '16px' }}><PainelSectionTitle>BÔNUS (GESTOR)</PainelSectionTitle></div>
          <p style={DESC}>
            Percentual acrescido ao RV base quando os critérios de retenção e ABS são atingidos.
          </p>
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: '20px' }}>
            <Campo label="TX RETENÇÃO MÍNIMA">
              <InputComUnidade unit="%">
                <input type="number" value={e.gestorBonusRetencaoMin} step="0.1"
                  onChange={ev => upd('gestorBonusRetencaoMin')(ev.target.value)} style={INPUT_BASE} />
              </InputComUnidade>
            </Campo>
            <Campo label="ABS MÁXIMO">
              <InputComUnidade unit="%">
                <input type="number" value={e.gestorBonusAbsMax} step="0.5"
                  onChange={ev => upd('gestorBonusAbsMax')(ev.target.value)} style={INPUT_BASE} />
              </InputComUnidade>
            </Campo>
            <Campo label="PERCENTUAL DO BÔNUS">
              <InputComUnidade unit="%">
                <input type="number" value={e.gestorBonusPercentual} step="5"
                  onChange={ev => upd('gestorBonusPercentual')(ev.target.value)} style={INPUT_BASE} />
              </InputComUnidade>
            </Campo>
          </div>
        </div>

        <DivisorSecao />

        {/* ── GESTOR: DEFLATORES ── */}
        <div style={CARD}>
          <div style={{ marginBottom: '16px' }}><PainelSectionTitle>DEFLATORES (GESTOR)</PainelSectionTitle></div>
          <p style={DESC}>
            Deduções aplicadas ao RV (com bônus) quando TMA, indisponibilidade ou ABS excedem os limites.
          </p>
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: '20px', marginBottom: '28px' }}>
            <Campo label="TOLERÂNCIA TMA" hint="% acima da meta que dispara o deflator">
              <InputComUnidade unit="%">
                <input type="number" value={e.gestorTmaDeflatorPct} step="1"
                  onChange={ev => upd('gestorTmaDeflatorPct')(ev.target.value)} style={INPUT_BASE} />
              </InputComUnidade>
            </Campo>
            <Campo label="PERDA DEFLATOR TMA">
              <InputComUnidade unit="%">
                <input type="number" value={e.gestorTmaDeflatorPerda} step="5"
                  onChange={ev => upd('gestorTmaDeflatorPerda')(ev.target.value)} style={INPUT_BASE} />
              </InputComUnidade>
            </Campo>
            <Campo label="PERDA DEFLATOR INDISP">
              <InputComUnidade unit="%">
                <input type="number" value={e.gestorIndispDeflatorPerda} step="5"
                  onChange={ev => upd('gestorIndispDeflatorPerda')(ev.target.value)} style={INPUT_BASE} />
              </InputComUnidade>
            </Campo>
          </div>
          <p style={{ ...DESC, marginBottom: '16px' }}>
            Faixas de ABS: limite (inclusive) → % de perda sobre o RV com bônus.
          </p>
          <FaixaEditor
            faixas={e.gestorAbsDeflatorFaixas}
            onChange={upd('gestorAbsDeflatorFaixas') as (f: FaixaRV[]) => void}
            labelMin="% ABS" labelValor="PERDA (%)" step={1} sortAsc
          />
        </div>

        {/* ── Botão salvar (sticky) ── */}
        <div style={{
          position: 'sticky', bottom: 0, zIndex: 8,
          background: 'linear-gradient(0deg, rgba(1,2,10,0.98) 0%, rgba(1,2,10,0.85) 100%)',
          backdropFilter: 'blur(12px)',
          borderTop: '1px solid rgba(244,212,124,0.10)',
          padding: '16px 0', marginTop: '16px',
        }}>
          <button
            type="button"
            onClick={handleSave}
            disabled={saving}
            style={{
              fontFamily: FF_SYNE, fontWeight: 700, fontSize: '11px',
              textTransform: 'uppercase', letterSpacing: '0.06em',
              borderRadius: '10px', padding: '10px 28px',
              display: 'inline-flex', alignItems: 'center', gap: '6px',
              background: saving ? 'rgba(201,168,76,0.10)' : 'rgba(201,168,76,0.15)',
              border: '1px solid rgba(201,168,76,0.35)',
              color: '#e8c96d',
              cursor: saving ? 'not-allowed' : 'pointer',
            }}
          >
            {saving ? <Spinner /> : <Check size={13} />}
            {saving ? 'SALVANDO...' : 'SALVAR CONFIGURAÇÕES'}
          </button>
        </div>

      </div>
    </>
  )
}

// ── DescontoForm ───────────────────────────────────────────────────────────────

function DescontoForm({ onSalvar, onCancelar }: {
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

  const inputStyle: React.CSSProperties = {
    background: '#03040C',
    border: '1px solid rgba(114,112,143,0.5)',
    borderRadius: '10px',
    color: '#A6A2A2',
    fontFamily: FF_DM,
    fontSize: '13px',
    padding: '7px 10px',
    outline: 'none',
    width: '100%',
  }

  return (
    <div style={{
      background: 'rgba(239,68,68,0.04)', border: '1px solid rgba(239,68,68,0.18)',
      borderRadius: '16px', padding: '20px',
    }}>
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(2, 1fr)', gap: '16px', marginBottom: '16px' }}>
        <div>
          <span style={LBL}>OPERADOR</span>
          <select value={opId} onChange={ev => setOpId(Number(ev.target.value))} style={inputStyle}>
            {OPERADORES_DISPLAY.map(op => <option key={op.id} value={op.id}>{op.nome}</option>)}
          </select>
        </div>
        <div>
          <span style={LBL}>MÊS DE REFERÊNCIA</span>
          <input type="month" value={mes} onChange={ev => setMes(ev.target.value)} style={inputStyle} />
        </div>
        <div>
          <span style={LBL}>MOTIVO</span>
          <input type="text" placeholder="ex: advertência, feedback…"
            value={motivo} onChange={ev => setMotivo(ev.target.value)} style={inputStyle} />
        </div>
        <div>
          <span style={LBL}>VALOR DO DESCONTO</span>
          <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
            <button
              type="button"
              onClick={() => setTipo(tipo === 'fixo' ? 'percentual' : 'fixo')}
              style={{
                fontFamily: FF_SYNE, fontWeight: 700, fontSize: '11px',
                flexShrink: 0, padding: '7px 10px', borderRadius: '10px', cursor: 'pointer',
                background: 'rgba(201,168,76,0.06)', border: '1px solid rgba(201,168,76,0.18)',
                color: '#e8c96d', minWidth: '40px', textAlign: 'center',
              }}
            >
              {tipo === 'fixo' ? 'R$' : '%'}
            </button>
            <input type="number" min="0" step={tipo === 'fixo' ? 50 : 1} placeholder="0"
              value={valor} onChange={ev => setValor(ev.target.value)} style={inputStyle} />
          </div>
        </div>
      </div>
      <div style={{ display: 'flex', gap: '8px' }}>
        <button
          type="button" onClick={handleAdd}
          disabled={!motivo.trim() || !valor}
          style={{
            fontFamily: FF_SYNE, fontWeight: 700, fontSize: '10px',
            textTransform: 'uppercase', letterSpacing: '0.08em',
            display: 'inline-flex', alignItems: 'center', gap: '5px',
            background: 'rgba(201,168,76,0.15)', border: '1px solid rgba(201,168,76,0.35)',
            borderRadius: '8px', padding: '7px 14px', color: '#e8c96d',
            cursor: (!motivo.trim() || !valor) ? 'not-allowed' : 'pointer',
            opacity: (!motivo.trim() || !valor) ? 0.5 : 1,
          }}
        >
          <Check size={12} /> ADICIONAR
        </button>
        <button
          type="button" onClick={onCancelar}
          style={{
            fontFamily: FF_SYNE, fontWeight: 700, fontSize: '10px',
            textTransform: 'uppercase', letterSpacing: '0.08em',
            display: 'inline-flex', alignItems: 'center', gap: '5px',
            background: 'transparent', border: '1px solid rgba(255,255,255,0.08)',
            borderRadius: '8px', padding: '7px 14px', color: '#72708F',
            cursor: 'pointer',
          }}
        >
          <X size={12} /> CANCELAR
        </button>
      </div>
    </div>
  )
}
