import { describe, expect, it } from 'vitest'
import { anchorIdFromHash, closedDetailsAround, type AnchorNode } from '@/lib/anchor'

function node(tagName: string, parentElement: AnchorNode | null, open?: boolean): AnchorNode {
  return { tagName, parentElement, open }
}

describe('anchorIdFromHash', () => {
  it('quita la almohadilla y decodifica el id', () => {
    expect(anchorIdFromHash('#check-title')).toBe('check-title')
    expect(anchorIdFromHash('check-title')).toBe('check-title')
    expect(anchorIdFromHash('#check-t%C3%ADtulo')).toBe('check-título')
  })

  it('devuelve null sin ancla', () => {
    expect(anchorIdFromHash('')).toBeNull()
    expect(anchorIdFromHash('#')).toBeNull()
  })

  it('devuelve el texto tal cual si no se puede decodificar', () => {
    expect(anchorIdFromHash('#check-%E0%A4%A')).toBe('check-%E0%A4%A')
  })
})

describe('closedDetailsAround', () => {
  it('encuentra el <details> cerrado que contiene el check', () => {
    const details = node('DETAILS', node('SECTION', null), false)
    const item = node('LI', node('UL', details))
    expect(closedDetailsAround(item)).toEqual([details])
  })

  it('devuelve los <details> anidados de dentro hacia fuera e ignora los abiertos', () => {
    const outer = node('details', null, false)
    const open = node('DETAILS', outer, true)
    const inner = node('DETAILS', open, false)
    const item = node('LI', inner)
    expect(closedDetailsAround(item)).toEqual([inner, outer])
  })

  it('incluye el propio objetivo si es un <details> cerrado', () => {
    const details = node('DETAILS', null)
    expect(closedDetailsAround(details)).toEqual([details])
  })

  it('no devuelve nada si el check no está plegado', () => {
    expect(closedDetailsAround(node('LI', node('UL', null)))).toEqual([])
  })
})
