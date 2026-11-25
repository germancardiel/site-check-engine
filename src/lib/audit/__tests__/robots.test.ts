import { describe, expect, it } from 'vitest'
import { hasSpecificGroup, isAgentBlocked, isAllowed, parseRobots } from '../robots'
import { readFixture } from './fixtures/helpers'

describe('parseRobots y RFC 9309', () => {
  it('agrupa user-agents consecutivos e ignora comentarios', () => {
    const robots = parseRobots(readFixture('robots-block-some.txt'))
    expect(robots.groups).toEqual([
      {
        agents: ['gptbot', 'claudebot'],
        rules: [{ allow: false, path: '/' }],
        allow: [],
        disallow: ['/'],
      },
      {
        agents: ['*'],
        rules: [{ allow: false, path: '/admin' }],
        allow: [],
        disallow: ['/admin'],
      },
    ])
  })

  it('extrae las líneas Sitemap', () => {
    expect(parseRobots(readFixture('robots-open.txt')).sitemaps).toHaveLength(1)
    expect(parseRobots('Disallow: /\nlínea sin dos puntos').groups).toEqual([])
  })

  it('aplica la regla más larga y soporta comodines * y $', () => {
    const robots = parseRobots(`
User-agent: *
Disallow: /admin
Allow: /admin/public
Disallow: /*.pdf$

User-agent: GPTBot
Disallow: /
`)
    expect(isAllowed(robots, 'Googlebot', '/admin/x')).toBe(false)
    expect(isAllowed(robots, 'Googlebot', '/admin/public/x')).toBe(true)
    expect(isAllowed(robots, 'Googlebot', '/docs/a.pdf')).toBe(false)
    expect(isAllowed(robots, 'Googlebot', '/docs/a.pdf?x=1')).toBe(true)
    expect(hasSpecificGroup(robots, 'GPTBot')).toBe(true)
    expect(hasSpecificGroup(robots, 'ClaudeBot')).toBe(false)

    const multi = parseRobots('User-agent: gptbot\nDisallow: /a\n\nUser-agent: gptbot\nDisallow: /b')
    expect(isAllowed(multi, 'GPTBot', '/a')).toBe(false)
    expect(isAllowed(multi, 'GPTBot', '/b')).toBe(false)
  })
})

describe('isAgentBlocked', () => {
  it('usa el grupo específico antes que *', () => {
    const robots = parseRobots(readFixture('robots-block-some.txt'))
    expect(isAgentBlocked(robots, 'GPTBot')).toBe(true)
    expect(isAgentBlocked(robots, 'PerplexityBot')).toBe(false)
  })

  it('aplica * con Disallow: / a quien no tiene grupo propio', () => {
    expect(isAgentBlocked(parseRobots(readFixture('robots-block-all.txt')), 'ClaudeBot')).toBe(true)
  })

  it('Allow: / prevalece sobre Disallow: /', () => {
    const robots = parseRobots(readFixture('robots-allow-override.txt'))
    expect(isAgentBlocked(robots, 'GPTBot')).toBe(false)
    expect(isAgentBlocked(robots, 'ClaudeBot')).toBe(true)
  })

  it('Disallow vacío o un robots.txt vacío no bloquean', () => {
    expect(isAgentBlocked(parseRobots(readFixture('robots-open.txt')), 'GPTBot')).toBe(false)
    expect(isAgentBlocked(parseRobots(''), 'GPTBot')).toBe(false)
  })
})
