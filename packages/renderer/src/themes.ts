// Theme definitions. Display names live in i18n under `theme.<id>`.
export interface Theme {
  id: string
  colors: {
    background: string // rule body background
    scaleBlack: string // black (increasing) scales
    scaleRed: string // red (decreasing) scales
    gap: string // grooves
    cursor: string // cursor
    text: string // text
  }
  // Application chrome palette: the surrounding UI (page, panels, controls)
  // follows the selected theme too. The framework-free renderer ignores this;
  // the simulator maps it to CSS custom properties (see `utils/theme.ts`).
  ui: {
    page: string // page background
    surface: string // panels, menus and control backgrounds
    surfaceMuted: string // hover / inactive control backgrounds
    border: string // control and panel borders
    text: string // primary UI text
    textMuted: string // secondary UI text
    accent: string // active / primary accent
    accentText: string // text on the accent
  }
}

// Preset themes
export const THEMES: Record<string, Theme> = {
  plastic: {
    id: 'plastic',
    colors: {
      background: '#ffffff',
      scaleBlack: '#1f2937',
      scaleRed: '#dc2626',
      gap: '#111827',
      cursor: '#dc2626',
      text: '#1f2937',
    },
    ui: {
      page: '#f9fafb',
      surface: '#ffffff',
      surfaceMuted: '#f3f4f6',
      border: '#d1d5db',
      text: '#111827',
      textMuted: '#6b7280',
      accent: '#2563eb',
      accentText: '#ffffff',
    },
  },
  bamboo: {
    id: 'bamboo',
    colors: {
      background: '#fdf6ec',
      scaleBlack: '#4a2511',
      scaleRed: '#b91c1c',
      gap: '#78350f',
      cursor: '#dc2626',
      text: '#4a2511',
    },
    ui: {
      page: '#f5ece0',
      surface: '#fdf6ec',
      surfaceMuted: '#f0e4d3',
      border: '#d6c3a5',
      text: '#4a2511',
      textMuted: '#8a6a4a',
      accent: '#b45309',
      accentText: '#ffffff',
    },
  },
  contrast: {
    id: 'contrast',
    colors: {
      background: '#000000',
      scaleBlack: '#ffffff',
      scaleRed: '#ff0000',
      gap: '#9ca3af',
      cursor: '#00ff00',
      text: '#ffffff',
    },
    ui: {
      page: '#000000',
      surface: '#111111',
      surfaceMuted: '#1f1f1f',
      border: '#6b7280',
      text: '#ffffff',
      textMuted: '#d1d5db',
      accent: '#00ff00',
      accentText: '#000000',
    },
  },
  aluminum: {
    id: 'aluminum',
    colors: {
      background: '#e5e7eb',
      scaleBlack: '#111827',
      scaleRed: '#991b1b',
      gap: '#374151',
      cursor: '#dc2626',
      text: '#111827',
    },
    ui: {
      page: '#f3f4f6',
      surface: '#e5e7eb',
      surfaceMuted: '#d1d5db',
      border: '#9ca3af',
      text: '#111827',
      textMuted: '#4b5563',
      accent: '#374151',
      accentText: '#ffffff',
    },
  },
  ivory: {
    id: 'ivory',
    colors: {
      background: '#fffbf0',
      scaleBlack: '#292524',
      scaleRed: '#b91c1c',
      gap: '#57534e',
      cursor: '#ef4444',
      text: '#292524',
    },
    ui: {
      page: '#f7f1e3',
      surface: '#fffbf0',
      surfaceMuted: '#f0e9d8',
      border: '#d8cfb8',
      text: '#292524',
      textMuted: '#6b6259',
      accent: '#9a3412',
      accentText: '#ffffff',
    },
  },
  blueprint: {
    id: 'blueprint',
    colors: {
      background: '#1e3a8a',
      scaleBlack: '#dbeafe',
      scaleRed: '#fbbf24',
      gap: '#93c5fd',
      cursor: '#fbbf24',
      text: '#dbeafe',
    },
    ui: {
      page: '#10204d',
      surface: '#1e3a8a',
      surfaceMuted: '#1b3578',
      border: '#3b5bb5',
      text: '#dbeafe',
      textMuted: '#93c5fd',
      accent: '#fbbf24',
      accentText: '#1e3a8a',
    },
  },
}

export const DEFAULT_THEME = 'bamboo'
