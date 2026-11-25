import Link from 'next/link'

const LINK_CLASS =
  'rounded-sm underline underline-offset-4 hover:text-zinc-900 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-zinc-900 dark:hover:text-zinc-100 dark:focus-visible:outline-white'

export function LandingFooter() {
  return (
    <footer className="w-full border-t border-zinc-200 dark:border-zinc-800">
      <div className="mx-auto flex w-full max-w-5xl flex-col gap-4 px-4 py-8 text-sm text-zinc-700 sm:flex-row sm:items-center sm:justify-between dark:text-zinc-300">
        <p>Faro · Auditoría SEO y de visibilidad para asistentes de IA.</p>
        <nav aria-label="Pie de página">
          <ul className="flex flex-wrap gap-x-6 gap-y-2">
            <li>
              <Link href="/registro" className={LINK_CLASS}>
                Crear cuenta
              </Link>
            </li>
            <li>
              <Link href="/login" className={LINK_CLASS}>
                Entrar
              </Link>
            </li>
            <li>
              <a href="/llms.txt" className={LINK_CLASS}>
                llms.txt
              </a>
            </li>
          </ul>
        </nav>
      </div>
    </footer>
  )
}
