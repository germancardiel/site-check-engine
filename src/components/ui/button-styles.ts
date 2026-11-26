import { cn } from '@/lib/utils'

export type ButtonVariant = 'primary' | 'secondary' | 'danger' | 'quiet'

const BASE =
  'inline-flex min-h-10 items-center justify-center gap-2 rounded-md px-4 py-2 text-sm font-semibold transition-[background-color,border-color,color] duration-200 ease-out disabled:cursor-not-allowed disabled:opacity-80'

const VARIANTS: Record<ButtonVariant, string> = {
  primary: 'bg-accent text-on-accent hover:bg-accent-hover active:bg-accent disabled:bg-accent',
  secondary:
    'border border-line-strong bg-transparent text-ink hover:border-ink hover:bg-panel disabled:border-dashed disabled:hover:border-line-strong disabled:hover:bg-transparent',
  danger: 'border border-fail bg-transparent text-ink hover:bg-panel disabled:border-dashed disabled:hover:bg-transparent',
  // Muted text cannot be faded: disabled quiet buttons lose the underline instead (D-UX-04).
  quiet:
    'px-2 text-ink-muted underline decoration-line-strong hover:text-ink hover:decoration-ink disabled:no-underline disabled:opacity-100',
}

/** Class names shared by `<button>`s and links that look like buttons. */
export function buttonClass(variant: ButtonVariant = 'primary', className?: string): string {
  return cn(BASE, VARIANTS[variant], className)
}
