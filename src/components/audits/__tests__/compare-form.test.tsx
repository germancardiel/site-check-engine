import { readFileSync } from 'node:fs'
import { renderToStaticMarkup } from 'react-dom/server'
import { describe, expect, it } from 'vitest'
import { parseHtml } from '@/lib/audit/parse'
import { CompareForm } from '../compare-form'

const options = [{ id: 'a1', created_at: '2026-11-24T10:00:00.000Z', score: 50 }]

describe('CompareForm (CA11)', () => {
  it('mientras navega el botón muestra "Comparando…" y se desactiva', () => {
    const $ = parseHtml(renderToStaticMarkup(<CompareForm action="/x" options={options} selectedId="a1" pending />))
    const button = $('button[type="submit"]')
    expect(button.text()).toContain('Comparando…')
    expect(button.attr('disabled')).toBeDefined()
  })

  it('en reposo el botón dice "Comparar"', () => {
    const $ = parseHtml(renderToStaticMarkup(<CompareForm action="/x" options={options} selectedId="a1" />))
    expect($('button[type="submit"]').text()).toBe('Comparar')
    expect($('button[type="submit"]').attr('disabled')).toBeUndefined()
  })

  it('conserva la posición al comparar (scroll={false})', () => {
    const source = readFileSync(new URL('../compare-form.tsx', import.meta.url), 'utf8')
    expect(source).toContain('<Form action={action} scroll={false}')
  })
})
