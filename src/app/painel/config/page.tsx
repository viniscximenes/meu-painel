import { requireAdmin } from '@/lib/auth'
import { listarPlanilhas } from '@/lib/sheets'
import { getAppConfig } from '@/lib/app-config'
import { getRVGestorConfigRaw } from '@/lib/rv-gestor'
import { createAdminClient } from '@/lib/supabase/admin'
import { listarTodosLinks } from '@/lib/links'
import { listarTodasMascaras } from '@/lib/mascaras'
import PainelShell from '@/components/PainelShell'
import PlanilhasClient from './PlanilhasClient'
import KPIConsolidadoConfigClient from './KPIConsolidadoConfigClient'
import RVGestorConfigClient from './RVGestorConfigClient'
import UsuariosClient, { type UserInfo } from './UsuariosClient'
import LinksConfigClient from './LinksConfigClient'
import MascarasConfigClient from './MascarasConfigClient'
import { Database, TrendingUp, Users, Link2, ClipboardCopy } from 'lucide-react'
import { OPERADORES } from '@/lib/operadores'

export default async function ConfigPage() {
  const profile = await requireAdmin()
  const admin = createAdminClient()

  const [planilhas, limiteRaw, gestorConfigRaw, profilesRes, credenciaisRes, todosLinks, todasMascaras] = await Promise.all([
    listarPlanilhas(),
    getAppConfig('kpi_consolidado_limite_linhas'),
    getRVGestorConfigRaw(),
    admin.from('profiles').select('id, nome, username, email, role, operador_id, skills').order('nome'),
    admin.from('user_credentials').select('username, senha_atual'),
    listarTodosLinks().catch(() => []),
    listarTodasMascaras().catch(() => []),
  ])

  const limiteLinhas = limiteRaw ? parseInt(limiteRaw, 10) : 50

  const credMap: Record<string, string> = {}
  for (const c of credenciaisRes.data ?? []) {
    credMap[c.username] = c.senha_atual
  }

  const usuarios: UserInfo[] = (profilesRes.data ?? []).map((p) => {
    const op = OPERADORES.find(o => o.id === p.operador_id)
    return {
      id:          p.id,
      nome:        p.nome,
      username:    p.username,
      email:       p.email,
      role:        p.role,
      operador_id: p.operador_id,
      skills:      p.skills ?? op?.skills ?? ['OP'],
      senha_atual: credMap[p.username] ?? null,
    }
  })

  return (
    <PainelShell profile={profile} title="Configurações">
      <div className="max-w-5xl space-y-10">

        {/* ── Gerenciar Usuários ── */}
        <div className="space-y-6">
          <div>
            <h2 className="text-xl font-bold flex items-center gap-2" style={{ color: 'var(--text-primary)' }}>
              <Users size={20} style={{ color: 'var(--gold)' }} />
              Gerenciar Usuários
            </h2>
            <p className="text-sm mt-1" style={{ color: 'var(--text-muted)' }}>
              Visualize e edite senhas, roles e skills de todos os usuários.
            </p>
          </div>
          <UsuariosClient usuarios={usuarios} />
        </div>

        <div className="divider" />

        {/* ── Planilhas ── */}
        <div className="space-y-6">
          <div>
            <h2 className="text-xl font-bold flex items-center gap-2" style={{ color: 'var(--text-primary)' }}>
              <Database size={20} style={{ color: 'var(--gold)' }} />
              Planilhas Cadastradas
            </h2>
            <p className="text-sm mt-1" style={{ color: 'var(--text-muted)' }}>
              Cada planilha representa um período (ex: ABRIL.2026). Apenas uma pode estar ativa por vez.
            </p>
          </div>
          <PlanilhasClient planilhas={planilhas} />
        </div>

        <div className="divider" />

        {/* ── KPI Consolidado ── */}
        <KPIConsolidadoConfigClient limiteInicial={limiteLinhas} />

        <div className="divider" />

        {/* ── RV Gestor ── */}
        <div className="space-y-6">
          <div>
            <h2 className="text-xl font-bold flex items-center gap-2" style={{ color: 'var(--text-primary)' }}>
              <TrendingUp size={20} style={{ color: 'var(--gold)' }} />
              RV Gestor
            </h2>
            <p className="text-sm mt-1" style={{ color: 'var(--text-muted)' }}>
              Faixas, metas operacionais, bônus e deflatores do cálculo de RV do gestor.
            </p>
          </div>
          <RVGestorConfigClient raw={gestorConfigRaw} />
        </div>

        <div className="divider" />

        {/* ── Links ── */}
        <div className="space-y-6">
          <div>
            <h2 className="text-xl font-bold flex items-center gap-2" style={{ color: 'var(--text-primary)' }}>
              <Link2 size={20} style={{ color: 'var(--gold)' }} />
              Links
            </h2>
            <p className="text-sm mt-1" style={{ color: 'var(--text-muted)' }}>
              Gerencie os links exibidos na página de Links para todos os usuários.
            </p>
          </div>
          <LinksConfigClient links={todosLinks} />
        </div>

        <div className="divider" />

        {/* ── Máscaras ── */}
        <div className="space-y-6">
          <div>
            <h2 className="text-xl font-bold flex items-center gap-2" style={{ color: 'var(--text-primary)' }}>
              <ClipboardCopy size={20} style={{ color: 'var(--gold)' }} />
              Máscaras
            </h2>
            <p className="text-sm mt-1" style={{ color: 'var(--text-muted)' }}>
              Gerencie os textos prontos para abertura de chamados no AIR.
            </p>
          </div>
          <MascarasConfigClient mascaras={todasMascaras} />
        </div>

      </div>
    </PainelShell>
  )
}
