'use client'

import Link from 'next/link'
import { usePathname } from 'next/navigation'
import { navCurrent } from '@/lib/nav'
import { cn } from '@/lib/utils'

const LINKS = [{ href: '/sitios', label: 'Sitios' }]

const LINK_CLASS =
  'rounded-sm text-sm font-medium text-zinc-700 underline-offset-4 hover:text-zinc-900 hover:underline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-zinc-900 dark:text-zinc-300 dark:hover:text-zinc-100 dark:focus-visible:outline-white'

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
              className={cn(LINK_CLASS, current && 'text-zinc-900 underline dark:text-zinc-100')}
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
