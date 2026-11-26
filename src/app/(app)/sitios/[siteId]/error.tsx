'use client'

import { RouteError } from '@/components/ui/route-error'

export default function SiteError({ retry }: { error: unknown; retry: () => void }) {
  return (
    <RouteError
      title="No se pudo cargar el sitio"
      message="El sitio y su historial no están disponibles ahora mismo."
      onRetry={() => retry()}
    />
  )
}
