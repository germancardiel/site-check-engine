import { describe, expect, it } from 'vitest'
import { cn } from '@/lib/utils'

describe('cn', () => {
  it('une clases y descarta valores falsy', () => {
    expect(cn('px-2', false, undefined, null, 'py-1')).toBe('px-2 py-1')
  })

  it('aplica clases condicionales con objetos', () => {
    expect(cn('base', { activo: true, oculto: false })).toBe('base activo')
  })

  it('resuelve conflictos de Tailwind quedándose con la última clase', () => {
    expect(cn('px-2 text-sm', 'px-4')).toBe('text-sm px-4')
  })
})
