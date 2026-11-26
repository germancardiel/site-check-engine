import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import { formatCountdown, secondsUntil, startCountdown } from '@/lib/countdown'

describe('secondsUntil', () => {
  it('redondea hacia arriba y nunca es negativo', () => {
    expect(secondsUntil(10_000, 0)).toBe(10)
    expect(secondsUntil(10_001, 0)).toBe(11)
    expect(secondsUntil(0, 10_000)).toBe(0)
    expect(secondsUntil(Number.NaN, 0)).toBe(0)
  })
})

describe('formatCountdown', () => {
  it('formatea m:ss', () => {
    expect(formatCountdown(42)).toBe('0:42')
    expect(formatCountdown(60)).toBe('1:00')
    expect(formatCountdown(75)).toBe('1:15')
    expect(formatCountdown(0)).toBe('0:00')
    expect(formatCountdown(-3)).toBe('0:00')
    expect(formatCountdown(Number.NaN)).toBe('0:00')
  })
})

describe('startCountdown (temporizadores falsos)', () => {
  beforeEach(() => {
    vi.useFakeTimers()
    vi.setSystemTime(new Date('2026-11-26T10:00:20.000Z'))
  })
  afterEach(() => vi.useRealTimers())

  it('con la última auditoría hace 20 s cuenta 40 s y se detiene en 0', () => {
    const lastStarted = Date.parse('2026-11-26T10:00:00.000Z')
    const onTick = vi.fn()
    startCountdown({ target: lastStarted + 60_000, now: () => Date.now(), onTick })
    expect(onTick).toHaveBeenLastCalledWith(40)
    vi.advanceTimersByTime(18_000)
    expect(onTick).toHaveBeenLastCalledWith(22)
    vi.advanceTimersByTime(22_000)
    expect(onTick).toHaveBeenLastCalledWith(0)
    const calls = onTick.mock.calls.length
    vi.advanceTimersByTime(5_000)
    expect(onTick).toHaveBeenCalledTimes(calls)
    expect(vi.getTimerCount()).toBe(0)
  })

  it('si ya ha pasado el plazo avisa con 0 y no programa nada', () => {
    const onTick = vi.fn()
    startCountdown({ target: Date.now() - 1, now: () => Date.now(), onTick })
    expect(onTick).toHaveBeenCalledExactlyOnceWith(0)
    expect(vi.getTimerCount()).toBe(0)
  })

  it('la función devuelta detiene la cuenta atrás', () => {
    const onTick = vi.fn()
    const stop = startCountdown({ target: Date.now() + 30_000, now: () => Date.now(), onTick })
    stop()
    vi.advanceTimersByTime(10_000)
    expect(onTick).toHaveBeenCalledTimes(1)
    expect(vi.getTimerCount()).toBe(0)
  })
})
