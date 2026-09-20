// @vitest-environment jsdom
import { describe, it, expect } from 'vitest'
import { THEMES, DEFAULT_THEME } from '@slide-rule/renderer'
import { applyTheme, themeCssVars, THEME_CSS_VARS } from './theme'

describe('theme CSS variables', () => {
  it('maps every UI token of a theme', () => {
    const vars = themeCssVars(THEMES[DEFAULT_THEME])
    expect(Object.keys(vars).sort()).toEqual(Object.values(THEME_CSS_VARS).sort())
    for (const value of Object.values(vars)) {
      expect(value).toMatch(/^#[0-9a-f]{6}$/i)
    }
  })

  it('gives every preset theme a complete UI palette', () => {
    const keys = Object.keys(THEMES[DEFAULT_THEME].ui).sort()
    for (const theme of Object.values(THEMES)) {
      expect(Object.keys(theme.ui).sort()).toEqual(keys)
      for (const value of Object.values(theme.ui)) expect(value).not.toBe('')
    }
  })

  it('writes the variables and the theme id onto the element', () => {
    const el = document.createElement('div')
    applyTheme(THEMES.blueprint, el)
    expect(el.dataset.theme).toBe('blueprint')
    expect(el.style.getPropertyValue('--ui-accent')).toBe(THEMES.blueprint.ui.accent)
    expect(el.style.getPropertyValue('--ui-page')).toBe(THEMES.blueprint.ui.page)
  })
})
