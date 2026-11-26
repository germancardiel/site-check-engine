'use client'

import { useEffect, useRef, useState } from 'react'
import { buttonClass } from '@/components/ui/button-styles'
import { SubmitButton } from '@/components/ui/submit-button'

const QUIET_BUTTON = buttonClass('quiet')
const SECONDARY_BUTTON = buttonClass('secondary')

type DeleteSiteFormProps = {
  siteId: string
  siteName: string
  /**
   * Shared `deleteSite` action of the list: its result ("Sitio borrado." or the error) is announced
   * by the list, because this row disappears once the site is deleted (D-UX-10).
   */
  formAction: (formData: FormData) => void
}

/** Two-step delete: the first click asks for confirmation, the second one deletes. */
export function DeleteSiteForm({ siteId, siteName, formAction }: DeleteSiteFormProps) {
  const [confirming, setConfirming] = useState(false)
  const cancelRef = useRef<HTMLButtonElement>(null)
  const triggerRef = useRef<HTMLButtonElement>(null)
  const wasConfirming = useRef(false)
  const promptId = `delete-${siteId}-prompt`

  useEffect(() => {
    if (confirming) cancelRef.current?.focus()
    else if (wasConfirming.current) triggerRef.current?.focus()
    wasConfirming.current = confirming
  }, [confirming])

  if (!confirming) {
    return (
      <button ref={triggerRef} type="button" onClick={() => setConfirming(true)} className={QUIET_BUTTON}>
        Borrar
      </button>
    )
  }

  return (
    <form
      action={formAction}
      role="group"
      aria-labelledby={promptId}
      className="flex flex-col gap-3 rounded-md border border-fail bg-panel p-3"
    >
      <p id={promptId} className="text-sm text-ink">
        ¿Borrar <span className="font-medium break-all">{siteName}</span>? También se borrarán sus
        auditorías.
      </p>
      <input type="hidden" name="id" value={siteId} />
      <div className="flex flex-wrap gap-2">
        <SubmitButton pendingLabel="Borrando…" variant="danger">
          Sí, borrar
        </SubmitButton>
        <button
          ref={cancelRef}
          type="button"
          onClick={() => setConfirming(false)}
          className={SECONDARY_BUTTON}
        >
          Cancelar
        </button>
      </div>
    </form>
  )
}
