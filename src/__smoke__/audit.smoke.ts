import { describe, expect, it } from 'vitest'
import { runAudit } from '@/lib/audit'
import { smokeBaseUrl } from './env'
import { LOCAL_AUDIT_HOST, isLoopbackOrigin, selfAuditTarget } from './self-audit'

describe('smoke de autoauditoría', () => {
  it('Faro se audita a sí mismo con status ok y todos los checks en pass', async () => {
    const base = smokeBaseUrl()
    const { url, deps } = selfAuditTarget(base)
    const outcome = await runAudit(url, deps)
    if (outcome.status !== 'ok') throw new Error(`La autoauditoría falló: ${outcome.error}`)

    // Over plain http (local) only the `https` check is exempt.
    const exempt = base.startsWith('https://') ? [] : ['https']
    const failing = outcome.checks
      .filter((check) => check.status !== 'pass' && !exempt.includes(check.id))
      .map((check) => `${check.id} (${check.status}): ${check.message}`)
    const hint = isLoopbackOrigin(base)
      ? ` En local, compila con NEXT_PUBLIC_SITE_URL=http://${LOCAL_AUDIT_HOST}:<puerto>.`
      : ''
    expect(failing, `Checks que no pasan.${hint}`).toEqual([])
  })
})
