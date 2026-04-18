import { SidebarBadgesProvider } from '@/context/sidebar-badges'
import { getProfile } from '@/lib/auth'
import { getPlanilhaAtiva } from '@/lib/sheets'
import { contarGLPIsPendentes } from '@/lib/glpi'

export default async function PainelLayout({ children }: { children: React.ReactNode }) {
  let glpiPendentes = 0
  try {
    const profile = await getProfile()
    if (profile.role === 'gestor') {
      const planilha = await getPlanilhaAtiva()
      if (planilha) {
        glpiPendentes = await contarGLPIsPendentes(planilha.spreadsheet_id)
      }
    }
  } catch {
    // não interrompe o render
  }

  return (
    <SidebarBadgesProvider glpiPendentes={glpiPendentes}>
      {children}
    </SidebarBadgesProvider>
  )
}
