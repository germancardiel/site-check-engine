'use client'

import { DownloadIcon } from '@/components/audits/category-icons'
import { buttonClass } from '@/components/ui/button-styles'
import { planFileName, planToMarkdown, type PlanMarkdownMeta } from '@/lib/ai/markdown'
import type { ActionPlan } from '@/lib/ai/schemas'
import { downloadTextFile } from '@/lib/download'

type DownloadPlanButtonProps = PlanMarkdownMeta & { plan: ActionPlan }

/** "Descargar plan (Markdown)" for the stored action plan; the file is built and downloaded in the browser. */
export function DownloadPlanButton({ plan, ...meta }: DownloadPlanButtonProps) {
  return (
    <button
      type="button"
      onClick={() => downloadTextFile(planToMarkdown(plan, meta), planFileName(meta.siteUrl, meta.createdAt))}
      className={buttonClass('secondary')}
    >
      <DownloadIcon />
      Descargar plan (Markdown)
    </button>
  )
}
