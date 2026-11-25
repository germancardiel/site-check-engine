/**
 * Parser de robots.txt según la especificación de Google (RFC 9309):
 * - Se aplica el grupo cuyo user-agent coincide de forma más específica; si no, '*'.
 * - Gana la regla con la ruta más larga; en empate, Allow.
 * - Soporta los comodines '*' y '$'.
 */

export interface RobotsRule {
  allow: boolean
  path: string
}

export interface RobotsGroup {
  agents: string[]
  rules: RobotsRule[]
  allow: string[]
  disallow: string[]
}

export interface ParsedRobots {
  groups: RobotsGroup[]
  sitemaps: string[]
}

function splitLine(rawLine: string): [string, string] | null {
  const line = rawLine.replace(/#.*$/, '').trim()
  if (!line) return null
  const idx = line.indexOf(':')
  if (idx === -1) return null
  return [line.slice(0, idx).trim().toLowerCase(), line.slice(idx + 1).trim()]
}

export function parseRobots(text: string): ParsedRobots {
  const groups: RobotsGroup[] = []
  const sitemaps: string[] = []
  let current: RobotsGroup | null = null
  let lastWasAgent = false

  for (const rawLine of text.split(/\r?\n/)) {
    const pair = splitLine(rawLine)
    if (!pair) continue
    const [key, value] = pair

    if (key === 'user-agent') {
      if (!current || !lastWasAgent) {
        current = { agents: [], rules: [], allow: [], disallow: [] }
        groups.push(current)
      }
      current.agents.push(value.toLowerCase())
      lastWasAgent = true
      continue
    }
    if (key === 'sitemap') {
      if (value) sitemaps.push(value)
      continue
    }
    lastWasAgent = false
    if (!current) continue
    if (key === 'allow' || key === 'disallow') {
      if (key === 'disallow' && value === '') continue
      const isAllow = key === 'allow'
      current.rules.push({ allow: isAllow, path: value })
      if (isAllow) current.allow.push(value)
      else current.disallow.push(value)
    }
  }
  return { groups, sitemaps }
}

function groupFor(robots: ParsedRobots, userAgent: string): RobotsRule[] {
  const ua = userAgent.toLowerCase()
  let best: { len: number; rules: RobotsRule[] } | null = null
  const merged: RobotsRule[] = []
  for (const g of robots.groups) {
    for (const agent of g.agents) {
      if (agent !== '*' && ua.includes(agent)) {
        if (!best || agent.length > best.len) best = { len: agent.length, rules: [...g.rules] }
        else if (agent.length === best.len) best.rules.push(...g.rules)
      }
    }
  }
  if (best) return best.rules
  for (const g of robots.groups) if (g.agents.includes('*')) merged.push(...g.rules)
  return merged
}

function patternToRegex(path: string): RegExp {
  const anchored = path.endsWith('$')
  const body = (anchored ? path.slice(0, -1) : path)
    .split('*')
    .map((s) => s.replace(/[.+?^${}()|[\]\\]/g, '\\$&'))
    .join('.*')
  return new RegExp(`^${body}${anchored ? '$' : ''}`)
}

/** ¿Puede `userAgent` rastrear `pathWithQuery`? */
export function isAllowed(robots: ParsedRobots, userAgent: string, pathWithQuery: string): boolean {
  const rules = groupFor(robots, userAgent)
  let match: RobotsRule | null = null
  for (const rule of rules) {
    if (!patternToRegex(rule.path).test(pathWithQuery)) continue
    if (
      !match ||
      rule.path.length > match.path.length ||
      (rule.path.length === match.path.length && rule.allow && !match.allow)
    ) {
      match = rule
    }
  }
  return match ? match.allow : true
}

/** ¿Existe un grupo específico (no '*') para este bot? */
export function hasSpecificGroup(robots: ParsedRobots, agent: string): boolean {
  const a = agent.toLowerCase()
  return robots.groups.some((g) => g.agents.some((x) => x !== '*' && a.includes(x)))
}

/** True when `agent` cannot crawl the site root (`Disallow: /` without `Allow: /`). */
export function isAgentBlocked(robots: ParsedRobots, agent: string): boolean {
  return !isAllowed(robots, agent, '/')
}
