import { SidebarBadgesProvider } from '@/context/sidebar-badges'
import { getProfile } from '@/lib/auth'
import { getPlanilhaAtiva } from '@/lib/sheets'
import { contarGLPIsPendentes } from '@/lib/glpi'
import CursorProvider from '@/components/CursorProvider'

export default async function PainelLayout({ children }: { children: React.ReactNode }) {
  let glpiPendentes = 0
  let role = ''
  try {
    const profile = await getProfile()
    role = profile.role
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
      <CursorProvider role={role} />
      {children}
    </SidebarBadgesProvider>
  )
}
