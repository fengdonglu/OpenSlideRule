<script setup lang="ts">
// Model-information dialog, opened from the toolbar "?" button. It describes
// the current model (physical facts plus every printed scale, grouped by face
// and part) and offers the quick-start tutorial, which used to live behind "?".
import { computed, onBeforeUnmount, watch } from 'vue'
import { useI18n } from 'vue-i18n'
import type { SlideRuleStructure } from '@slide-rule/core'
import { buildModelInfo, scaleDescKey } from './modelInfo'

const props = defineProps<{ open: boolean; model: SlideRuleStructure }>()

const emit = defineEmits<{ close: []; 'quick-start': [] }>()

const { t } = useI18n()

const info = computed(() => buildModelInfo(props.model))

function onKeydown(e: KeyboardEvent) {
  if (e.key === 'Escape') emit('close')
}

watch(
  () => props.open,
  (open) => {
    if (open) window.addEventListener('keydown', onKeydown)
    else window.removeEventListener('keydown', onKeydown)
  },
  { immediate: true },
)

onBeforeUnmount(() => window.removeEventListener('keydown', onKeydown))
</script>

<template>
  <div v-if="open" class="model-info-overlay" @click.self="emit('close')">
    <div class="model-info-card" role="dialog" aria-modal="true" :aria-label="t('modelInfo.title')">
      <header class="model-info-header">
        <h2>{{ t('modelInfo.title') }}</h2>
        <button
          class="icon-close"
          :title="t('modelInfo.close')"
          :aria-label="t('modelInfo.close')"
          @click="emit('close')"
        >
          ✕
        </button>
      </header>

      <h3 class="model-name">{{ t('model.' + info.id) }}</h3>

      <dl class="facts">
        <div class="fact">
          <dt>{{ t('modelInfo.facts.size') }}</dt>
          <dd>
            {{ model.physical.faceWidthMm }} × {{ model.physical.faceHeightMm }}
            {{ t('modelInfo.mm') }}
          </dd>
        </div>
        <div class="fact">
          <dt>{{ t('modelInfo.facts.rows') }}</dt>
          <dd>
            {{ model.physical.rowCount.upper }} / {{ model.physical.rowCount.middle }} /
            {{ model.physical.rowCount.lower }}
          </dd>
        </div>
        <div class="fact">
          <dt>{{ t('modelInfo.facts.scaleCount') }}</dt>
          <dd>{{ info.totalScales }}</dd>
        </div>
        <div class="fact">
          <dt>{{ t('modelInfo.facts.sided') }}</dt>
          <dd>
            {{ info.singleFaced ? t('modelInfo.facts.single') : t('modelInfo.facts.double') }}
          </dd>
        </div>
      </dl>

      <section v-for="face in info.faces" :key="face.side" class="face">
        <h3 class="face-title">{{ t('side.' + face.side) }}</h3>
        <div v-for="part in face.parts" :key="part.section" class="part">
          <h4 class="part-title">{{ t('modelInfo.parts.' + part.section) }}</h4>
          <ul class="scale-list">
            <li v-for="scale in part.scales" :key="scale.id" class="scale-row">
              <span class="scale-name" :style="{ color: scale.color }">{{ scale.name }}</span>
              <span class="scale-desc">{{ t(scaleDescKey(scale.name)) }}</span>
              <span v-if="scale.notes.length" class="scale-notes">
                <span v-for="(note, ni) in scale.notes" :key="ni" class="note">
                  <span v-for="(notePart, pi) in note" :key="pi" :class="{ red: notePart.red }">{{
                    notePart.text
                  }}</span>
                </span>
              </span>
            </li>
          </ul>
        </div>
      </section>

      <footer class="model-info-actions">
        <button class="btn-secondary" @click="emit('quick-start')">
          {{ t('modelInfo.quickStart') }}
        </button>
      </footer>
    </div>
  </div>
</template>

<style scoped>
.model-info-overlay {
  position: fixed;
  inset: 0;
  background: rgba(0, 0, 0, 0.6);
  display: flex;
  align-items: center;
  justify-content: center;
  padding: 24px;
  z-index: 1000;
  animation: fadeIn 0.3s;
}

@keyframes fadeIn {
  from {
    opacity: 0;
  }
  to {
    opacity: 1;
  }
}

.model-info-card {
  background: var(--ui-surface);
  border-radius: 12px;
  padding: 24px 28px;
  width: min(720px, 100%);
  max-height: 100%;
  overflow-y: auto;
  box-shadow: 0 20px 60px rgba(0, 0, 0, 0.3);
  animation: slideUp 0.3s;
}

@keyframes slideUp {
  from {
    transform: translateY(20px);
    opacity: 0;
  }
  to {
    transform: translateY(0);
    opacity: 1;
  }
}

.model-info-header {
  display: flex;
  align-items: flex-start;
  justify-content: space-between;
  gap: 12px;
}

.model-info-header h2 {
  margin: 0;
  font-size: 20px;
  color: var(--ui-text);
}

.icon-close {
  border: none;
  background: transparent;
  padding: 2px 6px;
  font-size: 16px;
  line-height: 1;
  color: var(--ui-text-muted);
  cursor: pointer;
  border-radius: 6px;
}

.icon-close:hover {
  background: var(--ui-surface-muted);
  color: var(--ui-text);
}

.model-name {
  margin: 4px 0 16px;
  font-size: 16px;
  font-weight: 600;
  color: var(--ui-text);
}

.facts {
  margin: 0 0 20px;
  display: grid;
  grid-template-columns: repeat(auto-fit, minmax(220px, 1fr));
  gap: 8px 24px;
}

.fact {
  display: flex;
  gap: 8px;
  font-size: 13px;
}

.fact dt {
  color: var(--ui-text-muted);
  white-space: nowrap;
}

.fact dd {
  margin: 0;
  color: var(--ui-text);
  font-family: 'JetBrains Mono', 'Consolas', monospace;
}

.face + .face {
  margin-top: 20px;
}

.face-title {
  margin: 0 0 8px;
  font-size: 15px;
  color: var(--ui-text);
  border-bottom: 1px solid var(--ui-border);
  padding-bottom: 4px;
}

.part {
  margin-top: 10px;
}

.part-title {
  margin: 0 0 4px;
  font-size: 12px;
  text-transform: uppercase;
  letter-spacing: 0.04em;
  color: var(--ui-text-muted);
}

.scale-list {
  list-style: none;
  margin: 0;
  padding: 0;
}

.scale-row {
  display: flex;
  flex-wrap: wrap;
  align-items: baseline;
  gap: 4px 10px;
  padding: 3px 0;
  font-size: 13px;
}

.scale-name {
  font-family: 'JetBrains Mono', 'Consolas', monospace;
  font-weight: 700;
  min-width: 3.5em;
}

.scale-desc {
  color: var(--ui-text-muted);
  flex: 1 1 240px;
}

.scale-notes {
  display: inline-flex;
  gap: 6px;
  font-family: 'JetBrains Mono', 'Consolas', monospace;
  font-size: 12px;
  color: var(--ui-text-muted);
}

.note {
  padding: 0 4px;
  border: 1px solid var(--ui-border);
  border-radius: 4px;
}

.note .red {
  color: #dc2626;
}

.model-info-actions {
  display: flex;
  justify-content: flex-end;
  margin-top: 20px;
}

.btn-secondary {
  padding: 8px 16px;
  border: 1px solid var(--ui-border);
  border-radius: 6px;
  background: var(--ui-surface-muted);
  color: var(--ui-text);
  font-size: 13px;
  cursor: pointer;
}

.btn-secondary:hover {
  background: var(--ui-border);
}
</style>
