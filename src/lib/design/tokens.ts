import type { Color } from './contrast'

export type ThemeName = 'dark' | 'light'

export const TOKEN_NAMES = [
  'ground',
  'panel',
  'ink',
  'ink-muted',
  'line',
  'line-strong',
  'accent',
  'accent-hover',
  'on-accent',
  'accent-text',
  'focus',
  'pass',
  'warn',
  'fail',
  'glow-secondary',
] as const

export type TokenName = (typeof TOKEN_NAMES)[number]

const CREAM = '#F5F2EB'
const INK = '#151519'
const TURQUOISE = '#14B8C4'
/** Lighter turquoise for the primary button hover: dark text on it keeps more than 4.5:1. */
const TURQUOISE_HOVER = '#38D0DC'
/** Darker turquoise for text and focus ring on light surfaces (≥ 5.6:1 on ground/panel). */
const TURQUOISE_DARK = '#0A6670'
/** Secondary violet blur used only by the decorative `AmbientGlow` backdrop (CA11). */
const VIOLET = '#6B4FD8'

/**
 * Colour tokens of both themes. `globals.css` declares each one as `--color-<name>` with the
 * value `cssColor()` returns (a test keeps both in sync). Dark is the default theme.
 */
export const THEMES: Record<ThemeName, Record<TokenName, Color>> = {
  dark: {
    ground: { hex: INK },
    panel: { hex: '#1D1D22' },
    ink: { hex: CREAM },
    'ink-muted': { hex: '#B4B2AD' },
    line: { hex: CREAM, alpha: 0.18 },
    'line-strong': { hex: CREAM, alpha: 0.4 },
    accent: { hex: TURQUOISE },
    'accent-hover': { hex: TURQUOISE_HOVER },
    'on-accent': { hex: INK },
    'accent-text': { hex: TURQUOISE },
    focus: { hex: TURQUOISE },
    pass: { hex: '#3FB27F' },
    warn: { hex: '#F2C14E' },
    fail: { hex: '#F06064' },
    'glow-secondary': { hex: VIOLET },
  },
  light: {
    ground: { hex: CREAM },
    panel: { hex: '#FAF8F4' },
    ink: { hex: INK },
    'ink-muted': { hex: '#5C5A55' },
    line: { hex: INK, alpha: 0.14 },
    'line-strong': { hex: INK, alpha: 0.5 },
    accent: { hex: TURQUOISE },
    'accent-hover': { hex: TURQUOISE_HOVER },
    'on-accent': { hex: INK },
    'accent-text': { hex: TURQUOISE_DARK },
    focus: { hex: TURQUOISE_DARK },
    pass: { hex: '#1E7A4C' },
    warn: { hex: '#8A6500' },
    fail: { hex: '#C2342F' },
    'glow-secondary': { hex: VIOLET },
  },
}

/** CSS value of a token: the hex when opaque, `rgb(r g b / NN%)` when translucent. */
export function cssColor({ hex, alpha }: Color): string {
  if (alpha === undefined || alpha === 1) return hex
  const value = Number.parseInt(hex.slice(1), 16)
  const channels = [(value >> 16) & 255, (value >> 8) & 255, value & 255].join(' ')
  return `rgb(${channels} / ${Math.round(alpha * 100)}%)`
}

export type ContrastPair = { foreground: TokenName; background: TokenName; min: number; use: string }

const TEXT = 4.5
const GRAPHIC = 3

/**
 * Pairs actually used by the interface, interactive states included (hover, active, focus and
 * disabled with text), with the WCAG minimum each one needs (D-UX-04).
 */
export const CONTRAST_PAIRS: ContrastPair[] = [
  ...(['ground', 'panel'] as const).flatMap((background) => [
    { foreground: 'ink', background, min: TEXT, use: 'texto principal' },
    { foreground: 'ink-muted', background, min: TEXT, use: 'texto secundario' },
    { foreground: 'accent-text', background, min: TEXT, use: 'texto y enlaces de acento' },
    { foreground: 'line-strong', background, min: GRAPHIC, use: 'borde de inputs y botones secundarios' },
    { foreground: 'focus', background, min: GRAPHIC, use: 'anillo de foco' },
    { foreground: 'pass', background, min: GRAPHIC, use: 'icono pass' },
    { foreground: 'warn', background, min: GRAPHIC, use: 'icono warn' },
    { foreground: 'fail', background, min: GRAPHIC, use: 'icono fail' },
    { foreground: 'pass', background, min: TEXT, use: 'texto de estado pass y deltas positivos' },
    { foreground: 'warn', background, min: TEXT, use: 'texto de estado warn' },
    { foreground: 'fail', background, min: TEXT, use: 'texto de estado fail y deltas negativos' },
    { foreground: 'ink-muted', background, min: GRAPHIC, use: 'trazo del gráfico (IA) y medidores' },
  ] satisfies ContrastPair[]),
  { foreground: 'on-accent', background: 'accent', min: TEXT, use: 'botón primario (reposo, activo y deshabilitado) y selección' },
  { foreground: 'on-accent', background: 'accent-hover', min: TEXT, use: 'botón primario en hover' },
  { foreground: 'ink', background: 'panel', min: TEXT, use: 'hover de botones secundarios, peligro, desplegables e inputs' },
  { foreground: 'ink', background: 'ground', min: GRAPHIC, use: 'borde en hover de inputs y botones secundarios' },
]

/** Opacity of disabled buttons (`disabled:opacity-80` in `button-styles.ts`). */
export const DISABLED_OPACITY = 0.8

export type DisabledPair = { foreground: TokenName; background: TokenName | null; base: TokenName; use: string }

/**
 * Disabled buttons with text, faded by `DISABLED_OPACITY` over the surfaces they sit on
 * (`background: null` = transparent button). Each one needs 4.5:1 (D-UX-04).
 */
export const DISABLED_PAIRS: DisabledPair[] = (['ground', 'panel'] as const).flatMap((base) => [
  { foreground: 'on-accent', background: 'accent', base, use: 'botón primario deshabilitado' },
  { foreground: 'ink', background: null, base, use: 'botón secundario o de peligro deshabilitado' },
])
