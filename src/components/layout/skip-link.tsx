/** First focusable element of every page: jumps to the main landmark (`#contenido`). */
export function SkipLink() {
  return (
    <a
      href="#contenido"
      className="sr-only rounded-md bg-zinc-900 px-4 py-2 text-sm font-medium text-white focus-visible:not-sr-only focus-visible:fixed focus-visible:top-4 focus-visible:left-4 focus-visible:z-50 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-zinc-900 dark:bg-white dark:text-zinc-900 dark:focus-visible:outline-white"
    >
      Saltar al contenido
    </a>
  )
}
