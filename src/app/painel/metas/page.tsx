import { requireGestor } from '@/lib/auth'
import { getMetas } from '@/lib/kpi'
import { getPlanilhaAtiva, buscarLinhasPlanilha } from '@/lib/sheets'
import PainelShell from '@/components/PainelShell'
import MetasForm from '@/components/kpi/MetasForm'
import { Target, AlertCircle } from 'lucide-react'
import Link from 'next/link'

export default async function MetasPage() {
  const profile = await requireGestor()

  const [metas, planilha] = await Promise.all([getMetas(), getPlanilhaAtiva()])

  let headers: string[] = []
  if (planilha) {
    const { headers: h } = await buscarLinhasPlanilha(planilha.spreadsheet_id, planilha.aba)
    headers = h
  }

  return (
    <PainelShell profile={profile} title="Metas KPI">
      <div className="max-w-2xl space-y-6">
        {/* Header */}
        <div>
          <h2 className="text-xl font-bold flex items-center gap-2" style={{ color: 'var(--text-primary)' }}>
            <Target size={20} style={{ color: 'var(--gold)' }} />
            Configuração de Metas
          </h2>
          <p className="text-sm mt-1" style={{ color: 'var(--text-muted)' }}>
            Defina as metas para cada coluna da planilha. As cores dos KPIs são calculadas automaticamente.
          </p>
        </div>

        {/* Aviso sem planilha */}
        {!planilha && (
          <div
            className="flex items-start gap-3 rounded-xl border px-4 py-3"
            style={{ background: 'rgba(245,158,11,0.05)', borderColor: 'rgba(245,158,11,0.2)' }}
          >
            <AlertCircle size={15} className="text-amber-400 shrink-0 mt-0.5" />
            <div>
              <p className="text-sm font-medium text-amber-300">Nenhuma planilha ativa</p>
              <p className="text-xs mt-0.5 text-amber-500">
                Configure a{' '}
                <Link href="/painel/config" className="underline hover:text-amber-300">planilha ativa</Link>
                {' '}para ver os cabeçalhos disponíveis.
              </p>
            </div>
          </div>
        )}

        {/* Info sobre a planilha ativa */}
        {planilha && (
          <div
            className="flex items-center gap-3 rounded-xl border px-4 py-3"
            style={{ background: 'var(--bg-elevated)', borderColor: 'rgba(201,168,76,0.10)' }}
          >
            <div className="flex-1">
              <p className="text-xs" style={{ color: 'var(--text-muted)' }}>
                Planilha ativa:{' '}
                <strong style={{ color: 'var(--text-primary)' }}>{planilha.nome}</strong>
                {planilha.aba && (
                  <> · Aba: <strong style={{ color: 'var(--text-secondary)' }}>{planilha.aba}</strong></>
                )}
                {' · '}{headers.length} colunas disponíveis
              </p>
            </div>
            <Link
              href="/painel/config"
              className="text-xs transition-colors hover:opacity-75"
              style={{ color: 'var(--gold-light)' }}
            >
              Trocar planilha
            </Link>
          </div>
        )}

        {/* Formulário */}
        <MetasForm metas={metas} headers={headers} />
      </div>
    </PainelShell>
  )
}
