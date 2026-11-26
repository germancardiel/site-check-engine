import { useEffect, useState } from 'react'
import { startCountdown } from '@/lib/countdown'

/**
 * Seconds left until `availableAt` (ISO), ticking every second in the browser. The first value is
 * the one computed on the server (`initialSeconds`), so the server and client renders match.
 */
export function useCountdown(availableAt: string | null, initialSeconds: number): number {
  const [secondsLeft, setSecondsLeft] = useState(initialSeconds)

  useEffect(() => {
    if (!availableAt) return
    return startCountdown({ target: Date.parse(availableAt), now: () => Date.now(), onTick: setSecondsLeft })
  }, [availableAt])

  return availableAt ? secondsLeft : 0
}
