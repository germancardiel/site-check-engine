import Link from 'next/link'
import type { ReactNode } from 'react'

type AuthCardProps = {
  title: string
  intro: string
  children: ReactNode
  /** Cross link to the other auth page. */
  alternate: { question: string; href: string; label: string }
}

/** Shared frame of login and sign-up: title, intro, the form in a panel and the cross link. */
export function AuthCard({ title, intro, children, alternate }: AuthCardProps) {
  return (
    <div className="flex flex-col gap-6">
      <div className="flex flex-col gap-2">
        <h1 className="font-display text-4xl font-semibold tracking-display">{title}</h1>
        <p className="text-ink-muted">{intro}</p>
      </div>
      <div className="rounded-md border border-line bg-panel p-5 sm:p-6">{children}</div>
      <p className="text-sm text-ink-muted">
        {alternate.question}{' '}
        <Link
          href={alternate.href}
          className="rounded-sm font-semibold text-ink underline decoration-line-strong hover:decoration-ink"
        >
          {alternate.label}
        </Link>
      </p>
    </div>
  )
}
