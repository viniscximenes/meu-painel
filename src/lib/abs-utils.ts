// ── ABS utils — PURO, sem Node.js/googleapis. Seguro para Client Components. ──

export type ABSStatus = 'P' | 'F' | 'FO' | 'SC' | 'CT' | 'FE' | 'LI' | 'DS' | 'AT' | '-' | ''

export const ABS_STATUS_OPTIONS: { value: ABSStatus; label: string; cor: string }[] = [
  { value: 'P',  label: 'Presente',       cor: '#22c55e' },
  { value: 'F',  label: 'Falta',          cor: '#ef4444' },
  { value: 'FO', label: 'Folga',          cor: '#3b82f6' },
  { value: 'SC', label: 'Saiu Cedo',      cor: '#f59e0b' },
  { value: 'CT', label: 'Chegou Tarde',   cor: '#f59e0b' },
  { value: 'FE', label: 'Férias',         cor: '#a855f7' },
  { value: 'LI', label: 'Licença',        cor: '#f97316' },
  { value: 'DS', label: 'Desligado',      cor: '#6b7280' },
  { value: 'AT', label: 'Atestado',       cor: '#38bdf8' },
  { value: '-',  label: 'Não registrado', cor: '#374151' },
]

export const ABA_ABS = 'ABS'

export interface ABSSheetData {
  datas: string[]
  diasSemana: string[]
  operadores: {
    username: string
    rowIndex: number
    status: ABSStatus[]
  }[]
  initialized: boolean
}

export function contarFaltasPorOperador(data: ABSSheetData): Record<string, number> {
  const result: Record<string, number> = {}
  for (const op of data.operadores) {
    result[op.username] = op.status.filter((s) => s === 'F').length
  }
  return result
}
