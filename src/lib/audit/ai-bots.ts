export interface AiBot {
  name: string
  /** User-agent real que envía el bot (para la prueba de WAF). null = token solo de robots.txt. */
  userAgent: string | null
}

export const AI_BOTS: AiBot[] = [
  { name: 'GPTBot', userAgent: 'Mozilla/5.0 AppleWebKit/537.36 (KHTML, like Gecko; compatible; GPTBot/1.2; +https://openai.com/gptbot)' },
  { name: 'OAI-SearchBot', userAgent: 'Mozilla/5.0 AppleWebKit/537.36 (KHTML, like Gecko; compatible; OAI-SearchBot/1.0; +https://openai.com/searchbot)' },
  { name: 'ChatGPT-User', userAgent: 'Mozilla/5.0 AppleWebKit/537.36 (KHTML, like Gecko; compatible; ChatGPT-User/1.0; +https://openai.com/bot)' },
  { name: 'ClaudeBot', userAgent: 'Mozilla/5.0 AppleWebKit/537.36 (KHTML, like Gecko; compatible; ClaudeBot/1.0; +claudebot@anthropic.com)' },
  { name: 'Claude-User', userAgent: 'Mozilla/5.0 AppleWebKit/537.36 (KHTML, like Gecko; compatible; Claude-User/1.0; +Claude-User@anthropic.com)' },
  { name: 'PerplexityBot', userAgent: 'Mozilla/5.0 AppleWebKit/537.36 (KHTML, like Gecko; compatible; PerplexityBot/1.0; +https://perplexity.ai/perplexitybot)' },
  { name: 'Google-Extended', userAgent: null },
  { name: 'Applebot-Extended', userAgent: null },
  { name: 'Meta-ExternalAgent', userAgent: 'meta-externalagent/1.1 (+https://developers.facebook.com/docs/sharing/webmasters/crawler)' },
  { name: 'Bytespider', userAgent: 'Mozilla/5.0 (Linux; Android 5.0) AppleWebKit/537.36 (KHTML, like Gecko) Mobile Safari/537.36 (compatible; Bytespider; spider-feedback@bytedance.com)' },
  { name: 'CCBot', userAgent: 'CCBot/2.0 (https://commoncrawl.org/faq/)' },
]
