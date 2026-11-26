'use client'

import { RouteError } from '@/components/ui/route-error'

export default function AuditError({ retry }: { error: unknown; retry: () => void }) {
  return (
    <RouteError
      title="No se pudo cargar la auditoría"
      message="El informe no está disponible ahora mismo."
      onRetry={() => retry()}
    />
  )
}
