'use client'

import { createContext, useContext } from 'react'

interface SidebarBadges {
  glpiPendentes: number
}

const SidebarBadgesContext = createContext<SidebarBadges>({ glpiPendentes: 0 })

export function SidebarBadgesProvider({
  children,
  glpiPendentes,
}: {
  children: React.ReactNode
  glpiPendentes: number
}) {
  return (
    <SidebarBadgesContext.Provider value={{ glpiPendentes }}>
      {children}
    </SidebarBadgesContext.Provider>
  )
}

export function useSidebarBadges(): SidebarBadges {
  return useContext(SidebarBadgesContext)
}
