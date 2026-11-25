import type { Metadata } from 'next'
import { PublicHeader } from '@/components/layout/public-header'
import { BackLink } from '@/components/ui/back-link'

export const metadata: Metadata = {
  title: 'Página no encontrada · Faro',
}

export default function NotFound() {
  return (
    <>
      <PublicHeader />
      <main id="contenido" className="mx-auto flex w-full max-w-3xl flex-1 flex-col items-start gap-4 px-4 py-12">
        <h1 className="text-2xl font-semibold tracking-tight">Página no encontrada</h1>
        <p className="text-zinc-700 dark:text-zinc-300">
          La dirección que buscas no existe o ha cambiado. Comprueba que está bien escrita o vuelve al inicio.
        </p>
        <BackLink href="/">Volver al inicio</BackLink>
      </main>
    </>
  )
}
