'use client'

import { useState, useTransition } from 'react'
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

function ProgressCard({ nome, count, meta }: { nome: string; count: number; meta: number }) {
  const pct = Math.min(Math.round((count / meta) * 100), 100)
  const cor = count >= meta ? '#4ade80' : count > 0 ? '#facc15' : '#f87171'
  const firstName = nome.split(' ')[0]
  return (
    <div
      className="card flex flex-col gap-2.5"
      style={{ minHeight: 88, padding: '0.875rem' }}
    >
      <p className="text-xs font-semibold truncate" title={nome} style={{ color: 'var(--text-secondary)' }}>
        {firstName}
      </p>
      <div className="flex items-end gap-1">
        <span className="text-2xl font-extrabold tabular-nums leading-none" style={{ color: cor }}>
          {count}
        </span>
        <span className="text-xs mb-0.5" style={{ color: 'var(--text-muted)' }}>/{meta}</span>
      </div>
      <div className="w-full h-1 rounded-full overflow-hidden" style={{ background: 'rgba(255,255,255,0.06)' }}>
        <div className="h-full rounded-full transition-all duration-500" style={{ width: `${pct}%`, background: cor }} />
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
  const [filtroColaborador, setFiltroColaborador] = useState('')
  const [filtroStatus,      setFiltroStatus]      = useState<'' | StatusMonitoria>('')
  const [busca,             setBusca]             = useState('')
  const [novaAberta,        setNovaAberta]        = useState(false)
  const [editando,          setEditando]          = useState<Monitoria | null>(null)
  const [deletando,         setDeletando]         = useState<number | null>(null)
  const [,                  startDel]             = useTransition()
  const router = useRouter()

  // Meses disponíveis (descendente)
  const meses = Array.from(
    new Set(monitorias.map((m) => mesDeData(m.dataAtendimento)).filter(Boolean))
  ).sort((a, b) => {
    const [ma, ya] = a.split('/').map(Number)
    const [mb, yb] = b.split('/').map(Number)
    return ya !== yb ? yb - ya : mb - ma
  })
  if (!meses.includes(mesAtual)) meses.unshift(mesAtual)

  // Monitorias do mês selecionado (para progress grid)
  const monitoriasMes = monitorias.filter((m) => mesDeData(m.dataAtendimento) === filtroMes)

  // Linhas filtradas para a tabela
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

  return (
    <div className="space-y-6">

      {/* ── Header ── */}
      <div className="flex items-center justify-between flex-wrap gap-4">
        <div>
          <h2
            className="text-2xl font-extrabold"
            style={{
              background: 'linear-gradient(90deg, var(--text-primary) 0%, var(--gold-light) 100%)',
              WebkitBackgroundClip: 'text',
              WebkitTextFillColor: 'transparent',
            }}
          >
            Monitoria de Qualidade
          </h2>
          <p className="text-xs mt-0.5" style={{ color: 'var(--text-muted)' }}>
            {monitoriasMes.length} registro{monitoriasMes.length !== 1 ? 's' : ''} em {filtroMes}
          </p>
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
      <div>
        <p className="text-[10px] font-bold uppercase mb-3" style={{ color: 'var(--text-muted)', letterSpacing: '0.10em' }}>
          Progresso — {filtroMes}
        </p>
        <div className="grid grid-cols-3 sm:grid-cols-4 lg:grid-cols-6 gap-3">
          {operadores.map((op) => {
            const count = monitoriasMes.filter((m) => m.colaborador === op.nome).length
            return <ProgressCard key={op.id} nome={op.nome} count={count} meta={metaMonitorias} />
          })}
        </div>
      </div>

      {/* ── Filtros ── */}
      <div className="flex flex-wrap gap-3">
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
      <div className="rounded-2xl border overflow-hidden" style={{ borderColor: 'rgba(255,255,255,0.06)' }}>
        <div className="overflow-x-auto">
          <table className="w-full text-sm min-w-[700px]">
            <thead>
              <tr style={{ background: 'rgba(255,255,255,0.02)', borderBottom: '1px solid rgba(255,255,255,0.06)' }}>
                {['Status', 'Colaborador', 'Contrato', 'Data', 'Sinalização', 'Anexo', 'Forms', 'Ações'].map((col) => (
                  <th
                    key={col}
                    className="text-left px-4 py-3 text-xs font-semibold uppercase"
                    style={{ color: 'var(--text-muted)', letterSpacing: '0.07em', whiteSpace: 'nowrap' }}
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
                      onMouseEnter={(e) => { (e.currentTarget as HTMLElement).style.background = 'rgba(255,255,255,0.015)' }}
                      onMouseLeave={(e) => { (e.currentTarget as HTMLElement).style.background = '' }}
                    >
                      {/* Status */}
                      <td className="px-4 py-3 whitespace-nowrap">
                        <span
                          className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-semibold"
                          style={{ background: si.bg, color: si.color, border: `1px solid ${si.border}` }}
                        >
                          {m.status === 'verde'
                            ? <Check size={10} />
                            : m.status === 'amarelo'
                            ? <Clock size={10} />
                            : <AlertTriangle size={10} />}
                          {si.label}
                        </span>
                      </td>

                      {/* Colaborador */}
                      <td className="px-4 py-3 font-medium" style={{ color: 'var(--text-primary)' }}>
                        {m.colaborador || '—'}
                      </td>

                      {/* Contrato */}
                      <td className="px-4 py-3" style={{ color: 'var(--text-secondary)' }}>
                        {m.contratoCliente || '—'}
                      </td>

                      {/* Data */}
                      <td className="px-4 py-3 whitespace-nowrap text-xs" style={{ color: 'var(--text-muted)' }}>
                        {m.dataAtendimento || '—'}
                      </td>

                      {/* Sinalização */}
                      <td className="px-4 py-3" style={{ maxWidth: 200 }}>
                        <span
                          className="block truncate text-xs"
                          title={m.sinalizacao || undefined}
                          style={{ color: 'var(--text-muted)' }}
                        >
                          {m.sinalizacao || '—'}
                        </span>
                      </td>

                      {/* Anexo */}
                      <td className="px-4 py-3">
                        {m.anexo ? (
                          <a
                            href={m.anexo}
                            target="_blank"
                            rel="noopener noreferrer"
                            title="Abrir anexo"
                            className="inline-flex items-center justify-center w-6 h-6 rounded-full transition-colors"
                            style={{
                              background: 'rgba(201,168,76,0.12)',
                              color: 'var(--gold-light)',
                              border: '1px solid rgba(201,168,76,0.20)',
                              fontSize: '0.55rem',
                              lineHeight: 1,
                            }}
                            onMouseEnter={(e) => {
                              const el = e.currentTarget as HTMLElement
                              el.style.background = 'rgba(201,168,76,0.22)'
                              el.style.borderColor = 'rgba(201,168,76,0.50)'
                            }}
                            onMouseLeave={(e) => {
                              const el = e.currentTarget as HTMLElement
                              el.style.background = 'rgba(201,168,76,0.12)'
                              el.style.borderColor = 'rgba(201,168,76,0.20)'
                            }}
                          >
                            ▶
                          </a>
                        ) : (
                          <span style={{ color: 'var(--text-muted)' }}>—</span>
                        )}
                      </td>

                      {/* Enviado Forms */}
                      <td className="px-4 py-3 whitespace-nowrap text-xs">
                        <span style={{ color: m.enviadoForms?.toLowerCase() === 'sim' ? '#4ade80' : 'var(--text-muted)' }}>
                          {m.enviadoForms || '—'}
                        </span>
                      </td>

                      {/* Ações */}
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
        onSalvo={async () => {
          setNovaAberta(false)
          router.refresh()
        }}
      />

      {editando && (
        <EditarMonitoriaModal
          monitoria={editando}
          operadores={operadores}
          onFechar={() => setEditando(null)}
          onSalvo={async () => {
            setEditando(null)
            router.refresh()
          }}
        />
      )}
    </div>
  )
}
