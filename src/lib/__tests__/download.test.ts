import { afterEach, describe, expect, it, vi } from 'vitest'
import { downloadTextFile, MARKDOWN_MIME } from '../download'

afterEach(() => {
  vi.unstubAllGlobals()
  vi.restoreAllMocks()
})

describe('downloadTextFile', () => {
  it('crea un Blob, pulsa un enlace temporal con el nombre dado y libera la URL', async () => {
    const link = { href: '', download: '', click: vi.fn() }
    vi.stubGlobal('document', { createElement: vi.fn(() => link) })
    const createObjectURL = vi.spyOn(URL, 'createObjectURL').mockReturnValue('blob:fake')
    const revokeObjectURL = vi.spyOn(URL, 'revokeObjectURL').mockImplementation(() => {})

    downloadTextFile('# Hola', 'archivo.md')

    const blob = createObjectURL.mock.calls[0][0] as Blob
    expect(blob.type).toBe(MARKDOWN_MIME)
    expect(await blob.text()).toBe('# Hola')
    expect(link.download).toBe('archivo.md')
    expect(link.href).toBe('blob:fake')
    expect(link.click).toHaveBeenCalledOnce()
    expect(revokeObjectURL).toHaveBeenCalledWith('blob:fake')
  })
})
