import { createAdminClient } from '@/lib/supabase/admin'

export interface Mascara {
  id:         string
  segmento:   string
  fila:       string
  sla:        string
  utilizacao: string
  mascara:    string
  ordem:      number
  ativo:      boolean
}

export async function listarMascarasAtivas(): Promise<Mascara[]> {
  const admin = createAdminClient()
  const { data, error } = await admin
    .from('mascaras')
    .select('id, segmento, fila, sla, utilizacao, mascara, ordem, ativo')
    .eq('ativo', true)
    .order('segmento')
    .order('ordem')
    .order('fila')
  if (error) throw new Error(error.message)
  return data ?? []
}

export async function listarTodasMascaras(): Promise<Mascara[]> {
  const admin = createAdminClient()
  const { data, error } = await admin
    .from('mascaras')
    .select('id, segmento, fila, sla, utilizacao, mascara, ordem, ativo')
    .order('segmento')
    .order('ordem')
    .order('fila')
  if (error) throw new Error(error.message)
  return data ?? []
}

export async function criarMascara(input: Omit<Mascara, 'id' | 'ativo'>): Promise<void> {
  const admin = createAdminClient()
  const { error } = await admin.from('mascaras').insert({ ...input, ativo: true })
  if (error) throw new Error(error.message)
}

export async function atualizarMascara(id: string, input: Partial<Omit<Mascara, 'id'>>): Promise<void> {
  const admin = createAdminClient()
  const { error } = await admin.from('mascaras').update(input).eq('id', id)
  if (error) throw new Error(error.message)
}

export async function excluirMascara(id: string): Promise<void> {
  const admin = createAdminClient()
  const { error } = await admin.from('mascaras').delete().eq('id', id)
  if (error) throw new Error(error.message)
}
