import type { ReactElement } from 'react'
import { renderToStaticMarkup } from 'react-dom/server'
import { describe, expect, it, vi } from 'vitest'
import { parseHtml } from '@/lib/audit/parse'
import { FormFeedback } from '../form-feedback'
import { PasswordField, PasswordFieldView } from '../password-field'
import { TextField } from '../text-field'

describe('TextField', () => {
  it('sin error no marca el campo como inválido y describe solo con la pista', () => {
    const $ = parseHtml(renderToStaticMarkup(<TextField id="email" label="Email" hint="Pista" />))
    const input = $('input#email')
    expect(input.attr('aria-invalid')).toBeUndefined()
    expect(input.attr('aria-describedby')).toBe('email-hint')
    expect($('#email-error')).toHaveLength(0)
  })

  it('con error pinta el mensaje junto al campo, aria-invalid y combina pista, error y describedby recibido', () => {
    const html = renderToStaticMarkup(
      <TextField id="site-url" label="URL" hint="Pista" error="URL no válida" aria-describedby="site-url-extra" />,
    )
    const $ = parseHtml(html)
    const input = $('input#site-url')
    expect(input.attr('aria-invalid')).toBe('true')
    expect(input.attr('aria-describedby')).toBe('site-url-hint site-url-error site-url-extra')
    expect($('p#site-url-error').text()).toBe('URL no válida')
    expect(input.next('p').attr('id')).toBe('site-url-error')
  })

  it('sin pista conserva el aria-describedby recibido', () => {
    const $ = parseHtml(renderToStaticMarkup(<TextField id="a" label="A" aria-describedby="externo" />))
    expect($('input#a').attr('aria-describedby')).toBe('externo')
  })
})

describe('FormFeedback (CA5)', () => {
  it('el error usa role="alert" sin aria-live y es enfocable', () => {
    const $ = parseHtml(renderToStaticMarkup(<FormFeedback error="Falló" />))
    const alert = $('[role="alert"]')
    expect(alert.text()).toBe('Falló')
    expect(alert.attr('aria-live')).toBeUndefined()
    expect(alert.find('[data-form-error]').attr('tabindex')).toBe('-1')
  })

  it('el éxito usa role="status" sin aria-live', () => {
    const $ = parseHtml(renderToStaticMarkup(<FormFeedback message="Hecho" />))
    expect($('[role="status"]').text()).toBe('Hecho')
    expect($('[role="alert"]').text()).toBe('')
  })

  it('ningún elemento tiene role="alert" y aria-live a la vez, ni aria-live duplicado', () => {
    const $ = parseHtml(renderToStaticMarkup(<FormFeedback error="Falló" message="Hecho" />))
    expect($('[aria-live]')).toHaveLength(0)
    expect($('[role="alert"][aria-live]')).toHaveLength(0)
  })
})

describe('PasswordField (CA6)', () => {
  const render = (visible: boolean) =>
    parseHtml(
      renderToStaticMarkup(
        <PasswordFieldView id="password" name="password" label="Contraseña" visible={visible} onToggle={() => {}} />,
      ),
    )

  it('oculta la contraseña por defecto y el botón dice "Mostrar"', () => {
    const $ = parseHtml(renderToStaticMarkup(<PasswordField id="password" name="password" label="Contraseña" />))
    expect($('input#password').attr('type')).toBe('password')
    const button = $('button[type="button"]')
    expect(button.text()).toBe('Mostrar')
    expect(button.attr('aria-label')).toBe('Mostrar contraseña')
    expect(button.attr('aria-controls')).toBe('password')
  })

  it('visible: el campo pasa a type="text" y el botón a "Ocultar contraseña"', () => {
    const hidden = render(false)
    const shown = render(true)
    expect(hidden('input#password').attr('type')).toBe('password')
    expect(shown('input#password').attr('type')).toBe('text')
    expect(shown('button').attr('aria-label')).toBe('Ocultar contraseña')
    expect(shown('button').text()).toBe('Ocultar')
  })

  it('el botón no envía el formulario, mide al menos 40 px y llama a onToggle', () => {
    const onToggle = vi.fn()
    const $ = render(false)
    const classes = $('button').attr('class') ?? ''
    expect(classes).toContain('min-h-10')
    expect(classes).toContain('min-w-20')
    const tree = PasswordFieldView({ id: 'password', label: 'Contraseña', visible: false, onToggle }) as ReactElement<{
      trailing: ReactElement<{ onClick: () => void }>
    }>
    tree.props.trailing.props.onClick()
    expect(onToggle).toHaveBeenCalledTimes(1)
  })

  it('con error marca el campo como inválido', () => {
    const $ = parseHtml(
      renderToStaticMarkup(<PasswordField id="password" label="Contraseña" hint="Entre 8 y 72 caracteres." error="Corta" />),
    )
    expect($('input#password').attr('aria-invalid')).toBe('true')
    expect($('input#password').attr('aria-describedby')).toBe('password-hint password-error')
  })
})
