import type { Metadata } from 'next'
import { PublicHeader } from '@/components/layout/public-header'
import { NotFoundState } from '@/components/ui/not-found-state'
import { SITE_NAME } from '@/lib/site'

export const metadata: Metadata = {
  title: `Página no encontrada · ${SITE_NAME}`,
}

export default function NotFound() {
  return (
    <>
      <PublicHeader className="max-w-app" />
      <main id="contenido" className="flex flex-1 flex-col">
        <NotFoundState
          title="Página no encontrada"
          emphasis="no encontrada"
          message="La dirección que buscas no existe o ha cambiado. Comprueba que está bien escrita o vuelve al inicio."
          href="/"
          linkLabel="Volver al inicio"
        />
      </main>
    </>
  )
}
