'use client'

import { useState, useTransition } from 'react'
import { salvarMeta, excluirMeta } from '@/app/painel/metas/actions'
import type { Meta } from '@/lib/kpi-utils'
import { Plus, Trash2, Edit2, Check, X } from 'lucide-react'
import { HaloSpinner } from '@/components/HaloSpinner'
import { ICON_MAP, ICON_NAMES } from '@/lib/kpi-icons'
import { KPIS_SECUNDARIOS } from '@/lib/kpis-config'

const FF_SYNE = 'var(--ff-syne)'
const FF_DM   = 'var(--ff-body)'

type Toast = { tipo: 'ok' | 'erro'; msg: string } | null

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

const LABEL_STYLE: React.CSSProperties = {
  fontFamily: FF_SYNE, fontSize: '10px', fontWeight: 600,
  textTransform: 'uppercase', letterSpacing: '0.08em',
  color: '#474658', marginBottom: '6px', display: 'block',
}

// ── Formulário de adição/edição ───────────────────────────────────────────────

function MetaForm({
  inicial,
  onSalvar,
  onCancelar,
  onToast,
}: {
  inicial?: Partial<Meta>
  onSalvar: (formData: FormData) => Promise<{ ok: boolean; erro?: string }>
  onCancelar: () => void
  onToast: (tipo: 'ok' | 'erro', msg: string) => void
}) {
  const [pending, startTransition] = useTransition()
  const [tipo, setTipo]       = useState<'maior_melhor' | 'menor_melhor'>(inicial?.tipo ?? 'maior_melhor')
  const [unidade, setUnidade] = useState(inicial?.unidade ?? 'numero')
  const [iconeAtivo, setIconeAtivo] = useState(inicial?.icone ?? 'BarChart2')
  const [selectedKpi, setSelectedKpi] = useState(inicial?.nome_coluna ?? '')
  const [labelValue, setLabelValue]   = useState(inicial?.label ?? '')

  const isTempo = unidade === 'tempo'

  function handleKpiChange(val: string) {
    setSelectedKpi(val)
    const kpi = KPIS_SECUNDARIOS.find(k => k.label === val)
    if (kpi) setLabelValue(kpi.label)
  }

  function handleSubmit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault()
    const fd = new FormData(e.currentTarget)
    if (isTempo) {
      const seg = String(hhmmssParaSeg(fd.get('valor_meta') as string))
      fd.set('valor_meta', seg)
      fd.set('verde_inicio', seg)
    } else {
      fd.set('verde_inicio', fd.get('valor_meta') as string)
    }
    startTransition(async () => {
      const res = await onSalvar(fd)
      if (res.ok) {
        onToast('ok', inicial?.id ? 'Meta atualizada.' : 'Meta salva.')
        onCancelar()
      } else {
        onToast('erro', res.erro ?? 'Erro ao salvar.')
      }
    })
  }

  return (
    <form
      onSubmit={handleSubmit}
      className="rounded-2xl border p-5 space-y-4"
      style={{ background: 'rgba(201,168,76,0.04)', borderColor: 'rgba(201,168,76,0.18)' }}
    >
      <span style={{
        fontFamily: FF_SYNE, fontWeight: 700, fontSize: '12px',
        textTransform: 'uppercase', letterSpacing: '0.08em', color: '#f4d47c',
      }}>
        {inicial?.id ? 'EDITAR META' : 'NOVA META'}
      </span>

      {inicial?.id && <input type="hidden" name="id" value={inicial.id} />}
      <input type="hidden" name="basico" value="false" />
      <input type="hidden" name="ordem"  value="0" />
      <input type="hidden" name="amarelo_inicio" value="0" />

      <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
        {/* KPI canônico */}
        <div>
          <span style={LABEL_STYLE}>KPI *</span>
          <select
            name="nome_coluna"
            value={selectedKpi}
            onChange={e => handleKpiChange(e.target.value)}
            required
            className="select"
          >
            <option value="">Selecione um KPI…</option>
            {KPIS_SECUNDARIOS.map(k => (
              <option key={k.key} value={k.label}>{k.label}</option>
            ))}
          </select>
        </div>

        {/* Label de exibição */}
        <div>
          <span style={LABEL_STYLE}>NOME EXIBIDO *</span>
          <input
            type="text"
            name="label"
            value={labelValue}
            onChange={e => setLabelValue(e.target.value)}
            placeholder="Ex: TX. RETENÇÃO LÍQUIDA 15D"
            required
            className="input"
          />
        </div>

        {/* Tipo */}
        <div className="sm:col-span-2">
          <span style={LABEL_STYLE}>TIPO</span>
          <select
            name="tipo"
            value={tipo}
            onChange={e => setTipo(e.target.value as typeof tipo)}
            className="select"
          >
            <option value="maior_melhor">MAIOR É MELHOR (ex: CSAT, Engajamento)</option>
            <option value="menor_melhor">MENOR É MELHOR (ex: Rechamada, Transfer)</option>
          </select>
        </div>

        {/* Unidade */}
        <div>
          <span style={LABEL_STYLE}>UNIDADE</span>
          <select
            name="unidade"
            value={unidade}
            onChange={e => setUnidade(e.target.value)}
            className="select"
          >
            <option value="numero">NÚMERO</option>
            <option value="porcentagem">PORCENTAGEM (%)</option>
            <option value="tempo">TEMPO (HH:MM:SS)</option>
            <option value="texto">TEXTO</option>
          </select>
        </div>

        {/* Valor meta */}
        <div>
          <span style={LABEL_STYLE}>
            {tipo === 'maior_melhor' ? 'META ALVO (≥)' : 'META ALVO (≤)'}
            {isTempo && <span style={{ marginLeft: '4px', opacity: 0.6 }}>(HH:MM:SS)</span>}
          </span>
          {isTempo ? (
            <input type="text" name="valor_meta" placeholder="00:12:11"
              defaultValue={inicial?.valor_meta ? segParaHHMMSS(inicial.valor_meta) : ''}
              required className="input" />
          ) : (
            <input type="number" name="valor_meta" step="any"
              defaultValue={inicial?.valor_meta ?? 0} required className="input" />
          )}
        </div>

        {/* Ícone */}
        <div className="sm:col-span-2">
          <span style={{ ...LABEL_STYLE, marginBottom: '8px' }}>ÍCONE</span>
          <input type="hidden" name="icone" value={iconeAtivo} />
          <div className="flex flex-wrap gap-1.5">
            {ICON_NAMES.map(name => {
              const Ic  = ICON_MAP[name]
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
        <button
          type="submit"
          disabled={pending}
          className="btn-primary flex items-center gap-1.5 py-2"
          style={{ fontFamily: FF_SYNE, fontWeight: 700, fontSize: '11px', textTransform: 'uppercase', letterSpacing: '0.06em' }}
        >
          {pending ? <HaloSpinner size="sm" /> : <Check size={14} />}
          SALVAR
        </button>
        <button
          type="button"
          onClick={onCancelar}
          className="btn-ghost flex items-center gap-1.5 py-2"
          style={{ fontFamily: FF_SYNE, fontWeight: 600, fontSize: '11px', textTransform: 'uppercase', letterSpacing: '0.06em' }}
        >
          <X size={14} /> CANCELAR
        </button>
      </div>
    </form>
  )
}

// ── Componente principal ──────────────────────────────────────────────────────

export default function MetasForm({ metas }: { metas: Meta[] }) {
  const [editando, setEditando]   = useState<string | null>(null)
  const [, startTransition]       = useTransition()
  const [toast, setToast]         = useState<Toast>(null)

  function showToast(tipo: 'ok' | 'erro', msg: string) {
    setToast({ tipo, msg })
    setTimeout(() => setToast(null), 3000)
  }

  function handleExcluir(id: string) {
    if (!confirm('Excluir esta meta?')) return
    startTransition(async () => {
      const res = await excluirMeta(id)
      if (res.ok) showToast('ok', 'Meta excluída.')
      else showToast('erro', res.erro ?? 'Erro ao excluir.')
    })
  }

  return (
    <div className="space-y-3">
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

      {/* Lista plana de metas complementares */}
      {metas.map(meta => (
        <MetaItem
          key={meta.id}
          meta={meta}
          editando={editando === meta.id}
          onEditar={() => setEditando(editando === meta.id ? null : meta.id)}
          onCancelar={() => setEditando(null)}
          onExcluir={() => handleExcluir(meta.id)}
          onToast={showToast}
        />
      ))}

      {metas.length === 0 && editando !== 'new' && (
        <div
          className="rounded-2xl border p-8 text-center"
          style={{ background: 'var(--bg-elevated)', borderColor: 'rgba(201,168,76,0.10)' }}
        >
          <p style={{
            fontFamily: FF_SYNE, fontSize: '12px', textTransform: 'uppercase',
            letterSpacing: '0.08em', color: 'var(--text-secondary)',
          }}>
            Nenhuma meta complementar cadastrada.
          </p>
        </div>
      )}

      {editando === 'new' ? (
        <MetaForm
          onSalvar={salvarMeta}
          onCancelar={() => setEditando(null)}
          onToast={showToast}
        />
      ) : (
        <button
          onClick={() => setEditando('new')}
          className="btn-primary w-full flex items-center justify-center gap-2 mt-2"
          style={{
            padding: '10px 18px',
            fontFamily: FF_SYNE, fontWeight: 700, fontSize: '11px',
            textTransform: 'uppercase', letterSpacing: '0.06em',
          }}
        >
          <Plus size={15} />
          ADICIONAR META SECUNDÁRIA
        </button>
      )}
    </div>
  )
}

// ── Item de meta existente ────────────────────────────────────────────────────

function MetaItem({
  meta, editando, onEditar, onCancelar, onExcluir, onToast,
}: {
  meta: Meta
  editando: boolean
  onEditar: () => void
  onCancelar: () => void
  onExcluir: () => void
  onToast: (tipo: 'ok' | 'erro', msg: string) => void
}) {
  if (editando) {
    return (
      <MetaForm
        inicial={meta}
        onSalvar={salvarMeta}
        onCancelar={onCancelar}
        onToast={onToast}
      />
    )
  }

  const isTempo = meta.unidade === 'tempo'
  const simb    = meta.tipo === 'maior_melhor' ? '≥' : '≤'
  const fmtVal  = (v: number) => isTempo ? segParaHHMMSS(v) : `${v}${meta.unidade === 'porcentagem' ? '%' : ''}`

  return (
    <div
      className="card group transition-colors"
      style={{ padding: '14px 18px' }}
      onMouseEnter={e => { (e.currentTarget as HTMLElement).style.borderColor = 'var(--border-hover)' }}
      onMouseLeave={e => { (e.currentTarget as HTMLElement).style.borderColor = 'var(--border)' }}
    >
      <div className="flex items-center gap-3 flex-wrap">
        <div className="flex-1 min-w-0">
          <span style={{
            fontFamily: FF_SYNE, fontSize: '13px', fontWeight: 600,
            textTransform: 'uppercase', letterSpacing: '0.04em',
            color: 'var(--text-primary)', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis',
            display: 'block',
          }}>
            {meta.label}
          </span>
        </div>

        <span style={{
          background: 'var(--bg-surface)', color: 'var(--text-secondary)',
          border: '1px solid var(--border)', borderRadius: '6px',
          padding: '3px 8px', fontSize: '11px', fontFamily: 'monospace', whiteSpace: 'nowrap',
        }}>
          {meta.nome_coluna}
        </span>

        <div className="flex items-center gap-1.5 shrink-0">
          <span style={{
            background: 'rgba(34,197,94,0.12)', color: '#22c55e',
            border: '1px solid rgba(34,197,94,0.25)', borderRadius: '6px',
            padding: '3px 8px', fontSize: '10px', fontFamily: FF_SYNE, fontWeight: 600,
            textTransform: 'uppercase', whiteSpace: 'nowrap',
          }}>
            {simb} {fmtVal(meta.verde_inicio)}
          </span>
          <span style={{
            background: 'rgba(234,179,8,0.12)', color: '#eab308',
            border: '1px solid rgba(234,179,8,0.25)', borderRadius: '6px',
            padding: '3px 8px', fontSize: '10px', fontFamily: FF_SYNE, fontWeight: 600,
            textTransform: 'uppercase', whiteSpace: 'nowrap',
          }}>
            AUTO 80%
          </span>
        </div>

        <div className="flex items-center gap-1 opacity-0 group-hover:opacity-100 transition-opacity shrink-0">
          <button
            onClick={onEditar}
            className="p-1.5 rounded-lg transition-colors"
            style={{ color: 'var(--text-muted)' }}
            onMouseEnter={e => { const el = e.currentTarget as HTMLElement; el.style.color = 'var(--text-primary)'; el.style.background = 'rgba(201,168,76,0.06)' }}
            onMouseLeave={e => { const el = e.currentTarget as HTMLElement; el.style.color = 'var(--text-muted)'; el.style.background = 'transparent' }}
          >
            <Edit2 size={13} />
          </button>
          <button
            onClick={onExcluir}
            className="p-1.5 rounded-lg transition-colors"
            style={{ color: 'var(--text-muted)' }}
            onMouseEnter={e => { const el = e.currentTarget as HTMLElement; el.style.color = '#f87171'; el.style.background = 'rgba(239,68,68,0.08)' }}
            onMouseLeave={e => { const el = e.currentTarget as HTMLElement; el.style.color = 'var(--text-muted)'; el.style.background = 'transparent' }}
          >
            <Trash2 size={13} />
          </button>
        </div>
      </div>
    </div>
  )
}
