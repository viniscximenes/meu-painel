'use client'

import { useState, useTransition } from 'react'
import { salvarMeta, excluirMeta } from '@/app/painel/metas/actions'
import type { Meta } from '@/lib/kpi-utils'
import { Plus, Trash2, Edit2, Check, X, Star, Loader2 } from 'lucide-react'
import { ICON_MAP, ICON_NAMES } from '@/lib/kpi-icons'

function sufixoDisplay(unidade: string): string {
  const u = unidade.trim().toLowerCase()
  if (u === 'porcentagem') return '%'
  if (u === 'tempo') return 's'
  return ''
}

function segParaHHMMSS(s: number): string {
  if (!s) return ''
  const h = Math.floor(s / 3600)
  const m = Math.floor((s % 3600) / 60)
  const sec = Math.round(s % 60)
  if (h > 0) return `${String(h).padStart(2, '0')}:${String(m).padStart(2, '0')}:${String(sec).padStart(2, '0')}`
  return `${String(m).padStart(2, '0')}:${String(sec).padStart(2, '0')}`
}

function hhmmssParaSeg(s: string): number {
  const parts = s.trim().split(':').map(Number)
  if (parts.length === 3) return (parts[0] || 0) * 3600 + (parts[1] || 0) * 60 + (parts[2] || 0)
  if (parts.length === 2) return (parts[0] || 0) * 60 + (parts[1] || 0)
  return parseFloat(s) || 0
}

interface MetasFormProps {
  metas: Meta[]
  headers: string[]
}

const TIPO_LABELS = {
  maior_melhor: 'Maior = melhor (ex: Pedidos, TX Retenção)',
  menor_melhor: 'Menor = melhor (ex: Churn, TMA, ABS)',
}

// ── Formulário de adição/edição ───────────────────────────────────────────────

function MetaForm({
  inicial,
  headers,
  onSalvar,
  onCancelar,
}: {
  inicial?: Partial<Meta>
  headers: string[]
  onSalvar: (formData: FormData) => Promise<void>
  onCancelar: () => void
}) {
  const [pending, startTransition] = useTransition()
  const [tipo, setTipo] = useState<'maior_melhor' | 'menor_melhor'>(
    inicial?.tipo ?? 'maior_melhor'
  )
  const [unidade, setUnidade] = useState(inicial?.unidade ?? 'numero')
  const [basicoAtivo, setBasicoAtivo] = useState(inicial?.basico ?? false)
  const [iconeAtivo, setIconeAtivo] = useState(inicial?.icone ?? 'BarChart2')

  const isTempo = unidade === 'tempo'

  function handleSubmit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault()
    const fd = new FormData(e.currentTarget)
    // Converte HH:MM:SS para segundos nos campos de tempo
    if (isTempo) {
      fd.set('valor_meta', String(hhmmssParaSeg(fd.get('valor_meta') as string)))
      fd.set('verde_inicio', String(hhmmssParaSeg(fd.get('verde_inicio') as string)))
    }
    startTransition(async () => {
      await onSalvar(fd)
      onCancelar()
    })
  }

  return (
    <form
      onSubmit={handleSubmit}
      className="rounded-2xl border p-5 space-y-4"
      style={{ background: 'rgba(201,168,76,0.04)', borderColor: 'rgba(201,168,76,0.18)' }}
    >
      <h4 className="font-semibold text-sm" style={{ color: 'var(--text-primary)' }}>
        {inicial?.id ? 'Editar meta' : 'Nova meta'}
      </h4>

      {inicial?.id && <input type="hidden" name="id" value={inicial.id} />}

      <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
        {/* Coluna da planilha */}
        <div>
          <label className="block text-xs mb-1" style={{ color: 'var(--text-muted)' }}>
            Coluna da planilha *
          </label>
          {headers.length > 0 ? (
            <select name="nome_coluna" defaultValue={inicial?.nome_coluna ?? ''} required className="select">
              <option value="">Selecione…</option>
              {headers.map((h) => (
                <option key={h} value={h}>{h}</option>
              ))}
            </select>
          ) : (
            <input
              type="text"
              name="nome_coluna"
              defaultValue={inicial?.nome_coluna ?? ''}
              placeholder="Nome exato do cabeçalho"
              required
              className="input"
            />
          )}
        </div>

        {/* Label de exibição */}
        <div>
          <label className="block text-xs mb-1" style={{ color: 'var(--text-muted)' }}>
            Nome exibido *
          </label>
          <input
            type="text"
            name="label"
            defaultValue={inicial?.label ?? ''}
            placeholder="ex: TX Retenção Bruta"
            required
            className="input"
          />
        </div>

        {/* Tipo */}
        <div className="sm:col-span-2">
          <label className="block text-xs mb-1" style={{ color: 'var(--text-muted)' }}>Tipo</label>
          <select
            name="tipo"
            value={tipo}
            onChange={(e) => setTipo(e.target.value as typeof tipo)}
            className="select"
          >
            {Object.entries(TIPO_LABELS).map(([v, l]) => (
              <option key={v} value={v}>{l}</option>
            ))}
          </select>
        </div>

        {/* Unidade */}
        <div>
          <label className="block text-xs mb-1" style={{ color: 'var(--text-muted)' }}>Unidade</label>
          <select
            name="unidade"
            value={unidade}
            onChange={(e) => setUnidade(e.target.value)}
            className="select"
          >
            <option value="numero">Número (ex: 150)</option>
            <option value="porcentagem">Porcentagem (ex: 87%)</option>
            <option value="tempo">Tempo → HH:MM:SS (TMA, Indisponibilidade)</option>
            <option value="texto">Texto (sem formatação)</option>
          </select>
        </div>

        {/* Valor meta */}
        <div>
          <label className="block text-xs mb-1" style={{ color: 'var(--text-muted)' }}>
            {tipo === 'maior_melhor' ? 'Meta alvo (≥)' : 'Meta alvo (≤)'}
            {isTempo && <span className="ml-1 opacity-60">(HH:MM:SS)</span>}
          </label>
          {isTempo ? (
            <input type="text" name="valor_meta" placeholder="00:12:11"
              defaultValue={inicial?.valor_meta ? segParaHHMMSS(inicial.valor_meta) : ''}
              required className="input" />
          ) : (
            <input type="number" name="valor_meta" step="any"
              defaultValue={inicial?.valor_meta ?? 0} required className="input" />
          )}
        </div>

        {/* Limiar verde */}
        <div>
          <label className="block text-xs mb-1" style={{ color: 'var(--text-muted)' }}>
            {tipo === 'maior_melhor' ? 'Início verde (valor mín.)' : 'Início verde (valor máx.)'}
            {isTempo && <span className="ml-1 opacity-60">(HH:MM:SS)</span>}
          </label>
          {isTempo ? (
            <input type="text" name="verde_inicio" placeholder="00:12:11"
              defaultValue={inicial?.verde_inicio ? segParaHHMMSS(inicial.verde_inicio) : ''}
              required className="input" />
          ) : (
            <input type="number" name="verde_inicio" step="any"
              defaultValue={inicial?.verde_inicio ?? 0} required className="input" />
          )}
        </div>

        {/* Limiar amarelo — automático (80% do verde), campo oculto */}
        <input type="hidden" name="amarelo_inicio" value="0" />

        {/* Ordem */}
        <div>
          <label className="block text-xs mb-1" style={{ color: 'var(--text-muted)' }}>
            Ordem no KPI Básico
          </label>
          <input type="number" name="ordem" min="0"
            defaultValue={inicial?.ordem ?? 0} className="input" />
        </div>

        {/* Básico — estrela clicável */}
        <div className="flex items-end pb-0.5">
          <input type="hidden" name="basico" value={basicoAtivo ? 'true' : 'false'} />
          <button
            type="button"
            onClick={() => setBasicoAtivo(!basicoAtivo)}
            className="flex items-center gap-2 cursor-pointer rounded-xl px-3 py-2 border transition-all"
            style={{
              background: basicoAtivo ? 'rgba(245,158,11,0.08)' : 'transparent',
              borderColor: basicoAtivo ? 'rgba(245,158,11,0.3)' : 'rgba(201,168,76,0.12)',
              color: basicoAtivo ? '#fbbf24' : 'var(--text-muted)',
            }}
          >
            <Star
              size={16}
              className={basicoAtivo ? 'fill-amber-400 text-amber-400' : 'text-gray-500'}
            />
            <span className="text-sm font-medium">
              {basicoAtivo ? 'No KPI Básico' : 'Mostrar no KPI Básico'}
            </span>
          </button>
        </div>

        {/* Ícone */}
        <div className="sm:col-span-2">
          <label className="block text-xs mb-2" style={{ color: 'var(--text-muted)' }}>Ícone</label>
          <input type="hidden" name="icone" value={iconeAtivo} />
          <div className="flex flex-wrap gap-1.5">
            {ICON_NAMES.map((name) => {
              const Ic = ICON_MAP[name]
              const ativo = iconeAtivo === name
              return (
                <button
                  key={name}
                  type="button"
                  title={name}
                  onClick={() => setIconeAtivo(name)}
                  className="w-9 h-9 rounded-xl flex items-center justify-center border transition-all"
                  style={{
                    background: ativo ? 'rgba(201,168,76,0.14)' : 'rgba(201,168,76,0.03)',
                    borderColor: ativo ? 'rgba(201,168,76,0.5)' : 'rgba(201,168,76,0.10)',
                    color: ativo ? 'var(--gold-light)' : 'var(--text-muted)',
                  }}
                >
                  <Ic size={15} />
                </button>
              )
            })}
          </div>
        </div>
      </div>

      <div className="flex gap-2 pt-1">
        <button type="submit" disabled={pending} className="btn-primary flex items-center gap-1.5 text-sm py-2">
          {pending ? <Loader2 size={14} className="animate-spin" /> : <Check size={14} />}
          Salvar
        </button>
        <button type="button" onClick={onCancelar} className="btn-ghost flex items-center gap-1.5 text-sm py-2">
          <X size={14} /> Cancelar
        </button>
      </div>
    </form>
  )
}

// ── Componente principal ──────────────────────────────────────────────────────

export default function MetasForm({ metas, headers }: MetasFormProps) {
  const [editando, setEditando] = useState<string | null>(null)
  const [pending, startTransition] = useTransition()

  function handleExcluir(id: string) {
    if (!confirm('Excluir esta meta?')) return
    startTransition(() => excluirMeta(id))
  }

  const basicosOrdenados = [...metas].filter((m) => m.basico).sort((a, b) => a.ordem - b.ordem)
  const semBasico = metas.filter((m) => !m.basico)

  return (
    <div className="space-y-6">
      {/* KPI Básico */}
      {basicosOrdenados.length > 0 && (
        <div>
          <div className="flex items-center gap-2 mb-3">
            <h3 className="section-heading flex items-center gap-1.5">
              <Star size={11} className="text-amber-400" />
              KPI Básico
            </h3>
            <span style={{ fontSize: '10px', color: 'var(--text-muted)' }}>({basicosOrdenados.length} métricas)</span>
            <div style={{ flex: 1, height: '1px', background: 'var(--border)' }} />
          </div>
          <div className="space-y-2">
            {basicosOrdenados.map((meta) => (
              <MetaItem
                key={meta.id}
                meta={meta}
                headers={headers}
                editando={editando === meta.id}
                onEditar={() => setEditando(editando === meta.id ? null : meta.id)}
                onCancelar={() => setEditando(null)}
                onExcluir={() => handleExcluir(meta.id)}
              />
            ))}
          </div>
        </div>
      )}

      {/* Todas as outras */}
      {semBasico.length > 0 && (
        <div>
          <div className="flex items-center gap-2 mb-3">
            <h3 className="section-heading">KPI Completo</h3>
            <span style={{ fontSize: '10px', color: 'var(--text-muted)' }}>({semBasico.length} métricas)</span>
            <div style={{ flex: 1, height: '1px', background: 'var(--border)' }} />
          </div>
          <div className="space-y-2">
            {semBasico.map((meta) => (
              <MetaItem
                key={meta.id}
                meta={meta}
                headers={headers}
                editando={editando === meta.id}
                onEditar={() => setEditando(editando === meta.id ? null : meta.id)}
                onCancelar={() => setEditando(null)}
                onExcluir={() => handleExcluir(meta.id)}
              />
            ))}
          </div>
        </div>
      )}

      {metas.length === 0 && (
        <div
          className="rounded-2xl border p-8 text-center"
          style={{ background: 'var(--bg-elevated)', borderColor: 'rgba(201,168,76,0.10)' }}
        >
          <p className="text-sm" style={{ color: 'var(--text-secondary)' }}>
            Nenhuma meta cadastrada ainda.
          </p>
          <p className="text-xs mt-1" style={{ color: 'var(--text-muted)' }}>
            Adicione a primeira meta abaixo.
          </p>
        </div>
      )}

      {/* Formulário de nova meta */}
      {editando === 'new' ? (
        <MetaForm
          headers={headers}
          onSalvar={salvarMeta}
          onCancelar={() => setEditando(null)}
        />
      ) : (
        <button
          onClick={() => setEditando('new')}
          className="btn-primary w-full flex items-center justify-center gap-2"
          style={{ padding: '10px 18px' }}
        >
          <Plus size={15} />
          Adicionar nova meta
        </button>
      )}
    </div>
  )
}

// ── Item de meta existente ────────────────────────────────────────────────────

function MetaItem({
  meta, headers, editando, onEditar, onCancelar, onExcluir,
}: {
  meta: Meta
  headers: string[]
  editando: boolean
  onEditar: () => void
  onCancelar: () => void
  onExcluir: () => void
}) {
  if (editando) {
    return (
      <MetaForm
        inicial={meta}
        headers={headers}
        onSalvar={salvarMeta}
        onCancelar={onCancelar}
      />
    )
  }

  const isTempo = meta.unidade === 'tempo'
  const suf = isTempo ? '' : sufixoDisplay(meta.unidade)
  const simb = meta.tipo === 'maior_melhor' ? '≥' : '≤'
  const fmtVal = (v: number) => isTempo ? segParaHHMMSS(v) : `${v}${suf}`

  return (
    <div
      className="card group transition-colors"
      style={{ padding: '14px 18px' }}
      onMouseEnter={(e) => { (e.currentTarget as HTMLElement).style.borderColor = 'var(--border-hover)' }}
      onMouseLeave={(e) => { (e.currentTarget as HTMLElement).style.borderColor = 'var(--border)' }}
    >
      <div className="flex items-center gap-3 flex-wrap">
        {/* Nome + badge tipo */}
        <div className="flex items-center gap-2 flex-1 min-w-0">
          <span
            style={{
              fontFamily: 'var(--ff-display)',
              fontSize: '14px',
              fontWeight: 600,
              color: 'var(--text-primary)',
              whiteSpace: 'nowrap',
              overflow: 'hidden',
              textOverflow: 'ellipsis',
            }}
          >
            {meta.label}
          </span>
          {meta.basico && (
            <span
              className="flex items-center gap-0.5 shrink-0"
              style={{
                background: 'var(--gold-dim)',
                color: 'var(--gold-light)',
                border: '1px solid rgba(201,168,76,0.25)',
                borderRadius: '4px',
                padding: '2px 6px',
                fontSize: '9px',
                fontWeight: 700,
                textTransform: 'uppercase',
                letterSpacing: '0.06em',
              }}
            >
              <Star size={8} className="fill-current" /> básico #{meta.ordem}
            </span>
          )}
        </div>

        {/* Tag coluna */}
        <span
          style={{
            background: 'var(--bg-surface)',
            color: 'var(--text-secondary)',
            border: '1px solid var(--border)',
            borderRadius: '6px',
            padding: '3px 8px',
            fontSize: '11px',
            fontFamily: 'monospace',
            whiteSpace: 'nowrap',
          }}
        >
          {meta.nome_coluna}
        </span>

        {/* Pills thresholds */}
        <div className="flex items-center gap-1.5 shrink-0">
          <span style={{
            background: 'rgba(34,197,94,0.12)',
            color: '#22c55e',
            border: '1px solid rgba(34,197,94,0.25)',
            borderRadius: '6px',
            padding: '3px 8px',
            fontSize: '10px',
            fontWeight: 600,
            whiteSpace: 'nowrap',
          }}>
            {simb} {fmtVal(meta.verde_inicio)}
          </span>
          <span style={{
            background: 'rgba(234,179,8,0.12)',
            color: '#eab308',
            border: '1px solid rgba(234,179,8,0.25)',
            borderRadius: '6px',
            padding: '3px 8px',
            fontSize: '10px',
            fontWeight: 600,
            whiteSpace: 'nowrap',
          }}>
            auto 80%
          </span>
        </div>

        {/* Ações */}
        <div className="flex items-center gap-1 opacity-0 group-hover:opacity-100 transition-opacity shrink-0">
          <button
            onClick={onEditar}
            className="p-1.5 rounded-lg transition-colors"
            style={{ color: 'var(--text-muted)' }}
            onMouseEnter={(e) => { const el = e.currentTarget as HTMLElement; el.style.color = 'var(--text-primary)'; el.style.background = 'rgba(201,168,76,0.06)' }}
            onMouseLeave={(e) => { const el = e.currentTarget as HTMLElement; el.style.color = 'var(--text-muted)'; el.style.background = 'transparent' }}
          >
            <Edit2 size={13} />
          </button>
          <button
            onClick={onExcluir}
            className="p-1.5 rounded-lg transition-colors"
            style={{ color: 'var(--text-muted)' }}
            onMouseEnter={(e) => { const el = e.currentTarget as HTMLElement; el.style.color = '#f87171'; el.style.background = 'rgba(239,68,68,0.08)' }}
            onMouseLeave={(e) => { const el = e.currentTarget as HTMLElement; el.style.color = 'var(--text-muted)'; el.style.background = 'transparent' }}
          >
            <Trash2 size={13} />
          </button>
        </div>
      </div>
    </div>
  )
}
