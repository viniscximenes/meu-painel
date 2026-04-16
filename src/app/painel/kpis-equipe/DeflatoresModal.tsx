'use client'

import { useState } from 'react'
import { X, TrendingDown, AlertCircle } from 'lucide-react'
import type { Meta } from '@/lib/kpi-utils'
import type { DadosOperador } from './page'
import { formatarExibicao, normalizarChave } from '@/lib/kpi-utils'
import { getAvatarStyle, getIniciaisNome } from '@/lib/operadores'

interface Props {
  metas: Meta[]
  dadosEquipe: DadosOperador[]
}

interface ForaCriterio {
  meta: Meta
  operadores: { id: number; nome: string; valor: string }[]
}

function calcularFora(nomeColuna: string, metas: Meta[], dadosEquipe: DadosOperador[]): ForaCriterio | null {
  const meta = metas.find((m) => m.nome_coluna === nomeColuna)
  if (!meta) return null

  const operadores = dadosEquipe
    .filter((d) => d.encontrado)
    .flatMap(({ op, kpis }) => {
      const kpi = kpis.find(
        (k) => normalizarChave(k.nome_coluna) === normalizarChave(nomeColuna)
      )
      if (!kpi || kpi.status !== 'vermelho') return []
      return [{ id: op.id, nome: op.nome, valor: kpi.valor }]
    })

  return { meta, operadores }
}

function SecaoCriterio({ data }: { data: ForaCriterio }) {
  return (
    <div>
      <div className="flex items-center gap-2 mb-3">
        <span className="text-xs font-semibold" style={{ color: 'var(--text-secondary)' }}>
          {data.meta.label}
        </span>
        <span
          className="text-[10px] px-2 py-0.5 rounded-full"
          style={{ background: 'rgba(239,68,68,0.10)', color: '#f87171' }}
        >
          {data.operadores.length} fora da meta
        </span>
      </div>

      {data.operadores.length === 0 ? (
        <p className="text-xs py-2" style={{ color: 'var(--text-muted)' }}>
          Nenhum operador fora da meta para este critério.
        </p>
      ) : (
        <div className="grid grid-cols-2 sm:grid-cols-3 gap-2">
          {data.operadores.map((d) => (
            <div
              key={d.id}
              className="rounded-xl border p-2.5 flex items-center gap-2"
              style={{ background: 'rgba(239,68,68,0.06)', borderColor: 'rgba(239,68,68,0.22)' }}
            >
              <div
                className="w-7 h-7 rounded-lg flex items-center justify-center text-[9px] font-bold shrink-0 border-2"
                style={getAvatarStyle(d.id)}
              >
                {getIniciaisNome(d.nome)}
              </div>
              <div className="flex-1 min-w-0">
                <p className="text-[11px] font-medium truncate" style={{ color: 'var(--text-primary)' }}>
                  {d.nome.split(' ')[0]}
                </p>
                <p className="text-xs font-bold" style={{ color: '#f87171' }}>
                  {formatarExibicao(d.valor, data.meta.unidade)}
                </p>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  )
}

export default function DeflatoresModal({ metas, dadosEquipe }: Props) {
  const [open, setOpen] = useState(false)
  const [criterio1, setCriterio1] = useState('')
  const [criterio2, setCriterio2] = useState('')

  const data1 = criterio1 ? calcularFora(criterio1, metas, dadosEquipe) : null
  const data2 = criterio2 ? calcularFora(criterio2, metas, dadosEquipe) : null

  return (
    <>
      <button
        onClick={() => setOpen(true)}
        className="btn-secondary flex items-center gap-1.5 text-xs"
      >
        <TrendingDown size={13} />
        Deflatores
      </button>

      {open && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
          <div className="fixed inset-0 bg-black/70 backdrop-blur-sm" onClick={() => setOpen(false)} />

          <div
            className="relative rounded-2xl w-full max-w-2xl max-h-[85vh] flex flex-col glass-premium"
          >
            {/* Header */}
            <div
              className="flex items-center justify-between px-6 py-4 border-b"
              style={{ borderColor: 'var(--border)' }}
            >
              <div>
                <h3 className="font-bold text-base flex items-center gap-2" style={{ color: 'var(--text-primary)' }}>
                  <AlertCircle size={15} className="text-rose-400" />
                  Operadores Fora da Meta
                </h3>
                <p className="text-xs mt-0.5" style={{ color: 'var(--text-muted)' }}>
                  Status vermelho nos critérios selecionados
                </p>
              </div>
              <button
                onClick={() => setOpen(false)}
                className="p-2 rounded-xl transition-colors"
                style={{ color: 'var(--text-muted)' }}
                onMouseEnter={(e) => { (e.currentTarget as HTMLElement).style.color = 'var(--text-primary)' }}
                onMouseLeave={(e) => { (e.currentTarget as HTMLElement).style.color = 'var(--text-muted)' }}
              >
                <X size={16} />
              </button>
            </div>

            {/* Critérios */}
            <div
              className="px-6 py-4 grid grid-cols-2 gap-4 border-b"
              style={{ borderColor: 'var(--border)' }}
            >
              <div>
                <label className="block text-xs mb-1" style={{ color: 'var(--text-muted)' }}>Critério 1</label>
                <select value={criterio1} onChange={(e) => setCriterio1(e.target.value)} className="select">
                  <option value="">Selecione…</option>
                  {metas.map((m) => (
                    <option key={m.id} value={m.nome_coluna}>{m.label}</option>
                  ))}
                </select>
              </div>
              <div>
                <label className="block text-xs mb-1" style={{ color: 'var(--text-muted)' }}>Critério 2 (opcional)</label>
                <select value={criterio2} onChange={(e) => setCriterio2(e.target.value)} className="select">
                  <option value="">Nenhum</option>
                  {metas.filter((m) => m.nome_coluna !== criterio1).map((m) => (
                    <option key={m.id} value={m.nome_coluna}>{m.label}</option>
                  ))}
                </select>
              </div>
            </div>

            {/* Resultados */}
            <div className="flex-1 overflow-y-auto px-6 py-5 space-y-6">
              {!criterio1 ? (
                <div className="flex flex-col items-center justify-center py-12 text-center">
                  <TrendingDown size={32} style={{ color: 'var(--text-muted)', opacity: 0.4 }} />
                  <p className="text-sm mt-3" style={{ color: 'var(--text-muted)' }}>
                    Selecione um critério para ver quem está fora da meta.
                  </p>
                </div>
              ) : (
                <>
                  {data1 ? (
                    <SecaoCriterio data={data1} />
                  ) : (
                    <p className="text-xs" style={{ color: 'var(--text-muted)' }}>Meta não encontrada.</p>
                  )}

                  {criterio2 && data2 && (
                    <div style={{ borderTop: '1px solid var(--border)', paddingTop: '1.25rem' }}>
                      <SecaoCriterio data={data2} />
                    </div>
                  )}
                </>
              )}
            </div>
          </div>
        </div>
      )}
    </>
  )
}
