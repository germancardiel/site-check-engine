import type { Metadata, Viewport } from 'next'
import type { ReactNode } from 'react'
import { Fraunces, JetBrains_Mono, Plus_Jakarta_Sans, Syne } from 'next/font/google'
import { SkipLink } from '@/components/layout/skip-link'
import { THEMES } from '@/lib/design/tokens'
import { SITE_DESCRIPTION, SITE_NAME, SITE_TITLE, siteUrl } from '@/lib/site'
import './globals.css'

const syne = Syne({ variable: '--font-syne', weight: '600', subsets: ['latin'] })

const jakarta = Plus_Jakarta_Sans({ variable: '--font-jakarta', weight: ['400', '500', '600'], subsets: ['latin'] })

const fraunces = Fraunces({ variable: '--font-fraunces', weight: '400', style: 'italic', subsets: ['latin'] })

const jetbrains = JetBrains_Mono({ variable: '--font-jetbrains', weight: ['400', '500'], subsets: ['latin'] })

const FONT_VARIABLES = [syne, jakarta, fraunces, jetbrains].map((font) => font.variable).join(' ')

export const metadata: Metadata = {
  metadataBase: new URL(siteUrl()),
  title: SITE_TITLE,
  description: SITE_DESCRIPTION,
  openGraph: {
    type: 'website',
    locale: 'es_ES',
    siteName: SITE_NAME,
    title: SITE_TITLE,
    description: SITE_DESCRIPTION,
  },
}

export const viewport: Viewport = {
  width: 'device-width',
  initialScale: 1,
  themeColor: [
    { media: '(prefers-color-scheme: light)', color: THEMES.light.ground.hex },
    { media: '(prefers-color-scheme: dark)', color: THEMES.dark.ground.hex },
  ],
}

export default function RootLayout({ children }: Readonly<{ children: ReactNode }>) {
  return (
    <html lang="es" className={`${FONT_VARIABLES} h-full antialiased`}>
      <body className="flex min-h-full flex-col bg-ground text-ink">
        <SkipLink />
        {children}
      </body>
    </html>
  )
}
