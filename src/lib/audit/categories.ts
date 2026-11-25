import type { CategoryId } from './types'

export interface CategoryMeta {
  id: CategoryId
  number: number
  title: string
  shortTitle: string
  /** Peso en la nota global. */
  weight: number
}

export const CATEGORIES: CategoryMeta[] = [
  { id: 'crawl', number: 1, title: 'Rastreo e indexación', shortTitle: 'Rastreo', weight: 15 },
  { id: 'url', number: 2, title: 'URL y arquitectura', shortTitle: 'URL', weight: 8 },
  { id: 'onpage', number: 3, title: 'Etiquetas on-page', shortTitle: 'On-page', weight: 15 },
  { id: 'content', number: 4, title: 'Contenido', shortTitle: 'Contenido', weight: 12 },
  { id: 'schema', number: 5, title: 'Datos estructurados (Schema.org)', shortTitle: 'Schema.org', weight: 8 },
  { id: 'performance', number: 6, title: 'Rendimiento y Core Web Vitals', shortTitle: 'Rendimiento', weight: 12 },
  { id: 'mobile', number: 7, title: 'Experiencia, móvil y accesibilidad', shortTitle: 'Móvil y a11y', weight: 8 },
  { id: 'trust', number: 8, title: 'Confianza y E-E-A-T', shortTitle: 'E-E-A-T', weight: 8 },
  { id: 'international', number: 9, title: 'Internacional', shortTitle: 'Internacional', weight: 6 },
  { id: 'ai', number: 10, title: 'AI SEO (optimización para asistentes de IA)', shortTitle: 'AI SEO', weight: 8 },
]

export const CATEGORY_IDS = CATEGORIES.map((c) => c.id) as [CategoryId, ...CategoryId[]]

export const CATEGORY_BY_ID = Object.fromEntries(CATEGORIES.map((c) => [c.id, c])) as Record<
  CategoryId,
  CategoryMeta
>
