/**
 * TESTE DE REGRESSÃO — Princípio "Fonte de verdade da planilha"
 *
 * Cenário do bug original:
 *   - operador.absPct = 0.30 (direto da planilha KPI CONSOLIDADO)
 *   - tempoProjetado = "6:20:00" → 22800 s
 *   - tempoLogin    = "6:18:42" → 22722 s
 *   - Reconstrução ingênua: (22800 - 22722) / 22800 * 100 = 0,34 % → drift de 0,04
 *
 * Com a correção: quando deficitMin === 0, calcularContestacao() retorna
 * operador.absPct diretamente, sem reconstruir a partir dos tempos brutos.
 *
 * Mesma lógica para indispPct quando pausasMin === 0.
 */

import { describe, it, expect } from 'vitest'
import { calcularContestacao } from '@/lib/contestacao-utils'
import type { DiarioRegistro } from '@/lib/diario-utils'

// ── Fixtures ──────────────────────────────────────────────────────────────────

/**
 * OperadorKpiRow mínimo para os testes.
 * tempoProjetado / tempoLogin escolhidos para reproduzir drift de 0,04 %:
 *   parseTempoSeg("6:20:00") = 22800s, parseTempoSeg("6:18:42") = 22722s
 *   → (22800 - 22722) / 22800 * 100 = 0,3421 % ≈ 0,34 %  (planilha diz 0,30 %)
 */
// eslint-disable-next-line @typescript-eslint/no-explicit-any
const BASE_OP: any = {
  id:            1,
  nome:          'Operador Teste',
  username:      'teste',
  encontrado:    true,
  pedidos:       null,
  churn:         null,
  txRetBrutaPct: null,
  tmaSeg:        null,
  absPct:        0.30,
  indispPct:     13.50,
  varTicket:     '—', txRetLiq15d: '—', atendidas: '—', transfer: '—',
  shortCall:     '—', rechamadaD7: '—', txTabulacao: '—', csat: '—',
  engajamento:   '—',
  tempoProjetado: '6:20:00',   // 22800 s
  tempoLogin:     '6:18:42',   // 22722 s → drift reproduzido
  nr17: '—', pessoal: '—', outrasPausas: '—',
}

function makeDiario(overrides: Partial<DiarioRegistro>): DiarioRegistro {
  return {
    colaborador:   'teste',
    tipo:          'Pausa justificada',
    observacoes:   '',
    glpi:          '',
    tempo:         '3min',
    data:          '01/04/2026',
    tempoMin:      3,
    dataObj:       new Date(2026, 3, 1),
    sheetRowIndex: 1,
    criadoPor:     'gestor',
    criadoEm:      '01/04/2026 10:00',
    ...overrides,
  }
}

// ── Caso A ────────────────────────────────────────────────────────────────────

describe('Caso A — só PAUSA JUSTIFICADA (3 min), deficitMin = 0', () => {
  const registros = [
    makeDiario({ tipo: 'Pausa justificada', tempo: '3min', tempoMin: 3 }),
  ]
  const result = calcularContestacao(BASE_OP, registros)

  it('absPctContestado === absPctOriginal (fonte de verdade da planilha)', () => {
    expect(result.absPctContestado).toBe(0.30)
  })

  it('absDelta === 0 (sem impacto no ABS)', () => {
    expect(result.absDelta).toBe(0)
  })

  it('indispPctContestada < 13.50 (pausa reduz Indisp)', () => {
    expect(result.indispPctContestada).not.toBeNull()
    expect(result.indispPctContestada!).toBeLessThan(13.50)
  })

  it('pausasMin = 3, deficitMin = 0', () => {
    expect(result.pausasMin).toBe(3)
    expect(result.deficitMin).toBe(0)
  })
})

// ── Caso B ────────────────────────────────────────────────────────────────────

describe('Caso B — só FORA DA JORNADA (déficit 5 min), pausasMin = 0', () => {
  // Operador logou 06:15:00 (22500s) → déficit = 22800 − 22500 = 300s = 5min
  const registros = [
    makeDiario({ tipo: 'Fora da jornada', tempo: '06:15:00', tempoMin: 375 }),
  ]
  const result = calcularContestacao(BASE_OP, registros)

  it('indispPctContestada === indispPctOriginal (fonte de verdade da planilha)', () => {
    expect(result.indispPctContestada).toBe(13.50)
  })

  it('indispDelta === 0 (sem impacto na Indisp)', () => {
    expect(result.indispDelta).toBe(0)
  })

  it('absPctContestado < 0.30 (déficit reduz ABS — recalculado legitimamente)', () => {
    expect(result.absPctContestado).not.toBeNull()
    expect(result.absPctContestado!).toBeLessThan(0.30)
  })

  it('pausasMin = 0, deficitMin = 5', () => {
    expect(result.pausasMin).toBe(0)
    expect(result.deficitMin).toBe(5)
  })
})

// ── Caso C ────────────────────────────────────────────────────────────────────

describe('Caso C — sem registros', () => {
  const result = calcularContestacao(BASE_OP, [])

  it('absPctContestado === absPctOriginal', () => {
    expect(result.absPctContestado).toBe(0.30)
  })

  it('indispPctContestada === indispPctOriginal', () => {
    expect(result.indispPctContestada).toBe(13.50)
  })

  it('absDelta === 0', () => {
    expect(result.absDelta).toBe(0)
  })

  it('indispDelta === 0', () => {
    expect(result.indispDelta).toBe(0)
  })
})

// ── Caso D ────────────────────────────────────────────────────────────────────

describe('Caso D — PAUSA JUSTIFICADA + FORA DA JORNADA combinados', () => {
  const registros = [
    makeDiario({ tipo: 'Pausa justificada', tempo: '10min', tempoMin: 10 }),
    makeDiario({ tipo: 'Fora da jornada',   tempo: '06:15:00', tempoMin: 375 }),
  ]
  const result = calcularContestacao(BASE_OP, registros)

  it('absPctContestado é recalculado (diferente do original)', () => {
    expect(result.absPctContestado).not.toBe(0.30)
  })

  it('indispPctContestada é recalculada (diferente do original)', () => {
    expect(result.indispPctContestada).not.toBe(13.50)
  })

  it('absPctContestado < absPctOriginal (melhora ABS)', () => {
    expect(result.absPctContestado!).toBeLessThan(0.30)
  })

  it('indispPctContestada < indispPctOriginal (melhora Indisp)', () => {
    expect(result.indispPctContestada!).toBeLessThan(13.50)
  })

  it('pausasMin = 10, deficitMin = 5', () => {
    expect(result.pausasMin).toBe(10)
    expect(result.deficitMin).toBe(5)
  })
})

// ── Verificação explícita do drift ────────────────────────────────────────────

describe('Verificação direta do drift corrigido', () => {
  it('SEM registros: reconstrução ingênua daria 0,34 %, mas canônico é 0,30 %', () => {
    // Prova: sem a correção, calcularContestacao calcularia:
    //   (22800 - 22722) / 22800 * 100 = 0,3421 % → toFixed(2) = "0,34 %"
    // Com a correção: retorna operador.absPct = 0,30 diretamente.
    const result = calcularContestacao(BASE_OP, [])
    expect(result.absPctContestado).toBe(0.30)
    expect(result.absPctContestado).not.toBeCloseTo(0.342, 2)
  })
})
