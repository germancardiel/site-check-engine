import { DOCS } from '../docs'
import type { EvidenceItem } from '../types'
import { accessibleName, cleanText, defineChecks, fail, na, pass, pct, warn } from './helpers'

const GENERIC_LINK = new Set([
  'leer más', 'leer mas', 'más', 'mas', 'aquí', 'aqui', 'click aquí', 'clic aquí', 'haz clic aquí', 'pincha aquí',
  'ver más', 'saber más', 'más información', 'mas informacion', 'read more', 'click here', 'more', 'learn more', 'here',
  'continuar', 'enlace', 'link',
])

export const mobileChecks = defineChecks('mobile', [
  {
    id: 'mobile.viewport',
    title: 'Meta viewport correcta y sin bloquear el zoom',
    weight: 3,
    docs: [DOCS.viewport, DOCS.wcag],
    run: ({ $ }) => {
      const vp = $('meta[name="viewport" i]').attr('content')
      if (!vp) {
        return fail('No hay meta viewport: en móvil la página se verá como en escritorio, en miniatura.', {
          fix: '<meta name="viewport" content="width=device-width, initial-scale=1" />',
        })
      }
      const v = vp.toLowerCase().replace(/\s/g, '')
      if (!v.includes('width=device-width')) return warn(`viewport='${vp}': falta width=device-width.`)
      const max = v.match(/maximum-scale=([\d.]+)/)
      if (/user-scalable=(no|0)/.test(v) || (max && Number(max[1]) < 2)) {
        return warn(`viewport='${vp}': bloquea el zoom táctil, lo que perjudica la accesibilidad.`)
      }
      return pass(`viewport='${vp}': incluye width=device-width y no bloquea el zoom táctil.`)
    },
  },
  {
    id: 'mobile.labels',
    title: 'Campos de formulario con <label> asociado',
    weight: 2,
    docs: [DOCS.wcag],
    run: ({ $ }) => {
      const fields = $('input, select, textarea').filter((_, el) => {
        const t = ($(el).attr('type') ?? '').toLowerCase()
        return !['hidden', 'submit', 'button', 'image', 'reset'].includes(t) && $(el).attr('aria-hidden') !== 'true' && $(el).attr('tabindex') !== '-1'
      })
      if (fields.length === 0) return na('La página no tiene campos de formulario.')
      const unlabeled = fields.filter((_, el) => {
        const $el = $(el)
        const id = $el.attr('id')
        return !(
          (id && $(`label[for="${id}"]`).length > 0) ||
          $el.closest('label').length > 0 ||
          $el.attr('aria-label')?.trim() ||
          $el.attr('aria-labelledby') ||
          $el.attr('title')?.trim()
        )
      })
      if (unlabeled.length === 0) {
        return pass(`Los ${fields.length} campos de formulario tienen un <label> asociado (for/id, envolviéndolo, o aria-label).`)
      }
      const items: EvidenceItem[] = unlabeled
        .slice(0, 6)
        .map((_, el) => ({ label: `<${el.tagName} name="${$(el).attr('name') ?? ''}" placeholder="${$(el).attr('placeholder') ?? ''}">`, status: 'bad' as const }))
        .get()
      return warn(`${unlabeled.length} de ${fields.length} campos no tienen etiqueta. El placeholder no sustituye al <label>.`, { items })
    },
  },
  {
    id: 'mobile.buttons',
    title: 'Botones con nombre accesible',
    weight: 2,
    docs: [DOCS.f84],
    run: ({ $ }) => {
      const controls = $('button, [role="button"], input[type="submit"], input[type="button"], a[href]')
      if (controls.length === 0) return na('La página no tiene botones ni enlaces.')
      const nameless = controls.filter((_, el) => !accessibleName($, $(el)))
      if (nameless.length === 0) {
        return pass(`Los ${controls.length} botones y enlaces tienen nombre accesible (texto, aria-label, title o alt de una imagen interior).`)
      }
      const items: EvidenceItem[] = nameless
        .slice(0, 6)
        .map((_, el) => ({ label: `<${el.tagName}${$(el).attr('href') ? ` href="${$(el).attr('href')}"` : ''}${$(el).attr('class') ? ` class="${String($(el).attr('class')).slice(0, 40)}"` : ''}>`, status: 'bad' as const }))
        .get()
      const msg = `${nameless.length} de ${controls.length} botones o enlaces no tienen nombre accesible (p. ej. iconos sin aria-label).`
      return nameless.length > 5 ? fail(msg, { items }) : warn(msg, { items, fix: '<button aria-label="Abrir menú">…</button>' })
    },
  },
  {
    id: 'mobile.semantic',
    title: 'Uso de etiquetas HTML semánticas',
    weight: 1,
    docs: [DOCS.semantic],
    run: ({ $ }) => {
      const tags = ['main', 'article', 'nav', 'header', 'footer']
      const items: EvidenceItem[] = tags.map((t) => ({ label: t, status: $(t).length > 0 ? 'ok' : 'bad' }))
      const present = items.filter((i) => i.status === 'ok').length
      const total = $('body *').length
      const divs = $('body div, body span').length
      items.push({ label: '<div>/<span>', value: `${divs} de ${total} etiquetas (${pct(divs, total)}%)` })
      const msg = `${present} de ${tags.length} etiquetas semánticas presentes.`
      if (present >= 4 && $('main').length > 0) return pass(msg, { items })
      if (present >= 2) return warn(`${msg} Usa <main>, <nav>, <header> y <footer> para estructurar la página.`, { items })
      return fail(`${msg} La página se construye casi solo con <div>.`, { items })
    },
  },
  {
    id: 'mobile.skip-link',
    title: 'Enlace "saltar al contenido"',
    weight: 1,
    docs: [DOCS.wcag],
    run: ({ $ }) => {
      const skip = $('a[href^="#"]')
        .slice(0, 15)
        .filter((_, el) => /saltar|skip|ir al contenido|contenido principal|main content|anar al contingut/i.test(cleanText($(el).text()) + ($(el).attr('aria-label') ?? '')))
      if (skip.length > 0) return pass('Hay un enlace para saltar al contenido principal, útil para navegar con teclado.')
      return warn('No hay enlace "saltar al contenido". Ayuda a quien navega con teclado o lector de pantalla.', {
        fix: '<a href="#main" class="sr-only focus:not-sr-only">Saltar al contenido</a>',
      })
    },
  },
  {
    id: 'mobile.tabindex',
    title: 'Sin tabindex positivo (orden de tabulación)',
    weight: 1,
    docs: [DOCS.tabindex],
    run: ({ $ }) => {
      const positive = $('[tabindex]').filter((_, el) => Number($(el).attr('tabindex')) > 0)
      if (positive.length === 0) return pass('No se usa ningún tabindex positivo; el orden de tabulación sigue el del documento.')
      return warn(`${positive.length} elemento(s) usan tabindex positivo y alteran el orden natural de tabulación.`)
    },
  },
  {
    id: 'mobile.link-text',
    title: 'Enlaces sin texto descriptivo',
    weight: 1,
    docs: [DOCS.linkPurpose],
    run: ({ $ }) => {
      const generic = $('a[href]')
        .filter((_, el) => !$(el).attr('aria-label') && GENERIC_LINK.has(cleanText($(el).text()).toLowerCase().replace(/[.…→›»]+$/, '').trim()))
        .map((_, el) => cleanText($(el).text()))
        .get()
      if (generic.length === 0) return pass('No se detectan enlaces con texto genérico ("leer más", "click aquí"...).')
      return warn(`${generic.length} enlace(s) con texto genérico. Describe el destino ("Ver precios de entrenamiento personal").`, {
        items: [...new Set(generic)].slice(0, 6).map((label) => ({ label })),
      })
    },
  },
  {
    id: 'mobile.iframe-title',
    title: 'Iframes con título accesible',
    weight: 1,
    docs: [DOCS.iframeTitle],
    run: ({ $ }) => {
      const iframes = $('iframe').filter((_, el) => $(el).attr('aria-hidden') !== 'true')
      if (iframes.length === 0) return na('La página no contiene ningún <iframe>.')
      const missing = iframes.filter((_, el) => !$(el).attr('title')?.trim())
      if (missing.length === 0) return pass(`Los ${iframes.length} iframes tienen atributo title.`)
      return warn(`${missing.length} de ${iframes.length} iframes no tienen title.`, { fix: '<iframe title="Mapa de ubicación" …>' })
    },
  },
  {
    id: 'mobile.tables',
    title: 'Tablas de datos con cabeceras (<th>)',
    weight: 1,
    docs: [DOCS.tables],
    run: ({ $ }) => {
      const tables = $('table').filter((_, el) => {
        const rows = $(el).find('tr')
        return rows.length >= 2 && rows.first().children('td,th').length >= 2 && $(el).attr('role') !== 'presentation'
      })
      if (tables.length === 0) return na('La página no contiene tablas de datos (≥2 filas y ≥2 columnas).')
      const missing = tables.filter((_, el) => $(el).find('th').length === 0)
      if (missing.length === 0) return pass(`Las ${tables.length} tablas de datos tienen cabeceras <th>.`)
      return warn(`${missing.length} de ${tables.length} tablas no tienen <th>.`)
    },
  },
])
