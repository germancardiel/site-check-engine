import { describe, expect, it } from 'vitest'
import { escapeMarkdownText, planFileName, planToMarkdown, type PlanMarkdownMeta } from '../markdown'
import type { ActionPlan } from '../schemas'
import { makeAction } from './fixtures'

const meta: PlanMarkdownMeta = {
  siteUrl: 'https://www.ejemplo.com/',
  createdAt: '2026-11-25T10:30:00.000Z',
  score: 62,
  checks: [
    { id: 'onpage.title', title: 'Title con longitud adecuada' },
    { id: 'ai.llms', title: 'Archivo llms.txt' },
  ],
}

const plan: ActionPlan = {
  summary: 'La web necesita mejorar el título y la descripción.',
  actions: [
    { ...makeAction('Mejorar el título', 'alto', 'bajo'), checkIds: ['onpage.title', 'desconocido', 'onpage.title'] },
    { ...makeAction('Añadir descripción', 'medio', 'medio'), checkIds: [] },
    { ...makeAction('Crear llms.txt', 'bajo', 'alto'), why: 'Ayuda a la IA.', how: 'Sube /llms.txt.', checkIds: ['ai.llms'] },
  ],
}

function headingLines(markdown: string): string[] {
  return markdown.split('\n').filter((line) => /^#{1,6}\s/.test(line))
}

describe('planToMarkdown (CA1)', () => {
  const md = planToMarkdown(plan, meta)

  it('incluye título con la URL, fecha de generación recibida por parámetro, nota y resumen', () => {
    expect(md.startsWith('# Plan de acción — https://www.ejemplo.com/\n')).toBe(true)
    expect(md).toContain('Generado el 25 nov 2026, 11:30')
    expect(md).toContain('Nota de la auditoría: 62/100')
    expect(md).toContain('## Resumen\n\nLa web necesita mejorar el título y la descripción.\n')
  })

  it('crea una sección numerada por acción en el orden del plan con impacto, esfuerzo, Por qué y Cómo', () => {
    expect(headingLines(md)).toEqual([
      '# Plan de acción — https://www.ejemplo.com/',
      '## Resumen',
      '## Acciones',
      '### 01. Mejorar el título',
      '### 02. Añadir descripción',
      '### 03. Crear llms.txt',
    ])
    expect(md).toContain('**Impacto alto** · **Esfuerzo bajo**')
    expect(md).toContain('**Impacto medio** · **Esfuerzo medio**')
    expect(md).toContain('**Impacto bajo** · **Esfuerzo alto**')
    expect(md).toContain('**Por qué:** Ayuda a la IA.')
    expect(md).toContain('**Cómo:** Sube /llms.txt.')
  })

  it('lista los checkIds sin repetir, con el título legible si el check existe', () => {
    const first = md.slice(md.indexOf('### 01.'), md.indexOf('### 02.'))
    expect(first).toContain('**Checks relacionados:**\n\n- Title con longitud adecuada (`onpage.title`)\n- `desconocido`')
    expect(first.match(/onpage\.title/g)).toHaveLength(1)
    const second = md.slice(md.indexOf('### 02.'), md.indexOf('### 03.'))
    expect(second).not.toContain('Checks relacionados')
    expect(md).toContain('- Archivo llms.txt (`ai.llms`)')
  })

  it('indica "sin nota" cuando la auditoría no tiene nota y no depende de la hora actual', () => {
    const a = planToMarkdown(plan, { ...meta, score: null })
    expect(a).toContain('Nota de la auditoría: sin nota')
    expect(planToMarkdown(plan, meta)).toBe(md)
  })
})

describe('escape del texto de la IA (CA2)', () => {
  it('escapa #, -, *, + y > al principio y colapsa los saltos de línea', () => {
    expect(escapeMarkdownText('# Título')).toBe('\\# Título')
    expect(escapeMarkdownText('- uno')).toBe('\\- uno')
    expect(escapeMarkdownText('* dos')).toBe('\\* dos')
    expect(escapeMarkdownText('+ tres')).toBe('\\+ tres')
    expect(escapeMarkdownText('> cita')).toBe('\\> cita')
    expect(escapeMarkdownText('1. lista')).toBe('1\\. lista')
    expect(escapeMarkdownText('  Texto\n\n## Falso\r\n- item  ')).toBe('Texto ## Falso - item')
    expect(escapeMarkdownText('Texto normal')).toBe('Texto normal')
  })

  it('los campos con saltos de línea y marcadores no crean encabezados, listas ni citas nuevos', () => {
    const hostile: ActionPlan = {
      summary: '# Resumen falso\n## Otro\n> cita',
      actions: [
        {
          title: '## Título\n# inyectado',
          why: 'Línea 1\n# Encabezado inyectado\n- lista',
          how: '> cita\n* viñeta\n\n### H3',
          impact: 'alto',
          effort: 'bajo',
          checkIds: ['x`\n# id'],
        },
        makeAction('- Empieza con guion', 'medio', 'bajo'),
        makeAction('* Empieza con asterisco', 'bajo', 'bajo'),
      ],
    }
    const md = planToMarkdown(hostile, { ...meta, siteUrl: 'https://ejemplo.com/\n# url' })
    expect(headingLines(md)).toEqual([
      '# Plan de acción — https://ejemplo.com/ # url',
      '## Resumen',
      '## Acciones',
      '### 01. \\## Título # inyectado',
      '### 02. \\- Empieza con guion',
      '### 03. \\* Empieza con asterisco',
    ])
    const lines = md.split('\n')
    expect(lines).toContain('\\# Resumen falso ## Otro > cita')
    expect(lines).toContain('**Por qué:** Línea 1 # Encabezado inyectado - lista')
    expect(lines).toContain('**Cómo:** \\> cita * viñeta ### H3')
    expect(lines).toContain('- `x # id`')
    expect(lines.filter((line) => /^\s*>/.test(line))).toEqual([])
    expect(lines.filter((line) => /^\s*[-*+]\s/.test(line))).toEqual(['- `x # id`', '- `title`', '- `title`'])
  })
})

describe('planFileName (CA4)', () => {
  it('usa el dominio sin www. y el día de generación (Europe/Madrid)', () => {
    expect(planFileName('https://www.ejemplo.com/ruta', '2026-11-25T10:30:00.000Z')).toBe(
      'plan-de-accion-ejemplo.com-2026-11-25.md',
    )
    expect(planFileName('https://blog.ejemplo.es', '2026-11-25T23:30:00.000Z')).toBe(
      'plan-de-accion-blog.ejemplo.es-2026-11-26.md',
    )
  })

  it('usa nombres de respaldo si la URL o la fecha no son válidas', () => {
    expect(planFileName('no es url', 'no es fecha')).toBe('plan-de-accion-sitio-sin-fecha.md')
  })
})
