/** Whole seconds left until `target` (epoch ms), rounded up and never negative. */
export function secondsUntil(target: number, now: number): number {
  if (!Number.isFinite(target) || !Number.isFinite(now)) return 0
  return Math.max(0, Math.ceil((target - now) / 1000))
}

/** Countdown as `m:ss`, e.g. 42 → "0:42", 75 → "1:15". */
export function formatCountdown(seconds: number): string {
  const total = Number.isFinite(seconds) && seconds > 0 ? Math.floor(seconds) : 0
  return `${Math.floor(total / 60)}:${String(total % 60).padStart(2, '0')}`
}

type CountdownOptions = {
  /** Moment (epoch ms) when the countdown reaches 0. */
  target: number
  /** Clock, injected so `src/lib` never reads the current time by itself (D-QA-08). */
  now: () => number
  /** Called right away and then every second with the seconds left; the last call is with 0. */
  onTick: (secondsLeft: number) => void
}

/** Starts a one-second countdown to `target`. Returns a function that stops it. */
export function startCountdown({ target, now, onTick }: CountdownOptions): () => void {
  let timer: ReturnType<typeof setInterval> | undefined
  const stop = () => {
    if (timer !== undefined) clearInterval(timer)
    timer = undefined
  }
  const tick = (): number => {
    const left = secondsUntil(target, now())
    onTick(left)
    if (left === 0) stop()
    return left
  }

  if (tick() > 0) timer = setInterval(tick, 1000)
  return stop
}
