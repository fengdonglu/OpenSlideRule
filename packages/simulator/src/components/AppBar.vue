<script setup lang="ts">
import { computed, ref } from 'vue'
import { useI18n } from 'vue-i18n'
import { storeToRefs } from 'pinia'
import ThemeSelector from './ThemeSelector.vue'
import AppIcon from './AppIcon.vue'
import { useSlideRuleStore, ZOOM_MIN, ZOOM_MAX } from '../stores/slideRule'
import { SUPPORTED_LOCALES, applyLocale, type AppLocale } from '../i18n'
import { REPO_URL, type AppMode, type AppBarExportItem } from '../appMode'

const props = defineProps<{
  mode: AppMode
  exportItems: AppBarExportItem[]
  help?: { title: string; onClick: () => void }
}>()

const emit = defineEmits<{ 'mode-change': [mode: AppMode] }>()

const { t, locale } = useI18n()
const store = useSlideRuleStore()
const { zoom } = storeToRefs(store)
const showExportMenu = ref(false)

// "1" / "1.25" / "6" (the X suffix is rendered next to the input)
const zoomValue = computed(() => Math.round(zoom.value * 100) / 100)

function onZoomSlider(event: Event): void {
  store.setZoom(Number((event.target as HTMLInputElement).value))
}

function onZoomInput(event: Event): void {
  const value = Number((event.target as HTMLInputElement).value)
  if (!Number.isNaN(value)) store.setZoom(value)
}

function onLocaleChange(event: Event): void {
  applyLocale((event.target as HTMLSelectElement).value as AppLocale)
}

function runExport(item: AppBarExportItem): void {
  showExportMenu.value = false
  item.onClick()
}
</script>

<template>
  <header class="app-bar">
    <div class="app-bar-brand">
      <slot name="brand" />
    </div>

    <div class="app-bar-tools">
      <slot name="tools" />
    </div>

    <!-- Application functions: identical on the simulator and the designer.
         Rule/authoring controls belong in the brand/tools slots above. -->
    <div class="app-bar-functions">
      <!-- Export first: it sits next to the module's own controls (import in
           the simulator, seed/template in the designer). -->
      <div class="export-dropdown">
        <button
          data-test="export-toggle"
          :title="t('export.label')"
          @click="showExportMenu = !showExportMenu"
        >
          <AppIcon name="export" />
          <span class="caret">▾</span>
        </button>
        <div v-if="showExportMenu" class="export-menu">
          <button
            v-for="item in props.exportItems"
            :key="item.key"
            :data-test="item.testId"
            :disabled="item.disabled"
            @click="runExport(item)"
          >
            {{ item.label }}
          </button>
        </div>
      </div>

      <!-- Display scale, the simulator's control: an editable number over a
           slider. It scales the rule in the simulator and the preview in the
           designer. -->
      <div class="zoom-control">
        <button :title="t('zoom.out')" :disabled="zoom <= ZOOM_MIN" @click="store.zoomOut()">
          −
        </button>
        <div class="zoom-stack">
          <label class="zoom-value-row">
            <input
              class="zoom-input"
              type="number"
              :min="ZOOM_MIN"
              :max="ZOOM_MAX"
              step="0.25"
              :value="zoomValue"
              :title="t('zoom.set')"
              @change="onZoomInput"
            />
            <span>×</span>
          </label>
          <input
            class="zoom-slider"
            type="range"
            :min="ZOOM_MIN"
            :max="ZOOM_MAX"
            step="0.25"
            :value="zoom"
            :title="t('zoom.set')"
            @input="onZoomSlider"
          />
        </div>
        <button :title="t('zoom.in')" :disabled="zoom >= ZOOM_MAX" @click="store.zoomIn()">
          ＋
        </button>
      </div>

      <ThemeSelector />

      <select :value="locale" :title="t('language.label')" @change="onLocaleChange">
        <option v-for="l in SUPPORTED_LOCALES" :key="l" :value="l">
          {{ t('language.' + l) }}
        </option>
      </select>

      <button v-if="props.help" :title="props.help.title" @click="props.help.onClick()">?</button>

      <div class="segmented mode-switch">
        <button
          data-test="designer-close"
          :class="{ active: mode === 'simulator' }"
          :title="t('mode.simulator')"
          @click="emit('mode-change', 'simulator')"
        >
          <AppIcon name="simulator" />
        </button>
        <button
          data-test="designer-open"
          :class="{ active: mode === 'designer' }"
          :title="t('mode.designer')"
          @click="emit('mode-change', 'designer')"
        >
          <AppIcon name="designer" />
        </button>
      </div>

      <a
        class="github-link"
        data-test="github-link"
        :href="REPO_URL"
        target="_blank"
        rel="noopener noreferrer"
        :title="t('repo.github')"
      >
        <AppIcon name="github" />
      </a>
    </div>
  </header>
</template>

<style scoped>
.app-bar {
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 12px 24px;
  flex-wrap: wrap;
}

.app-bar-brand {
  display: flex;
  align-items: center;
  gap: 12px;
  min-width: 0;
}

.app-bar-tools {
  display: flex;
  align-items: center;
  gap: 10px;
  flex-wrap: wrap;
}

.app-bar-functions {
  display: flex;
  align-items: center;
  gap: 8px;
  flex-wrap: wrap;
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
  background: var(--ui-surface);
  color: var(--ui-text);
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
  width: 110px;
  accent-color: var(--ui-accent);
}

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

.github-link {
  display: inline-flex;
  align-items: center;
  padding: 6px 9px;
  border: 1px solid var(--ui-border);
  background: var(--ui-surface);
  color: var(--ui-text);
  border-radius: 6px;
  font-size: 13px;
}

.github-link:hover {
  background: var(--ui-surface-muted);
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

select {
  padding: 6px 10px;
  border: 1px solid var(--ui-border);
  background: var(--ui-surface);
  color: var(--ui-text);
  border-radius: 6px;
  cursor: pointer;
  font-size: 13px;
}

.caret {
  margin-left: 2px;
  font-size: 10px;
  opacity: 0.6;
}

.export-dropdown {
  position: relative;
}

.export-menu {
  position: absolute;
  top: 100%;
  right: 0;
  margin-top: 4px;
  background: var(--ui-surface);
  border: 1px solid var(--ui-border);
  border-radius: 6px;
  box-shadow: 0 4px 12px rgba(0, 0, 0, 0.1);
  display: flex;
  flex-direction: column;
  z-index: 100;
}

.export-menu button {
  border: none;
  text-align: left;
  white-space: nowrap;
  border-radius: 0;
}

.export-menu button:hover:not(:disabled) {
  background: var(--ui-surface-muted);
}
</style>
