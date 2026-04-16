// ── Utilitários puros de Monitoria ───────────────────────────────────────────
// NÃO importa googleapis nem supabase/admin. Seguro para Client Components.

export type StatusMonitoria = 'verde' | 'amarelo' | 'vermelho'

export interface Monitoria {
  sheetRowIndex: number    // 0-based: header=0, primeira linha dados=1
  colaborador:        string  // A
  idChamada:          string  // B
  contratoCliente:    string  // C
  dataAtendimento:    string  // D — DD/MM/YYYY
  encaminhouPesquisa: string  // E — Sim/Não
  sinalizacao:        string  // F
  // G — sempre vazia
  apresentacao:       string  // H
  comunicacao:        string  // I
  processo:           string  // J
  resumo:             string  // K
  celula:             string  // L — sempre "Retenção"
  anexo:              string  // M
  enviadoForms:       string  // N — sim/não
  status:             StatusMonitoria
}

export interface NovaMonitoriaInput {
  colaborador:         string
  idChamada:           string
  contratoCliente:     string
  dataAtendimento:     string
  encaminhouPesquisa?: string
  sinalizacao?:        string
  apresentacao?:       string
  comunicacao?:        string
  processo?:           string
  resumo?:             string
  anexo?:              string
  enviadoForms?:       string
}

export interface AtualizarMonitoriaInput extends NovaMonitoriaInput {
  sheetRowIndex: number
}

export const META_MONITORIAS = 4

export const SINALIZACOES = [
  'Omissão de Atendimento',
  'Transferência Indevida',
  'Distraiu Cliente',
  'Demora na Apresentação Inicial (5s Voz | 20s Texto)',
  'Houve Falha no Processo/Atendimento',
  'Script Incorreto/Agressivo',
  'Não Houve Falha Grave',
  'Atendimento Não Humanizado',
] as const

export const NOTAS = ['Muito Ruim', 'Ruim', 'Neutro', 'Bom', 'Muito Bom'] as const

export const STATUS_INFO: Record<StatusMonitoria, { color: string; bg: string; border: string; label: string }> = {
  verde:    { color: '#4ade80', bg: 'rgba(34,197,94,0.10)',  border: 'rgba(34,197,94,0.25)',  label: 'Enviado'     },
  amarelo:  { color: '#facc15', bg: 'rgba(234,179,8,0.10)',  border: 'rgba(234,179,8,0.25)',  label: 'Pendente'    },
  vermelho: { color: '#f87171', bg: 'rgba(239,68,68,0.10)',  border: 'rgba(239,68,68,0.25)',  label: 'Incompleto'  },
}

/** Calcula status de uma monitoria pelos seus dados. */
export function calcularStatusMonitoria(
  m: Pick<Monitoria, 'colaborador' | 'idChamada' | 'contratoCliente' | 'dataAtendimento' | 'enviadoForms'>
): StatusMonitoria {
  const obrigatorios = [m.colaborador, m.idChamada, m.contratoCliente, m.dataAtendimento]
  if (obrigatorios.some((v) => !v?.trim())) return 'vermelho'
  if (m.enviadoForms?.trim().toLowerCase() === 'sim') return 'verde'
  return 'amarelo'
}

/** "DD/MM/YYYY" → Date (para ordenação). */
export function parseDateDMY(s: string): Date {
  const m = s.match(/^(\d{1,2})\/(\d{1,2})\/(\d{4})$/)
  if (!m) return new Date(0)
  return new Date(parseInt(m[3]), parseInt(m[2]) - 1, parseInt(m[1]))
}

/** "DD/MM/YYYY" → "MM/YYYY" (para filtro por mês). */
export function mesDeData(s: string): string {
  return s.length >= 7 ? s.slice(3) : ''
}
