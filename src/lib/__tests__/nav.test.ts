import { describe, expect, it } from 'vitest'
import { navCurrent } from '@/lib/nav'

describe('navCurrent', () => {
  it('marca aria-current="page" en la propia página', () => {
    expect(navCurrent('/sitios', '/sitios')).toBe('page')
  })

  it('marca aria-current="true" dentro de la sección', () => {
    expect(navCurrent('/sitios/123/auditorias/456', '/sitios')).toBe('true')
  })

  it('no marca nada fuera de la sección ni en rutas con el mismo prefijo', () => {
    expect(navCurrent('/', '/sitios')).toBeUndefined()
    expect(navCurrent('/sitios-viejos', '/sitios')).toBeUndefined()
  })
})
