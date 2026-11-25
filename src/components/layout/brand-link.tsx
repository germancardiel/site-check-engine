import Link from 'next/link'
import { SITE_NAME } from '@/lib/site'

/** Wordmark linking to `href` (the landing, or `/sitios` inside the app). */
export function BrandLink({ href }: { href: string }) {
  return (
    <Link href={href} className="group inline-flex items-center gap-2.5 rounded-sm text-ink">
      <svg aria-hidden="true" viewBox="0 0 20 20" fill="none" className="size-5 shrink-0">
        <circle cx="10" cy="10" r="8.25" stroke="currentColor" strokeWidth="1.5" className="text-line-strong" />
        <path
          d="M6.4 10.3 8.9 12.7 13.8 7.4"
          stroke="currentColor"
          strokeWidth="1.75"
          strokeLinecap="round"
          strokeLinejoin="round"
          className="text-accent-text"
        />
      </svg>
      <span className="text-[0.95rem] font-semibold tracking-tight">{SITE_NAME}</span>
    </Link>
  )
}
