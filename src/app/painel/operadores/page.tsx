import { requireGestor } from '@/lib/auth'
import PainelShell from '@/components/PainelShell'
import OperadorCard from '@/components/OperadorCard'
import { OPERADORES_DISPLAY } from '@/lib/operadores'

export default async function OperadoresPage() {
  const profile = await requireGestor()

  return (
    <PainelShell profile={profile} title="Todos os Operadores">
      <div className="space-y-6">
        <div className="flex items-center justify-between">
          <div>
            <h2 className="text-xl font-bold" style={{ color: 'var(--text-primary)' }}>Operadores</h2>
            <p className="text-sm mt-0.5" style={{ color: 'var(--text-muted)' }}>
              Clique em um operador para ver os detalhes.
            </p>
          </div>
          <span className="badge badge-gestor">{OPERADORES_DISPLAY.length} operadores</span>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4">
          {OPERADORES_DISPLAY.map((op) => (
            <OperadorCard key={op.id} operador={op} />
          ))}
        </div>
      </div>
    </PainelShell>
  )
}
