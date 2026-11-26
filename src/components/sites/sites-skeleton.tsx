const BLOCK = 'animate-pulse rounded-md bg-line motion-reduce:animate-none'

/** Placeholder with the shape of `/sitios`: the inline form and a few site rows. */
export function SitesSkeleton() {
  return (
    <div role="status" className="flex flex-col gap-8">
      <span className="sr-only">Cargando tus sitios…</span>
      <div aria-hidden="true" className="flex flex-col gap-3 rounded-md border border-line bg-panel p-4 sm:p-5">
        <div className={`${BLOCK} h-5 w-32`} />
        <div className="grid items-end gap-3 sm:grid-cols-[minmax(0,1.5fr)_minmax(0,1fr)_6rem]">
          <div className={`${BLOCK} h-10`} />
          <div className={`${BLOCK} h-10`} />
          <div className={`${BLOCK} h-10`} />
        </div>
      </div>
      <div aria-hidden="true" className="flex flex-col">
        <div className={`${BLOCK} mb-3 h-5 w-40`} />
        {[0, 1, 2].map((item) => (
          <div
            key={item}
            className="grid gap-4 border-b border-line py-5 lg:grid-cols-[minmax(0,1.3fr)_minmax(0,1fr)_7.5rem_12rem] lg:gap-8"
          >
            <div className="flex flex-col gap-2">
              <div className={`${BLOCK} h-5 w-44 max-w-full`} />
              <div className={`${BLOCK} h-3 w-56 max-w-full`} />
            </div>
            <div className="flex flex-col gap-2">
              <div className={`${BLOCK} h-4 w-full`} />
              <div className={`${BLOCK} h-1 w-full`} />
            </div>
            <div className={`${BLOCK} h-4 w-20`} />
            <div className={`${BLOCK} h-10 w-full`} />
          </div>
        ))}
      </div>
    </div>
  )
}
