import { describe, expect, it } from 'vitest'
import { parseHtml } from '../parse'
import {
  countSyllables,
  extractJsonLdInfo,
  extractVisibleText,
  fernandezHuerta,
  nodesOfType,
  readabilityLabel,
  sentences,
  typesOf,
  words,
} from '../text'

describe('countSyllables y fernandezHuerta', () => {
  it.each([
    ['casa', 2],
    ['día', 2],
    ['poeta', 3],
    ['bien', 1],
    ['que', 1],
    ['hoy', 1],
    ['entrenamiento', 5],
    ['murciélago', 4],
    ['123', 0],
  ])('%s tiene %i sílabas', (w, n) => {
    expect(countSyllables(w)).toBe(n)
  })

  it('calcula Fernández Huerta y devuelve null con menos de 50 palabras', () => {
    expect(fernandezHuerta('Texto muy corto.', ['Texto muy corto.'])).toBeNull()
    const short = Array(20).fill('El perro come pan. La casa es azul. Yo voy al mar.').join(' ')
    const long = Array(10)
      .fill(
        'La implementación de metodologías interdisciplinares en organizaciones contemporáneas constituye, indudablemente, una oportunidad extraordinaria para optimizar procedimientos administrativos.',
      )
      .join(' ')
    const s = fernandezHuerta(short, short.split(/(?<=\.)\s+/))!
    const l = fernandezHuerta(long, long.split(/(?<=\.)\s+/))!
    expect(s.score).toBeGreaterThan(80)
    expect(l.score).toBeLessThan(30)
  })

  it('clasifica todas las franjas de readabilityLabel', () => {
    expect(readabilityLabel(85)).toBe('Fácil')
    expect(readabilityLabel(75)).toBe('Bastante fácil')
    expect(readabilityLabel(65)).toBe('Normal')
    expect(readabilityLabel(55)).toBe('Moderadamente difícil')
    expect(readabilityLabel(35)).toBe('Difícil')
    expect(readabilityLabel(15)).toBe('Muy difícil')
  })
})

describe('extractVisibleText, words, sentences y extractJsonLdInfo', () => {
  it('extrae texto visible y bloques de prosa sin scripts ni menús', () => {
    const $ = parseHtml(
      '<html><body><nav><p>Menú largo que no es prosa aquí</p></nav><main><p>Este es un párrafo de contenido con varias palabras claras.</p><script>alert(1)</script></main></body></html>',
    )
    const { visible, prose } = extractVisibleText($)
    expect(visible).toContain('Este es un párrafo')
    expect(visible).not.toContain('alert')
    expect(prose).toEqual(['Este es un párrafo de contenido con varias palabras claras.'])
    expect(words(visible).length).toBeGreaterThan(5)
    expect(sentences(prose)).toHaveLength(1)
  })

  it('extrae nodos JSON-LD, @graph, tipos múltiples y errores de sintaxis', () => {
    const $ = parseHtml(
      '<script type="application/ld+json">{"@graph":[{"@type":["WebSite","Thing"]},{"@type":"Organization","name":"GCA"}]}</script><script type="application/ld+json">{roto</script><script type="application/ld+json">   </script>',
    )
    const info = extractJsonLdInfo($)
    expect(info.blocks).toBe(3)
    expect(info.parseErrors).toBe(1)
    expect(info.types.sort()).toEqual(['Organization', 'Thing', 'WebSite'])
    expect(nodesOfType(info, 'Organization')).toHaveLength(1)
    expect(typesOf({})).toEqual([])
  })
})
