'use client'

import { useMemo, useState, useTransition } from 'react'
import type { KPIItem } from '@/lib/kpi-utils'
import KPICard from './KPICard'
import { ArrowLeft, ArrowUp, ArrowDown, Save, SlidersHorizontal } from 'lucide-react'
import Link from 'next/link'
import { reordenarMetas } from '@/app/painel/metas/actions'

interface KPICompletoProps {
  kpis: KPIItem[]
  nomeOperador: string
  linkVoltar: string
  podeOrdenar?: boolean
}

// Colunas informativas que não são KPIs — removidas da visualização
const COLUNAS_INFO = ['colaborador', 'gestor', 'status', 'mídia', 'midia', 'media']

function isColunaBloqueada(kpi: KPIItem): boolean {
  const chave = (kpi.label + ' ' + kpi.nome_coluna).toLowerCase()
  return COLUNAS_INFO.some((c) => chave.includes(c))
}

export default function KPICompleto({ kpis, nomeOperador, linkVoltar, podeOrdenar = false }: KPICompletoProps) {
  // Remove colunas informativas; separa os que têm meta (ordenáveis) dos neutros
  const [lista, setLista] = useState<KPIItem[]>(() => {
    const filtrado = kpis.filter((k) => !isColunaBloqueada(k))
    return [
      ...filtrado.filter(k => k.meta).sort((a, b) => (a.meta!.ordem ?? 99) - (b.meta!.ordem ?? 99)),
      ...filtrado.filter(k => !k.meta),
    ]
  })
  const [modoOrdem, setModoOrdem] = useState(false)
  const [dirty, setDirty] = useState(false)
  const [salvando, startSalvar] = useTransition()

  const resumo = useMemo(() => {
    const com = lista.filter(k => k.status !== 'neutro')
    return {
      verde:    com.filter(k => k.status === 'verde').length,
      amarelo:  com.filter(k => k.status === 'amarelo').length,
      vermelho: com.filter(k => k.status === 'vermelho').length,
      semMeta:  lista.filter(k => k.status === 'neutro').length,
    }
  }, [lista])

  function mover(idx: number, dir: -1 | 1) {
    const novo = [...lista]
    const alvo = idx + dir
    // Só move dentro dos que têm meta
    const limiteOrdenavel = novo.filter(k => k.meta).length
    if (alvo < 0 || alvo >= limiteOrdenavel) return
    ;[novo[idx], novo[alvo]] = [novo[alvo], novo[idx]]
    setLista(novo)
    setDirty(true)
  }

  function salvarOrdem() {
    const ordens = lista
      .filter(k => k.meta)
      .map((k, i) => ({ id: k.meta!.id, ordem: i }))
    startSalvar(async () => {
      await reordenarMetas(ordens)
      setDirty(false)
      setModoOrdem(false)
    })
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-start gap-4">
        <Link
          href={linkVoltar}
          className="mt-0.5 p-2 rounded-xl transition-colors shrink-0"
          style={{ color: 'var(--text-muted)' }}
          onMouseEnter={(e) => { const el = e.currentTarget as HTMLElement; el.style.color = 'var(--text-primary)'; el.style.background = 'rgba(201,168,76,0.06)' }}
          onMouseLeave={(e) => { const el = e.currentTarget as HTMLElement; el.style.color = 'var(--text-muted)'; el.style.background = 'transparent' }}
        >
          <ArrowLeft size={16} />
        </Link>

        <div className="flex-1">
          <h2 className="text-lg font-bold" style={{ color: 'var(--text-primary)' }}>KPI Completo</h2>
          <p className="text-xs mt-0.5" style={{ color: 'var(--text-muted)' }}>
            {nomeOperador} · {lista.length} indicadores
          </p>

          {/* Chips de resumo */}
          <div className="flex gap-2 mt-3 flex-wrap">
            <Chip cor="verde"    label="Dentro da meta" valor={resumo.verde} />
            <Chip cor="amarelo"  label="Atenção"        valor={resumo.amarelo} />
            <Chip cor="vermelho" label="Fora da meta"   valor={resumo.vermelho} />
            {resumo.semMeta > 0 && (
              <div className="flex items-center gap-1.5 px-3 py-1.5 rounded-xl border" style={{ background: 'rgba(201,168,76,0.04)', borderColor: 'rgba(201,168,76,0.12)' }}>
                <span className="text-xs" style={{ color: 'var(--text-muted)' }}>sem meta:</span>
                <span className="text-sm font-bold" style={{ color: 'var(--text-secondary)' }}>{resumo.semMeta}</span>
              </div>
            )}
          </div>
        </div>

        {/* Botão de ordenar (apenas gestor) */}
        {podeOrdenar && (
          <div className="flex items-center gap-2 shrink-0 mt-0.5">
            {modoOrdem && dirty && (
              <button
                onClick={salvarOrdem}
                disabled={salvando}
                className="btn-primary flex items-center gap-1.5 text-xs py-2 px-3"
              >
                <Save size={12} />
                {salvando ? 'Salvando…' : 'Salvar ordem'}
              </button>
            )}
            <button
              onClick={() => { setModoOrdem(!modoOrdem); if (modoOrdem) setDirty(false) }}
              className="flex items-center gap-1.5 text-xs px-3 py-2 rounded-xl border transition-colors"
              style={{
                color: modoOrdem ? 'var(--gold-light)' : 'var(--text-muted)',
                background: modoOrdem ? 'rgba(201,168,76,0.08)' : 'transparent',
                borderColor: modoOrdem ? 'rgba(201,168,76,0.3)' : 'rgba(201,168,76,0.12)',
              }}
            >
              <SlidersHorizontal size={12} />
              {modoOrdem ? 'Cancelar' : 'Reordenar'}
            </button>
          </div>
        )}
      </div>

      {/* Grid de cards */}
      {lista.length === 0 ? (
        <div className="rounded-2xl border p-12 text-center" style={{ background: 'var(--bg-elevated)', borderColor: 'rgba(201,168,76,0.10)' }}>
          <p className="text-sm" style={{ color: 'var(--text-secondary)' }}>Nenhum dado disponível.</p>
        </div>
      ) : modoOrdem ? (
        /* Modo de reordenação — lista vertical com setas */
        <div className="space-y-2">
          <p className="text-xs" style={{ color: 'var(--text-muted)' }}>
            Use as setas para reordenar. Clique em &quot;Salvar ordem&quot; para confirmar.
          </p>
          {lista.map((kpi, idx) => {
            const temMeta = !!kpi.meta
            const limiteOrdenavel = lista.filter(k => k.meta).length
            return (
              <div
                key={kpi.nome_coluna}
                className="flex items-center gap-3 rounded-xl border px-4 py-3 transition-colors"
                style={{
                  background: temMeta ? 'var(--bg-elevated)' : 'rgba(201,168,76,0.02)',
                  borderColor: 'rgba(201,168,76,0.10)',
                }}
              >
                <span className="text-xs w-5 text-center font-mono" style={{ color: 'var(--text-muted)' }}>{idx + 1}</span>
                <div className="flex-1 min-w-0">
                  <p className="text-sm font-medium truncate" style={{ color: 'var(--text-primary)' }}>{kpi.label}</p>
                  <p className="text-[10px]" style={{ color: 'var(--text-muted)' }}>{kpi.nome_coluna}</p>
                </div>
                {temMeta && (
                  <div className="flex gap-1">
                    <button
                      onClick={() => mover(idx, -1)}
                      disabled={idx === 0}
                      className="p-1.5 rounded-lg transition-colors disabled:opacity-20"
                      style={{ color: 'var(--text-muted)' }}
                      onMouseEnter={(e) => { if (!e.currentTarget.disabled) (e.currentTarget as HTMLElement).style.color = 'var(--gold-light)' }}
                      onMouseLeave={(e) => { (e.currentTarget as HTMLElement).style.color = 'var(--text-muted)' }}
                    >
                      <ArrowUp size={13} />
                    </button>
                    <button
                      onClick={() => mover(idx, 1)}
                      disabled={idx >= limiteOrdenavel - 1}
                      className="p-1.5 rounded-lg transition-colors disabled:opacity-20"
                      style={{ color: 'var(--text-muted)' }}
                      onMouseEnter={(e) => { if (!e.currentTarget.disabled) (e.currentTarget as HTMLElement).style.color = 'var(--gold-light)' }}
                      onMouseLeave={(e) => { (e.currentTarget as HTMLElement).style.color = 'var(--text-muted)' }}
                    >
                      <ArrowDown size={13} />
                    </button>
                  </div>
                )}
              </div>
            )
          })}
        </div>
      ) : (
        /* Modo normal — grid de cards */
        <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 xl:grid-cols-5 2xl:grid-cols-6 gap-3">
          {lista.map((kpi, idx) => (
            <KPICard key={kpi.nome_coluna} kpi={kpi} index={idx} />
          ))}
        </div>
      )}
    </div>
  )
}

function Chip({ cor, label, valor }: { cor: string; label: string; valor: number }) {
  const styles: Record<string, { bg: string; border: string; color: string }> = {
    verde:    { bg: 'rgba(16,185,129,0.08)',  border: 'rgba(16,185,129,0.2)',  color: '#34d399' },
    amarelo:  { bg: 'rgba(245,158,11,0.08)',  border: 'rgba(245,158,11,0.2)',  color: '#fbbf24' },
    vermelho: { bg: 'rgba(239,68,68,0.08)',   border: 'rgba(239,68,68,0.2)',   color: '#f87171' },
  }
  const s = styles[cor]
  return (
    <div className="flex items-center gap-1.5 px-3 py-1.5 rounded-xl border" style={{ background: s.bg, borderColor: s.border }}>
      <span style={{
        fontFamily: 'var(--ff-body)',
        fontSize: '0.875rem',
        fontWeight: 700,
        lineHeight: 1,
        fontVariantNumeric: 'tabular-nums',
        fontFeatureSettings: '"tnum" 1',
        color: s.color,
      }}>{valor}</span>
      <span className="text-[10px] opacity-80" style={{ color: s.color }}>{label}</span>
    </div>
  )
}
