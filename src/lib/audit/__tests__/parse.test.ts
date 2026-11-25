import { describe, expect, it } from 'vitest'
import { collectSchemaTypes, countWords, extractJsonLd, looksLikeHtml, parseHtml, visibleText } from '../parse'
import { readFixture } from './fixtures/helpers'

describe('visibleText y countWords', () => {
  it('ignora scripts, estilos y head', () => {
    const $ = parseHtml('<html><head><title>T</title></head><body><p>Hola  mundo</p><script>oculto()</script><style>.x{}</style><noscript>no</noscript></body></html>')
    expect(visibleText($)).toBe('Hola mundo')
  })

  it('cuenta palabras con tildes, números y guiones', () => {
    expect(countWords('Él compró 3 cajas de café-crema, ¿vale?')).toBe(7)
    expect(countWords('   ')).toBe(0)
  })

  it('no modifica el documento original', () => {
    const $ = parseHtml(readFixture('good.html'))
    visibleText($)
    expect($('script').length).toBeGreaterThan(0)
  })
})

describe('extractJsonLd y collectSchemaTypes', () => {
  it('separa bloques válidos e inválidos', () => {
    const $ = parseHtml('<script type="application/ld+json">{"@type":"Person"}</script><script type="application/ld+json">{mal</script>')
    const { blocks, valid } = extractJsonLd($)
    expect(blocks).toBe(2)
    expect(valid).toEqual([{ '@type': 'Person' }])
  })

  it('recorre arrays, @graph, tipos múltiples y objetos anidados', () => {
    const types = collectSchemaTypes([
      { '@graph': [{ '@type': ['WebSite', 'Thing'] }, { '@type': 'Article', author: { '@type': 'Person' } }] },
      'texto',
      null,
    ])
    expect([...types].sort()).toEqual(['Article', 'Person', 'Thing', 'WebSite'])
  })
})

describe('looksLikeHtml', () => {
  it('detecta documentos HTML y no texto plano', () => {
    expect(looksLikeHtml('<!DOCTYPE html><html>')).toBe(true)
    expect(looksLikeHtml('  <html lang="es">')).toBe(true)
    expect(looksLikeHtml('User-agent: *')).toBe(false)
    expect(looksLikeHtml('# llms.txt')).toBe(false)
  })
})
