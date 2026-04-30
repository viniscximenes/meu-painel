import { createAdminClient } from '@/lib/supabase/admin'

// ── Tipos públicos ─────────────────────────────────────────────────────────────

export type QuartilTopicoId = 'churn' | 'txretencao' | 'tma' | 'abs' | 'indisp'

export interface QuartilTopicoDef {
  id:           QuartilTopicoId
  aba:          string
  label:        string
  labelMetrica: string
  temData:      boolean
}

export const QUARTIL_TOPICOS: QuartilTopicoDef[] = [
  { id: 'churn',      aba: 'QUARTIL.CHURN',             label: 'CHURN',             labelMetrica: 'CHURN',               temData: false },
  { id: 'txretencao', aba: 'QUARTIL.TXRETENCAO',        label: 'TX. RETENÇÃO',      labelMetrica: '% RETIDOS',            temData: true  },
  { id: 'tma',        aba: 'QUARTIL.TMA',               label: 'TMA',               labelMetrica: 'TMA',                 temData: false },
  { id: 'abs',        aba: 'QUARTIL.ABS',               label: 'ABS',               labelMetrica: '% ABS',               temData: false },
  { id: 'indisp',     aba: 'QUARTIL.INDISPONIBILIDADE', label: 'INDISPONIBILIDADE', labelMetrica: '% INDISPONIBILIDADE', temData: false },
]

export const COLUNA_OPERADOR_QUARTIL = 'A'

export interface MapeamentoQuartilTopico {
  metrica:   string | null
  quadrante: string | null
  data:      string | null
}

export type MapeamentoQuartil = Record<QuartilTopicoId, MapeamentoQuartilTopico>

// ── Helpers ────────────────────────────────────────────────────────────────────

function mapeamentoVazio(): MapeamentoQuartil {
  return Object.fromEntries(
    QUARTIL_TOPICOS.map(t => [t.id, { metrica: null, quadrante: null, data: null }])
  ) as MapeamentoQuartil
}

// ── Leitura do mapeamento ──────────────────────────────────────────────────────

export async function getMapeamentoQuartil(): Promise<MapeamentoQuartil> {
  try {
    const db = createAdminClient()
    const { data, error } = await db
      .from('planilha_quartil_colunas')
      .select('topico, tipo_coluna, coluna')
    if (error) {
      console.error('[getMapeamentoQuartil]', error.message)
      return mapeamentoVazio()
    }
    const result = mapeamentoVazio()
    for (const row of data ?? []) {
      const topico = row.topico as QuartilTopicoId
      const tipo   = row.tipo_coluna as keyof MapeamentoQuartilTopico
      if (result[topico] && (tipo === 'metrica' || tipo === 'quadrante' || tipo === 'data')) {
        result[topico][tipo] = row.coluna
      }
    }
    return result
  } catch {
    return mapeamentoVazio()
  }
}

// ── Persistência do mapeamento ────────────────────────────────────────────────

export async function salvarMapeamentoQuartilDb(
  mapeamento: MapeamentoQuartil,
): Promise<void> {
  const db   = createAdminClient()
  const agora = new Date().toISOString()

  const upserts: { topico: string; tipo_coluna: string; coluna: string; atualizado_em: string }[] = []
  const deletes: { topico: string; tipo_coluna: string }[] = []

  for (const topicoDef of QUARTIL_TOPICOS) {
    const { id: topico, temData } = topicoDef
    const config = mapeamento[topico]
    if (!config) continue

    for (const tipo of ['metrica', 'quadrante'] as const) {
      const coluna = config[tipo]?.trim().toUpperCase() || null
      if (coluna) {
        upserts.push({ topico, tipo_coluna: tipo, coluna, atualizado_em: agora })
      } else {
        deletes.push({ topico, tipo_coluna: tipo })
      }
    }

    if (temData) {
      const coluna = config.data?.trim().toUpperCase() || null
      if (coluna) {
        upserts.push({ topico, tipo_coluna: 'data', coluna, atualizado_em: agora })
      } else {
        deletes.push({ topico, tipo_coluna: 'data' })
      }
    }
  }

  if (upserts.length > 0) {
    const { error } = await db
      .from('planilha_quartil_colunas')
      .upsert(upserts, { onConflict: 'topico,tipo_coluna' })
    if (error) throw new Error(`[salvarMapeamentoQuartil] upsert: ${error.message}`)
  }

  for (const { topico, tipo_coluna } of deletes) {
    await db
      .from('planilha_quartil_colunas')
      .delete()
      .eq('topico', topico)
      .eq('tipo_coluna', tipo_coluna)
  }
}
