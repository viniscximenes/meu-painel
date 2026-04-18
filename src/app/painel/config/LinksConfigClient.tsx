'use client'

import { useState, useTransition } from 'react'
import { adicionarLinkUtil, excluirLinkUtil } from './actions'
import { CATEGORIAS_LINKS } from '@/lib/links'
import type { LinkUtil } from '@/lib/links'
import { Trash2, Plus, ExternalLink, Link2 } from 'lucide-react'

interface LinksConfigClientProps {
  links: LinkUtil[]
}

export default function LinksConfigClient({ links: initial }: LinksConfigClientProps) {
  const [links, setLinks]       = useState(initial)
  const [adding, setAdding]     = useState(false)
  const [erro, setErro]         = useState<string | null>(null)
  const [isPending, startTransition] = useTransition()

  const [nome, setNome]         = useState('')
  const [url, setUrl]           = useState('')
  const [descricao, setDescricao] = useState('')
  const [categoria, setCategoria] = useState<string>(CATEGORIAS_LINKS[0])
  const [ordem, setOrdem]       = useState(0)

  function resetForm() {
    setNome(''); setUrl(''); setDescricao('')
    setCategoria(CATEGORIAS_LINKS[0]); setOrdem(0)
    setErro(null)
  }

  function handleAdd() {
    if (!nome.trim() || !url.trim()) { setErro('Nome e URL são obrigatórios'); return }
    const fd = new FormData()
    fd.set('nome', nome.trim())
    fd.set('url', url.trim())
    fd.set('descricao', descricao.trim())
    fd.set('categoria', categoria)
    fd.set('ordem', String(ordem))
    startTransition(async () => {
      try {
        await adicionarLinkUtil(fd)
        resetForm()
        setAdding(false)
      } catch (e) {
        setErro(e instanceof Error ? e.message : 'Erro ao salvar')
      }
    })
  }

  function handleDelete(id: string) {
    const fd = new FormData()
    fd.set('id', id)
    startTransition(async () => {
      try {
        await excluirLinkUtil(fd)
        setLinks(prev => prev.filter(l => l.id !== id))
      } catch (e) {
        setErro(e instanceof Error ? e.message : 'Erro ao excluir')
      }
    })
  }

  const inputStyle: React.CSSProperties = {
    width: '100%', padding: '8px 12px', borderRadius: '8px', fontSize: '13px',
    background: 'rgba(255,255,255,0.04)', border: '1px solid rgba(201,168,76,0.12)',
    color: 'var(--text-primary)', outline: 'none',
  }

  return (
    <div className="space-y-4">
      {/* Header + add button */}
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
        <p style={{ fontSize: '13px', color: 'var(--text-muted)' }}>
          {links.length} link{links.length !== 1 ? 's' : ''} cadastrado{links.length !== 1 ? 's' : ''}
        </p>
        {!adding && (
          <button
            onClick={() => setAdding(true)}
            style={{
              display: 'flex', alignItems: 'center', gap: '6px',
              padding: '7px 14px', borderRadius: '8px', fontSize: '12px', fontWeight: 600,
              background: 'rgba(201,168,76,0.10)', border: '1px solid rgba(201,168,76,0.22)',
              color: 'var(--gold)', cursor: 'pointer',
            }}
          >
            <Plus size={13} /> Adicionar Link
          </button>
        )}
      </div>

      {/* Formulário de adição */}
      {adding && (
        <div style={{
          padding: '16px', borderRadius: '12px',
          background: 'rgba(201,168,76,0.04)', border: '1px solid rgba(201,168,76,0.12)',
          display: 'flex', flexDirection: 'column', gap: '10px',
        }}>
          <p style={{ fontSize: '11px', fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.1em', color: 'var(--text-muted)' }}>
            Novo Link
          </p>

          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '8px' }}>
            <div>
              <label style={{ fontSize: '11px', color: 'var(--text-muted)', display: 'block', marginBottom: '4px' }}>Nome *</label>
              <input style={inputStyle} value={nome} onChange={e => setNome(e.target.value)} placeholder="Ex: SharePoint" />
            </div>
            <div>
              <label style={{ fontSize: '11px', color: 'var(--text-muted)', display: 'block', marginBottom: '4px' }}>Categoria *</label>
              <select style={inputStyle} value={categoria} onChange={e => setCategoria(e.target.value)}>
                {CATEGORIAS_LINKS.map(c => <option key={c} value={c}>{c}</option>)}
              </select>
            </div>
          </div>

          <div>
            <label style={{ fontSize: '11px', color: 'var(--text-muted)', display: 'block', marginBottom: '4px' }}>URL *</label>
            <input style={inputStyle} value={url} onChange={e => setUrl(e.target.value)} placeholder="https://..." />
          </div>

          <div style={{ display: 'grid', gridTemplateColumns: '1fr 80px', gap: '8px' }}>
            <div>
              <label style={{ fontSize: '11px', color: 'var(--text-muted)', display: 'block', marginBottom: '4px' }}>Descrição</label>
              <input style={inputStyle} value={descricao} onChange={e => setDescricao(e.target.value)} placeholder="Breve descrição opcional" />
            </div>
            <div>
              <label style={{ fontSize: '11px', color: 'var(--text-muted)', display: 'block', marginBottom: '4px' }}>Ordem</label>
              <input style={inputStyle} type="number" value={ordem} onChange={e => setOrdem(Number(e.target.value))} min={0} />
            </div>
          </div>

          {erro && <p style={{ fontSize: '12px', color: '#f87171' }}>{erro}</p>}

          <div style={{ display: 'flex', gap: '8px', justifyContent: 'flex-end' }}>
            <button
              onClick={() => { setAdding(false); resetForm() }}
              style={{
                padding: '7px 14px', borderRadius: '8px', fontSize: '12px',
                background: 'transparent', border: '1px solid rgba(255,255,255,0.08)',
                color: 'var(--text-muted)', cursor: 'pointer',
              }}
            >
              Cancelar
            </button>
            <button
              onClick={handleAdd}
              disabled={isPending}
              style={{
                padding: '7px 14px', borderRadius: '8px', fontSize: '12px', fontWeight: 600,
                background: 'rgba(201,168,76,0.15)', border: '1px solid rgba(201,168,76,0.30)',
                color: 'var(--gold)', cursor: isPending ? 'not-allowed' : 'pointer',
                opacity: isPending ? 0.6 : 1,
              }}
            >
              {isPending ? 'Salvando…' : 'Salvar'}
            </button>
          </div>
        </div>
      )}

      {/* Lista de links */}
      {links.length === 0 ? (
        <div style={{
          textAlign: 'center', padding: '32px 0',
          color: 'var(--text-muted)', fontSize: '13px',
        }}>
          Nenhum link cadastrado.
        </div>
      ) : (
        <div style={{ display: 'flex', flexDirection: 'column', gap: '6px' }}>
          {CATEGORIAS_LINKS.map(cat => {
            const items = links.filter(l => l.categoria === cat)
            if (items.length === 0) return null
            return (
              <div key={cat}>
                <p style={{ fontSize: '9px', fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.12em', color: 'var(--text-muted)', marginBottom: '6px', marginTop: '12px' }}>
                  {cat}
                </p>
                {items.map(link => (
                  <div key={link.id} style={{
                    display: 'flex', alignItems: 'center', gap: '12px',
                    padding: '10px 14px', borderRadius: '10px',
                    background: 'rgba(255,255,255,0.02)', border: '1px solid rgba(201,168,76,0.06)',
                    marginBottom: '4px',
                  }}>
                    <Link2 size={14} style={{ color: 'var(--text-muted)', flexShrink: 0 }} />
                    <div style={{ flex: 1, minWidth: 0 }}>
                      <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                        <span style={{ fontSize: '13px', fontWeight: 600, color: 'var(--text-primary)' }}>{link.nome}</span>
                        {!link.ativo && (
                          <span style={{ fontSize: '10px', padding: '1px 6px', borderRadius: '99px', background: 'rgba(239,68,68,0.1)', color: '#f87171', border: '1px solid rgba(239,68,68,0.2)' }}>
                            inativo
                          </span>
                        )}
                      </div>
                      {link.descricao && (
                        <p style={{ fontSize: '11px', color: 'var(--text-muted)', marginTop: '2px' }}>{link.descricao}</p>
                      )}
                      <p style={{ fontSize: '10px', color: 'var(--text-muted)', marginTop: '2px', fontFamily: 'monospace', opacity: 0.7 }}>{link.url}</p>
                    </div>
                    <a href={link.url} target="_blank" rel="noopener noreferrer" style={{ color: 'var(--text-muted)', flexShrink: 0 }}>
                      <ExternalLink size={13} />
                    </a>
                    <button
                      onClick={() => handleDelete(link.id)}
                      disabled={isPending}
                      style={{
                        padding: '6px', borderRadius: '7px', flexShrink: 0,
                        background: 'transparent', border: '1px solid rgba(239,68,68,0.15)',
                        color: '#f87171', cursor: isPending ? 'not-allowed' : 'pointer',
                        opacity: isPending ? 0.5 : 1,
                      }}
                    >
                      <Trash2 size={13} />
                    </button>
                  </div>
                ))}
              </div>
            )
          })}
        </div>
      )}
    </div>
  )
}
