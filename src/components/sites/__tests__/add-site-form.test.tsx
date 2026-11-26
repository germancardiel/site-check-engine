import { renderToStaticMarkup } from 'react-dom/server'
import { describe, expect, it, vi } from 'vitest'
import { parseHtml } from '@/lib/audit/parse'
import type { SiteActionState } from '@/lib/validation/site'

vi.mock('@/app/(app)/sitios/actions', () => ({ createSite: vi.fn() }))

import { AddSiteForm, AddSiteFormView } from '../add-site-form'

const noop = () => {}

function render(state: SiteActionState) {
  return parseHtml(renderToStaticMarkup(<AddSiteFormView state={state} formAction={noop} />))
}

describe('AddSiteForm (T19)', () => {
  it('sin enviar no tiene valores ni errores', () => {
    const $ = parseHtml(renderToStaticMarkup(<AddSiteForm />))
    expect($('input#site-url').attr('value')).toBeUndefined()
    expect($('input#site-url').attr('aria-invalid')).toBeUndefined()
    expect($('input#site-url').attr('aria-describedby')).toBe('site-url-hint')
  })

  it('tras un error general conserva la URL y el nombre escritos (CA2)', () => {
    const $ = render({ error: 'Ya tienes este sitio.', values: { url: 'ejemplo.com', name: 'Mi web' } })
    expect($('input#site-url').attr('value')).toBe('ejemplo.com')
    expect($('input#site-name').attr('value')).toBe('Mi web')
    expect($('[role="alert"]').text()).toBe('Ya tienes este sitio.')
  })

  it('con errores de campo los pinta junto a cada campo y conserva lo escrito (CA2, D-UX-09)', () => {
    const $ = render({
      fieldErrors: { url: 'Solo se admiten direcciones http:// o https://.', name: 'El nombre no puede superar 80 caracteres.' },
      values: { url: 'ftp://ejemplo.com', name: 'x' },
    })
    const url = $('input#site-url')
    expect(url.attr('value')).toBe('ftp://ejemplo.com')
    expect(url.attr('aria-invalid')).toBe('true')
    expect(url.attr('aria-describedby')).toBe('site-url-error site-url-hint')
    expect($('#site-url-error').text()).toBe('Solo se admiten direcciones http:// o https://.')
    expect($('input#site-name').attr('aria-describedby')).toBe('site-name-error')
    expect($('[role="alert"]').text()).toBe('')
  })

  it('tras añadir el sitio el formulario queda vacío y el éxito se anuncia con role="status"', () => {
    const $ = render({ message: 'Sitio añadido.' })
    expect($('input#site-url').attr('value')).toBeUndefined()
    expect($('[role="status"]').text()).toBe('Sitio añadido.')
  })
})
