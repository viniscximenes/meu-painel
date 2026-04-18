'use server'

import { requireAdmin } from '@/lib/auth'
import { createAdminClient } from '@/lib/supabase/admin'
import { UserRole } from '@/types'
import { revalidatePath } from 'next/cache'

export async function redefinirSenhaAction(
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

    await admin
      .from('user_credentials')
      .upsert({ username, senha_atual: novaSenha, updated_at: new Date().toISOString() }, { onConflict: 'username' })

    revalidatePath('/painel/config')
    return { ok: true }
  } catch (e) {
    console.error('[redefinirSenhaAction]', e)
    return { ok: false, erro: e instanceof Error ? e.message : 'Erro ao redefinir senha.' }
  }
}

export async function atualizarRoleSkillsAction(
  userId: string,
  role: UserRole,
  skills: string[],
): Promise<{ ok: boolean; erro?: string }> {
  try {
    await requireAdmin()
    const admin = createAdminClient()

    const { error } = await admin.from('profiles').update({ role, skills }).eq('id', userId)
    if (error) return { ok: false, erro: error.message }

    revalidatePath('/painel/config')
    return { ok: true }
  } catch (e) {
    console.error('[atualizarRoleSkillsAction]', e)
    return { ok: false, erro: e instanceof Error ? e.message : 'Erro ao atualizar perfil.' }
  }
}
