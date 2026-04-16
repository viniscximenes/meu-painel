import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'
import { getPlanilhaAtiva } from '@/lib/sheets'
import {
  buscarMonitorias,
  criarMonitoria,
  atualizarMonitoria,
  deletarMonitoria,
} from '@/lib/monitoria'

export const dynamic = 'force-dynamic'

async function getGestor() {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return null
  const { data: profile } = await supabase
    .from('profiles')
    .select('*')
    .eq('id', user.id)
    .single()
  if (!profile || profile.role !== 'gestor') return null
  return profile
}

export async function GET() {
  const profile = await getGestor()
  if (!profile) return NextResponse.json({ error: 'Não autorizado' }, { status: 401 })

  const planilha = await getPlanilhaAtiva()
  if (!planilha) return NextResponse.json({ error: 'Nenhuma planilha ativa' }, { status: 400 })

  try {
    const monitorias = await buscarMonitorias(planilha.spreadsheet_id)
    return NextResponse.json({ monitorias })
  } catch (e) {
    console.error('[GET /api/monitoria]', e)
    return NextResponse.json({ error: 'Erro ao buscar monitorias' }, { status: 500 })
  }
}

export async function POST(request: NextRequest) {
  const profile = await getGestor()
  if (!profile) return NextResponse.json({ error: 'Não autorizado' }, { status: 401 })

  const planilha = await getPlanilhaAtiva()
  if (!planilha) return NextResponse.json({ error: 'Nenhuma planilha ativa' }, { status: 400 })

  try {
    const dados = await request.json()
    await criarMonitoria(planilha.spreadsheet_id, dados)
    return NextResponse.json({ ok: true })
  } catch (e) {
    console.error('[POST /api/monitoria]', e)
    return NextResponse.json({ error: 'Erro ao criar monitoria' }, { status: 500 })
  }
}

export async function PATCH(request: NextRequest) {
  const profile = await getGestor()
  if (!profile) return NextResponse.json({ error: 'Não autorizado' }, { status: 401 })

  const planilha = await getPlanilhaAtiva()
  if (!planilha) return NextResponse.json({ error: 'Nenhuma planilha ativa' }, { status: 400 })

  try {
    const dados = await request.json()
    await atualizarMonitoria(planilha.spreadsheet_id, dados)
    return NextResponse.json({ ok: true })
  } catch (e) {
    console.error('[PATCH /api/monitoria]', e)
    return NextResponse.json({ error: 'Erro ao atualizar monitoria' }, { status: 500 })
  }
}

export async function DELETE(request: NextRequest) {
  const profile = await getGestor()
  if (!profile) return NextResponse.json({ error: 'Não autorizado' }, { status: 401 })

  const planilha = await getPlanilhaAtiva()
  if (!planilha) return NextResponse.json({ error: 'Nenhuma planilha ativa' }, { status: 400 })

  try {
    const { sheetRowIndex } = await request.json()
    await deletarMonitoria(planilha.spreadsheet_id, sheetRowIndex)
    return NextResponse.json({ ok: true })
  } catch (e) {
    console.error('[DELETE /api/monitoria]', e)
    return NextResponse.json({ error: 'Erro ao deletar monitoria' }, { status: 500 })
  }
}
