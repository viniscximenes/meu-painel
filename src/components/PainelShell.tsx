'use client'

import { useState } from 'react'
import { Profile } from '@/types'
import Sidebar from './Sidebar'
import Header from './Header'

interface PainelShellProps {
  profile: Profile
  title: string
  children: React.ReactNode
}

export default function PainelShell({ profile, title, children }: PainelShellProps) {
  const [sidebarOpen, setSidebarOpen] = useState(false)

  return (
    <div className="flex h-screen overflow-hidden" style={{ background: 'var(--bg-base)' }}>
      <Sidebar profile={profile} isOpen={sidebarOpen} onClose={() => setSidebarOpen(false)} />

      <div className="flex-1 flex flex-col min-w-0 overflow-hidden">
        <Header profile={profile} title={title} onMenuClick={() => setSidebarOpen(true)} />
        <main className="flex-1 overflow-y-auto" style={{ background: 'var(--bg-base)' }}>
          <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-6 lg:py-8">
            {children}
          </div>
        </main>
      </div>
    </div>
  )
}
