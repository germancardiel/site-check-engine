'use client'

import { RouteError } from '@/components/ui/route-error'

export default function SitesError({ retry }: { error: unknown; retry: () => void }) {
  return <RouteError title="Tus sitios" message="No se pudieron cargar tus sitios." onRetry={() => retry()} />
}
