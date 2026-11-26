import { renderToStaticMarkup } from 'react-dom/server'
import { describe, expect, it, vi } from 'vitest'
import { parseHtml } from '@/lib/audit/parse'

// The real actions import the Supabase server client; they are not under test here.
vi.mock('@/app/(auth)/login/actions', () => ({ login: vi.fn() }))
vi.mock('@/app/(auth)/registro/actions', () => ({ register: vi.fn(), resendConfirmation: vi.fn() }))
vi.mock('@/app/(auth)/recuperar/actions', () => ({ requestPasswordReset: vi.fn() }))
vi.mock('@/app/(app)/nueva-contrasena/actions', () => ({ updatePassword: vi.fn() }))

import { LoginForm, LoginFormView } from '../login-form'
import { NewPasswordForm } from '../new-password-form'
import { PasswordResetForm, PasswordResetFormView } from '../password-reset-form'
import { RegisterForm, RegisterFormView } from '../register-form'

const noop = () => {}

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
