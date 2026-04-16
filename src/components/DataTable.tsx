'use client'

import { useState } from 'react'
import { Search, ChevronUp, ChevronDown } from 'lucide-react'
import { SheetRow } from '@/types'
import clsx from 'clsx'

interface DataTableProps {
  dados: SheetRow[]
  titulo?: string
}

export default function DataTable({ dados, titulo }: DataTableProps) {
  const [busca, setBusca] = useState('')
  const [ordenacao, setOrdenacao] = useState<{ col: string; dir: 'asc' | 'desc' } | null>(null)

  if (!dados.length) {
    return (
      <div className="card text-center py-12">
        <p className="text-sm" style={{ color: 'var(--text-muted)' }}>Nenhum dado encontrado</p>
      </div>
    )
  }

  const colunas = Object.keys(dados[0])

  const filtrados = dados.filter((row) =>
    Object.values(row).some((v) =>
      String(v).toLowerCase().includes(busca.toLowerCase())
    )
  )

  const ordenados = ordenacao
    ? [...filtrados].sort((a, b) => {
        const av = a[ordenacao.col] ?? ''
        const bv = b[ordenacao.col] ?? ''
        const cmp = av.localeCompare(bv, 'pt-BR', { numeric: true })
        return ordenacao.dir === 'asc' ? cmp : -cmp
      })
    : filtrados

  function toggleOrdenacao(col: string) {
    if (ordenacao?.col === col) {
      setOrdenacao(ordenacao.dir === 'asc' ? { col, dir: 'desc' } : null)
    } else {
      setOrdenacao({ col, dir: 'asc' })
    }
  }

  return (
    <div className="card p-0 overflow-hidden">
      <div
        className="px-5 py-4 flex items-center gap-3"
        style={{ borderBottom: '1px solid rgba(201,168,76,0.08)' }}
      >
        {titulo && (
          <h3 className="font-semibold flex-1 text-sm" style={{ color: 'var(--text-primary)' }}>
            {titulo}
          </h3>
        )}
        <div className="relative">
          <Search size={14} className="absolute left-3 top-1/2 -translate-y-1/2" style={{ color: 'var(--text-muted)' }} />
          <input
            type="text"
            placeholder="Buscar..."
            value={busca}
            onChange={(e) => setBusca(e.target.value)}
            className="pl-9 pr-4 py-2 text-sm rounded-xl w-44 outline-none focus:ring-2"
            style={{
              background: 'var(--bg-elevated)',
              border: '1px solid rgba(201,168,76,0.12)',
              color: 'var(--text-primary)',
              boxShadow: 'none',
            }}
            onFocus={(e) => { (e.currentTarget as HTMLElement).style.borderColor = 'rgba(201,168,76,0.4)' }}
            onBlur={(e) => { (e.currentTarget as HTMLElement).style.borderColor = 'rgba(201,168,76,0.12)' }}
          />
        </div>
        <span className="text-xs" style={{ color: 'var(--text-muted)' }}>
          {ordenados.length} registros
        </span>
      </div>

      <div className="overflow-x-auto">
        <table className="w-full text-sm">
          <thead>
            <tr style={{ background: 'rgba(201,168,76,0.03)', borderBottom: '1px solid rgba(201,168,76,0.08)' }}>
              {colunas.map((col) => (
                <th
                  key={col}
                  onClick={() => toggleOrdenacao(col)}
                  className="text-left px-5 py-3 text-xs font-semibold uppercase tracking-wider cursor-pointer select-none whitespace-nowrap transition-colors"
                  style={{ color: 'var(--text-muted)' }}
                  onMouseEnter={(e) => { (e.currentTarget as HTMLElement).style.color = 'var(--text-secondary)' }}
                  onMouseLeave={(e) => { (e.currentTarget as HTMLElement).style.color = 'var(--text-muted)' }}
                >
                  <span className="flex items-center gap-1">
                    {col}
                    {ordenacao?.col === col ? (
                      ordenacao.dir === 'asc' ? <ChevronUp size={11} /> : <ChevronDown size={11} />
                    ) : (
                      <span className="w-3" />
                    )}
                  </span>
                </th>
              ))}
            </tr>
          </thead>
          <tbody>
            {ordenados.map((row, i) => (
              <tr
                key={i}
                className={clsx('transition-colors')}
                style={{
                  background: i % 2 === 1 ? 'rgba(201,168,76,0.02)' : 'transparent',
                  borderBottom: '1px solid rgba(201,168,76,0.05)',
                }}
                onMouseEnter={(e) => { (e.currentTarget as HTMLElement).style.background = 'rgba(201,168,76,0.04)' }}
                onMouseLeave={(e) => { (e.currentTarget as HTMLElement).style.background = i % 2 === 1 ? 'rgba(201,168,76,0.02)' : 'transparent' }}
              >
                {colunas.map((col) => (
                  <td key={col} className="px-5 py-3 whitespace-nowrap text-sm" style={{ color: 'var(--text-secondary)' }}>
                    {row[col] || <span style={{ color: 'var(--text-muted)' }}>—</span>}
                  </td>
                ))}
              </tr>
            ))}
          </tbody>
        </table>

        {ordenados.length === 0 && (
          <div className="text-center py-10 text-sm" style={{ color: 'var(--text-muted)' }}>
            Nenhum resultado para &ldquo;{busca}&rdquo;
          </div>
        )}
      </div>
    </div>
  )
}
