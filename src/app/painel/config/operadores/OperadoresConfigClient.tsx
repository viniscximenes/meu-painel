'use client'

import { useState, useTransition } from 'react'
import { Eye, EyeOff, Save, UserX, UserCheck, UserPlus, X } from 'lucide-react'
import type { UserRole } from '@/types'
import {
  redefinirSenhaOperadorAction,
  inativarUsuarioAction,
  reativarUsuarioAction,
  cadastrarOperadorAction,
} from './actions'

const FF_SYNE = "'Syne', sans-serif"
const FF_DM   = "'DM Sans', sans-serif"

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

const ROLE_STYLE: Record<UserRole, { bg: string; color: string; border: string }> = {
  admin:    { bg: 'rgba(139,92,246,0.12)',  color: '#a78bfa', border: 'rgba(139,92,246,0.4)' },
  gestor:   { bg: 'rgba(201,168,76,0.12)',  color: '#f4d47c', border: 'rgba(244,212,124,0.4)' },
  aux:      { bg: 'rgba(59,130,246,0.12)',  color: '#60a5fa', border: 'rgba(59,130,246,0.4)' },
  operador: { bg: 'rgba(16,185,129,0.10)',  color: '#34d399', border: 'rgba(16,185,129,0.4)' },
}

function RolePill({ role }: { role: UserRole }) {
  const s = ROLE_STYLE[role] ?? ROLE_STYLE.operador
  return (
    <span style={{
      fontFamily: FF_SYNE, fontSize: '9px', fontWeight: 700,
      textTransform: 'uppercase', letterSpacing: '0.12em',
      padding: '3px 8px', borderRadius: '6px',
      display: 'inline-flex', alignItems: 'center',
      background: s.bg, color: s.color, border: `1px solid ${s.border}`,
    }}>
      {role}
    </span>
  )
}

function StatusPill({ ativo }: { ativo: boolean }) {
  return (
    <span style={{
      fontFamily: FF_SYNE, fontSize: '9px', fontWeight: 700,
      textTransform: 'uppercase', letterSpacing: '0.12em',
      padding: '3px 8px', borderRadius: '6px',
      display: 'inline-flex', alignItems: 'center',
      background: ativo ? 'rgba(74,222,128,0.08)' : 'rgba(239,68,68,0.08)',
      color: ativo ? '#4ade80' : '#f87171',
      border: `1px solid ${ativo ? 'rgba(74,222,128,0.3)' : 'rgba(239,68,68,0.3)'}`,
    }}>
      {ativo ? 'ATIVO' : 'INATIVO'}
    </span>
  )
}

function SectionTitle({ children }: { children: React.ReactNode }) {
  return (
    <div style={{ display: 'flex', alignItems: 'center', gap: '12px', marginTop: '8px', marginBottom: '16px' }}>
      <span style={{
        fontFamily: FF_SYNE, fontWeight: 600, fontSize: '13px',
        textTransform: 'uppercase', letterSpacing: '0.10em',
        color: '#A6A2A2', whiteSpace: 'nowrap', flexShrink: 0,
      }}>
        {children}
      </span>
      <div style={{ flex: 1, height: '2px', background: 'rgba(244,212,124,0.30)' }} />
    </div>
  )
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
        <div style={{ display: 'flex', alignItems: 'center', gap: '10px', flexWrap: 'wrap' }}>
          <span style={{ fontFamily: FF_SYNE, fontWeight: 600, fontSize: '14px', color: '#A6A2A2' }}>
            {usuario.nome}
          </span>
          <span style={{ fontFamily: FF_DM, fontSize: '11px', color: '#474658' }}>@{usuario.username}</span>
          <RolePill role={usuario.role} />
          <StatusPill ativo={usuario.ativo} />
        </div>

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

          {!editandoSenha && (
            <button
              type="button"
              onClick={() => setEditandoSenha(true)}
              style={{
                fontFamily: FF_DM, fontSize: '11px', fontWeight: 500,
                padding: '5px 10px', borderRadius: '7px',
                background: 'transparent', border: '1px solid rgba(114,112,143,0.3)',
                color: '#72708F', cursor: 'pointer',
              }}
            >
              Redefinir senha
            </button>
          )}

          {confirmando ? (
            <div style={{ display: 'inline-flex', alignItems: 'center', gap: '6px' }}>
              <span style={{ fontFamily: FF_DM, fontSize: '11px', color: '#f87171' }}>Confirmar?</span>
              <button
                type="button"
                onClick={handleToggleAtivo}
                disabled={isPending}
                style={{
                  fontFamily: FF_DM, fontSize: '11px', fontWeight: 600,
                  padding: '5px 10px', borderRadius: '7px',
                  background: 'rgba(239,68,68,0.12)', border: '1px solid rgba(239,68,68,0.3)',
                  color: '#f87171', cursor: 'pointer',
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
            <button
              type="button"
              onClick={handleToggleAtivo}
              disabled={isPending}
              style={{
                display: 'inline-flex', alignItems: 'center', gap: '4px',
                fontFamily: FF_DM, fontSize: '11px', fontWeight: 500,
                padding: '5px 10px', borderRadius: '7px',
                background: usuario.ativo ? 'rgba(239,68,68,0.06)' : 'rgba(74,222,128,0.06)',
                border: `1px solid ${usuario.ativo ? 'rgba(239,68,68,0.2)' : 'rgba(74,222,128,0.2)'}`,
                color: usuario.ativo ? 'rgba(248,113,113,0.8)' : 'rgba(74,222,128,0.8)',
                cursor: 'pointer',
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
            style={{ display: 'inline-flex', alignItems: 'center', gap: '6px', padding: '7px 14px', fontSize: '12px' }}
          >
            <Save size={13} />
            SALVAR
          </button>
          <button
            type="button"
            onClick={() => { setEditandoSenha(false); setNovaSenha('') }}
            style={{
              display: 'inline-flex', alignItems: 'center', gap: '4px',
              padding: '7px 12px', borderRadius: '8px', fontSize: '12px',
              background: 'transparent', border: '1px solid rgba(114,112,143,0.3)',
              color: '#72708F', cursor: 'pointer', fontFamily: FF_DM, fontWeight: 500,
            }}
          >
            <X size={12} /> Cancelar
          </button>
        </div>
      )}
    </div>
  )
}

const ROLES: UserRole[] = ['operador', 'aux', 'gestor', 'admin']

function CadastroForm({ onToast }: { onToast: (t: Toast) => void }) {
  const [email,      setEmail]      = useState('')
  const [senha,      setSenha]      = useState('')
  const [nome,       setNome]       = useState('')
  const [username,   setUsername]   = useState('')
  const [role,       setRole]       = useState<UserRole>('operador')
  const [operadorId, setOperadorId] = useState('')
  const [erro,       setErro]       = useState<string | null>(null)
  const [isPending,  startTransition] = useTransition()

  function handleCadastrar() {
    setErro(null)
    if (!email || !senha || !nome || !username) { setErro('Preencha todos os campos obrigatórios.'); return }
    if (senha.length < 6) { setErro('Senha deve ter ao menos 6 caracteres.'); return }

    startTransition(async () => {
      const res = await cadastrarOperadorAction({
        email, senha, nome, username, role,
        operador_id: operadorId ? parseInt(operadorId, 10) : null,
      })
      if (res.ok) {
        onToast({ tipo: 'ok', msg: 'Operador cadastrado com sucesso' })
        setEmail(''); setSenha(''); setNome(''); setUsername('')
        setRole('operador'); setOperadorId('')
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
        <div>
          <span style={labelStyle}>Operador ID</span>
          <input type="number" value={operadorId} onChange={e => setOperadorId(e.target.value)}
            placeholder="1–15 (opcional)" disabled={isPending} min={1} max={15}
            style={{ ...INPUT_STYLE, width: '100%', boxSizing: 'border-box' }} />
        </div>
      </div>

      {erro && (
        <p style={{ fontFamily: FF_DM, fontSize: '12px', color: '#f87171', margin: 0 }}>{erro}</p>
      )}

      <div>
        <button
          type="button"
          onClick={handleCadastrar}
          disabled={isPending}
          className="btn-primary"
          style={{ display: 'inline-flex', alignItems: 'center', gap: '6px', padding: '9px 20px', fontSize: '13px' }}
        >
          <UserPlus size={14} />
          CADASTRAR OPERADOR
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

  const ativos   = usuarios.filter(u => u.ativo)
  const inativos = usuarios.filter(u => !u.ativo)

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
          <SectionTitle>Usuários Ativos ({ativos.length})</SectionTitle>
          <div style={{ display: 'flex', flexDirection: 'column', gap: '10px' }}>
            {ativos.length === 0 && (
              <p style={{ fontFamily: FF_DM, fontSize: '13px', color: '#474658', fontStyle: 'italic' }}>Nenhum usuário ativo.</p>
            )}
            {ativos.map(u => <UsuarioCard key={u.id} usuario={u} onToast={showToast} />)}
          </div>
        </div>

        {inativos.length > 0 && (
          <div>
            <SectionTitle>Usuários Inativos ({inativos.length})</SectionTitle>
            <div style={{ display: 'flex', flexDirection: 'column', gap: '10px' }}>
              {inativos.map(u => <UsuarioCard key={u.id} usuario={u} onToast={showToast} />)}
            </div>
          </div>
        )}

        <div>
          <SectionTitle>Cadastrar Novo Operador</SectionTitle>
          <CadastroForm onToast={showToast} />
        </div>
      </div>
    </>
  )
}
