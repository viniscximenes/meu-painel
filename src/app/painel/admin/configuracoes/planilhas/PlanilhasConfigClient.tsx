'use client'

import React, { useState, useTransition } from 'react'
import { useRouter } from 'next/navigation'
import { Settings, Trash2, ExternalLink, Edit2, Check, AlertTriangle, Save, Info } from 'lucide-react'
import { PainelSectionTitle } from '@/components/painel/PainelSectionTitle'
import { HaloSpinner } from '@/components/HaloSpinner'
import type { Planilha } from '@/lib/sheets'
import { ABAS_ESPERADAS, abaEncontrada } from '@/lib/planilhas-config'
import type { TipoPlanilha } from '@/lib/planilhas-config'
import { KPIS_PRINCIPAIS, KPIS_SECUNDARIOS, CATEGORIA_LABEL } from '@/lib/kpis-config'
import type { KpiKey, KpiCategoria } from '@/lib/kpis-config'
import {
  salvarPlanilhaOperacaoAction,
  apagarPlanilhaOperacaoAction,
  salvarMapeamentoKpiColunasAction,
  salvarMapeamentoKpiGestorColunasAction,
} from './actions'

// ── Paleta ────────────────────────────────────────────────────────────────────

const BG_CARD  = '#0d0d1a'
const BG_INPUT = '#111126'
const BG_TABLE = '#070714'
const BG_THEAD = '#03040C'
const BORDA    = '#211F3C'
const GOLD     = '#f4d47c'
const MUTED    = '#72708F'
const TEXT     = '#A6A2A2'
const LABEL    = '#474658'
const VERMELHO = '#c97a7a'
const VERDE_S  = 'rgba(106,196,73,0.95)'
const VERM_S   = 'rgba(227,57,57,0.95)'
const AZUL     = '#7ba3d9'
const LAVANDA  = '#B0AAFF'
const FF_SYNE  = "'Syne', sans-serif"
const FF_DM    = "'DM Sans', sans-serif"

// ── Toast ─────────────────────────────────────────────────────────────────────

interface ToastState { msg: string; tipo: 'ok' | 'erro' }

function Toast({ toast, onDismiss }: { toast: ToastState; onDismiss: () => void }) {
  return (
    <div onClick={onDismiss} style={{
      position: 'fixed', bottom: '24px', right: '24px',
      background: toast.tipo === 'ok' ? 'rgba(106,196,73,0.10)' : 'rgba(227,57,57,0.10)',
      border: `1px solid ${toast.tipo === 'ok' ? 'rgba(106,196,73,0.4)' : 'rgba(227,57,57,0.4)'}`,
      borderRadius: '10px', padding: '12px 18px',
      display: 'flex', alignItems: 'center', gap: '8px',
      zIndex: 100, cursor: 'pointer', maxWidth: '380px',
    }}>
      {toast.tipo === 'ok'
        ? <Check size={14} color={VERDE_S} />
        : <AlertTriangle size={14} color={VERM_S} />
      }
      <span style={{ fontFamily: FF_DM, fontSize: '13px', color: TEXT }}>{toast.msg}</span>
    </div>
  )
}

// ── Divisor principal entre blocos ────────────────────────────────────────────

function DivisorSecao() {
  return <div style={{ height: '1px', background: BORDA, margin: '40px 0' }} />
}

// ── Lista de abas com indicadores ─────────────────────────────────────────────

function IndicadorAbas({ tipo, abas }: { tipo: TipoPlanilha; abas: string[] }) {
  const esperadas = ABAS_ESPERADAS[tipo]
  const algumFaltando = esperadas.some(e => !abaEncontrada(abas, e))

  return (
    <div style={{ marginTop: '12px' }}>
      <p style={{
        fontFamily: FF_SYNE, fontSize: '10px', fontWeight: 600,
        letterSpacing: '0.10em', color: LABEL, textTransform: 'uppercase',
        marginBottom: '6px',
      }}>
        Abas na planilha
      </p>
      <div style={{ display: 'flex', flexDirection: 'column', gap: '4px' }}>
        {esperadas.map(aba => {
          const ok = abaEncontrada(abas, aba)
          return (
            <div key={aba} style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
              <span style={{ color: LABEL, fontSize: '10px' }}>•</span>
              <span style={{ fontFamily: FF_SYNE, fontSize: '12px', fontWeight: 600, letterSpacing: '0.04em', color: TEXT, textTransform: 'uppercase', whiteSpace: 'nowrap' }}>
                {aba}
              </span>
              {ok
                ? <Check size={12} color={VERDE_S} />
                : <AlertTriangle size={12} color={VERM_S} />
              }
            </div>
          )
        })}
      </div>
      {algumFaltando && (
        <p style={{ fontFamily: FF_SYNE, fontSize: '11px', fontWeight: 600, color: VERM_S, marginTop: '8px' }}>
          Algumas abas obrigatórias não foram encontradas. Verifique a planilha.
        </p>
      )}
    </div>
  )
}

// ── Slot de planilha ──────────────────────────────────────────────────────────

interface SlotProps {
  tipo: TipoPlanilha
  planilha: Planilha | null
  abas: string[]
  label: string
  descricao: string
  onToast: (t: ToastState) => void
  fullWidth?: boolean
}

function SlotPlanilha({ tipo, planilha, abas, label, descricao, onToast, fullWidth }: SlotProps) {
  const router = useRouter()
  const [editando, setEditando]     = useState(planilha === null)
  const [input, setInput]           = useState('')
  const [nome, setNome]             = useState('')
  const [confirmar, setConfirmar]   = useState(false)
  const [pending, startTransition]  = useTransition()

  function handleSalvar() {
    if (!input.trim()) return
    startTransition(async () => {
      const res = await salvarPlanilhaOperacaoAction(tipo, input.trim(), nome.trim() || undefined)
      if (res.ok) {
        onToast({ msg: `Planilha "${label}" salva com sucesso.`, tipo: 'ok' })
        setEditando(false); setInput(''); setNome('')
        router.refresh()
      } else {
        onToast({ msg: res.error ?? 'Erro desconhecido.', tipo: 'erro' })
      }
    })
  }

  function handleApagar() {
    startTransition(async () => {
      const res = await apagarPlanilhaOperacaoAction(tipo)
      if (res.ok) {
        onToast({ msg: `Planilha "${label}" removida.`, tipo: 'ok' })
        setConfirmar(false); setEditando(true)
        router.refresh()
      } else {
        onToast({ msg: res.error ?? 'Erro ao remover.', tipo: 'erro' })
      }
    })
  }

  return (
    <div style={{
      background: BG_CARD, border: `1px solid ${BORDA}`,
      borderRadius: '12px', padding: '20px',
      display: 'flex', flexDirection: 'column', gap: '14px',
      ...(fullWidth ? { width: '100%' } : {}),
    }}>
      {/* Cabeçalho */}
      <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
        <Settings size={14} color={GOLD} />
        <span style={{ fontFamily: FF_SYNE, fontSize: '11px', fontWeight: 600, letterSpacing: '0.12em', color: GOLD }}>
          {label.toUpperCase()}
        </span>
        <div style={{ marginLeft: 'auto' }}>
          {planilha
            ? <span style={{ fontFamily: FF_SYNE, fontSize: '9px', fontWeight: 600, letterSpacing: '0.08em', color: VERDE_S, background: 'rgba(106,196,73,0.10)', border: '1px solid rgba(106,196,73,0.25)', borderRadius: '99px', padding: '2px 8px', textTransform: 'uppercase' }}>ATIVA</span>
            : <span style={{ fontFamily: FF_SYNE, fontSize: '9px', fontWeight: 600, letterSpacing: '0.08em', color: MUTED, background: 'rgba(114,112,143,0.10)', border: `1px solid rgba(114,112,143,0.25)`, borderRadius: '99px', padding: '2px 8px', textTransform: 'uppercase' }}>VAZIO</span>
          }
        </div>
      </div>
      <p style={{ fontFamily: FF_DM, fontSize: '12px', color: MUTED, margin: 0 }}>{descricao}</p>

      {/* Estado preenchido */}
      {planilha && !editando && (
        <>
          <div style={{ background: BG_INPUT, border: `1px solid ${BORDA}`, borderRadius: '8px', padding: '12px 14px', display: 'flex', flexDirection: 'column', gap: '6px' }}>
            <span style={{ fontFamily: FF_DM, fontSize: '13px', color: TEXT, fontWeight: 500 }}>{planilha.nome}</span>
            <span style={{ fontFamily: FF_DM, fontSize: '11px', color: MUTED, wordBreak: 'break-all' }}>
              ID: {planilha.spreadsheet_id}
            </span>
            <IndicadorAbas tipo={tipo} abas={abas} />
          </div>
          <div style={{ display: 'flex', gap: '8px' }}>
            <button onClick={() => { setEditando(true); setInput(planilha.spreadsheet_id); setNome(planilha.nome) }}
              style={{ flex: 1, display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '6px', background: 'transparent', border: `1px solid ${BORDA}`, borderRadius: '6px', color: TEXT, fontFamily: FF_DM, fontSize: '12px', padding: '8px', cursor: 'pointer' }}>
              <Edit2 size={12} /> Substituir
            </button>
            <a href={`https://docs.google.com/spreadsheets/d/${planilha.spreadsheet_id}`} target="_blank" rel="noopener noreferrer"
              style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', background: 'transparent', border: `1px solid ${BORDA}`, borderRadius: '6px', color: MUTED, padding: '8px 12px', textDecoration: 'none' }}>
              <ExternalLink size={12} />
            </a>
            <button onClick={() => setConfirmar(true)}
              style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', background: 'transparent', border: '1px solid rgba(201,122,122,0.3)', borderRadius: '6px', color: VERMELHO, padding: '8px 12px', cursor: 'pointer' }}>
              <Trash2 size={12} />
            </button>
          </div>
        </>
      )}

      {/* Estado formulário */}
      {editando && (
        <>
          <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
            <label style={{ fontFamily: FF_DM, fontSize: '11px', color: MUTED }}>ID ou URL da planilha *</label>
            <input value={input} onChange={e => setInput(e.target.value)}
              placeholder="Cole o ID ou a URL do Google Sheets"
              style={{ background: BG_INPUT, border: `1px solid ${BORDA}`, borderRadius: '6px', color: TEXT, fontFamily: FF_DM, fontSize: '13px', padding: '9px 12px', outline: 'none', width: '100%', boxSizing: 'border-box' }} />
          </div>
          <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
            <label style={{ fontFamily: FF_DM, fontSize: '11px', color: MUTED }}>Nome de exibição (opcional)</label>
            <input value={nome} onChange={e => setNome(e.target.value)}
              placeholder={`Planilha ${label}`}
              style={{ background: BG_INPUT, border: `1px solid ${BORDA}`, borderRadius: '6px', color: TEXT, fontFamily: FF_DM, fontSize: '13px', padding: '9px 12px', outline: 'none', width: '100%', boxSizing: 'border-box' }} />
          </div>
          <div style={{ display: 'flex', gap: '8px' }}>
            <button onClick={handleSalvar} disabled={pending || !input.trim()}
              style={{ flex: 1, display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '6px', background: pending || !input.trim() ? BORDA : GOLD, border: 'none', borderRadius: '6px', color: pending || !input.trim() ? MUTED : '#03040C', fontFamily: FF_DM, fontSize: '12px', fontWeight: 600, padding: '9px', cursor: pending || !input.trim() ? 'not-allowed' : 'pointer' }}>
              {pending && <HaloSpinner size="sm" />}
              {pending ? 'Validando…' : 'Salvar'}
            </button>
            {planilha && (
              <button onClick={() => { setEditando(false); setInput(''); setNome('') }} disabled={pending}
                style={{ background: 'transparent', border: `1px solid ${BORDA}`, borderRadius: '6px', color: MUTED, fontFamily: FF_DM, fontSize: '12px', padding: '9px 14px', cursor: 'pointer' }}>
                Cancelar
              </button>
            )}
          </div>
        </>
      )}

      {/* Modal confirmação de exclusão */}
      {confirmar && (
        <div style={{ position: 'fixed', inset: 0, background: 'rgba(3,4,12,0.85)', display: 'flex', alignItems: 'center', justifyContent: 'center', zIndex: 50 }}>
          <div style={{ background: '#0d0d1a', border: '1px solid rgba(201,122,122,0.4)', borderRadius: '12px', padding: '28px', maxWidth: '380px', width: '90%', display: 'flex', flexDirection: 'column', gap: '16px' }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
              <AlertTriangle size={16} color={VERMELHO} />
              <span style={{ fontFamily: FF_SYNE, fontSize: '13px', fontWeight: 600, color: VERMELHO, letterSpacing: '0.06em' }}>Remover planilha</span>
            </div>
            <p style={{ fontFamily: FF_DM, fontSize: '13px', color: TEXT, margin: 0 }}>
              Remover <strong style={{ color: '#fff' }}>{planilha?.nome}</strong> do slot <strong style={{ color: GOLD }}>{label}</strong>? A planilha no Google Sheets não será afetada.
            </p>
            <div style={{ display: 'flex', gap: '8px' }}>
              <button onClick={handleApagar} disabled={pending}
                style={{ flex: 1, display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '6px', background: 'rgba(201,122,122,0.15)', border: '1px solid rgba(201,122,122,0.4)', borderRadius: '6px', color: VERMELHO, fontFamily: FF_DM, fontSize: '12px', fontWeight: 600, padding: '9px', cursor: pending ? 'not-allowed' : 'pointer' }}>
                {pending ? <HaloSpinner size="sm" /> : <Trash2 size={12} />}
                {pending ? 'Removendo…' : 'Remover'}
              </button>
              <button onClick={() => setConfirmar(false)} disabled={pending}
                style={{ background: 'transparent', border: `1px solid ${BORDA}`, borderRadius: '6px', color: MUTED, fontFamily: FF_DM, fontSize: '12px', padding: '9px 14px', cursor: 'pointer' }}>
                Cancelar
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}

// ── Pill de categoria do KPI ──────────────────────────────────────────────────

function PillCategoria({ categoria }: { categoria: KpiCategoria }) {
  const isPrincipal = categoria === 'principal'
  return (
    <span style={{
      fontFamily: FF_SYNE, fontSize: '9px', fontWeight: 600, letterSpacing: '0.06em',
      textTransform: 'uppercase',
      color: isPrincipal ? '#e8c96d' : LAVANDA,
      background: isPrincipal ? 'rgba(244,212,124,0.10)' : 'rgba(176,170,255,0.10)',
      border: `1px solid ${isPrincipal ? 'rgba(244,212,124,0.30)' : 'rgba(176,170,255,0.25)'}`,
      borderRadius: '99px', padding: '2px 8px', whiteSpace: 'nowrap',
    }}>
      {CATEGORIA_LABEL[categoria]}
    </span>
  )
}

// ── Tabela de mapeamento de colunas KPI ───────────────────────────────────────

const GRUPOS: { label: string; categoria: KpiCategoria }[] = [
  { label: CATEGORIA_LABEL.principal,       categoria: 'principal' },
  { label: CATEGORIA_LABEL.ganhos_retencao, categoria: 'ganhos_retencao' },
  { label: CATEGORIA_LABEL.qualidade,       categoria: 'qualidade' },
  { label: CATEGORIA_LABEL.pausas,          categoria: 'pausas' },
  { label: CATEGORIA_LABEL.presenca,        categoria: 'presenca' },
]

const TODOS_KPIS = [...KPIS_PRINCIPAIS, ...KPIS_SECUNDARIOS]

function TabelaMapeamentoKpi({
  mapeamentoInicial,
  onToast,
  escopo = 'operador',
}: {
  mapeamentoInicial: Record<string, string>
  onToast: (t: ToastState) => void
  escopo?: 'operador' | 'gestor'
}) {
  const [valores, setValores] = useState<Record<string, string>>(
    () => Object.fromEntries(TODOS_KPIS.map(k => [k.key, mapeamentoInicial[k.key] ?? '']))
  )
  const [invalidos, setInvalidos] = useState<Set<string>>(new Set())
  const [pending, startTransition] = useTransition()

  function handleChange(key: KpiKey, raw: string) {
    const val = raw.toUpperCase().replace(/[^A-Z]/g, '').slice(0, 3)
    setValores(prev => ({ ...prev, [key]: val }))
    setInvalidos(prev => { const n = new Set(prev); n.delete(key); return n })
  }

  function handleSalvar() {
    const novosInvalidos = new Set<string>()
    for (const [key, val] of Object.entries(valores)) {
      if (val && !/^[A-Z]{1,3}$/.test(val)) novosInvalidos.add(key)
    }
    if (novosInvalidos.size > 0) {
      setInvalidos(novosInvalidos)
      onToast({ msg: 'Algumas colunas estão inválidas. Use apenas letras (A-Z, máx. 3).', tipo: 'erro' })
      return
    }
    startTransition(async () => {
      const res = escopo === 'gestor'
        ? await salvarMapeamentoKpiGestorColunasAction(valores)
        : await salvarMapeamentoKpiColunasAction(valores)
      if (res.ok) {
        onToast({ msg: escopo === 'gestor' ? 'Mapeamento gestor salvo.' : 'Mapeamento salvo com sucesso.', tipo: 'ok' })
      } else {
        onToast({ msg: res.error ?? 'Erro ao salvar mapeamento.', tipo: 'erro' })
      }
    })
  }

  const avisoText = escopo === 'gestor'
    ? 'O supervisor (gestor) está sempre na coluna A da aba KPI GESTOR e não pode ser alterado.'
    : 'O email do operador está sempre na coluna A e não pode ser alterado.'

  const headerText = escopo === 'gestor'
    ? 'Mapeamento de Colunas — KPI Gestor'
    : 'Mapeamento de Colunas — KPI'

  const headerDesc = escopo === 'gestor'
    ? 'Informe em qual coluna da aba KPI GESTOR cada indicador está. Use letras (A, B, C... AH).'
    : 'Informe em qual coluna da aba KPI CONSOLIDADO cada indicador está. Use letras (A, B, C... AH).'

  const btnLabel = escopo === 'gestor' ? 'Salvar Mapeamento Gestor' : 'Salvar Mapeamento'

  let zebraIdx = 0

  return (
    <>
      {/* Sub-divisória: só no escopo operador (está dentro do bloco KPI & Quartil) */}
      {escopo === 'operador' && (
        <div style={{ height: '1px', background: BORDA, margin: '24px 0' }} />
      )}

      {/* Sub-cabeçalho */}
      <div>
        <p style={{ fontFamily: FF_SYNE, fontSize: '11px', fontWeight: 600, letterSpacing: '0.10em', color: TEXT, textTransform: 'uppercase', margin: '0 0 6px 0' }}>
          {headerText}
        </p>
        <p style={{ fontFamily: FF_SYNE, fontSize: '11px', fontWeight: 600, color: MUTED, margin: '0 0 12px 0' }}>
          {headerDesc}
        </p>
        <div style={{ display: 'flex', alignItems: 'center', gap: '8px', padding: '8px 12px', background: 'rgba(244,212,124,0.04)', border: '1px solid rgba(244,212,124,0.10)', borderRadius: '8px', marginBottom: '16px' }}>
          <Info size={12} color="#e8c96d" style={{ flexShrink: 0 }} />
          <span style={{ fontFamily: FF_SYNE, fontSize: '11px', fontWeight: 600, color: MUTED }}>
            {avisoText}
          </span>
        </div>
      </div>

      {/* Tabela */}
      <div style={{ background: BG_TABLE, border: '1px solid rgba(244,212,124,0.10)', borderRadius: '10px', overflow: 'hidden' }}>
        <table style={{ width: '100%', borderCollapse: 'collapse' }}>
          <thead>
            <tr style={{ background: BG_THEAD, borderBottom: `1px solid ${BORDA}` }}>
              {(['KPI', 'COLUNA', 'CATEGORIA'] as const).map(h => (
                <th key={h} scope="col" style={{ textAlign: 'left', padding: '14px 18px', fontFamily: FF_SYNE, fontSize: '11px', fontWeight: 600, letterSpacing: '0.10em', color: TEXT, textTransform: 'uppercase' }}>
                  {h}
                </th>
              ))}
            </tr>
          </thead>
          <tbody>
            {GRUPOS.map(grupo => {
              const kpisDoGrupo = TODOS_KPIS.filter(k => k.categoria === grupo.categoria)
              return (
                <React.Fragment key={grupo.categoria}>
                  <tr style={{ background: 'rgba(123,163,217,0.04)' }}>
                    <td colSpan={3} style={{ padding: '10px 18px', fontFamily: FF_SYNE, fontSize: '10px', fontWeight: 600, letterSpacing: '0.10em', color: AZUL, textTransform: 'uppercase' }}>
                      {grupo.label}
                    </td>
                  </tr>
                  {kpisDoGrupo.map(kpi => {
                    const zebra = zebraIdx++ % 2 === 0
                    const isInvalido = invalidos.has(kpi.key)
                    return (
                      <tr key={kpi.key} style={{
                        background: zebra ? 'transparent' : 'rgba(244,212,124,0.015)',
                        borderBottom: '1px solid rgba(33,31,60,0.5)',
                      }}
                        onMouseEnter={e => (e.currentTarget.style.background = 'rgba(244,212,124,0.03)')}
                        onMouseLeave={e => (e.currentTarget.style.background = zebra ? 'transparent' : 'rgba(244,212,124,0.015)')}
                      >
                        <td style={{ padding: '12px 18px', fontFamily: FF_SYNE, fontSize: '13px', fontWeight: 600, letterSpacing: '0.04em', color: TEXT, textTransform: 'uppercase' }}>
                          {kpi.label}
                        </td>
                        <td style={{ padding: '10px 18px' }}>
                          <input
                            value={valores[kpi.key] ?? ''}
                            onChange={e => handleChange(kpi.key, e.target.value)}
                            placeholder="Ex: A"
                            maxLength={3}
                            style={{
                              background: BG_THEAD,
                              border: `1px solid ${isInvalido ? 'rgba(227,57,57,0.50)' : 'rgba(114,112,143,0.5)'}`,
                              borderRadius: '8px', padding: '6px 10px',
                              width: '90px', textAlign: 'center',
                              fontFamily: FF_DM, fontSize: '13px', fontWeight: 500,
                              color: TEXT, textTransform: 'uppercase',
                              outline: 'none',
                            }}
                            onFocus={e => {
                              e.currentTarget.style.borderColor = 'rgba(244,212,124,0.5)'
                              e.currentTarget.style.boxShadow = '0 0 0 3px rgba(244,212,124,0.08)'
                            }}
                            onBlur={e => {
                              e.currentTarget.style.borderColor = isInvalido ? 'rgba(227,57,57,0.50)' : 'rgba(114,112,143,0.5)'
                              e.currentTarget.style.boxShadow = 'none'
                            }}
                          />
                        </td>
                        <td style={{ padding: '10px 18px' }}>
                          <PillCategoria categoria={kpi.categoria} />
                        </td>
                      </tr>
                    )
                  })}
                </React.Fragment>
              )
            })}
          </tbody>
        </table>
      </div>

      {/* Botão salvar */}
      <div style={{ display: 'flex', justifyContent: 'flex-end', marginTop: '18px' }}>
        <button onClick={handleSalvar} disabled={pending}
          style={{
            display: 'flex', alignItems: 'center', gap: '8px',
            background: pending ? BORDA : GOLD,
            border: 'none', borderRadius: '8px',
            color: pending ? MUTED : '#03040C',
            fontFamily: FF_SYNE, fontSize: '11px', fontWeight: 700, letterSpacing: '0.10em',
            padding: '10px 20px', cursor: pending ? 'not-allowed' : 'pointer',
            textTransform: 'uppercase',
          }}>
          {pending ? <HaloSpinner size="sm" /> : <Save size={13} />}
          {pending ? 'Salvando…' : btnLabel.toUpperCase()}
        </button>
      </div>
    </>
  )
}

// ── Principal ─────────────────────────────────────────────────────────────────

interface Props {
  mesAtual:        Planilha | null; abasMesAtual:    string[]
  mesPassado:      Planilha | null; abasMesPassado:  string[]
  kpiQuartil:      Planilha | null; abasKpiQuartil:  string[]
  mapeamentoInicial:       Record<string, string>
  mapeamentoGestorInicial: Record<string, string>
}

export default function PlanilhasConfigClient({
  mesAtual, abasMesAtual,
  mesPassado, abasMesPassado,
  kpiQuartil, abasKpiQuartil,
  mapeamentoInicial,
  mapeamentoGestorInicial,
}: Props) {
  const [toast, setToast] = useState<ToastState | null>(null)

  function mostrarToast(t: ToastState) {
    setToast(t)
    setTimeout(() => setToast(null), 4000)
  }

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: '28px' }}>

      {/* ── Bloco 1: Planilhas de Operação ── */}
      <PainelSectionTitle>PLANILHAS DE OPERAÇÃO</PainelSectionTitle>
      <p style={{ fontFamily: FF_DM, fontSize: '13px', color: MUTED, margin: 0 }}>
        Configure as planilhas do Google Sheets usadas pelo painel operacional.
        A planilha do <strong style={{ color: TEXT }}>Mês Atual</strong> é a fonte principal de todos os indicadores.
        A do <strong style={{ color: TEXT }}>Mês Passado</strong> alimenta os comparativos históricos.
      </p>
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(300px, 1fr))', gap: '16px' }}>
        <SlotPlanilha tipo="mes_atual"   planilha={mesAtual}   abas={abasMesAtual}
          label="Mês Atual"   descricao="Planilha principal exibida no painel operacional."
          onToast={mostrarToast} />
        <SlotPlanilha tipo="mes_passado" planilha={mesPassado} abas={abasMesPassado}
          label="Mês Passado" descricao="Planilha anterior — usada para comparativos históricos."
          onToast={mostrarToast} />
      </div>

      <DivisorSecao />

      {/* ── Bloco 2: KPI & Quartil ── */}
      <PainelSectionTitle>KPI &amp; QUARTIL ATUAL</PainelSectionTitle>
      <p style={{ fontFamily: FF_SYNE, fontSize: '12px', fontWeight: 600, color: MUTED, lineHeight: 1.6, maxWidth: '720px', margin: 0 }}>
        Configure a planilha que contém os KPIs e o Quartil do mês atual. A planilha deve ter três guias:{' '}
        <strong style={{ color: TEXT }}>KPI CONSOLIDADO</strong>,{' '}
        <strong style={{ color: TEXT }}>QUARTIL</strong> e{' '}
        <strong style={{ color: TEXT }}>KPI GESTOR</strong>. As colunas podem mudar de um mês para outro — use os mapeamentos abaixo para informar em qual coluna cada indicador está em cada aba.
      </p>

      <SlotPlanilha
        tipo="kpi_quartil"
        planilha={kpiQuartil}
        abas={abasKpiQuartil}
        label="Planilha de KPI & Quartil"
        descricao="Fonte dos KPIs e Quartil exibidos nas telas operacionais e de gestor."
        onToast={mostrarToast}
        fullWidth
      />

      <TabelaMapeamentoKpi mapeamentoInicial={mapeamentoInicial} onToast={mostrarToast} escopo="operador" />

      <DivisorSecao />

      {/* ── Bloco 3: Mapeamento KPI Gestor ── */}
      <PainelSectionTitle>MAPEAMENTO KPI GESTOR</PainelSectionTitle>
      <p style={{ fontFamily: FF_SYNE, fontSize: '12px', fontWeight: 600, color: MUTED, lineHeight: 1.6, maxWidth: '720px', margin: 0 }}>
        Configure as colunas da aba <strong style={{ color: TEXT }}>KPI GESTOR</strong> (mesma planilha de KPI cadastrada acima).
        Os mesmos 20 indicadores existem em ambas as abas, mas em colunas diferentes — cada aba tem seu próprio mapeamento.
      </p>

      <TabelaMapeamentoKpi mapeamentoInicial={mapeamentoGestorInicial} onToast={mostrarToast} escopo="gestor" />

      {toast && <Toast toast={toast} onDismiss={() => setToast(null)} />}
    </div>
  )
}
