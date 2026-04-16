'use server'

import { salvarRVConfig } from '@/lib/rv'
import { revalidatePath } from 'next/cache'

export async function salvarRVConfigAction(dados: Record<string, string>): Promise<void> {
  await salvarRVConfig(dados)
  revalidatePath('/painel/rv-config')
  revalidatePath('/painel/rv-equipe')
  revalidatePath('/painel/rv')
}
