<script setup lang="ts">
// Error dialog for the external-rule import. A failed import leaves the current
// model untouched; this dialog reports why: a JSON syntax error or a list of
// validation errors.
import { onBeforeUnmount, watch } from 'vue'
import { useI18n } from 'vue-i18n'
import type { ImportRuleResult } from '../utils/importRule'

const props = defineProps<{ open: boolean; result: ImportRuleResult | null }>()

const emit = defineEmits<{ close: [] }>()

const { t } = useI18n()

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
  <div v-if="open && result" class="import-overlay" @click.self="emit('close')">
    <div class="import-card" role="dialog" aria-modal="true" :aria-label="t('import.title')">
      <header class="import-header">
        <h2>{{ t('import.title') }}</h2>
        <button
          class="icon-close"
          :title="t('modelInfo.close')"
          :aria-label="t('modelInfo.close')"
          @click="emit('close')"
        >
          ✕
        </button>
      </header>

      <template v-if="result.kind === 'parseError'">
        <p class="import-message">{{ t('import.parseError') }}: {{ result.message }}</p>
      </template>

      <template v-else-if="result.kind === 'errors'">
        <p class="import-message">{{ t('import.errorsTitle') }}</p>
        <ul class="import-errors">
          <li v-for="(error, i) in result.errors" :key="i">
            {{ error.path }}: {{ error.code }}: {{ error.message }}
          </li>
        </ul>
      </template>
    </div>
  </div>
</template>

<style scoped>
.import-overlay {
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

.import-card {
  background: var(--ui-surface);
  border-radius: 12px;
  padding: 24px 28px;
  width: min(560px, 100%);
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

.import-header {
  display: flex;
  align-items: flex-start;
  justify-content: space-between;
  gap: 12px;
}

.import-header h2 {
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

.import-message {
  margin: 16px 0 0;
  font-size: 14px;
  color: var(--ui-text);
}

.import-errors {
  margin: 8px 0 0;
  padding-left: 20px;
  font-family: 'JetBrains Mono', 'Consolas', monospace;
  font-size: 12px;
  color: #b91c1c;
}

.import-errors li {
  margin: 4px 0;
}
</style>
