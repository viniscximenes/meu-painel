import { redirect } from 'next/navigation'
import { getProfile } from '@/lib/auth'

export default async function PainelPage() {
  const profile = await getProfile()

  if (profile.role === 'gestor')   redirect('/painel/gestor/meu-kpi')
  if (profile.role === 'admin')    redirect('/painel/meu-kpi')
  if (profile.role === 'aux')      redirect('/painel/meu-kpi')
  if (profile.role === 'operador') redirect('/painel/meu-kpi')

  redirect('/login')
}
