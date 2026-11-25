import { DOCS } from '../docs'
import { nodesOfType } from '../text'
import type { EvidenceItem } from '../types'
import { cleanText, defineChecks, fail, na, pass, unavailable, warn } from './helpers'

const LEGAL_LINKS: { label: string; re: RegExp }[] = [
  { label: 'Contacto', re: /contact|contacto|contacte|contacta|mailto:|tel:/i },
  { label: 'Sobre nosotros', re: /sobre[- ]?(nosotros|mi|mí)|about|qui[eé]n(es)?[- ]somos|qui[eé]n[- ]soy|equipo|nosaltres|qui-som|team/i },
  { label: 'Aviso legal', re: /aviso[- ]legal|avis[- ]legal|legal[- ]notice|imprint|impressum|t[eé]rminos|condiciones|terms/i },
  { label: 'Privacidad', re: /privacidad|privacitat|privacy|protecci[oó]n[- ]de[- ]datos|rgpd|gdpr/i },
]

const PHONE_RE = /(?:\+34|0034)?[\s.-]?[6789]\d{2}[\s.-]?\d{2,3}[\s.-]?\d{2,3}[\s.-]?\d{0,2}\b/
const ADDRESS_RE = /\b(calle|c\/|avda\.?|avenida|plaza|pza\.?|paseo|pg\.?|pol[ií]gono|carrer|rambla|camino|ronda|traves[ií]a|pla[cç]a|passeig)\s+\S+/i
const POSTAL_RE = /\b(0[1-9]|[1-4]\d|5[0-2])\d{3}\b/
const TAX_RE = /\b([ABCDEFGHJNPQRSUVW]-?\d{7}-?[0-9A-J]|\d{8}-?[A-Z]|[XYZ]-?\d{7}-?[A-Z])\b/

export const trustChecks = defineChecks('trust', [
  {
    id: 'trust.https',
    title: 'HTTPS con certificado válido',
    weight: 3,
    docs: [DOCS.https],
    run: ({ url, tls }) => {
      if (url.protocol !== 'https:') {
        return fail('La página se sirve sin HTTPS: los navegadores la marcan como "No segura".', {
          fix: 'Instala un certificado (gratuito con Let’s Encrypt) y redirige http → https con 301.',
        })
      }
      if (tls && !tls.authorized) {
        return fail(`El certificado SSL no es válido (${tls.error ?? 'error de verificación'}).`)
      }
      return pass('La página se sirve sobre HTTPS con un certificado válido.')
    },
  },
  {
    id: 'trust.ssl-expiry',
    title: 'Caducidad del certificado SSL',
    weight: 2,
    docs: [DOCS.https],
    run: ({ url, tls }) => {
      if (url.protocol !== 'https:') return na('La página no usa HTTPS.')
      if (!tls || tls.daysLeft === null) return unavailable('No se ha podido leer el certificado.')
      const issuer = tls.issuer ? ` (emisor: ${tls.issuer})` : ''
      if (tls.daysLeft < 0) return fail(`El certificado SSL caducó hace ${-tls.daysLeft} día(s)${issuer}.`)
      if (tls.daysLeft < 7) return fail(`El certificado SSL caduca en ${tls.daysLeft} día(s)${issuer}. Renuévalo ya.`)
      if (tls.daysLeft < 21) return warn(`El certificado SSL caduca en ${tls.daysLeft} días${issuer}. Comprueba que la renovación automática funciona.`)
      return pass(`El certificado SSL es válido ${tls.daysLeft} día(s) más${issuer}.`)
    },
  },
  {
    id: 'trust.legal-links',
    title: 'Enlaces a contacto, sobre nosotros, aviso legal y privacidad',
    weight: 2,
    docs: [DOCS.eeat],
    run: ({ $ }) => {
      const links = $('a[href]')
        .map((_, el) => `${$(el).attr('href')} ${cleanText($(el).text())}`)
        .get()
      const items: EvidenceItem[] = LEGAL_LINKS.map(({ label, re }) => {
        const ok = links.some((l) => re.test(l))
        return { label, value: ok ? 'Enlazado' : 'No encontrado', status: ok ? 'ok' : 'bad' }
      })
      const found = items.filter((i) => i.status === 'ok').length
      const note = 'Comprobado solo en esta página: pueden existir enlazados desde otra sección.'
      if (found === 4) return pass(`${note} Todas presentes.`, { items })
      if (found >= 2) return warn(`${note} Faltan ${4 - found}.`, { items })
      return fail(`${note} Faltan ${4 - found}: son básicas para la confianza y obligatorias por ley (LSSI/RGPD).`, { items })
    },
  },
  {
    id: 'trust.mixed',
    title: 'Sin contenido mixto (recursos http:// en página https://)',
    weight: 2,
    docs: [DOCS.mixed],
    run: ({ $, url }) => {
      if (url.protocol !== 'https:') return na('La página no usa HTTPS.')
      const active = $('script[src^="http:"], link[rel~="stylesheet"][href^="http:"], iframe[src^="http:"]')
        .map((_, el) => $(el).attr('src') ?? $(el).attr('href'))
        .get()
      const passive = $('img[src^="http:"], video[src^="http:"], audio[src^="http:"], source[src^="http:"]')
        .map((_, el) => $(el).attr('src'))
        .get()
      if (active.length > 0) {
        return fail(`${active.length} script(s)/estilo(s) se cargan por http://: el navegador los bloqueará.`, {
          items: active.slice(0, 6).map((label) => ({ label, status: 'bad' as const })),
        })
      }
      if (passive.length > 0) {
        return warn(`${passive.length} imagen(es) o vídeo(s) se cargan por http://.`, {
          items: passive.slice(0, 6).map((label) => ({ label, status: 'bad' as const })),
        })
      }
      return pass('No se detectan recursos cargados por http:// en esta página https://.')
    },
  },
  {
    id: 'trust.business-data',
    title: 'Datos de empresa verificables en la página',
    weight: 1,
    docs: [DOCS.eeat],
    run: ({ $, text, jsonLd }) => {
      const body = text.visible
      const schemaNodes = jsonLd.nodes
      const phone =
        $('a[href^="tel:"]').length > 0 || PHONE_RE.test(body) || schemaNodes.some((n) => n.telephone)
      const address =
        ADDRESS_RE.test(body) || (POSTAL_RE.test(body) && /\b(espa[ñn]a|spain|lleida|lérida|barcelona|madrid|valencia|zaragoza|tarragona|girona)\b/i.test(body)) || schemaNodes.some((n) => n.address)
      const tax = TAX_RE.test(body) || schemaNodes.some((n) => n.vatID || n.taxID)
      const items: EvidenceItem[] = [
        { label: 'Teléfono', value: phone ? 'Detectado' : 'No detectado', status: phone ? 'ok' : 'bad' },
        { label: 'Dirección', value: address ? 'Detectada' : 'No detectada', status: address ? 'ok' : 'bad' },
        { label: 'NIF / CIF / VAT', value: tax ? 'Detectado' : 'No detectado', status: tax ? 'ok' : 'bad' },
      ]
      const found = [phone, address, tax].filter(Boolean).length
      const note = 'Heurística sobre el texto, no una verificación real contra el registro mercantil ni Google Business Profile.'
      if (found === 3) return pass(note, { items })
      if (found >= 1) return warn(`${note} Mostrar datos reales de contacto y fiscales da confianza.`, { items })
      return fail(`${note} No se encuentran datos de empresa: es una señal de poca confianza.`, { items })
    },
  },
  {
    id: 'trust.sec-headers',
    title: 'Cabeceras de seguridad HTTP',
    weight: 1,
    docs: [DOCS.secHeaders],
    run: ({ page, url }) => {
      const h = page.headers
      const csp = h['content-security-policy'] ?? ''
      const hsts =
        url.protocol === 'https:'
          ? h['strict-transport-security']
          : (h['strict-transport-security'] ?? '(no aplica en HTTP)')
      const checks: [string, string | undefined][] = [
        ['Strict-Transport-Security', hsts],
        ['X-Content-Type-Options', h['x-content-type-options']],
        ['Content-Security-Policy', csp || undefined],
        ['X-Frame-Options', h['x-frame-options'] ?? (/frame-ancestors/i.test(csp) ? '(vía CSP frame-ancestors)' : undefined)],
      ]
      const items: EvidenceItem[] = checks.map(([label, v]) => ({
        label,
        value: v ? (v.length > 160 ? `${v.slice(0, 157)}…` : v) : 'Falta',
        status: v ? 'ok' : 'bad',
      }))
      const found = items.filter((i) => i.status === 'ok').length
      const msg = `${found} de 4 cabeceras de seguridad presentes.`
      if (found === 4) return pass(msg, { items })
      if (found >= 2) return warn(msg, { items })
      return fail(msg, { items })
    },
  },
  {
    id: 'trust.reviews',
    title: 'Reseñas/testimonios marcados',
    weight: 1,
    docs: [DOCS.review],
    run: ({ $, jsonLd }) => {
      const marked = nodesOfType(jsonLd, 'Review', 'AggregateRating').length > 0 || jsonLd.nodes.some((n) => n.aggregateRating || n.review)
      const visible = $('[class*="testimon" i], [class*="review" i], [class*="resena" i], [class*="reseña" i], [id*="testimon" i], [id*="review" i]').length > 0
      if (marked) return pass('Las reseñas están marcadas con Review o AggregateRating.')
      if (visible) {
        return warn('Hay testimonios visibles pero sin marcado Review/AggregateRating.', {
          fix: 'Las reseñas propias de un negocio sobre sí mismo no generan estrellas en Google, pero sí ayudan a las IA a entender tu reputación.',
        })
      }
      return na('No se detectan reseñas en esta página.')
    },
  },
])
