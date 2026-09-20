<script setup lang="ts">
// Circular readings panel: one card per cursor, each listing the value of every
// scale on the disc at that cursor's angle. A reading can be edited to move its
// cursor to the angle that reads it, exactly as the linear panel does.
import { computed } from 'vue'
import { useI18n } from 'vue-i18n'
import { storeToRefs } from 'pinia'
import { useSlideRuleStore, resolveCursorColor } from '../stores/slideRule'
import { getSections, readScaleValue, formatValue, positionForValue } from '@slide-rule/core'
import type { ScaleDefinition, SlideRuleSide } from '@slide-rule/core'
import { circularCursorPosition, circularLocalPosition } from './circularReadings'

const { t } = useI18n()
const store = useSlideRuleStore()
const { cursors, discOffset, currentModel, currentTheme, visibleSides } = storeToRefs(store)

interface FaceGroup {
  side: SlideRuleSide
  scales: ScaleDefinition[]
}

// Every scale of every visible face, in section order (upper / middle / lower).
const faceGroups = computed<FaceGroup[]>(() =>
  visibleSides.value.map((side) => {
    const group = getSections(currentModel.value, side)
    return { side, scales: [...group.upper, ...group.middle, ...group.lower] }
  }),
)
const showFaceLabels = computed(() => faceGroups.value.length > 1)

interface ReadingRow {
  key: string
  scale: ScaleDefinition
  value: number | null
  formatted: string
}

interface CursorBlock {
  id: string
  color: string
  faces: { side: SlideRuleSide; rows: ReadingRow[] }[]
}

// A cursor reads a movable scale at its local position on the turned rotor:
// screen angle minus the rotor offset (see circularReadings.ts).
const cursorBlocks = computed<CursorBlock[]>(() =>
  cursors.value.map((cursor) => ({
    id: cursor.id,
    color: resolveCursorColor(cursor, currentTheme.value),
    faces: faceGroups.value.map((face) => ({
      side: face.side,
      rows: face.scales.map((scale) => {
        const value = readScaleValue(
          scale,
          circularLocalPosition(cursor.position, discOffset.value, scale.isMovable),
        )
        return {
          key: `${face.side}-${scale.section}-${scale.id}`,
          scale,
          value,
          formatted: formatValue(value),
        }
      }),
    })),
  })),
)

// On change/Enter, convert the typed value back to an angle and move the
// cursor; out-of-range or invalid input snaps back to the displayed reading.
function onValueChange(id: string, row: ReadingRow, e: Event): void {
  const input = e.target as HTMLInputElement
  if (input.value.trim() === '') {
    input.value = row.formatted
    return
  }
  const pos = positionForValue(row.scale, Number(input.value))
  if (pos === null) {
    input.value = row.formatted
    return
  }
  store.setCursorPosition(id, circularCursorPosition(pos, discOffset.value, row.scale.isMovable))
}
</script>

<template>
  <div class="circular-readings">
    <div class="readings-toolbar">
      <span class="readings-title">{{ t('circular.readings') }}</span>
      <button class="reset-rotation" @click="store.resetDisc()">
        ↺ {{ t('circular.resetRotation') }}
      </button>
    </div>

    <div class="cursor-cards">
      <div
        v-for="block in cursorBlocks"
        :key="block.id"
        class="cursor-block"
        :style="{ '--cursor-color': block.color }"
      >
        <template v-for="face in block.faces" :key="face.side">
          <div v-if="showFaceLabels" class="face-label">{{ t('side.' + face.side) }}</div>
          <div v-for="row in face.rows" :key="row.key" class="reading-row">
            <span class="scale-name" :style="{ color: row.scale.color }">
              {{ row.scale.name }}
            </span>
            <input
              class="scale-value"
              type="number"
              step="any"
              :value="row.value === null ? '' : row.formatted"
              :disabled="row.value === null"
              :placeholder="row.value === null ? '—' : ''"
              :title="row.value === null ? '' : t('readings.valueHint')"
              @change="onValueChange(block.id, row, $event)"
              @keyup.enter="onValueChange(block.id, row, $event)"
            />
          </div>
        </template>

        <button
          class="delete-btn"
          :title="t('readings.delete')"
          :aria-label="t('readings.delete')"
          @click="store.removeCursor(block.id)"
        >
          ✕
        </button>
      </div>
    </div>
  </div>
</template>

<style scoped>
.circular-readings {
  flex: 1;
  min-width: 0;
  display: flex;
  flex-direction: column;
  gap: 8px;
}

.readings-toolbar {
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 8px;
}

.readings-title {
  font-size: 13px;
  font-weight: 700;
  color: var(--ui-text);
}

/* Face band between the front and back scale lists in dual-face mode. */
.face-label {
  padding: 2px 8px;
  font-size: 11px;
  font-weight: 600;
  color: var(--ui-text-muted);
  background: var(--ui-surface-muted);
  border-radius: 3px;
}

.reset-rotation {
  padding: 4px 8px;
  font-size: 12px;
  border: 1px solid var(--ui-border);
  background: var(--ui-surface);
  color: var(--ui-text);
  border-radius: 6px;
  cursor: pointer;
  white-space: nowrap;
}

.reset-rotation:hover {
  background: var(--ui-surface-muted);
}

.cursor-cards {
  display: flex;
  flex-direction: row;
  align-items: flex-start;
  gap: var(--cursor-card-gap, 12px);
  overflow-x: auto;
}

/* Card frame uses the cursor's own colour, like the linear panel. */
.cursor-block {
  position: relative;
  box-sizing: border-box;
  flex: 0 0 var(--cursor-card-width, 220px);
  width: var(--cursor-card-width, 220px);
  padding: 6px 0;
  background: var(--ui-page);
  border-radius: 6px;
  box-shadow: inset 0 0 0 2px var(--cursor-color, #dc2626);
}

.reading-row {
  display: grid;
  grid-template-columns: minmax(0, 1fr) auto;
  align-items: center;
  column-gap: 8px;
  padding: 2px 10px;
}

.scale-name {
  font-family: 'JetBrains Mono', 'Consolas', monospace;
  font-size: 12px;
  font-weight: 700;
  overflow: hidden;
  text-overflow: ellipsis;
  white-space: nowrap;
}

.scale-value {
  width: 8ch;
  min-width: 0;
  padding: 0 4px;
  border: 1px solid transparent;
  border-radius: 4px;
  background: transparent;
  font-family: 'JetBrains Mono', 'Consolas', monospace;
  font-size: 12px;
  line-height: 1.4;
  color: var(--ui-text);
  text-align: left;
}

.scale-value:hover:not(:disabled) {
  border-color: var(--ui-border);
}

.scale-value:focus {
  outline: none;
  border-color: var(--ui-accent);
  background: var(--ui-surface);
}

.scale-value:disabled {
  color: var(--ui-text-muted);
  font-style: italic;
  cursor: not-allowed;
}

.scale-value::-webkit-outer-spin-button,
.scale-value::-webkit-inner-spin-button {
  -webkit-appearance: none;
  margin: 0;
}

.scale-value[type='number'] {
  -moz-appearance: textfield;
  appearance: textfield;
}

.delete-btn {
  position: absolute;
  top: 4px;
  right: 4px;
  z-index: 2;
  width: 20px;
  height: 20px;
  padding: 0;
  font-size: 11px;
  line-height: 1;
  color: var(--ui-text-muted);
  border: 1px solid var(--ui-border);
  background: var(--ui-surface);
  border-radius: 4px;
  cursor: pointer;
  opacity: 0;
  pointer-events: none;
  transition: opacity 0.15s ease;
}

.cursor-block:hover .delete-btn,
.delete-btn:focus-visible {
  opacity: 1;
  pointer-events: auto;
}

.delete-btn:hover {
  color: #dc2626;
  border-color: #fecaca;
  background: #fef2f2;
}
</style>
