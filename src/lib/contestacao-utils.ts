/* ── PRINCÍPIO: FONTE DE VERDADE DA PLANILHA ──────────────────────────────────
 *
 * operador.absPct e operador.indispPct (vindos do KPI CONSOLIDADO) são os valores
 * canônicos. Qualquer reconstrução desses percentuais a partir de
 * parseTempoSeg(tempoProjetado) / parseTempoSeg(tempoLogin) só é legítima quando
 * o insumo de tempo mudou — ex: deficitMin > 0 adiciona tempo efetivo ao login.
 *
 * Quando deficitMin === 0: o ABS não mudou → retornar operador.absPct diretamente.
 * Quando pausasMin === 0: a Indisp não mudou → retornar operador.indispPct diretamente.
 *
 * NUNCA usar a reconstrução como fonte de verdade quando os tempos não mudaram:
 * a planilha pode usar fórmula, arredondamento ou precisão diferentes do parser,
 * gerando drift silencioso (ex: planilha = 0,30 %; reconstruído = 0,34 %).
 *
 * Referência em commits/PRs futuros: "Fonte de verdade da planilha".
 * ─────────────────────────────────────────────────────────────────────────── */

// Pure utilities for Contestação RV calculations.
// No Node.js imports — safe to use in both Server and Client Components.

import type { DiarioRegistro } from '@/lib/diario-utils'
import {
  filtrarPorOperador,
  totalPausasJustificadas,
  parseTempoSeg,
  calcularDeficitForaJornada,
} from '@/lib/diario-utils'
import type { OperadorKpiRow } from '@/lib/kpi-consolidado-sheets'

export interface RegistroRelevante {
  tipo: 'Pausa justificada' | 'Fora da jornada'
  observacoes: string
  glpi: string
  data: string
  tempoRaw: string    // string exata da planilha (ex: "05:34:00" ou "0:46")
  tempoMin: number    // parseTempo(tempoRaw) em minutos — tempo feito ou déficit conforme tipo
  deficitMin: number  // déficit efetivo usado na contestação (para Pausa == tempoMin)
  isBruto: boolean    // true = registro antigo; tempoMin é o tempo feito, não o déficit
  semDeficit: boolean // true = déficit = 0 → não impacta contestação
}

export interface OperadorContestacao {
  operadorId: number
  operadorNome: string
  operadorUsername: string
  operadorEmail?: string
  operadorCargo?: string
  operadorSupervisor?: string
  encontrado: boolean

  // KPI original (null = sem dados na planilha)
  absPctOriginal: number | null
  indispPctOriginal: number | null
  tempoProjetadoRaw: string
  tempoLoginRaw: string
  tempoProjetadoSeg: number
  tempoLoginSeg: number

  // Registros do mês de referência
  registros: RegistroRelevante[]
  pausasMin: number   // soma de Pausa justificada → reduz Indisp
  deficitMin: number  // soma de déficits Fora da jornada → reduz ABS

  // Valores após contestação
  absPctContestado: number | null
  indispPctContestada: number | null

  // Deltas (negativo = melhora)
  absDelta: number | null
  indispDelta: number | null

  // Tempos formatados
  pausasFormatado: string
  deficitFormatado: string
}

function fmt2(n: number): string {
  return n.toFixed(2).replace('.', ',')
}

function formatMinutos(min: number): string {
  if (min <= 0) return '—'
  const h = Math.floor(min / 60)
  const m = min % 60
  if (h === 0) return `${m}min`
  return m > 0 ? `${h}h ${m}min` : `${h}h`
}

export function calcularContestacao(
  operador: OperadorKpiRow,
  todosRegistros: DiarioRegistro[],
): OperadorContestacao {
  const registrosBrutos = filtrarPorOperador(todosRegistros, operador.username, operador.nome)

  // Registros de Pausa justificada (impacta Indisp) e Fora da jornada (impacta ABS)
  const relevantes: RegistroRelevante[] = registrosBrutos
    .filter(r => r.tipo === 'Pausa justificada' || r.tipo === 'Fora da jornada')
    .map(r => {
      const deficitMin = r.tipo === 'Fora da jornada'
        ? Math.floor(calcularDeficitForaJornada(r.tempo).deficitSeg / 60)
        : r.tempoMin  // Pausa justificada: tempo da pausa = impacto direto
      const isBruto = r.tipo === 'Fora da jornada'
      return {
        tipo:       r.tipo as 'Pausa justificada' | 'Fora da jornada',
        observacoes: r.observacoes,
        glpi:        r.glpi,
        data:        r.data,
        tempoRaw:    r.tempo,
        tempoMin:    r.tempoMin,
        deficitMin,
        isBruto,
        semDeficit:  r.tipo === 'Fora da jornada' && deficitMin === 0,
      }
    })

  // Pausas justificadas: soma direta do tempo da pausa
  const pausasMin = totalPausasJustificadas(registrosBrutos)

  // Déficit Fora da jornada: usa computeDeficitMin (não totalForaJornada — que somaria bruto)
  const deficitMin = relevantes
    .filter(r => r.tipo === 'Fora da jornada')
    .reduce((acc, r) => acc + r.deficitMin, 0)

  const tempoProjetadoSeg = parseTempoSeg(operador.tempoProjetado)
  const tempoLoginSeg     = parseTempoSeg(operador.tempoLogin)
  const pausasSeg  = pausasMin  * 60
  const deficitSeg = deficitMin * 60

  // ABS contestado: déficit justificado adiciona tempo ao login efetivo.
  // Quando não há déficit, usa o valor original da planilha para evitar
  // divergência de precisão entre o KPI consolidado e o parseTempoSeg().
  let absPctContestado: number | null = null
  if (operador.absPct !== null && tempoProjetadoSeg > 0 && tempoLoginSeg > 0) {
    if (deficitMin === 0) {
      absPctContestado = operador.absPct
    } else {
      const loginContestadoSeg = Math.min(tempoLoginSeg + deficitSeg, tempoProjetadoSeg)
      absPctContestado = Math.max(
        0,
        (tempoProjetadoSeg - loginContestadoSeg) / tempoProjetadoSeg * 100,
      )
    }
  }

  // Indisp contestada: pausas justificadas removidas do tempo em indisponibilidade.
  // Quando não há pausas, usa o valor original da planilha pelo mesmo motivo.
  let indispPctContestada: number | null = null
  if (operador.indispPct !== null && tempoLoginSeg > 0) {
    if (pausasMin === 0) {
      indispPctContestada = operador.indispPct
    } else {
      const indispOrigSeg = operador.indispPct / 100 * tempoLoginSeg
      const indispContSeg = Math.max(0, indispOrigSeg - pausasSeg)
      indispPctContestada = indispContSeg / tempoLoginSeg * 100
    }
  }

  const absDelta    = absPctContestado !== null && operador.absPct !== null
    ? absPctContestado - operador.absPct : null
  const indispDelta = indispPctContestada !== null && operador.indispPct !== null
    ? indispPctContestada - operador.indispPct : null

  return {
    operadorId:        operador.id,
    operadorNome:      operador.nome,
    operadorUsername:  operador.username,
    encontrado:        operador.encontrado,
    absPctOriginal:    operador.absPct,
    indispPctOriginal: operador.indispPct,
    tempoProjetadoRaw: operador.tempoProjetado,
    tempoLoginRaw:     operador.tempoLogin,
    tempoProjetadoSeg,
    tempoLoginSeg,
    registros: relevantes,
    pausasMin,
    deficitMin,
    absPctContestado,
    indispPctContestada,
    absDelta,
    indispDelta,
    pausasFormatado:  formatMinutos(pausasMin),
    deficitFormatado: formatMinutos(deficitMin),
  }
}

/** Formata percentual absoluto com vírgula e duas casas. Ex: 9.6 → "9,60%" */
export function fmtPct(v: number | null): string {
  if (v === null) return '—'
  return `${fmt2(v)}%`
}

/** Formata delta de percentual com sinal. Ex: -1.2 → "−1,20%" */
export function fmtDelta(v: number | null): string {
  if (v === null) return '—'
  const abs   = Math.abs(v)
  const sinal = v < 0 ? '−' : v > 0 ? '+' : ''
  return `${sinal}${fmt2(abs)}%`
}

/**
 * Formata registros do Diário em texto pronto para colar num e-mail / sistema.
 * Ordem cronológica crescente. Linha GLPI só aparece quando existe código.
 * Dois espaços em branco entre blocos (= três \n).
 */
export function formatarRegistrosParaCopia(registros: RegistroRelevante[]): string {
  if (registros.length === 0) return ''

  function parseData(s: string): number {
    const [d, m, y] = s.split('/')
    if (!d || !m || !y) return 0
    return new Date(parseInt(y), parseInt(m) - 1, parseInt(d)).getTime()
  }

  return registros
    .slice()
    .sort((a, b) => parseData(a.data) - parseData(b.data))
    .map(r => {
      const etiqueta = r.tipo.toUpperCase()
      const linhas   = [`${etiqueta}: ${r.observacoes}`]
      const glpi     = r.glpi?.toString().trim()
      if (glpi && glpi.length > 0) linhas.push(`CODIGO GLPI: ${glpi}`)
      return linhas.join('\n')
    })
    .join('\n\n\n')
}

export { formatMinutos }
