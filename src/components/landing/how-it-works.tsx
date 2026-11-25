const STEPS = [
  {
    title: 'Añade tu sitio',
    text: 'Escribe la dirección de la página que quieres revisar. Puedes guardar varios sitios en tu cuenta y volver a ellos cuando quieras.',
  },
  {
    title: 'Audítalo',
    text: 'Faro descarga la página como lo haría un rastreador, revisa robots.txt, llms.txt y el sitemap, y calcula una nota de SEO, otra de IA y la nota total.',
  },
  {
    title: 'Mejora con un plan de IA',
    text: 'Genera un plan de acción priorizado por impacto y esfuerzo, vuelve a auditar tras cada cambio y sigue la evolución de la nota en el historial.',
  },
] as const

/** "Cómo funciona" in three steps: add a site → audit → AI action plan and history. */
export function HowItWorks() {
  return (
    <ol className="grid gap-6 md:grid-cols-3">
      {STEPS.map((step, index) => (
        <li key={step.title} className="flex flex-col gap-2">
          <span aria-hidden="true" className="text-sm font-semibold text-zinc-700 dark:text-zinc-300">
            {`0${index + 1}`}
          </span>
          <h3 className="text-lg font-semibold">
            <span className="sr-only">Paso {index + 1}: </span>
            {step.title}
          </h3>
          <p className="text-zinc-700 dark:text-zinc-300">{step.text}</p>
        </li>
      ))}
    </ol>
  )
}
