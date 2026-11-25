/** A colour as a 6-digit hex plus an optional opacity (0–1) over whatever lies underneath. */
export type Color = { hex: string; alpha?: number }

export type Rgb = { r: number; g: number; b: number }

const HEX = /^#([0-9a-f]{6})$/i

/** Parses `#RRGGBB` into 0–255 channels. Throws on anything else. */
export function parseHex(hex: string): Rgb {
  const match = HEX.exec(hex)
  if (!match) throw new Error(`Color no válido: ${hex}`)
  const value = Number.parseInt(match[1], 16)
  return { r: (value >> 16) & 255, g: (value >> 8) & 255, b: value & 255 }
}

/** Paints `color` (with its opacity) over an opaque `backdrop`, as the browser does. */
export function composite(color: Color, backdrop: Rgb): Rgb {
  const alpha = color.alpha ?? 1
  if (alpha < 0 || alpha > 1) throw new Error(`Opacidad fuera de rango: ${alpha}`)
  const top = parseHex(color.hex)
  const mix = (front: number, back: number) => front * alpha + back * (1 - alpha)
  return { r: mix(top.r, backdrop.r), g: mix(top.g, backdrop.g), b: mix(top.b, backdrop.b) }
}

function channel(value: number): number {
  const srgb = value / 255
  return srgb <= 0.04045 ? srgb / 12.92 : ((srgb + 0.055) / 1.055) ** 2.4
}

/** WCAG 2.x relative luminance (0 = black, 1 = white). */
export function relativeLuminance({ r, g, b }: Rgb): number {
  return 0.2126 * channel(r) + 0.7152 * channel(g) + 0.0722 * channel(b)
}

/**
 * WCAG contrast ratio (1–21) of `foreground` over `background`. A translucent background is
 * first painted over `base` (the page ground); a translucent foreground over the result.
 */
export function contrastRatio(foreground: Color, background: Color, base: Color = background): number {
  const ground = parseHex(base.hex)
  const back = composite(background, ground)
  const front = composite(foreground, back)
  const [light, dark] = [relativeLuminance(front), relativeLuminance(back)].sort((a, b) => b - a)
  return (light + 0.05) / (dark + 0.05)
}
