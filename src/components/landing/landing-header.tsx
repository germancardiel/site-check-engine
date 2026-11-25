import { PublicHeader } from '@/components/layout/public-header'

const ANCHOR_CLASS =
  'rounded-sm text-sm font-medium text-zinc-700 underline-offset-4 hover:text-zinc-900 hover:underline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-zinc-900 dark:text-zinc-300 dark:hover:text-zinc-100 dark:focus-visible:outline-white'

/** Landing header: wordmark and links to its sections. */
export function LandingHeader() {
  return (
    <PublicHeader>
      <nav aria-label="Secciones">
        <ul className="flex flex-wrap gap-x-6 gap-y-2">
          <li>
            <a href="#que-revisa" className={ANCHOR_CLASS}>
              Qué revisa
            </a>
          </li>
          <li>
            <a href="#como-funciona" className={ANCHOR_CLASS}>
              Cómo funciona
            </a>
          </li>
        </ul>
      </nav>
    </PublicHeader>
  )
}
