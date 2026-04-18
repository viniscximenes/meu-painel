import { getProfile } from '@/lib/auth'
import { redirect } from 'next/navigation'
import PainelShell from '@/components/PainelShell'
import { User } from 'lucide-react'

export default async function MeusDadosPage() {
  const profile = await getProfile()

  if (profile.role === 'gestor') redirect('/painel')

  return (
    <PainelShell profile={profile} title="Meus Dados Gerais" iconName="User">
      <div className="flex flex-col items-center justify-center min-h-[60vh] gap-6">
        <div
          className="w-16 h-16 rounded-2xl flex items-center justify-center"
          style={{ background: 'rgba(201,168,76,0.08)', border: '1px solid rgba(201,168,76,0.15)' }}
        >
          <User size={28} style={{ color: 'var(--gold)' }} />
        </div>
        <div className="text-center">
          <h1
            className="text-2xl font-bold mb-2"
            style={{
              background: 'linear-gradient(135deg, #e8c96d 0%, #c9a84c 100%)',
              WebkitBackgroundClip: 'text',
              WebkitTextFillColor: 'transparent',
              fontFamily: 'var(--ff-display)',
            }}
          >
            Meus Dados Gerais
          </h1>
          <p style={{ color: 'var(--text-muted)', fontSize: '14px' }}>Em breve</p>
        </div>
      </div>
    </PainelShell>
  )
}
