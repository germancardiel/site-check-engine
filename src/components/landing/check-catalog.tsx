import { CHECK_CATALOG } from '@/lib/audit/checks'
import { groupCatalog } from '@/lib/audit/present'
import type { CheckCategory } from '@/lib/audit/types'

const INTRO: Record<CheckCategory, string> = {
  seo: 'Lo básico que necesitan los buscadores para rastrear, entender e indexar tu página.',
  ai: 'Lo que permite a los asistentes de IA leer tu contenido, citarlo y saber quién está detrás.',
}

/** "Qué revisa Faro": the real checks of the engine, grouped into SEO and IA. */
export function CheckCatalog() {
  return (
    <div className="grid gap-6 md:grid-cols-2">
      {groupCatalog(CHECK_CATALOG).map((group) => (
        <section
          key={group.category}
          aria-labelledby={`catalogo-${group.category}`}
          className="flex flex-col gap-3 rounded-lg border border-zinc-200 bg-white p-6 dark:border-zinc-800 dark:bg-zinc-950"
        >
          <h3 id={`catalogo-${group.category}`} className="text-lg font-semibold">
            {group.title}
          </h3>
          <p className="text-zinc-700 dark:text-zinc-300">{INTRO[group.category]}</p>
          <ul className="flex list-disc flex-col gap-1 pl-5 text-zinc-900 dark:text-zinc-100">
            {group.checks.map((check) => (
              <li key={check.id}>{check.title}</li>
            ))}
          </ul>
        </section>
      ))}
    </div>
  )
}
