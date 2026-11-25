/** First focusable element of every page: jumps to the main landmark (`#contenido`). */
export function SkipLink() {
  return (
    <a
      href="#contenido"
      className="sr-only rounded-md bg-accent px-4 py-2 text-sm font-semibold text-on-accent focus-visible:not-sr-only focus-visible:fixed focus-visible:top-4 focus-visible:left-4 focus-visible:z-50"
    >
      Saltar al contenido
    </a>
  )
}
