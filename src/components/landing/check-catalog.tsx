import { CHECK_CATALOG } from '@/lib/audit/checks'
import { groupCatalog } from '@/lib/audit/present'

/** "Qué revisa": the real checks of the engine, grouped into the 10 weighted categories. */
export function CheckCatalog() {
  const groups = groupCatalog(CHECK_CATALOG)
  return (
    <div className="grid gap-6 sm:grid-cols-2">
      {groups.map((group) => (
        <article
          key={group.category}
          aria-labelledby={`catalogo-${group.category}`}
          className="flex min-w-0 flex-col gap-3 rounded-md border border-line bg-panel p-5"
        >
          <div className="flex items-baseline justify-between gap-4 border-b border-line pb-3">
            <h3 id={`catalogo-${group.category}`} className="font-display text-lg font-semibold tracking-display text-ink">
              {group.number}. {group.title}
            </h3>
            <span className="shrink-0 font-mono text-xs text-ink-muted tabular-nums">
              {group.checks.length} checks · peso {group.weight}%
            </span>
          </div>
          <ul className="grid gap-1.5">
            {group.checks.map((check) => (
              <li key={check.id} className="text-sm text-ink-muted">
                <span className="text-ink">{check.title}</span>
              </li>
            ))}
          </ul>
        </article>
      ))}
    </div>
  )
}
