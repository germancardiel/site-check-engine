import { NotFoundState } from '@/components/ui/not-found-state'

export default function SiteNotFound() {
  return (
    <NotFoundState
      title="Sitio no encontrado"
      message="No existe este sitio o no tienes acceso a él. Comprueba la dirección o vuelve a tu lista."
      href="/sitios"
      linkLabel="Volver a tus sitios"
    />
  )
}
