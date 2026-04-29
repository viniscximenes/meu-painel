/* ── PRINCÍPIO: FONTE DE VERDADE DA PLANILHA ──────────────────────────────────
 *
 * Este módulo NUNCA recalcula absPct ou indispPct a partir de tempos brutos.
 * Recebe os valores já prontos de OperadorContestacao (que aplica o princípio
 * de fonte de verdade em contestacao-utils.ts) e apenas os mapeia para PdfData.
 *
 * Se precisar alterar como esses percentuais são calculados, editar somente
 * calcularContestacao() em contestacao-utils.ts. Ver comentário de princípio lá.
 * ─────────────────────────────────────────────────────────────────────────── */

import type { OperadorContestacao } from '@/lib/contestacao-utils'
import { fmtPct, formatMinutos } from '@/lib/contestacao-utils'

export interface PdfRegistro {
  tipo: 'Pausa justificada' | 'Fora da jornada'
  data: string
  tempoDisplay: string
  deficitMin: number
  observacoes: string
  glpi: string
}

export interface PdfData {
  operadorNome: string
  operadorUsername: string
  operadorEmail: string
  operadorCargo: string
  operadorSupervisor: string
  mesLabel: string
  dataAtualizacao: string | null
  geradoEm: string
  geradoHora: string

  // KPI Original
  tempoProjetado: string
  tempoLogin: string
  absPct: string
  absPctNum: number | null
  indispPct: string
  indispPctNum: number | null
  encontrado: boolean

  // Contestação
  absPctContestado: string
  absPctContestadoNum: number | null
  indispPctContestada: string
  indispPctContestadaNum: number | null
  absDelta: string
  indispDelta: string
  pausasFormatado: string
  deficitFormatado: string
  pausasMin: number
  deficitMin: number

  // Registros (já formatados)
  registros: PdfRegistro[]
}

// ── Helpers locais ────────────────────────────────────────────────────────────

/**
 * Delta formatado para PDF. Usa en-dash (U+2013) como sinal de menos —
 * está em WinAnsiEncoding e renderiza corretamente em Helvetica.
 */
function fmtDeltaPdf(v: number | null): string {
  if (v === null) return '—'
  const abs = Math.abs(v)
  const sinal = v < 0 ? '–' : v > 0 ? '+' : ''
  return `${sinal}${abs.toFixed(2).replace('.', ',')}%`
}

/**
 * Normaliza o e-mail para @alloha.com.
 * Patch temporário — o Supabase deveria ter o e-mail corporativo salvo diretamente.
 */
function normalizeEmail(email: string): string {
  if (!email) return ''
  const [user] = email.split('@')
  return `${user}@alloha.com`
}

/** Substitui espaço normal por não-quebrável em strings de tempo ("1h 20min" → "1h 20min"). */
function nbspTime(s: string): string {
  return s.replace(/(\d+h) (\d+min)/, `$1 $2`)
}

/** Title case simples (não lida com acentos — usar apenas para strings ASCII). */
function toTitleCase(s: string): string {
  return s.toLowerCase().split(' ').map(w => w.charAt(0).toUpperCase() + w.slice(1)).join(' ')
}

/**
 * Débito técnico: cargo e supervisor deveriam vir do Supabase com suporte a múltiplos cargos
 * e supervisores por operador. Hoje todo o time tem o mesmo cargo e supervisora.
 */
const DEFAULT_CARGO      = 'Operador Atendimento'
const DEFAULT_SUPERVISOR = 'Ana Angélica Mattos Gonçalves'

// ── Função principal ──────────────────────────────────────────────────────────

export function buildPdfData(
  op: OperadorContestacao,
  mesLabel: string,
  dataAtualizacao: string | null,
): PdfData {
  const now = new Date()
  const geradoEm = now.toLocaleDateString('pt-BR', {
    day: '2-digit', month: '2-digit', year: 'numeric',
  })
  const geradoHora = now.toLocaleTimeString('pt-BR', { hour: '2-digit', minute: '2-digit' })

  const registros: PdfRegistro[] = op.registros.map(r => ({
    tipo:         r.tipo,
    data:         r.data,
    tempoDisplay: nbspTime(
      r.tipo === 'Pausa justificada'
        ? formatMinutos(r.tempoMin)
        : formatMinutos(r.deficitMin),
    ),
    deficitMin:   r.deficitMin,
    observacoes:  r.observacoes ?? '',
    glpi:         r.glpi ?? '',
  }))

  return {
    operadorNome:      op.operadorNome,
    operadorUsername:  op.operadorUsername,
    operadorEmail:     normalizeEmail(op.operadorEmail ?? ''),
    operadorCargo:     op.operadorCargo ? toTitleCase(op.operadorCargo) : DEFAULT_CARGO,
    operadorSupervisor: op.operadorSupervisor
      ? toTitleCase(op.operadorSupervisor)
      : DEFAULT_SUPERVISOR,
    mesLabel,
    dataAtualizacao,
    geradoEm,
    geradoHora,

    tempoProjetado:    op.tempoProjetadoRaw,
    tempoLogin:        op.tempoLoginRaw,
    absPct:            fmtPct(op.absPctOriginal),
    absPctNum:         op.absPctOriginal,
    indispPct:         fmtPct(op.indispPctOriginal),
    indispPctNum:      op.indispPctOriginal,
    encontrado:        op.encontrado,

    absPctContestado:       fmtPct(op.absPctContestado),
    absPctContestadoNum:    op.absPctContestado,
    indispPctContestada:    fmtPct(op.indispPctContestada),
    indispPctContestadaNum: op.indispPctContestada,
    absDelta:          fmtDeltaPdf(op.absDelta),
    indispDelta:       fmtDeltaPdf(op.indispDelta),
    pausasFormatado:   nbspTime(op.pausasFormatado),
    deficitFormatado:  nbspTime(op.deficitFormatado),
    pausasMin:         op.pausasMin,
    deficitMin:        op.deficitMin,

    registros,
  }
}

export function buildFilename(nome: string, mesLabel: string): string {
  const normalized = nome
    .normalize('NFD')
    .replace(/[̀-ͯ]/g, '')
    .replace(/\s+/g, '')
  // mesLabel = "ABRIL DE 2026"
  const parts = mesLabel.split(' ')
  const mes = parts[0].charAt(0) + parts[0].slice(1).toLowerCase()
  const ano = parts[parts.length - 1]
  return `Contestacao_RV_${normalized}_${mes}${ano}.pdf`
}
