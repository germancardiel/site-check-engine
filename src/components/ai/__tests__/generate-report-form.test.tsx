import { renderToStaticMarkup } from 'react-dom/server'
import { describe, expect, it, vi } from 'vitest'
import { DetailSkeleton } from '@/components/audits/detail-skeleton'
import { parseHtml } from '@/lib/audit/parse'
import { focusActionResult } from '@/lib/form-focus'
import type { AiActionState } from '@/lib/validation/ai'

vi.mock('@/app/(app)/sitios/[siteId]/auditorias/[auditId]/actions', () => ({
  generatePlan: vi.fn(),
  generateChanges: vi.fn(),
}))

import { GenerateReportFormView, LABELS } from '../generate-report-form'

const QUOTA_REASON = 'Has usado las 10 generaciones de hoy; se renuevan a medianoche (hora de Madrid).'

type Overrides = {
  kind?: 'plan' | 'changes'
  hasReport?: boolean
  remaining?: number | null
  state?: AiActionState
  pending?: boolean
}

function render({ kind = 'plan', hasReport = false, remaining = 5, state = {}, pending = false }: Overrides = {}) {
  return parseHtml(
    renderToStaticMarkup(
      <GenerateReportFormView
        kind={kind}
        siteId="s"
        auditId="a"
        hasReport={hasReport}
        remaining={remaining}
        state={state}
        formAction={() => {}}
        pending={pending}
      />,
    ),
  )
}

const button = ($: ReturnType<typeof render>) => $('button[type="submit"]')

describe('Cuota de IA junto a los botones (CA7)', () => {
  it.each(['plan', 'changes'] as const)('%s: muestra lo que queda antes de pulsar', (kind) => {
    const $ = render({ kind, remaining: 4 })
    expect($(`#ai-${kind}-note`).text()).toBe('Te quedan 4 generaciones hoy.')
    expect(button($).attr('aria-describedby')).toBe(`ai-${kind}-note`)
    expect(button($).attr('disabled')).toBeUndefined()
  })

  it.each(['plan', 'changes'] as const)('%s: con 0 el botón está desactivado con el motivo', (kind) => {
    const $ = render({ kind, remaining: 0, hasReport: true })
    expect(button($).attr('disabled')).toBeDefined()
    expect($(`#ai-${kind}-note`).text()).toBe(QUOTA_REASON)
    expect(button($).attr('aria-describedby')).toBe(`ai-${kind}-note`)
  })

  it('el error de cuota de la action no ofrece "Reintentar" y desactiva el botón', () => {
    const $ = render({ remaining: 3, state: { error: QUOTA_REASON, quotaExceeded: true } })
    expect(button($).text()).not.toContain('Reintentar')
    expect(button($).text()).toBe('Generar plan con IA')
    expect(button($).attr('disabled')).toBeDefined()
    expect($('[role="alert"]').text()).toBe(QUOTA_REASON)
    expect(button($).attr('aria-describedby')).toBe('ai-plan-error')
    expect($('#ai-plan-error').text()).toBe(QUOTA_REASON)
  })
})

describe('Regenerar (CA8)', () => {
  it('el plan: "Regenerar" con el texto visible de que sustituye el plan y usa 1 generación', () => {
    const $ = render({ hasReport: true, remaining: 5 })
    expect(button($).text()).toBe('Regenerar')
    const note = $(`#${button($).attr('aria-describedby')}`)
    expect(note.text()).toContain('Regenerar sustituye el plan actual y usa 1 generación.')
    expect(note.text()).toContain('Te quedan 5 generaciones hoy.')
  })

  it('el resumen: dice que sustituye el resumen actual', () => {
    const $ = render({ kind: 'changes', hasReport: true })
    expect($('#ai-changes-note').text()).toContain('Regenerar sustituye el resumen actual y usa 1 generación.')
  })

  it('sin informe no habla de sustituir', () => {
    expect(render({ hasReport: false }).text()).not.toContain('sustituye')
  })
})

describe('Errores recuperables (CA9, D-AI-05)', () => {
  it.each([
    'No se pudo generar el plan. Inténtalo de nuevo.',
    'No se pudo conectar con el servidor. Comprueba tu conexión e inténtalo de nuevo.',
  ])('con "%s" el formulario muestra el error y ofrece "Reintentar"', (error) => {
    const $ = render({ hasReport: true, state: { error } })
    expect($('[role="alert"]').text()).toBe(error)
    expect(button($).text()).toBe('Reintentar')
    expect(button($).attr('disabled')).toBeUndefined()
  })
})

describe('Progreso y anuncio único (D-UX-07, D-UX-10)', () => {
  it('mientras genera: botón desactivado, bloque de progreso y un único role="status" sin aria-live', () => {
    const $ = render({ pending: true, state: { message: 'Plan de acción generado.' } })
    expect(button($).attr('disabled')).toBeDefined()
    expect($.text()).toContain('Generando con IA')
    expect($('[role="status"]')).toHaveLength(1)
    expect($('[role="status"]').text()).toBe('Generando el plan de acción con IA. Esto puede tardar uno o dos minutos.')
    expect($('[aria-live]')).toHaveLength(0)
  })

  it('el esqueleto del detalle tiene un único role="status" sin aria-live', () => {
    const $ = parseHtml(renderToStaticMarkup(<DetailSkeleton label="Cargando…" variant="audit" />))
    expect($('[role="status"]')).toHaveLength(1)
    expect($('[aria-live]')).toHaveLength(0)
  })
})

describe('Foco tras generar (CA10)', () => {
  it.each([
    ['plan', '#plan-title'],
    ['changes', '#ai-changes-title'],
  ] as const)('%s: con éxito el foco va a %s', (kind, selector) => {
    expect(LABELS[kind].heading).toBe(selector)
    const focused: string[] = []
    const page = { querySelector: (s: string) => (s === selector ? { focus: () => focused.push(s) } : null) }
    expect(focusActionResult(null, page, { message: 'Generado.' }, LABELS[kind].heading)).toBe(true)
    expect(focused).toEqual([selector])
  })
})
