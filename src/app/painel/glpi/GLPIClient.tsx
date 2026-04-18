'use client'

import { useState, useTransition, useEffect, useCallback, useMemo } from 'react'
import { useRouter } from 'next/navigation'
import type { GLPIItem, GLPIStatus, GLPIEtiqueta, GLPIDados } from '@/lib/glpi'
import { criarGLPIAction, atualizarGLPIAction, finalizarGLPIAction, excluirGLPIAction } from './actions'
import { OPERADORES_DISPLAY } from '@/lib/operadores'
import { Trash2 } from 'lucide-react'

// ── Tipos ─────────────────────────────────────────────────────────────────────

type ModalState =
  | null
  | { mode: 'novo' }
  | { mode: 'editar';    glpi: GLPIItem }
  | { mode: 'finalizar'; glpi: GLPIItem }
  | { mode: 'detalhe';   glpi: GLPIItem }

type FiltroStatus = 'todos' | 'Em Andamento' | 'Finalizado'

// ── Constantes ────────────────────────────────────────────────────────────────

const ETIQUETA_STYLE: Record<GLPIEtiqueta, { bg: string; color: string; border: string; solid: string }> = {
  'Urgente':          { bg: 'rgba(239,68,68,0.1)',   color: '#f87171', border: 'rgba(239,68,68,0.2)',   solid: '#ef4444' },
  'Normal':           { bg: 'rgba(59,130,246,0.1)',  color: '#60a5fa', border: 'rgba(59,130,246,0.2)',  solid: '#3b82f6' },
  'Baixa Prioridade': { bg: 'rgba(234,179,8,0.1)',   color: '#facc15', border: 'rgba(234,179,8,0.2)',   solid: '#eab308' },
}

const RESPONSAVEIS = [
  ...OPERADORES_DISPLAY.map(op => op.nome.split(' ')[0] + ' ' + op.nome.split(' ')[1]),
  'Gestor',
  'Geral',
]

// ── Utilitários de data ───────────────────────────────────────────────────────

function hojeISO(): string {
  return new Date().toISOString().slice(0, 10)
}

function isoParaBR(iso: string): string {
  if (!iso) return ''
  const [y, m, d] = iso.split('-')
  return `${d}/${m}/${y}`
}

function brParaISO(br: string): string {
  if (!br) return ''
  const [d, m, y] = br.split('/')
  return `${y}-${m}-${d}`
}

function mesAtual(): string {
  return new Date().toISOString().slice(0, 7)
}

function dataBRParaMes(br: string): string {
  if (!br || br.length < 10) return ''
  const [, m, y] = br.split('/')
  return `${y}-${m}`
}

// ── Estilos base ──────────────────────────────────────────────────────────────

const inputStyle: React.CSSProperties = {
  width: '100%',
  background: '#0d1117',
  border: '1px solid rgba(255,255,255,0.12)',
  borderRadius: '8px',
  padding: '8px 12px',
  color: '#e2e8f0',
  fontSize: '13px',
  outline: 'none',
}

const labelStyle: React.CSSProperties = {
  display: 'block',
  fontSize: '10px',
  fontWeight: 700,
  textTransform: 'uppercase',
  letterSpacing: '0.10em',
  color: '#64748b',
  marginBottom: '5px',
}

// ── Pill ──────────────────────────────────────────────────────────────────────

function Pill({ label, val, current, set }: { label: string; val: string; current: string; set: (v: string) => void }) {
  const active = current === val
  return (
    <button
      onClick={() => set(val)}
      style={{
        padding: '5px 14px', borderRadius: '99px', fontSize: '11px', fontWeight: 600,
        border: active ? '1px solid rgba(201,168,76,0.5)' : '1px solid rgba(255,255,255,0.08)',
        background: active ? 'rgba(201,168,76,0.12)' : 'transparent',
        color: active ? '#e8c96d' : '#64748b',
        cursor: 'pointer', whiteSpace: 'nowrap',
      }}
    >
      {label}
    </button>
  )
}

// ── SectionHeader ─────────────────────────────────────────────────────────────

function SectionHeader({ title, count, color }: { title: string; count: number; color: string }) {
  return (
    <div style={{ display: 'flex', alignItems: 'center', gap: '10px', marginBottom: '12px' }}>
      <div style={{ width: '3px', height: '14px', borderRadius: '2px', background: color, flexShrink: 0 }} />
      <span style={{ fontSize: '11px', fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.10em', color: '#94a3b8' }}>
        {title}
      </span>
      <span style={{ fontSize: '11px', fontWeight: 700, color, fontVariantNumeric: 'tabular-nums' }}>
        ({count})
      </span>
      <div style={{ flex: 1, height: '1px', background: 'linear-gradient(90deg, rgba(255,255,255,0.06) 0%, transparent 100%)' }} />
    </div>
  )
}

// ── Modal overlay ─────────────────────────────────────────────────────────────

function ModalOverlay({ children, onClose, wide }: { children: React.ReactNode; onClose: () => void; wide?: boolean }) {
  useEffect(() => {
    function handler(e: KeyboardEvent) { if (e.key === 'Escape') onClose() }
    document.addEventListener('keydown', handler)
    return () => document.removeEventListener('keydown', handler)
  }, [onClose])

  return (
    <div
      style={{
        position: 'fixed', inset: 0, zIndex: 1000,
        background: 'rgba(0,0,0,0.75)',
        backdropFilter: 'blur(4px)',
        display: 'flex', alignItems: 'center', justifyContent: 'center',
        padding: '16px',
      }}
      onClick={onClose}
    >
      <div
        onClick={e => e.stopPropagation()}
        style={{ width: '100%', maxWidth: wide ? '700px' : '560px', maxHeight: '90vh', overflowY: 'auto' }}
      >
        {children}
      </div>
    </div>
  )
}

function ModalCard({ title, onClose, children }: { title: string; onClose: () => void; children: React.ReactNode }) {
  return (
    <div style={{
      background: '#0d1117',
      border: '1px solid rgba(201,168,76,0.2)',
      borderRadius: '16px',
      overflow: 'hidden',
    }}>
      <div style={{
        padding: '16px 20px',
        borderBottom: '1px solid rgba(201,168,76,0.10)',
        display: 'flex', alignItems: 'center', justifyContent: 'space-between',
      }}>
        <span style={{
          fontFamily: 'var(--ff-display)',
          fontSize: '14px', fontWeight: 700,
          textTransform: 'uppercase', letterSpacing: '0.06em',
          background: 'linear-gradient(135deg, #e8c96d 0%, #c9a84c 100%)',
          WebkitBackgroundClip: 'text', WebkitTextFillColor: 'transparent', backgroundClip: 'text',
        }}>
          {title}
        </span>
        <button onClick={onClose} style={{ color: '#64748b', background: 'none', border: 'none', cursor: 'pointer', fontSize: '18px', lineHeight: 1 }}>
          ×
        </button>
      </div>
      <div style={{ padding: '20px' }}>
        {children}
      </div>
    </div>
  )
}

// ── Modal Novo / Editar ───────────────────────────────────────────────────────
// Estado 100% local — keystrokes não propagam ao GLPIClient

function ModalNovoEditar({
  glpi,
  filasExistentes,
  onClose,
  onSaved,
}: {
  glpi?: GLPIItem
  filasExistentes: string[]
  onClose: () => void
  onSaved: (dados: GLPIDados, rowIndex?: number) => void
}) {
  const [pending, startTransition] = useTransition()
  const [responsavel, setResponsavel] = useState(glpi?.responsavel ?? '')
  const [fila,        setFila]        = useState(glpi?.fila ?? '')
  const [codigo,      setCodigo]      = useState(glpi?.codigoGLPI ?? '')
  const [descricao,   setDescricao]   = useState(glpi?.descricao ?? '')
  const [dataAb,      setDataAb]      = useState(glpi ? brParaISO(glpi.dataAbertura) : hojeISO())
  const [etiqueta,    setEtiqueta]    = useState<GLPIEtiqueta>(glpi?.etiqueta ?? 'Normal')
  const [erro,        setErro]        = useState('')

  function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    if (!responsavel || !descricao) { setErro('Preencha os campos obrigatórios.'); return }
    const dados: GLPIDados = {
      responsavel, fila, codigoGLPI: codigo, descricao,
      dataAbertura: isoParaBR(dataAb), etiqueta,
      status: glpi?.status ?? 'Em Andamento',
      resposta: glpi?.resposta,
      emailRespondente: glpi?.emailRespondente,
      dataResolucao: glpi?.dataResolucao,
    }
    startTransition(async () => {
      const res = glpi
        ? await atualizarGLPIAction(glpi.rowIndex, dados)
        : await criarGLPIAction(dados)
      if (!res.ok) { setErro(res.erro ?? 'Erro'); return }
      onSaved(dados, glpi?.rowIndex)
    })
  }

  return (
    <ModalOverlay onClose={onClose}>
      <ModalCard title={glpi ? 'Editar GLPI' : 'Novo GLPI'} onClose={onClose}>
        <form onSubmit={handleSubmit} style={{ display: 'flex', flexDirection: 'column', gap: '14px' }}>

          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '14px' }}>
            <div>
              <label style={labelStyle}>Responsável *</label>
              <select value={responsavel} onChange={e => setResponsavel(e.target.value)} style={inputStyle} required>
                <option value="">Selecionar...</option>
                {RESPONSAVEIS.map(r => <option key={r} value={r}>{r}</option>)}
              </select>
            </div>
            <div>
              <label style={labelStyle}>Etiqueta</label>
              <select value={etiqueta} onChange={e => setEtiqueta(e.target.value as GLPIEtiqueta)} style={inputStyle}>
                <option value="Normal">Normal</option>
                <option value="Urgente">Urgente</option>
                <option value="Baixa Prioridade">Baixa Prioridade</option>
              </select>
            </div>
          </div>

          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '14px' }}>
            <div>
              <label style={labelStyle}>Fila</label>
              <input
                value={fila}
                onChange={e => setFila(e.target.value)}
                list="glpi-filas-list"
                placeholder="Nome da fila..."
                style={inputStyle}
              />
              <datalist id="glpi-filas-list">
                {filasExistentes.map(f => <option key={f} value={f} />)}
              </datalist>
            </div>
            <div>
              <label style={labelStyle}>Código GLPI</label>
              <input
                value={codigo}
                onChange={e => setCodigo(e.target.value)}
                placeholder="Ex: 12345"
                style={inputStyle}
              />
            </div>
          </div>

          <div>
            <label style={labelStyle}>Descrição *</label>
            <textarea
              value={descricao}
              onChange={e => setDescricao(e.target.value)}
              rows={4}
              placeholder="Descreva o problema ou solicitação..."
              style={{ ...inputStyle, resize: 'vertical', minHeight: '80px' }}
              required
            />
          </div>

          <div style={{ maxWidth: '200px' }}>
            <label style={labelStyle}>Data Abertura</label>
            <input type="date" value={dataAb} onChange={e => setDataAb(e.target.value)} style={inputStyle} />
          </div>

          {erro && (
            <p style={{ fontSize: '12px', color: '#f87171', background: 'rgba(239,68,68,0.08)', border: '1px solid rgba(239,68,68,0.2)', borderRadius: '8px', padding: '8px 12px' }}>
              {erro}
            </p>
          )}

          <div style={{ display: 'flex', gap: '10px', justifyContent: 'flex-end', marginTop: '4px' }}>
            <button type="button" onClick={onClose} style={{ padding: '8px 18px', borderRadius: '8px', border: '1px solid rgba(255,255,255,0.10)', background: 'transparent', color: '#64748b', fontSize: '12px', fontWeight: 600, cursor: 'pointer' }}>
              Cancelar
            </button>
            <button type="submit" disabled={pending} style={{ padding: '8px 18px', borderRadius: '8px', border: '1px solid rgba(201,168,76,0.4)', background: 'rgba(201,168,76,0.12)', color: '#e8c96d', fontSize: '12px', fontWeight: 600, cursor: pending ? 'wait' : 'pointer', opacity: pending ? 0.7 : 1 }}>
              {pending ? 'Salvando...' : glpi ? 'Salvar alterações' : 'Criar GLPI'}
            </button>
          </div>
        </form>
      </ModalCard>
    </ModalOverlay>
  )
}

// ── Modal Finalizar ───────────────────────────────────────────────────────────

function ModalFinalizar({
  glpi,
  onClose,
  onFinalized,
}: {
  glpi: GLPIItem
  onClose: () => void
  onFinalized: (rowIndex: number, resposta: string, email: string, dataRes: string) => void
}) {
  const [pending, startTransition] = useTransition()
  const [resposta, setResposta] = useState(glpi.resposta)
  const [email,    setEmail]    = useState(glpi.emailRespondente)
  const [dataRes,  setDataRes]  = useState(glpi.dataResolucao ? brParaISO(glpi.dataResolucao) : hojeISO())
  const [erro,     setErro]     = useState('')

  function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    if (!resposta) { setErro('A resposta é obrigatória.'); return }
    startTransition(async () => {
      const res = await finalizarGLPIAction(glpi.rowIndex, resposta, email, isoParaBR(dataRes))
      if (!res.ok) { setErro(res.erro ?? 'Erro'); return }
      onFinalized(glpi.rowIndex, resposta, email, isoParaBR(dataRes))
    })
  }

  const etStyle = ETIQUETA_STYLE[glpi.etiqueta]

  return (
    <ModalOverlay onClose={onClose}>
      <ModalCard title="Finalizar GLPI" onClose={onClose}>
        <div style={{ background: '#07080f', border: '1px solid rgba(255,255,255,0.06)', borderRadius: '10px', padding: '12px 14px', marginBottom: '18px', display: 'flex', flexDirection: 'column', gap: '6px' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '8px', flexWrap: 'wrap' }}>
            <span style={{ fontSize: '13px', fontWeight: 700, color: '#e8c96d', fontFamily: 'monospace' }}>{glpi.id}</span>
            <span style={{ fontSize: '9px', fontWeight: 700, padding: '2px 8px', borderRadius: '99px', background: etStyle.bg, color: etStyle.color, border: `1px solid ${etStyle.border}` }}>{glpi.etiqueta}</span>
            <span style={{ fontSize: '10px', color: '#64748b' }}>{glpi.dataAbertura}</span>
          </div>
          {glpi.fila && <span style={{ fontSize: '11px', color: '#94a3b8' }}>Fila: <strong style={{ color: '#cbd5e1' }}>{glpi.fila}</strong></span>}
          {glpi.codigoGLPI && <span style={{ fontSize: '11px', color: '#94a3b8', fontFamily: 'monospace' }}>#{glpi.codigoGLPI}</span>}
          <p style={{ fontSize: '12px', color: '#94a3b8', marginTop: '2px', lineHeight: 1.5 }}>{glpi.descricao}</p>
        </div>

        <form onSubmit={handleSubmit} style={{ display: 'flex', flexDirection: 'column', gap: '14px' }}>
          <div>
            <label style={labelStyle}>Resposta *</label>
            <textarea
              value={resposta}
              onChange={e => setResposta(e.target.value)}
              rows={5}
              placeholder="Cole aqui a resposta do chamado..."
              style={{ ...inputStyle, resize: 'vertical', minHeight: '100px' }}
              required
            />
          </div>

          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '14px' }}>
            <div>
              <label style={labelStyle}>Nome Respondente</label>
              <input type="text" value={email} onChange={e => setEmail(e.target.value)} placeholder="Nome de quem respondeu..." style={inputStyle} />
            </div>
            <div>
              <label style={labelStyle}>Data Resolução</label>
              <input type="date" value={dataRes} onChange={e => setDataRes(e.target.value)} style={inputStyle} />
            </div>
          </div>

          {erro && (
            <p style={{ fontSize: '12px', color: '#f87171', background: 'rgba(239,68,68,0.08)', border: '1px solid rgba(239,68,68,0.2)', borderRadius: '8px', padding: '8px 12px' }}>
              {erro}
            </p>
          )}

          <div style={{ display: 'flex', gap: '10px', justifyContent: 'flex-end', marginTop: '4px' }}>
            <button type="button" onClick={onClose} style={{ padding: '8px 18px', borderRadius: '8px', border: '1px solid rgba(255,255,255,0.10)', background: 'transparent', color: '#64748b', fontSize: '12px', fontWeight: 600, cursor: 'pointer' }}>
              Cancelar
            </button>
            <button type="submit" disabled={pending} style={{ padding: '8px 18px', borderRadius: '8px', border: '1px solid rgba(34,197,94,0.4)', background: 'rgba(34,197,94,0.12)', color: '#4ade80', fontSize: '12px', fontWeight: 600, cursor: pending ? 'wait' : 'pointer', opacity: pending ? 0.7 : 1 }}>
              {pending ? 'Finalizando...' : 'Marcar como Finalizado'}
            </button>
          </div>
        </form>
      </ModalCard>
    </ModalOverlay>
  )
}

// ── Modal Detalhe (finalizados) ───────────────────────────────────────────────

function ModalDetalhe({ glpi, onClose, onExcluir }: { glpi: GLPIItem; onClose: () => void; onExcluir: (g: GLPIItem) => void }) {
  const etStyle = ETIQUETA_STYLE[glpi.etiqueta]

  function Field({ label, value }: { label: string; value: string }) {
    if (!value) return null
    return (
      <div>
        <p style={{ fontSize: '9px', fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.10em', color: '#475569', marginBottom: '4px' }}>{label}</p>
        <p style={{ fontSize: '13px', color: '#cbd5e1', lineHeight: 1.6 }}>{value}</p>
      </div>
    )
  }

  return (
    <ModalOverlay onClose={onClose} wide>
      <ModalCard title="Detalhes do Chamado" onClose={onClose}>
        {/* Header */}
        <div style={{ display: 'flex', alignItems: 'center', gap: '10px', flexWrap: 'wrap', marginBottom: '20px' }}>
          <span style={{ fontSize: '16px', fontWeight: 700, color: '#e8c96d', fontFamily: 'monospace' }}>{glpi.id}</span>
          <span style={{ fontSize: '10px', fontWeight: 700, padding: '3px 10px', borderRadius: '99px', background: etStyle.bg, color: etStyle.color, border: `1px solid ${etStyle.border}`, textTransform: 'uppercase', letterSpacing: '0.06em' }}>
            {glpi.etiqueta}
          </span>
          <span style={{ fontSize: '10px', padding: '3px 10px', borderRadius: '99px', background: 'rgba(34,197,94,0.10)', border: '1px solid rgba(34,197,94,0.25)', color: '#4ade80', fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.06em' }}>
            Finalizado
          </span>
          <span style={{ fontSize: '11px', color: '#475569', marginLeft: 'auto' }}>Aberto em {glpi.dataAbertura}</span>
        </div>

        {/* Seção Chamado */}
        <div style={{ background: '#07080f', border: '1px solid rgba(255,255,255,0.06)', borderRadius: '12px', padding: '16px 18px', marginBottom: '14px' }}>
          <p style={{ fontSize: '9px', fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.12em', color: '#c9a84c', marginBottom: '14px' }}>Chamado</p>
          <div style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '12px' }}>
              <Field label="Responsável" value={glpi.responsavel} />
              <Field label="Fila" value={glpi.fila} />
            </div>
            <Field label="Código GLPI" value={glpi.codigoGLPI ? `#${glpi.codigoGLPI}` : ''} />
            <Field label="Descrição" value={glpi.descricao} />
          </div>
        </div>

        {/* Seção Resolução */}
        <div style={{ background: '#07080f', border: '1px solid rgba(34,197,94,0.12)', borderRadius: '12px', padding: '16px 18px', marginBottom: '20px' }}>
          <p style={{ fontSize: '9px', fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.12em', color: '#22c55e', marginBottom: '14px' }}>Resolução</p>
          <div style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
            <Field label="Resposta" value={glpi.resposta} />
            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '12px' }}>
              <Field label="Nome Respondente" value={glpi.emailRespondente} />
              <Field label="Data Resolução" value={glpi.dataResolucao} />
            </div>
          </div>
        </div>

        {/* Footer */}
        <div style={{ display: 'flex', gap: '10px', justifyContent: 'flex-end' }}>
          <button
            onClick={() => { onExcluir(glpi); onClose() }}
            style={{ display: 'flex', alignItems: 'center', gap: '6px', padding: '8px 14px', borderRadius: '8px', border: '1px solid rgba(239,68,68,0.3)', background: 'rgba(239,68,68,0.06)', color: '#f87171', fontSize: '12px', fontWeight: 600, cursor: 'pointer' }}
          >
            <Trash2 size={13} /> Excluir
          </button>
          <button
            onClick={onClose}
            style={{ padding: '8px 18px', borderRadius: '8px', border: '1px solid rgba(255,255,255,0.10)', background: 'transparent', color: '#cbd5e1', fontSize: '12px', fontWeight: 600, cursor: 'pointer' }}
          >
            Fechar
          </button>
        </div>
      </ModalCard>
    </ModalOverlay>
  )
}

// ── Card GLPI ─────────────────────────────────────────────────────────────────

function GLPICard({
  glpi,
  onEditar,
  onFinalizar,
  onExcluir,
  onVerDetalhes,
}: {
  glpi: GLPIItem
  onEditar: (g: GLPIItem) => void
  onFinalizar: (g: GLPIItem) => void
  onExcluir: (g: GLPIItem) => void
  onVerDetalhes: (g: GLPIItem) => void
}) {
  const isAndamento = glpi.status === 'Em Andamento'
  const etStyle     = ETIQUETA_STYLE[glpi.etiqueta]
  const borderColor = etStyle.solid

  return (
    <div
      onClick={!isAndamento ? () => onVerDetalhes(glpi) : undefined}
      style={{
        background: '#0d0d1a',
        border: '1px solid rgba(255,255,255,0.06)',
        borderLeft: `3px solid ${borderColor}`,
        borderRadius: '12px',
        padding: '14px 16px',
        display: 'flex',
        flexDirection: 'column',
        gap: '8px',
        opacity: isAndamento ? 1 : 0.85,
        cursor: !isAndamento ? 'pointer' : 'default',
        transition: !isAndamento ? 'opacity 0.15s' : undefined,
      }}
      onMouseEnter={!isAndamento ? e => { (e.currentTarget as HTMLElement).style.opacity = '1' } : undefined}
      onMouseLeave={!isAndamento ? e => { (e.currentTarget as HTMLElement).style.opacity = '0.85' } : undefined}
    >
      {/* Header */}
      <div style={{ display: 'flex', alignItems: 'center', gap: '8px', flexWrap: 'wrap', justifyContent: 'space-between' }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: '8px', flexWrap: 'wrap' }}>
          <span style={{ fontSize: '13px', fontWeight: 700, color: '#e8c96d', fontFamily: 'monospace' }}>{glpi.id}</span>
          <span style={{ fontSize: '9px', fontWeight: 700, padding: '2px 8px', borderRadius: '99px', background: etStyle.bg, color: etStyle.color, border: `1px solid ${etStyle.border}`, textTransform: 'uppercase', letterSpacing: '0.06em' }}>
            {glpi.etiqueta}
          </span>
          {glpi.responsavel && (
            <span style={{ fontSize: '10px', color: '#64748b' }}>
              · <strong style={{ color: '#94a3b8' }}>{glpi.responsavel}</strong>
            </span>
          )}
        </div>
        <span style={{ fontSize: '10px', color: '#475569' }}>{glpi.dataAbertura}</span>
      </div>

      {(glpi.fila || glpi.codigoGLPI) && (
        <div style={{ display: 'flex', gap: '10px', flexWrap: 'wrap', alignItems: 'center' }}>
          {glpi.fila && (
            <span style={{ fontSize: '10px', padding: '2px 8px', borderRadius: '6px', background: 'rgba(255,255,255,0.04)', border: '1px solid rgba(255,255,255,0.08)', color: '#94a3b8' }}>
              {glpi.fila}
            </span>
          )}
          {glpi.codigoGLPI && (
            <span style={{ fontSize: '10px', color: '#64748b', fontFamily: 'monospace' }}>#{glpi.codigoGLPI}</span>
          )}
        </div>
      )}

      <p style={{ fontSize: '12px', color: '#94a3b8', lineHeight: 1.6, display: '-webkit-box', WebkitLineClamp: 2, WebkitBoxOrient: 'vertical', overflow: 'hidden' }}>
        {glpi.descricao}
      </p>

      {/* Resposta truncada (finalizados) */}
      {!isAndamento && glpi.resposta && (
        <div style={{ borderTop: '1px solid rgba(255,255,255,0.04)', paddingTop: '8px' }}>
          <p style={{ fontSize: '10px', fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.08em', color: '#22c55e', marginBottom: '4px' }}>
            Resposta
          </p>
          <p style={{ fontSize: '11px', color: '#64748b', lineHeight: 1.5, display: '-webkit-box', WebkitLineClamp: 2, WebkitBoxOrient: 'vertical', overflow: 'hidden' }}>
            {glpi.resposta}
          </p>
          {glpi.dataResolucao && (
            <span style={{ fontSize: '10px', color: '#475569', marginTop: '4px', display: 'block' }}>Resolvido em {glpi.dataResolucao}</span>
          )}
          <span style={{ fontSize: '10px', color: '#22c55e', marginTop: '4px', display: 'block' }}>Clique para ver detalhes →</span>
        </div>
      )}

      {/* Footer */}
      <div
        onClick={e => e.stopPropagation()}
        style={{ display: 'flex', gap: '8px', marginTop: '2px', alignItems: 'center' }}
      >
        {isAndamento && (
          <>
            <button
              onClick={() => onEditar(glpi)}
              style={{ padding: '5px 12px', borderRadius: '6px', fontSize: '11px', fontWeight: 600, border: '1px solid rgba(255,255,255,0.10)', background: 'transparent', color: '#64748b', cursor: 'pointer' }}
              onMouseEnter={e => { const el = e.currentTarget as HTMLElement; el.style.color = '#cbd5e1'; el.style.borderColor = 'rgba(255,255,255,0.2)' }}
              onMouseLeave={e => { const el = e.currentTarget as HTMLElement; el.style.color = '#64748b'; el.style.borderColor = 'rgba(255,255,255,0.10)' }}
            >
              Editar
            </button>
            <button
              onClick={() => onFinalizar(glpi)}
              style={{ padding: '5px 12px', borderRadius: '6px', fontSize: '11px', fontWeight: 600, border: '1px solid rgba(34,197,94,0.3)', background: 'rgba(34,197,94,0.08)', color: '#4ade80', cursor: 'pointer' }}
              onMouseEnter={e => { (e.currentTarget as HTMLElement).style.background = 'rgba(34,197,94,0.14)' }}
              onMouseLeave={e => { (e.currentTarget as HTMLElement).style.background = 'rgba(34,197,94,0.08)' }}
            >
              Finalizar
            </button>
          </>
        )}
        <button
          onClick={() => onExcluir(glpi)}
          title="Excluir GLPI"
          style={{ marginLeft: 'auto', padding: '5px 8px', borderRadius: '6px', border: '1px solid rgba(239,68,68,0.2)', background: 'transparent', color: '#64748b', cursor: 'pointer', display: 'flex', alignItems: 'center' }}
          onMouseEnter={e => { const el = e.currentTarget as HTMLElement; el.style.color = '#f87171'; el.style.borderColor = 'rgba(239,68,68,0.4)'; el.style.background = 'rgba(239,68,68,0.06)' }}
          onMouseLeave={e => { const el = e.currentTarget as HTMLElement; el.style.color = '#64748b'; el.style.borderColor = 'rgba(239,68,68,0.2)'; el.style.background = 'transparent' }}
        >
          <Trash2 size={12} />
        </button>
      </div>
    </div>
  )
}

// ── Componente principal ──────────────────────────────────────────────────────

export default function GLPIClient({ glpis: inicial }: { glpis: GLPIItem[] }) {
  const router = useRouter()
  const [glpis, setGlpis] = useState<GLPIItem[]>(inicial)
  const [modal, setModal] = useState<ModalState>(null)
  const [filtroStatus, setFiltroStatus] = useState<FiltroStatus>('todos')
  const [filtroResp,   setFiltroResp]   = useState('todos')
  const [filtroEtiq,   setFiltroEtiq]   = useState('todos')

  // Sincroniza quando router.refresh() traz novos dados do servidor
  useEffect(() => { setGlpis(inicial) }, [inicial])

  const filasExistentes = useMemo(() => [...new Set(glpis.map(g => g.fila).filter(Boolean))], [glpis])
  const responsaveis    = useMemo(() => [...new Set(glpis.map(g => g.responsavel).filter(Boolean))], [glpis])
  const mes             = mesAtual()

  const totalAbertos      = useMemo(() => glpis.filter(g => g.status === 'Em Andamento').length, [glpis])
  const emAndamento       = totalAbertos
  const finalizadosMes    = useMemo(() => glpis.filter(g => g.status === 'Finalizado' && dataBRParaMes(g.dataResolucao) === mes).length, [glpis, mes])
  const urgentesPendentes = useMemo(() => glpis.filter(g => g.status === 'Em Andamento' && g.etiqueta === 'Urgente').length, [glpis])

  const filtrados = useMemo(() => glpis.filter(g => {
    if (filtroStatus !== 'todos' && g.status !== filtroStatus) return false
    if (filtroResp   !== 'todos' && g.responsavel !== filtroResp) return false
    if (filtroEtiq   !== 'todos' && g.etiqueta !== filtroEtiq) return false
    return true
  }), [glpis, filtroStatus, filtroResp, filtroEtiq])

  const andamentoFiltrados  = useMemo(() => filtrados.filter(g => g.status === 'Em Andamento'), [filtrados])
  const finalizadoFiltrados = useMemo(() => filtrados.filter(g => g.status === 'Finalizado'),   [filtrados])

  // ── Callbacks estáveis (não recriam em cada render)
  const handleCriado = useCallback((_dados: GLPIDados) => {
    setModal(null)
    router.refresh()
  }, [router])

  const handleEditado = useCallback((dados: GLPIDados, rowIndex?: number) => {
    setModal(null)
    if (rowIndex) {
      setGlpis(prev => prev.map(g =>
        g.rowIndex === rowIndex ? { ...g, ...dados, status: dados.status ?? g.status } : g
      ))
    }
    router.refresh()
  }, [router])

  const handleFinalizado = useCallback((rowIndex: number, resposta: string, email: string, dataRes: string) => {
    setModal(null)
    setGlpis(prev => prev.map(g =>
      g.rowIndex === rowIndex
        ? { ...g, status: 'Finalizado', resposta, emailRespondente: email, dataResolucao: dataRes }
        : g
    ))
    router.refresh()
  }, [router])

  const handleExcluir = useCallback((glpi: GLPIItem) => {
    if (!window.confirm(`Excluir ${glpi.id}? Esta ação não pode ser desfeita.`)) return
    setGlpis(prev => prev.filter(g => g.rowIndex !== glpi.rowIndex))
    excluirGLPIAction(glpi.rowIndex).then(res => {
      if (!res.ok) { setGlpis(inicial); alert(`Erro ao excluir: ${res.erro}`) }
    })
  }, [inicial])

  const handleVerDetalhes = useCallback((glpi: GLPIItem) => {
    setModal({ mode: 'detalhe', glpi })
  }, [])

  return (
    <div className="space-y-5">

      {/* ── Cards resumo ── */}
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(160px, 1fr))', gap: '12px' }}>
        {[
          { label: 'Total Abertos',      valor: totalAbertos,      cor: totalAbertos > 0 ? '#fbbf24' : '#4ade80' },
          { label: 'Em Andamento',       valor: emAndamento,       cor: emAndamento > 0 ? '#fbbf24' : '#4ade80' },
          { label: 'Finalizados no mês', valor: finalizadosMes,    cor: '#4ade80' },
          { label: 'Urgentes pendentes', valor: urgentesPendentes, cor: urgentesPendentes > 0 ? '#f87171' : '#4ade80' },
        ].map(({ label, valor, cor }) => (
          <div key={label} style={{ background: '#0d0d1a', border: '1px solid rgba(255,255,255,0.06)', borderRadius: '12px', padding: '14px 16px' }}>
            <p style={{ fontSize: '9px', fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.12em', color: '#64748b' }}>{label}</p>
            <p style={{ fontSize: '28px', fontWeight: 700, color: cor, marginTop: '4px', lineHeight: 1, fontVariantNumeric: 'tabular-nums' }}>{valor}</p>
          </div>
        ))}
      </div>

      {/* ── Filtros ── */}
      <div style={{ display: 'flex', gap: '8px', flexWrap: 'wrap', alignItems: 'center' }}>
        <Pill label="Todos"        val="todos"        current={filtroStatus} set={v => setFiltroStatus(v as FiltroStatus)} />
        <Pill label="Em Andamento" val="Em Andamento" current={filtroStatus} set={v => setFiltroStatus(v as FiltroStatus)} />
        <Pill label="Finalizados"  val="Finalizado"   current={filtroStatus} set={v => setFiltroStatus(v as FiltroStatus)} />

        <div style={{ width: '1px', height: '20px', background: 'rgba(255,255,255,0.08)', flexShrink: 0, margin: '0 4px' }} />

        <select value={filtroResp} onChange={e => setFiltroResp(e.target.value)}
          style={{ ...inputStyle, width: 'auto', padding: '5px 10px', fontSize: '11px', fontWeight: 600, color: filtroResp !== 'todos' ? '#e8c96d' : '#64748b' }}>
          <option value="todos">Todos os responsáveis</option>
          {responsaveis.map(r => <option key={r} value={r}>{r}</option>)}
        </select>

        <select value={filtroEtiq} onChange={e => setFiltroEtiq(e.target.value)}
          style={{ ...inputStyle, width: 'auto', padding: '5px 10px', fontSize: '11px', fontWeight: 600, color: filtroEtiq !== 'todos' ? '#e8c96d' : '#64748b' }}>
          <option value="todos">Todas as etiquetas</option>
          <option value="Urgente">Urgente</option>
          <option value="Normal">Normal</option>
          <option value="Baixa Prioridade">Baixa Prioridade</option>
        </select>

        <div style={{ flex: 1 }} />

        <button
          onClick={() => setModal({ mode: 'novo' })}
          style={{ padding: '7px 16px', borderRadius: '8px', border: '1px solid rgba(201,168,76,0.4)', background: 'rgba(201,168,76,0.10)', color: '#e8c96d', fontSize: '12px', fontWeight: 700, cursor: 'pointer', whiteSpace: 'nowrap' }}
          onMouseEnter={e => { (e.currentTarget as HTMLElement).style.background = 'rgba(201,168,76,0.18)' }}
          onMouseLeave={e => { (e.currentTarget as HTMLElement).style.background = 'rgba(201,168,76,0.10)' }}
        >
          + Novo GLPI
        </button>
      </div>

      {/* ── Seção Em Andamento ── */}
      {(filtroStatus === 'todos' || filtroStatus === 'Em Andamento') && (
        <div>
          <SectionHeader title="Em Andamento" count={andamentoFiltrados.length} color="#f59e0b" />
          {andamentoFiltrados.length === 0 ? (
            <p style={{ fontSize: '13px', color: '#475569', padding: '16px 0' }}>Nenhum GLPI em andamento.</p>
          ) : (
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(300px, 1fr))', gap: '12px' }}>
              {andamentoFiltrados.map(g => (
                <GLPICard key={g.rowIndex} glpi={g}
                  onEditar={g => setModal({ mode: 'editar', glpi: g })}
                  onFinalizar={g => setModal({ mode: 'finalizar', glpi: g })}
                  onExcluir={handleExcluir}
                  onVerDetalhes={handleVerDetalhes}
                />
              ))}
            </div>
          )}
        </div>
      )}

      {/* ── Seção Finalizados ── */}
      {(filtroStatus === 'todos' || filtroStatus === 'Finalizado') && finalizadoFiltrados.length > 0 && (
        <div>
          <SectionHeader title="Finalizados" count={finalizadoFiltrados.length} color="#22c55e" />
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(300px, 1fr))', gap: '12px' }}>
            {finalizadoFiltrados.map(g => (
              <GLPICard key={g.rowIndex} glpi={g}
                onEditar={g => setModal({ mode: 'editar', glpi: g })}
                onFinalizar={g => setModal({ mode: 'finalizar', glpi: g })}
                onExcluir={handleExcluir}
                onVerDetalhes={handleVerDetalhes}
              />
            ))}
          </div>
        </div>
      )}

      {filtrados.length === 0 && (
        <p style={{ fontSize: '13px', color: '#475569', padding: '24px 0', textAlign: 'center' }}>
          Nenhum GLPI encontrado com os filtros selecionados.
        </p>
      )}

      {/* ── Modais ── */}
      {modal?.mode === 'novo' && (
        <ModalNovoEditar filasExistentes={filasExistentes} onClose={() => setModal(null)} onSaved={handleCriado} />
      )}
      {modal?.mode === 'editar' && (
        <ModalNovoEditar glpi={modal.glpi} filasExistentes={filasExistentes} onClose={() => setModal(null)} onSaved={handleEditado} />
      )}
      {modal?.mode === 'finalizar' && (
        <ModalFinalizar glpi={modal.glpi} onClose={() => setModal(null)} onFinalized={handleFinalizado} />
      )}
      {modal?.mode === 'detalhe' && (
        <ModalDetalhe glpi={modal.glpi} onClose={() => setModal(null)} onExcluir={handleExcluir} />
      )}
    </div>
  )
}
