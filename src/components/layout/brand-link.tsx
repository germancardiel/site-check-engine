import Link from 'next/link'

/** "Faro" wordmark linking to `href` (the landing, or `/sitios` inside the app). */
export function BrandLink({ href }: { href: string }) {
  return (
    <Link
      href={href}
      className="rounded-sm text-lg font-semibold tracking-tight text-zinc-900 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-zinc-900 dark:text-zinc-100 dark:focus-visible:outline-white"
    >
      Faro
    </Link>
  )
}
