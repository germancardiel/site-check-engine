import type { Metadata } from 'next'
import { CheckCatalog } from '@/components/landing/check-catalog'
import { ClosingCta } from '@/components/landing/closing-cta'
import { HowItWorks } from '@/components/landing/how-it-works'
import { LandingFooter } from '@/components/landing/landing-footer'
import { LandingHeader } from '@/components/landing/landing-header'
import { SampleReport } from '@/components/landing/sample-report'
import { LandingCtas } from '@/components/landing/session-ctas'
import { LANDING_H2 as H2, LANDING_WRAP as WRAP } from '@/components/landing/styles'
import { ALL_CHECKS } from '@/lib/audit/checks'
import { buildWebsiteJsonLd, serializeJsonLd, SITE_DESCRIPTION, SITE_NAME, SITE_TITLE, siteUrl } from '@/lib/site'

export const metadata: Metadata = {
  title: SITE_TITLE,
  description: SITE_DESCRIPTION,
  alternates: { canonical: '/' },
}

/** Public landing: static (only the CTAs read the session, inside their own `<Suspense>`). */
export default function Home() {
  return (
    <>
      <LandingHeader />
      <main id="contenido" className="flex flex-1 flex-col">
        <script type="application/ld+json">{serializeJsonLd(buildWebsiteJsonLd(siteUrl()))}</script>
        <script>{`if (typeof navigator !== 'undefined' && navigator.modelContext) navigator.modelContext.registerTool({ name: 'site-check-engine' })`}</script>

        <section
          className={`${WRAP} grid items-start gap-12 py-12 sm:py-16 lg:grid-cols-[minmax(0,1.1fr)_minmax(0,0.9fr)] lg:gap-16 lg:py-20`}
        >
          <div className="flex min-w-0 flex-col items-start gap-7 lg:sticky lg:top-12">
            <h1 className="max-w-[18ch] font-display text-[2.6rem] leading-[0.98] font-semibold tracking-display text-balance sm:text-6xl xl:text-7xl">
              Tu web, revisada para Google{' '}
              <em className="font-serif font-normal tracking-normal text-accent-text">y para la IA</em>.
            </h1>
            <p className="max-w-[34rem] text-lg leading-relaxed text-ink-muted">
              {SITE_NAME} analiza cualquier página pública, le pone una puntuación de 0 a 100 y te dice qué arreglar primero
              para que Google y asistentes como ChatGPT, Claude o Perplexity entiendan y citen tu contenido.
            </p>
            <LandingCtas />
          </div>
          <SampleReport />
        </section>

        <section id="que-revisa" aria-labelledby="que-revisa-title" className="scroll-mt-4 border-t border-line">
          <div className={`${WRAP} flex flex-col gap-12 py-16 sm:py-24`}>
            <div className="flex max-w-3xl flex-col gap-5">
              <h2 id="que-revisa-title" className={H2}>
                Qué revisa {SITE_NAME}
              </h2>
              <p className="max-w-2xl text-lg text-ink-muted">
                Cada auditoría ejecuta {ALL_CHECKS.length} comprobaciones automáticas, agrupadas en 10 apartados y
                ponderadas según su impacto. Estas son las que verás en tu informe:
              </p>
            </div>
            <CheckCatalog />
          </div>
        </section>

        <section id="como-funciona" aria-labelledby="como-funciona-title" className="scroll-mt-4 border-t border-line">
          <div className={`${WRAP} flex flex-col gap-12 py-16 sm:py-24`}>
            <h2 id="como-funciona-title" className={H2}>
              Cómo funciona
            </h2>
            <HowItWorks />
          </div>
        </section>

        <ClosingCta />
      </main>
      <LandingFooter />
    </>
  )
}
