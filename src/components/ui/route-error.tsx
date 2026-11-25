import { StatusIcon } from './status-icon'
import { buttonClass } from './button-styles'

type RouteErrorProps = {
  title: string
  message: string
  onRetry: () => void
}

/** Generic error state for `error.tsx` boundaries, with a "Reintentar" button. */
export function RouteError({ title, message, onRetry }: RouteErrorProps) {
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
      <button type="button" onClick={onRetry} className={buttonClass('primary')}>
        Reintentar
      </button>
    </div>
  )
}
