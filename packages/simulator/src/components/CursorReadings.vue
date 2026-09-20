<script setup lang="ts">
// Cursor readings panel: one card per cursor, each showing the value of every
// scale at that cursor's position. In dual-face mode both sides are listed.
// A reading can be edited to move its cursor to the position that reads it.
//
// The card is laid out with exactly the rule's own maths (`computeFaceLayout`
// passed in as `layout`), so every row sits at the vertical position of the
// scale row it reads and the card is as tall as the rule body.
import { computed, ref } from 'vue'
import { useI18n } from 'vue-i18n'
import { storeToRefs } from 'pinia'
import { useSlideRuleStore, resolveCursorColor } from '../stores/slideRule'
import { getSections, readScaleValue, formatValue } from '@slide-rule/core'
import type { FaceLayout } from '@slide-rule/renderer'
import type { ScaleDefinition, SlideRuleSide } from '@slide-rule/core'
import { computeReadingRows } from './cursorReadingsRows'
import { cursorPositionForValue, slideOffsetForValue } from './cursorEdit'

// Matches SlideRule.vue's drag clamp.
const SLIDE_TRAVEL = 1

// The slide input only appears for the row being edited, so the panel stays
// clean until a reading is clicked.
const focusedKey = ref<string | null>(null)
function onRowFocusOut(event: FocusEvent): void {
  const next = event.relatedTarget as Node | null
  if (next === null || !(event.currentTarget as HTMLElement).contains(next)) focusedKey.value = null
}

const props = defineProps<{ layout: FaceLayout }>()

const { t } = useI18n()
const store = useSlideRuleStore()
const { dualFace, cursors, middleOffset, currentModel, currentTheme, visibleSides } =
  storeToRefs(store)

// Minimal shape needed to convert a typed reading back into a cursor position.
interface Reading {
  scale: ScaleDefinition
  value: number | null
  formatted: string
}

interface ReadingRowView extends Reading {
  key: string
  topPx: number
  heightPx: number
}

interface FaceView {
  side: SlideRuleSide
  showLabel: boolean
  labelTopPx: number
  rows: ReadingRowView[]
}

interface CursorBlockView {
  id: string
  color: string
  faces: FaceView[]
}

// Same sections the rule renders, in the same order.
const sidesWithSections = computed(() =>
  visibleSides.value.map((side) => ({ side, sections: getSections(currentModel.value, side) })),
)

// Row positions shared by every cursor (they only differ in their readings).
const readingsLayout = computed(() =>
  computeReadingRows(props.layout, sidesWithSections.value, dualFace.value),
)

// Enlarge the reading text to fill a rule row, capped so it stays readable
// rather than oversized on a wide face.
const readingFontPx = computed(() =>
  Math.max(6, Math.min(props.layout.rowHeightMm * props.layout.pxPerMm * 0.85, 22)),
)

// Groove/face separators use the theme's groove colour, muted so the line stays
// subtle against the card in every theme.
const separatorColor = computed(() => currentTheme.value.colors.gap)

// One card per cursor, in list order, each carrying its own colour.
const cursorBlocks = computed<CursorBlockView[]>(() =>
  cursors.value.map((cursor) => ({
    id: cursor.id,
    color: resolveCursorColor(cursor, currentTheme.value),
    faces: readingsLayout.value.faces.map((face) => ({
      side: face.side,
      showLabel: face.showLabel,
      labelTopPx: face.labelTopPx,
      rows: face.rows.map((row) => {
        // The slide is read at the cursor's local position on it.
        const localPos =
          row.scale.section === 'middle' ? cursor.position - middleOffset.value : cursor.position
        const value = readScaleValue(row.scale, localPos)
        return {
          key: row.key,
          scale: row.scale,
          value,
          formatted: formatValue(value),
          topPx: row.topPx,
          heightPx: row.heightPx,
        }
      }),
    })),
  })),
)

// On change/Enter, convert the typed value back to a position and move the
// cursor. Out-of-range or invalid input snaps back to the displayed reading.
function onValueChange(id: string, reading: Reading, e: Event): void {
  const input = e.target as HTMLInputElement
  if (input.value.trim() === '') {
    input.value = reading.formatted
    return
  }
  // The scale is read at the cursor's local position on the rule, so a movable
  // (middle) scale needs the slide offset added back; see cursorEdit.ts.
  const pos = cursorPositionForValue(reading.scale, Number(input.value), middleOffset.value)
  if (pos === null) {
    input.value = reading.formatted
    return
  }
  store.setCursorPosition(id, pos)
}

// The slide input: type the value a movable (middle) scale should read at this
// cursor, and move the slide to it. The cursor stays put; only `middleOffset`
// changes. Out-of-range or blank input snaps back.
function onSlideChange(id: string, reading: Reading, e: Event): void {
  const input = e.target as HTMLInputElement
  const cursor = cursors.value.find((c) => c.id === id)
  if (cursor === undefined) return
  if (input.value.trim() === '') {
    input.value = reading.formatted
    return
  }
  const offset = slideOffsetForValue(reading.scale, Number(input.value), cursor.position)
  if (offset === null) {
    input.value = reading.formatted
    return
  }
  middleOffset.value = Math.min(SLIDE_TRAVEL, Math.max(-SLIDE_TRAVEL, offset))
}
</script>

<template>
  <div v-if="cursorBlocks.length" class="cursor-readings">
    <div
      v-for="block in cursorBlocks"
      :key="block.id"
      class="cursor-block"
      :style="{
        height: `${readingsLayout.heightPx}px`,
        '--cursor-color': block.color,
        '--reading-font': `${readingFontPx}px`,
        '--separator-color': separatorColor,
      }"
    >
      <template v-for="face in block.faces" :key="face.side">
        <div v-if="face.showLabel" class="face-label" :style="{ top: `${face.labelTopPx}px` }">
          {{ t('side.' + face.side) }}
        </div>
        <div
          v-for="row in face.rows"
          :key="row.key"
          class="reading-row"
          :style="{ top: `${row.topPx}px`, height: `${row.heightPx}px` }"
          @focusin="focusedKey = row.key"
          @focusout="onRowFocusOut"
        >
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
          <!-- A movable (middle) scale also offers a slide input: typing here
               moves the slide, not the cursor. -->
          <input
            v-if="row.scale.section === 'middle' && row.value !== null && focusedKey === row.key"
            class="slide-value"
            type="number"
            step="any"
            :value="row.formatted"
            :title="t('readings.slideHint')"
            :aria-label="t('readings.slideHint')"
            @change="onSlideChange(block.id, row, $event)"
            @keyup.enter="onSlideChange(block.id, row, $event)"
          />
        </div>
      </template>

      <!-- One hairline per groove (plus the dual-face boundary), drawn from the
           same layout maths as the rows so the card reads as the rule's three
           parts. -->
      <div
        v-for="(separator, index) in readingsLayout.separators"
        :key="`separator-${index}`"
        class="section-separator"
        :style="{ top: `${separator}px` }"
      />

      <!-- Frame colour replaces the old cursor-colour header row; the delete
           button fades in on hover and stays reachable by keyboard. -->
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
</template>

<style scoped>
/* No chrome of its own: the panel is just the row of cursor cards. */
.cursor-readings {
  flex: 1;
  min-width: 0;
  display: flex;
  flex-direction: row;
  align-items: flex-start;
  gap: var(--cursor-card-gap, 12px);
  overflow-x: auto;
  overflow-y: auto;
}

/* Card frame uses the cursor's own colour. The frame is an inset shadow so it
   does not shift the absolutely positioned rows (which must line up with the
   rule's scale rows). */
.cursor-block {
  position: relative;
  box-sizing: border-box;
  flex: 0 0 var(--cursor-card-width, 220px);
  width: var(--cursor-card-width, 220px);
  background: var(--ui-page);
  border-radius: 6px;
}

/* The frame is an overlay, not an inset shadow: an inset shadow is painted
   below the child rows, so an opaque band (the face label) would break the
   line. Painted above the rows, the frame stays unbroken. */
.cursor-block::after {
  content: '';
  position: absolute;
  inset: 0;
  z-index: 3;
  border: 2px solid var(--cursor-color, #dc2626);
  border-radius: 6px;
  pointer-events: none;
}

/* Face-name band, matching the rule's `.face-label` (24px tall). */
.face-label {
  position: absolute;
  left: 0;
  right: 0;
  height: 24px;
  display: flex;
  align-items: center;
  padding-left: 8px;
  font-size: 12px;
  color: var(--ui-text-muted);
  background: var(--ui-surface-muted);
}

/* Groove / face-boundary hairline, mirroring the rule's own groove line
   (1px, theme groove colour, muted). */
.section-separator {
  position: absolute;
  left: 0;
  right: 0;
  height: 1px;
  background: var(--separator-color);
  opacity: 0.5;
  pointer-events: none;
}

/* One rule row: name on the left, editable value on the right. */
.reading-row {
  position: absolute;
  left: 0;
  right: 0;
  display: grid;
  grid-template-columns: minmax(0, 1fr) auto auto;
  align-items: center;
  column-gap: 4px;
  padding: 0 10px;
}

.scale-name {
  font-family: 'JetBrains Mono', 'Consolas', monospace;
  font-size: var(--reading-font, 12px);
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
  font-size: var(--reading-font, 12px);
  line-height: 1;
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

/* The slide input shares the reading look but reads as a different control:
   a dashed accent underline marks it as "moves the slide". */
.slide-value {
  width: 7ch;
  min-width: 0;
  padding: 0 4px;
  border: 1px solid transparent;
  border-bottom: 1px dashed color-mix(in srgb, var(--ui-accent) 55%, transparent);
  border-radius: 4px;
  background: transparent;
  font-family: 'JetBrains Mono', 'Consolas', monospace;
  font-size: var(--reading-font, 12px);
  line-height: 1;
  color: var(--ui-accent);
  text-align: left;
}

.slide-value:hover {
  border-color: var(--ui-border);
}

.slide-value:focus {
  outline: none;
  border-color: var(--ui-accent);
  background: var(--ui-surface);
}

.slide-value::-webkit-outer-spin-button,
.slide-value::-webkit-inner-spin-button {
  -webkit-appearance: none;
  margin: 0;
}

.slide-value[type='number'] {
  -moz-appearance: textfield;
  appearance: textfield;
}

/* Delete button: hidden until the pointer is over the card (or it is focused,
   which keeps it keyboard-reachable). */
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

.delete-btn:focus-visible {
  outline: 2px solid var(--cursor-color, var(--ui-accent));
  outline-offset: 1px;
}
</style>
