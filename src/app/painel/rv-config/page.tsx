import { requireGestor } from '@/lib/auth'
import PainelShell from '@/components/PainelShell'
import { getRVConfigRaw } from '@/lib/rv'
import { getMetas } from '@/lib/kpi'
import RVConfigForm from './RVConfigForm'
import { SlidersHorizontal } from 'lucide-react'
import Link from 'next/link'

export default async function RVConfigPage() {
  const profile = await requireGestor()
  const [raw, metas] = await Promise.all([getRVConfigRaw(), getMetas()])

  return (
    <PainelShell profile={profile} title="Configurar RV">
      <div className="space-y-6 max-w-2xl">

        {/* Header */}
        <div className="flex items-start justify-between flex-wrap gap-4">
          <div>
            <h2
              className="text-2xl font-extrabold"
              style={{
                background: 'linear-gradient(135deg, var(--gold-bright) 0%, var(--gold-light) 100%)',
                WebkitBackgroundClip: 'text',
                WebkitTextFillColor: 'transparent',
                backgroundClip: 'text',
                letterSpacing: '-0.02em',
              }}
            >
              Regras de RV
            </h2>
            <p className="text-sm mt-1" style={{ color: 'var(--text-muted)' }}>
              Configure critérios de elegibilidade, faixas de prêmio e colunas da planilha.
            </p>
          </div>
          <Link href="/painel/rv-equipe" className="btn-secondary flex items-center gap-2 text-sm">
            <SlidersHorizontal size={14} />
            Ver RV da Equipe
          </Link>
        </div>

        {/* Formulário */}
        <RVConfigForm raw={raw} metas={metas} />
      </div>
    </PainelShell>
  )
}
