import Link from 'next/link'
import type { ReactNode } from 'react'
import { buttonClass, type ButtonVariant } from './button-styles'

type ButtonLinkProps = {
  href: string
  children: ReactNode
  variant?: ButtonVariant
  className?: string
}

/** Navigation link that looks like a button (same styles as `SubmitButton`). */
export function ButtonLink({ href, children, variant = 'primary', className }: ButtonLinkProps) {
  return (
    <Link href={href} className={buttonClass(variant, className)}>
      {children}
    </Link>
  )
}
