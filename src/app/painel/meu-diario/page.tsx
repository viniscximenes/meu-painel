import { getProfile } from '@/lib/auth'
import { redirect } from 'next/navigation'
import {
  buscarDiarioAtivo,
  filtrarPorOperador,
  totalPausasJustificadas,
  totalForaJornada,
  contarComGLPI,
  formatTempo,
  TIPOS_REGISTRO,
} from '@/lib/diario'
import PainelShell from '@/components/PainelShell'
import MeuDiarioClient from './MeuDiarioClient'
import type { MeuDiarioProps, RegistroExibir } from './MeuDiarioClient'
import { AlertTriangle } from 'lucide-react'

export const dynamic = 'force-dynamic'

const cssVars = { '--void2': '#07070f', '--void3': '#0d0d1a' } as React.CSSProperties

const DOW_PT = ['Dom', 'Seg', 'Ter', 'Qua', 'Qui', 'Sex', 'Sáb']
const MES_PT = ['jan', 'fev', 'mar', 'abr', 'mai', 'jun', 'jul', 'ago', 'set', 'out', 'nov', 'dez']

function formatDataFmt(dataObj: Date | null, dataRaw: string): string {
  if (!dataObj) return dataRaw
  return `${DOW_PT[dataObj.getDay()]}, ${dataObj.getDate()} ${MES_PT[dataObj.getMonth()]}`
}

export default async function MeuDiarioPage() {
  const profile = await getProfile()
  if (profile.role === 'gestor') redirect('/painel')

  const agora    = new Date()
  const mesAtual = agora.getMonth() + 1
  const anoAtual = agora.getFullYear()
  const mesLabel = agora.toLocaleDateString('pt-BR', { month: 'long', year: 'numeric' }).toUpperCase()

  let dadosProps: MeuDiarioProps | null = null
  let erroSheets: string | null = null

  try {
    const { registros: todos } = await buscarDiarioAtivo()

    // Filtrar pelo operador logado + mês atual
    const meus  = filtrarPorOperador(todos, profile.username, profile.nome)
    const doMes = meus.filter(r =>
      r.dataObj &&
      r.dataObj.getMonth() + 1 === mesAtual &&
      r.dataObj.getFullYear() === anoAtual
    )

    // Estatísticas
    const totalPausasMin = totalPausasJustificadas(doMes)

    // "Fora da jornada": valor ≥ 240min → salvo como tempo logado bruto → déficit = 380 − valor
    //                    valor < 240min → já salvo como déficit → usar diretamente
    const LIMIAR_BRUTO_MIN = 240
    const JORNADA_MIN      = 380
    const totalForaJornadaMin = doMes
      .filter(r => r.tipo === 'Fora da jornada' && r.tempoMin > 0 && r.tempoMin < JORNADA_MIN)
      .reduce((acc, r) => acc + (r.tempoMin >= LIMIAR_BRUTO_MIN ? JORNADA_MIN - r.tempoMin : r.tempoMin), 0)

    const totalComGlpi = contarComGLPI(doMes)

    // Distribuição por tipo (só tipos com registros, ordenados por count desc)
    const porTipo = [...TIPOS_REGISTRO]
      .map(tipo => ({ tipo, count: doMes.filter(r => r.tipo === tipo).length }))
      .filter(x => x.count > 0)
      .sort((a, b) => b.count - a.count)

    // Registros formatados para exibição (mais recente primeiro)
    const registros: RegistroExibir[] = doMes.map(r => ({
      tipo:        r.tipo,
      observacoes: r.observacoes,
      glpi:        r.glpi,
      tempoMin:    r.tempoMin,
      tempoFmt:    r.tempoMin > 0 ? formatTempo(r.tempoMin) : '',
      data:        r.data,
      dataFmt:     formatDataFmt(r.dataObj, r.data),
    }))

    dadosProps = {
      nomeOperador:        profile.nome,
      mesLabel,
      totalRegistros:      doMes.length,
      totalPausasMin,
      totalForaJornadaMin,
      totalComGlpi,
      porTipo,
      registros,
    }
  } catch (e) {
    erroSheets = e instanceof Error ? e.message : 'Erro desconhecido'
  }

  return (
    <PainelShell profile={profile} title="Meu Diário" iconName="BookOpen">
      <div style={cssVars} className="space-y-4">
        <GoldLine />

        {/* Header */}
        <div style={{
          background: 'var(--void2)',
          border: '1px solid rgba(201,168,76,0.1)',
          borderRadius: '14px',
          padding: '14px 20px',
          display: 'flex',
          alignItems: 'center',
          gap: '16px',
          flexWrap: 'wrap',
        }}>
          <span style={{
            fontFamily: 'var(--ff-display)',
            fontSize: '16px', fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.06em',
            background: 'linear-gradient(135deg, #e8c96d 0%, #c9a84c 100%)',
            WebkitBackgroundClip: 'text', WebkitTextFillColor: 'transparent', backgroundClip: 'text',
          }}>
            Meu Diário
          </span>
          <div style={{ width: '1px', height: '16px', background: 'rgba(201,168,76,0.2)' }} />
          <span style={{ fontSize: '11px', textTransform: 'uppercase', letterSpacing: '0.06em', color: 'var(--text-muted)' }}>
            {dadosProps?.nomeOperador.split(' ').slice(0, 2).join(' ')}
          </span>
          <div style={{ width: '1px', height: '16px', background: 'rgba(201,168,76,0.2)' }} />
          <span style={{ fontSize: '11px', color: 'var(--text-muted)' }}>{mesLabel}</span>
        </div>

        {erroSheets && (
          <div className="flex items-start gap-3 rounded-xl border px-4 py-3"
            style={{ background: 'rgba(239,68,68,0.05)', borderColor: 'rgba(239,68,68,0.2)' }}>
            <AlertTriangle size={15} className="text-rose-400 shrink-0 mt-0.5" />
            <div>
              <p className="text-sm font-medium text-rose-300">Erro ao carregar dados</p>
              <p className="text-xs mt-0.5 text-rose-500">{erroSheets}</p>
            </div>
          </div>
        )}

        {dadosProps && <MeuDiarioClient {...dadosProps} />}
      </div>
    </PainelShell>
  )
}

function GoldLine() {
  return (
    <div style={{
      height: '1px',
      background: 'linear-gradient(90deg, transparent 0%, #c9a84c 25%, #e8c96d 50%, #c9a84c 75%, transparent 100%)',
    }} />
  )
}
