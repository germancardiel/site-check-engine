export const MARKDOWN_MIME = 'text/markdown;charset=utf-8'

/** Downloads `content` as a file in the browser (Blob + temporary link). Client-only. */
export function downloadTextFile(content: string, fileName: string, type: string = MARKDOWN_MIME): void {
  const blob = new Blob([content], { type })
  const link = document.createElement('a')
  link.href = URL.createObjectURL(blob)
  link.download = fileName
  link.click()
  URL.revokeObjectURL(link.href)
}
