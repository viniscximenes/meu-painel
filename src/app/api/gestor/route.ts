import { requireGestor } from '@/lib/auth'
import { getPlanilhaAtiva, buscarLinhasPlanilha } from '@/lib/sheets'
import { getRVGestorConfig, calcularRVGestor } from '@/lib/rv-gestor'
import { NextResponse } from 'next/server'

export async function GET() {
  try {
    await requireGestor()

    const planilha = await getPlanilhaAtiva()
    if (!planilha) {
      return NextResponse.json({ erro: 'Nenhuma planilha ativa' }, { status: 404 })
    }

    const [gestorData, monitoriaData, config] = await Promise.all([
      buscarLinhasPlanilha(planilha.spreadsheet_id, 'KPI GESTOR', 5).catch(() => ({ headers: [], rows: [] })),
      buscarLinhasPlanilha(planilha.spreadsheet_id, 'MONITORIA').catch(() => ({ headers: [], rows: [] })),
      getRVGestorConfig(),
    ])

    const headers = gestorData.headers
    const dataRow = gestorData.rows[0] ?? []
    const dataResultado = gestorData.rows[2]?.[0] ?? null

    // Monitoria: coluna A = colaborador, coluna N (índice 13) = enviadoForms
    const enviadas = monitoriaData.rows.filter(r => (r[13] ?? '').toLowerCase().trim() === 'sim')
    const totalMonitorias = enviadas.length
    const porColaborador = new Map<string, number>()
    for (const r of enviadas) {
      const col = (r[0] ?? '').trim()
      if (col) porColaborador.set(col, (porColaborador.get(col) ?? 0) + 1)
    }
    const monitoriasCompletas = Array.from(porColaborador.values()).filter(v => v >= 4).length

    const rv = calcularRVGestor(
      {
        retencaoVal: 0, indispVal: 0, tmaValSeg: 0,
        ticketVal: 0, absVal: 0,
        monitoriasCompletas, totalMonitorias,
        semDados: true,
      },
      config,
    )

    return NextResponse.json({
      planilha: planilha.nome,
      dataResultado,
      headers,
      dataRow,
      totalMonitorias,
      monitoriasCompletas,
      rv,
    })
  } catch (e) {
    return NextResponse.json({ erro: e instanceof Error ? e.message : 'Erro' }, { status: 500 })
  }
}
