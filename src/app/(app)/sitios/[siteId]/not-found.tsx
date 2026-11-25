import { BackLink } from '@/components/ui/back-link'

export default function SiteNotFound() {
  return (
    <div className="mx-auto flex w-full max-w-3xl flex-1 flex-col items-start gap-4 px-4 py-12">
      <h1 className="text-2xl font-semibold tracking-tight">Sitio no encontrado</h1>
      <p className="text-zinc-700 dark:text-zinc-300">
        No existe este sitio o no tienes acceso a él. Comprueba la dirección o vuelve a tu lista.
      </p>
      <BackLink href="/sitios">Volver a tus sitios</BackLink>
    </div>
  )
}
