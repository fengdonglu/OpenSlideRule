<script setup lang="ts">
// Tutorial overlay: shown on first visit and replayable from the toolbar.
import { ref } from 'vue'
import { useI18n } from 'vue-i18n'

const { t } = useI18n()

// Step keys; copy lives in i18n locales under `tutorial.steps.*`.
const STEP_KEYS = ['cursor', 'slide', 'hover', 'dual', 'zoom', 'theme'] as const

const currentStep = ref(0)

const STORAGE_KEY = 'sliderule-1002:tutorial-seen'

// Only auto-open on the first visit (the flag is remembered).
const showTutorial = ref(!localStorage.getItem(STORAGE_KEY))

function dismiss() {
  showTutorial.value = false
  try {
    localStorage.setItem(STORAGE_KEY, '1')
  } catch {
    // localStorage may be unavailable (private mode); ignore
  }
}

function nextStep() {
  if (currentStep.value < STEP_KEYS.length - 1) {
    currentStep.value++
  } else {
    dismiss()
  }
}

function skipTutorial() {
  dismiss()
}

// Used by the toolbar "?" button to replay the tutorial.
function open() {
  currentStep.value = 0
  showTutorial.value = true
}

defineExpose({ open })
</script>

<template>
  <div v-if="showTutorial" class="tutorial-overlay">
    <div class="tutorial-card">
      <h2>{{ t('tutorial.title') }}</h2>
      <div class="step-indicator">
        <span
          v-for="(s, i) in STEP_KEYS"
          :key="s"
          class="dot"
          :class="{ active: i === currentStep }"
        ></span>
      </div>
      <div class="step-content">
        <h3>{{ t(`tutorial.steps.${STEP_KEYS[currentStep]}.title`) }}</h3>
        <p>{{ t(`tutorial.steps.${STEP_KEYS[currentStep]}.desc`) }}</p>
      </div>
      <div class="tutorial-actions">
        <button @click="skipTutorial" class="btn-secondary">{{ t('tutorial.skip') }}</button>
        <button @click="nextStep" class="btn-primary">
          {{ currentStep < STEP_KEYS.length - 1 ? t('tutorial.next') : t('tutorial.start') }}
        </button>
      </div>
    </div>
  </div>
</template>

<style scoped>
.tutorial-overlay {
  position: fixed;
  top: 0;
  left: 0;
  right: 0;
  bottom: 0;
  background: rgba(0, 0, 0, 0.6);
  display: flex;
  align-items: center;
  justify-content: center;
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

.tutorial-card {
  background: var(--ui-surface);
  border-radius: 12px;
  padding: 32px;
  max-width: 480px;
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

h2 {
  margin: 0 0 24px 0;
  font-size: 24px;
  color: var(--ui-text);
}

.step-indicator {
  display: flex;
  gap: 8px;
  justify-content: center;
  margin-bottom: 24px;
}

.dot {
  width: 8px;
  height: 8px;
  border-radius: 50%;
  background: var(--ui-border);
  transition: all 0.3s;
}

.dot.active {
  width: 24px;
  border-radius: 4px;
  background: var(--ui-accent);
}

.step-content {
  min-height: 120px;
  margin-bottom: 24px;
}

h3 {
  margin: 0 0 12px 0;
  font-size: 18px;
  color: var(--ui-text);
}

p {
  margin: 0;
  font-size: 15px;
  color: var(--ui-text-muted);
  line-height: 1.6;
}

.tutorial-actions {
  display: flex;
  gap: 12px;
  justify-content: flex-end;
}

button {
  padding: 10px 20px;
  border: none;
  border-radius: 6px;
  font-size: 14px;
  font-weight: 500;
  cursor: pointer;
  transition: all 0.2s;
}

.btn-secondary {
  background: var(--ui-surface-muted);
  color: var(--ui-text-muted);
}

.btn-secondary:hover {
  background: var(--ui-border);
}

.btn-primary {
  background: var(--ui-accent);
  color: var(--ui-accent-text);
}

.btn-primary:hover {
  background: var(--ui-accent);
}
</style>
