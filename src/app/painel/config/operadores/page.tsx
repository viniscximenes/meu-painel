import { requireAdmin } from '@/lib/auth'
import { createAdminClient } from '@/lib/supabase/admin'
import PainelShell from '@/components/PainelShell'
import { PainelHeader, LinhaHorizontalDourada } from '@/components/painel/PainelHeader'
import OperadoresConfigClient, { type UsuarioInfo } from './OperadoresConfigClient'

export const dynamic = 'force-dynamic'

export default async function OperadoresConfigPage() {
  const profile = await requireAdmin()
  const admin = createAdminClient()

  const [profilesRes, credenciaisRes] = await Promise.all([
    admin.from('profiles').select('id, nome, username, email, role, operador_id, ativo').order('nome'),
    admin.from('user_credentials').select('username, senha_atual'),
  ])

  const credMap: Record<string, string> = {}
  for (const c of credenciaisRes.data ?? []) {
    credMap[c.username] = c.senha_atual
  }

  const usuarios: UsuarioInfo[] = (profilesRes.data ?? []).map(p => ({
    id:          p.id,
    nome:        p.nome,
    username:    p.username,
    email:       p.email,
    role:        p.role,
    operador_id: p.operador_id,
    ativo:       p.ativo ?? true,
    senha_atual: credMap[p.username] ?? null,
  }))

  const nAtivos = usuarios.filter(u => u.ativo).length
  const mesLabel = `${nAtivos} USUÁRIO${nAtivos !== 1 ? 'S' : ''} ATIVO${nAtivos !== 1 ? 'S' : ''}`

  return (
    <PainelShell profile={profile} title="Ajuste de Operadores" iconName="Settings">
      <div className="space-y-6 regiao-cards-painel">
        <PainelHeader titulo="AJUSTE DE OPERADORES" mesLabel={mesLabel} />
        <LinhaHorizontalDourada />
        <OperadoresConfigClient usuarios={usuarios} />
      </div>
    </PainelShell>
  )
}
