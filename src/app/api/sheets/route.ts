import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'
import { getPlanilhaAtiva, buscarLinhasPlanilha, buscarLinhaOperador } from '@/lib/sheets'

export async function GET(request: NextRequest) {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()

  if (!user) {
    return NextResponse.json({ error: 'Não autorizado' }, { status: 401 })
  }

  const { data: profile } = await supabase
    .from('profiles')
    .select('*')
    .eq('id', user.id)
    .single()

  if (!profile) {
    return NextResponse.json({ error: 'Perfil não encontrado' }, { status: 403 })
  }

  const planilha = await getPlanilhaAtiva()
  if (!planilha) {
    return NextResponse.json({ error: 'Nenhuma planilha ativa configurada' }, { status: 400 })
  }

  try {
    if (profile.role === 'gestor') {
      const { headers, rows } = await buscarLinhasPlanilha(planilha.spreadsheet_id, planilha.aba)
      return NextResponse.json({ headers, rows })
    } else {
      const resultado = await buscarLinhaOperador(profile.username, planilha.spreadsheet_id, planilha.aba)
      return NextResponse.json(resultado ?? { headers: [], row: [] })
    }
  } catch (error) {
    console.error(error)
    return NextResponse.json({ error: 'Erro ao buscar dados' }, { status: 500 })
  }
}
