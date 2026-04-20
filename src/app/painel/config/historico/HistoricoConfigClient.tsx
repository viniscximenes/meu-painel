'use client'

import { useState, useTransition } from 'react'
import type { Planilha } from '@/lib/sheets'
import { salvarReferenciaAction } from './actions'
import { HaloSpinner } from '@/components/HaloSpinner'
import { CheckCircle2, XCircle, Pencil, X, Check } from 'lucide-react'

const MESES = [
  'Janeiro','Fevereiro','Março','Abril','Maio','Junho',
  'Julho','Agosto','Setembro','Outubro','Novembro','Dezembro',
]

interface HistoricoConfigClientProps {
  planilhas: Planilha[]
}

function mesAnoLabel(p: Planilha): string {
  if (p.referencia_mes && p.referencia_ano)
    return `${MESES[p.referencia_mes - 1]} ${p.referencia_ano}`
  return '—'
}

function RowEditor({
  planilha,
  onDone,
}: {
  planilha: Planilha
  onDone: () => void
}) {
  const [mes, setMes] = useState<string>(planilha.referencia_mes?.toString() ?? '')
  const [ano, setAno] = useState<string>(planilha.referencia_ano?.toString() ?? '')
  const [isPending, startTransition] = useTransition()
  const [erro, setErro] = useState<string | null>(null)

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
      if (res.ok) onDone()
      else setErro(res.error ?? 'Erro')
    })
  }

  function limpar() {
    startTransition(async () => {
      const res = await salvarReferenciaAction(planilha.id, null, null)
      if (res.ok) onDone()
      else setErro(res.error ?? 'Erro')
    })
  }

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
      <div style={{ display: 'flex', gap: '8px', alignItems: 'center', flexWrap: 'wrap' }}>
        <select
          value={mes}
          onChange={e => setMes(e.target.value)}
          disabled={isPending}
          style={{
            background: 'rgba(255,255,255,0.05)',
            border: '1px solid rgba(255,255,255,0.12)',
            borderRadius: '8px',
            color: 'var(--text-primary)',
            fontSize: '13px',
            padding: '6px 10px',
          }}
        >
          <option value="">Mês</option>
          {MESES.map((m, i) => (
            <option key={i} value={i + 1}>{m}</option>
          ))}
        </select>
        <input
          type="number"
          placeholder="Ano"
          value={ano}
          onChange={e => setAno(e.target.value)}
          disabled={isPending}
          min={2020}
          max={2100}
          style={{
            background: 'rgba(255,255,255,0.05)',
            border: '1px solid rgba(255,255,255,0.12)',
            borderRadius: '8px',
            color: 'var(--text-primary)',
            fontSize: '13px',
            padding: '6px 10px',
            width: '90px',
          }}
        />
        <button
          onClick={salvar}
          disabled={isPending}
          style={{
            display: 'flex', alignItems: 'center', gap: '4px',
            padding: '6px 12px', borderRadius: '8px', fontSize: '12px', fontWeight: 600,
            background: 'rgba(201,168,76,0.12)', border: '1px solid rgba(201,168,76,0.3)',
            color: '#f4d47c', cursor: 'pointer',
          }}
        >
          {isPending ? <HaloSpinner size="sm" /> : <Check size={13} />}
          Salvar
        </button>
        {(planilha.referencia_mes || planilha.referencia_ano) && (
          <button
            onClick={limpar}
            disabled={isPending}
            style={{
              display: 'flex', alignItems: 'center', gap: '4px',
              padding: '6px 10px', borderRadius: '8px', fontSize: '12px',
              background: 'rgba(239,68,68,0.08)', border: '1px solid rgba(239,68,68,0.2)',
              color: '#f87171', cursor: 'pointer',
            }}
          >
            <X size={13} /> Remover
          </button>
        )}
        <button
          onClick={onDone}
          disabled={isPending}
          style={{
            padding: '6px 10px', borderRadius: '8px', fontSize: '12px',
            background: 'rgba(255,255,255,0.04)', border: '1px solid rgba(255,255,255,0.1)',
            color: 'var(--text-muted)', cursor: 'pointer',
          }}
        >
          Cancelar
        </button>
      </div>
      {erro && <p style={{ fontSize: '12px', color: '#f87171', margin: 0 }}>{erro}</p>}
    </div>
  )
}

export default function HistoricoConfigClient({ planilhas }: HistoricoConfigClientProps) {
  const [editando, setEditando] = useState<string | null>(null)

  if (!planilhas.length) {
    return (
      <div style={{
        padding: '24px', borderRadius: '12px', textAlign: 'center',
        background: 'rgba(255,255,255,0.02)', border: '1px solid rgba(255,255,255,0.06)',
      }}>
        <p style={{ fontSize: '14px', color: 'var(--text-muted)' }}>
          Nenhuma planilha cadastrada ainda.
        </p>
      </div>
    )
  }

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
      {planilhas.map(p => (
        <div
          key={p.id}
          style={{
            background: 'rgba(255,255,255,0.02)',
            border: '1px solid rgba(255,255,255,0.07)',
            borderRadius: '12px',
            padding: '14px 16px',
            display: 'flex', flexDirection: 'column', gap: '10px',
          }}
        >
          {/* Row info */}
          <div style={{ display: 'flex', alignItems: 'center', gap: '12px', flexWrap: 'wrap' }}>
            <span style={{ fontSize: '13px', fontWeight: 600, color: 'var(--text-primary)', flex: 1, minWidth: '120px' }}>
              {p.nome}
            </span>
            <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
              {p.referencia_mes && p.referencia_ano
                ? <CheckCircle2 size={13} style={{ color: '#4ade80', flexShrink: 0 }} />
                : <XCircle size={13} style={{ color: 'rgba(255,255,255,0.25)', flexShrink: 0 }} />
              }
              <span style={{ fontSize: '12px', color: p.referencia_mes ? 'rgba(255,255,255,0.70)' : 'var(--text-muted)', minWidth: '120px' }}>
                {mesAnoLabel(p)}
              </span>
            </div>
            {p.ativa && (
              <span style={{
                fontSize: '9px', fontWeight: 700, letterSpacing: '0.1em', textTransform: 'uppercase',
                padding: '2px 8px', borderRadius: '99px',
                background: 'rgba(16,185,129,0.12)', border: '1px solid rgba(16,185,129,0.25)', color: '#34d399',
              }}>
                Ativa
              </span>
            )}
            {editando !== p.id && (
              <button
                onClick={() => setEditando(p.id)}
                style={{
                  display: 'flex', alignItems: 'center', gap: '4px',
                  padding: '5px 10px', borderRadius: '8px', fontSize: '11px',
                  background: 'rgba(201,168,76,0.06)', border: '1px solid rgba(201,168,76,0.15)',
                  color: 'rgba(244,212,124,0.8)', cursor: 'pointer',
                }}
              >
                <Pencil size={11} /> Editar
              </button>
            )}
          </div>

          {editando === p.id && (
            <RowEditor
              planilha={p}
              onDone={() => setEditando(null)}
            />
          )}
        </div>
      ))}
    </div>
  )
}
