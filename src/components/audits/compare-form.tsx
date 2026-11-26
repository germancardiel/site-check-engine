import Form from 'next/form'
import { SubmitButton } from '@/components/ui/submit-button'
import { INPUT_CLASS } from '@/components/ui/text-field'
import { formatAbsoluteDate } from '@/lib/format'

export type CompareOption = { id: string; created_at: string; score: number | null }

type CompareFormProps = {
  action: string
  options: CompareOption[]
  selectedId: string
  /** Forces the pending look (tests); by default it follows the navigation (`useFormStatus`). */
  pending?: boolean
}

/**
 * Lets the user pick any other `ok` audit of the site to compare with (`?comparar=<id>`). The
 * navigation keeps the scroll position (`scroll={false}`) and the button shows it is loading.
 */
export function CompareForm({ action, options, selectedId, pending }: CompareFormProps) {
  if (options.length === 0) return null

  return (
    <Form action={action} scroll={false} className="flex flex-wrap items-end gap-3">
      <div className="flex min-w-0 flex-col gap-1.5">
        <label htmlFor="comparar" className="text-sm font-medium text-ink">
          Comparar con otra auditoría
        </label>
        <select id="comparar" name="comparar" defaultValue={selectedId} className={`${INPUT_CLASS} max-w-full font-mono text-sm`}>
          {options.map((option) => (
            <option key={option.id} value={option.id}>
              {formatAbsoluteDate(option.created_at)} · Puntuación {option.score ?? '–'}
            </option>
          ))}
        </select>
      </div>
      <SubmitButton variant="secondary" pendingLabel="Comparando…" pending={pending}>
        Comparar
      </SubmitButton>
    </Form>
  )
}
