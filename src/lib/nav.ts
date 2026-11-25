/** `aria-current` of a navigation link: `page` on its own page, `true` inside its section. */
export function navCurrent(pathname: string, href: string): 'page' | 'true' | undefined {
  if (pathname === href) return 'page'
  return pathname.startsWith(`${href}/`) ? 'true' : undefined
}
