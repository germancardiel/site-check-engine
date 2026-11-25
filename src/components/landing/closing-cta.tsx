import { LandingCtas } from './session-ctas'
import { LANDING_H2, LANDING_WRAP } from './styles'

/** Last section of the landing: why sign up now, with the same CTAs as the hero. */
export function ClosingCta() {
  return (
    <section aria-labelledby="cta-title" className="border-t border-line bg-panel">
      <div className={`${LANDING_WRAP} grid gap-8 py-16 sm:py-24 lg:grid-cols-[minmax(0,1fr)_auto] lg:items-end`}>
        <div className="flex max-w-3xl flex-col gap-5">
          <h2 id="cta-title" className={LANDING_H2}>
            Empieza a auditar tu web{' '}
            <em className="font-serif font-normal tracking-normal text-accent-text">hoy</em>
          </h2>
          <p className="max-w-2xl text-lg text-ink-muted">
            Crear una cuenta es gratis y solo necesitas un email. En unos minutos tendrás tu primera nota, la lista de
            comprobaciones pendientes y un plan de acción para mejorarla.
          </p>
        </div>
        <LandingCtas />
      </div>
    </section>
  )
}
