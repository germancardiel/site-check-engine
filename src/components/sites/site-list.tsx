import { SiteCard, type SiteWithLatestAudit } from './site-card'

export function SiteList({ sites, now }: { sites: SiteWithLatestAudit[]; now: Date }) {
  if (sites.length === 0) {
    return (
      <p className="rounded-lg border border-dashed border-zinc-300 p-6 text-center text-zinc-700 dark:border-zinc-700 dark:text-zinc-300">
        Aún no has añadido ningún sitio. Usa el formulario para añadir el primero.
      </p>
    )
  }

  return (
    <ul className="flex flex-col gap-4">
      {sites.map((site) => (
        <SiteCard key={site.id} site={site} now={now} />
      ))}
    </ul>
  )
}
