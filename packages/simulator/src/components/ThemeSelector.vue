<script setup lang="ts">
import { ref } from 'vue'
import { useI18n } from 'vue-i18n'
import { storeToRefs } from 'pinia'
import { useSlideRuleStore } from '../stores/slideRule'
import AppIcon from './AppIcon.vue'
import { THEMES } from '@slide-rule/renderer'

const { t } = useI18n()
const store = useSlideRuleStore()
const { currentThemeId } = storeToRefs(store)
const showPanel = ref(false)

const themeList = Object.values(THEMES)

function selectTheme(themeId: string) {
  store.setTheme(themeId)
  showPanel.value = false
}
</script>

<template>
  <div class="theme-selector">
    <button
      class="theme-btn"
      :title="t('theme.label') + ': ' + t('theme.' + currentThemeId)"
      @click="showPanel = !showPanel"
    >
      <AppIcon name="theme" />
      <span class="caret">▾</span>
    </button>

    <div v-if="showPanel" class="theme-panel">
      <div class="theme-header">{{ t('theme.label') }}</div>
      <div class="theme-grid">
        <div
          v-for="theme in themeList"
          :key="theme.id"
          class="theme-card"
          :class="{ active: theme.id === currentThemeId }"
          @click="selectTheme(theme.id)"
        >
          <div
            class="preview"
            :style="{
              background: theme.colors.background,
              borderColor: theme.colors.gap,
            }"
          >
            <div class="preview-scale" :style="{ background: theme.colors.scaleBlack }"></div>
            <div class="preview-scale" :style="{ background: theme.colors.scaleRed }"></div>
            <div class="preview-cursor" :style="{ background: theme.colors.cursor }"></div>
          </div>
          <div class="theme-name">{{ t('theme.' + theme.id) }}</div>
        </div>
      </div>
    </div>
  </div>
</template>

<style scoped>
.theme-selector {
  position: relative;
}

.theme-btn {
  padding: 6px 14px;
  border: 1px solid var(--ui-border);
  background: var(--ui-surface);
  color: var(--ui-text);
  border-radius: 6px;
  cursor: pointer;
  font-size: 14px;
}

.theme-btn:hover {
  background: var(--ui-surface-muted);
}

.caret {
  margin-left: 2px;
  font-size: 10px;
  opacity: 0.6;
}

.theme-panel {
  position: absolute;
  top: 100%;
  right: 0;
  margin-top: 8px;
  background: var(--ui-surface);
  border: 1px solid var(--ui-border);
  border-radius: 8px;
  box-shadow: 0 8px 24px rgba(0, 0, 0, 0.12);
  padding: 16px;
  z-index: 200;
  min-width: 320px;
}

.theme-header {
  font-size: 14px;
  font-weight: 600;
  margin-bottom: 12px;
  color: var(--ui-text);
}

.theme-grid {
  display: grid;
  grid-template-columns: repeat(2, 1fr);
  gap: 12px;
}

.theme-card {
  cursor: pointer;
  border: 2px solid transparent;
  border-radius: 6px;
  padding: 8px;
  transition: all 0.2s;
}

.theme-card:hover {
  background: var(--ui-page);
}

.theme-card.active {
  border-color: var(--ui-accent);
  background: color-mix(in srgb, var(--ui-accent) 14%, var(--ui-surface));
}

.preview {
  height: 60px;
  border: 2px solid;
  border-radius: 4px;
  padding: 8px;
  display: flex;
  flex-direction: column;
  gap: 4px;
  position: relative;
}

.preview-scale {
  height: 6px;
  border-radius: 2px;
}

.preview-cursor {
  position: absolute;
  top: 0;
  bottom: 0;
  left: 50%;
  width: 2px;
  opacity: 0.8;
}

.theme-name {
  margin-top: 8px;
  font-size: 13px;
  text-align: center;
  color: var(--ui-text);
}
</style>
