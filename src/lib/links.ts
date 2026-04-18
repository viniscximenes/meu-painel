import { createAdminClient } from '@/lib/supabase/admin'

export interface LinkUtil {
  id:        string
  categoria: string
  nome:      string
  url:       string
  descricao: string | null
  icone:     string | null
  ordem:     number
  ativo:     boolean
}

export const CATEGORIAS_LINKS = ['Microsoft', 'Sistemas Internos', 'Suplementares'] as const
export type CategoriaLink = typeof CATEGORIAS_LINKS[number]

export async function listarLinksAtivos(): Promise<LinkUtil[]> {
  const admin = createAdminClient()
  const { data, error } = await admin
    .from('links_uteis')
    .select('id, categoria, nome, url, descricao, icone, ordem, ativo')
    .eq('ativo', true)
    .order('categoria')
    .order('ordem')
    .order('nome')
  if (error) throw new Error(error.message)
  return data ?? []
}

export async function listarTodosLinks(): Promise<LinkUtil[]> {
  const admin = createAdminClient()
  const { data, error } = await admin
    .from('links_uteis')
    .select('id, categoria, nome, url, descricao, icone, ordem, ativo')
    .order('categoria')
    .order('ordem')
    .order('nome')
  if (error) throw new Error(error.message)
  return data ?? []
}

export async function criarLink(input: {
  categoria: string
  nome:      string
  url:       string
  descricao?: string
  ordem?:    number
}): Promise<void> {
  const admin = createAdminClient()
  const { error } = await admin.from('links_uteis').insert({
    categoria: input.categoria,
    nome:      input.nome,
    url:       input.url,
    descricao: input.descricao ?? null,
    ordem:     input.ordem ?? 0,
    ativo:     true,
  })
  if (error) throw new Error(error.message)
}

export async function excluirLink(id: string): Promise<void> {
  const admin = createAdminClient()
  const { error } = await admin.from('links_uteis').delete().eq('id', id)
  if (error) throw new Error(error.message)
}
