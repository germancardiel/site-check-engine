import { ButtonLink } from './button-link'

type NotFoundStateProps = {
  title: string
  /** Ending of `title` set in the italic serif (public pages only). */
  emphasis?: string
  message: string
  href: string
  linkLabel: string
}

/** "Not found" state: what happened and the way back. */
export function NotFoundState({ title, emphasis, message, href, linkLabel }: NotFoundStateProps) {
  const lead = emphasis && title.endsWith(emphasis) ? title.slice(0, -emphasis.length) : null
  return (
    <div className="mx-auto flex w-full max-w-app flex-1 flex-col items-start gap-6 px-4 py-12 sm:px-6 sm:py-20">
      <h1 className="max-w-[18ch] font-display text-4xl font-semibold tracking-display text-balance sm:text-6xl">
        {lead !== null ? (
          <>
            {lead}
            <em className="font-serif font-normal tracking-normal text-accent-text">{emphasis}</em>
          </>
        ) : (
          title
        )}
      </h1>
      <p className="max-w-prose text-lg text-ink-muted">{message}</p>
      <ButtonLink href={href} variant="secondary">
        {linkLabel}
      </ButtonLink>
    </div>
  )
}
