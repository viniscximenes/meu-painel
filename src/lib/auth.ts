import { redirect } from 'next/navigation'
import { createClient } from '@/lib/supabase/server'
import { createAdminClient } from '@/lib/supabase/admin'
import { Profile } from '@/types'

export async function getProfile(): Promise<Profile> {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()

  if (!user) redirect('/login')

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

// ── helpers de role ──────────────────────────────────────────────────────────

export function isGestor(profile: Profile): boolean {
  return profile.role === 'gestor'
}

export function isAdmin(profile: Profile): boolean {
  return profile.role === 'admin'
}

export function isAux(profile: Profile): boolean {
  return profile.role === 'aux'
}

// ── guards de rota ───────────────────────────────────────────────────────────

export async function requireGestor(): Promise<Profile> {
  const profile = await getProfile()
  if (profile.role !== 'gestor') redirect('/painel')
  return profile
}

export async function requireAdmin(): Promise<Profile> {
  const profile = await getProfile()
  if (profile.role !== 'admin') redirect('/painel')
  return profile
}

export async function requireAux(): Promise<Profile> {
  const profile = await getProfile()
  if (profile.role !== 'aux') redirect('/painel')
  return profile
}

export async function requireGestorOuAdmin(): Promise<Profile> {
  const profile = await getProfile()
  if (profile.role !== 'gestor' && profile.role !== 'admin') redirect('/painel')
  return profile
}

export async function requireOperadorOuAux(): Promise<Profile> {
  const profile = await getProfile()
  if (profile.role !== 'operador' && profile.role !== 'aux') redirect('/painel')
  return profile
}

export async function requireGestorAdminOuAux(): Promise<Profile> {
  const profile = await getProfile()
  if (profile.role !== 'gestor' && profile.role !== 'admin' && profile.role !== 'aux') redirect('/painel')
  return profile
}

export async function requireOperador(operadorId?: number): Promise<Profile> {
  const profile = await getProfile()
  if (profile.role === 'gestor' || profile.role === 'admin') return profile
  if (profile.role !== 'operador' && profile.role !== 'aux') redirect('/painel')
  if (operadorId !== undefined && profile.operador_id !== operadorId) {
    redirect('/painel')
  }
  return profile
}
