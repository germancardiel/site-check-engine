import Form from 'next/form'
import { buttonClass } from '@/components/ui/button-styles'
import { INPUT_CLASS } from '@/components/ui/text-field'
import { formatAbsoluteDate } from '@/lib/format'

export type CompareOption = { id: string; created_at: string; score: number | null }

type CompareFormProps = {
  action: string
  options: CompareOption[]
  selectedId: string
}

/** Lets the user pick any other `ok` audit of the site to compare with (`?comparar=<id>`). */
export function CompareForm({ action, options, selectedId }: CompareFormProps) {
  if (options.length === 0) return null

  return (
    <Form action={action} className="flex flex-wrap items-end gap-3">
      <div className="flex min-w-0 flex-col gap-1.5">
        <label htmlFor="comparar" className="text-sm font-medium text-ink">
          Comparar con otra auditoría
        </label>
        <select id="comparar" name="comparar" defaultValue={selectedId} className={`${INPUT_CLASS} max-w-full font-mono text-sm`}>
          {options.map((option) => (
            <option key={option.id} value={option.id}>
              {formatAbsoluteDate(option.created_at)} · Nota {option.score ?? '–'}
            </option>
          ))}
        </select>
      </div>
      <button type="submit" className={buttonClass('secondary')}>
        Comparar
      </button>
    </Form>
  )
}
