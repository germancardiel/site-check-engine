import { DOCS } from '../docs'
import { fernandezHuerta, nodesOfType, readabilityLabel, typesOf, words } from '../text'
import { defineChecks, fail, imageSrc, meta, na, pass, pct, warn } from './helpers'

const GENERIC_IMG =
  /^(img|image|imagen|dsc|dscn|dcim|pxl|photo|foto|screenshot|screen ?shot|captura|whatsapp ?image|untitled|sin[-_ ]?titulo|picture|pic|file|download|unnamed)[-_ ]?\d*([-_ (]\d+\)?)?$/i

const EDITORIAL_TYPES = ['Article', 'NewsArticle', 'BlogPosting', 'TechArticle', 'Report', 'ScholarlyArticle']

export const contentChecks = defineChecks('content', [
  {
    id: 'content.readability',
    title: 'Legibilidad del texto',
    weight: 2,
    docs: [DOCS.readability],
    run: ({ $, text }) => {
      const lang = ($('html').attr('lang') ?? 'es').toLowerCase()
      if (!/^(es|ca|gl|eu)/.test(lang)) {
        return na(`La fórmula de legibilidad usada es para español; el idioma de la página es '${lang}'.`)
      }
      const r = fernandezHuerta(text.sentences.join(' '), text.sentences)
      if (!r) return na('No hay texto suficiente para medir la legibilidad (mínimo 50 palabras).')
      const msg = `Puntuación de legibilidad estimada: ${r.score}/100 (Fernández Huerta, adaptación al español de Flesch). ${readabilityLabel(r.score)}.`
      const evidence = `palabras/frase: ${r.wordsPerSentence} — sílabas por 100 palabras: ${r.syllablesPer100}`
      if (r.score >= 60) return pass(msg, { evidence })
      const fix =
        r.wordsPerSentence > 20
          ? `Tus frases tienen de media ${r.wordsPerSentence} palabras. Intenta bajar a 15-20: divide las largas y usa más puntos y seguido.`
          : 'Usa palabras más cortas y comunes; evita tecnicismos sin explicar.'
      if (r.score >= 40) return warn(msg, { evidence, fix })
      return fail(msg, { evidence, fix })
    },
  },
  {
    id: 'content.author',
    title: 'Autor identificado',
    weight: 1,
    docs: [DOCS.eeat],
    run: (ctx) => {
      const { $, jsonLd } = ctx
      const metaAuthor = meta(ctx, 'author')
      if (metaAuthor) return pass(`Se ha detectado un autor: '${metaAuthor}'.`)
      const withAuthor = jsonLd.nodes.find((n) => n.author)
      if (withAuthor) {
        const a = withAuthor.author as { name?: string } | { name?: string }[] | string
        const name = typeof a === 'string' ? a : Array.isArray(a) ? a[0]?.name : a?.name
        return pass(`Se ha detectado un autor en los datos estructurados${name ? `: '${name}'` : ''}.`)
      }
      const person = nodesOfType(jsonLd, 'Person')[0]
      if (person) return pass(`Se ha detectado una persona responsable: '${person.name ?? 'sin nombre'}'.`)
      if ($('[rel~="author"], [itemprop="author"], [class*="author" i], [class*="autor" i]').length > 0) {
        return pass("Se ha detectado un autor: 'detectado (sin nombre extraíble)'.")
      }
      return warn('No se identifica quién está detrás del contenido. Mostrar autor o responsable refuerza la confianza (E-E-A-T).', {
        fix: '<meta name="author" content="Nombre Apellido" /> y una breve biografía visible.',
      })
    },
  },
  {
    id: 'content.alt',
    title: 'Texto alternativo en imágenes',
    weight: 2,
    docs: [DOCS.alt],
    run: ({ $ }) => {
      const imgs = $('img')
      const total = imgs.length
      if (total === 0) return na('La página no contiene imágenes.')
      const missing = imgs.filter((_, el) => $(el).attr('alt') === undefined)
      const withAlt = total - missing.length
      const msg = `${withAlt} de ${total} imágenes (${pct(withAlt, total)}%) tienen atributo alt (vacío o con texto). Faltan ${missing.length} sin el atributo.`
      const items = missing
        .slice(0, 8)
        .map((_, el) => ({ label: ($(el).attr('src') ?? '').slice(0, 120), status: 'bad' as const }))
        .get()
      if (missing.length === 0) return pass(msg)
      if (missing.length / total <= 0.2) return warn(msg, { items })
      return fail(msg, { items, fix: 'Añade alt descriptivo a cada imagen de contenido, y alt="" a las decorativas.' })
    },
  },
  {
    id: 'content.length',
    title: 'Extensión del contenido',
    weight: 2,
    docs: [DOCS.helpful],
    run: ({ text }) => {
      const n = text.words
      if (n >= 300) {
        return pass(`El texto visible tiene aproximadamente ${n} palabras. Extensión suficiente para desarrollar el tema, siempre que no sea relleno.`)
      }
      if (n >= 150) return warn(`El texto visible tiene ~${n} palabras. Puede quedarse corto para posicionar frente a la competencia.`)
      return fail(`El texto visible tiene solo ~${n} palabras: contenido escaso (thin content).`)
    },
  },
  {
    id: 'content.img-names',
    title: 'Nombres de archivo de imagen semánticos',
    weight: 1,
    docs: [DOCS.alt],
    run: (ctx) => {
      const { $ } = ctx
      const files = $('img[src]')
        .map((_, el) => imageSrc(ctx, $(el).attr('src')))
        .get()
        .filter((u): u is URL => !!u && u.protocol.startsWith('http'))
        .map((u) => decodeURIComponent(u.pathname.split('/').pop() ?? '').replace(/\.[a-z0-9]+$/i, ''))
        .filter(Boolean)
      if (files.length === 0) return na('No hay imágenes con archivo analizable.')
      const generic = files.filter((f) => GENERIC_IMG.test(f) || /^\d+$/.test(f) || /^[a-f0-9-]{20,}$/i.test(f))
      const msg = `${generic.length} de ${files.length} imágenes tienen nombres de archivo genéricos (ej. IMG_1234.jpg) en vez de describir su contenido.`
      if (generic.length === 0) return pass(msg)
      if (generic.length / files.length <= 0.3) return warn(msg, { items: generic.slice(0, 8).map((label) => ({ label })) })
      return fail(msg, {
        items: generic.slice(0, 8).map((label) => ({ label })),
        fix: 'Renombra los archivos con palabras descriptivas: "entrenador-personal-lleida.jpg".',
      })
    },
  },
  {
    id: 'content.hidden',
    title: 'Contenido en pestañas/acordeones',
    weight: 1,
    docs: [DOCS.helpful],
    run: ({ $, text }) => {
      let hiddenWords = 0
      $('details:not([open]), [role="tabpanel"][hidden], [role="tabpanel"][aria-hidden="true"], [class*="accordion" i] [hidden], [class*="collapse" i]:not(.show)').each(
        (_, el) => {
          hiddenWords += words($(el).text()).length
        },
      )
      const share = text.words === 0 ? 0 : hiddenWords / (text.words + hiddenWords)
      if (hiddenWords === 0) return pass('No se detectan patrones evidentes de contenido oculto en pestañas o acordeones.')
      if (share > 0.4) {
        return warn(`~${Math.round(share * 100)}% del texto está dentro de pestañas o acordeones cerrados. Deja visible lo más importante.`)
      }
      return pass(`Hay algo de contenido en acordeones (~${Math.round(share * 100)}%), en una proporción razonable.`)
    },
  },
  {
    id: 'content.text-vs-images',
    title: 'Texto no depende únicamente de imágenes',
    weight: 1,
    docs: [DOCS.alt],
    run: ({ $, text }) => {
      const imgs = $('img').length
      if (imgs === 0) return na('La página no contiene imágenes.')
      if (text.words < 100 && imgs >= 3) {
        return warn(`Solo ~${text.words} palabras para ${imgs} imágenes: si el mensaje está dentro de las imágenes, Google no lo lee.`)
      }
      return pass('Hay suficiente texto extraíble en el HTML respecto al número de imágenes.')
    },
  },
  {
    id: 'content.dates',
    title: 'Fechas de publicación/actualización',
    weight: 1,
    docs: [DOCS.eeat],
    run: (ctx) => {
      const { $, jsonLd } = ctx
      const editorial = jsonLd.nodes.filter((n) => typesOf(n).some((t) => EDITORIAL_TYPES.includes(t)))
      const isArticle = editorial.length > 0 || meta(ctx, 'og:type') === 'article'
      const hasDate =
        editorial.some((n) => n.datePublished || n.dateModified) ||
        !!meta(ctx, 'article:published_time') ||
        !!meta(ctx, 'article:modified_time') ||
        $('time[datetime]').length > 0
      if (!isArticle) {
        return na(
          hasDate
            ? 'Se detectan fechas, aunque en una página que no es un artículo no son necesarias.'
            : 'No se detectan fechas, pero esta página no es un artículo: en landings, servicios o la home no suele ser necesario.',
        )
      }
      if (hasDate) return pass('El artículo muestra fecha de publicación o actualización.')
      return warn('Es un artículo pero no indica fecha de publicación ni de actualización.', {
        fix: 'Añade datePublished y dateModified al schema Article, y muestra la fecha con <time datetime="…">.',
      })
    },
  },
])
