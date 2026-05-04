import { requireAdmin } from '@/lib/auth'
import { getMetas, getMetasOperadorConfig, getMetasGestorConfig } from '@/lib/kpi'
import { isMetaPrincipal } from '@/lib/kpi-utils'
import PainelShell from '@/components/PainelShell'
import { PainelHeader, LinhaHorizontalDourada } from '@/components/painel/PainelHeader'
import { PainelSectionTitle } from '@/components/painel/PainelSectionTitle'
import MetasOperadorBloco from '@/components/kpi/MetasOperadorBloco'
import MetasGestorBloco from '@/components/kpi/MetasGestorBloco'
import MetasForm from '@/components/kpi/MetasForm'

export const dynamic = 'force-dynamic'

const FF_DM = 'var(--ff-body)'

export default async function MetasPage() {
  const profile = await requireAdmin()
  const [todasMetas, opConfigs, gestorConfigs] = await Promise.all([
    getMetas(), getMetasOperadorConfig(), getMetasGestorConfig(),
  ])

  // Filtra metas que correspondem aos 6 KPIs principais — gerenciados por metas_operador_config
  const metasComplementares = todasMetas.filter(m => !isMetaPrincipal(m))

  const mesLabel = `${metasComplementares.length} META${metasComplementares.length !== 1 ? 'S' : ''} COMPLEMENTAR${metasComplementares.length !== 1 ? 'ES' : ''}`

  return (
    <PainelShell profile={profile} title="Ajuste de KPI" iconName="Settings">
      <div className="space-y-8 regiao-cards-painel">
        <PainelHeader titulo="AJUSTE DE KPI" mesLabel={mesLabel} />
        <LinhaHorizontalDourada />

        {/* Bloco 1 — 6 KPIs principais estruturados */}
        <section>
          <div style={{ marginBottom: '12px' }}>
            <PainelSectionTitle>METAS OPERADOR</PainelSectionTitle>
          </div>
          <p style={{
            fontFamily: FF_DM, fontSize: '12px', color: '#72708F',
            maxWidth: '720px', marginBottom: '24px', lineHeight: 1.6,
          }}>
            Defina os limiares de cada KPI principal. Os limiares determinam quando o status do operador
            fica <strong style={{ color: 'rgba(106,196,73,0.95)' }}>VERDE</strong>,{' '}
            <strong style={{ color: '#FFB922' }}>AMARELO</strong> ou{' '}
            <strong style={{ color: 'rgba(227,57,57,0.95)' }}>VERMELHO</strong> no painel.
            Para PEDIDOS e CHURN, configure a coluna do KPI CONSOLIDADO que contém a meta individual de cada operador.
          </p>
          <MetasOperadorBloco configs={opConfigs} />
        </section>

        {/* Bloco 2 — KPIs do Gestor */}
        <section>
          <div style={{ marginBottom: '12px' }}>
            <PainelSectionTitle>METAS GESTOR</PainelSectionTitle>
          </div>
          <p style={{
            fontFamily: FF_DM, fontSize: '12px', color: '#72708F',
            maxWidth: '720px', marginBottom: '24px', lineHeight: 1.6,
          }}>
            Defina os limiares usados no painel do gestor. Para CHURN, configure a coluna da aba{' '}
            <strong style={{ color: '#A6A2A2' }}>KPI GESTOR</strong> que contém a meta individual de cada gestor.
          </p>
          <MetasGestorBloco configs={gestorConfigs} />
        </section>

        {/* Bloco 4 — Metas dos 14 KPIs secundários */}
        <section>
          <div style={{ marginBottom: '12px' }}>
            <PainelSectionTitle contador={metasComplementares.length}>METAS COMPLEMENTARES</PainelSectionTitle>
          </div>
          <p style={{
            fontFamily: FF_DM, fontSize: '12px', color: '#72708F',
            maxWidth: '720px', marginBottom: '20px', lineHeight: 1.6,
          }}>
            Configure metas para os KPIs secundários da planilha.
            O limiar amarelo é calculado automaticamente em 80% do valor verde.
          </p>
          <MetasForm metas={metasComplementares} />
        </section>
      </div>
    </PainelShell>
  )
}
