import type { Theme } from '@slide-rule/renderer'

// CSS custom properties the application chrome reads. The stylesheets use these
// names, so keeping the mapping in one place keeps `applyTheme` and the CSS in
// sync. The rule face itself is themed by the renderer, not by these.
export const THEME_CSS_VARS = {
  page: '--ui-page',
  surface: '--ui-surface',
  surfaceMuted: '--ui-surface-muted',
  border: '--ui-border',
  text: '--ui-text',
  textMuted: '--ui-text-muted',
  accent: '--ui-accent',
  accentText: '--ui-accent-text',
} as const

// Map a theme to the CSS custom properties above.
export function themeCssVars(theme: Theme): Record<string, string> {
  const vars: Record<string, string> = {}
  for (const [key, cssVar] of Object.entries(THEME_CSS_VARS)) {
    vars[cssVar] = theme.ui[key as keyof Theme['ui']]
  }
  return vars
}

// Apply a theme's UI palette to an element (the document root by default) and
// record the theme id for CSS that wants to branch on it.
export function applyTheme(theme: Theme, el: HTMLElement = document.documentElement): void {
  for (const [cssVar, value] of Object.entries(themeCssVars(theme))) {
    el.style.setProperty(cssVar, value)
  }
  el.dataset.theme = theme.id
}
