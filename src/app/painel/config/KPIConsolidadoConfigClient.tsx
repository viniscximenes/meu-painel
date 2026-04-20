'use client'

import { useState, useTransition } from 'react'
import { salvarKPIConsolidadoConfig } from './actions'
import { Save, TableProperties } from 'lucide-react'
import { HaloSpinner } from '@/components/HaloSpinner'

interface Props {
  limiteInicial: number
}

export default function KPIConsolidadoConfigClient({ limiteInicial }: Props) {
  const [limite, setLimite] = useState(limiteInicial)
  const [salvo, setSalvo] = useState(false)
  const [pending, startTransition] = useTransition()

  function handleSubmit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault()
    setSalvo(false)
    startTransition(async () => {
      await salvarKPIConsolidadoConfig(limite)
      setSalvo(true)
      setTimeout(() => setSalvo(false), 2500)
    })
  }

  return (
    <div className="space-y-6">
      <div>
        <h2 className="text-xl font-bold flex items-center gap-2" style={{ color: 'var(--text-primary)' }}>
          <TableProperties size={20} style={{ color: 'var(--gold)' }} />
          KPI CONSOLIDADO
        </h2>
        <p className="text-sm mt-1" style={{ color: 'var(--text-muted)' }}>
          Configurações da aba KPI CONSOLIDADO usada para leitura de operadores.
        </p>
      </div>

      <form
        onSubmit={handleSubmit}
        className="rounded-2xl border p-5 space-y-5"
        style={{ background: 'rgba(255,255,255,0.02)', borderColor: 'rgba(201,168,76,0.10)' }}
      >
        <div>
          <label
            htmlFor="limite_linhas"
            className="block text-xs font-semibold mb-1"
            style={{ color: 'var(--text-muted)' }}
          >
            Limite de linhas
          </label>
          <input
            id="limite_linhas"
            type="number"
            min={10}
            max={500}
            value={limite}
            onChange={(e) => setLimite(Number(e.target.value))}
            className="input w-32"
          />
          <p className="text-[10px] mt-1.5" style={{ color: 'var(--text-muted)' }}>
            Define até qual linha da aba KPI CONSOLIDADO o sistema vai buscar operadores.
            Padrão: 50.
          </p>
        </div>

        <div className="flex items-center gap-3">
          <button
            type="submit"
            disabled={pending}
            className="btn-primary flex items-center gap-1.5 text-sm py-2"
          >
            {pending
              ? <HaloSpinner size="sm" />
              : <Save size={14} />
            }
            Salvar
          </button>
          {salvo && (
            <span className="text-xs font-medium" style={{ color: 'var(--verde)' }}>
              Salvo!
            </span>
          )}
        </div>
      </form>
    </div>
  )
}
