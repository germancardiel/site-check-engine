import { renderToStaticMarkup } from 'react-dom/server'
import { afterEach, describe, expect, it, vi } from 'vitest'
import { login } from '@/app/(auth)/login/actions'
import { parseHtml } from '@/lib/audit/parse'
import { focusFirstError, type FocusRoot } from '@/lib/form-focus'
import type { AuthFormState } from '@/lib/validation/auth'

// The real actions import the Supabase server client; they are not under test here.
vi.mock('@/app/(auth)/login/actions', () => ({ login: vi.fn() }))
vi.mock('@/app/(auth)/registro/actions', () => ({ register: vi.fn(), resendConfirmation: vi.fn() }))
vi.mock('@/app/(auth)/recuperar/actions', () => ({ requestPasswordReset: vi.fn() }))
vi.mock('@/app/(app)/nueva-contrasena/actions', () => ({ updatePassword: vi.fn() }))

import { LoginForm, LoginFormView } from '../login-form'
import { NewPasswordForm, NewPasswordFormView } from '../new-password-form'
import { PasswordResetForm, PasswordResetFormView } from '../password-reset-form'
import { RegisterForm, RegisterFormView } from '../register-form'

const noop = () => {}

/**
 * Focus root over the rendered markup: `focus()` sets a stubbed `document.activeElement`,
 * so the test checks where `focusFirstError` (used by every form after an action) puts the focus.
 */
function focusRootFor(html: string): FocusRoot {
  const $ = parseHtml(html)
  vi.stubGlobal('document', { activeElement: null })
  return {
    querySelector: (selector) => {
      const element = $(selector).first()
      if (element.length === 0) return null
      return {
        focus: () => {
          const active = { id: element.attr('id') ?? '', tagName: element.prop('tagName') ?? '' }
          Object.assign(document, { activeElement: active })
        },
      }
    },
  }
}

afterEach(() => {
  vi.unstubAllGlobals()
})

const REGISTER_ERRORS: AuthFormState = {
  fieldErrors: {
    email: 'Introduce un email válido.',
    password: 'La contraseña debe tener al menos 8 caracteres.',
  },
  values: { email: 'ana' },
}

describe('RegisterFormView (CA4)', () => {
  it('sin enviar muestra el formulario de registro', () => {
    const $ = parseHtml(renderToStaticMarkup(<RegisterForm />))
    expect($('input#email')).toHaveLength(1)
    expect($('input#password[type="password"]')).toHaveLength(1)
    expect($('label[for="email"]').text()).toBe('Email')
    expect($.text()).not.toContain('Reenviar correo')
  })

  it('tras el registro sin sesión oculta el formulario, repite el email y ofrece "Reenviar correo"', () => {
    const html = renderToStaticMarkup(<RegisterFormView state={{ sentTo: 'ana@example.com' }} formAction={noop} />)
    const $ = parseHtml(html)
    expect($('input#password')).toHaveLength(0)
    expect($('input#email')).toHaveLength(0)
    expect($('[role="status"]').text()).toContain('Te hemos enviado un enlace a ana@example.com')
    const resend = $('form[aria-label="Reenviar el correo de confirmación"]')
    expect(resend.find('input[type="hidden"][name="email"]').attr('value')).toBe('ana@example.com')
    expect(resend.find('button[type="submit"]').text()).toBe('Reenviar correo')
  })

  it('tras un error conserva el email y nunca la contraseña (D-UX-08)', () => {
    const $ = parseHtml(
      renderToStaticMarkup(
        <RegisterFormView state={{ error: 'x', values: { email: 'ana@example.com' } }} formAction={noop} />,
      ),
    )
    expect($('input#email').attr('value')).toBe('ana@example.com')
    expect($('input#password').attr('value')).toBeUndefined()
    expect($('[role="alert"]').text()).toBe('x')
  })
})

describe('RegisterFormView — errores de campo (T19)', () => {
  it('cada campo muestra su error, aria-invalid y aria-describedby con la pista y el error (CA3)', () => {
    const $ = parseHtml(renderToStaticMarkup(<RegisterFormView state={REGISTER_ERRORS} formAction={noop} />))
    const email = $('input#email')
    const password = $('input#password')
    expect(email.attr('aria-invalid')).toBe('true')
    expect(email.attr('aria-describedby')?.split(' ')).toContain('email-error')
    expect($('#email-error').text()).toBe('Introduce un email válido.')
    expect(password.attr('aria-invalid')).toBe('true')
    expect(password.attr('aria-describedby')?.split(' ')).toEqual(['password-hint', 'password-error'])
    expect($('#password-error').text()).toBe('La contraseña debe tener al menos 8 caracteres.')
    expect($('#password-hint').text()).toBe('Entre 8 y 72 caracteres.')
  })

  it('conserva el email y nunca la contraseña tras un error de campo (CA2)', () => {
    const $ = parseHtml(renderToStaticMarkup(<RegisterFormView state={REGISTER_ERRORS} formAction={noop} />))
    expect($('input#email').attr('value')).toBe('ana')
    expect($('input#password').attr('value')).toBeUndefined()
    expect($('input#password').attr('maxlength')).toBe('72')
  })

  it('el foco va al primer campo con error (CA4)', () => {
    const html = renderToStaticMarkup(<RegisterFormView state={REGISTER_ERRORS} formAction={noop} />)
    expect(focusFirstError(focusRootFor(html), REGISTER_ERRORS)).toBe(true)
    expect(document.activeElement?.id).toBe('email')
  })

  it('si solo falla la contraseña, el foco va a la contraseña (CA4)', () => {
    const state: AuthFormState = { fieldErrors: { password: 'Corta' }, values: { email: 'ana@example.com' } }
    const html = renderToStaticMarkup(<RegisterFormView state={state} formAction={noop} />)
    focusFirstError(focusRootFor(html), state)
    expect(document.activeElement?.id).toBe('password')
    expect(parseHtml(html)('input#email').attr('aria-invalid')).toBeUndefined()
  })

  it('con un error general (no de campo) el foco va al mensaje', () => {
    const state: AuthFormState = { error: 'No se pudo crear la cuenta.', values: { email: 'ana@example.com' } }
    const html = renderToStaticMarkup(<RegisterFormView state={state} formAction={noop} />)
    focusFirstError(focusRootFor(html), state)
    expect(document.activeElement?.tagName.toLowerCase()).toBe('p')
    expect(parseHtml(html)('[data-form-error]').text()).toBe('No se pudo crear la cuenta.')
  })
})

describe('LoginFormView — error del servidor (CA1)', () => {
  it('con la action simulada devolviendo error, conserva el email y vacía la contraseña', async () => {
    vi.mocked(login).mockResolvedValue({
      error: 'No se pudo iniciar sesión. Revisa el email y la contraseña.',
      values: { email: 'ana@example.com' },
    })
    const data = new FormData()
    data.set('email', 'ana@example.com')
    data.set('password', 'secreto123')
    const state = await login({}, data)

    const html = renderToStaticMarkup(<LoginFormView state={state} formAction={noop} />)
    const $ = parseHtml(html)
    expect($('input#email').attr('value')).toBe('ana@example.com')
    expect($('input#password').attr('value')).toBeUndefined()
    expect(html).not.toContain('secreto123')
    expect($('[data-form-error]').text()).toBe('No se pudo iniciar sesión. Revisa el email y la contraseña.')
  })

  it('con errores de campo los muestra junto al email y la contraseña', () => {
    const state: AuthFormState = { fieldErrors: { password: 'Introduce tu contraseña.' }, values: { email: 'ana@example.com' } }
    const $ = parseHtml(renderToStaticMarkup(<LoginFormView state={state} formAction={noop} />))
    expect($('input#password').attr('aria-invalid')).toBe('true')
    expect($('input#password').attr('aria-describedby')).toBe('password-error')
    expect($('input#email').attr('value')).toBe('ana@example.com')
    expect($('button[aria-label="Mostrar contraseña"]')).toHaveLength(1)
  })
})

describe('LoginFormView', () => {
  it('muestra el enlace "¿Has olvidado tu contraseña?" a /recuperar (CA6)', () => {
    const $ = parseHtml(renderToStaticMarkup(<LoginForm />))
    const link = $('a[href="/recuperar"]')
    expect(link).toHaveLength(1)
    expect(link.text()).toBe('¿Has olvidado tu contraseña?')
  })

  it('envía next en un campo oculto solo si lo hay (CA7)', () => {
    expect(parseHtml(renderToStaticMarkup(<LoginForm />))('input[name="next"]')).toHaveLength(0)
    const $ = parseHtml(renderToStaticMarkup(<LoginForm next="/sitios/abc" />))
    expect($('input[type="hidden"][name="next"]').attr('value')).toBe('/sitios/abc')
  })

  it('muestra el aviso de enlace no válido recibido de la página', () => {
    const $ = parseHtml(renderToStaticMarkup(<LoginForm notice="El enlace no es válido o ha caducado. Pide uno nuevo." />))
    expect($('[role="alert"]').text()).toContain('El enlace no es válido o ha caducado')
  })

  it('con email sin confirmar muestra el mensaje y "Reenviar correo" a ese email (CA5)', () => {
    const state = {
      error: 'Confirma tu email antes de entrar.',
      values: { email: 'Ana@Example.com' },
      unconfirmedEmail: 'ana@example.com',
    }
    const $ = parseHtml(renderToStaticMarkup(<LoginFormView state={state} formAction={noop} />))
    expect($('[role="alert"]').first().text()).toBe('Confirma tu email antes de entrar.')
    expect($('input#email').attr('value')).toBe('Ana@Example.com')
    const resend = $('form[aria-label="Reenviar el correo de confirmación"]')
    expect(resend.find('input[name="email"]').attr('value')).toBe('ana@example.com')
    expect(resend.find('button').text()).toBe('Reenviar correo')
  })

  it('con otro error no ofrece reenviar el correo', () => {
    const state = { error: 'No se pudo iniciar sesión. Revisa el email y la contraseña.' }
    const html = renderToStaticMarkup(<LoginFormView state={state} formAction={noop} />)
    expect(html).not.toContain('Reenviar correo')
  })
})

describe('PasswordResetForm y NewPasswordForm', () => {
  it('/recuperar tiene un campo email con label y el botón "Enviar enlace"', () => {
    const $ = parseHtml(renderToStaticMarkup(<PasswordResetForm />))
    expect($('label[for="email"]').text()).toBe('Email')
    expect($('input#email[type="email"]')).toHaveLength(1)
    expect($('button[type="submit"]').text()).toBe('Enviar enlace')
  })

  it('/recuperar conserva el email tras un error (D-UX-08)', () => {
    const state = { error: 'Introduce un email válido.', values: { email: 'ana@' } }
    const $ = parseHtml(renderToStaticMarkup(<PasswordResetFormView state={state} formAction={noop} />))
    expect($('input#email').attr('value')).toBe('ana@')
    expect($('[role="alert"]').text()).toBe('Introduce un email válido.')
  })

  it('/recuperar muestra el mensaje común tras enviar', () => {
    const state = { message: 'Si existe una cuenta con ese email, te hemos enviado un enlace.' }
    const $ = parseHtml(renderToStaticMarkup(<PasswordResetFormView state={state} formAction={noop} />))
    expect($('[role="status"]').text()).toBe('Si existe una cuenta con ese email, te hemos enviado un enlace.')
  })

  it('/recuperar muestra el error del email junto al campo', () => {
    const state: AuthFormState = { fieldErrors: { email: 'Introduce un email válido.' }, values: { email: 'ana@' } }
    const $ = parseHtml(renderToStaticMarkup(<PasswordResetFormView state={state} formAction={noop} />))
    expect($('input#email').attr('aria-invalid')).toBe('true')
    expect($('input#email').attr('aria-describedby')).toBe('email-error')
    expect($('input#email').attr('value')).toBe('ana@')
  })

  it('/nueva-contrasena muestra el error junto al campo, con la pista de mínimo y máximo', () => {
    const state: AuthFormState = { fieldErrors: { password: 'La contraseña no puede superar 72 caracteres.' } }
    const $ = parseHtml(renderToStaticMarkup(<NewPasswordFormView state={state} formAction={noop} />))
    expect($('input#password').attr('aria-invalid')).toBe('true')
    expect($('input#password').attr('aria-describedby')).toBe('password-hint password-error')
    expect($('#password-hint').text()).toBe('Entre 8 y 72 caracteres.')
  })

  it('/nueva-contrasena pide la contraseña con las reglas del registro', () => {
    const $ = parseHtml(renderToStaticMarkup(<NewPasswordForm />))
    const input = $('input#password')
    expect($('label[for="password"]').text()).toBe('Nueva contraseña')
    expect(input.attr('type')).toBe('password')
    expect(input.attr('minlength')).toBe('8')
    expect(input.attr('maxlength')).toBe('72')
    expect(input.attr('autocomplete')).toBe('new-password')
  })
})
