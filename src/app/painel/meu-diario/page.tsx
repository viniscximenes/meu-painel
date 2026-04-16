import { redirect } from 'next/navigation'
import { getProfile } from '@/lib/auth'
import PainelShell from '@/components/PainelShell'
import { getOperadorPorId } from '@/lib/operadores'
import {
  buscarDiarioAtivo,
  filtrarPorOperador,
  totalPausasJustificadas,
  totalForaJornada,
  formatTempo,
  formatarDataCurta,
  type TipoRegistro,
} from '@/lib/diario'
import { BookOpen, Clock, TrendingUp, Hash } from 'lucide-react'

export const dynamic = 'force-dynamic'

const TIPO_CORES: Record<TipoRegistro, { bg: string; color: string; border: string }> = {
  'Pausa justificada': { bg: 'rgba(245,158,11,0.10)',  color: '#f59e0b', border: 'rgba(245,158,11,0.25)' },
  'Fora da jornada':   { bg: 'rgba(96,165,250,0.10)',  color: '#60a5fa', border: 'rgba(96,165,250,0.25)' },
  'Geral':             { bg: 'rgba(167,139,250,0.10)', color: '#a78bfa', border: 'rgba(167,139,250,0.25)' },
  'Outros':            { bg: 'rgba(148,163,184,0.10)', color: '#94a3b8', border: 'rgba(148,163,184,0.20)' },
}

const MESES = ['Janeiro','Fevereiro','Março','Abril','Maio','Junho','Julho','Agosto','Setembro','Outubro','Novembro','Dezembro']

export default async function MeuDiarioPage() {
  const profile = await getProfile()

  // Apenas operadores acessam esta página
  if (profile.role !== 'operador' || !profile.operador_id) redirect('/painel')

  const operador = getOperadorPorId(profile.operador_id)
  if (!operador) redirect('/painel')

  const { registros: todos } = await buscarDiarioAtivo()
  const registros = filtrarPorOperador(todos, operador.username, operador.nome)

  const minPausas   = totalPausasJustificadas(registros)
  const minFora     = totalForaJornada(registros)
  const pausasJust  = registros.filter((r) => r.tipo === 'Pausa justificada')
  const foraJornada = registros.filter((r) => r.tipo === 'Fora da jornada')

  const agora = new Date()
  const mesLabel = `${MESES[agora.getMonth()]} ${agora.getFullYear()}`

  return (
    <PainelShell profile={profile} title="Meu Diário">
      <div className="space-y-6 max-w-2xl">

        {/* Header */}
        <div>
          <h2
            className="text-2xl font-extrabold"
            style={{
              background: 'linear-gradient(90deg, var(--text-primary) 0%, var(--gold-light) 100%)',
              WebkitBackgroundClip: 'text',
              WebkitTextFillColor: 'transparent',
            }}
          >
            Meu Diário
          </h2>
          <p className="text-xs mt-0.5" style={{ color: 'var(--text-muted)' }}>
            {mesLabel} · registros do mês referentes a você
          </p>
        </div>

        {/* Cards de somatória */}
        {(minPausas > 0 || minFora > 0) && (
          <div className="grid grid-cols-2 gap-3">
            {minPausas > 0 && (
              <div
                className="rounded-2xl border px-4 py-3"
                style={{ background: 'rgba(245,158,11,0.04)', borderColor: 'rgba(245,158,11,0.18)' }}
              >
                <div className="flex items-center gap-2 mb-1.5">
                  <div className="p-1.5 rounded-lg" style={{ background: 'rgba(245,158,11,0.10)', color: '#f59e0b' }}>
                    <Clock size={12} />
                  </div>
                  <p className="text-[10px] font-bold uppercase" style={{ color: '#f59e0b', letterSpacing: '0.07em' }}>
                    Pausas justificadas
                  </p>
                </div>
                <p className="text-xl font-extrabold tabular-nums" style={{ color: '#f59e0b' }}>
                  {formatTempo(minPausas)}
                </p>
                <p className="text-[10px] mt-0.5" style={{ color: 'var(--text-muted)' }}>
                  {pausasJust.length} {pausasJust.length === 1 ? 'entrada' : 'entradas'}
                </p>
              </div>
            )}
            {minFora > 0 && (
              <div
                className="rounded-2xl border px-4 py-3"
                style={{ background: 'rgba(96,165,250,0.04)', borderColor: 'rgba(96,165,250,0.18)' }}
              >
                <div className="flex items-center gap-2 mb-1.5">
                  <div className="p-1.5 rounded-lg" style={{ background: 'rgba(96,165,250,0.10)', color: '#60a5fa' }}>
                    <TrendingUp size={12} />
                  </div>
                  <p className="text-[10px] font-bold uppercase" style={{ color: '#60a5fa', letterSpacing: '0.07em' }}>
                    Jornada contestada
                  </p>
                </div>
                <p className="text-xl font-extrabold tabular-nums" style={{ color: '#60a5fa' }}>
                  {formatTempo(minFora)}
                </p>
                <p className="text-[10px] mt-0.5" style={{ color: 'var(--text-muted)' }}>
                  {foraJornada.length} {foraJornada.length === 1 ? 'entrada' : 'entradas'}
                </p>
              </div>
            )}
          </div>
        )}

        {/* Separador de totais por tipo */}
        {(minPausas > 0 || minFora > 0) && (
          <div
            className="flex items-center gap-4 flex-wrap rounded-xl px-4 py-2.5"
            style={{ background: 'rgba(255,255,255,0.02)', border: '1px solid rgba(255,255,255,0.05)' }}
          >
            <p className="text-[10px] font-bold uppercase" style={{ color: 'var(--text-muted)', letterSpacing: '0.08em' }}>
              Totais
            </p>
            {minPausas > 0 && (
              <span className="text-[11px] font-semibold" style={{ color: '#f59e0b' }}>
                Pausas justificadas: {formatTempo(minPausas)}
              </span>
            )}
            {minPausas > 0 && minFora > 0 && (
              <span style={{ color: 'rgba(255,255,255,0.15)' }}>|</span>
            )}
            {minFora > 0 && (
              <span className="text-[11px] font-semibold" style={{ color: '#60a5fa' }}>
                Fora da jornada: {formatTempo(minFora)}
              </span>
            )}
          </div>
        )}

        {/* Lista de registros */}
        <div>
          <p className="text-[10px] font-bold uppercase mb-3" style={{ color: 'var(--text-muted)', letterSpacing: '0.08em' }}>
            Todos os registros
          </p>

          {registros.length === 0 ? (
            <div
              className="rounded-2xl border px-6 py-16 text-center"
              style={{ background: 'rgba(255,255,255,0.01)', borderColor: 'rgba(255,255,255,0.06)' }}
            >
              <BookOpen size={28} className="mx-auto mb-3" style={{ color: 'var(--text-muted)' }} />
              <p className="text-sm" style={{ color: 'var(--text-muted)' }}>
                Nenhum registro encontrado para o seu nome este mês.
              </p>
            </div>
          ) : (
            <div className="space-y-2">
              {registros.map((r, i) => {
                const tc = TIPO_CORES[r.tipo]
                const tempoFmt = r.tempoMin > 0 ? formatTempo(r.tempoMin) : r.tempo || null
                return (
                  <div
                    key={i}
                    className="rounded-xl border flex items-start gap-3 px-4 py-3"
                    style={{ background: 'rgba(255,255,255,0.02)', borderColor: 'rgba(255,255,255,0.06)' }}
                  >
                    <div
                      className="w-1 self-stretch rounded-full shrink-0"
                      style={{ background: tc.color, opacity: 0.7, minHeight: '20px' }}
                    />
                    <div className="shrink-0 text-[10px] tabular-nums font-medium w-10" style={{ color: 'var(--text-muted)', paddingTop: '2px' }}>
                      {formatarDataCurta(r.data)}
                    </div>
                    <span
                      className="text-[9px] font-bold uppercase px-1.5 py-0.5 rounded-full shrink-0 mt-0.5"
                      style={{ background: tc.bg, color: tc.color, border: `1px solid ${tc.border}` }}
                    >
                      {r.tipo.split(' ')[0]}
                    </span>
                    <div className="flex-1 min-w-0">
                      <p className="text-xs leading-relaxed" style={{ color: 'var(--text-secondary)' }}>
                        {r.observacoes || '—'}
                      </p>
                      {r.glpi && (
                        <span
                          className="inline-flex items-center gap-0.5 mt-1 text-[9px] font-bold px-1.5 py-0.5 rounded-full tabular-nums"
                          style={{ background: 'rgba(96,165,250,0.10)', color: '#60a5fa', border: '1px solid rgba(96,165,250,0.20)' }}
                        >
                          <Hash size={8} />{r.glpi}
                        </span>
                      )}
                    </div>
                    {tempoFmt && (
                      <span className="text-xs font-bold tabular-nums shrink-0" style={{ color: tc.color }}>
                        {tempoFmt}
                      </span>
                    )}
                  </div>
                )
              })}
            </div>
          )}
        </div>
      </div>
    </PainelShell>
  )
}
