'use client'

import { useState, useTransition, useRef } from 'react'
import { Copy, Loader2 } from 'lucide-react'
import { OPERADORES_DISPLAY, getAvatarStyle, getIniciaisNome } from '@/lib/operadores'
import { atualizarNomeFantasiaAction } from '@/app/painel/semanal/actions'
import { copiarNomesDoMesAnteriorAction } from './actions'
import type { NomeFantasia } from '@/lib/snapshots'

// Apenas operadores reais — exclui caio.vsilva (id=13, gestor) e ana.angelica (ocultar)
const OPERADORES_EQUIPE = OPERADORES_DISPLAY.filter((op) => op.id <= 12)

const MESES = ['jan','fev','mar','abr','mai','jun','jul','ago','set','out','nov','dez']
function fmtMes(mes: string): string {
  const [y, m] = mes.split('-')
  return `${MESES[parseInt(m, 10) - 1] ?? m}/${y}`
}

export default function NomesFantasiaClient({
  mesReferencia,
  nomesIniciais,
}: {
  mesReferencia: string
  nomesIniciais: NomeFantasia[]
}) {
  const [nomes, setNomes] = useState<Record<number, string>>(() => {
    const m: Record<number, string> = {}
    nomesIniciais.forEach((n) => { m[Number(n.operador_id)] = n.nome_fantasia })
    return m
  })

  const [salvando, setSalvando] = useState<Set<number>>(new Set())
  const [salvos,   setSalvos]   = useState<Set<number>>(new Set())
  const [copiando, startCopiar] = useTransition()
  const [msgCopia, setMsgCopia] = useState<{ tipo: 'ok' | 'erro'; txt: string } | null>(null)
  const timers = useRef<Record<number, ReturnType<typeof setTimeout>>>({})

  async function salvar(opId: number) {
    const nome = (nomes[opId] ?? '').trim()
    if (nome.length < 2) return
    setSalvando((s) => new Set(s).add(opId))
    const res = await atualizarNomeFantasiaAction(opId, mesReferencia, nome)
    setSalvando((s) => { const n = new Set(s); n.delete(opId); return n })
    if (res.ok) {
      setSalvos((s) => new Set(s).add(opId))
      clearTimeout(timers.current[opId])
      timers.current[opId] = setTimeout(() => {
        setSalvos((s) => { const n = new Set(s); n.delete(opId); return n })
      }, 1000)
    }
  }

  function handleKeyDown(e: React.KeyboardEvent<HTMLInputElement>, opId: number) {
    if (e.key === 'Enter') { e.preventDefault(); e.currentTarget.blur() }
  }

  function handleCopiar() {
    startCopiar(async () => {
      const res = await copiarNomesDoMesAnteriorAction(mesReferencia)
      if (res.ok) {
        setNomes((prev) => ({ ...prev, ...res.nomes }))
        setMsgCopia({ tipo: 'ok', txt: `${res.copiados} nomes copiados do mês anterior.` })
      } else {
        setMsgCopia({ tipo: 'erro', txt: res.erro })
      }
      setTimeout(() => setMsgCopia(null), 3500)
    })
  }

  return (
    <div className="space-y-4">
      {/* Cabeçalho */}
      <div className="flex items-center justify-between gap-3 flex-wrap">
        <div>
          <p className="section-heading">Nomes Fantasia</p>
          <p className="text-xs mt-0.5" style={{ color: 'var(--text-muted)' }}>
            Referência:{' '}
            <span style={{ color: 'var(--text-secondary)' }}>{fmtMes(mesReferencia)}</span>
          </p>
        </div>
        <button
          type="button"
          onClick={handleCopiar}
          disabled={copiando}
          className="btn-secondary flex items-center gap-1.5 text-xs"
          style={copiando ? { opacity: 0.6, cursor: 'not-allowed' } : undefined}
        >
          {copiando
            ? <Loader2 size={12} className="animate-spin" />
            : <Copy size={12} />}
          {copiando ? 'Copiando…' : 'Novo mês'}
        </button>
      </div>

      {/* Feedback cópia */}
      {msgCopia && (
        <p
          className="text-xs px-3 py-2 rounded-lg"
          style={{
            background: msgCopia.tipo === 'ok'
              ? 'rgba(34,197,94,0.08)'
              : 'rgba(239,68,68,0.08)',
            border: `1px solid ${msgCopia.tipo === 'ok' ? 'rgba(34,197,94,0.2)' : 'rgba(239,68,68,0.2)'}`,
            color: msgCopia.tipo === 'ok' ? 'var(--verde)' : 'var(--vermelho)',
          }}
        >
          {msgCopia.txt}
        </p>
      )}

      {/* Lista */}
      <div className="space-y-2">
        {OPERADORES_EQUIPE.map((op) => {
          const isSalvando = salvando.has(op.id)
          const isSalvo    = salvos.has(op.id)
          return (
            <div
              key={op.id}
              className="flex items-center gap-3 px-4 py-2.5 rounded-xl"
              style={{
                background: 'var(--bg-elevated)',
                border: '1px solid rgba(201,168,76,0.08)',
              }}
            >
              {/* Avatar */}
              <div
                className="w-8 h-8 rounded-lg flex items-center justify-center text-[10px] font-bold shrink-0 border-2"
                style={getAvatarStyle(op.id)}
              >
                {getIniciaisNome(op.nome)}
              </div>

              {/* Nome real */}
              <span
                className="flex-1 text-sm truncate"
                style={{ color: 'var(--text-secondary)', minWidth: 0 }}
              >
                {op.nome.split(' ').slice(0, 2).join(' ')}
              </span>

              {/* Input */}
              <div className="relative shrink-0" style={{ width: '160px' }}>
                <input
                  type="text"
                  value={nomes[op.id] ?? ''}
                  onChange={(e) =>
                    setNomes((prev) => ({ ...prev, [op.id]: e.target.value }))
                  }
                  onBlur={() => salvar(op.id)}
                  onKeyDown={(e) => handleKeyDown(e, op.id)}
                  placeholder="Nome fantasia…"
                  disabled={isSalvando}
                  className="input text-sm"
                  style={{
                    padding: '6px 10px',
                    paddingRight: isSalvando ? '2rem' : '10px',
                    borderColor: isSalvo
                      ? 'rgba(34,197,94,0.7)'
                      : isSalvando
                        ? 'rgba(201,168,76,0.4)'
                        : undefined,
                    transition: 'border-color 0.3s',
                  }}
                />
                {isSalvando && (
                  <Loader2
                    size={12}
                    className="animate-spin absolute right-2.5 top-1/2 -translate-y-1/2"
                    style={{ color: 'var(--text-muted)' }}
                  />
                )}
              </div>
            </div>
          )
        })}
      </div>
    </div>
  )
}
