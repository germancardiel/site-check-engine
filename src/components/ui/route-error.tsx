import { StatusIcon } from './status-icon'
import { buttonClass } from './button-styles'

type RouteErrorProps = {
  /** Describes what failed ("No se pudieron cargar tus sitios"), not just the page name. */
  title: string
  message: string
  onRetry: () => void
  /** Secondary way out: "Volver a tus sitios" by default, "Ir al inicio" in the root errors. */
  backHref?: string
  backLabel?: string
}

/**
 * Generic error state for `error.tsx` boundaries: "Reintentar" plus a link to leave the page.
 * The link is a plain `<a>` (full navigation), which also works in `global-error.tsx`.
 */
export function RouteError({
  title,
  message,
  onRetry,
  backHref = '/sitios',
  backLabel = 'Volver a tus sitios',
}: RouteErrorProps) {
  return (
    <div className="mx-auto flex w-full max-w-app flex-1 flex-col items-start gap-6 px-4 py-12 sm:px-6 sm:py-16">
      <h1 className="font-display text-3xl font-semibold tracking-display text-balance sm:text-4xl">{title}</h1>
      <div role="alert" className="flex w-full max-w-xl items-start gap-3 rounded-md border border-fail bg-panel p-4">
        <StatusIcon status="fail" className="mt-1" />
        <div className="flex min-w-0 flex-col gap-1">
          <p className="font-semibold text-ink">{message}</p>
          <p className="text-ink-muted">Ha ocurrido un error inesperado. Vuelve a intentarlo en unos segundos.</p>
        </div>
      </div>
      <div className="flex flex-wrap items-center gap-3">
        <button type="button" onClick={onRetry} className={buttonClass('primary')}>
          Reintentar
        </button>
        <a href={backHref} className={buttonClass('secondary')}>
          {backLabel}
        </a>
      </div>
    </div>
  )
}
