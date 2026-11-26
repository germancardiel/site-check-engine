'use client'

import { RouteError } from '@/components/ui/route-error'

export default function RootError({ retry }: { error: unknown; retry: () => void }) {
  return (
    <main id="contenido" className="flex flex-1 flex-col">
      <RouteError
        title="No se pudo cargar esta página"
        message="La página no ha respondido como esperábamos."
        onRetry={() => retry()}
        backHref="/"
        backLabel="Ir al inicio"
      />
    </main>
  )
}
