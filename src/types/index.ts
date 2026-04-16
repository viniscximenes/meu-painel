export type UserRole = 'gestor' | 'operador'

export interface Profile {
  id: string
  email: string
  username: string
  nome: string
  role: UserRole
  operador_id: number | null
  avatar_url?: string | null
  created_at: string
}

export interface Operador {
  id: number
  nome: string
  username: string
  profile_id: string
}

export interface DadosOperador {
  operador_id: number
  operador_nome: string
  metricas: Metrica[]
  ultima_atualizacao: string
}

export interface Metrica {
  label: string
  valor: string | number
  variacao?: number // percentual de variação (positivo = melhora, negativo = piora)
  icone?: string
}

export interface SheetRow {
  [key: string]: string
}
