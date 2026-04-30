'use client'

import { useState, useTransition } from 'react'
import type { Planilha } from '@/lib/sheets'
import { salvarReferenciaAction } from './actions'
import { Save, X } from 'lucide-react'
import Link from 'next/link'

const FF_SYNE = "'Syne', sans-serif"
const FF_DM   = "'DM Sans', sans-serif"

type Toast = { tipo: 'ok' | 'erro'; msg: string } | null

// ── Helpers ───────────────────────────────────────────────────────────────────

function truncarId(id: string): string {
  if (id.length <= 16) return id
  return `${id.slice(0, 8)}…${id.slice(-4)}`
}

function refLabel(p: Planilha): string | null {
  if (p.referencia_mes && p.referencia_ano)
    return `${String(p.referencia_mes).padStart(2, '0')}/${p.referencia_ano}`
  return null
}

// ── Agrupamento por ano ───────────────────────────────────────────────────────

type Grupo = { ano: number | null; planilhas: Planilha[] }

function agruparPorAno(planilhas: Planilha[]): Grupo[] {
  const mapa = new Map<number | null, Planilha[]>()
  for (const p of planilhas) {
    const key = p.referencia_ano ?? null
    if (!mapa.has(key)) mapa.set(key, [])
    mapa.get(key)!.push(p)
  }

  for (const [, list] of mapa) {
    list.sort((a, b) => {
      if (a.referencia_mes === null && b.referencia_mes === null) return 0
      if (a.referencia_mes === null) return 1
      if (b.referencia_mes === null) return -1
      return b.referencia_mes - a.referencia_mes
    })
  }

  const grupos: Grupo[] = []
  const anos = ([...mapa.keys()] as (number | null)[])
    .filter((a): a is number => a !== null)
    .sort((a, b) => b - a)

  for (const ano of anos) {
    grupos.push({ ano, planilhas: mapa.get(ano)! })
  }
  if (mapa.has(null)) {
    const semRef = [...mapa.get(null)!].sort((a, b) => b.created_at.localeCompare(a.created_at))
    grupos.push({ ano: null, planilhas: semRef })
  }

  return grupos
}

// ── Sub-componentes ───────────────────────────────────────────────────────────

function FlorDourada() {
  return (
    <svg width={10} height={10} viewBox="0 0 10 10" fill="none" aria-hidden="true" style={{ flexShrink: 0 }}>
      <rect x="0"   y="3.5" width="3" height="3" fill="#c9a24a" transform="rotate(45 1.5 5)"  />
      <rect x="3.5" y="0"   width="3" height="3" fill="#c9a24a" transform="rotate(45 5 1.5)"  />
      <rect x="7"   y="3.5" width="3" height="3" fill="#c9a24a" transform="rotate(45 8.5 5)"  />
      <rect x="3.5" y="7"   width="3" height="3" fill="#c9a24a" transform="rotate(45 5 8.5)"  />
    </svg>
  )
}

function TituloAno({ ano }: { ano: number | null }) {
  return (
    <div style={{ display: 'flex', alignItems: 'center', gap: '12px', marginTop: '24px', marginBottom: '16px' }}>
      <FlorDourada />
      <span style={{
        fontFamily: ano !== null ? FF_DM : FF_SYNE,
        fontWeight: ano !== null ? 700 : 600,
        fontSize: '13px',
        textTransform: ano !== null ? 'none' : 'uppercase',
        letterSpacing: ano !== null ? '0.04em' : '0.10em',
        fontVariantNumeric: 'tabular-nums',
        color: '#A6A2A2', whiteSpace: 'nowrap', flexShrink: 0,
      }}>
        {ano !== null ? String(ano) : 'SEM REFERÊNCIA CONFIGURADA'}
      </span>
      <div style={{ flex: 1, height: '2px', background: 'rgba(244,212,124,0.30)' }} />
    </div>
  )
}

const INPUT_STYLE: React.CSSProperties = {
  background: '#03040C',
  border: '1px solid rgba(114,112,143,0.5)',
  borderRadius: '8px',
  color: '#A6A2A2',
  fontFamily: FF_DM,
  fontWeight: 500,
  fontSize: '13px',
  fontVariantNumeric: 'tabular-nums',
  padding: '7px 10px',
  outline: 'none',
}

function PlanilhaCard({ planilha, onToast }: { planilha: Planilha; onToast: (t: Toast) => void }) {
  const ref = refLabel(planilha)
  const [mes, setMes] = useState<string>(planilha.referencia_mes?.toString() ?? '')
  const [ano, setAno] = useState<string>(planilha.referencia_ano?.toString() ?? '')
  const [erro, setErro] = useState<string | null>(null)
  const [isPending, startTransition] = useTransition()

  function salvar() {
    const mesNum = mes ? parseInt(mes, 10) : null
    const anoNum = ano ? parseInt(ano, 10) : null
    if ((mes && !anoNum) || (!mes && ano)) {
      setErro('Preencha mês e ano ou deixe ambos em branco')
      return
    }
    setErro(null)
    startTransition(async () => {
      const res = await salvarReferenciaAction(planilha.id, mesNum, anoNum)
      if (res.ok) onToast({ tipo: 'ok', msg: 'Referência salva' })
      else { setErro(res.error ?? 'Erro'); onToast({ tipo: 'erro', msg: res.error ?? 'Erro ao salvar' }) }
    })
  }

  function limpar() {
    setMes('')
    setAno('')
    setErro(null)
    startTransition(async () => {
      const res = await salvarReferenciaAction(planilha.id, null, null)
      if (res.ok) onToast({ tipo: 'ok', msg: 'Referência removida' })
      else onToast({ tipo: 'erro', msg: res.error ?? 'Erro ao remover' })
    })
  }

  return (
    <div style={{
      background: '#070714',
      border: '1px solid rgba(244,212,124,0.10)',
      borderRadius: '10px',
      padding: '20px 24px',
      display: 'flex', flexDirection: 'column', gap: '14px',
    }}>
      <div style={{ display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between', gap: '16px', flexWrap: 'wrap' }}>
        <div style={{ display: 'flex', flexDirection: 'column', gap: '4px' }}>
          <span style={{
            fontFamily: FF_SYNE, fontWeight: 600, fontSize: '16px',
            textTransform: 'uppercase', letterSpacing: '0.04em', color: '#A6A2A2',
          }}>
            {planilha.nome}
          </span>
          <span style={{ fontFamily: FF_SYNE, fontWeight: 600, fontSize: '11px', color: '#474658', letterSpacing: '0.02em' }}>
            ID: {truncarId(planilha.spreadsheet_id)}
          </span>
        </div>

        <div style={{ display: 'inline-flex', alignItems: 'baseline', gap: '6px' }}>
          <span style={{
            fontFamily: FF_SYNE, fontWeight: 600, fontSize: '11px',
            textTransform: 'uppercase', letterSpacing: '0.06em', color: '#474658',
          }}>
            REFERÊNCIA:
          </span>
          <span style={{
            fontFamily: FF_DM, fontWeight: 500, fontSize: '13px',
            fontVariantNumeric: 'tabular-nums',
            color: ref ? '#A6A2A2' : '#474658',
            fontStyle: ref ? 'normal' : 'italic',
          }}>
            {ref ?? 'Não configurada'}
          </span>
        </div>
      </div>

      <div style={{ display: 'flex', gap: '8px', alignItems: 'center', flexWrap: 'wrap' }}>
        <input
          type="number"
          placeholder="Mês (1–12)"
          value={mes}
          onChange={e => setMes(e.target.value)}
          disabled={isPending}
          min={1} max={12}
          style={{ ...INPUT_STYLE, width: '110px' }}
        />
        <input
          type="number"
          placeholder="Ano"
          value={ano}
          onChange={e => setAno(e.target.value)}
          disabled={isPending}
          min={2020} max={2100}
          style={{ ...INPUT_STYLE, width: '100px' }}
        />
        <button
          type="button"
          onClick={salvar}
          disabled={isPending}
          className="btn-primary"
          style={{ display: 'inline-flex', alignItems: 'center', gap: '6px', padding: '7px 14px', fontSize: '12px' }}
        >
          <Save size={13} />
          SALVAR REFERÊNCIA
        </button>
        {ref && (
          <button
            type="button"
            onClick={limpar}
            disabled={isPending}
            style={{
              display: 'inline-flex', alignItems: 'center', gap: '4px',
              padding: '7px 12px', borderRadius: '8px', fontSize: '12px',
              background: 'transparent', border: '1px solid rgba(239,68,68,0.3)',
              color: 'rgba(248,113,113,0.8)', cursor: 'pointer',
              fontFamily: FF_DM, fontWeight: 500,
            }}
          >
            <X size={12} /> LIMPAR
          </button>
        )}
      </div>

      {erro && (
        <p style={{ fontFamily: FF_DM, fontSize: '12px', color: '#f87171', margin: 0 }}>{erro}</p>
      )}
    </div>
  )
}

// ── Main ──────────────────────────────────────────────────────────────────────

export default function HistoricoConfigClient({ planilhas }: { planilhas: Planilha[] }) {
  const [toast, setToast] = useState<Toast>(null)

  function showToast(t: Toast) {
    setToast(t)
    setTimeout(() => setToast(null), 3000)
  }

  if (!planilhas.length) {
    return (
      <div style={{
        padding: '32px', borderRadius: '10px', textAlign: 'center',
        background: '#070714', border: '1px solid rgba(244,212,124,0.10)',
      }}>
        <p style={{ fontFamily: FF_SYNE, fontWeight: 600, fontSize: '13px', color: '#72708F', marginBottom: '8px' }}>
          Nenhuma planilha cadastrada.
        </p>
        <Link
          href="/painel/admin/configuracoes/planilhas"
          style={{ fontFamily: FF_DM, fontSize: '12px', color: 'rgba(244,212,124,0.7)', textDecoration: 'underline' }}
        >
          Cadastrar em Ajuste de Planilhas
        </Link>
      </div>
    )
  }

  const grupos = agruparPorAno(planilhas)

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

      <div>
        {grupos.map(grupo => (
          <div key={grupo.ano ?? 'sem-ref'}>
            <TituloAno ano={grupo.ano} />
            <div style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
              {grupo.planilhas.map(p => (
                <PlanilhaCard key={p.id} planilha={p} onToast={showToast} />
              ))}
            </div>
          </div>
        ))}
      </div>
    </>
  )
}
