<script setup lang="ts">
import { computed, nextTick, onBeforeUnmount, onMounted, ref, watch } from 'vue'
import { useI18n } from 'vue-i18n'
import { storeToRefs } from 'pinia'
import { useSlideRuleStore, IMPORTED_MODEL_ID } from './stores/slideRule'
import SlideRule from './components/SlideRule.vue'
import CursorReadings from './components/CursorReadings.vue'
import CircularRule from './components/CircularRule.vue'
import CircularReadings from './components/CircularReadings.vue'
import TutorialOverlay from './components/TutorialOverlay.vue'
import ModelInfoDialog from './components/ModelInfoDialog.vue'
import ImportRuleDialog from './components/ImportRuleDialog.vue'
import DesignerView from './designer/DesignerView.vue'
import AppBar from './components/AppBar.vue'
import AppIcon from './components/AppIcon.vue'
import { countScales } from '@slide-rule/core'
import { computeFaceLayout } from '@slide-rule/renderer'
import type { AppBarExportItem, AppMode } from './appMode'
import type { SlideRuleSide } from '@slide-rule/core'
import { exportToPNG, exportToSVG, exportDiscToSVG, exportToMarkdown } from './utils/export'
import { printSlideRule } from './utils/print'
import { applyTheme } from './utils/theme'
import type { ImportRuleResult } from './utils/importRule'

const { t, tm, locale } = useI18n()
const store = useSlideRuleStore()
const {
  currentSide,
  dualFace,
  operationHistory,
  zoom,
  currentModel,
  currentModelId,
  middleOffset,
  discOffset,
  currentTheme,
  isSingleFaced,
  cursors,
  visibleSides,
  keyboardNav,
} = storeToRefs(store)

// Readings panel sizing: each cursor gets a fixed-width card laid out to the
// right, so the panel (and the room it takes from the rule) grows with the
// cursor count. Card width/gap mirror the CSS custom properties below. There is
// no panel padding/border any more, so the width is exactly the cards and gaps.
const CURSOR_CARD_WIDTH = 220
const CURSOR_CARD_GAP = 12

const readingsPanelStyle = computed(() => {
  const n = cursors.value.length
  const cards = n > 0 ? n * CURSOR_CARD_WIDTH + (n - 1) * CURSOR_CARD_GAP : 0
  return {
    width: `${cards}px`,
    '--cursor-card-width': `${CURSOR_CARD_WIDTH}px`,
    '--cursor-card-gap': `${CURSOR_CARD_GAP}px`,
  }
})

// The rule lays itself out from the viewport width x zoom; the readings panel
// must use the very same pxPerMm so its rows line up with the scale rows. The
// rule viewport is SlideRule's root element (the only child of the wrapper).
const ruleWrapEl = ref<HTMLElement | null>(null)
const ruleViewportWidth = ref(0)
let ruleObserver: ResizeObserver | null = null

function updateRuleViewportWidth(): void {
  const viewport = ruleWrapEl.value?.firstElementChild as HTMLElement | null
  // While the designer hides <main>, clientWidth is 0; keep the last good width
  // so the readings panel does not collapse.
  const width = viewport?.clientWidth ?? 0
  if (width > 0) ruleViewportWidth.value = width
}

onMounted(() => {
  applyTheme(currentTheme.value)
  updateRuleViewportWidth()
  const viewport = ruleWrapEl.value?.firstElementChild
  if (viewport && typeof ResizeObserver !== 'undefined') {
    ruleObserver = new ResizeObserver(updateRuleViewportWidth)
    ruleObserver.observe(viewport)
  }
  window.addEventListener('resize', updateRuleViewportWidth)
  window.addEventListener('keydown', onKeydown)
})

// Re-apply the app-chrome palette whenever the theme changes.
watch(currentTheme, (theme) => applyTheme(theme))

onBeforeUnmount(() => {
  ruleObserver?.disconnect()
  window.removeEventListener('resize', updateRuleViewportWidth)
  window.removeEventListener('keydown', onKeydown)
})

// Arrow-key nudging (opt-in): Left/Right move the slide, Shift+Left/Right move
// the last cursor. Ignored while typing so it never steals a keystroke.
const SLIDE_STEP = 0.01
const CURSOR_STEP = 0.005

function isEditable(target: EventTarget | null): boolean {
  const el = target as HTMLElement | null
  if (el === null) return false
  return (
    el.tagName === 'INPUT' ||
    el.tagName === 'TEXTAREA' ||
    el.tagName === 'SELECT' ||
    el.isContentEditable
  )
}

function onKeydown(e: KeyboardEvent): void {
  if (!keyboardNav.value || designing.value) return
  if (e.key !== 'ArrowLeft' && e.key !== 'ArrowRight') return
  if (isEditable(e.target)) return
  const direction = e.key === 'ArrowRight' ? 1 : -1
  if (e.shiftKey) store.nudgeCursor(direction * CURSOR_STEP)
  else store.nudgeSlide(direction * SLIDE_STEP)
  e.preventDefault()
}

const faceLayout = computed(() =>
  computeFaceLayout(currentModel.value.physical, ruleViewportWidth.value * zoom.value),
)

const totalScales = computed(() => countScales(currentModel.value))

// Footer hints: rendered as items so the separators can use the theme accent.
// A single-faced model (the Type 57) adds one hint saying so.
const hintItems = computed(() => {
  // `tm` returns the shared message array; copy it before adding, or every
  // recompute would append the keyboard hint again.
  const items = [...(tm('app.hintItems') as string[])]
  if (keyboardNav.value) items.push(t('keyboard.hint'))
  return isSingleFaced.value ? [...items, t('app.singleFacedHint')] : items
})

const designing = ref(false)
// Re-measure once the simulator is visible again after the designer closes.
watch(designing, () => nextTick(updateRuleViewportWidth))
const tutorialRef = ref<InstanceType<typeof TutorialOverlay> | null>(null)

// The "?" button opens the model-information dialog; the tutorial stays
// reachable from a button inside it.
const showModelInfo = ref(false)

function openTutorialFromInfo() {
  showModelInfo.value = false
  tutorialRef.value?.open()
}

// The reset button clears the linear slide or the circular rotor; label it for
// the model in view so it matches what resetMotion resets.
const resetMotionLabel = computed(() =>
  store.isCircular ? t('circular.resetRotation') : t('slide.reset'),
)

function setSide(side: SlideRuleSide) {
  if (side === currentSide.value) return
  store.setSide(side)
  store.logOperation(t('operations.switchSide', { side: t(`side.${side}`) }))
}

function onModelChange(e: Event) {
  const id = (e.target as HTMLSelectElement).value
  if (id === currentModelId.value) return
  store.setModel(id)
  store.logOperation(t('operations.switchModel', { model: modelLabel({ id, available: true }) }))
}

function onSetDualFace(dual: boolean) {
  if (store.dualFace === dual) return
  store.setDualFace(dual)
  store.logOperation(t(dual ? 'operations.viewDual' : 'operations.viewSingle'))
}

function onResetMotion() {
  store.resetMotion()
  store.logOperation(t('operations.resetMotion'))
}

// Cursor add/remove and theme changes are logged from the store's state so the
// log is complete without every child component knowing about it.
watch(
  () => cursors.value.length,
  (length, previous) => {
    if (length > previous) store.logOperation(t('operations.addCursor'))
    else if (length < previous) store.logOperation(t('operations.removeCursor'))
  },
)

watch(currentTheme, (theme) => {
  store.logOperation(t('operations.switchTheme', { theme: t('theme.' + theme.id) }))
})

async function handleExportPNG() {
  await exportToPNG('slide-rule-container', 'sliderule-1002.png')
}

function handleExportSVG() {
  if (store.isCircular) {
    // The circular view renders a disc, not `.face` sections, so it is exported
    // through the renderer rather than scraped from the DOM.
    exportDiscToSVG('sliderule-circular.svg', {
      rule: currentModel.value,
      faces: visibleSides.value,
      theme: currentTheme.value,
      titleOf: (s) => t('scaleDesc.' + s.name),
    })
    return
  }
  const p = currentModel.value.physical
  exportToSVG('sliderule-1002.svg', {
    widthMm: p.faceWidthMm,
    heightMm: p.faceHeightMm,
    slideOffsetMm: middleOffset.value * (p.faceWidthMm - p.leftGutterMm - p.rightPanelMm),
  })
}

function handleExportMarkdown() {
  exportToMarkdown(operationHistory.value, {
    filename: 'sliderule-operations.md',
    locale: locale.value,
    title: t('exportMd.title'),
    exportedAt: t('exportMd.exportedAt'),
    stepsTitle: t('exportMd.steps'),
  })
}

async function handlePrint() {
  const p = currentModel.value.physical
  await printSlideRule({
    rule: currentModel.value,
    faces: visibleSides.value,
    theme: currentTheme.value,
    slideOffsetMm: middleOffset.value * (p.faceWidthMm - p.leftGutterMm - p.rightPanelMm),
    title:
      currentModelId.value === IMPORTED_MODEL_ID
        ? (store.importedRule?.name ?? t('model.imported'))
        : t('model.' + currentModel.value.id),
    titleOf: (s) => t('scaleDesc.' + s.name),
  })
}

// Application-bar exports for the simulator (the designer supplies its own).
const simulatorExports = computed<AppBarExportItem[]>(() => [
  { key: 'png', label: t('export.png'), onClick: handleExportPNG },
  { key: 'svg', label: t('export.svg'), onClick: handleExportSVG },
  { key: 'markdown', label: t('export.markdown'), onClick: handleExportMarkdown },
  { key: 'print', label: t('export.print'), onClick: handlePrint },
])

const helpAction = computed(() => ({
  title: t('modelInfo.open'),
  onClick: () => (showModelInfo.value = true),
}))

function onModeChange(mode: AppMode): void {
  designing.value = mode === 'designer'
}

// Import an external rule JSON: the toolbar button drives the hidden file
// input, and dropping a file on the simulator view loads it too. A failed
// import opens a dialog; a successful one makes the rule the active model.
const ruleFile = ref<HTMLInputElement | null>(null)
const showImportDialog = ref(false)
const importResult = ref<ImportRuleResult | null>(null)

function showImportResult(result: ImportRuleResult): void {
  if (result.kind === 'ok') {
    store.logOperation(
      t('operations.loadRule', {
        name: store.importedRule?.name ?? result.rule.name,
      }),
    )
    return
  }
  importResult.value = result
  showImportDialog.value = true
}

// A file read failure is reported through the same parse-error branch as
// malformed JSON, so the dialog always has a message to show.
function readErrorResult(error: unknown): ImportRuleResult {
  return { kind: 'parseError', message: error instanceof Error ? error.message : String(error) }
}

async function onRuleFile(event: Event): Promise<void> {
  const input = event.target as HTMLInputElement
  const file = input.files?.[0]
  if (!file) return
  try {
    showImportResult(store.loadRule(await file.text()))
  } catch (error) {
    showImportResult(readErrorResult(error))
  } finally {
    input.value = ''
  }
}

async function onDrop(event: DragEvent): Promise<void> {
  const file = event.dataTransfer?.files?.[0]
  if (!file) return
  try {
    showImportResult(store.loadRule(await file.text()))
  } catch (error) {
    showImportResult(readErrorResult(error))
  }
}

// Selector label: the imported rule by its own name, built-ins by i18n key.
function modelLabel(m: { id: string; available: boolean }): string {
  if (m.id === IMPORTED_MODEL_ID) return store.importedRule?.name ?? t('model.imported')
  return t('model.' + m.id) + (m.available ? '' : t('model.unavailable'))
}
</script>

<template>
  <DesignerView v-if="designing" @close="designing = false" />
  <main v-show="!designing" class="app" @dragover.prevent @drop.prevent="onDrop">
    <TutorialOverlay ref="tutorialRef" />
    <ModelInfoDialog
      :open="showModelInfo"
      :model="currentModel"
      @close="showModelInfo = false"
      @quick-start="openTutorialFromInfo"
    />
    <ImportRuleDialog
      :open="showImportDialog"
      :result="importResult"
      @close="showImportDialog = false"
    />

    <AppBar
      v-if="!designing"
      mode="simulator"
      :export-items="simulatorExports"
      :help="helpAction"
      @mode-change="onModeChange"
    >
      <!-- The model selector doubles as the page title -->
      <template #brand>
        <select
          class="model-select"
          data-test="model-select"
          :value="currentModelId"
          :title="t('model.label')"
          @change="onModelChange"
        >
          <option
            v-for="m in store.modelOptions"
            :key="m.id"
            :value="m.id"
            :disabled="!m.available"
          >
            {{ modelLabel(m) }}
          </option>
        </select>
        <span class="count">{{ t('count.scales', { n: totalScales }) }}</span>
      </template>

      <template #tools>
        <!-- Model controls -->
        <div class="group">
          <div class="segmented" :title="t('view.label')">
            <button
              :class="{ active: dualFace }"
              :disabled="isSingleFaced"
              @click="onSetDualFace(true)"
            >
              {{ t('view.dual') }}
            </button>
            <span class="segmented-icon" aria-hidden="true"><AppIcon name="stack" /></span>
            <button :class="{ active: !dualFace }" @click="onSetDualFace(false)">
              {{ t('view.single') }}
            </button>
          </div>
          <div class="segmented" :title="t('group.model')">
            <button
              :class="{ active: currentSide === 'front' }"
              :disabled="dualFace"
              @click="setSide('front')"
            >
              {{ t('side.front') }}
            </button>
            <span class="segmented-icon" aria-hidden="true"><AppIcon name="flip" /></span>
            <button
              :class="{ active: currentSide === 'back' }"
              :disabled="dualFace || isSingleFaced"
              @click="setSide('back')"
            >
              {{ t('side.back') }}
            </button>
          </div>

          <button
            :disabled="middleOffset === 0 && discOffset === 0"
            :title="resetMotionLabel"
            @click="onResetMotion()"
          >
            ↺ {{ resetMotionLabel }}
          </button>
        </div>

        <span class="divider" aria-hidden="true"></span>

        <!-- Simulator tools -->
        <div class="group">
          <button :title="t('import.label')" @click="ruleFile?.click()">
            <AppIcon name="import" />
          </button>
          <input
            ref="ruleFile"
            type="file"
            accept="application/json"
            data-test="import-file"
            hidden
            @change="onRuleFile"
          />

          <!-- Optional arrow-key nudging; off by default so it cannot clash
               with other shortcuts. -->
          <button
            class="keyboard-toggle"
            :class="{ active: keyboardNav }"
            :title="t('keyboard.hint')"
            :aria-pressed="keyboardNav"
            @click="store.setKeyboardNav(!keyboardNav)"
          >
            <AppIcon name="keyboard" />
          </button>
        </div>
      </template>
    </AppBar>

    <div class="main-content">
      <div id="slide-rule-container" ref="ruleWrapEl" class="rule-wrap">
        <CircularRule v-if="store.isCircular" />
        <SlideRule v-else />
      </div>

      <aside class="readings-panel" :style="readingsPanelStyle">
        <CircularReadings v-if="store.isCircular" />
        <CursorReadings v-else :layout="faceLayout" />
      </aside>
    </div>

    <p class="hint">
      <template v-for="(item, i) in hintItems" :key="i">
        <span v-if="i > 0" class="hint-sep" :style="{ color: currentTheme.colors.cursor }">·</span
        >{{ item }}
      </template>
    </p>
  </main>
</template>

<style scoped>
.app {
  max-width: none;
  padding: 24px;
  display: flex;
  flex-direction: column;
  gap: 16px;
}

/* Model selector styled as the page title: large, bold, black, borderless */
.model-select {
  font-size: 20px;
  font-weight: 700;
  color: var(--ui-text);
  border: none;
  background: transparent;
  padding: 2px 0;
  max-width: min(52vw, 560px);
  cursor: pointer;
}

.model-select:hover {
  color: var(--ui-accent);
}

.group {
  display: flex;
  align-items: center;
  gap: 6px;
}

.group-icon {
  font-size: 14px;
  color: var(--ui-text-muted);
}

.divider {
  width: 1px;
  align-self: stretch;
  min-height: 24px;
  background: var(--ui-border);
}

.count {
  font-family: 'JetBrains Mono', 'Consolas', monospace;
  font-size: 12px;
  color: var(--ui-text-muted);
  white-space: nowrap;
}

/* Front/back segmented switch */
.segmented {
  display: flex;
  border: 1px solid var(--ui-border);
  border-radius: 6px;
  overflow: hidden;
}

.segmented button {
  border: none;
  border-radius: 0;
  padding: 6px 12px;
  font-size: 13px;
  background: var(--ui-surface);
  color: var(--ui-text);
}

.segmented button + button {
  border-left: 1px solid var(--ui-border);
}

.segmented button.active {
  background: var(--ui-accent);
  color: var(--ui-accent-text);
}

/* A non-interactive icon cell between the two options. */
.segmented-icon {
  display: inline-flex;
  align-items: center;
  padding: 0 5px;
  color: var(--ui-text-muted);
  background: var(--ui-surface);
  border-left: 1px solid var(--ui-border);
  border-right: 1px solid var(--ui-border);
}

.keyboard-toggle.active {
  background: var(--ui-accent);
  color: var(--ui-accent-text);
  border-color: var(--ui-accent);
}

.zoom-control {
  display: flex;
  align-items: center;
  gap: 4px;
}

.zoom-control button {
  padding: 6px 9px;
  line-height: 1;
}

/* Editable ratio above, slider below */
.zoom-stack {
  display: flex;
  flex-direction: column;
  align-items: center;
  gap: 2px;
}

.zoom-value-row {
  display: flex;
  align-items: center;
  gap: 3px;
  font-size: 12px;
  color: var(--ui-text);
}

.zoom-input {
  width: 4ch;
  padding: 1px 3px;
  border: 1px solid var(--ui-border);
  border-radius: 4px;
  font-family: 'JetBrains Mono', 'Consolas', monospace;
  font-size: 12px;
  text-align: center;
}

.zoom-input::-webkit-outer-spin-button,
.zoom-input::-webkit-inner-spin-button {
  -webkit-appearance: none;
  margin: 0;
}

.zoom-input {
  -moz-appearance: textfield;
  appearance: textfield;
}

.zoom-slider {
  width: 120px;
  accent-color: var(--ui-accent);
}

button {
  padding: 6px 12px;
  border: 1px solid var(--ui-border);
  background: var(--ui-surface);
  color: var(--ui-text);
  border-radius: 6px;
  cursor: pointer;
  font-size: 13px;
  white-space: nowrap;
}

button:hover {
  background: var(--ui-surface-muted);
}

button:disabled {
  opacity: 0.45;
  cursor: not-allowed;
}

button:disabled:hover {
  background: var(--ui-surface);
}

select {
  padding: 6px 10px;
  border: 1px solid var(--ui-border);
  background: var(--ui-surface);
  color: var(--ui-text);
  border-radius: 6px;
  cursor: pointer;
  font-size: 13px;
}

.main-content {
  display: flex;
  /* Keep the panel beside the rule so a wider panel shrinks the rule. */
  flex-wrap: nowrap;
  gap: 16px;
  /* Stretch so the readings panel matches the rule height exactly */
  align-items: stretch;
}

.rule-wrap {
  /* Width drives height (strict 6:1), so no height here. */
  position: relative;
  flex: 1 1 720px;
  min-width: 0;
}

.readings-panel {
  /* Width follows the card count (set inline) but may shrink; the cards then
     scroll sideways instead of overflowing the page. */
  flex: 0 1 auto;
  max-width: 100%;
  min-width: 0;
  display: flex;
}

.hint {
  font-size: 13px;
  color: var(--ui-text-muted);
  margin: 0;
}

.hint-sep {
  margin: 0 8px;
  font-weight: 700;
}

/* Mobile layout */
@media (max-width: 768px) {
  .app {
    padding: 12px;
    gap: 12px;
  }

  .model-select {
    font-size: 18px;
    max-width: 100%;
  }

  .divider {
    display: none;
  }

  .count {
    font-size: 11px;
  }

  button {
    padding: 8px 12px;
  }

  .main-content {
    flex-direction: column;
  }

  .rule-wrap {
    flex: 1 1 100%;
  }

  .readings-panel {
    flex: 1 1 100%;
  }

  .hint {
    font-size: 12px;
  }
}

/* Very small screens */
@media (max-width: 480px) {
  .model-select {
    font-size: 16px;
  }

  .group-icon {
    display: none;
  }
}
</style>
