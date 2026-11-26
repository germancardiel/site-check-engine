import { renderToStaticMarkup } from 'react-dom/server'
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import { parseHtml } from '@/lib/audit/parse'
import { startCountdown } from '@/lib/countdown'
import { auditCooldown } from '@/lib/sites/audit-availability'
import type { SiteActionState } from '@/lib/validation/site'

vi.mock('@/app/(app)/sitios/actions', () => ({ auditSite: vi.fn() }))

import { AuditSiteForm, AuditSiteFormView } from '../audit-site-form'

const SITE_ID = 'site-1'
const noop = () => {}

type ViewOverrides = { state?: SiteActionState; pending?: boolean; secondsLeft?: number; remaining?: number | null }

function render({ state = {}, pending = false, secondsLeft = 0, remaining = 10 }: ViewOverrides = {}) {
  return parseHtml(
    renderToStaticMarkup(
      <AuditSiteFormView
        siteId={SITE_ID}
        siteName="Mi web"
        state={state}
        formAction={noop}
        pending={pending}
        secondsLeft={secondsLeft}
        remaining={remaining}
      />,
    ),
  )
}

const button = ($: ReturnType<typeof render>) => $('button[type="submit"]')

describe('AuditSiteForm: progreso (CA2)', () => {
  it('mientras audita muestra el bloque de progreso con la estimación y un único role="status"', () => {
    const $ = render({ pending: true })
    expect(button($).attr('disabled')).toBeDefined()
    expect(button($).text()).toContain('Auditando…')
    expect($.text()).toContain('Suele tardar entre 10 y 60 segundos.')
    expect($.text()).toContain('00:00')
    expect($('[role="status"]')).toHaveLength(1)
    expect($('[role="status"]').text()).toBe('Auditando Mi web. Suele tardar entre 10 y 60 segundos.')
    expect($('[aria-live]')).toHaveLength(0)
  })

  it('sin auditar no hay bloque de progreso ni anuncio', () => {
    const $ = render()
    expect($.text()).not.toContain('Suele tardar')
    expect($('[role="status"]').text()).toBe('')
    expect(button($).attr('disabled')).toBeUndefined()
  })
})

describe('AuditSiteForm: espera de 1 minuto (CA3)', () => {
  beforeEach(() => {
    vi.useFakeTimers()
    vi.setSystemTime(new Date('2026-11-26T10:00:20.000Z'))
  })
  afterEach(() => vi.useRealTimers())

  it('con la última auditoría hace 20 s el botón está desactivado con la cuenta atrás y al llegar a 0 se activa', () => {
    const cooldown = auditCooldown('2026-11-26T10:00:00.000Z', new Date())
    expect(cooldown).toEqual({ availableAt: '2026-11-26T10:01:00.000Z', secondsLeft: 40 })

    // Same wiring as `useCountdown`: the countdown drives the `secondsLeft` of the view.
    let secondsLeft = cooldown?.secondsLeft ?? 0
    startCountdown({
      target: Date.parse(cooldown?.availableAt ?? ''),
      now: () => Date.now(),
      onTick: (left) => {
        secondsLeft = left
      },
    })

    let $ = render({ secondsLeft })
    expect(button($).attr('disabled')).toBeDefined()
    expect($(`#audit-${SITE_ID}-note`).text()).toContain('Disponible en 0:40')
    expect(button($).attr('aria-describedby')).toBe(`audit-${SITE_ID}-note`)

    vi.advanceTimersByTime(18_000)
    $ = render({ secondsLeft })
    expect($(`#audit-${SITE_ID}-note`).text()).toContain('Disponible en 0:22')
    expect(button($).attr('disabled')).toBeDefined()

    vi.advanceTimersByTime(22_000)
    $ = render({ secondsLeft })
    expect(secondsLeft).toBe(0)
    expect(button($).attr('disabled')).toBeUndefined()
    expect($.text()).not.toContain('Disponible en')
    expect($.text()).toContain('Te quedan 10 auditorías hoy.')
  })

  it('el contenedor pinta en el primer render los segundos calculados en el servidor', () => {
    const html = renderToStaticMarkup(
      <AuditSiteForm
        siteId={SITE_ID}
        siteName="Mi web"
        remaining={3}
        cooldown={{ availableAt: '2026-11-26T10:01:00.000Z', secondsLeft: 40 }}
      />,
    )
    const $ = parseHtml(html)
    expect(button($).attr('disabled')).toBeDefined()
    expect($.text()).toContain('Disponible en 0:40')
  })
})

describe('AuditSiteForm: cuota diaria (CA4)', () => {
  it('con 0 auditorías restantes el botón está desactivado con el motivo visible y enlazado', () => {
    const $ = render({ remaining: 0 })
    expect(button($).attr('disabled')).toBeDefined()
    const note = $(`#audit-${SITE_ID}-note`)
    expect(note.text()).toBe('Has alcanzado el límite de 15 auditorías por hoy. Vuelve mañana.')
    expect(button($).attr('aria-describedby')).toBe(`audit-${SITE_ID}-note`)
  })

  it('con cuota informa de lo que queda antes de pulsar', () => {
    expect(render({ remaining: 1 })(`#audit-${SITE_ID}-note`).text()).toBe('Te queda 1 auditoría hoy.')
  })

  it('si no se pudo leer la cuota no la muestra ni bloquea', () => {
    const $ = render({ remaining: null })
    expect($(`#audit-${SITE_ID}-note`)).toHaveLength(0)
    expect(button($).attr('disabled')).toBeUndefined()
  })

  it('en la lista (showQuota=false) solo muestra el motivo cuando bloquea', () => {
    const html = (remaining: number) =>
      renderToStaticMarkup(
        <AuditSiteFormView
          siteId={SITE_ID}
          siteName="Mi web"
          state={{}}
          formAction={noop}
          pending={false}
          secondsLeft={0}
          remaining={remaining}
          showQuota={false}
        />,
      )
    expect(html(5)).not.toContain('Te quedan')
    expect(html(0)).toContain('Has alcanzado el límite de 15 auditorías por hoy.')
  })
})

describe('AuditSiteForm: errores recuperables (CA9, D-UX-12)', () => {
  it('un error de la action (o de red) se muestra en el formulario con el botón activo', () => {
    const $ = render({ state: { error: 'No se pudo conectar con el servidor. Comprueba tu conexión e inténtalo de nuevo.' } })
    expect($('[role="alert"]').text()).toContain('No se pudo conectar con el servidor.')
    expect(button($).attr('disabled')).toBeUndefined()
  })
})
