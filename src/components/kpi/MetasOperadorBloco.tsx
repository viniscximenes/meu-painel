'use client'

import { useState, useTransition } from 'react'
import type { LucideIcon } from 'lucide-react'
import { Shield, Calendar, Activity, Clock, Package, TrendingDown, Check } from 'lucide-react'
import type { MetaOperadorConfig } from '@/lib/kpi-utils'
import { salvarMetaOperadorAction } from '@/app/painel/metas/actions'

const FF_SYNE = 'var(--ff-syne)'
const FF_DM   = 'var(--ff-body)'

type Toast = { tipo: 'ok' | 'erro'; msg: string } | null

// ── Estilos compartilhados ────────────────────────────────────────────────────

const CARD: React.CSSProperties = {
  background: '#070714',
  border: '1px solid rgba(244,212,124,0.10)',
  borderRadius: '20px',
  padding: '24px 28px',
  display: 'flex',
  flexDirection: 'column',
}

const INPUT_NUM: React.CSSProperties = {
  background: '#03040C',
  border: '1px solid rgba(114,112,143,0.5)',
  borderRadius: '8px',
  color: '#A6A2A2',
  fontFamily: FF_DM,
  fontWeight: 500,
  fontSize: '13px',
  fontVariantNumeric: 'tabular-nums',
  padding: '7px 0',
  outline: 'none',
  textAlign: 'center',
  width: '80px',
  flexShrink: 0,
}

const INPUT_COL: React.CSSProperties = {
  ...INPUT_NUM,
  width: '64px',
  textTransform: 'uppercase',
}

const PILL_OP: React.CSSProperties = {
  background: 'rgba(166,162,162,0.08)',
  border: '1px solid rgba(166,162,162,0.20)',
  borderRadius: '4px',
  padding: '2px 8px',
  fontFamily: FF_DM,
  fontWeight: 700,
  fontSize: '12px',
  color: '#A6A2A2',
  display: 'inline-flex',
  alignItems: 'center',
  justifyContent: 'center',
  flexShrink: 0,
}

const LBL_BASE: React.CSSProperties = {
  fontFamily: FF_SYNE,
  fontSize: '11px',
  fontWeight: 600,
  textTransform: 'uppercase',
  letterSpacing: '0.06em',
  width: '86px',
  flexShrink: 0,
}

const LBL_VERDE:    React.CSSProperties = { ...LBL_BASE, color: 'rgba(106,196,73,0.95)' }
const LBL_AMARELO:  React.CSSProperties = { ...LBL_BASE, color: '#FFB922' }
const LBL_VERMELHO: React.CSSProperties = { ...LBL_BASE, color: 'rgba(227,57,57,0.95)' }
const LBL_UNIT:     React.CSSProperties = {
  fontFamily: FF_SYNE, fontSize: '11px', fontWeight: 600,
  textTransform: 'uppercase', color: '#72708F', flexShrink: 0,
}

function segParaMMSS(s: number): string {
  if (!s || isNaN(s)) return '00:00'
  const m = Math.floor(s / 60)
  const sec = Math.round(s % 60)
  return `${String(m).padStart(2, '0')}:${String(sec).padStart(2, '0')}`
}

// ── Átomos de UI ──────────────────────────────────────────────────────────────

function CardHeader({ icon: Icon, titulo, subtitulo }: { icon: LucideIcon; titulo: string; subtitulo: string }) {
  return (
    <div style={{ display: 'flex', alignItems: 'flex-start', gap: '14px', marginBottom: '20px' }}>
      <Icon size={28} style={{ color: '#A6A2A2', flexShrink: 0, marginTop: '2px' }} />
      <div>
        <div style={{
          fontFamily: FF_SYNE, fontWeight: 700, fontSize: '18px',
          textTransform: 'uppercase', color: '#A6A2A2', letterSpacing: '0.02em',
        }}>{titulo}</div>
        <div style={{
          fontFamily: FF_SYNE, fontWeight: 600, fontSize: '10px',
          textTransform: 'uppercase', letterSpacing: '0.10em', color: '#474658', marginTop: '4px',
        }}>{subtitulo}</div>
      </div>
    </div>
  )
}

function SaveButton({ isPending, onClick }: { isPending: boolean; onClick: () => void }) {
  return (
    <button
      type="button"
      onClick={onClick}
      disabled={isPending}
      style={{
        fontFamily: FF_SYNE, fontWeight: 700, fontSize: '11px',
        textTransform: 'uppercase', letterSpacing: '0.06em',
        borderRadius: '10px', padding: '9px 20px',
        display: 'inline-flex', alignItems: 'center', gap: '6px',
        background: isPending ? 'rgba(201,168,76,0.10)' : 'rgba(201,168,76,0.15)',
        border: '1px solid rgba(201,168,76,0.35)',
        color: '#e8c96d',
        cursor: isPending ? 'not-allowed' : 'pointer',
        marginTop: '20px',
      }}
    >
      {isPending ? (
        <span className="animate-spin" style={{
          width: '11px', height: '11px', borderRadius: '50%',
          border: '2px solid rgba(232,201,109,0.25)',
          borderTopColor: '#e8c96d', display: 'inline-block',
        }} />
      ) : <Check size={11} />}
      SALVAR
    </button>
  )
}

function ThresholdRow({
  labelStyle, op, value, onChange, unit, readonly,
}: {
  labelStyle: React.CSSProperties
  op: string
  value: string
  onChange?: (v: string) => void
  unit: string
  readonly?: boolean
}) {
  return (
    <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
      <span style={labelStyle}>{(labelStyle as { content?: string }).content ?? ''}</span>
      <span style={PILL_OP}>{op}</span>
      {readonly ? (
        <span style={{ ...INPUT_NUM, display: 'inline-flex', alignItems: 'center', justifyContent: 'center', opacity: 0.45, cursor: 'not-allowed' }}>
          {value}
        </span>
      ) : (
        <input
          type="number" step="any"
          value={value}
          onChange={e => onChange?.(e.target.value)}
          style={INPUT_NUM}
        />
      )}
      <span style={LBL_UNIT}>{unit}</span>
    </div>
  )
}

// ── Cards ──────────────────────────────────────────────────────────────────────

function CardTxRetencao({ config, onToast }: { config?: MetaOperadorConfig; onToast: (t: Toast) => void }) {
  const [verdeValor,   setVerdeValor]   = useState(String(config?.verde_valor   ?? 66))
  const [amareloValor, setAmareloValor] = useState(String(config?.amarelo_valor ?? 60))
  const [isPending, startTransition] = useTransition()

  function save() {
    const vv = parseFloat(verdeValor)
    const av = parseFloat(amareloValor)
    if (isNaN(vv) || vv <= 0)  { onToast({ tipo: 'erro', msg: 'Valor verde inválido.' }); return }
    if (isNaN(av) || av <= 0)  { onToast({ tipo: 'erro', msg: 'Valor amarelo inválido.' }); return }
    if (av >= vv)              { onToast({ tipo: 'erro', msg: 'Amarelo deve ser menor que verde.' }); return }
    startTransition(async () => {
      const res = await salvarMetaOperadorAction('tx_ret_bruta', {
        modo: 'limiar_global', verde_op: '>=', verde_valor: vv,
        amarelo_op: '>=', amarelo_valor: av, coluna_meta: null,
      })
      onToast(res.ok ? { tipo: 'ok', msg: 'TX. Retenção salva.' } : { tipo: 'erro', msg: res.erro ?? 'Erro.' })
    })
  }

  return (
    <div style={CARD}>
      <CardHeader icon={Shield} titulo="TX. Retenção" subtitulo="Maior é melhor" />
      <div style={{ display: 'flex', flexDirection: 'column', gap: '10px' }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
          <span style={LBL_VERDE}>VERDE</span>
          <span style={PILL_OP}>≥</span>
          <input type="number" step="any" value={verdeValor} onChange={e => setVerdeValor(e.target.value)} style={INPUT_NUM} />
          <span style={LBL_UNIT}>%</span>
        </div>
        <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
          <span style={LBL_AMARELO}>AMARELO</span>
          <span style={PILL_OP}>≥</span>
          <input type="number" step="any" value={amareloValor} onChange={e => setAmareloValor(e.target.value)} style={INPUT_NUM} />
          <span style={LBL_UNIT}>%</span>
        </div>
        <div style={{ display: 'flex', alignItems: 'center', gap: '10px', opacity: 0.45 }}>
          <span style={LBL_VERMELHO}>VERMELHO</span>
          <span style={PILL_OP}>&lt;</span>
          <span style={{ ...INPUT_NUM, display: 'inline-flex', alignItems: 'center', justifyContent: 'center', cursor: 'not-allowed' }}>{amareloValor}</span>
          <span style={LBL_UNIT}>%</span>
        </div>
      </div>
      <SaveButton isPending={isPending} onClick={save} />
    </div>
  )
}

function CardMenorMelhorSimples({
  kpiKey, titulo, subtitulo, icon: Icon, unit, defaultVal, config, onToast,
}: {
  kpiKey: string; titulo: string; subtitulo: string
  icon: LucideIcon; unit: string; defaultVal: number
  config?: MetaOperadorConfig; onToast: (t: Toast) => void
}) {
  const [verdeValor, setVerdeValor] = useState(String(config?.verde_valor ?? defaultVal))
  const [isPending, startTransition] = useTransition()

  const isTma = unit === 's'
  const display = isTma ? segParaMMSS(parseFloat(verdeValor)) : verdeValor

  function save() {
    const vv = parseFloat(verdeValor)
    if (isNaN(vv) || vv <= 0) { onToast({ tipo: 'erro', msg: 'Valor verde inválido.' }); return }
    startTransition(async () => {
      const res = await salvarMetaOperadorAction(kpiKey, {
        modo: 'limiar_global', verde_op: '<=', verde_valor: vv,
        amarelo_op: null, amarelo_valor: null, coluna_meta: null,
      })
      onToast(res.ok ? { tipo: 'ok', msg: `${titulo} salvo.` } : { tipo: 'erro', msg: res.erro ?? 'Erro.' })
    })
  }

  return (
    <div style={CARD}>
      <CardHeader icon={Icon} titulo={titulo} subtitulo={subtitulo} />
      <div style={{ display: 'flex', flexDirection: 'column', gap: '10px' }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
          <span style={LBL_VERDE}>VERDE</span>
          <span style={PILL_OP}>≤</span>
          <input type="number" step="any" value={verdeValor} onChange={e => setVerdeValor(e.target.value)} style={INPUT_NUM} />
          <span style={LBL_UNIT}>{unit}</span>
          {isTma && (
            <span style={{ fontFamily: FF_DM, fontSize: '12px', color: '#474658', fontVariantNumeric: 'tabular-nums' }}>
              = {display}
            </span>
          )}
        </div>
        <div style={{ display: 'flex', alignItems: 'center', gap: '10px', opacity: 0.45 }}>
          <span style={LBL_VERMELHO}>VERMELHO</span>
          <span style={PILL_OP}>&gt;</span>
          <span style={{ ...INPUT_NUM, display: 'inline-flex', alignItems: 'center', justifyContent: 'center', cursor: 'not-allowed' }}>{verdeValor}</span>
          <span style={LBL_UNIT}>{unit}</span>
        </div>
      </div>
      <SaveButton isPending={isPending} onClick={save} />
    </div>
  )
}

function CardColunaIndividual({
  kpiKey, titulo, subtitulo, icon: Icon, config, onToast,
}: {
  kpiKey: string; titulo: string; subtitulo: string
  icon: LucideIcon; config?: MetaOperadorConfig; onToast: (t: Toast) => void
}) {
  const [coluna, setColuna] = useState((config?.coluna_meta ?? '').toUpperCase())
  const [isPending, startTransition] = useTransition()

  function save() {
    const col = coluna.trim().toUpperCase()
    if (!/^[A-Z]{1,3}$/.test(col)) {
      onToast({ tipo: 'erro', msg: 'Informe uma letra de coluna válida (ex: F).' })
      return
    }
    startTransition(async () => {
      const res = await salvarMetaOperadorAction(kpiKey, {
        modo: 'coluna_individual', coluna_meta: col,
        verde_op: null, verde_valor: null, amarelo_op: null, amarelo_valor: null,
      })
      onToast(res.ok ? { tipo: 'ok', msg: `${titulo} salvo.` } : { tipo: 'erro', msg: res.erro ?? 'Erro.' })
    })
  }

  return (
    <div style={CARD}>
      <CardHeader icon={Icon} titulo={titulo} subtitulo={subtitulo} />
      <p style={{ fontFamily: FF_DM, fontSize: '12px', color: '#72708F', lineHeight: 1.6, marginBottom: '16px' }}>
        Cada operador tem uma meta individual definida em uma coluna da aba{' '}
        <strong style={{ color: '#A6A2A2' }}>KPI CONSOLIDADO</strong>.
        Informe a letra dessa coluna.
      </p>
      <div style={{ display: 'flex', alignItems: 'center', gap: '12px', flexWrap: 'wrap' }}>
        <span style={{
          fontFamily: FF_SYNE, fontSize: '11px', fontWeight: 600,
          textTransform: 'uppercase', letterSpacing: '0.06em', color: '#72708F',
        }}>
          COLUNA NO KPI CONSOLIDADO
        </span>
        <input
          type="text"
          value={coluna}
          onChange={e => setColuna(e.target.value.toUpperCase())}
          maxLength={3}
          placeholder="F"
          style={INPUT_COL}
        />
      </div>
      <SaveButton isPending={isPending} onClick={save} />
    </div>
  )
}

// ── Componente principal ──────────────────────────────────────────────────────

export default function MetasOperadorBloco({ configs }: { configs: Record<string, MetaOperadorConfig> }) {
  const [toast, setToast] = useState<Toast>(null)

  function showToast(t: Toast) {
    setToast(t)
    if (t) setTimeout(() => setToast(null), 3000)
  }

  return (
    <>
      {toast && (
        <div style={{
          position: 'fixed', bottom: '24px', right: '24px', zIndex: 50,
          background: toast.tipo === 'ok' ? 'rgba(106,196,73,0.12)' : 'rgba(239,68,68,0.12)',
          border: `1px solid ${toast.tipo === 'ok' ? 'rgba(106,196,73,0.4)' : 'rgba(239,68,68,0.4)'}`,
          borderRadius: '10px', padding: '12px 18px',
          fontFamily: FF_SYNE, fontWeight: 600, fontSize: '13px',
          color: toast.tipo === 'ok' ? '#4ade80' : '#f87171',
          pointerEvents: 'none',
        }}>
          {toast.msg}
        </div>
      )}

      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        <CardTxRetencao config={configs['tx_ret_bruta']} onToast={showToast} />
        <CardMenorMelhorSimples
          kpiKey="abs" titulo="ABS" subtitulo="Menor é melhor"
          icon={Calendar} unit="%" defaultVal={5}
          config={configs['abs']} onToast={showToast}
        />
        <CardMenorMelhorSimples
          kpiKey="indisp" titulo="Indisponibilidade" subtitulo="Menor é melhor"
          icon={Activity} unit="%" defaultVal={14.5}
          config={configs['indisp']} onToast={showToast}
        />
        <CardMenorMelhorSimples
          kpiKey="tma" titulo="TMA" subtitulo="Menor é melhor"
          icon={Clock} unit="s" defaultVal={731}
          config={configs['tma']} onToast={showToast}
        />
        <CardColunaIndividual
          kpiKey="pedidos" titulo="Pedidos" subtitulo="Meta individual por operador"
          icon={Package} config={configs['pedidos']} onToast={showToast}
        />
        <CardColunaIndividual
          kpiKey="churn" titulo="Churn" subtitulo="Meta individual por operador"
          icon={TrendingDown} config={configs['churn']} onToast={showToast}
        />
      </div>
    </>
  )
}
