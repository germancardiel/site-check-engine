import type { ReactNode } from 'react'
import { PublicHeader } from '@/components/layout/public-header'

export default function AuthLayout({ children }: Readonly<{ children: ReactNode }>) {
  return (
    <>
      <PublicHeader className="max-w-app" />
      <main id="contenido" className="flex flex-1 items-start justify-center px-4 py-12 sm:items-center sm:py-16">
        <div className="w-full max-w-md">{children}</div>
      </main>
    </>
  )
}
