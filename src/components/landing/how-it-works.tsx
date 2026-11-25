import { SITE_NAME } from '@/lib/site'

const STEPS = [
  {
    title: 'Añade tu sitio',
    text: 'Escribe la dirección de la página que quieres revisar. Puedes guardar varios sitios en tu cuenta y volver a ellos cuando quieras.',
  },
  {
    title: 'Audítalo',
    text: `${SITE_NAME} descarga la página como lo haría un rastreador, revisa robots.txt, llms.txt y el sitemap, y calcula una nota de SEO, otra de IA y la nota total.`,
  },
  {
    title: 'Mejora con un plan de IA',
    text: 'Genera un plan de acción priorizado por impacto y esfuerzo, vuelve a auditar tras cada cambio y sigue la evolución de la nota en el historial.',
  },
] as const

/** "Cómo funciona" in three numbered steps: add a site → audit → AI action plan and history. */
export function HowItWorks() {
  return (
    <ol className="grid border-t border-line-strong md:grid-cols-3">
      {STEPS.map((step, index) => (
        <li
          key={step.title}
          className="flex flex-col gap-3 border-b border-line py-8 md:border-b-0 md:border-l md:px-8 md:first:border-l-0 md:first:pl-0"
        >
          <span aria-hidden="true" className="font-mono text-sm text-ink-muted tabular-nums">
            {`0${index + 1}`}
          </span>
          <h3 className="text-xl font-semibold text-ink">
            <span className="sr-only">Paso {index + 1}: </span>
            {step.title}
          </h3>
          <p className="text-ink-muted">{step.text}</p>
        </li>
      ))}
    </ol>
  )
}
