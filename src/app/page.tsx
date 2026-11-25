import type { Metadata } from 'next'
import { CheckCatalog } from '@/components/landing/check-catalog'
import { HowItWorks } from '@/components/landing/how-it-works'
import { LandingFooter } from '@/components/landing/landing-footer'
import { LandingHeader } from '@/components/landing/landing-header'
import { LandingCtas } from '@/components/landing/session-ctas'
import { ALL_CHECKS } from '@/lib/audit/checks'
import { buildWebsiteJsonLd, serializeJsonLd, SITE_DESCRIPTION, SITE_TITLE, siteUrl } from '@/lib/site'

export const metadata: Metadata = {
  title: SITE_TITLE,
  description: SITE_DESCRIPTION,
  alternates: { canonical: '/' },
}

const SECTION = 'mx-auto flex w-full max-w-5xl flex-col gap-8 px-4 py-16'

/** Public landing: static (only the CTAs read the session, inside their own `<Suspense>`). */
export default function Home() {
  return (
    <>
      <LandingHeader />
      <main id="contenido" className="flex flex-1 flex-col">
        <script type="application/ld+json">{serializeJsonLd(buildWebsiteJsonLd(siteUrl()))}</script>

        <section className={`${SECTION} items-start gap-6 py-20 sm:py-28`}>
          <p className="text-sm font-medium tracking-wide text-zinc-700 uppercase dark:text-zinc-300">
            Auditoría SEO y de visibilidad en IA
          </p>
          <h1 className="max-w-3xl text-4xl font-semibold tracking-tight text-balance sm:text-5xl">
            Descubre qué frena a tu web en los buscadores y en los asistentes de IA
          </h1>
          <p className="max-w-2xl text-lg text-zinc-700 dark:text-zinc-300">
            Faro analiza cualquier página pública, le pone una nota de 0 a 100 y te dice qué arreglar primero para
            que Google y asistentes como ChatGPT, Claude o Perplexity entiendan y citen tu contenido.
          </p>
          <LandingCtas />
        </section>

        <section id="que-revisa" aria-labelledby="que-revisa-title" className={`${SECTION} scroll-mt-4`}>
          <div className="flex max-w-2xl flex-col gap-3">
            <h2 id="que-revisa-title" className="text-2xl font-semibold tracking-tight sm:text-3xl">
              Qué revisa Faro
            </h2>
            <p className="text-zinc-700 dark:text-zinc-300">
              Cada auditoría ejecuta {ALL_CHECKS.length} comprobaciones automáticas, agrupadas en dos bloques y
              ponderadas según su impacto. Estas son las que verás en tu informe:
            </p>
          </div>
          <CheckCatalog />
        </section>

        <section id="como-funciona" aria-labelledby="como-funciona-title" className={`${SECTION} scroll-mt-4`}>
          <h2 id="como-funciona-title" className="text-2xl font-semibold tracking-tight sm:text-3xl">
            Cómo funciona
          </h2>
          <HowItWorks />
        </section>

        <section aria-labelledby="cta-title" className={`${SECTION} items-start gap-4`}>
          <h2 id="cta-title" className="text-2xl font-semibold tracking-tight sm:text-3xl">
            Empieza a auditar tu web hoy
          </h2>
          <p className="max-w-2xl text-zinc-700 dark:text-zinc-300">
            Crear una cuenta es gratis y solo necesitas un email. En unos minutos tendrás tu primera nota, la lista
            de comprobaciones pendientes y un plan de acción para mejorarla.
          </p>
          <LandingCtas />
        </section>
      </main>
      <LandingFooter />
    </>
  )
}
