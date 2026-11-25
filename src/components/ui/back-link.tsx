import Link from 'next/link'
import type { ReactNode } from 'react'

/** Text link to go back to a parent page, with an arrow hidden from screen readers. */
export function BackLink({ href, children }: { href: string; children: ReactNode }) {
  return (
    <Link
      href={href}
      className="self-start rounded-sm text-sm font-medium text-zinc-900 underline underline-offset-4 hover:text-zinc-700 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-zinc-900 dark:text-zinc-100 dark:hover:text-zinc-300 dark:focus-visible:outline-white"
    >
      <span aria-hidden="true">← </span>
      {children}
    </Link>
  )
}
