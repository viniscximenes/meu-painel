import { requireGestor } from '@/lib/auth'
import PainelShell from '@/components/PainelShell'
import { getPlanilhaAtiva } from '@/lib/sheets'
import { lerAbaABS } from '@/lib/abs-sheets'
import type { ABSSheetData } from '@/lib/abs-utils'
import { OPERADORES_DISPLAY } from '@/lib/operadores'
import { AlertTriangle, CalendarDays } from 'lucide-react'
import ABSClient from './ABSClient'
import { inicializarABSAction } from './actions'

export default async function ABSPage() {
  const profile = await requireGestor()

  const planilha = await getPlanilhaAtiva().catch(() => null)

  const hoje = new Date()
  const mesAtual = hoje.getMonth() + 1
  const anoAtual = hoje.getFullYear()
  const hojeStr = `${String(hoje.getDate()).padStart(2, '0')}/${String(mesAtual).padStart(2, '0')}`
  const mesAnoLabel = hoje.toLocaleDateString('pt-BR', { month: 'long', year: 'numeric' }).toUpperCase()

  let absData = null
  let erroSheets: string | null = null

  if (planilha) {
    try {
      absData = await lerAbaABS(planilha.spreadsheet_id)
    } catch (e) {
      erroSheets = e instanceof Error ? e.message : 'Erro ao ler aba ABS'
    }
  }

  const operadores = OPERADORES_DISPLAY.map((op) => ({
    id: op.id,
    nome: op.nome,
    username: op.username,
  }))

  const cssVars = {
    '--void2': '#07070f',
    '--void3': '#0d0d1a',
  } as React.CSSProperties

  return (
    <PainelShell profile={profile} title="Controle de ABS" iconName="CalendarDays">
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
              Controle de ABS
            </span>

            <div style={{ width: '1px', height: '16px', background: 'rgba(201,168,76,0.2)', flexShrink: 0 }} />

            <span style={{ fontSize: '11px', textTransform: 'uppercase', letterSpacing: '0.06em', color: 'var(--text-muted)' }}>
              {mesAnoLabel}
            </span>

            <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
              <div
                className="animate-pulse"
                style={{ width: '6px', height: '6px', borderRadius: '50%', background: '#10b981', flexShrink: 0 }}
              />
              <span style={{ fontSize: '11px', color: 'var(--text-muted)' }}>
                Hoje: <strong style={{ color: 'var(--text-secondary)', fontWeight: 600 }}>{hojeStr}</strong>
              </span>
            </div>
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
              <p className="text-sm font-medium text-rose-300">Erro ao carregar aba ABS</p>
              <p className="text-xs mt-0.5 text-rose-500">{erroSheets}</p>
            </div>
          </div>
        )}

        {/* ── Aba não inicializada ── */}
        {planilha && absData && !absData.initialized && (
          <div style={{
            background: 'rgba(245,158,11,0.06)',
            border: '1px solid rgba(245,158,11,0.2)',
            borderRadius: '12px',
            padding: '20px 24px',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'space-between',
            gap: '16px',
            flexWrap: 'wrap',
          }}>
            <div style={{ display: 'flex', alignItems: 'flex-start', gap: '10px' }}>
              <CalendarDays size={18} style={{ color: '#f59e0b', flexShrink: 0, marginTop: 1 }} />
              <div>
                <p style={{ fontSize: '13px', fontWeight: 600, color: '#fbbf24' }}>
                  Aba ABS não inicializada
                </p>
                <p style={{ fontSize: '11px', color: 'rgba(251,191,36,0.7)', marginTop: '3px' }}>
                  Clique em "Inicializar mês" para criar a aba com todos os dias úteis de {mesAnoLabel}.
                </p>
              </div>
            </div>
            <form action={async () => {
              'use server'
              await inicializarABSAction(mesAtual, anoAtual)
            }}>
              <button
                type="submit"
                style={{
                  padding: '8px 18px',
                  borderRadius: '8px',
                  border: '1px solid rgba(245,158,11,0.4)',
                  background: 'rgba(245,158,11,0.12)',
                  color: '#fbbf24',
                  fontSize: '12px',
                  fontWeight: 600,
                  cursor: 'pointer',
                }}
              >
                Inicializar mês
              </button>
            </form>
          </div>
        )}

        {/* ── Tabela interativa ── */}
        {planilha && absData?.initialized && (
          <ABSClient
            data={absData}
            operadores={operadores}
            hoje={hojeStr}
          />
        )}

      </div>
    </PainelShell>
  )
}
