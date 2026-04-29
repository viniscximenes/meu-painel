import { requireGestorAdminOuAux } from '@/lib/auth'
import PainelShell from '@/components/PainelShell'
import { getPlanilhaAtiva } from '@/lib/sheets'
import { lerAbaABS } from '@/lib/abs-sheets'
import { OPERADORES_DISPLAY } from '@/lib/operadores'
import { AlertTriangle, CalendarDays } from 'lucide-react'
import ABSClient from './ABSClient'
import { inicializarABSAction } from './actions'
import { PainelHeader, LinhaHorizontalDourada } from '@/components/painel/PainelHeader'

const FF_SYNE = "'Syne', sans-serif"

export default async function ABSPage() {
  const profile = await requireGestorAdminOuAux()

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

  return (
    <PainelShell profile={profile} title="Controle de ABS" iconName="CalendarDays">
      <div className="space-y-6 regiao-cards-painel">

        {/* ── Header ── */}
        <PainelHeader
          titulo="CONTROLE DE ABS"
          mesLabel={mesAnoLabel}
          dataReferencia={hojeStr}
        />

        {/* ── Linha dourada ── */}
        <LinhaHorizontalDourada />

        {/* ── Sem planilha ── */}
        {!planilha && !erroSheets && (
          <div style={{
            textAlign: 'center',
            padding: '48px 0',
            fontFamily: FF_SYNE,
            fontSize: '14px',
            fontWeight: 600,
            color: '#474658',
          }}>
            Nenhuma planilha ativa configurada.
          </div>
        )}

        {/* ── Erro ── */}
        {erroSheets && (
          <div
            role="alert"
            style={{
              display: 'flex',
              alignItems: 'flex-start',
              gap: '12px',
              background: 'rgba(227,57,57,0.06)',
              border: '1px solid rgba(227,57,57,0.30)',
              borderRadius: '10px',
              padding: '14px 18px',
            }}
          >
            <AlertTriangle size={16} style={{ color: 'rgba(227,57,57,0.95)', flexShrink: 0, marginTop: '1px' }} />
            <div>
              <p style={{
                fontFamily: FF_SYNE, fontSize: '13px', fontWeight: 600,
                color: 'rgba(227,57,57,0.95)', margin: 0,
              }}>
                Erro ao carregar aba ABS
              </p>
              <p style={{
                fontFamily: FF_SYNE, fontSize: '11px', fontWeight: 600,
                color: 'rgba(227,57,57,0.75)', margin: '4px 0 0',
              }}>
                {erroSheets}
              </p>
            </div>
          </div>
        )}

        {/* ── Aba não inicializada ── */}
        {planilha && absData && !absData.initialized && (
          <div style={{
            background: 'rgba(255,185,34,0.06)',
            border: '1px solid rgba(255,185,34,0.30)',
            borderRadius: '10px',
            padding: '18px 22px',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'space-between',
            gap: '16px',
            flexWrap: 'wrap',
          }}>
            <div style={{ display: 'flex', alignItems: 'flex-start', gap: '12px' }}>
              <CalendarDays size={18} style={{ color: '#FFB922', flexShrink: 0, marginTop: 1 }} />
              <div>
                <p style={{
                  fontFamily: FF_SYNE, fontSize: '13px', fontWeight: 600,
                  textTransform: 'uppercase', color: '#FFB922', margin: 0,
                }}>
                  ABA ABS NÃO INICIALIZADA
                </p>
                <p style={{
                  fontFamily: FF_SYNE, fontSize: '11px', fontWeight: 600,
                  color: 'rgba(255,185,34,0.75)', margin: '4px 0 0',
                }}>
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
                  fontFamily: FF_SYNE,
                  fontSize: '11px',
                  fontWeight: 600,
                  textTransform: 'uppercase',
                  letterSpacing: '0.06em',
                  color: '#FFB922',
                  background: 'rgba(255,185,34,0.10)',
                  border: '1px solid rgba(255,185,34,0.50)',
                  borderRadius: '8px',
                  padding: '8px 18px',
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
