<script setup lang="ts">
import { computed, ref } from 'vue'
import { useI18n } from 'vue-i18n'
import { storeToRefs } from 'pinia'
import { MODELS, sideHasScales } from '@slide-rule/core'
import type {
  DiscSpec,
  PhysicalSpec,
  RuleForm,
  ScaleSection,
  SlideRuleSide,
} from '@slide-rule/core'
import { printSlideRule } from '../utils/print'
import './designer.css'
import { useDesignerStore } from './store'
import { errorPaths, subtreeHasError } from './errors'
import { templateSpecs } from './templates'
import { useSlideRuleStore } from '../stores/slideRule'
import AppBar from '../components/AppBar.vue'
import AppIcon from '../components/AppIcon.vue'
import type { AppBarExportItem, AppMode } from '../appMode'
import type { FaceName } from './model'
import DesignerPreview from './DesignerPreview.vue'
import ScaleForm from './panels/ScaleForm.vue'
import CalcForm from './panels/CalcForm.vue'

const emit = defineEmits<{ close: [] }>()

const { t } = useI18n()
const store = useDesignerStore()
const appStore = useSlideRuleStore()
const { currentTheme, zoom } = storeToRefs(appStore)

const spec = computed(() => store.spec)
const faces: FaceName[] = ['front', 'back']
const sections: ScaleSection[] = ['upper', 'middle', 'lower']
const paths = computed(() => errorPaths(store.errors))
const templates = templateSpecs()
// i18n keys for the starter templates; keep this in sync with templates.ts.
const templateLabelKeys: Record<string, string> = {
  linearLog: 'designer.templateLinearLog',
  circularCd: 'designer.templateCircularCd',
}

const fileInput = ref<HTMLInputElement | null>(null)

function numberFrom(event: Event): number {
  return Number((event.target as HTMLInputElement).value)
}

function errorTitles(path: string): string | undefined {
  const messages = store.errors.filter((error) => error.path === path).map((error) => error.message)
  return messages.length > 0 ? messages.join('\n') : undefined
}

function onId(event: Event): void {
  store.setRule({ id: (event.target as HTMLInputElement).value })
}

function onName(event: Event): void {
  store.setRule({ name: (event.target as HTMLInputElement).value })
}

function onForm(event: Event): void {
  store.setForm((event.target as HTMLSelectElement).value as RuleForm)
}

function onPhysicalNumber(key: Exclude<keyof PhysicalSpec, 'rowCount'>, event: Event): void {
  const patch: Partial<PhysicalSpec> = {}
  patch[key] = numberFrom(event)
  store.setPhysical(patch)
}

function onRowCount(key: ScaleSection, event: Event): void {
  const rowCount = store.spec.physical?.rowCount ?? { upper: 0, middle: 0, lower: 0 }
  store.setPhysical({ rowCount: { ...rowCount, [key]: numberFrom(event) } })
}

function onDiscNumber(key: keyof DiscSpec, event: Event): void {
  const patch: Partial<DiscSpec> = {}
  patch[key] = numberFrom(event)
  store.setDisc(patch)
}

// The combined "New / load" menu carries a namespaced value: `seed:<id>` loads a
// built-in model, `template:<id>` a starter template. The control resets so the
// same entry can be chosen again.
function onNewFrom(event: Event): void {
  const target = event.target as HTMLSelectElement
  const value = target.value
  if (value.startsWith('seed:')) store.seed(value.slice('seed:'.length))
  else if (value.startsWith('template:')) store.loadTemplate(value.slice('template:'.length))
  target.value = ''
}

function openImport(): void {
  fileInput.value?.click()
}

async function onImport(event: Event): Promise<void> {
  const input = event.target as HTMLInputElement
  const file = input.files?.[0]
  if (file === undefined) return
  store.loadText(await file.text())
  input.value = ''
}

function download(name: string, text: string): void {
  const url = URL.createObjectURL(new Blob([text], { type: 'application/json' }))
  const a = document.createElement('a')
  a.href = url
  a.download = name
  a.click()
  URL.revokeObjectURL(url)
}

function exportSpec(): void {
  download(`${store.spec.id}.spec.json`, store.serializeJson(store.spec))
}

function exportDefinition(): void {
  if (store.definition === null) return
  download(`${store.spec.id}.rule.json`, store.serializeJson(store.definition))
}

const designerExports = computed<AppBarExportItem[]>(() => [
  {
    key: 'spec',
    label: t('designer.exportSpec'),
    testId: 'export-spec',
    disabled: !store.buildResult.ok,
    onClick: exportSpec,
  },
  {
    key: 'definition',
    label: t('designer.exportDefinition'),
    testId: 'export-definition',
    disabled: !store.buildResult.ok,
    onClick: exportDefinition,
  },
  {
    key: 'print',
    label: t('export.print'),
    testId: 'designer-print',
    disabled: !store.buildResult.ok,
    onClick: printDraft,
  },
])

function onModeChange(mode: AppMode): void {
  if (mode === 'simulator') emit('close')
}

// Print the current draft at 1:1, through the same print path as the simulator.
async function printDraft(): Promise<void> {
  const rule = store.previewRule
  if (rule === null) return
  const faces = (['front', 'back'] as SlideRuleSide[]).filter((face) => sideHasScales(rule, face))
  await printSlideRule({
    rule,
    faces,
    theme: currentTheme.value,
    slideOffsetMm: 0,
    title: store.spec.name,
    titleOf: (scale) => scale.name,
  })
}

const showErrors = ref(false)

// The form columns can be hidden to give the preview the full width.
const formOpen = ref(true)

// A click on a scale in the preview selects it, mirroring the sidebar list.
function onPreviewSelect(
  selection: { face: FaceName; section: ScaleSection; index: number } | null,
): void {
  if (selection === null) store.clearSelection()
  else store.select(selection.face, selection.section, selection.index)
}

// "+" on a section: insert after the selected scale when it is in this section,
// otherwise append. The new scale becomes the selection.
function onAddScale(face: FaceName, section: ScaleSection): void {
  const selection = store.selection
  const after =
    selection !== null && selection.face === face && selection.section === section
      ? selection.index
      : undefined
  store.addScale(face, section, after)
}

function isSelected(face: FaceName, section: ScaleSection, index: number): boolean {
  const selection = store.selection
  return (
    selection !== null &&
    selection.face === face &&
    selection.section === section &&
    selection.index === index
  )
}
</script>

<template>
  <section class="designer">
    <AppBar mode="designer" :export-items="designerExports" @mode-change="onModeChange">
      <template #brand>
        <h1 class="designer-title">{{ t('designer.title') }}</h1>
      </template>

      <template #tools>
        <button :title="t('designer.newRule')" @click="store.newSpec()">
          <AppIcon name="new" />
        </button>
        <button :title="t('designer.import')" @click="openImport">
          <AppIcon name="import" />
        </button>
        <input
          ref="fileInput"
          type="file"
          accept="application/json"
          data-test="designer-import-file"
          hidden
          @change="onImport"
        />
        <!-- One "New / load" menu: built-in models and starter templates. -->
        <select
          class="designer-new-from"
          data-test="new-select"
          :value="''"
          :title="t('designer.newFrom')"
          @change="onNewFrom"
        >
          <option value="" disabled>{{ t('designer.newFrom') }}</option>
          <optgroup :label="t('designer.seed')">
            <option
              v-for="m in MODELS"
              :key="'seed:' + m.id"
              :value="'seed:' + m.id"
              :disabled="!m.available"
            >
              {{ t('model.' + m.id) }}
            </option>
          </optgroup>
          <optgroup :label="t('designer.templates')">
            <option
              v-for="template in templates"
              :key="'template:' + template.id"
              :value="'template:' + template.id"
            >
              {{ t(templateLabelKeys[template.id]) }}
            </option>
          </optgroup>
        </select>
        <button :title="t('designer.clearDraft')" @click="store.clearDraft()">
          <AppIcon name="clear" />
        </button>
      </template>
    </AppBar>

    <p v-if="store.importError" class="designer-import-error">
      {{ t('designer.importFailed') }}: {{ store.importError }}
    </p>

    <div class="designer-body" :class="{ 'is-form-hidden': !formOpen }">
      <aside v-show="formOpen" class="designer-sidebar">
        <!-- Always-visible column: the rule and its scale layout. -->
        <div class="designer-column designer-column--primary">
          <section class="designer-panel">
            <div class="designer-panel-head">
              <button
                class="designer-collapse"
                data-test="toggle-form"
                :title="t('designer.collapseForm')"
                @click="formOpen = false"
              >
                «
              </button>
              <h2 class="designer-panel-title">{{ t('designer.metadata') }}</h2>
            </div>
            <label class="designer-field">
              <span>{{ t('designer.id') }}</span>
              <input
                type="text"
                data-test="rule-id"
                :value="spec.id"
                :class="{ 'is-error': paths.has('id') }"
                :title="errorTitles('id')"
                @input="onId"
              />
            </label>
            <label class="designer-field">
              <span>{{ t('designer.name') }}</span>
              <input
                type="text"
                :value="spec.name"
                :class="{ 'is-error': paths.has('name') }"
                :title="errorTitles('name')"
                @input="onName"
              />
            </label>
            <label class="designer-field">
              <span>{{ t('designer.form') }}</span>
              <select :value="spec.form ?? 'linear'" @change="onForm">
                <option value="linear">{{ t('designer.formLinear') }}</option>
                <option value="circular">{{ t('designer.formCircular') }}</option>
              </select>
            </label>

            <div v-if="spec.form === 'circular'" class="designer-subgroup">
              <label class="designer-field">
                <span>{{ t('designer.discOuter') }}</span>
                <span class="designer-input-unit">
                  <input
                    type="number"
                    :value="spec.disc?.outerRadiusMm ?? ''"
                    :class="{ 'is-error': subtreeHasError(paths, 'disc') }"
                    @input="onDiscNumber('outerRadiusMm', $event)"
                  />
                  <em>{{ t('designer.unitMm') }}</em>
                </span>
              </label>
              <label class="designer-field">
                <span>{{ t('designer.discInner') }}</span>
                <span class="designer-input-unit">
                  <input
                    type="number"
                    :value="spec.disc?.innerRadiusMm ?? ''"
                    :class="{ 'is-error': subtreeHasError(paths, 'disc') }"
                    @input="onDiscNumber('innerRadiusMm', $event)"
                  />
                  <em>{{ t('designer.unitMm') }}</em>
                </span>
              </label>
              <label class="designer-field">
                <span>{{ t('designer.discSheet') }}</span>
                <span class="designer-input-unit">
                  <input
                    type="number"
                    :value="spec.disc?.sheetSizeMm ?? ''"
                    :class="{ 'is-error': subtreeHasError(paths, 'disc') }"
                    @input="onDiscNumber('sheetSizeMm', $event)"
                  />
                  <em>{{ t('designer.unitMm') }}</em>
                </span>
              </label>
            </div>

            <div
              v-else
              class="designer-subgroup"
              :class="{ 'is-error': subtreeHasError(paths, 'physical') }"
            >
              <label class="designer-field">
                <span>{{ t('designer.faceWidth') }}</span>
                <span class="designer-input-unit">
                  <input
                    type="number"
                    data-test="face-width"
                    :value="spec.physical?.faceWidthMm ?? ''"
                    @input="onPhysicalNumber('faceWidthMm', $event)"
                  />
                  <em>{{ t('designer.unitMm') }}</em>
                </span>
              </label>
              <label class="designer-field">
                <span>{{ t('designer.faceHeight') }}</span>
                <span class="designer-input-unit">
                  <input
                    type="number"
                    :value="spec.physical?.faceHeightMm ?? ''"
                    @input="onPhysicalNumber('faceHeightMm', $event)"
                  />
                  <em>{{ t('designer.unitMm') }}</em>
                </span>
              </label>
              <label class="designer-field">
                <span>{{ t('designer.rowsUpper') }}</span>
                <input
                  class="di-sm"
                  type="number"
                  :value="spec.physical?.rowCount.upper ?? ''"
                  @input="onRowCount('upper', $event)"
                />
              </label>
              <label class="designer-field">
                <span>{{ t('designer.rowsMiddle') }}</span>
                <input
                  class="di-sm"
                  type="number"
                  :value="spec.physical?.rowCount.middle ?? ''"
                  @input="onRowCount('middle', $event)"
                />
              </label>
              <label class="designer-field">
                <span>{{ t('designer.rowsLower') }}</span>
                <input
                  class="di-sm"
                  type="number"
                  :value="spec.physical?.rowCount.lower ?? ''"
                  @input="onRowCount('lower', $event)"
                />
              </label>
              <label class="designer-field">
                <span>{{ t('designer.leftGutter') }}</span>
                <span class="designer-input-unit">
                  <input
                    type="number"
                    :value="spec.physical?.leftGutterMm ?? ''"
                    @input="onPhysicalNumber('leftGutterMm', $event)"
                  />
                  <em>{{ t('designer.unitMm') }}</em>
                </span>
              </label>
              <label class="designer-field">
                <span>{{ t('designer.rightPanel') }}</span>
                <span class="designer-input-unit">
                  <input
                    type="number"
                    :value="spec.physical?.rightPanelMm ?? ''"
                    @input="onPhysicalNumber('rightPanelMm', $event)"
                  />
                  <em>{{ t('designer.unitMm') }}</em>
                </span>
              </label>
              <label class="designer-field">
                <span>{{ t('designer.grooveRatio') }}</span>
                <input
                  type="number"
                  :value="spec.physical?.grooveRowRatio ?? ''"
                  @input="onPhysicalNumber('grooveRowRatio', $event)"
                />
              </label>
              <label class="designer-field">
                <span>{{ t('designer.marginRatio') }}</span>
                <input
                  type="number"
                  :value="spec.physical?.marginRowRatio ?? ''"
                  @input="onPhysicalNumber('marginRowRatio', $event)"
                />
              </label>
              <label class="designer-field">
                <span>{{ t('designer.numeralRatio') }}</span>
                <input
                  type="number"
                  :value="spec.physical?.numeralRatio ?? ''"
                  @input="onPhysicalNumber('numeralRatio', $event)"
                />
              </label>
            </div>
          </section>

          <section class="designer-panel">
            <h2 class="designer-panel-title">{{ t('designer.scales') }}</h2>
            <fieldset v-for="face in faces" :key="face" class="designer-face">
              <legend>{{ t('side.' + face) }}</legend>
              <fieldset v-for="section in sections" :key="section" class="designer-section">
                <legend>
                  {{ t('modelInfo.parts.' + section) }}
                  <button
                    class="designer-add-icon"
                    :title="t('designer.addScale')"
                    @click="onAddScale(face, section)"
                  >
                    +
                  </button>
                </legend>
                <div
                  v-for="(scale, index) in spec.faces[face][section]"
                  :key="index"
                  class="designer-scale-row"
                >
                  <button
                    class="designer-scale"
                    :class="{ 'is-selected': isSelected(face, section, index) }"
                    @click="store.select(face, section, index)"
                  >
                    <span class="designer-scale-index">{{ index + 1 }}</span>
                    <span class="designer-scale-name">{{ scale.id }} · {{ scale.name }}</span>
                  </button>
                  <template v-if="isSelected(face, section, index)">
                    <button :title="t('designer.moveUp')" @click="store.moveScale(-1)">↑</button>
                    <button :title="t('designer.moveDown')" @click="store.moveScale(1)">↓</button>
                    <button
                      class="designer-remove"
                      :title="t('designer.removeScale')"
                      @click="store.removeScale()"
                    >
                      ✕
                    </button>
                  </template>
                </div>
              </fieldset>
            </fieldset>
            <p v-if="store.selection === null" class="designer-muted">
              {{ t('designer.noSelection') }}
            </p>
          </section>
        </div>

        <!-- Appears to the right once a scale is selected or added. -->
        <div v-if="store.selection !== null" class="designer-column designer-column--secondary">
          <ScaleForm />
          <CalcForm />
        </div>
      </aside>

      <div class="designer-main">
        <div v-if="!formOpen" class="designer-main-bar">
          <button
            data-test="toggle-form"
            :title="t('designer.expandForm')"
            @click="formOpen = true"
          >
            »
          </button>
        </div>
        <p v-if="store.isStale" class="designer-stale">{{ t('designer.stalePreview') }}</p>
        <DesignerPreview
          :style="{ '--designer-zoom': zoom }"
          :rule="store.previewRule"
          :circular="store.isCircular"
          :theme="currentTheme"
          @select="onPreviewSelect"
        />
      </div>
    </div>

    <!-- One status bar, fixed at the bottom (the preview scrolls above it). -->
    <footer class="designer-status" :class="{ 'is-error': store.errors.length > 0 }">
      <span class="designer-status-label">{{ t('designer.validation') }}</span>
      <span v-if="store.errors.length === 0" class="designer-status-valid">
        {{ t('designer.valid') }}
      </span>
      <button v-else class="designer-status-toggle" @click="showErrors = !showErrors">
        {{ t('designer.errorCount', { n: store.errors.length }) }}
      </button>
      <span v-if="store.draftRestored" class="designer-status-note">
        {{ t('designer.draftRestored') }}
      </span>
      <ul v-if="store.errors.length > 0 && showErrors" class="designer-errors">
        <li v-for="(error, i) in store.errors" :key="i">
          <template v-if="error.path">{{ error.path }}: </template>
          <template v-if="error.code">{{ error.code }}: </template>{{ error.message }}
        </li>
      </ul>
    </footer>
  </section>
</template>

<style scoped>
.designer {
  position: fixed;
  inset: 0;
  z-index: 1000;
  display: flex;
  flex-direction: column;
  overflow: hidden;
  background: var(--ui-surface);
  padding: 16px;
  box-sizing: border-box;
}

.designer-title {
  margin: 0;
  font-size: 20px;
  font-weight: 700;
  color: var(--ui-text);
}

/* Preview on the left, form on the right - the same way round as the simulator
   (rule left, readings right). `order` flips the source order without moving
   the large sidebar block. */
.designer-body {
  flex: 1 1 auto;
  min-height: 0;
  overflow: hidden;
  display: grid;
  grid-template-columns: 1fr auto;
  gap: 14px;
  align-items: start;
  margin-top: 12px;
}

.designer-body.is-form-hidden {
  grid-template-columns: 1fr;
}

.designer-main {
  order: 1;
  position: relative;
  display: flex;
  flex-direction: column;
  min-width: 0;
  min-height: 0;
  height: 100%;
}

/* Two columns: the rule / layout always, the selected scale's fields to their
   right and only while a scale is selected. */
.designer-sidebar {
  order: 2;
  display: flex;
  flex-direction: row;
  align-items: flex-start;
  gap: 16px;
  min-height: 0;
  max-height: 100%;
  overflow: auto;
}

.designer-column {
  display: flex;
  flex-direction: column;
  gap: 8px;
  width: 250px;
}

.designer-face {
  /* Fieldsets default to `min-inline-size: min-content`; without this a long
     scale row would widen the fieldset past its panel. */
  min-inline-size: 0;
  border: 1px solid var(--ui-border);
  border-radius: 6px;
  padding: 6px 10px 10px;
  margin: 0;
}

.designer-section {
  min-inline-size: 0;
  border: 1px solid var(--ui-surface-muted);
  border-radius: 4px;
  padding: 3px 8px 6px;
  margin: 6px 0 0;
}

.designer-face legend,
.designer-section legend {
  width: 100%;
  text-align: center;
  font-size: 12px;
  font-weight: 600;
  color: var(--ui-text-muted);
  padding: 0 4px;
}

.designer-scale-row {
  display: flex;
  align-items: center;
  gap: 4px;
  margin: 2px 0;
}

.designer-scale {
  flex: 1 1 auto;
  min-width: 0;
  display: flex;
  align-items: center;
  gap: 6px;
  text-align: left;
}

/* The list position is a quiet badge, distinct from the scale name. */
.designer-scale-index {
  flex: 0 0 auto;
  display: inline-flex;
  align-items: center;
  justify-content: center;
  min-width: 16px;
  height: 16px;
  padding: 0 4px;
  border-radius: 8px;
  background: var(--ui-surface-muted);
  color: var(--ui-text-muted);
  font-size: 11px;
  font-weight: 600;
}

.designer-scale-name {
  min-width: 0;
  overflow: hidden;
  text-overflow: ellipsis;
  white-space: nowrap;
  font-family: 'JetBrains Mono', 'Consolas', monospace;
}

.designer-scale.is-selected {
  border-color: var(--ui-accent);
  background: color-mix(in srgb, var(--ui-accent) 14%, var(--ui-surface));
  color: var(--ui-accent);
}

/* "+" on a section legend: muted until hovered, then it brightens. */
.designer-add-icon {
  margin-left: 4px;
  padding: 0 5px;
  min-width: 18px;
  line-height: 16px;
  font-size: 14px;
  font-weight: 700;
  color: var(--ui-text-muted);
  background: transparent;
  border-color: transparent;
}

.designer-add-icon:hover:not(:disabled) {
  color: var(--ui-accent);
  background: var(--ui-surface-muted);
  border-color: var(--ui-border);
}

/* Validation status bar, fixed at the bottom of the designer. */
.designer-status {
  flex: 0 0 auto;
  display: flex;
  align-items: center;
  gap: 10px;
  flex-wrap: wrap;
  margin-top: 12px;
  padding: 6px 12px;
  border: 1px solid var(--ui-border);
  border-radius: 6px;
  background: var(--ui-surface);
  font-size: 12px;
}

.designer-status.is-error {
  border-color: #dc2626;
}

.designer-status-label {
  font-weight: 600;
  color: var(--ui-text-muted);
}

.designer-status-valid {
  color: #15803d;
}

.designer-status-toggle {
  padding: 2px 8px;
  font-size: 12px;
  color: #b91c1c;
  border-color: currentColor;
}

.designer-errors {
  flex-basis: 100%;
  margin: 0;
  padding-left: 18px;
  font-size: 12px;
  color: #b91c1c;
}

.designer-import-error {
  margin: 0 0 16px;
  padding: 8px 12px;
  border-radius: 6px;
  background: #fef2f2;
  color: #b91c1c;
  font-size: 13px;
}

.designer-stale {
  margin: 0 0 8px;
  padding: 6px 10px;
  border-radius: 6px;
  background: #fffbeb;
  color: #b45309;
  font-size: 12px;
}

.designer-muted {
  margin: 4px 0 0;
  font-size: 12px;
  color: var(--ui-text-muted);
}

/* The collapsed form's "show form" button floats over the preview's top right,
   faint until the pointer is over the preview, solid when over the button. */
.designer-main-bar {
  position: absolute;
  top: 10px;
  right: 10px;
  z-index: 3;
  opacity: 0;
  pointer-events: none;
  transition: opacity 0.15s ease;
}

.designer-main:hover .designer-main-bar {
  opacity: 0.55;
  pointer-events: auto;
}

.designer-main-bar:hover {
  opacity: 1;
}

.designer-main-bar button {
  padding: 2px 12px;
  font-size: 16px;
  font-weight: 700;
  line-height: 1;
}

/* A panel title row with the collapse control pinned to its left. */
.designer-panel-head {
  position: relative;
  display: flex;
  align-items: center;
  justify-content: center;
  min-height: 22px;
}

.designer-collapse {
  position: absolute;
  left: 0;
  padding: 0 6px;
  line-height: 16px;
  color: var(--ui-text-muted);
}

.designer-status-note {
  margin-left: auto;
  color: var(--ui-text-muted);
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

button:hover:not(:disabled) {
  background: var(--ui-surface-muted);
}

button:disabled {
  opacity: 0.45;
  cursor: not-allowed;
}

input,
select {
  padding: 4px 6px;
  border: 1px solid var(--ui-border);
  border-radius: 5px;
  font-size: 12px;
  background: var(--ui-surface);
  color: var(--ui-text);
}

@media (max-width: 900px) {
  .designer-body {
    grid-template-columns: 1fr;
  }
}
</style>
