// i18n bootstrap.
import { createI18n } from 'vue-i18n'
import zhCN from './locales/zh-CN'
import enUS from './locales/en-US'

export const SUPPORTED_LOCALES = ['zh-CN', 'en-US'] as const
export type AppLocale = (typeof SUPPORTED_LOCALES)[number]

export const DEFAULT_LOCALE: AppLocale = 'zh-CN'
const STORAGE_KEY = 'sliderule-1002:locale'

function isSupported(value: string | null | undefined): value is AppLocale {
  return !!value && (SUPPORTED_LOCALES as readonly string[]).includes(value)
}

// Simplified Chinese is the only locale that maps to the Chinese UI; every
// other environment falls back to English.
function isSimplifiedChinese(tag: string): boolean {
  const t = tag.toLowerCase()
  if (!t.startsWith('zh')) return false
  return (
    t.includes('hans') ||
    t === 'zh' ||
    t === 'zh-cn' ||
    t === 'zh-sg' ||
    t === 'zh-my' ||
    t === 'zh-chs'
  )
}

// Use the saved choice if any, otherwise follow the environment language.
function detectLocale(): AppLocale {
  try {
    const saved = localStorage.getItem(STORAGE_KEY)
    if (isSupported(saved)) return saved
  } catch {
    // localStorage is unavailable in private mode
  }
  const tags = navigator.languages?.length ? navigator.languages : [navigator.language]
  if (tags.some((tag) => tag && isSimplifiedChinese(tag))) return 'zh-CN'
  return 'en-US'
}

const initialLocale = detectLocale()

export const i18n = createI18n({
  legacy: false,
  locale: initialLocale,
  fallbackLocale: DEFAULT_LOCALE,
  messages: {
    'zh-CN': zhCN,
    'en-US': enUS,
  },
})

// Switch locale: update i18n, <html lang> and the document title, then persist.
export function applyLocale(locale: AppLocale): void {
  i18n.global.locale.value = locale
  if (typeof document !== 'undefined') {
    document.documentElement.lang = locale
    document.title = i18n.global.t('app.title')
  }
  try {
    localStorage.setItem(STORAGE_KEY, locale)
  } catch {
    // ignore
  }
}

// Apply the initial locale at startup (syncs <html lang> and the document title).
export function applyInitialLocale(): void {
  applyLocale(initialLocale)
}
