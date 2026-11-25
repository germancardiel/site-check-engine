import Link from 'next/link'
import type { ReactNode } from 'react'

/** Text link to go back to a parent page, with an arrow hidden from screen readers. */
export function BackLink({ href, children }: { href: string; children: ReactNode }) {
  return (
    <Link
      href={href}
      className="group inline-flex items-center gap-1.5 self-start rounded-sm text-sm font-medium text-ink-muted transition-colors duration-200 ease-out hover:text-ink"
    >
      <svg
        aria-hidden="true"
        viewBox="0 0 16 16"
        fill="none"
        stroke="currentColor"
        strokeWidth={1.75}
        strokeLinecap="round"
        strokeLinejoin="round"
        className="size-4 transition-transform duration-200 ease-out group-hover:-translate-x-0.5"
      >
        <path d="M12.5 8h-9M7 4.5 3.5 8 7 11.5" />
      </svg>
      <span className="underline decoration-line-strong group-hover:decoration-ink">{children}</span>
    </Link>
  )
}
