import Link from 'next/link'
import { SITE_NAME } from '@/lib/site'

const LINK_CLASS = 'rounded-sm text-ink-muted underline decoration-line-strong transition-colors duration-200 ease-out hover:text-ink hover:decoration-ink'

export function LandingFooter() {
  return (
    <footer className="w-full border-t border-line">
      <div className="mx-auto flex w-full max-w-landing flex-col gap-4 px-4 py-8 text-sm sm:flex-row sm:items-center sm:justify-between sm:px-6">
        <p className="text-ink-muted">
          <span className="font-semibold text-ink">{SITE_NAME}</span> · Auditoría SEO y de visibilidad para asistentes de IA.
        </p>
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
              <a href="/llms.txt" className={`${LINK_CLASS} font-mono text-xs`}>
                llms.txt
              </a>
            </li>
          </ul>
        </nav>
      </div>
    </footer>
  )
}
