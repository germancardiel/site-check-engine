const WAVE_PATH =
  'M0 100 Q180 40 360 100 T720 100 T1080 100 T1440 100 T1800 100 T2160 100 T2520 100 T2880 100'

/** Decorative fixed background with two drifting colour blurs and a travelling wave (CA11). */
export function AmbientGlow() {
  return (
    <div className="ambient-glow pointer-events-none" aria-hidden="true">
      <span className="glow-a" />
      <span className="glow-b" />
      <div className="glow-wave">
        <svg viewBox="0 0 2880 200" preserveAspectRatio="none" focusable="false">
          <path className="wave-band" d={WAVE_PATH} />
          <path className="wave-line" d={WAVE_PATH} />
        </svg>
      </div>
    </div>
  )
}
