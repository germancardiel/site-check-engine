import { DOCS } from '../docs'
import {
  cleanText,
  defineChecks,
  fail,
  headings,
  isInternal,
  meta,
  pass,
  truncate,
  warn,
} from './helpers'

const GENERIC_HEADINGS = new Set([
  'inicio', 'home', 'bienvenido', 'bienvenidos', 'bienvenida', 'welcome', 'título', 'titulo', 'sección',
  'seccion', 'section', 'más', 'mas', 'leer más', 'ver más', 'otros', 'varios', 'contenido', 'texto', 'heading',
])

export const onpageChecks = defineChecks('onpage', [
  {
    id: 'onpage.headings',
    title: 'Estructura de encabezados (H1 único, primero y sin saltos)',
    weight: 3,
    docs: [DOCS.headings],
    run: ({ $ }) => {
      const hs = headings($)
      const sequence = hs.map((h) => `H${h.level}`).join(' → ')
      const evidence = sequence ? `Secuencia real: ${truncate(sequence, 400)}` : undefined
      const h1s = hs.filter((h) => h.level === 1)
      if (h1s.length === 0) {
        return fail('La página no tiene H1. Es la señal principal del tema de la página.', {
          evidence,
          fix: 'Añade un único <h1> que describa el contenido principal.',
        })
      }
      const problems: string[] = []
      if (h1s.length > 1) problems.push(`hay ${h1s.length} H1`)
      if (hs[0].level !== 1) problems.push('el H1 no es el primer encabezado')
      const jumps: string[] = []
      for (let i = 1; i < hs.length; i++) {
        if (hs[i].level > hs[i - 1].level + 1) jumps.push(`H${hs[i - 1].level} → H${hs[i].level}`)
      }
      if (jumps.length) problems.push(`saltos de nivel (${[...new Set(jumps)].slice(0, 3).join(', ')})`)
      if (problems.length === 0) {
        return pass(
          `Un único H1 ("${truncate(h1s[0].text, 80)}"), es el primer encabezado y los niveles siguientes son consecutivos.`,
          { evidence },
        )
      }
      return warn(`Estructura mejorable: ${problems.join('; ')}.`, { evidence })
    },
  },
  {
    id: 'onpage.title',
    title: 'Title con longitud adecuada',
    weight: 3,
    docs: [DOCS.title],
    run: ({ $ }) => {
      const titles = $('head title, title')
      const t = cleanText(titles.first().text())
      if (!t) {
        return fail('La página no tiene <title>. Es lo primero que se ve en Google.', {
          fix: '<title>Servicio principal en Ciudad | Marca</title>',
        })
      }
      const len = t.length
      const evidence = `"${t}"`
      if (len < 30) return warn(`El title tiene ${len} caracteres: es corto, aprovecha para incluir servicio y ubicación.`, { evidence })
      if (len > 60) return warn(`El title tiene ${len} caracteres: Google lo cortará (≈60).`, { evidence })
      return pass(`El title tiene ${len} caracteres: ${evidence}.`)
    },
  },
  {
    id: 'onpage.headings-descriptive',
    title: 'Encabezados razonablemente descriptivos',
    weight: 1,
    docs: [DOCS.headings],
    run: ({ $ }) => {
      const hs = headings($).filter((h) => h.text)
      if (hs.length === 0) return warn('No hay encabezados con texto.')
      const weak = hs.filter((h) => GENERIC_HEADINGS.has(h.text.toLowerCase()) || h.text.split(' ').length === 1)
      if (weak.length / hs.length > 0.3) {
        return warn(`${weak.length} de ${hs.length} encabezados son genéricos o de una sola palabra.`, {
          items: weak.slice(0, 8).map((h) => ({ label: `H${h.level}: ${h.text}` })),
        })
      }
      return pass('Los encabezados parecen suficientemente descriptivos.')
    },
  },
  {
    id: 'onpage.description',
    title: 'Meta description con longitud adecuada',
    weight: 2,
    docs: [DOCS.snippet],
    run: (ctx) => {
      const d = meta(ctx, 'description')
      if (!d) {
        return fail('No hay meta description. Google generará un fragmento automático.', {
          fix: '<meta name="description" content="Qué ofreces, para quién y por qué elegirte (≈150 caracteres)." />',
        })
      }
      const len = d.length
      if (len < 70) return warn(`La meta description tiene ${len} caracteres: es corta.`, { evidence: `"${d}"` })
      if (len > 160) return warn(`La meta description tiene ${len} caracteres: se cortará en Google.`, { evidence: `"${d}"` })
      return pass(`La meta description tiene ${len} caracteres: "${d}".`)
    },
  },
  {
    id: 'onpage.lang',
    title: 'Atributo lang en <html>',
    weight: 2,
    docs: [DOCS.lang],
    run: ({ $ }) => {
      const lang = $('html').attr('lang')?.trim()
      if (!lang) return fail('Falta el atributo lang en <html>.', { fix: '<html lang="es">' })
      if (!/^[a-z]{2,3}(-[a-z0-9]{2,8})*$/i.test(lang)) return warn(`El atributo lang ('${lang}') no es un código válido.`)
      return pass(`El atributo lang está definido como '${lang}'.`)
    },
  },
  {
    id: 'onpage.og',
    title: 'Open Graph',
    weight: 2,
    docs: [DOCS.og],
    run: (ctx) => {
      const keys = ['og:title', 'og:description', 'og:image', 'og:url', 'og:type']
      const items = keys.map((k) => {
        const v = meta(ctx, k)
        return { label: k, value: v ? truncate(v, 140) : 'Falta', status: v ? ('ok' as const) : ('bad' as const) }
      })
      const present = items.filter((i) => i.status === 'ok').length
      const msg = `${present} de ${keys.length} atributos presentes.`
      if (present === keys.length) return pass(msg, { items })
      if (present >= 3) return warn(`${msg} Completa los que faltan para controlar cómo se ve al compartir.`, { items })
      return fail(`${msg} Al compartir en redes o WhatsApp no se verá una vista previa cuidada.`, { items })
    },
  },
  {
    id: 'onpage.empty-headings',
    title: 'Encabezados sin texto',
    weight: 1,
    docs: [DOCS.headings],
    run: ({ $ }) => {
      const hs = headings($)
      const empty = hs.filter((h) => !h.text)
      if (hs.length === 0) return warn('La página no tiene encabezados.')
      if (empty.length === 0) return pass(`Los ${hs.length} encabezados tienen contenido.`)
      return warn(`${empty.length} encabezado(s) están vacíos.`, {
        items: empty.map((h) => ({ label: `H${h.level} vacío`, status: 'bad' as const })),
      })
    },
  },
  {
    id: 'onpage.charset',
    title: 'Meta charset declarado',
    weight: 1,
    docs: [DOCS.metaEl],
    run: ({ $, page }) => {
      const ok =
        $('meta[charset]').length > 0 ||
        /charset=/i.test($('meta[http-equiv="content-type" i]').attr('content') ?? '') ||
        /charset=/i.test(page.headers['content-type'] ?? '')
      return ok
        ? pass('Se declara la codificación de caracteres (<meta charset> o Content-Type con charset).')
        : warn('No se declara la codificación de caracteres.', { fix: '<meta charset="utf-8" />' })
    },
  },
  {
    id: 'onpage.twitter',
    title: 'Twitter/X Cards',
    weight: 1,
    docs: [DOCS.twitter],
    run: (ctx) => {
      const keys: [string, string | null][] = [
        ['twitter:card', null],
        ['twitter:title', 'og:title'],
        ['twitter:description', 'og:description'],
        ['twitter:image', 'og:image'],
      ]
      const items = keys.map(([k, fallback]) => {
        const v = meta(ctx, k)
        const fb = !v && fallback ? meta(ctx, fallback) : null
        return {
          label: k,
          value: v ? truncate(v, 140) : fb ? `(usa ${fallback})` : 'Falta',
          status: v || fb ? ('ok' as const) : ('bad' as const),
        }
      })
      const present = items.filter((i) => i.status === 'ok').length
      if (present === 4) return pass('4 de 4 atributos presentes.', { items })
      return warn(`${present} de 4 atributos presentes.`, { items, fix: '<meta name="twitter:card" content="summary_large_image" />' })
    },
  },
  {
    id: 'onpage.favicon',
    title: 'Favicon declarado',
    weight: 1,
    docs: [DOCS.favicon],
    run: (ctx) => {
      const href = ctx.$('link[rel~="icon" i], link[rel="shortcut icon" i], link[rel="apple-touch-icon" i]').first().attr('href')
      if (!href) return warn('No se declara favicon con <link rel="icon">. Aparece junto a tu web en Google.')
      const abs = new URL(href, ctx.url).href
      return pass(`Se ha encontrado <link rel="icon">: ${abs}`)
    },
  },
  {
    id: 'onpage.nofollow-internal',
    title: 'Enlaces internos sin nofollow innecesario',
    weight: 1,
    docs: [DOCS.qualifyLinks],
    run: (ctx) => {
      const { $ } = ctx
      const bad = $('a[href][rel~="nofollow"]')
        .filter((_, el) => isInternal(ctx, $(el).attr('href')))
        .map((_, el) => $(el).attr('href'))
        .get()
      if (bad.length === 0) return pass('No se encuentran enlaces internos con rel="nofollow".')
      return warn(`${bad.length} enlace(s) internos llevan rel="nofollow": no transmiten autoridad dentro de tu propia web.`, {
        items: bad.slice(0, 8).map((label) => ({ label })),
      })
    },
  },
])
