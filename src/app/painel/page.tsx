import { redirect } from 'next/navigation'
import { getProfile } from '@/lib/auth'
import PainelShell from '@/components/PainelShell'
import PainelGestor from './PainelGestor'
import PainelOperador from './PainelOperador'

export default async function PainelPage() {
  const profile = await getProfile()

  if (profile.role === 'gestor') {
    return (
      <PainelShell profile={profile} title="Visão Geral">
        <PainelGestor profile={profile} />
      </PainelShell>
    )
  }

  if (profile.role === 'operador') {
    return (
      <PainelShell profile={profile} title="Meu Painel">
        <PainelOperador profile={profile} />
      </PainelShell>
    )
  }

  redirect('/login')
}
