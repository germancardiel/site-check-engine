import { describe, expect, it } from 'vitest'
import { isAgentBlocked, parseRobots } from '../robots'
import { readFixture } from './fixtures/helpers'

describe('parseRobots', () => {
  it('agrupa user-agents consecutivos e ignora comentarios', () => {
    const robots = parseRobots(readFixture('robots-block-some.txt'))
    expect(robots.groups).toEqual([
      { agents: ['gptbot', 'claudebot'], allow: [], disallow: ['/'] },
      { agents: ['*'], allow: [], disallow: ['/admin'] },
    ])
  })

  it('extrae las líneas Sitemap', () => {
    expect(parseRobots(readFixture('robots-open.txt')).sitemaps).toHaveLength(1)
    expect(parseRobots('Disallow: /\nlínea sin dos puntos').groups).toEqual([])
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
