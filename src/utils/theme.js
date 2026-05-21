const THEME_VARS = [
  '--bg',
  '--bg-card',
  '--bg-elevated',
  '--border',
  '--border-glow',
  '--text-primary',
  '--text-secondary',
  '--text-muted',
  '--accent',
  '--accent-soft',
  '--accent-glow',
  '--amber',
  '--amber-soft',
  '--good',
  '--good-soft',
  '--tab-bar-bg',
  '--ambient-glow',
  '--btn-text',
  '--btn-shadow',
  '--btn-shadow-hover',
  '--btn-shadow-active',
  '--btn-highlight',
  '--ripple',
  '--glass-bg',
  '--glass-border',
  '--glass-shadow',
]

export const DARK_THEME = {
  '--bg': '#0a0a0f',
  '--bg-card': '#111118',
  '--bg-elevated': '#1a1a24',
  '--border': 'rgba(255, 255, 255, 0.06)',
  '--border-glow': 'rgba(255, 100, 60, 0.3)',
  '--text-primary': '#f0f0f5',
  '--text-secondary': 'rgba(240, 240, 245, 0.45)',
  '--text-muted': 'rgba(240, 240, 245, 0.25)',
  '--accent': '#ff6040',
  '--accent-soft': 'rgba(255, 96, 64, 0.12)',
  '--accent-glow': 'rgba(255, 96, 64, 0.25)',
  '--amber': '#ffb347',
  '--amber-soft': 'rgba(255, 179, 71, 0.1)',
  '--good': '#5ddf8a',
  '--good-soft': 'rgba(93, 223, 138, 0.1)',
  '--tab-bar-bg': 'rgba(10, 10, 15, 0.95)',
  '--ambient-glow': 'rgba(255, 96, 64, 0.08)',
  '--btn-text': '#ffffff',
  '--btn-shadow': 'none',
  '--btn-shadow-hover': 'none',
  '--btn-shadow-active': 'none',
  '--btn-highlight': 'rgba(255, 255, 255, 0.15)',
  '--ripple': 'rgba(255, 255, 255, 0.15)',
  '--glass-bg': 'var(--bg-card)',
  '--glass-border': 'var(--border)',
  '--glass-shadow': '0 1px 2px rgba(0, 0, 0, 0.12)',
}

export const LIGHT_THEME = {
  '--bg': '#f4f4f8',
  '--bg-card': '#ffffff',
  '--bg-elevated': '#ebebf2',
  '--border': 'rgba(0, 0, 0, 0.08)',
  '--border-glow': 'rgba(255, 96, 64, 0.2)',
  '--text-primary': '#1a1a22',
  '--text-secondary': 'rgba(26, 26, 34, 0.55)',
  '--text-muted': 'rgba(26, 26, 34, 0.35)',
  '--accent': '#ff6040',
  '--accent-soft': 'rgba(255, 96, 64, 0.1)',
  '--accent-glow': 'rgba(255, 96, 64, 0.2)',
  '--amber': '#e69500',
  '--amber-soft': 'rgba(230, 149, 0, 0.12)',
  '--good': '#2db86a',
  '--good-soft': 'rgba(45, 184, 106, 0.12)',
  '--tab-bar-bg': 'rgba(255, 255, 255, 0.92)',
  '--ambient-glow': 'rgba(255, 96, 64, 0.06)',
  '--btn-text': '#ffffff',
  '--btn-shadow': 'none',
  '--btn-shadow-hover': 'none',
  '--btn-shadow-active': 'none',
  '--btn-highlight': 'rgba(255, 255, 255, 0.25)',
  '--ripple': 'rgba(255, 255, 255, 0.2)',
  '--glass-bg': 'var(--bg-card)',
  '--glass-border': 'var(--border)',
  '--glass-shadow': '0 1px 2px rgba(0, 0, 0, 0.04)',
}

function getTelegramWebApp() {
  return window.Telegram?.WebApp ?? null
}

export function isTelegramEnv() {
  const tg = getTelegramWebApp()
  return Boolean(tg?.initData)
}

export function getColorScheme() {
  const tg = getTelegramWebApp()
  if (tg?.colorScheme) return tg.colorScheme

  return window.matchMedia('(prefers-color-scheme: dark)').matches ? 'dark' : 'light'
}

export function hexColor(value) {
  if (!value) return null
  const s = String(value).trim()
  if (s.startsWith('#')) return s
  if (/^[0-9a-fA-F]{6}$/.test(s)) return `#${s}`
  return s
}

function withAlpha(hex, alpha) {
  const color = hexColor(hex)
  if (!color || !color.startsWith('#') || color.length < 7) return null
  const r = parseInt(color.slice(1, 3), 16)
  const g = parseInt(color.slice(3, 5), 16)
  const b = parseInt(color.slice(5, 7), 16)
  return `rgba(${r}, ${g}, ${b}, ${alpha})`
}

export function mapTelegramThemeParams(params, scheme) {
  if (!params) return null

  const bg = hexColor(params.bg_color)
  const secondary = hexColor(params.secondary_bg_color)
  const section = hexColor(params.section_bg_color)
  const text = hexColor(params.text_color)
  const hint = hexColor(params.hint_color)
  const subtitle = hexColor(params.subtitle_text_color)
  const button = hexColor(params.button_color)
  const link = hexColor(params.link_color)
  const accent = button || link || '#ff6040'
  const isDark = scheme === 'dark'

  const mapped = {
    ...(scheme === 'dark' ? DARK_THEME : LIGHT_THEME),
  }

  if (bg) {
    mapped['--bg'] = bg
    mapped['--tab-bar-bg'] = withAlpha(secondary || bg, 0.95) ?? mapped['--tab-bar-bg']
  }
  if (section || secondary) {
    mapped['--bg-card'] = section || secondary
    mapped['--bg-elevated'] = secondary || section
  }
  if (text) mapped['--text-primary'] = text
  if (subtitle) mapped['--text-secondary'] = subtitle
  if (hint) mapped['--text-muted'] = hint
  if (accent) {
    mapped['--accent'] = accent
    mapped['--accent-soft'] = withAlpha(accent, 0.12) ?? mapped['--accent-soft']
    mapped['--accent-glow'] = withAlpha(accent, isDark ? 0.25 : 0.2) ?? mapped['--accent-glow']
    mapped['--ambient-glow'] = withAlpha(accent, isDark ? 0.08 : 0.06) ?? mapped['--ambient-glow']
    mapped['--border-glow'] = withAlpha(accent, isDark ? 0.3 : 0.2) ?? mapped['--border-glow']
  }

  mapped['--border'] = isDark
    ? 'rgba(255, 255, 255, 0.06)'
    : 'rgba(0, 0, 0, 0.08)'

  return mapped
}

export function applyTheme(scheme) {
  const root = document.documentElement
  const resolved = scheme === 'light' ? 'light' : 'dark'
  const tg = getTelegramWebApp()
  const fallback = resolved === 'light' ? LIGHT_THEME : DARK_THEME

  root.setAttribute('data-theme', resolved)
  root.style.colorScheme = resolved

  const vars = isTelegramEnv() && tg?.themeParams
    ? mapTelegramThemeParams(tg.themeParams, resolved) ?? fallback
    : fallback

  for (const key of THEME_VARS) {
    root.style.setProperty(key, vars[key] ?? fallback[key])
  }

  if (tg?.setBackgroundColor && vars['--bg']) {
    try {
      tg.setBackgroundColor(vars['--bg'])
    } catch {}
  }
  if (tg?.setHeaderColor && vars['--bg-elevated']) {
    try {
      tg.setHeaderColor(vars['--bg-elevated'])
    } catch {}
  }
}

export function initTheme() {
  applyTheme(getColorScheme())
}

export function subscribeTheme(onChange) {
  const tg = getTelegramWebApp()
  const handler = () => onChange(getColorScheme())

  if (tg?.onEvent) {
    tg.onEvent('themeChanged', handler)
  }

  const mq = window.matchMedia('(prefers-color-scheme: dark)')
  const onMedia = () => {
    if (!isTelegramEnv()) handler()
  }
  mq.addEventListener('change', onMedia)

  return () => {
    if (tg?.offEvent) {
      tg.offEvent('themeChanged', handler)
    }
    mq.removeEventListener('change', onMedia)
  }
}
