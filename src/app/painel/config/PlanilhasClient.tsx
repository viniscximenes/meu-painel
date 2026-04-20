'use client'

import { useState, useTransition } from 'react'
import { adicionarPlanilha, definirPlanilhaAtiva, removerPlanilha } from './actions'
import type { Planilha } from '@/lib/sheets'
import {
  Plus, Trash2, Check, AlertCircle,
  ExternalLink, ChevronDown, ChevronUp,
} from 'lucide-react'
import { HaloSpinner } from '@/components/HaloSpinner'

export default function PlanilhasClient({ planilhas: inicial }: { planilhas: Planilha[] }) {
  const [planilhas, setPlanilhas] = useState(inicial)
  const [showForm, setShowForm] = useState(false)
  const [, startTransition] = useTransition()

  function handleAtivar(id: string) {
    const fd = new FormData()
    fd.set('id', id)
    startTransition(async () => {
      await definirPlanilhaAtiva(fd)
      // Atualiza estado local otimisticamente
      setPlanilhas((prev) => prev.map((p) => ({ ...p, ativa: p.id === id })))
    })
  }

  function handleRemover(id: string, nome: string) {
    if (!confirm(`Remover planilha "${nome}"?`)) return
    const fd = new FormData()
    fd.set('id', id)
    startTransition(async () => {
      await removerPlanilha(fd)
      setPlanilhas((prev) => prev.filter((p) => p.id !== id))
    })
  }

  function handleAdicionada(nova: Planilha) {
    setPlanilhas((prev) => [nova, ...prev])
    setShowForm(false)
  }

  return (
    <div className="space-y-4">
      {/* Lista */}
      {planilhas.length === 0 ? (
        <div
          className="rounded-2xl border p-10 text-center"
          style={{ background: 'var(--bg-elevated)', borderColor: 'rgba(201,168,76,0.10)' }}
        >
          <AlertCircle size={28} className="mx-auto mb-3" style={{ color: 'var(--text-muted)' }} />
          <p className="text-sm font-medium" style={{ color: 'var(--text-secondary)' }}>
            Nenhuma planilha cadastrada
          </p>
          <p className="text-xs mt-1" style={{ color: 'var(--text-muted)' }}>
            Adicione a primeira planilha abaixo.
          </p>
        </div>
      ) : (
        <div className="space-y-2">
          <p className="text-xs font-semibold uppercase tracking-wider" style={{ color: 'var(--text-muted)' }}>
            {planilhas.length} {planilhas.length === 1 ? 'planilha' : 'planilhas'}
          </p>
          {planilhas.map((p) => (
            <PlanilhaItem
              key={p.id}
              planilha={p}
              onAtivar={() => handleAtivar(p.id)}
              onRemover={() => handleRemover(p.id, p.nome)}
            />
          ))}
        </div>
      )}

      {/* Formulário de nova planilha */}
      {showForm ? (
        <NovaForm onCancelar={() => setShowForm(false)} onAdicionada={handleAdicionada} />
      ) : (
        <button
          onClick={() => setShowForm(true)}
          className="btn-secondary w-full flex items-center justify-center gap-2 text-sm py-3"
        >
          <Plus size={15} />
          Adicionar planilha
        </button>
      )}
    </div>
  )
}

// ── Item de planilha ──────────────────────────────────────────────────────────

function PlanilhaItem({
  planilha,
  onAtivar,
  onRemover,
}: {
  planilha: Planilha
  onAtivar: () => void
  onRemover: () => void
}) {
  const [expanded, setExpanded] = useState(false)

  return (
    <div
      className="rounded-xl border transition-colors"
      style={{
        background: planilha.ativa ? 'rgba(201,168,76,0.05)' : 'var(--bg-elevated)',
        borderColor: planilha.ativa ? 'rgba(201,168,76,0.3)' : 'rgba(201,168,76,0.10)',
      }}
    >
      <div className="flex items-center gap-3 px-4 py-3">
        {/* Indicador ativo */}
        <div
          className="w-2 h-2 rounded-full shrink-0"
          style={{ background: planilha.ativa ? 'var(--gold)' : 'rgba(201,168,76,0.2)' }}
        />

        {/* Info */}
        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-2">
            <span className="font-semibold text-sm" style={{ color: 'var(--text-primary)' }}>
              {planilha.nome}
            </span>
            {planilha.ativa && (
              <span
                className="text-[10px] font-bold px-2 py-0.5 rounded-full"
                style={{ background: 'rgba(201,168,76,0.15)', color: 'var(--gold-light)' }}
              >
                ATIVA
              </span>
            )}
          </div>
          {planilha.aba && (
            <p className="text-[10px] mt-0.5" style={{ color: 'var(--text-muted)' }}>
              Aba: {planilha.aba}
            </p>
          )}
        </div>

        {/* Ações */}
        <div className="flex items-center gap-1">
          <button
            onClick={() => setExpanded(!expanded)}
            className="p-1.5 rounded-lg transition-colors"
            style={{ color: 'var(--text-muted)' }}
            onMouseEnter={(e) => { (e.currentTarget as HTMLElement).style.color = 'var(--text-secondary)' }}
            onMouseLeave={(e) => { (e.currentTarget as HTMLElement).style.color = 'var(--text-muted)' }}
          >
            {expanded ? <ChevronUp size={13} /> : <ChevronDown size={13} />}
          </button>

          {!planilha.ativa && (
            <button
              onClick={onAtivar}
              className="flex items-center gap-1 text-[10px] font-semibold px-2.5 py-1.5 rounded-lg transition-colors"
              style={{ color: 'var(--gold-light)', background: 'rgba(201,168,76,0.08)' }}
              onMouseEnter={(e) => { (e.currentTarget as HTMLElement).style.background = 'rgba(201,168,76,0.15)' }}
              onMouseLeave={(e) => { (e.currentTarget as HTMLElement).style.background = 'rgba(201,168,76,0.08)' }}
            >
              <Check size={11} />
              Ativar
            </button>
          )}

          <button
            onClick={onRemover}
            className="p-1.5 rounded-lg transition-colors"
            style={{ color: 'var(--text-muted)' }}
            onMouseEnter={(e) => { const el = e.currentTarget as HTMLElement; el.style.color = '#f87171'; el.style.background = 'rgba(239,68,68,0.08)' }}
            onMouseLeave={(e) => { const el = e.currentTarget as HTMLElement; el.style.color = 'var(--text-muted)'; el.style.background = 'transparent' }}
          >
            <Trash2 size={13} />
          </button>
        </div>
      </div>

      {/* Detalhes expandidos */}
      {expanded && (
        <div
          className="px-4 pb-3 space-y-1"
          style={{ borderTop: '1px solid rgba(201,168,76,0.08)', paddingTop: '0.75rem' }}
        >
          <div className="flex items-center gap-2">
            <span
              className="text-[10px] font-mono px-2 py-1 rounded break-all"
              style={{ background: 'rgba(201,168,76,0.06)', color: 'var(--text-muted)' }}
            >
              {planilha.spreadsheet_id}
            </span>
            <a
              href={`https://docs.google.com/spreadsheets/d/${planilha.spreadsheet_id}`}
              target="_blank"
              rel="noopener noreferrer"
              className="p-1 rounded transition-colors shrink-0"
              style={{ color: 'var(--text-muted)' }}
              onMouseEnter={(e) => { (e.currentTarget as HTMLElement).style.color = 'var(--gold-light)' }}
              onMouseLeave={(e) => { (e.currentTarget as HTMLElement).style.color = 'var(--text-muted)' }}
            >
              <ExternalLink size={12} />
            </a>
          </div>
          <p className="text-[10px]" style={{ color: 'var(--text-muted)' }}>
            Criado em {new Date(planilha.created_at).toLocaleDateString('pt-BR')}
          </p>
        </div>
      )}
    </div>
  )
}

// ── Formulário de nova planilha ───────────────────────────────────────────────

function NovaForm({
  onCancelar,
  onAdicionada,
}: {
  onCancelar: () => void
  onAdicionada: (nova: Planilha) => void
}) {
  const [pending, startTransition] = useTransition()

  function handleSubmit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault()
    const fd = new FormData(e.currentTarget)
    startTransition(async () => {
      await adicionarPlanilha(fd)
      // Cria objeto local para atualização imediata
      const nova: Planilha = {
        id: crypto.randomUUID(),
        nome: (fd.get('nome') as string).trim(),
        spreadsheet_id: (fd.get('spreadsheet_id') as string).trim(),
        aba: (fd.get('aba') as string).trim(),
        ativa: false,
        created_at: new Date().toISOString(),
      }
      onAdicionada(nova)
    })
  }

  return (
    <form
      onSubmit={handleSubmit}
      className="rounded-2xl border p-5 space-y-4"
      style={{ background: 'rgba(201,168,76,0.04)', borderColor: 'rgba(201,168,76,0.18)' }}
    >
      <h4 className="font-semibold text-sm" style={{ color: 'var(--text-primary)' }}>
        Nova Planilha
      </h4>

      <div className="space-y-3">
        <div>
          <label className="block text-xs mb-1" style={{ color: 'var(--text-muted)' }}>
            Nome do período *
          </label>
          <input
            type="text"
            name="nome"
            placeholder="ex: ABRIL.2026"
            required
            className="input"
          />
        </div>

        <div>
          <label className="block text-xs mb-1" style={{ color: 'var(--text-muted)' }}>
            ID da planilha Google Sheets *
          </label>
          <input
            type="text"
            name="spreadsheet_id"
            placeholder="1BxiMVs0XRA5nFMdKvBdBZjgmUUqptlbs74OgVE2upms"
            required
            className="input font-mono text-xs"
          />
          <p className="text-[10px] mt-1" style={{ color: 'var(--text-muted)' }}>
            Encontrado na URL: docs.google.com/spreadsheets/d/<strong>ID</strong>/edit
          </p>
        </div>

        <div>
          <label className="block text-xs mb-1" style={{ color: 'var(--text-muted)' }}>
            Aba (tab) — opcional
          </label>
          <input
            type="text"
            name="aba"
            placeholder="ex: Dados (deixe em branco para a primeira aba)"
            className="input"
          />
        </div>
      </div>

      <div className="flex gap-2 pt-1">
        <button type="submit" disabled={pending} className="btn-primary flex items-center gap-1.5 text-sm py-2">
          {pending ? <HaloSpinner size="sm" /> : <Plus size={14} />}
          Adicionar
        </button>
        <button type="button" onClick={onCancelar} className="btn-ghost flex items-center gap-1.5 text-sm py-2">
          Cancelar
        </button>
      </div>
    </form>
  )
}
