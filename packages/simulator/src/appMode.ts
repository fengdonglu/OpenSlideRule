// The two top-level screens (simulator and designer) share one application bar.
// Keeping the mode type and the bar's export-item shape here avoids a circular
// import between `App.vue` and `DesignerView.vue` and keeps the bar's contract
// in a plain module.
export type AppMode = 'simulator' | 'designer'

// Shown as the octocat link at the right end of the application bar.
export const REPO_URL = 'https://github.com/fengdonglu/OpenSlideRule'

export interface AppBarExportItem {
  key: string
  label: string
  testId?: string
  disabled?: boolean
  onClick: () => void
}
