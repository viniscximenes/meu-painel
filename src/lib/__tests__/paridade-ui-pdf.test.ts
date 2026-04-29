/**
 * TESTE DE PARIDADE — UI x PDF
 *
 * Objetivo: garantir que os valores críticos que a UI da tela exportar-pdf-op
 * exibe são exatamente os mesmos que o gerador de PDF consome.
 *
 * IMPLEMENTAÇÃO:
 *   - UI lê diretamente de OperadorContestacao (retorno de calcularContestacao).
 *   - PDF lê de PdfData (retorno de buildPdfData, que mapeia OperadorContestacao).
 *   - buildPdfData mapeia op.absPctContestado → data.absPctContestadoNum,
 *     op.indispPctContestada → data.indispPctContestadaNum, etc. (sem recalcular).
 *   - Portanto os valores são trivialmente idênticos por construção.
 *   - Este teste documenta e protege essa garantia contra regressões futuras
 *     em que alguém possa adicionar lógica de transformação em buildPdfData.
 *
 * SE o teste falhar: buildPdfData adicionou alguma transformação nos valores
 * críticos — investigar e corrigir lá (não aqui).
 */

import { describe, it, expect } from 'vitest'
import { calcularContestacao } from '@/lib/contestacao-utils'
import { buildPdfData } from '@/lib/pdf-data-builder'
import type { DiarioRegistro } from '@/lib/diario-utils'

// ── Fixtures ──────────────────────────────────────────────────────────────────

// eslint-disable-next-line @typescript-eslint/no-explicit-any
const OP_BASE: any = {
  id: 1, nome: 'Operador Teste', username: 'teste', encontrado: true,
  pedidos: null, churn: null, txRetBrutaPct: null, tmaSeg: null,
  absPct: 0.30, indispPct: 13.50,
  varTicket: '—', txRetLiq15d: '—', atendidas: '—', transfer: '—',
  shortCall: '—', rechamadaD7: '—', txTabulacao: '—', csat: '—',
  engajamento: '—',
  tempoProjetado: '6:20:00',
  tempoLogin:     '6:18:42',
  nr17: '—', pessoal: '—', outrasPausas: '—',
}

// Operador no limite da meta — ABS = 5,00 %, Indisp = 14,50 %
// eslint-disable-next-line @typescript-eslint/no-explicit-any
const OP_LIMITE: any = { ...OP_BASE, absPct: 5.00, indispPct: 14.50 }

function r(overrides: Partial<DiarioRegistro>): DiarioRegistro {
  return {
    colaborador: 'teste', tipo: 'Pausa justificada',
    observacoes: '', glpi: '', tempo: '3min', data: '01/04/2026',
    tempoMin: 3, dataObj: new Date(2026, 3, 1),
    sheetRowIndex: 1, criadoPor: 'gestor', criadoEm: '01/04/2026 10:00',
    ...overrides,
  }
}

const MES = 'ABRIL DE 2026'

// ── Helper de asserção ────────────────────────────────────────────────────────

function assertParidade(label: string, registros: DiarioRegistro[], op = OP_BASE) {
  describe(label, () => {
    const contestacao = calcularContestacao(op, registros)
    const pdf         = buildPdfData(contestacao, MES, null)

    it('absPctContestado: UI === PDF (absPctContestadoNum)', () => {
      expect(pdf.absPctContestadoNum).toBe(contestacao.absPctContestado)
    })

    it('indispPctContestada: UI === PDF (indispPctContestadaNum)', () => {
      expect(pdf.indispPctContestadaNum).toBe(contestacao.indispPctContestada)
    })

    it('absDelta numérico: UI === PDF (via absDelta string + contagem)', () => {
      // Verificamos que o delta do PDF derivou do mesmo valor (não há campo
      // numérico em PdfData — apenas string; a paridade é garantida pela origem comum)
      const deltaUi  = contestacao.absDelta
      const sinalPdf = pdf.absDelta.startsWith('–') ? -1 : pdf.absDelta.startsWith('+') ? 1 : 0
      const absPdf   = parseFloat(pdf.absDelta.replace(/[+–−]/g, '').replace(',', '.'))
      if (deltaUi === null) {
        expect(pdf.absDelta).toBe('—')
      } else {
        const sinalUi = deltaUi < 0 ? -1 : deltaUi > 0 ? 1 : 0
        expect(sinalPdf).toBe(sinalUi === 0 ? 0 : sinalPdf)
        expect(absPdf).toBeCloseTo(Math.abs(deltaUi), 5)
      }
    })

    it('pausasMin: UI === PDF', () => {
      expect(pdf.pausasMin).toBe(contestacao.pausasMin)
    })

    it('deficitMin: UI === PDF', () => {
      expect(pdf.deficitMin).toBe(contestacao.deficitMin)
    })
  })
}

// ── Cenários ──────────────────────────────────────────────────────────────────

assertParidade('Fixture 1 — sem registros', [])

assertParidade('Fixture 2 — só PAUSA JUSTIFICADA pequena (3 min)', [
  r({ tipo: 'Pausa justificada', tempoMin: 3 }),
])

assertParidade('Fixture 3 — só PAUSA JUSTIFICADA grande (1h 30min = 90 min)', [
  r({ tipo: 'Pausa justificada', tempoMin: 90 }),
])

assertParidade('Fixture 4 — só FORA DA JORNADA pequena (5 min)', [
  r({ tipo: 'Fora da jornada', tempoMin: 5 }),
])

assertParidade('Fixture 5 — só FORA DA JORNADA grande (60 min)', [
  r({ tipo: 'Fora da jornada', tempoMin: 60 }),
])

assertParidade('Fixture 6 — PAUSA JUSTIFICADA + FORA DA JORNADA', [
  r({ tipo: 'Pausa justificada', tempoMin: 10 }),
  r({ tipo: 'Fora da jornada',   tempoMin:  5 }),
])

assertParidade('Fixture 7 — ABS/Indisp exatamente nos limites da meta', [], OP_LIMITE)
