import type { ReactNode } from 'react'
import { AppHeader } from '@/components/layout/app-header'

export default function AppLayout({ children }: Readonly<{ children: ReactNode }>) {
  return (
    <>
      <AppHeader />
      <main id="contenido" className="flex flex-1 flex-col">
        {children}
      </main>
    </>
  )
}
