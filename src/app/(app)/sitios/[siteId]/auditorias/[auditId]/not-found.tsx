import { NotFoundState } from '@/components/ui/not-found-state'

export default function AuditNotFound() {
  return (
    <NotFoundState
      title="Auditoría no encontrada"
      message="No existe esta auditoría o no tienes acceso a ella. Comprueba la dirección o vuelve a tus sitios."
      href="/sitios"
      linkLabel="Volver a tus sitios"
    />
  )
}
