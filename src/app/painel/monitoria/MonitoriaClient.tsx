'use client'

import { useState, useTransition, useEffect } from 'react'
import { useRouter } from 'next/navigation'
import { ClipboardList, Plus, Search, Pencil, Trash2, Check, Clock, AlertTriangle } from 'lucide-react'
import type { Monitoria, StatusMonitoria } from '@/lib/monitoria-utils'
import { STATUS_INFO, mesDeData, parseDateDMY } from '@/lib/monitoria-utils'
import { deletarMonitoriaAction } from './actions'
import NovaMonitoriaModal from './NovaMonitoriaModal'
import EditarMonitoriaModal from './EditarMonitoriaModal'

interface Operador { id: number; nome: string; username: string }

interface Props {
  initialMonitorias: Monitoria[]
  operadores:        Operador[]
  metaMonitorias:    number
  mesAtual:          string
}

function avatarEstilo(id: number): { background: string; border: string; color: string } {
  const impar = id % 2 !== 0
  return {
    background: impar ? 'linear-gradient(135deg, #0f1729, #1a2540)' : 'linear-gradient(135deg, #0a1020, #111830)',
    border: impar ? '1px solid rgba(66,139,255,0.25)' : '1px solid rgba(66,139,255,0.15)',
    color: '#ffffff',
  }
}

function ProgressCard({ id, nome, count, meta }: { id: number; nome: string; count: number; meta: number }) {
  const pct = Math.min(Math.round((count / meta) * 100), 100)
  const cor = count >= meta ? '#4ade80' : count > 0 ? '#facc15' : '#f87171'
  const firstName = nome.split(' ')[0]
  const initials = nome.split(' ').slice(0, 2).map(n => n[0]).join('').toUpperCase()
  const av = avatarEstilo(id)
  return (
    <div style={{
      background: '#111827',
      border: '1px solid rgba(201,168,76,0.15)',
      borderRadius: '12px',
      padding: '14px',
      display: 'flex',
      flexDirection: 'column',
      gap: '10px',
      minHeight: '100px',
    }}>
      <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
        <div style={{
          width: '28px', height: '28px', borderRadius: '8px',
          display: 'flex', alignItems: 'center', justifyContent: 'center',
          fontSize: '10px', fontWeight: 700, fontFamily: 'var(--ff-display)',
          flexShrink: 0, ...av,
        }}>
          {initials}
        </div>
        <p style={{ fontSize: '11px', fontWeight: 600, color: '#94a3b8', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }} title={nome}>
          {firstName}
        </p>
      </div>
      <div style={{ display: 'flex', alignItems: 'flex-end', gap: '4px' }}>
        <span style={{ fontSize: '24px', fontWeight: 800, color: cor, lineHeight: 1, fontVariantNumeric: 'tabular-nums' }}>{count}</span>
        <span style={{ fontSize: '12px', color: '#475569', marginBottom: '2px' }}>/{meta}</span>
      </div>
      <div style={{ width: '100%', height: '3px', borderRadius: '99px', background: 'rgba(255,255,255,0.06)', overflow: 'hidden' }}>
        <div style={{ height: '100%', borderRadius: '99px', width: `${pct}%`, background: cor, transition: 'width 0.5s ease' }} />
      </div>
    </div>
  )
}

export default function MonitoriaClient({
  initialMonitorias,
  operadores,
  metaMonitorias,
  mesAtual,
}: Props) {
  const [monitorias,        setMonitorias]        = useState<Monitoria[]>(initialMonitorias)
  const [filtroMes,         setFiltroMes]         = useState(mesAtual)

  useEffect(() => { setMonitorias(initialMonitorias) }, [initialMonitorias])
  const [filtroColaborador, setFiltroColaborador] = useState('')
  const [filtroStatus,      setFiltroStatus]      = useState<'' | StatusMonitoria>('')
  const [busca,             setBusca]             = useState('')
  const [novaAberta,        setNovaAberta]        = useState(false)
  const [editando,          setEditando]          = useState<Monitoria | null>(null)
  const [deletando,         setDeletando]         = useState<number | null>(null)
  const [,                  startDel]             = useTransition()
  const router = useRouter()

  const meses = Array.from(
    new Set(monitorias.map((m) => mesDeData(m.dataAtendimento)).filter(Boolean))
  ).sort((a, b) => {
    const [ma, ya] = a.split('/').map(Number)
    const [mb, yb] = b.split('/').map(Number)
    return ya !== yb ? yb - ya : mb - ma
  })
  if (!meses.includes(mesAtual)) meses.unshift(mesAtual)

  const monitoriasMes = monitorias.filter((m) => mesDeData(m.dataAtendimento) === filtroMes)

  const filtradas = monitorias
    .filter((m) => {
      if (filtroMes && mesDeData(m.dataAtendimento) !== filtroMes) return false
      if (filtroColaborador && m.colaborador !== filtroColaborador) return false
      if (filtroStatus && m.status !== filtroStatus) return false
      if (busca) {
        const q = busca.toLowerCase()
        if (
          !m.colaborador.toLowerCase().includes(q) &&
          !m.idChamada.toLowerCase().includes(q) &&
          !m.contratoCliente.toLowerCase().includes(q)
        ) return false
      }
      return true
    })
    .sort((a, b) => {
      const dt = parseDateDMY(b.dataAtendimento).getTime() - parseDateDMY(a.dataAtendimento).getTime()
      return dt !== 0 ? dt : b.sheetRowIndex - a.sheetRowIndex
    })

  function handleDeletar(m: Monitoria) {
    if (!confirm(`Deletar monitoria de ${m.colaborador} (${m.dataAtendimento || 'sem data'})?`)) return
    setDeletando(m.sheetRowIndex)
    startDel(async () => {
      await deletarMonitoriaAction(m.sheetRowIndex)
      setDeletando(null)
      router.refresh()
    })
  }

  const cssVars = { '--void2': '#07070f', '--void3': '#0d0d1a' } as React.CSSProperties

  return (
    <div className="space-y-5" style={cssVars}>

      {/* ── Linha dourada ── */}
      <div style={{
        height: '1px',
        background: 'linear-gradient(90deg, transparent 0%, #c9a84c 25%, #e8c96d 50%, #c9a84c 75%, transparent 100%)',
      }} />

      {/* ── Header ── */}
      <div style={{
        background: 'var(--void2)',
        border: '1px solid rgba(201,168,76,0.1)',
        borderRadius: '14px',
        padding: '14px 20px',
        display: 'flex',
        alignItems: 'center',
        gap: '16px',
        flexWrap: 'wrap',
        justifyContent: 'space-between',
      }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: '14px', flexWrap: 'wrap' }}>
          <span style={{
            fontFamily: 'var(--ff-display)',
            fontSize: '16px',
            fontWeight: 700,
            textTransform: 'uppercase',
            letterSpacing: '0.06em',
            background: 'linear-gradient(135deg, #e8c96d 0%, #c9a84c 100%)',
            WebkitBackgroundClip: 'text',
            WebkitTextFillColor: 'transparent',
            backgroundClip: 'text',
          }}>
            Monitoria de Qualidade
          </span>
          <div style={{ width: '1px', height: '16px', background: 'rgba(201,168,76,0.2)', flexShrink: 0 }} />
          <span style={{ fontSize: '11px', textTransform: 'uppercase', letterSpacing: '0.06em', color: 'var(--text-muted)' }}>
            {filtroMes}
          </span>
          <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
            <div className="animate-pulse" style={{ width: '6px', height: '6px', borderRadius: '50%', background: '#10b981', flexShrink: 0 }} />
            <span style={{ fontSize: '11px', color: 'var(--text-muted)' }}>
              <strong style={{ color: 'var(--text-secondary)', fontWeight: 600 }}>{monitoriasMes.length}</strong>{' '}registros
            </span>
          </div>
        </div>
        <button
          type="button"
          onClick={() => setNovaAberta(true)}
          className="btn-primary flex items-center gap-2 text-sm"
        >
          <Plus size={15} /> Nova Monitoria
        </button>
      </div>

      {/* ── Progress grid ── */}
      <div style={{
        background: 'var(--void3)',
        border: '1px solid rgba(201,168,76,0.08)',
        borderRadius: '16px',
        padding: '16px 20px',
      }}>
        <p style={{
          fontSize: '9px',
          fontWeight: 700,
          textTransform: 'uppercase',
          letterSpacing: '0.12em',
          color: '#c9a84c',
          marginBottom: '14px',
        }}>
          Progresso — {filtroMes}
        </p>
        <div className="grid grid-cols-3 sm:grid-cols-4 lg:grid-cols-6 gap-3">
          {operadores.map((op) => {
            const count = monitoriasMes.filter((m) => m.colaborador === op.nome && m.status === 'verde').length
            return <ProgressCard key={op.id} id={op.id} nome={op.nome} count={count} meta={metaMonitorias} />
          })}
        </div>
      </div>

      {/* ── Filtros ── */}
      <div style={{
        background: 'var(--void3)',
        border: '1px solid rgba(201,168,76,0.08)',
        borderRadius: '14px',
        padding: '12px 16px',
        display: 'flex',
        flexWrap: 'wrap',
        gap: '10px',
        alignItems: 'center',
      }}>
        <select
          value={filtroMes}
          onChange={(e) => setFiltroMes(e.target.value)}
          className="select text-sm"
          style={{ width: 'auto', minWidth: 130 }}
        >
          {meses.map((m) => <option key={m} value={m}>{m}</option>)}
        </select>

        <select
          value={filtroColaborador}
          onChange={(e) => setFiltroColaborador(e.target.value)}
          className="select text-sm"
          style={{ width: 'auto', minWidth: 160 }}
        >
          <option value="">Todos os colaboradores</option>
          {operadores.map((op) => <option key={op.id} value={op.nome}>{op.nome.split(' ')[0]} {op.nome.split(' ')[1]}</option>)}
        </select>

        <select
          value={filtroStatus}
          onChange={(e) => setFiltroStatus(e.target.value as '' | StatusMonitoria)}
          className="select text-sm"
          style={{ width: 'auto', minWidth: 130 }}
        >
          <option value="">Todos os status</option>
          <option value="verde">Enviado</option>
          <option value="amarelo">Pendente</option>
          <option value="vermelho">Incompleto</option>
        </select>

        <div className="relative flex-1" style={{ minWidth: 180 }}>
          <Search size={13} className="absolute left-3 top-1/2 -translate-y-1/2 pointer-events-none" style={{ color: 'var(--text-muted)' }} />
          <input
            type="text"
            value={busca}
            onChange={(e) => setBusca(e.target.value)}
            placeholder="Buscar colaborador, chamada, contrato…"
            className="input pl-8 w-full text-sm"
          />
        </div>
      </div>

      {/* ── Tabela ── */}
      <div style={{
        background: 'var(--void3)',
        border: '1px solid rgba(201,168,76,0.08)',
        borderRadius: '16px',
        overflow: 'hidden',
      }}>
        <div className="overflow-x-auto">
          <table className="w-full text-sm min-w-[700px]">
            <thead>
              <tr style={{ borderBottom: '1px solid rgba(201,168,76,0.08)' }}>
                {['Status', 'Colaborador', 'Contrato', 'Data', 'Sinalização', 'Anexo', 'Forms', 'Ações'].map((col) => (
                  <th
                    key={col}
                    className="text-left px-4 py-3"
                    style={{ fontSize: '9px', fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.10em', color: '#c9a84c', whiteSpace: 'nowrap' }}
                  >
                    {col}
                  </th>
                ))}
              </tr>
            </thead>
            <tbody>
              {filtradas.length === 0 ? (
                <tr>
                  <td colSpan={8} className="px-4 py-14 text-center" style={{ color: 'var(--text-muted)' }}>
                    <ClipboardList size={26} className="mx-auto mb-2.5 opacity-40" />
                    <p className="text-sm">Nenhuma monitoria encontrada.</p>
                  </td>
                </tr>
              ) : (
                filtradas.map((m) => {
                  const si = STATUS_INFO[m.status]
                  return (
                    <tr
                      key={m.sheetRowIndex}
                      style={{ borderBottom: '1px solid rgba(255,255,255,0.04)' }}
                      onMouseEnter={(e) => { (e.currentTarget as HTMLElement).style.background = 'rgba(201,168,76,0.04)' }}
                      onMouseLeave={(e) => { (e.currentTarget as HTMLElement).style.background = '' }}
                    >
                      <td className="px-4 py-3 whitespace-nowrap">
                        <span
                          className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-semibold"
                          style={{ background: si.bg, color: si.color, border: `1px solid ${si.border}` }}
                        >
                          {m.status === 'verde' ? <Check size={10} /> : m.status === 'amarelo' ? <Clock size={10} /> : <AlertTriangle size={10} />}
                          {si.label}
                        </span>
                      </td>
                      <td className="px-4 py-3 font-medium" style={{ color: 'var(--text-primary)' }}>{m.colaborador || '—'}</td>
                      <td className="px-4 py-3" style={{ color: 'var(--text-secondary)' }}>{m.contratoCliente || '—'}</td>
                      <td className="px-4 py-3 whitespace-nowrap text-xs" style={{ color: 'var(--text-muted)' }}>{m.dataAtendimento || '—'}</td>
                      <td className="px-4 py-3" style={{ maxWidth: 200 }}>
                        <span className="block truncate text-xs" title={m.sinalizacao || undefined} style={{ color: 'var(--text-muted)' }}>
                          {m.sinalizacao || '—'}
                        </span>
                      </td>
                      <td className="px-4 py-3">
                        {m.anexo ? (
                          <a
                            href={m.anexo}
                            target="_blank"
                            rel="noopener noreferrer"
                            title="Abrir anexo"
                            className="inline-flex items-center justify-center w-6 h-6 rounded-full transition-colors"
                            style={{ background: 'rgba(201,168,76,0.12)', color: 'var(--gold-light)', border: '1px solid rgba(201,168,76,0.20)', fontSize: '0.55rem', lineHeight: 1 }}
                            onMouseEnter={(e) => { const el = e.currentTarget as HTMLElement; el.style.background = 'rgba(201,168,76,0.22)'; el.style.borderColor = 'rgba(201,168,76,0.50)' }}
                            onMouseLeave={(e) => { const el = e.currentTarget as HTMLElement; el.style.background = 'rgba(201,168,76,0.12)'; el.style.borderColor = 'rgba(201,168,76,0.20)' }}
                          >
                            ▶
                          </a>
                        ) : (
                          <span style={{ color: 'var(--text-muted)' }}>—</span>
                        )}
                      </td>
                      <td className="px-4 py-3 whitespace-nowrap text-xs">
                        <span style={{ color: m.enviadoForms?.toLowerCase() === 'sim' ? '#4ade80' : 'var(--text-muted)' }}>
                          {m.enviadoForms || '—'}
                        </span>
                      </td>
                      <td className="px-4 py-3">
                        <div className="flex items-center gap-1">
                          <button
                            type="button"
                            onClick={() => setEditando(m)}
                            className="p-1.5 rounded-lg transition-colors"
                            style={{ color: 'var(--text-muted)' }}
                            onMouseEnter={(e) => { const el = e.currentTarget as HTMLElement; el.style.background = 'rgba(201,168,76,0.10)'; el.style.color = 'var(--gold-light)' }}
                            onMouseLeave={(e) => { const el = e.currentTarget as HTMLElement; el.style.background = ''; el.style.color = 'var(--text-muted)' }}
                            title="Editar"
                          >
                            <Pencil size={13} />
                          </button>
                          <button
                            type="button"
                            onClick={() => handleDeletar(m)}
                            disabled={deletando === m.sheetRowIndex}
                            className="p-1.5 rounded-lg transition-colors"
                            style={{ color: 'var(--text-muted)' }}
                            onMouseEnter={(e) => { const el = e.currentTarget as HTMLElement; el.style.background = 'rgba(239,68,68,0.10)'; el.style.color = '#f87171' }}
                            onMouseLeave={(e) => { const el = e.currentTarget as HTMLElement; el.style.background = ''; el.style.color = 'var(--text-muted)' }}
                            title="Deletar"
                          >
                            <Trash2 size={13} />
                          </button>
                        </div>
                      </td>
                    </tr>
                  )
                })
              )}
            </tbody>
          </table>
        </div>
      </div>

      {/* ── Modais ── */}
      <NovaMonitoriaModal
        aberto={novaAberta}
        operadores={operadores}
        onFechar={() => setNovaAberta(false)}
        onSalvo={async () => { setNovaAberta(false); router.refresh() }}
      />

      {editando && (
        <EditarMonitoriaModal
          monitoria={editando}
          operadores={operadores}
          onFechar={() => setEditando(null)}
          onSalvo={async () => { setEditando(null); router.refresh() }}
        />
      )}
    </div>
  )
}
