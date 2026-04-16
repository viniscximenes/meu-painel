import { requireGestor } from '@/lib/auth'
import PainelShell from '@/components/PainelShell'
import { buscarDiarioAtivo, filtrarPorOperador, totalPausasJustificadas } from '@/lib/diario'
import { OPERADORES_DISPLAY } from '@/lib/operadores'
import { BookOpen, ArrowLeft } from 'lucide-react'
import Link from 'next/link'
import OperadorResumoCard from './OperadorResumoCard'
import type { TipoRegistro } from '@/lib/diario-utils'

export const dynamic = 'force-dynamic'

const TIPOS: TipoRegistro[] = ['Pausa justificada', 'Fora da jornada', 'Geral', 'Outros']

export default async function DiarioResumoPage() {
  const profile = await requireGestor()
  const { registros: todos } = await buscarDiarioAtivo()

  // >= 240min → salvo como tempo logado bruto → déficit = 380 − valor
  // <  240min → já salvo como déficit → usar diretamente
  const LIMIAR_BRUTO_MIN = 240
  const JORNADA_MIN      = 380

  const operadoresComRegistros = OPERADORES_DISPLAY.map((op) => {
    const regs      = filtrarPorOperador(todos, op.username, op.nome)
    const minPausas = totalPausasJustificadas(regs)
    const minFora   = regs
      .filter((r) => r.tipo === 'Fora da jornada')
      .reduce((s, r) => {
        const min = r.tempoMin
        if (min <= 0 || min >= JORNADA_MIN) return s
        return s + (min >= LIMIAR_BRUTO_MIN ? JORNADA_MIN - min : min)
      }, 0)
    const tipoCounts = Object.fromEntries(
      TIPOS.map((t) => [t, regs.filter((r) => r.tipo === t).length])
    ) as Record<TipoRegistro, number>
    return { op, minPausas, minFora, total: regs.length, tipoCounts }
  }).filter((item) => item.total > 0)

  return (
    <PainelShell profile={profile} title="Diário por Operador">
      <div className="space-y-6 max-w-2xl">

        {/* Header */}
        <div className="flex items-center gap-4">
          <Link
            href="/painel/diario"
            className="p-2 rounded-xl"
            style={{
              background: 'rgba(255,255,255,0.04)',
              color: 'var(--text-muted)',
              border: '1px solid rgba(255,255,255,0.06)',
            }}
          >
            <ArrowLeft size={15} />
          </Link>
          <div>
            <h2
              className="text-2xl font-extrabold"
              style={{
                background: 'linear-gradient(90deg, var(--text-primary) 0%, var(--gold-light) 100%)',
                WebkitBackgroundClip: 'text',
                WebkitTextFillColor: 'transparent',
              }}
            >
              Por Operador
            </h2>
            <p className="text-xs mt-0.5" style={{ color: 'var(--text-muted)' }}>
              {operadoresComRegistros.length}{' '}
              operador{operadoresComRegistros.length !== 1 ? 'es' : ''} com registros no mês
            </p>
          </div>
        </div>

        {/* Lista */}
        {operadoresComRegistros.length === 0 ? (
          <div
            className="rounded-2xl border px-6 py-16 text-center"
            style={{ background: 'rgba(255,255,255,0.01)', borderColor: 'rgba(255,255,255,0.06)' }}
          >
            <BookOpen size={28} className="mx-auto mb-3" style={{ color: 'var(--text-muted)' }} />
            <p className="text-sm" style={{ color: 'var(--text-muted)' }}>
              Nenhum operador com registros este mês.
            </p>
          </div>
        ) : (
          <div className="space-y-3">
            {operadoresComRegistros.map((item) => (
              <OperadorResumoCard key={item.op.id} {...item} />
            ))}
          </div>
        )}
      </div>
    </PainelShell>
  )
}
