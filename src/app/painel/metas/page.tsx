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
        <div className="flex items-start gap-3">
          <div
            className="p-2.5 rounded-xl shrink-0"
            style={{ background: 'var(--gold-dim)', color: 'var(--gold-light)' }}
          >
            <Target size={18} />
          </div>
          <div>
            <h2 style={{
              fontFamily: 'var(--ff-display)',
              fontSize: '20px',
              fontWeight: 700,
              color: 'var(--text-primary)',
              letterSpacing: '-0.02em',
            }}>
              Configuração de Metas
            </h2>
            <p style={{ color: 'var(--text-muted)', fontSize: '13px', marginTop: '4px' }}>
              Defina as metas para cada coluna da planilha. As cores dos KPIs são calculadas automaticamente.
            </p>
          </div>
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
          <div className="card p-4 flex items-center gap-3 flex-wrap">
            <div className="flex-1 flex items-center gap-2 flex-wrap">
              <span style={{ color: 'var(--text-muted)', fontSize: '12px' }}>Planilha ativa:</span>
              <span style={{
                background: 'var(--gold-dim)',
                color: 'var(--gold-light)',
                border: '1px solid rgba(201,168,76,0.3)',
                borderRadius: '20px',
                padding: '2px 10px',
                fontSize: '11px',
                fontWeight: 600,
              }}>
                {planilha.nome}
              </span>
              {planilha.aba && (
                <span style={{ color: 'var(--text-muted)', fontSize: '11px' }}>
                  · aba: <span style={{ color: 'var(--text-secondary)' }}>{planilha.aba}</span>
                </span>
              )}
              <span style={{ color: 'var(--text-muted)', fontSize: '11px' }}>
                · {headers.length} colunas
              </span>
            </div>
            <Link
              href="/painel/config"
              className="btn-secondary"
              style={{ fontSize: '11px', padding: '4px 12px' }}
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
