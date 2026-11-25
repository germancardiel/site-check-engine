'use client'

export default function SitesError({ retry }: { error: unknown; retry: () => void }) {
  return (
    <div className="mx-auto flex w-full max-w-3xl flex-1 flex-col items-start gap-4 px-4 py-12">
      <h1 className="text-2xl font-semibold tracking-tight">Tus sitios</h1>
      <div role="alert" className="flex flex-col gap-2">
        <p className="font-medium text-zinc-900 dark:text-zinc-100">
          No se pudieron cargar tus sitios.
        </p>
        <p className="text-zinc-700 dark:text-zinc-300">
          Ha ocurrido un error inesperado. Vuelve a intentarlo en unos segundos.
        </p>
      </div>
      <button
        type="button"
        onClick={() => retry()}
        className="inline-flex items-center justify-center rounded-md bg-zinc-900 px-4 py-2 text-sm font-medium text-white transition-colors hover:bg-zinc-700 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-zinc-900 dark:bg-white dark:text-zinc-900 dark:hover:bg-zinc-200 dark:focus-visible:outline-white"
      >
        Reintentar
      </button>
    </div>
  )
}
