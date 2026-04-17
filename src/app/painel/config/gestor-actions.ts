'use server'

import { salvarRVGestorConfig } from '@/lib/rv-gestor'
import { revalidatePath } from 'next/cache'

export async function salvarRVGestorConfigAction(dados: Record<string, string>): Promise<void> {
  await salvarRVGestorConfig(dados)
  revalidatePath('/painel/gestor')
  revalidatePath('/painel/config')
}
