import { cn } from '@/lib/utils'

export type ButtonVariant = 'primary' | 'secondary' | 'danger' | 'quiet'

const BASE =
  'inline-flex min-h-10 items-center justify-center gap-2 rounded-md px-4 py-2 text-sm font-semibold transition-[background-color,border-color,color] duration-200 ease-out disabled:cursor-not-allowed'

const VARIANTS: Record<ButtonVariant, string> = {
  primary: 'bg-accent text-on-accent hover:bg-accent-hover active:bg-accent disabled:bg-accent',
  secondary:
    'border border-line-strong bg-transparent text-ink hover:border-ink hover:bg-panel disabled:text-ink-muted disabled:hover:border-line-strong disabled:hover:bg-transparent',
  danger: 'border border-fail bg-transparent text-ink hover:bg-panel disabled:text-ink-muted disabled:hover:bg-transparent',
  quiet: 'px-2 text-ink-muted underline decoration-line-strong hover:text-ink hover:decoration-ink',
}

/** Class names shared by `<button>`s and links that look like buttons. */
export function buttonClass(variant: ButtonVariant = 'primary', className?: string): string {
  return cn(BASE, VARIANTS[variant], className)
}
