'use client'

import { RouteError } from '@/components/ui/route-error'

export default function SitesError({ retry }: { error: unknown; retry: () => void }) {
  return (
    <RouteError
      title="No se pudieron cargar tus sitios"
      message="La lista de sitios no está disponible ahora mismo."
      onRetry={() => retry()}
      backHref="/"
      backLabel="Ir al inicio"
    />
  )
}
