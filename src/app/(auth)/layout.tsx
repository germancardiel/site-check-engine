import type { ReactNode } from 'react'
import { PublicHeader } from '@/components/layout/public-header'

export default function AuthLayout({ children }: Readonly<{ children: ReactNode }>) {
  return (
    <>
      <PublicHeader />
      <main id="contenido" className="flex flex-1 items-center justify-center px-4 py-12">
        <div className="w-full max-w-sm rounded-lg border border-zinc-200 bg-white p-6 shadow-sm dark:border-zinc-800 dark:bg-zinc-950">
          {children}
        </div>
      </main>
    </>
  )
}
