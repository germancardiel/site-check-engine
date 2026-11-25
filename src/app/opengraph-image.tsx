import { ImageResponse } from 'next/og'
import { THEMES } from '@/lib/design/tokens'
import { SITE_DESCRIPTION, SITE_NAME } from '@/lib/site'

export const alt = `${SITE_NAME}: auditoría SEO y de visibilidad para asistentes de IA`
export const size = { width: 1200, height: 630 }
export const contentType = 'image/png'

const DARK = THEMES.dark

// `ImageResponse` (Satori) only understands inline styles; Tailwind classes do not apply here.
// Colours come from the dark theme tokens.
export default function OpenGraphImage() {
  return new ImageResponse(
    (
      <div
        style={{
          width: '100%',
          height: '100%',
          display: 'flex',
          flexDirection: 'column',
          justifyContent: 'space-between',
          padding: 88,
          background: DARK.ground.hex,
          color: DARK.ink.hex,
        }}
      >
        <div style={{ display: 'flex', alignItems: 'center', gap: 20 }}>
          <div
            style={{
              width: 44,
              height: 44,
              borderRadius: 999,
              border: `3px solid ${DARK.accent.hex}`,
              display: 'flex',
            }}
          />
          <div style={{ fontSize: 40, fontWeight: 600 }}>{SITE_NAME}</div>
        </div>
        <div style={{ display: 'flex', flexDirection: 'column', gap: 28 }}>
          <div style={{ fontSize: 84, fontWeight: 700, letterSpacing: -3, lineHeight: 1.02, display: 'flex', flexWrap: 'wrap' }}>
            <span>Tu web, revisada para Google&nbsp;</span>
            <span style={{ color: DARK.accent.hex, fontStyle: 'italic' }}>y para la IA.</span>
          </div>
          <div
            style={{
              fontSize: 30,
              lineHeight: 1.35,
              color: DARK['ink-muted'].hex,
              borderTop: `1px solid ${DARK.panel.hex}`,
              paddingTop: 28,
            }}
          >
            {SITE_DESCRIPTION}
          </div>
        </div>
      </div>
    ),
    size,
  )
}
