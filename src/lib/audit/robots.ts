type RobotsGroup = { agents: string[]; allow: string[]; disallow: string[] }

export type ParsedRobots = { groups: RobotsGroup[]; sitemaps: string[] }

function splitLine(line: string): [string, string] | null {
  const content = line.replace(/#.*$/, '').trim()
  const colon = content.indexOf(':')
  if (colon === -1) return null
  return [content.slice(0, colon).trim().toLowerCase(), content.slice(colon + 1).trim()]
}

/** Minimal robots.txt parser (RFC 9309): user-agent groups, allow/disallow and sitemaps. */
export function parseRobots(text: string): ParsedRobots {
  const groups: RobotsGroup[] = []
  const sitemaps: string[] = []
  let current: RobotsGroup | null = null
  let lastWasAgent = false
  for (const line of text.split(/\r?\n/)) {
    const pair = splitLine(line)
    if (!pair) continue
    const [key, value] = pair
    if (key === 'user-agent') {
      if (!current || !lastWasAgent) {
        current = { agents: [], allow: [], disallow: [] }
        groups.push(current)
      }
      current.agents.push(value.toLowerCase())
      lastWasAgent = true
      continue
    }
    lastWasAgent = false
    if (key === 'sitemap' && value) sitemaps.push(value)
    else if (key === 'allow' && current && value) current.allow.push(value)
    else if (key === 'disallow' && current && value) current.disallow.push(value)
  }
  return { groups, sitemaps }
}

function groupsFor(robots: ParsedRobots, agent: string): RobotsGroup[] {
  const name = agent.toLowerCase()
  const specific = robots.groups.filter((g) => g.agents.includes(name))
  return specific.length > 0 ? specific : robots.groups.filter((g) => g.agents.includes('*'))
}

const ROOT_RULES = new Set(['/', '/*'])

/** True when `agent` cannot crawl the site root (`Disallow: /` without `Allow: /`). */
export function isAgentBlocked(robots: ParsedRobots, agent: string): boolean {
  const groups = groupsFor(robots, agent)
  const disallowed = groups.some((g) => g.disallow.some((rule) => ROOT_RULES.has(rule)))
  const allowed = groups.some((g) => g.allow.some((rule) => ROOT_RULES.has(rule)))
  return disallowed && !allowed
}
