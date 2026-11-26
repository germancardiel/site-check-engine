import { renderToStaticMarkup } from 'react-dom/server'
import { describe, expect, it } from 'vitest'
import { parseHtml } from '@/lib/audit/parse'
import { RouteError } from '../route-error'

describe('RouteError (T21 CA6)', () => {
  it('muestra un título descriptivo, Reintentar y el enlace "Volver a tus sitios" por defecto', () => {
    const $ = parseHtml(
      renderToStaticMarkup(<RouteError title="No se pudo cargar el sitio" message="Mensaje" onRetry={() => {}} />),
    )
    expect($('h1').text()).toBe('No se pudo cargar el sitio')
    expect($('button').text()).toBe('Reintentar')
    const back = $('a')
    expect(back.text()).toBe('Volver a tus sitios')
    expect(back.attr('href')).toBe('/sitios')
  })

  it('en los errores raíz el enlace es "Ir al inicio"', () => {
    const $ = parseHtml(
      renderToStaticMarkup(
        <RouteError title="t" message="m" onRetry={() => {}} backHref="/" backLabel="Ir al inicio" />,
      ),
    )
    expect($('a').text()).toBe('Ir al inicio')
    expect($('a').attr('href')).toBe('/')
  })
})
