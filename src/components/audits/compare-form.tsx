import Form from 'next/form'
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
      <div className="flex min-w-0 flex-col gap-1">
        <label htmlFor="comparar" className="text-sm font-medium text-zinc-900 dark:text-zinc-100">
          Comparar con otra auditoría
        </label>
        <select
          id="comparar"
          name="comparar"
          defaultValue={selectedId}
          className="max-w-full rounded-md border border-zinc-400 bg-white px-3 py-2 text-base text-zinc-900 focus-visible:outline-2 focus-visible:outline-offset-1 focus-visible:outline-zinc-900 dark:border-zinc-600 dark:bg-zinc-900 dark:text-zinc-100 dark:focus-visible:outline-white"
        >
          {options.map((option) => (
            <option key={option.id} value={option.id}>
              {formatAbsoluteDate(option.created_at)} · Nota {option.score ?? '–'}
            </option>
          ))}
        </select>
      </div>
      <button
        type="submit"
        className="inline-flex items-center justify-center rounded-md border border-zinc-300 bg-white px-4 py-2 text-sm font-medium text-zinc-900 transition-colors hover:bg-zinc-100 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-zinc-900 dark:border-zinc-700 dark:bg-zinc-900 dark:text-zinc-100 dark:hover:bg-zinc-800 dark:focus-visible:outline-white"
      >
        Comparar
      </button>
    </Form>
  )
}
