import { readFileSync } from 'node:fs'
import { isValidElement, type ReactElement } from 'react'
import { renderToStaticMarkup } from 'react-dom/server'
import { afterEach, describe, expect, it, vi } from 'vitest'
import { makeCheck, validPlan } from '@/lib/ai/__tests__/fixtures'
import { planToMarkdown } from '@/lib/ai/markdown'
import type { StoredReport } from '@/lib/ai/reports'
import type { ActionPlan } from '@/lib/ai/schemas'
import { DownloadPlanButton } from '../download-plan-button'
import { PlanSection } from '../plan-section'

// The real form imports the server actions (Supabase, AI Gateway); it is not under test here.
vi.mock('../generate-report-form', () => ({ GenerateReportForm: () => null }))

const checks = [makeCheck('title', 'fail', { title: 'Title con longitud adecuada' })]
const okReport: StoredReport<ActionPlan> = { status: 'ok', data: validPlan, createdAt: '2026-11-25T10:30:00.000Z' }

function renderSection(report: StoredReport<ActionPlan>) {
  return renderToStaticMarkup(
    <PlanSection
      siteId="site"
      auditId="audit"
      report={report}
      checks={checks}
      siteUrl="https://www.ejemplo.com/"
      score={62}
      remaining={5}
      loadError={false}
    />,
  )
}

afterEach(() => {
  vi.unstubAllGlobals()
  vi.restoreAllMocks()
})

describe('PlanSection: botón "Descargar .md" (CA3)', () => {
  it('aparece con un plan válido, como botón secundario con icono oculto a lectores de pantalla', () => {
    const html = renderSection(okReport)
    expect(html).toContain('Descargar .md')
    expect(html).toMatch(/<button type="button" class="[^"]*border-line-strong[^"]*"><svg aria-hidden="true"/)
  })

  it.each([{ status: 'none' }, { status: 'invalid' }] as const)('no aparece con status $status', (report) => {
    expect(renderSection(report)).not.toContain('Descargar .md')
  })
})

describe('DownloadPlanButton (CA4)', () => {
  it('descarga plan-de-accion-<dominio>-<fecha>.md como text/markdown con el contenido de planToMarkdown', async () => {
    const link = { href: '', download: '', click: vi.fn() }
    vi.stubGlobal('document', { createElement: vi.fn(() => link) })
    const createObjectURL = vi.spyOn(URL, 'createObjectURL').mockReturnValue('blob:plan')
    const revokeObjectURL = vi.spyOn(URL, 'revokeObjectURL').mockImplementation(() => {})
    const meta = {
      siteUrl: 'https://www.ejemplo.com/',
      createdAt: '2026-11-25T10:30:00.000Z',
      score: 62,
      checks: [{ id: 'title', title: 'Title con longitud adecuada' }],
    }

    const element = DownloadPlanButton({ plan: validPlan, ...meta })
    expect(isValidElement(element)).toBe(true)
    const button = element as ReactElement<{ onClick: () => void }>
    button.props.onClick()

    expect(link.download).toBe('plan-de-accion-ejemplo.com-2026-11-25.md')
    expect(link.click).toHaveBeenCalledOnce()
    const blob = createObjectURL.mock.calls[0][0] as Blob
    expect(blob.type).toBe('text/markdown;charset=utf-8')
    expect(await blob.text()).toBe(planToMarkdown(validPlan, meta))
    expect(revokeObjectURL).toHaveBeenCalledWith('blob:plan')
  })
})

describe('Server/Client boundary (CA5)', () => {
  const source = (file: string) => readFileSync(new URL(`../${file}`, import.meta.url), 'utf8')

  it('plan-section.tsx sigue siendo Server Component y solo el botón es cliente', () => {
    expect(source('plan-section.tsx')).not.toMatch(/['"]use client['"]/)
    expect(source('download-plan-button.tsx').startsWith("'use client'")).toBe(true)
  })
})
