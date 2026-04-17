import { redirect } from 'next/navigation'
import { getProfile } from '@/lib/auth'

export default async function PainelPage() {
  const profile = await getProfile()

  if (profile.role === 'gestor')   redirect('/painel/kpis-equipe')
  if (profile.role === 'operador') redirect('/painel/meu-diario')

  redirect('/login')
}
