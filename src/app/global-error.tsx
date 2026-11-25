'use client'

import { RouteError } from '@/components/ui/route-error'
import { SITE_NAME } from '@/lib/brand'
import './globals.css'

/** Replaces the root layout when it fails, so it renders its own `<html>` and `<body>`. */
export default function GlobalError({ retry }: { error: unknown; retry: () => void }) {
  return (
    <html lang="es" className="h-full antialiased">
      <body className="flex min-h-full flex-col bg-ground font-sans text-ink">
        <title>{`Algo ha fallado · ${SITE_NAME}`}</title>
        <main id="contenido" className="flex flex-1 flex-col">
          <RouteError title="Algo ha fallado" message={`No se pudo cargar ${SITE_NAME}.`} onRetry={() => retry()} />
        </main>
      </body>
    </html>
  )
}
