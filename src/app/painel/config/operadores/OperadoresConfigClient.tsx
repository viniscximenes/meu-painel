'use client'

import { useState, useTransition } from 'react'
import { Eye, EyeOff, Save, UserX, UserCheck, UserPlus, X, ShieldCheck } from 'lucide-react'
import type { UserRole } from '@/types'
import { PainelSectionTitle } from '@/components/painel/PainelSectionTitle'
import {
  redefinirSenhaOperadorAction,
  inativarUsuarioAction,
  reativarUsuarioAction,
  cadastrarOperadorAction,
  alterarRoleAction,
} from './actions'

const FF_SYNE = 'var(--ff-syne)'
const FF_DM   = 'var(--ff-body)'

export type UsuarioInfo = {
  id: string
  nome: string
  username: string
  email: string
  role: UserRole
  operador_id: number | null
  ativo: boolean
  senha_atual: string | null
}

type Toast = { tipo: 'ok' | 'erro'; msg: string } | null

const ROLE_PRIORITY: Record<UserRole, number> = { admin: 0, gestor: 1, aux: 2, operador: 3 }

const INPUT_STYLE: React.CSSProperties = {
  background: '#03040C',
  border: '1px solid rgba(114,112,143,0.5)',
  borderRadius: '8px',
  color: '#A6A2A2',
  fontFamily: FF_DM,
  fontWeight: 500,
  fontSize: '13px',
  fontVariantNumeric: 'tabular-nums',
  padding: '7px 10px',
  outline: 'none',
}

// #2 — cores corrigidas: GESTOR=dourado, ADMIN=vermelho
const ROLE_STYLE: Record<UserRole, { bg: string; color: string; border: string }> = {
  gestor:   { bg: 'rgba(244,212,124,0.10)', color: '#e8c96d',             border: 'rgba(244,212,124,0.30)' },
  admin:    { bg: 'rgba(227,57,57,0.10)',   color: 'rgba(227,57,57,0.95)', border: 'rgba(227,57,57,0.30)'  },
  aux:      { bg: 'rgba(123,163,217,0.10)', color: '#7ba3d9',             border: 'rgba(123,163,217,0.25)' },
  operador: { bg: 'rgba(166,162,162,0.08)', color: '#A6A2A2',             border: 'rgba(166,162,162,0.20)' },
}

// #4 — centralização perfeita dentro das pills
const PILL_BASE: React.CSSProperties = {
  fontFamily: FF_SYNE,
  fontSize: '9px',
  fontWeight: 600,
  textTransform: 'uppercase',
  letterSpacing: '0.06em',
  padding: '4px 10px',
  borderRadius: '4px',
  display: 'inline-flex',
  alignItems: 'center',
  justifyContent: 'center',
  lineHeight: 1,
}

function RolePill({ role }: { role: UserRole }) {
  const s = ROLE_STYLE[role] ?? ROLE_STYLE.operador
  return (
    <span style={{ ...PILL_BASE, background: s.bg, color: s.color, border: `1px solid ${s.border}` }}>
      {role}
    </span>
  )
}

function StatusPill({ ativo }: { ativo: boolean }) {
  return (
    <span style={{
      ...PILL_BASE,
      background: ativo ? 'rgba(106,196,73,0.15)' : 'rgba(239,68,68,0.08)',
      color:      ativo ? 'rgba(106,196,73,0.95)' : '#f87171',
      border:     `1px solid ${ativo ? 'rgba(106,196,73,0.3)' : 'rgba(239,68,68,0.3)'}`,
    }}>
      {ativo ? 'ATIVO' : 'INATIVO'}
    </span>
  )
}

// #3 — estilo base dos botões de ação (Syne, uppercase, cantos arredondados)
const BTN_ACAO: React.CSSProperties = {
  fontFamily: FF_SYNE,
  fontSize: '11px',
  fontWeight: 600,
  textTransform: 'uppercase',
  letterSpacing: '0.06em',
  padding: '8px 14px',
  borderRadius: '8px',
  cursor: 'pointer',
  display: 'inline-flex',
  alignItems: 'center',
  gap: '4px',
}

function UsuarioCard({ usuario, onToast }: { usuario: UsuarioInfo; onToast: (t: Toast) => void }) {
  const [senhaVisivel, setSenhaVisivel] = useState(false)
  const [editandoSenha, setEditandoSenha] = useState(false)
  const [novaSenha, setNovaSenha] = useState('')
  const [confirmando, setConfirmando] = useState(false)
  const [isPending, startTransition] = useTransition()

  function handleSalvarSenha() {
    startTransition(async () => {
      const res = await redefinirSenhaOperadorAction(usuario.id, usuario.username, novaSenha)
      if (res.ok) {
        onToast({ tipo: 'ok', msg: 'Senha redefinida' })
        setEditandoSenha(false)
        setNovaSenha('')
      } else {
        onToast({ tipo: 'erro', msg: res.erro ?? 'Erro ao redefinir senha' })
      }
    })
  }

  function handleToggleAtivo() {
    if (usuario.ativo && !confirmando) { setConfirmando(true); return }
    setConfirmando(false)
    startTransition(async () => {
      const res = usuario.ativo
        ? await inativarUsuarioAction(usuario.id)
        : await reativarUsuarioAction(usuario.id)
      if (res.ok) onToast({ tipo: 'ok', msg: usuario.ativo ? 'Usuário inativado' : 'Usuário reativado' })
      else onToast({ tipo: 'erro', msg: res.erro ?? 'Erro' })
    })
  }

  return (
    <div style={{
      background: '#070714',
      border: `1px solid ${usuario.ativo ? 'rgba(244,212,124,0.10)' : 'rgba(239,68,68,0.08)'}`,
      borderRadius: '10px',
      padding: '16px 20px',
      display: 'flex', flexDirection: 'column', gap: '12px',
    }}>
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: '12px', flexWrap: 'wrap' }}>
        {/* Identidade */}
        <div style={{ display: 'flex', alignItems: 'center', gap: '10px', flexWrap: 'wrap' }}>
          <span style={{
            fontFamily: FF_SYNE, fontWeight: 600, fontSize: '14px',
            textTransform: 'uppercase', letterSpacing: '0.04em', color: '#A6A2A2',
          }}>
            {usuario.username}
          </span>
          <RolePill role={usuario.role} />
          <StatusPill ativo={usuario.ativo} />
        </div>

        {/* Ações */}
        <div style={{ display: 'flex', alignItems: 'center', gap: '8px', flexWrap: 'wrap' }}>
          {usuario.senha_atual && !editandoSenha && (
            <div style={{ display: 'inline-flex', alignItems: 'center', gap: '6px' }}>
              <span style={{ fontFamily: FF_DM, fontSize: '13px', color: '#474658', fontVariantNumeric: 'tabular-nums' }}>
                {senhaVisivel ? usuario.senha_atual : '••••••••'}
              </span>
              <button
                type="button"
                onClick={() => setSenhaVisivel(v => !v)}
                style={{ background: 'transparent', border: 'none', cursor: 'pointer', color: '#72708F', padding: '2px', display: 'flex' }}
              >
                {senhaVisivel ? <EyeOff size={13} /> : <Eye size={13} />}
              </button>
            </div>
          )}

          {/* #3 — "REDEFINIR SENHA" Syne uppercase */}
          {!editandoSenha && (
            <button
              type="button"
              onClick={() => setEditandoSenha(true)}
              style={{
                ...BTN_ACAO,
                background: 'transparent',
                border: '1px solid rgba(114,112,143,0.3)',
                color: '#72708F',
              }}
            >
              Redefinir senha
            </button>
          )}

          {confirmando ? (
            <div style={{ display: 'inline-flex', alignItems: 'center', gap: '6px' }}>
              <span style={{ fontFamily: FF_SYNE, fontSize: '11px', fontWeight: 600, color: '#f87171', textTransform: 'uppercase', letterSpacing: '0.06em' }}>
                Confirmar?
              </span>
              <button
                type="button"
                onClick={handleToggleAtivo}
                disabled={isPending}
                style={{
                  ...BTN_ACAO,
                  background: 'rgba(239,68,68,0.12)',
                  border: '1px solid rgba(239,68,68,0.3)',
                  color: '#f87171',
                }}
              >
                Sim
              </button>
              <button
                type="button"
                onClick={() => setConfirmando(false)}
                style={{ background: 'transparent', border: 'none', cursor: 'pointer', color: '#72708F', padding: '2px', display: 'flex' }}
              >
                <X size={13} />
              </button>
            </div>
          ) : (
            /* #3 — "INATIVAR"/"REATIVAR" Syne uppercase */
            <button
              type="button"
              onClick={handleToggleAtivo}
              disabled={isPending}
              style={{
                ...BTN_ACAO,
                background: usuario.ativo ? 'rgba(239,68,68,0.06)' : 'rgba(74,222,128,0.06)',
                border: `1px solid ${usuario.ativo ? 'rgba(239,68,68,0.2)' : 'rgba(74,222,128,0.2)'}`,
                color: usuario.ativo ? 'rgba(248,113,113,0.8)' : 'rgba(74,222,128,0.8)',
              }}
            >
              {usuario.ativo ? <UserX size={11} /> : <UserCheck size={11} />}
              {usuario.ativo ? 'Inativar' : 'Reativar'}
            </button>
          )}
        </div>
      </div>

      {editandoSenha && (
        <div style={{ display: 'flex', gap: '8px', alignItems: 'center', flexWrap: 'wrap' }}>
          <input
            type="text"
            placeholder="Nova senha (mín. 6 caracteres)"
            value={novaSenha}
            onChange={e => setNovaSenha(e.target.value)}
            disabled={isPending}
            style={{ ...INPUT_STYLE, width: '260px' }}
          />
          <button
            type="button"
            onClick={handleSalvarSenha}
            disabled={isPending || !novaSenha}
            className="btn-primary"
            style={{ display: 'inline-flex', alignItems: 'center', gap: '6px', padding: '7px 14px', fontSize: '12px', fontFamily: FF_SYNE, fontWeight: 700 }}
          >
            <Save size={13} />
            SALVAR
          </button>
          <button
            type="button"
            onClick={() => { setEditandoSenha(false); setNovaSenha('') }}
            style={{
              ...BTN_ACAO,
              background: 'transparent',
              border: '1px solid rgba(114,112,143,0.3)',
              color: '#72708F',
            }}
          >
            <X size={12} /> Cancelar
          </button>
        </div>
      )}
    </div>
  )
}

const ROLES: UserRole[] = ['admin', 'gestor', 'aux', 'operador']

function CadastroForm({ onToast }: { onToast: (t: Toast) => void }) {
  const [email,    setEmail]    = useState('')
  const [senha,    setSenha]    = useState('')
  const [nome,     setNome]     = useState('')
  const [username, setUsername] = useState('')
  const [role,     setRole]     = useState<UserRole>('operador')
  const [erro,     setErro]     = useState<string | null>(null)
  const [isPending, startTransition] = useTransition()

  function handleCadastrar() {
    setErro(null)
    if (!email || !senha || !nome || !username) { setErro('Preencha todos os campos obrigatórios.'); return }
    if (senha.length < 6) { setErro('Senha deve ter ao menos 6 caracteres.'); return }

    startTransition(async () => {
      const res = await cadastrarOperadorAction({
        email, senha, nome, username, role,
        operador_id: null,
      })
      if (res.ok) {
        onToast({ tipo: 'ok', msg: 'Operador cadastrado com sucesso' })
        setEmail(''); setSenha(''); setNome(''); setUsername(''); setRole('operador')
      } else {
        setErro(res.erro ?? 'Erro ao cadastrar')
        onToast({ tipo: 'erro', msg: res.erro ?? 'Erro ao cadastrar' })
      }
    })
  }

  const labelStyle: React.CSSProperties = {
    fontFamily: FF_SYNE, fontSize: '10px', fontWeight: 600,
    textTransform: 'uppercase', letterSpacing: '0.08em', color: '#474658',
    marginBottom: '6px', display: 'block',
  }

  return (
    <div style={{
      background: '#070714',
      border: '1px solid rgba(244,212,124,0.10)',
      borderRadius: '10px',
      padding: '20px 24px',
      display: 'flex', flexDirection: 'column', gap: '16px',
    }}>
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(200px, 1fr))', gap: '14px' }}>
        <div>
          <span style={labelStyle}>Email *</span>
          <input type="email" value={email} onChange={e => setEmail(e.target.value)}
            placeholder="email@empresa.com" disabled={isPending}
            style={{ ...INPUT_STYLE, width: '100%', boxSizing: 'border-box' }} />
        </div>
        <div>
          <span style={labelStyle}>Senha *</span>
          <input type="text" value={senha} onChange={e => setSenha(e.target.value)}
            placeholder="Mín. 6 caracteres" disabled={isPending}
            style={{ ...INPUT_STYLE, width: '100%', boxSizing: 'border-box' }} />
        </div>
        <div>
          <span style={labelStyle}>Nome completo *</span>
          <input type="text" value={nome} onChange={e => setNome(e.target.value)}
            placeholder="Nome Sobrenome" disabled={isPending}
            style={{ ...INPUT_STYLE, width: '100%', boxSizing: 'border-box' }} />
        </div>
        <div>
          <span style={labelStyle}>Username *</span>
          <input type="text" value={username} onChange={e => setUsername(e.target.value)}
            placeholder="nome.sobrenome" disabled={isPending}
            style={{ ...INPUT_STYLE, width: '100%', boxSizing: 'border-box' }} />
        </div>
        <div>
          <span style={labelStyle}>Role *</span>
          <select value={role} onChange={e => setRole(e.target.value as UserRole)} disabled={isPending}
            style={{ ...INPUT_STYLE, width: '100%', boxSizing: 'border-box', cursor: 'pointer' }}>
            {ROLES.map(r => (
              <option key={r} value={r} style={{ background: '#03040C' }}>{r}</option>
            ))}
          </select>
        </div>
      </div>

      {erro && (
        <p style={{ fontFamily: FF_DM, fontSize: '12px', color: '#f87171', margin: 0 }}>{erro}</p>
      )}

      <div>
        {/* #6 — CADASTRAR em Syne Bold */}
        <button
          type="button"
          onClick={handleCadastrar}
          disabled={isPending}
          className="btn-primary"
          style={{
            display: 'inline-flex', alignItems: 'center', gap: '6px',
            padding: '9px 20px', fontSize: '13px',
            fontFamily: FF_SYNE, fontWeight: 700,
          }}
        >
          <UserPlus size={14} />
          CADASTRAR OPERADOR
        </button>
      </div>
    </div>
  )
}

const ROLES_ALTERAVEIS: Array<'operador' | 'aux'> = ['operador', 'aux']

function AlterarRoleForm({ candidatos, onToast }: { candidatos: UsuarioInfo[]; onToast: (t: Toast) => void }) {
  const [usuarioId, setUsuarioId] = useState('')
  const [novaRole, setNovaRole]   = useState<'operador' | 'aux'>('operador')
  const [isPending, startTransition] = useTransition()

  const selecionado = candidatos.find(c => c.id === usuarioId) ?? null
  const roleAtual   = selecionado?.role as 'operador' | 'aux' | undefined
  const semMudanca  = !!selecionado && roleAtual === novaRole
  const desabilitado = !usuarioId || semMudanca || isPending

  function handleUsuarioChange(id: string) {
    setUsuarioId(id)
    const u = candidatos.find(c => c.id === id)
    if (u) setNovaRole(u.role as 'operador' | 'aux')
  }

  function handleAlterar() {
    if (!usuarioId) return
    startTransition(async () => {
      const res = await alterarRoleAction(usuarioId, novaRole)
      if (res.ok) {
        onToast({ tipo: 'ok', msg: 'Role alterada com sucesso' })
        setUsuarioId('')
        setNovaRole('operador')
      } else {
        onToast({ tipo: 'erro', msg: res.erro ?? 'Erro ao alterar role' })
      }
    })
  }

  const labelStyle: React.CSSProperties = {
    fontFamily: FF_SYNE, fontSize: '10px', fontWeight: 600,
    textTransform: 'uppercase', letterSpacing: '0.08em', color: '#474658',
    marginBottom: '6px', display: 'block',
  }

  return (
    <div style={{
      background: '#070714',
      border: '1px solid rgba(244,212,124,0.10)',
      borderRadius: '10px',
      padding: '20px 24px',
      display: 'flex', flexDirection: 'column', gap: '16px',
    }}>
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(220px, 1fr))', gap: '14px' }}>
        <div>
          <span style={labelStyle}>Operador</span>
          <select
            value={usuarioId}
            onChange={e => handleUsuarioChange(e.target.value)}
            disabled={isPending}
            style={{ ...INPUT_STYLE, width: '100%', boxSizing: 'border-box', cursor: 'pointer' }}
          >
            <option value="" style={{ background: '#03040C' }}>Selecionar operador…</option>
            {candidatos.map(c => (
              <option key={c.id} value={c.id} style={{ background: '#03040C' }}>
                {c.username} ({c.role})
              </option>
            ))}
          </select>
        </div>
        <div>
          <span style={labelStyle}>Nova role</span>
          <select
            value={novaRole}
            onChange={e => setNovaRole(e.target.value as 'operador' | 'aux')}
            disabled={isPending || !usuarioId}
            style={{ ...INPUT_STYLE, width: '100%', boxSizing: 'border-box', cursor: usuarioId ? 'pointer' : 'default' }}
          >
            {ROLES_ALTERAVEIS.map(r => (
              <option key={r} value={r} style={{ background: '#03040C' }}>{r}</option>
            ))}
          </select>
        </div>
      </div>

      <div>
        <button
          type="button"
          onClick={handleAlterar}
          disabled={desabilitado}
          className="btn-primary"
          style={{
            display: 'inline-flex', alignItems: 'center', gap: '6px',
            padding: '9px 20px', fontSize: '13px',
            fontFamily: FF_SYNE, fontWeight: 700,
            opacity: desabilitado ? 0.4 : 1,
            cursor: desabilitado ? 'not-allowed' : 'pointer',
          }}
        >
          {isPending ? (
            <span className="animate-spin" style={{
              width: '14px', height: '14px', borderRadius: '50%',
              border: '2px solid rgba(255,255,255,0.3)',
              borderTopColor: '#fff',
              display: 'inline-block',
            }} />
          ) : (
            <ShieldCheck size={14} />
          )}
          ALTERAR ROLE
        </button>
      </div>
    </div>
  )
}

export default function OperadoresConfigClient({ usuarios }: { usuarios: UsuarioInfo[] }) {
  const [toast, setToast] = useState<Toast>(null)

  function showToast(t: Toast) {
    setToast(t)
    setTimeout(() => setToast(null), 3000)
  }

  const sorted = [...usuarios].sort((a, b) => {
    const pa = ROLE_PRIORITY[a.role] ?? 99
    const pb = ROLE_PRIORITY[b.role] ?? 99
    if (pa !== pb) return pa - pb
    return a.nome.localeCompare(b.nome, 'pt-BR')
  })

  const ativos      = sorted.filter(u => u.ativo)
  const inativos    = sorted.filter(u => !u.ativo)
  const candidatos  = ativos.filter(u => u.role === 'operador' || u.role === 'aux')

  return (
    <>
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

      <div style={{ display: 'flex', flexDirection: 'column', gap: '32px' }}>
        <div>
          <div style={{ marginBottom: '16px' }}>
            <PainelSectionTitle contador={ativos.length}>USUÁRIOS ATIVOS</PainelSectionTitle>
          </div>
          <div style={{ display: 'flex', flexDirection: 'column', gap: '10px' }}>
            {ativos.length === 0 && (
              <p style={{ fontFamily: FF_DM, fontSize: '13px', color: '#474658', fontStyle: 'italic' }}>Nenhum usuário ativo.</p>
            )}
            {ativos.map(u => <UsuarioCard key={u.id} usuario={u} onToast={showToast} />)}
          </div>
        </div>

        {inativos.length > 0 && (
          <div>
            <div style={{ marginBottom: '16px' }}>
              <PainelSectionTitle contador={inativos.length}>USUÁRIOS INATIVOS</PainelSectionTitle>
            </div>
            <div style={{ display: 'flex', flexDirection: 'column', gap: '10px' }}>
              {inativos.map(u => <UsuarioCard key={u.id} usuario={u} onToast={showToast} />)}
            </div>
          </div>
        )}

        <div>
          <div style={{ marginBottom: '16px' }}>
            <PainelSectionTitle>CADASTRAR NOVO OPERADOR</PainelSectionTitle>
          </div>
          <CadastroForm onToast={showToast} />
        </div>

        <div>
          <div style={{ marginBottom: '8px' }}>
            <PainelSectionTitle>ALTERAR ROLE</PainelSectionTitle>
          </div>
          <p style={{ fontFamily: FF_DM, fontSize: '12px', color: '#474658', margin: '0 0 14px' }}>
            Promove ou rebaixa entre <strong style={{ color: '#7ba3d9' }}>aux</strong> e <strong style={{ color: '#A6A2A2' }}>operador</strong>. Admin e gestor não podem ser alterados por aqui.
          </p>
          <AlterarRoleForm candidatos={candidatos} onToast={showToast} />
        </div>
      </div>
    </>
  )
}
