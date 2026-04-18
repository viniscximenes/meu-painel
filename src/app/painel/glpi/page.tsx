import { requireGestor } from '@/lib/auth'
import PainelShell from '@/components/PainelShell'
import { getPlanilhaAtiva } from '@/lib/sheets'
import { buscarGLPIs, type GLPIItem } from '@/lib/glpi'
import { AlertTriangle } from 'lucide-react'
import GLPIClient from './GLPIClient'

export default async function GLPIPage() {
  const profile  = await requireGestor()
  const planilha = await getPlanilhaAtiva().catch(() => null)

  const mesAnoLabel = new Date()
    .toLocaleDateString('pt-BR', { month: 'long', year: 'numeric' })
    .toUpperCase()

  let glpis: GLPIItem[] = []
  let erroSheets: string | null = null

  if (planilha) {
    try {
      glpis = await buscarGLPIs(planilha.spreadsheet_id)
    } catch (e) {
      erroSheets = e instanceof Error ? e.message : 'Erro ao ler aba GLPI'
    }
  }

  const cssVars = {
    '--void2': '#07070f',
    '--void3': '#0d0d1a',
  } as React.CSSProperties

  return (
    <PainelShell profile={profile} title="GLPI" iconName="Ticket">
      <div style={cssVars} className="space-y-6">

        {/* ── Linha dourada ── */}
        <div style={{
          height: '1px',
          background: 'linear-gradient(90deg, transparent 0%, #c9a84c 25%, #e8c96d 50%, #c9a84c 75%, transparent 100%)',
        }} />

        {/* ── Header ── */}
        <div style={{
          background: 'var(--void2)',
          border: '1px solid rgba(201,168,76,0.1)',
          borderRadius: '14px',
          padding: '14px 20px',
          display: 'flex',
          alignItems: 'center',
          gap: '16px',
          flexWrap: 'wrap',
          justifyContent: 'space-between',
        }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '14px', flexWrap: 'wrap' }}>
            <span style={{
              fontFamily: 'var(--ff-display)',
              fontSize: '16px',
              fontWeight: 700,
              textTransform: 'uppercase',
              letterSpacing: '0.06em',
              background: 'linear-gradient(135deg, #e8c96d 0%, #c9a84c 100%)',
              WebkitBackgroundClip: 'text',
              WebkitTextFillColor: 'transparent',
              backgroundClip: 'text',
            }}>
              Chamados GLPI
            </span>

          </div>

          {planilha && (
            <span style={{ fontSize: '10px', color: 'var(--text-muted)', letterSpacing: '0.05em' }}>
              {planilha.nome}
            </span>
          )}
        </div>

        {/* ── Sem planilha ── */}
        {!planilha && !erroSheets && (
          <div className="text-center py-12" style={{ color: 'var(--text-muted)', fontSize: '14px' }}>
            Nenhuma planilha ativa configurada.
          </div>
        )}

        {/* ── Erro ── */}
        {erroSheets && (
          <div className="flex items-start gap-3 rounded-xl border px-4 py-3"
            style={{ background: 'rgba(239,68,68,0.05)', borderColor: 'rgba(239,68,68,0.2)' }}>
            <AlertTriangle size={15} className="text-rose-400 shrink-0 mt-0.5" />
            <div>
              <p className="text-sm font-medium text-rose-300">Erro ao carregar aba GLPI</p>
              <p className="text-xs mt-0.5 text-rose-500">{erroSheets}</p>
            </div>
          </div>
        )}

        {/* ── Conteúdo ── */}
        {planilha && !erroSheets && (
          <GLPIClient glpis={glpis} />
        )}

      </div>
    </PainelShell>
  )
}
