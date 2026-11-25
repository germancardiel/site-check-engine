'use client'

import { RouteError } from '@/components/ui/route-error'
import './globals.css'

/** Replaces the root layout when it fails, so it renders its own `<html>` and `<body>`. */
export default function GlobalError({ retry }: { error: unknown; retry: () => void }) {
  return (
    <html lang="es" className="h-full antialiased">
      <body className="flex min-h-full flex-col">
        <title>Algo ha fallado · Faro</title>
        <main id="contenido" className="flex flex-1 flex-col">
          <RouteError title="Algo ha fallado" message="No se pudo cargar Faro." onRetry={() => retry()} />
        </main>
      </body>
    </html>
  )
}
