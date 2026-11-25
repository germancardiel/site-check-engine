/** Placeholder shown while a site or an audit loads. */
export function DetailSkeleton({ label }: { label: string }) {
  return (
    <div role="status" aria-live="polite" className="flex flex-col gap-6">
      <span className="sr-only">{label}</span>
      <div aria-hidden="true" className="h-8 w-64 max-w-full animate-pulse rounded bg-zinc-200 dark:bg-zinc-800" />
      <div aria-hidden="true" className="h-5 w-80 max-w-full animate-pulse rounded bg-zinc-200 dark:bg-zinc-800" />
      <div aria-hidden="true" className="h-56 animate-pulse rounded-lg bg-zinc-200 dark:bg-zinc-800" />
      <ul aria-hidden="true" className="flex flex-col gap-3">
        {[0, 1, 2].map((item) => (
          <li key={item} className="h-20 animate-pulse rounded-lg bg-zinc-200 dark:bg-zinc-800" />
        ))}
      </ul>
    </div>
  )
}
