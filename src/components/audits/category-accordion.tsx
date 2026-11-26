import { CATEGORY_BY_ID } from '@/lib/audit/categories'
import { NO_SCORE_LABEL, sortChecks } from '@/lib/audit/present'
import type { CategoryResult } from '@/lib/audit/types'
import { cn } from '@/lib/utils'
import { CategoryIcon } from './category-icons'
import { CheckRow } from './check-row'
import { scoreColor } from './check-status-badge'

function ChevronDownIcon({ open }: { open: boolean }) {
  return (
    <svg
      aria-hidden="true"
      viewBox="0 0 16 16"
      fill="none"
      stroke="currentColor"
      strokeWidth={1.75}
      strokeLinecap="round"
      strokeLinejoin="round"
      className={cn('size-4 shrink-0 text-ink-muted transition-transform duration-200 ease-out', open && 'rotate-180')}
    >
      <path d="m4 6 4 4 4-4" />
    </svg>
  )
}

export function CategoryAccordion({
  category,
  open,
  onToggle,
}: {
  category: CategoryResult
  open: boolean
  onToggle: () => void
}) {
  const meta = CATEGORY_BY_ID[category.id]
  const checks = sortChecks(category.checks)
  const panelId = `cat-panel-${category.id}`
  return (
    <section id={`cat-${category.id}`} tabIndex={-1} className="scroll-mt-24 rounded-md border border-line bg-panel">
      <h3>
        <button
          type="button"
          onClick={onToggle}
          aria-expanded={open}
          aria-controls={panelId}
          className="flex w-full items-center gap-3 rounded-md px-4 py-4 text-left transition-colors duration-200 ease-out hover:bg-ground md:px-5"
        >
          <CategoryIcon category={category.id} className="text-ink-muted" />
          <span className="flex-1 font-display text-[17px] font-semibold tracking-display text-ink">
            {meta.number}. {category.title}
          </span>
          <span className={cn('font-display text-lg font-semibold tabular-nums', scoreColor(category.score))}>
            {category.score ?? NO_SCORE_LABEL}
            <span className="text-xs font-normal text-ink-muted">/100</span>
          </span>
          <ChevronDownIcon open={open} />
        </button>
      </h3>
      {/* Always rendered (hidden when closed) so `aria-controls` points to an existing element. */}
      <ul id={panelId} hidden={!open} className="border-t border-line px-4 md:px-5">
        {checks.map((c) => (
          <CheckRow key={c.id} check={c} />
        ))}
      </ul>
    </section>
  )
}
