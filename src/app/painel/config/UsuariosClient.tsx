'use client'

import { useState, useTransition } from 'react'
import { Eye, EyeOff, KeyRound, Shield, X, Check } from 'lucide-react'
import { getAvatarStyle, getIniciaisNome } from '@/lib/operadores'
import { redefinirSenhaAction, atualizarRoleSkillsAction } from './usuarios-actions'
import { UserRole } from '@/types'

export interface UserInfo {
  id: string
  nome: string
  username: string
  email: string
  role: string
  operador_id: number | null
  skills: string[]
  senha_atual: string | null
}

interface Toast { message: string; type: 'success' | 'error' }

const ROLE_OPTS: { value: UserRole; label: string }[] = [
  { value: 'operador', label: 'Operador' },
  { value: 'aux',      label: 'Auxiliar' },
  { value: 'admin',    label: 'Admin' },
  { value: 'gestor',   label: 'Gestor' },
]

const SKILL_OPTS = ['OP', 'AUX', 'ADM', 'GESTOR']

const ROLE_BADGE: Record<string, React.CSSProperties> = {
  gestor:   { background: 'rgba(201,168,76,0.12)',  color: '#e8c96d' },
  admin:    { background: 'rgba(139,92,246,0.12)',  color: '#a78bfa' },
  aux:      { background: 'rgba(59,130,246,0.12)',  color: '#60a5fa' },
  operador: { background: 'rgba(16,185,129,0.10)',  color: '#34d399' },
}

const SKILL_PILL: Record<string, React.CSSProperties> = {
  GESTOR: { background: 'rgba(201,168,76,0.10)', color: '#e8c96d',  border: '1px solid rgba(201,168,76,0.20)' },
  ADM:    { background: 'rgba(139,92,246,0.10)', color: '#a78bfa',  border: '1px solid rgba(139,92,246,0.20)' },
  AUX:    { background: 'rgba(59,130,246,0.10)', color: '#60a5fa',  border: '1px solid rgba(59,130,246,0.20)' },
  OP:     { background: 'rgba(16,185,129,0.10)', color: '#34d399',  border: '1px solid rgba(16,185,129,0.20)' },
}

export default function UsuariosClient({ usuarios }: { usuarios: UserInfo[] }) {
  const [senhaVisivel, setSenhaVisivel] = useState<Record<string, boolean>>({})
  const [modalSenha,   setModalSenha]   = useState<UserInfo | null>(null)
  const [modalRole,    setModalRole]    = useState<UserInfo | null>(null)
  const [toast,        setToast]        = useState<Toast | null>(null)

  function showToast(t: Toast) {
    setToast(t)
    setTimeout(() => setToast(null), 3500)
  }

  return (
    <div>
      {/* Tabela */}
      <div style={{ background: '#0d0d1a', border: '1px solid rgba(201,168,76,0.08)', borderRadius: '16px', overflow: 'hidden' }}>
        <table style={{ width: '100%', borderCollapse: 'collapse' }}>
          <thead>
            <tr style={{ background: 'rgba(201,168,76,0.04)', borderBottom: '1px solid rgba(201,168,76,0.10)' }}>
              {['Usuário', 'Role', 'Skills', 'Senha', 'Ações'].map((h) => (
                <th key={h} style={{ padding: '10px 14px', textAlign: 'left', fontSize: '9px', fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.12em', color: '#c9a84c', whiteSpace: 'nowrap' }}>
                  {h}
                </th>
              ))}
            </tr>
          </thead>
          <tbody>
            {usuarios.map((u, i) => (
              <tr
                key={u.id}
                style={{
                  borderBottom: i < usuarios.length - 1 ? '1px solid rgba(255,255,255,0.04)' : undefined,
                  transition: 'background 150ms',
                }}
                onMouseEnter={e => { (e.currentTarget as HTMLElement).style.background = 'rgba(201,168,76,0.02)' }}
                onMouseLeave={e => { (e.currentTarget as HTMLElement).style.background = '' }}
              >
                {/* Usuário */}
                <td style={{ padding: '10px 14px' }}>
                  <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
                    <div
                      style={{
                        ...getAvatarStyle(u.operador_id ?? 14),
                        width: '30px', height: '30px', borderRadius: '8px',
                        display: 'flex', alignItems: 'center', justifyContent: 'center',
                        fontSize: '10px', fontWeight: 700, flexShrink: 0, border: '2px solid',
                      }}
                    >
                      {getIniciaisNome(u.nome)}
                    </div>
                    <div>
                      <p style={{ fontSize: '12px', fontWeight: 600, color: 'var(--text-primary)', whiteSpace: 'nowrap' }}>
                        {u.nome.split(' ').slice(0, 2).join(' ')}
                      </p>
                      <p style={{ fontSize: '10px', color: 'var(--text-muted)', fontFamily: 'monospace' }}>
                        {u.username}
                      </p>
                    </div>
                  </div>
                </td>

                {/* Role */}
                <td style={{ padding: '10px 14px' }}>
                  <span style={{ fontSize: '9px', fontWeight: 700, padding: '2px 8px', borderRadius: '99px', textTransform: 'uppercase', letterSpacing: '0.08em', ...(ROLE_BADGE[u.role] ?? ROLE_BADGE.operador) }}>
                    {u.role}
                  </span>
                </td>

                {/* Skills */}
                <td style={{ padding: '10px 14px' }}>
                  <div style={{ display: 'flex', gap: '4px', flexWrap: 'wrap' }}>
                    {u.skills.map(s => (
                      <span key={s} style={{ fontSize: '9px', fontWeight: 700, padding: '1px 6px', borderRadius: '4px', textTransform: 'uppercase', letterSpacing: '0.06em', ...(SKILL_PILL[s] ?? SKILL_PILL.OP) }}>
                        {s}
                      </span>
                    ))}
                  </div>
                </td>

                {/* Senha */}
                <td style={{ padding: '10px 14px' }}>
                  <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
                    <span style={{ fontSize: '11px', fontFamily: 'monospace', color: 'var(--text-secondary)', letterSpacing: '0.05em' }}>
                      {senhaVisivel[u.id] ? (u.senha_atual ?? '—') : '••••••••'}
                    </span>
                    <button
                      type="button"
                      onClick={() => setSenhaVisivel(v => ({ ...v, [u.id]: !v[u.id] }))}
                      style={{ padding: '2px', color: 'var(--text-muted)', lineHeight: 0, cursor: 'pointer', background: 'none', border: 'none' }}
                    >
                      {senhaVisivel[u.id] ? <EyeOff size={12} /> : <Eye size={12} />}
                    </button>
                  </div>
                </td>

                {/* Ações */}
                <td style={{ padding: '10px 14px' }}>
                  <div style={{ display: 'flex', gap: '6px' }}>
                    <button
                      type="button"
                      onClick={() => setModalSenha(u)}
                      style={{ display: 'flex', alignItems: 'center', gap: '4px', padding: '4px 10px', borderRadius: '6px', fontSize: '10px', fontWeight: 600, cursor: 'pointer', background: 'rgba(201,168,76,0.06)', border: '1px solid rgba(201,168,76,0.15)', color: '#c9a84c', whiteSpace: 'nowrap' }}
                    >
                      <KeyRound size={10} /> Senha
                    </button>
                    <button
                      type="button"
                      onClick={() => setModalRole(u)}
                      style={{ display: 'flex', alignItems: 'center', gap: '4px', padding: '4px 10px', borderRadius: '6px', fontSize: '10px', fontWeight: 600, cursor: 'pointer', background: 'rgba(139,92,246,0.06)', border: '1px solid rgba(139,92,246,0.15)', color: '#a78bfa', whiteSpace: 'nowrap' }}
                    >
                      <Shield size={10} /> Role
                    </button>
                  </div>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      {/* Modal Redefinir Senha */}
      {modalSenha && (
        <ModalSenha
          user={modalSenha}
          onClose={() => setModalSenha(null)}
          onSuccess={(msg) => { setModalSenha(null); showToast({ message: msg, type: 'success' }) }}
          onError={(msg) => showToast({ message: msg, type: 'error' })}
        />
      )}

      {/* Modal Alterar Role/Skills */}
      {modalRole && (
        <ModalRoleSkills
          user={modalRole}
          onClose={() => setModalRole(null)}
          onSuccess={(msg) => { setModalRole(null); showToast({ message: msg, type: 'success' }) }}
          onError={(msg) => showToast({ message: msg, type: 'error' })}
        />
      )}

      {/* Toast */}
      {toast && (
        <div style={{
          position: 'fixed', bottom: '24px', right: '24px', zIndex: 60,
          display: 'flex', alignItems: 'center', gap: '10px',
          padding: '12px 16px', borderRadius: '12px',
          fontSize: '0.8125rem', fontWeight: 600,
          background: toast.type === 'success'
            ? 'linear-gradient(135deg, rgba(16,185,129,0.15), rgba(16,185,129,0.08))'
            : 'linear-gradient(135deg, rgba(239,68,68,0.15), rgba(239,68,68,0.08))',
          border: `1px solid ${toast.type === 'success' ? 'rgba(16,185,129,0.30)' : 'rgba(239,68,68,0.30)'}`,
          color: toast.type === 'success' ? '#34d399' : '#f87171',
          boxShadow: '0 8px 32px rgba(0,0,0,0.40)',
        }}>
          {toast.type === 'success' ? <Check size={14} /> : <X size={14} />}
          {toast.message}
        </div>
      )}
    </div>
  )
}

/* ── Modal Redefinir Senha ─────────────────────────────────────────────────── */

function ModalSenha({
  user,
  onClose,
  onSuccess,
  onError,
}: {
  user: UserInfo
  onClose: () => void
  onSuccess: (msg: string) => void
  onError: (msg: string) => void
}) {
  const [novaSenha, setNovaSenha] = useState('')
  const [pending, startTransition] = useTransition()

  function handleSalvar() {
    if (!novaSenha.trim()) return
    startTransition(async () => {
      const res = await redefinirSenhaAction(user.id, user.username, novaSenha.trim())
      if (res.ok) onSuccess(`Senha de ${user.nome.split(' ')[0]} redefinida com sucesso.`)
      else onError(res.erro ?? 'Erro ao redefinir senha.')
    })
  }

  return (
    <div style={{ position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.75)', zIndex: 50, display: 'flex', alignItems: 'center', justifyContent: 'center', padding: '16px', backdropFilter: 'blur(4px)' }}
      onClick={onClose}>
      <div
        onClick={e => e.stopPropagation()}
        style={{ width: '100%', maxWidth: '420px', background: '#0d0d1a', borderRadius: '20px', border: '1px solid rgba(201,168,76,0.25)', padding: '24px', boxShadow: '0 24px 80px rgba(0,0,0,0.6)' }}
      >
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '20px' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
            <div style={{ width: '32px', height: '32px', borderRadius: '10px', background: 'rgba(201,168,76,0.08)', border: '1px solid rgba(201,168,76,0.15)', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
              <KeyRound size={15} style={{ color: 'var(--gold)' }} />
            </div>
            <div>
              <h3 style={{ fontSize: '14px', fontWeight: 700, color: 'var(--text-primary)' }}>Redefinir Senha</h3>
              <p style={{ fontSize: '11px', color: 'var(--text-muted)' }}>{user.nome.split(' ').slice(0, 2).join(' ')}</p>
            </div>
          </div>
          <button type="button" onClick={onClose} style={{ color: 'var(--text-muted)', background: 'none', border: 'none', cursor: 'pointer', lineHeight: 0 }}>
            <X size={16} />
          </button>
        </div>

        <div style={{ marginBottom: '16px' }}>
          <label style={{ display: 'block', fontSize: '11px', fontWeight: 600, color: 'var(--text-secondary)', marginBottom: '6px', textTransform: 'uppercase', letterSpacing: '0.08em' }}>
            Nova senha
          </label>
          <input
            type="text"
            value={novaSenha}
            onChange={e => setNovaSenha(e.target.value)}
            onKeyDown={e => e.key === 'Enter' && handleSalvar()}
            placeholder="Digite a nova senha..."
            autoFocus
            style={{ width: '100%', padding: '10px 12px', borderRadius: '10px', background: '#111827', border: '1px solid rgba(201,168,76,0.12)', color: 'var(--text-primary)', fontSize: '13px', fontFamily: 'monospace', outline: 'none', boxSizing: 'border-box' }}
          />
          <p style={{ fontSize: '10px', color: 'var(--text-muted)', marginTop: '4px' }}>Mínimo 6 caracteres. O admin pode ver o que está digitando.</p>
        </div>

        <div style={{ display: 'flex', gap: '8px', justifyContent: 'flex-end' }}>
          <button type="button" onClick={onClose} disabled={pending}
            style={{ padding: '8px 16px', borderRadius: '8px', border: '1px solid rgba(255,255,255,0.08)', background: 'transparent', color: 'var(--text-secondary)', fontSize: '12px', fontWeight: 600, cursor: 'pointer' }}>
            Cancelar
          </button>
          <button type="button" onClick={handleSalvar} disabled={pending || !novaSenha.trim()}
            style={{ padding: '8px 18px', borderRadius: '8px', border: '1px solid rgba(201,168,76,0.30)', background: 'rgba(201,168,76,0.10)', color: '#e8c96d', fontSize: '12px', fontWeight: 600, cursor: pending ? 'not-allowed' : 'pointer', opacity: pending || !novaSenha.trim() ? 0.5 : 1 }}>
            {pending ? 'Salvando...' : 'Salvar'}
          </button>
        </div>
      </div>
    </div>
  )
}

/* ── Modal Alterar Role / Skills ───────────────────────────────────────────── */

function ModalRoleSkills({
  user,
  onClose,
  onSuccess,
  onError,
}: {
  user: UserInfo
  onClose: () => void
  onSuccess: (msg: string) => void
  onError: (msg: string) => void
}) {
  const [role,    setRole]    = useState<UserRole>(user.role as UserRole)
  const [skills,  setSkills]  = useState<string[]>(user.skills)
  const [pending, startTransition] = useTransition()

  function toggleSkill(s: string) {
    setSkills(prev => prev.includes(s) ? prev.filter(x => x !== s) : [...prev, s])
  }

  function handleSalvar() {
    startTransition(async () => {
      const res = await atualizarRoleSkillsAction(user.id, role, skills)
      if (res.ok) onSuccess(`Perfil de ${user.nome.split(' ')[0]} atualizado.`)
      else onError(res.erro ?? 'Erro ao atualizar perfil.')
    })
  }

  return (
    <div style={{ position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.75)', zIndex: 50, display: 'flex', alignItems: 'center', justifyContent: 'center', padding: '16px', backdropFilter: 'blur(4px)' }}
      onClick={onClose}>
      <div
        onClick={e => e.stopPropagation()}
        style={{ width: '100%', maxWidth: '420px', background: '#0d0d1a', borderRadius: '20px', border: '1px solid rgba(201,168,76,0.25)', padding: '24px', boxShadow: '0 24px 80px rgba(0,0,0,0.6)' }}
      >
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '20px' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
            <div style={{ width: '32px', height: '32px', borderRadius: '10px', background: 'rgba(139,92,246,0.08)', border: '1px solid rgba(139,92,246,0.15)', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
              <Shield size={15} style={{ color: '#a78bfa' }} />
            </div>
            <div>
              <h3 style={{ fontSize: '14px', fontWeight: 700, color: 'var(--text-primary)' }}>Alterar Role / Skills</h3>
              <p style={{ fontSize: '11px', color: 'var(--text-muted)' }}>{user.nome.split(' ').slice(0, 2).join(' ')}</p>
            </div>
          </div>
          <button type="button" onClick={onClose} style={{ color: 'var(--text-muted)', background: 'none', border: 'none', cursor: 'pointer', lineHeight: 0 }}>
            <X size={16} />
          </button>
        </div>

        {/* Role select */}
        <div style={{ marginBottom: '16px' }}>
          <label style={{ display: 'block', fontSize: '11px', fontWeight: 600, color: 'var(--text-secondary)', marginBottom: '6px', textTransform: 'uppercase', letterSpacing: '0.08em' }}>
            Role (acesso)
          </label>
          <select
            value={role}
            onChange={e => setRole(e.target.value as UserRole)}
            style={{ width: '100%', padding: '10px 12px', borderRadius: '10px', background: '#111827', border: '1px solid rgba(201,168,76,0.12)', color: 'var(--text-primary)', fontSize: '13px', outline: 'none', cursor: 'pointer', boxSizing: 'border-box' }}
          >
            {ROLE_OPTS.map(o => (
              <option key={o.value} value={o.value}>{o.label}</option>
            ))}
          </select>
        </div>

        {/* Skills checkboxes */}
        <div style={{ marginBottom: '20px' }}>
          <label style={{ display: 'block', fontSize: '11px', fontWeight: 600, color: 'var(--text-secondary)', marginBottom: '8px', textTransform: 'uppercase', letterSpacing: '0.08em' }}>
            Skills (funções)
          </label>
          <div style={{ display: 'flex', gap: '8px', flexWrap: 'wrap' }}>
            {SKILL_OPTS.map(s => {
              const active = skills.includes(s)
              const style = SKILL_PILL[s] ?? SKILL_PILL.OP
              return (
                <button
                  key={s}
                  type="button"
                  onClick={() => toggleSkill(s)}
                  style={{
                    padding: '5px 14px', borderRadius: '6px', fontSize: '11px', fontWeight: 700,
                    cursor: 'pointer', textTransform: 'uppercase' as const, letterSpacing: '0.06em',
                    transition: 'all 150ms',
                    ...(active ? style : { background: 'rgba(255,255,255,0.04)', border: '1px solid rgba(255,255,255,0.08)', color: 'var(--text-muted)' }),
                  }}
                >
                  {s}
                </button>
              )
            })}
          </div>
        </div>

        <div style={{ display: 'flex', gap: '8px', justifyContent: 'flex-end' }}>
          <button type="button" onClick={onClose} disabled={pending}
            style={{ padding: '8px 16px', borderRadius: '8px', border: '1px solid rgba(255,255,255,0.08)', background: 'transparent', color: 'var(--text-secondary)', fontSize: '12px', fontWeight: 600, cursor: 'pointer' }}>
            Cancelar
          </button>
          <button type="button" onClick={handleSalvar} disabled={pending}
            style={{ padding: '8px 18px', borderRadius: '8px', border: '1px solid rgba(139,92,246,0.30)', background: 'rgba(139,92,246,0.10)', color: '#a78bfa', fontSize: '12px', fontWeight: 600, cursor: pending ? 'not-allowed' : 'pointer', opacity: pending ? 0.5 : 1 }}>
            {pending ? 'Salvando...' : 'Salvar'}
          </button>
        </div>
      </div>
    </div>
  )
}
