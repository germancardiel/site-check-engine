import { buildLlmsTxt, siteUrl } from '@/lib/site'

/** `/llms.txt`: Markdown summary of Site Check Engine for AI assistants. Takes no input. */
export function GET(): Response {
  return new Response(buildLlmsTxt(siteUrl()), {
    headers: { 'Content-Type': 'text/plain; charset=utf-8' },
  })
}
