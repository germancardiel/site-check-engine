'use client'

import Link from 'next/link'
import { usePathname } from 'next/navigation'
import { navCurrent } from '@/lib/nav'
import { cn } from '@/lib/utils'

const LINKS = [{ href: '/sitios', label: 'Sitios' }]

/** Links of the private area; with a pathname, the current one gets `aria-current`. */
export function NavLinks({ pathname }: { pathname: string | null }) {
  return (
    <ul className="flex flex-wrap items-center gap-4">
      {LINKS.map((link) => {
        const current = pathname ? navCurrent(pathname, link.href) : undefined
        return (
          <li key={link.href}>
            <Link
              href={link.href}
              aria-current={current}
              className={cn(
                'rounded-sm text-sm font-medium text-ink-muted underline-offset-[0.4em] transition-colors duration-200 ease-out hover:text-ink',
                current && 'text-ink underline decoration-ink decoration-2',
              )}
            >
              {link.label}
            </Link>
          </li>
        )
      })}
    </ul>
  )
}

/** `NavLinks` for the current route. */
export function MainNav() {
  return <NavLinks pathname={usePathname()} />
}
