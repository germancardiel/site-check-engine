import { PublicHeader } from '@/components/layout/public-header'
import { LandingHeaderAccess } from './session-ctas'

const ANCHOR_CLASS = 'inline-flex min-h-10 items-center rounded-sm text-sm font-medium text-ink-muted transition-colors duration-200 ease-out hover:text-ink'

/** Landing header: wordmark, links to its sections and "Entrar" (or "Ir a mis sitios"). */
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
      <LandingHeaderAccess />
    </PublicHeader>
  )
}
