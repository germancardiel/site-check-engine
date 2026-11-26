import { describe, expect, it, vi } from 'vitest'
import { FIELD_ERROR_SELECTOR, FORM_ERROR_SELECTOR, focusFirstError, type FocusRoot } from '@/lib/form-focus'

/** Fake form: `querySelector` returns the first element with that selector, whose `focus` is a spy. */
function fakeRoot(elements: Record<string, string>) {
  const focused: string[] = []
  const root: FocusRoot = {
    querySelector: vi.fn((selector: string) => {
      const name = elements[selector]
      return name ? { focus: () => focused.push(name) } : null
    }),
  }
  return { root, focused }
}

describe('focusFirstError', () => {
  it('con errores de campo enfoca el primer campo con aria-invalid', () => {
    const { root, focused } = fakeRoot({ [FIELD_ERROR_SELECTOR]: 'email', [FORM_ERROR_SELECTOR]: 'mensaje' })
    expect(focusFirstError(root, { fieldErrors: { email: 'x', password: 'y' }, error: 'general' })).toBe(true)
    expect(focused).toEqual(['email'])
    expect(root.querySelector).toHaveBeenCalledWith('[aria-invalid="true"]')
  })

  it('con un error general enfoca el mensaje', () => {
    const { root, focused } = fakeRoot({ [FORM_ERROR_SELECTOR]: 'mensaje' })
    expect(focusFirstError(root, { error: 'No se pudo iniciar sesión.', fieldErrors: {} })).toBe(true)
    expect(focused).toEqual(['mensaje'])
    expect(root.querySelector).toHaveBeenCalledWith('[data-form-error]')
  })

  it('ignora fieldErrors sin mensajes', () => {
    const { root, focused } = fakeRoot({ [FIELD_ERROR_SELECTOR]: 'email' })
    expect(focusFirstError(root, { fieldErrors: { email: undefined } })).toBe(false)
    expect(focused).toEqual([])
  })

  it('sin errores (estado inicial o éxito) no mueve el foco', () => {
    const { root, focused } = fakeRoot({ [FIELD_ERROR_SELECTOR]: 'email', [FORM_ERROR_SELECTOR]: 'mensaje' })
    expect(focusFirstError(root, {})).toBe(false)
    expect(root.querySelector).not.toHaveBeenCalled()
    expect(focused).toEqual([])
  })

  it('no falla sin formulario o si el destino no está en el DOM', () => {
    expect(focusFirstError(null, { error: 'x' })).toBe(false)
    const { root } = fakeRoot({})
    expect(focusFirstError(root, { error: 'x' })).toBe(false)
  })
})
