'use client'

import { useState, useTransition } from 'react'
import { criarMascaraAction, editarMascaraAction, excluirMascaraAction } from './actions'
import type { Mascara } from '@/lib/mascaras'
import { Plus, Trash2, Pencil, X } from 'lucide-react'

const SLA_OPTS = ['24h úteis', '48h úteis', '72h úteis']
const SEG_OPTS = ['Financeiro']

interface MascarasConfigClientProps {
  mascaras: Mascara[]
}

const inputStyle: React.CSSProperties = {
  width: '100%', padding: '8px 12px', borderRadius: '8px', fontSize: '13px',
  background: 'rgba(255,255,255,0.04)', border: '1px solid rgba(201,168,76,0.12)',
  color: 'var(--text-primary)', outline: 'none',
}

const taStyle: React.CSSProperties = {
  ...{ width: '100%', padding: '8px 12px', borderRadius: '8px', fontSize: '12px' },
  background: 'rgba(255,255,255,0.04)', border: '1px solid rgba(201,168,76,0.12)',
  color: 'var(--text-primary)', outline: 'none',
  fontFamily: 'monospace', resize: 'vertical' as const, minHeight: '120px',
}

interface FormState {
  segmento:   string
  fila:       string
  sla:        string
  utilizacao: string
  mascara:    string
  ordem:      number
}

const EMPTY: FormState = { segmento: 'Financeiro', fila: '', sla: '24h úteis', utilizacao: '', mascara: '', ordem: 0 }

function MascaraModal({
  title, initial, onSave, onClose, isPending, erro,
}: {
  title: string
  initial: FormState
  onSave: (f: FormState) => void
  onClose: () => void
  isPending: boolean
  erro: string | null
}) {
  const [f, setF] = useState(initial)
  const set = (k: keyof FormState) => (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement | HTMLSelectElement>) =>
    setF(prev => ({ ...prev, [k]: k === 'ordem' ? Number(e.target.value) : e.target.value }))

  return (
    <div style={{
      position: 'fixed', inset: 0, zIndex: 50,
      display: 'flex', alignItems: 'center', justifyContent: 'center',
      background: 'rgba(0,0,0,0.7)', backdropFilter: 'blur(4px)',
    }} onClick={e => { if (e.target === e.currentTarget) onClose() }}>
      <div style={{
        width: '100%', maxWidth: '520px', margin: '16px',
        background: '#0d0d1a', border: '1px solid rgba(201,168,76,0.15)',
        borderRadius: '16px', padding: '20px',
        display: 'flex', flexDirection: 'column', gap: '12px',
        maxHeight: '90vh', overflowY: 'auto',
      }}>
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
          <p style={{ fontSize: '11px', fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.1em', color: 'var(--text-muted)' }}>
            {title}
          </p>
          <button onClick={onClose} style={{ background: 'none', border: 'none', color: 'var(--text-muted)', cursor: 'pointer' }}>
            <X size={16} />
          </button>
        </div>

        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '8px' }}>
          <div>
            <label style={{ fontSize: '11px', color: 'var(--text-muted)', display: 'block', marginBottom: '4px' }}>Segmento</label>
            <select style={inputStyle} value={f.segmento} onChange={set('segmento')}>
              {SEG_OPTS.map(s => <option key={s}>{s}</option>)}
            </select>
          </div>
          <div>
            <label style={{ fontSize: '11px', color: 'var(--text-muted)', display: 'block', marginBottom: '4px' }}>SLA</label>
            <select style={inputStyle} value={f.sla} onChange={set('sla')}>
              {SLA_OPTS.map(s => <option key={s}>{s}</option>)}
            </select>
          </div>
        </div>

        <div>
          <label style={{ fontSize: '11px', color: 'var(--text-muted)', display: 'block', marginBottom: '4px' }}>Nome da Fila *</label>
          <input style={inputStyle} value={f.fila} onChange={set('fila')} placeholder="Ex: Desconto não aplicado Ouvidoria" />
        </div>

        <div>
          <label style={{ fontSize: '11px', color: 'var(--text-muted)', display: 'block', marginBottom: '4px' }}>Utilização *</label>
          <textarea style={taStyle} value={f.utilizacao} onChange={set('utilizacao')}
            placeholder="Explique quando usar esta máscara..." rows={3} />
        </div>

        <div>
          <label style={{ fontSize: '11px', color: 'var(--text-muted)', display: 'block', marginBottom: '4px' }}>Máscara * (texto que será copiado)</label>
          <textarea style={taStyle} value={f.mascara} onChange={set('mascara')}
            placeholder="#FILA&#10;Motivo: ..." rows={6} />
        </div>

        <div>
          <label style={{ fontSize: '11px', color: 'var(--text-muted)', display: 'block', marginBottom: '4px' }}>Ordem</label>
          <input style={{ ...inputStyle, width: '80px' }} type="number" value={f.ordem} onChange={set('ordem')} min={0} />
        </div>

        {erro && <p style={{ fontSize: '12px', color: '#f87171' }}>{erro}</p>}

        <div style={{ display: 'flex', gap: '8px', justifyContent: 'flex-end' }}>
          <button onClick={onClose} style={{
            padding: '7px 14px', borderRadius: '8px', fontSize: '12px',
            background: 'transparent', border: '1px solid rgba(255,255,255,0.08)',
            color: 'var(--text-muted)', cursor: 'pointer',
          }}>Cancelar</button>
          <button onClick={() => onSave(f)} disabled={isPending} style={{
            padding: '7px 18px', borderRadius: '8px', fontSize: '12px', fontWeight: 600,
            background: 'rgba(201,168,76,0.15)', border: '1px solid rgba(201,168,76,0.30)',
            color: 'var(--gold)', cursor: isPending ? 'not-allowed' : 'pointer',
            opacity: isPending ? 0.6 : 1,
          }}>{isPending ? 'Salvando…' : 'Salvar'}</button>
        </div>
      </div>
    </div>
  )
}

export default function MascarasConfigClient({ mascaras: initial }: MascarasConfigClientProps) {
  const [mascaras, setMascaras]   = useState(initial)
  const [adding, setAdding]       = useState(false)
  const [editing, setEditing]     = useState<Mascara | null>(null)
  const [erro, setErro]           = useState<string | null>(null)
  const [isPending, start]        = useTransition()

  function handleAdd(f: FormState) {
    setErro(null)
    if (!f.fila.trim() || !f.mascara.trim()) { setErro('Fila e máscara são obrigatórios'); return }
    const fd = new FormData()
    Object.entries(f).forEach(([k, v]) => fd.set(k, String(v)))
    start(async () => {
      try {
        await criarMascaraAction(fd)
        const novo: Mascara = { id: crypto.randomUUID(), ...f, ativo: true }
        setMascaras(prev => [...prev, novo])
        setAdding(false)
      } catch (e) { setErro(e instanceof Error ? e.message : 'Erro') }
    })
  }

  function handleEdit(f: FormState) {
    if (!editing) return
    setErro(null)
    if (!f.fila.trim() || !f.mascara.trim()) { setErro('Fila e máscara são obrigatórios'); return }
    const fd = new FormData()
    fd.set('id', editing.id)
    Object.entries(f).forEach(([k, v]) => fd.set(k, String(v)))
    start(async () => {
      try {
        await editarMascaraAction(fd)
        setMascaras(prev => prev.map(m => m.id === editing.id ? { ...m, ...f } : m))
        setEditing(null)
      } catch (e) { setErro(e instanceof Error ? e.message : 'Erro') }
    })
  }

  function handleDelete(id: string) {
    const fd = new FormData(); fd.set('id', id)
    start(async () => {
      try {
        await excluirMascaraAction(fd)
        setMascaras(prev => prev.filter(m => m.id !== id))
      } catch (e) { setErro(e instanceof Error ? e.message : 'Erro') }
    })
  }

  return (
    <div className="space-y-4">
      {adding && (
        <MascaraModal title="Nova Máscara" initial={EMPTY}
          onSave={handleAdd} onClose={() => setAdding(false)}
          isPending={isPending} erro={erro} />
      )}
      {editing && (
        <MascaraModal title="Editar Máscara"
          initial={{ segmento: editing.segmento, fila: editing.fila, sla: editing.sla, utilizacao: editing.utilizacao, mascara: editing.mascara, ordem: editing.ordem }}
          onSave={handleEdit} onClose={() => setEditing(null)}
          isPending={isPending} erro={erro} />
      )}

      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
        <p style={{ fontSize: '13px', color: 'var(--text-muted)' }}>
          {mascaras.length} máscara{mascaras.length !== 1 ? 's' : ''} cadastrada{mascaras.length !== 1 ? 's' : ''}
        </p>
        <button onClick={() => { setErro(null); setAdding(true) }} style={{
          display: 'flex', alignItems: 'center', gap: '6px',
          padding: '7px 14px', borderRadius: '8px', fontSize: '12px', fontWeight: 600,
          background: 'rgba(201,168,76,0.10)', border: '1px solid rgba(201,168,76,0.22)',
          color: 'var(--gold)', cursor: 'pointer',
        }}>
          <Plus size={13} /> Nova Máscara
        </button>
      </div>

      {mascaras.length === 0 ? (
        <div style={{ textAlign: 'center', padding: '32px 0', color: 'var(--text-muted)', fontSize: '13px' }}>
          Nenhuma máscara cadastrada.
        </div>
      ) : (
        <div style={{ display: 'flex', flexDirection: 'column', gap: '6px' }}>
          {mascaras.map(m => (
            <div key={m.id} style={{
              display: 'flex', alignItems: 'center', gap: '12px',
              padding: '10px 14px', borderRadius: '10px',
              background: 'rgba(255,255,255,0.02)', border: '1px solid rgba(201,168,76,0.06)',
            }}>
              <div style={{ flex: 1, minWidth: 0 }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                  <span style={{ fontSize: '13px', fontWeight: 600, color: 'var(--text-primary)' }}>{m.fila}</span>
                  <span style={{
                    fontSize: '10px', padding: '1px 6px', borderRadius: '99px',
                    background: 'rgba(201,168,76,0.08)', border: '1px solid rgba(201,168,76,0.15)',
                    color: 'var(--gold)',
                  }}>{m.segmento}</span>
                  <span style={{
                    fontSize: '10px', padding: '1px 6px', borderRadius: '99px',
                    background: m.sla.includes('24') ? 'rgba(245,158,11,0.08)' : 'rgba(96,165,250,0.08)',
                    border: `1px solid ${m.sla.includes('24') ? 'rgba(245,158,11,0.18)' : 'rgba(96,165,250,0.18)'}`,
                    color: m.sla.includes('24') ? '#f59e0b' : '#60a5fa',
                  }}>{m.sla}</span>
                  {!m.ativo && <span style={{ fontSize: '10px', padding: '1px 6px', borderRadius: '99px', background: 'rgba(239,68,68,0.1)', color: '#f87171' }}>inativo</span>}
                </div>
                <p style={{ fontSize: '11px', color: 'var(--text-muted)', marginTop: '2px', fontStyle: 'italic' }}>{m.utilizacao.slice(0, 80)}{m.utilizacao.length > 80 ? '…' : ''}</p>
              </div>
              <button onClick={() => { setErro(null); setEditing(m) }} style={{
                padding: '6px', borderRadius: '7px',
                background: 'transparent', border: '1px solid rgba(201,168,76,0.15)',
                color: 'var(--gold)', cursor: 'pointer',
              }}><Pencil size={13} /></button>
              <button onClick={() => handleDelete(m.id)} disabled={isPending} style={{
                padding: '6px', borderRadius: '7px',
                background: 'transparent', border: '1px solid rgba(239,68,68,0.15)',
                color: '#f87171', cursor: isPending ? 'not-allowed' : 'pointer',
                opacity: isPending ? 0.5 : 1,
              }}><Trash2 size={13} /></button>
            </div>
          ))}
        </div>
      )}
    </div>
  )
}
