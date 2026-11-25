import { buttonClass } from '@/components/ui/button-styles'
import { SiteRow, type SiteWithLatestAudit } from './site-row'

const COLUMNS = 'lg:grid-cols-[minmax(0,1.3fr)_minmax(0,1fr)_7.5rem_12rem] lg:gap-8'

export function SiteList({ sites, now }: { sites: SiteWithLatestAudit[]; now: Date }) {
  if (sites.length === 0) {
    return (
      <div className="flex flex-col items-start gap-3 rounded-md border border-line p-6 sm:p-8">
        <p className="text-lg font-semibold text-ink">Aún no has añadido ningún sitio.</p>
        <p className="max-w-prose text-ink-muted">
          Escribe la dirección de tu web en el formulario de arriba y pulsa Añadir. Después, audítala para obtener su
          primera nota de SEO y de IA.
        </p>
        <a href="#site-url" className={buttonClass('secondary', 'mt-2')}>
          Añadir el primer sitio
        </a>
      </div>
    )
  }

  return (
    <div>
      <div
        aria-hidden="true"
        className={`hidden border-b border-line-strong pb-2 font-mono text-xs tracking-wider text-ink-muted uppercase lg:grid ${COLUMNS}`}
      >
        <span>Sitio</span>
        <span>Última nota</span>
        <span>Auditado</span>
        <span>Acciones</span>
      </div>
      <ul>
        {sites.map((site) => (
          <SiteRow key={site.id} site={site} now={now} />
        ))}
      </ul>
    </div>
  )
}
