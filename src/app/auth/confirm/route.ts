import { redirect } from 'next/navigation'
import type { NextRequest } from 'next/server'
import { INVALID_LINK_PATH, safeNextPath } from '@/lib/next-path'
import { createClient } from '@/lib/supabase/server'
import { confirmParamsSchema, type ConfirmParams } from '@/lib/validation/auth'

/** Creates the session from the link; `false` if Supabase rejects it or anything throws. */
async function confirmLink(params: ConfirmParams): Promise<boolean> {
  try {
    const supabase = await createClient()
    const { error } =
      'token_hash' in params
        ? await supabase.auth.verifyOtp({ type: params.type, token_hash: params.token_hash })
        : await supabase.auth.exchangeCodeForSession(params.code)
    if (error) {
      console.error('[auth/confirm]', error)
      return false
    }
    return true
  } catch (error) {
    console.error('[auth/confirm]', error)
    return false
  }
}

/**
 * Landing of the Supabase emails (sign-up confirmation and password recovery). Accepts an
 * email OTP (`token_hash` + `type`, custom templates) or a PKCE `code` (default templates),
 * creates the session and goes to `next` if it is an internal path (D-SEC-14) or to `/sitios`.
 * Invalid parameters, Supabase errors and exceptions all land on `/login?error=enlace`.
 */
export async function GET(request: NextRequest) {
  const parsed = confirmParamsSchema.safeParse(Object.fromEntries(request.nextUrl.searchParams))
  if (!parsed.success) redirect(INVALID_LINK_PATH)

  // `redirect()` throws, so it stays outside the try/catch of `confirmLink`.
  const confirmed = await confirmLink(parsed.data)
  redirect(confirmed ? safeNextPath(parsed.data.next) : INVALID_LINK_PATH)
}
