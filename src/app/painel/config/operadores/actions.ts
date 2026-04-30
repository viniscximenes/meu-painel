'use server'

import { requireAdmin } from '@/lib/auth'
import { createAdminClient } from '@/lib/supabase/admin'
import type { UserRole } from '@/types'
import { revalidatePath } from 'next/cache'

export async function redefinirSenhaOperadorAction(
  userId: string,
  username: string,
  novaSenha: string,
): Promise<{ ok: boolean; erro?: string }> {
  try {
    await requireAdmin()
    if (!novaSenha || novaSenha.length < 6) return { ok: false, erro: 'Senha deve ter ao menos 6 caracteres.' }
    const admin = createAdminClient()
    const { error: authError } = await admin.auth.admin.updateUserById(userId, { password: novaSenha })
    if (authError) return { ok: false, erro: authError.message }
    await admin.from('user_credentials').upsert(
      { username, senha_atual: novaSenha, updated_at: new Date().toISOString() },
      { onConflict: 'username' },
    )
    revalidatePath('/painel/config/operadores')
    return { ok: true }
  } catch (e) {
    return { ok: false, erro: e instanceof Error ? e.message : 'Erro ao redefinir senha.' }
  }
}

export async function inativarUsuarioAction(userId: string): Promise<{ ok: boolean; erro?: string }> {
  try {
    await requireAdmin()
    const admin = createAdminClient()
    const { error } = await admin.from('profiles').update({ ativo: false }).eq('id', userId)
    if (error) return { ok: false, erro: error.message }
    revalidatePath('/painel/config/operadores')
    return { ok: true }
  } catch (e) {
    return { ok: false, erro: e instanceof Error ? e.message : 'Erro ao inativar usuário.' }
  }
}

export async function reativarUsuarioAction(userId: string): Promise<{ ok: boolean; erro?: string }> {
  try {
    await requireAdmin()
    const admin = createAdminClient()
    const { error } = await admin.from('profiles').update({ ativo: true }).eq('id', userId)
    if (error) return { ok: false, erro: error.message }
    revalidatePath('/painel/config/operadores')
    return { ok: true }
  } catch (e) {
    return { ok: false, erro: e instanceof Error ? e.message : 'Erro ao reativar usuário.' }
  }
}

export async function cadastrarOperadorAction(params: {
  email: string
  senha: string
  nome: string
  username: string
  role: UserRole
  operador_id: number | null
}): Promise<{ ok: boolean; erro?: string }> {
  try {
    await requireAdmin()
    const { email, senha, nome, username, role, operador_id } = params
    if (!email || !senha || !nome || !username) return { ok: false, erro: 'Preencha todos os campos obrigatórios.' }
    if (senha.length < 6) return { ok: false, erro: 'Senha deve ter ao menos 6 caracteres.' }

    const admin = createAdminClient()

    const { data: authData, error: authError } = await admin.auth.admin.createUser({
      email,
      password: senha,
      email_confirm: true,
    })
    if (authError) return { ok: false, erro: authError.message }

    const userId = authData.user.id
    const { error: profileError } = await admin.from('profiles').insert({
      id: userId,
      email,
      nome,
      username,
      role,
      operador_id,
      ativo: true,
    })
    if (profileError) {
      await admin.auth.admin.deleteUser(userId)
      return { ok: false, erro: profileError.message }
    }

    await admin.from('user_credentials').upsert(
      { username, senha_atual: senha, updated_at: new Date().toISOString() },
      { onConflict: 'username' },
    )

    revalidatePath('/painel/config/operadores')
    return { ok: true }
  } catch (e) {
    return { ok: false, erro: e instanceof Error ? e.message : 'Erro ao cadastrar operador.' }
  }
}
