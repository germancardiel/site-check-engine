import { renderToStaticMarkup } from 'react-dom/server'
import { describe, expect, it, vi } from 'vitest'
import { parseHtml } from '@/lib/audit/parse'

vi.mock('@/app/(app)/sitios/actions', () => ({
  logout: vi.fn(),
}))

vi.mock('next/navigation', () => ({
  usePathname: () => '/sitios',
}))

import { AppHeader } from '../app-header'
import { PublicHeader } from '../public-header'
import { ThemeToggle } from '../theme-toggle'

describe('ThemeToggle en PublicHeader y AppHeader (CA10)', () => {
  it('renderiza un botón con aria-label descriptivo, icono SVG y etiqueta en SSR', () => {
    const html = renderToStaticMarkup(<ThemeToggle />)
    const $ = parseHtml(html)
    const btn = $('button[type="button"]')
    expect(btn).toHaveLength(1)
    expect(btn.attr('aria-label')).toBe('Cambiar a tema claro')
    expect(btn.find('svg')).toHaveLength(1)
    expect(btn.text()).toBe('Claro')
  })

  it('está presente tanto en PublicHeader como en AppHeader', () => {
    const pubHtml = renderToStaticMarkup(<PublicHeader />)
    const appHtml = renderToStaticMarkup(<AppHeader />)
    expect(parseHtml(pubHtml)('button[aria-label="Cambiar a tema claro"]')).toHaveLength(1)
    expect(parseHtml(appHtml)('button[aria-label="Cambiar a tema claro"]')).toHaveLength(1)
  })
})
