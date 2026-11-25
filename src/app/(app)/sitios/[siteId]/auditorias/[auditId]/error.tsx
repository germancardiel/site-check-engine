'use client'

import { RouteError } from '@/components/ui/route-error'

export default function AuditError({ retry }: { error: unknown; retry: () => void }) {
  return <RouteError title="Auditoría" message="No se pudo cargar la auditoría." onRetry={() => retry()} />
}
