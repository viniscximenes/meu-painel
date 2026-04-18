'use client'

import { useState, useTransition } from 'react'
import { adicionarLinkUtil, excluirLinkUtil } from '@/app/painel/config/actions'
import { CATEGORIAS_LINKS } from '@/lib/links'
import type { LinkUtil } from '@/lib/links'
import { ExternalLink, Plus, Trash2, X, Link2 } from 'lucide-react'

function safeHostname(url: string): string {
  try { return new URL(url).hostname } catch { return '' }
}

const MS_ICONS: { match: RegExp; src: string; color: string }[] = [
  { match: /teams/i,   src: 'https://cdn.jsdelivr.net/npm/simple-icons@v11/icons/microsoftteams.svg',   color: '#6264A7' },
  { match: /excel/i,   src: 'https://cdn.jsdelivr.net/npm/simple-icons@v11/icons/microsoftexcel.svg',   color: '#217346' },
  { match: /outlook/i, src: 'https://cdn.jsdelivr.net/npm/simple-icons@v11/icons/microsoftoutlook.svg', color: '#0078D4' },
]

function LinkIcon({ nome, url, categoria }: { nome: string; url: string; categoria: string }) {
  const ms = (categoria === 'Microsoft' || MS_ICONS.some(m => m.match.test(nome)))
    ? MS_ICONS.find(m => m.match.test(nome))
    : null

  if (ms) {
    return (
      <span style={{
        width: 20, height: 20, borderRadius: '4px', flexShrink: 0,
        display: 'flex', alignItems: 'center', justifyContent: 'center',
        background: `${ms.color}18`,
      }}>
        {/* eslint-disable-next-line @next/next/no-img-element */}
        <img
          src={ms.src}
          width={14} height={14}
          alt=""
          style={{ filter: `invert(0) sepia(1) saturate(5) hue-rotate(${ms.color === '#217346' ? '90deg' : ms.color === '#6264A7' ? '220deg' : '200deg'})`, opacity: 0.9 }}
          onError={e => { e.currentTarget.style.display = 'none' }}
        />
      </span>
    )
  }

  const host = safeHostname(url)
  if (!host) return <Link2 size={16} style={{ color: 'var(--text-muted)', flexShrink: 0 }} />

  return <FaviconImg host={host} />
}

function FaviconImg({ host }: { host: string }) {
  const [failed, setFailed] = useState(false)
  if (failed) return <Link2 size={16} style={{ color: 'var(--text-muted)', flexShrink: 0 }} />
  return (
    // eslint-disable-next-line @next/next/no-img-element
    <img
      src={`https://www.google.com/s2/favicons?domain=${host}&sz=64`}
      onError={() => setFailed(true)}
      width={20} height={20}
      alt=""
      style={{ borderRadius: '4px', flexShrink: 0 }}
    />
  )
}

interface LinksClientProps {
  links: LinkUtil[]
}

export default function LinksClient({ links: initial }: LinksClientProps) {
  const [links, setLinks]   = useState(initial)
  const [adding, setAdding] = useState(false)
  const [erro, setErro]     = useState<string | null>(null)
  const [isPending, start]  = useTransition()

  const [nome, setNome]         = useState('')
  const [url, setUrl]           = useState('')
  const [descricao, setDescricao] = useState('')
  const [categoria, setCategoria] = useState<string>(CATEGORIAS_LINKS[0])

  function reset() {
    setNome(''); setUrl(''); setDescricao('')
    setCategoria(CATEGORIAS_LINKS[0]); setErro(null)
  }

  function handleAdd() {
    if (!nome.trim() || !url.trim()) { setErro('Nome e URL são obrigatórios'); return }
    const fd = new FormData()
    fd.set('nome', nome.trim()); fd.set('url', url.trim())
    fd.set('descricao', descricao.trim()); fd.set('categoria', categoria); fd.set('ordem', '0')
    start(async () => {
      try {
        await adicionarLinkUtil(fd)
        const newLink: LinkUtil = {
          id: crypto.randomUUID(),
          nome: nome.trim(), url: url.trim(),
          descricao: descricao.trim() || null,
          categoria, ordem: 0, ativo: true, icone: null,
        }
        setLinks(prev => [...prev, newLink].sort((a, b) => a.nome.localeCompare(b.nome)))
        reset(); setAdding(false)
      } catch (e) {
        setErro(e instanceof Error ? e.message : 'Erro ao salvar')
      }
    })
  }

  function handleDelete(id: string) {
    const fd = new FormData(); fd.set('id', id)
    start(async () => {
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

  const porCategoria = CATEGORIAS_LINKS.map(cat => ({
    categoria: cat,
    items: links.filter(l => l.categoria === cat && l.ativo),
  }))

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: '24px' }}>
      {/* Botão adicionar */}
      <div style={{ display: 'flex', justifyContent: 'flex-end' }}>
        <button
          onClick={() => setAdding(v => !v)}
          style={{
            display: 'flex', alignItems: 'center', gap: '6px',
            padding: '7px 14px', borderRadius: '8px', fontSize: '12px', fontWeight: 600,
            background: adding ? 'rgba(239,68,68,0.08)' : 'rgba(201,168,76,0.10)',
            border: `1px solid ${adding ? 'rgba(239,68,68,0.22)' : 'rgba(201,168,76,0.22)'}`,
            color: adding ? '#f87171' : 'var(--gold)', cursor: 'pointer',
          }}
        >
          {adding ? <><X size={13} /> Cancelar</> : <><Plus size={13} /> Adicionar Link</>}
        </button>
      </div>

      {/* Formulário inline */}
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

          <div>
            <label style={{ fontSize: '11px', color: 'var(--text-muted)', display: 'block', marginBottom: '4px' }}>Descrição</label>
            <input style={inputStyle} value={descricao} onChange={e => setDescricao(e.target.value)} placeholder="Breve descrição opcional" />
          </div>

          {erro && <p style={{ fontSize: '12px', color: '#f87171' }}>{erro}</p>}

          <div style={{ display: 'flex', gap: '8px', justifyContent: 'flex-end' }}>
            <button
              onClick={handleAdd}
              disabled={isPending}
              style={{
                padding: '7px 18px', borderRadius: '8px', fontSize: '12px', fontWeight: 600,
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

      {/* Grid por categoria */}
      {links.length === 0 ? (
        <div style={{ textAlign: 'center', padding: '48px 0', color: 'var(--text-muted)', fontSize: '14px' }}>
          Nenhum link cadastrado ainda.
        </div>
      ) : (
        porCategoria.map(({ categoria: cat, items }) =>
          items.length === 0 ? null : (
            <section key={cat}>
              <p style={{
                fontSize: '9px', fontWeight: 700, textTransform: 'uppercase',
                letterSpacing: '0.14em', color: 'var(--text-muted)', marginBottom: '12px',
              }}>
                {cat}
              </p>
              <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(220px, 1fr))', gap: '10px' }}>
                {items.map(link => (
                  <div
                    key={link.id}
                    style={{
                      position: 'relative',
                      display: 'flex', flexDirection: 'column', gap: '6px',
                      padding: '14px 16px', borderRadius: '12px',
                      background: '#0d0d1a',
                      border: '1px solid rgba(201,168,76,0.08)',
                    }}
                  >
                    {/* Header do card */}
                    <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                      <LinkIcon nome={link.nome} url={link.url} categoria={link.categoria} />
                      <span style={{ fontSize: '13px', fontWeight: 600, color: 'var(--text-primary)', flex: 1, minWidth: 0 }}>
                        {link.nome}
                      </span>
                    </div>

                    {link.descricao && (
                      <span style={{ fontSize: '11px', color: 'var(--text-muted)', lineHeight: 1.4 }}>
                        {link.descricao}
                      </span>
                    )}

                    {/* Ações */}
                    <div style={{ display: 'flex', alignItems: 'center', gap: '6px', marginTop: '4px' }}>
                      <a
                        href={link.url}
                        target="_blank"
                        rel="noopener noreferrer"
                        style={{
                          flex: 1, display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '5px',
                          padding: '5px 0', borderRadius: '7px', fontSize: '11px', fontWeight: 600,
                          background: 'rgba(201,168,76,0.07)', border: '1px solid rgba(201,168,76,0.12)',
                          color: 'var(--gold)', textDecoration: 'none',
                        }}
                      >
                        <ExternalLink size={11} /> Abrir
                      </a>
                      <button
                        onClick={() => handleDelete(link.id)}
                        disabled={isPending}
                        title="Remover"
                        style={{
                          padding: '5px 8px', borderRadius: '7px',
                          background: 'transparent', border: '1px solid rgba(239,68,68,0.15)',
                          color: '#f87171', cursor: isPending ? 'not-allowed' : 'pointer',
                          opacity: isPending ? 0.5 : 1,
                        }}
                      >
                        <Trash2 size={12} />
                      </button>
                    </div>
                  </div>
                ))}
              </div>
            </section>
          )
        )
      )}
    </div>
  )
}
