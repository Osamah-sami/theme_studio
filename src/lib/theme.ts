/**
 * Advanced Theme Generator - Shadcn Style
 * Generates a complete color palette from a single base color
 */

export interface ThemeColors {
  // Base colors (50-950 scale)
  primary: Record<number, string>
  accent: Record<number, string>
  destructive: Record<number, string>
  // Semantic colors
  background: string
  foreground: string
  card: string
  cardForeground: string
  popover: string
  popoverForeground: string
  primaryForeground: string
  secondary: string
  secondaryForeground: string
  muted: string
  mutedForeground: string
  accentForeground: string
  destructiveForeground: string
  border: string
  input: string
  ring: string
  // Header specific
  headerBg: string
  headerBorder: string
  // State colors
  success: string
  warning: string
  error: string
  info: string
}

// Color conversion utilities
function hexToHsl(hex: string): [number, number, number] {
  hex = hex.replace('#', '')
  const r = parseInt(hex.slice(0, 2), 16) / 255
  const g = parseInt(hex.slice(2, 4), 16) / 255
  const b = parseInt(hex.slice(4, 6), 16) / 255

  const max = Math.max(r, g, b)
  const min = Math.min(r, g, b)
  let h = 0
  let s = 0
  const l = (max + min) / 2

  if (max !== min) {
    const d = max - min
    s = l > 0.5 ? d / (2 - max - min) : d / (max + min)
    switch (max) {
      case r:
        h = ((g - b) / d + (g < b ? 6 : 0)) / 6
        break
      case g:
        h = ((b - r) / d + 2) / 6
        break
      case b:
        h = ((r - g) / d + 4) / 6
        break
    }
  }

  return [Math.round(h * 360), Math.round(s * 100), Math.round(l * 100)]
}

function hslToHex(h: number, s: number, l: number): string {
  s /= 100
  l /= 100
  const a = s * Math.min(l, 1 - l)
  const f = (n: number) => {
    const k = (n + h / 30) % 12
    const color = l - a * Math.max(Math.min(k - 3, 9 - k, 1), -1)
    return Math.round(255 * color)
      .toString(16)
      .padStart(2, '0')
  }
  return `#${f(0)}${f(8)}${f(4)}`
}

// Generate a complete color scale from one color (Shadcn style)
function generateColorScale(baseHex: string): Record<number, string> {
  const [h, s, l] = hexToHsl(baseHex)

  // Shadcn uses specific lightness values for each step
  const lightnessMap: Record<number, number> = {
    50: 98,
    100: 95,
    200: 90,
    300: 83,
    400: 74,
    500: l, // Use original lightness
    600: Math.max(l - 9, 20),
    700: Math.max(l - 18, 12),
    800: Math.max(l - 26, 8),
    900: Math.max(l - 33, 5),
    950: Math.max(l - 40, 2),
  }

  const saturationMap: Record<number, number> = {
    50: Math.min(s * 0.3, 30),
    100: Math.min(s * 0.5, 40),
    200: Math.min(s * 0.7, 50),
    300: Math.min(s * 0.85, 60),
    400: Math.min(s * 0.95, 70),
    500: s,
    600: Math.min(s * 1.05, 80),
    700: Math.min(s * 1.1, 85),
    800: Math.min(s * 1.15, 90),
    900: Math.min(s * 1.2, 95),
    950: Math.min(s * 1.25, 100),
  }

  const scale: Record<number, string> = {}

  for (const [step, lightness] of Object.entries(lightnessMap)) {
    const stepNum = parseInt(step)
    scale[stepNum] = hslToHex(h, saturationMap[stepNum], lightness)
  }

  return scale
}

// Generate analogous colors (for accents)
function getAnalogous(hex: string, offset: number = 30): string {
  const [h, s, l] = hexToHsl(hex)
  return hslToHex((h + offset + 360) % 360, s, l)
}

export interface ThemeOptions {
  mode: 'light' | 'dark'
  baseColor: string
  accentColor?: string
}

export function generateTheme(options: ThemeOptions): ThemeColors {
  const { mode, baseColor, accentColor } = options
  const primary = generateColorScale(baseColor)
  const accent = accentColor ? generateColorScale(accentColor) : generateColorScale(getAnalogous(baseColor, 40))

  const isDark = mode === 'dark'

  // Dark mode colors based on Shadcn
  if (isDark) {
    return {
      primary,
      background: '#0a0a0f',
      foreground: '#fafafa',
      card: '#111118',
      cardForeground: '#fafafa',
      popover: '#111118',
      popoverForeground: '#fafafa',
      primaryForeground: '#ffffff',
      secondary: '#1e1e27',
      secondaryForeground: '#fafafa',
      muted: '#1a1a23',
      mutedForeground: '#a1a1aa',
      accent,
      accentForeground: '#ffffff',
      destructive: generateColorScale('#ef4444'),
      destructiveForeground: '#fafafa',
      border: '#27272f',
      input: '#27272f',
      ring: primary[500],
      headerBg: primary[950],
      headerBorder: primary[800],
      success: '#22c55e',
      warning: '#f59e0b',
      error: '#ef4444',
      info: '#0ea5e9',
    }
  }

  // Light mode colors
  return {
    primary,
    background: '#ffffff',
    foreground: '#0a0a0f',
    card: '#ffffff',
    cardForeground: '#0a0a0f',
    popover: '#ffffff',
    popoverForeground: '#0a0a0f',
    primaryForeground: '#ffffff',
    secondary: '#f4f4f5',
    secondaryForeground: '#18181b',
    muted: '#f4f4f5',
    mutedForeground: '#71717a',
    accent,
    accentForeground: '#18181b',
    destructive: generateColorScale('#ef4444'),
    destructiveForeground: '#fafafa',
    border: '#e4e4e7',
    input: '#e4e4e7',
    ring: primary[500],
    headerBg: primary[50],
    headerBorder: primary[200],
    success: '#16a34a',
    warning: '#d97706',
    error: '#dc2626',
    info: '#0284c7',
  }
}

// Apply theme to CSS variables
export function applyTheme(theme: ThemeColors, mode: 'light' | 'dark') {
  const root = document.documentElement

  // Primary scale
  root.style.setProperty('--primary-50', theme.primary[50])
  root.style.setProperty('--primary-100', theme.primary[100])
  root.style.setProperty('--primary-200', theme.primary[200])
  root.style.setProperty('--primary-300', theme.primary[300])
  root.style.setProperty('--primary-400', theme.primary[400])
  root.style.setProperty('--primary-500', theme.primary[500])
  root.style.setProperty('--primary-600', theme.primary[600])
  root.style.setProperty('--primary-700', theme.primary[700])
  root.style.setProperty('--primary-800', theme.primary[800])
  root.style.setProperty('--primary-900', theme.primary[900])
  root.style.setProperty('--primary-950', theme.primary[950])

  // Accent scale
  root.style.setProperty('--accent-500', theme.accent[500])
  root.style.setProperty('--accent-600', theme.accent[600])

  // Semantic colors
  root.style.setProperty('--background', theme.background)
  root.style.setProperty('--foreground', theme.foreground)
  root.style.setProperty('--card', theme.card)
  root.style.setProperty('--card-foreground', theme.cardForeground)
  root.style.setProperty('--popover', theme.popover)
  root.style.setProperty('--popover-foreground', theme.popoverForeground)
  root.style.setProperty('--primary', theme.primary[500])
  root.style.setProperty('--primary-hover', theme.primary[600])
  root.style.setProperty('--primary-active', theme.primary[700])
  root.style.setProperty('--primary-foreground', theme.primaryForeground)
  root.style.setProperty('--secondary', theme.secondary)
  root.style.setProperty('--secondary-foreground', theme.secondaryForeground)
  root.style.setProperty('--muted', theme.muted)
  root.style.setProperty('--muted-foreground', theme.mutedForeground)
  root.style.setProperty('--accent-color', theme.accent[500])
  root.style.setProperty('--accent-hover', theme.accent[600])
  root.style.setProperty('--accent-foreground', theme.accentForeground)
  root.style.setProperty('--destructive', theme.destructive[500])
  root.style.setProperty('--destructive-hover', theme.destructive[600])
  root.style.setProperty('--destructive-foreground', theme.destructiveForeground)
  root.style.setProperty('--border', theme.border)
  root.style.setProperty('--input', theme.input)
  root.style.setProperty('--ring', theme.ring)
  root.style.setProperty('--header-bg', theme.headerBg)
  root.style.setProperty('--header-border', theme.headerBorder)

  // State colors
  root.style.setProperty('--success', theme.success)
  root.style.setProperty('--warning', theme.warning)
  root.style.setProperty('--error', theme.error)
  root.style.setProperty('--info', theme.info)

  // Soft backgrounds
  root.style.setProperty('--primary-soft', hexToRgba(theme.primary[500], 0.12))
  root.style.setProperty('--primary-soft-hover', hexToRgba(theme.primary[500], 0.18))
  root.style.setProperty('--accent-soft', hexToRgba(theme.accent[500], 0.12))

  // Update data attribute for potential CSS selectors
  root.setAttribute('data-theme', mode)
}

function hexToRgba(hex: string, alpha: number): string {
  hex = hex.replace('#', '')
  const r = parseInt(hex.slice(0, 2), 16)
  const g = parseInt(hex.slice(2, 4), 16)
  const b = parseInt(hex.slice(4, 6), 16)
  return `rgba(${r}, ${g}, ${b}, ${alpha})`
}

// Preset colors
export const THEME_PRESETS = [
  { name: 'أزرق', color: '#2563eb', darkBg: '#0b1120' },
  { name: 'سماوي', color: '#0891b2', darkBg: '#0a1620' },
  { name: 'أخضر', color: '#059669', darkBg: '#0a1a14' },
  { name: 'بنفسجي', color: '#7c3aed', darkBg: '#120a20' },
  { name: 'وردي', color: '#db2777', darkBg: '#1a0a15' },
  { name: 'برتقالي', color: '#ea580c', darkBg: '#1a0f0a' },
  { name: 'أحمر', color: '#dc2626', darkBg: '#1a0a0a' },
  { name: 'ذهبي', color: '#ca8a04', darkBg: '#14120a' },
]

// Default theme
export const DEFAULT_THEME: ThemeOptions = {
  mode: 'dark',
  baseColor: '#2563eb',
}

// Store theme preference
export function saveTheme(options: ThemeOptions) {
  localStorage.setItem('taskflow-theme', JSON.stringify(options))
}

export function loadTheme(): ThemeOptions {
  try {
    const saved = localStorage.getItem('taskflow-theme')
    if (saved) {
      return JSON.parse(saved)
    }
  } catch {
    // ignore
  }
  return DEFAULT_THEME
}
