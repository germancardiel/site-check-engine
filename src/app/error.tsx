'use client'

import { RouteError } from '@/components/ui/route-error'

export default function RootError({ retry }: { error: unknown; retry: () => void }) {
  return (
    <main id="contenido" className="flex flex-1 flex-col">
      <RouteError title="Algo ha fallado" message="No se pudo cargar esta página." onRetry={() => retry()} />
    </main>
  )
}
