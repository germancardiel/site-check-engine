import { CHECK_CATALOG } from '@/lib/audit/checks'
import { groupCatalog } from '@/lib/audit/present'
import type { CheckCategory } from '@/lib/audit/types'

const INTRO: Record<CheckCategory, string> = {
  seo: 'Lo básico que necesitan los buscadores para rastrear, entender e indexar tu página.',
  ai: 'Lo que permite a los asistentes de IA leer tu contenido, citarlo y saber quién está detrás.',
}

/** "Qué revisa": the real checks of the engine, as two columns of rows (SEO and IA). */
export function CheckCatalog() {
  return (
    <div className="grid gap-x-12 gap-y-12 lg:grid-cols-[1.4fr_1fr]">
      {groupCatalog(CHECK_CATALOG).map((group) => (
        <section key={group.category} aria-labelledby={`catalogo-${group.category}`} className="flex min-w-0 flex-col gap-4">
          <div className="flex items-baseline justify-between gap-4 border-b border-line-strong pb-3">
            <h3 id={`catalogo-${group.category}`} className="text-lg font-semibold text-ink">
              {group.title}
            </h3>
            <span className="font-mono text-sm text-ink-muted tabular-nums">
              {group.checks.length} <span className="sr-only">comprobaciones</span>
              <span aria-hidden="true">checks</span>
            </span>
          </div>
          <p className="max-w-prose text-ink-muted">{INTRO[group.category]}</p>
          <ul className={group.category === 'seo' ? 'grid sm:grid-cols-2 sm:gap-x-8' : 'grid'}>
            {group.checks.map((check) => (
              <li key={check.id} className="border-b border-line py-2.5 text-ink">
                {check.title}
              </li>
            ))}
          </ul>
        </section>
      ))}
    </div>
  )
}
