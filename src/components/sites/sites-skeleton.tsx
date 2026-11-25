/** Placeholder shown while the user's sites load. */
export function SitesSkeleton() {
  return (
    <div role="status" aria-live="polite" className="flex flex-col gap-6">
      <span className="sr-only">Cargando tus sitios…</span>
      <div aria-hidden="true" className="h-5 w-56 max-w-full animate-pulse rounded bg-zinc-200 dark:bg-zinc-800" />
      <div aria-hidden="true" className="h-48 animate-pulse rounded-lg bg-zinc-200 dark:bg-zinc-800" />
      <ul aria-hidden="true" className="flex flex-col gap-4">
        {[0, 1, 2].map((item) => (
          <li key={item} className="h-28 animate-pulse rounded-lg bg-zinc-200 dark:bg-zinc-800" />
        ))}
      </ul>
    </div>
  )
}
