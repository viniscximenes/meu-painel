'use server'

import { revalidatePath } from 'next/cache'
import { redirect } from 'next/navigation'
import { createClient } from '@/lib/supabase/server'

export async function login(formData: FormData) {
  const supabase = await createClient()

  const username = (formData.get('username') as string).trim().toLowerCase()
  const password = formData.get('password') as string

  // Supabase Auth usa email internamente; o username vira username@painel.app
  const email = `${username}@painel.app`

  const { error } = await supabase.auth.signInWithPassword({ email, password })

  if (error) {
    return { error: 'Usuário ou senha inválidos. Verifique suas credenciais.' }
  }

  revalidatePath('/', 'layout')
  redirect('/painel')
}

export async function logout() {
  const supabase = await createClient()
  await supabase.auth.signOut()
  revalidatePath('/', 'layout')
  redirect('/login')
}
