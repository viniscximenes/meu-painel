import { redirect } from 'next/navigation'
import { createClient } from '@/lib/supabase/server'
import { createAdminClient } from '@/lib/supabase/admin'
import { Profile } from '@/types'

export async function getProfile(): Promise<Profile> {
  // 1. Verifica sessão com o client normal (lê cookie)
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()

  if (!user) redirect('/login')

  // 2. Busca o profile com o admin client (bypassa RLS)
  //    Necessário porque a policy "Gestor lê todos" é recursiva
  //    e causa abort silencioso no Supabase.
  const admin = createAdminClient()
  const { data: profile, error } = await admin
    .from('profiles')
    .select('*')
    .eq('id', user.id)
    .single()

  if (error || !profile) {
    console.error('[getProfile] não encontrou perfil para', user.email, error?.message)
    redirect('/login?erro=perfil')
  }

  return profile as Profile
}

export async function requireGestor(): Promise<Profile> {
  const profile = await getProfile()
  if (profile.role !== 'gestor') redirect('/painel')
  return profile
}

export async function requireOperador(operadorId?: number): Promise<Profile> {
  const profile = await getProfile()
  if (profile.role === 'gestor') return profile
  if (profile.role !== 'operador') redirect('/painel')
  if (operadorId !== undefined && profile.operador_id !== operadorId) {
    redirect('/painel')
  }
  return profile
}
