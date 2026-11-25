const BLOCK = 'animate-pulse rounded-md bg-line motion-reduce:animate-none'

/** Placeholder with the shape of a site page (chart and history) or an audit (score band and checks). */
export function DetailSkeleton({ label, variant }: { label: string; variant: 'site' | 'audit' }) {
  return (
    <div role="status" aria-live="polite" className="flex flex-col gap-10">
      <span className="sr-only">{label}</span>
      <div aria-hidden="true" className="flex flex-col gap-3 border-b border-line pb-8">
        <div className={`${BLOCK} h-11 w-72 max-w-full`} />
        <div className={`${BLOCK} h-4 w-56 max-w-full`} />
      </div>
      {variant === 'audit' ? (
        <div aria-hidden="true" className="grid gap-6 rounded-md border border-line bg-panel p-5 sm:grid-cols-3">
          {[0, 1, 2].map((item) => (
            <div key={item} className="flex flex-col gap-3">
              <div className={`${BLOCK} h-8 w-full`} />
              <div className={`${BLOCK} h-1.5 w-full`} />
            </div>
          ))}
        </div>
      ) : (
        <div aria-hidden="true" className={`${BLOCK} aspect-[5/2] w-full`} />
      )}
      <div aria-hidden="true" className="flex flex-col">
        <div className={`${BLOCK} mb-3 h-6 w-48`} />
        {[0, 1, 2, 3].map((item) => (
          <div key={item} className="flex items-center gap-4 border-b border-line py-4">
            <div className={`${BLOCK} size-4 shrink-0 rounded-full`} />
            <div className={`${BLOCK} h-4 flex-1`} />
            <div className={`${BLOCK} h-4 w-16`} />
          </div>
        ))}
      </div>
    </div>
  )
}
