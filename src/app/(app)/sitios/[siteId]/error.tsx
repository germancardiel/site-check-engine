'use client'

import { RouteError } from '@/components/ui/route-error'

export default function SiteError({ retry }: { error: unknown; retry: () => void }) {
  return <RouteError title="Sitio" message="No se pudo cargar el sitio." onRetry={() => retry()} />
}
