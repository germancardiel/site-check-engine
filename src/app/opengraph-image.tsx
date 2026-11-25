import { ImageResponse } from 'next/og'
import { SITE_DESCRIPTION, SITE_NAME } from '@/lib/site'

export const alt = 'Faro: auditoría SEO y de visibilidad para asistentes de IA'
export const size = { width: 1200, height: 630 }
export const contentType = 'image/png'

// `ImageResponse` (Satori) only understands inline styles; Tailwind classes do not apply here.
export default function OpenGraphImage() {
  return new ImageResponse(
    (
      <div
        style={{
          width: '100%',
          height: '100%',
          display: 'flex',
          flexDirection: 'column',
          justifyContent: 'center',
          gap: 32,
          padding: 96,
          background: '#18181b',
          color: '#fafafa',
        }}
      >
        <div style={{ fontSize: 112, fontWeight: 700, letterSpacing: -4 }}>{SITE_NAME}</div>
        <div style={{ fontSize: 44, lineHeight: 1.3, color: '#d4d4d8' }}>{SITE_DESCRIPTION}</div>
      </div>
    ),
    size,
  )
}
