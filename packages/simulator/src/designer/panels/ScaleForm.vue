<script setup lang="ts">
import { computed } from 'vue'
import { useI18n } from 'vue-i18n'
import { SCALE_TYPES } from '@slide-rule/core'
import { useDesignerStore } from '../store'
import { errorPaths, subtreeHasError } from '../errors'
import { noteToParts } from '../model'

const { t } = useI18n()
const store = useDesignerStore()
const scale = computed(() => store.selectedScale?.scale ?? null)
const paths = computed(() => errorPaths(store.errors))
const scalePath = computed(() => {
  const selection = store.selection
  return selection === null
    ? null
    : `faces.${selection.face}.${selection.section}[${selection.index}]`
})
const scaleHasError = computed(
  () => scalePath.value !== null && subtreeHasError(paths.value, scalePath.value),
)

function fieldError(field: 'id' | 'name'): boolean {
  return scalePath.value !== null && paths.value.has(`${scalePath.value}.${field}`)
}

function text(event: Event): string {
  return (event.target as HTMLInputElement).value
}
function onType(event: Event): void {
  store.setScaleField({ type: text(event) as (typeof SCALE_TYPES)[number] })
}
function onOrientation(event: Event): void {
  store.setScaleField({ orientation: text(event) as 'increasing' | 'decreasing' })
}
function onNumbersBelow(event: Event): void {
  store.setScaleField({ numbersBelow: (event.target as HTMLInputElement).checked })
}
function onTickEdge(event: Event): void {
  const value = text(event)
  store.setScaleField({ tickEdge: value === '' ? undefined : (value as 'roof' | 'floor') })
}
function onSharedFormat(index: number, event: Event): void {
  const value = text(event)
  store.updateSharedLabel(index, {
    format: value === '' ? undefined : (value as 'degree' | 'bare'),
  })
}
function onNotePart(index: number, partIndex: number, event: Event): void {
  if (scale.value === null) return
  const parts = noteToParts(scale.value.notes?.[index] ?? '')
  parts[partIndex] = { ...parts[partIndex], text: text(event) }
  store.setNoteParts(index, parts)
}
function onNotePartRed(index: number, partIndex: number, event: Event): void {
  if (scale.value === null) return
  const parts = noteToParts(scale.value.notes?.[index] ?? '')
  const red = (event.target as HTMLInputElement).checked
  parts[partIndex] = red
    ? { text: parts[partIndex].text, red: true }
    : { text: parts[partIndex].text }
  store.setNoteParts(index, parts)
}
function addNotePart(index: number): void {
  if (scale.value === null) return
  const parts = noteToParts(scale.value.notes?.[index] ?? '')
  parts.push({ text: '' })
  store.setNoteParts(index, parts)
}
function removeNotePart(index: number, partIndex: number): void {
  if (scale.value === null) return
  const parts = noteToParts(scale.value.notes?.[index] ?? '')
  parts.splice(partIndex, 1)
  store.setNoteParts(index, parts)
}
</script>

<template>
  <section class="designer-panel" :class="{ 'is-error': scaleHasError }">
    <h2 class="designer-panel-title">{{ t('designer.scale') }}</h2>
    <p v-if="scale === null" class="designer-muted">{{ t('designer.noSelection') }}</p>
    <template v-else>
      <label class="designer-field">
        <span>{{ t('designer.scaleId') }}</span>
        <input
          type="text"
          :value="scale.id"
          :class="{ 'is-error': fieldError('id') }"
          @input="store.setScaleField({ id: text($event) })"
        />
      </label>
      <label class="designer-field">
        <span>{{ t('designer.scaleName') }}</span>
        <input
          type="text"
          :value="scale.name"
          :class="{ 'is-error': fieldError('name') }"
          @input="store.setScaleField({ name: text($event) })"
        />
      </label>
      <label class="designer-field">
        <span>{{ t('designer.scaleType') }}</span>
        <select :value="scale.type" @change="onType">
          <option v-for="type in SCALE_TYPES" :key="type" :value="type">{{ type }}</option>
        </select>
      </label>
      <label class="designer-field">
        <span>{{ t('designer.orientation') }}</span>
        <select :value="scale.orientation" @change="onOrientation">
          <option value="increasing">{{ t('designer.orientationIncreasing') }}</option>
          <option value="decreasing">{{ t('designer.orientationDecreasing') }}</option>
        </select>
      </label>
      <label class="designer-field designer-field-check">
        <input type="checkbox" :checked="scale.numbersBelow ?? false" @change="onNumbersBelow" />
        <span>{{ t('designer.numbersBelow') }}</span>
      </label>
      <label class="designer-field">
        <span>{{ t('designer.tickEdge') }}</span>
        <select :value="scale.tickEdge ?? ''" @change="onTickEdge">
          <option value="">{{ t('designer.tickEdgeNone') }}</option>
          <option value="roof">{{ t('designer.tickEdgeRoof') }}</option>
          <option value="floor">{{ t('designer.tickEdgeFloor') }}</option>
        </select>
      </label>

      <h3 class="designer-subtitle">{{ t('designer.sharedLabels') }}</h3>
      <div
        v-for="(label, index) in scale.sharedLabels ?? []"
        :key="index"
        class="designer-subgroup"
      >
        <label class="designer-field">
          <span>{{ t('designer.sharedLabelId') }}</span>
          <input
            type="text"
            :value="label.id"
            @input="store.updateSharedLabel(index, { id: text($event) })"
          />
        </label>
        <label class="designer-field">
          <span>{{ t('designer.sharedLabelName') }}</span>
          <input
            type="text"
            :value="label.name"
            @input="store.updateSharedLabel(index, { name: text($event) })"
          />
        </label>
        <label class="designer-field">
          <span>{{ t('designer.orientation') }}</span>
          <select
            :value="label.orientation"
            @change="
              store.updateSharedLabel(index, {
                orientation: text($event) as 'increasing' | 'decreasing',
              })
            "
          >
            <option value="increasing">{{ t('designer.orientationIncreasing') }}</option>
            <option value="decreasing">{{ t('designer.orientationDecreasing') }}</option>
          </select>
        </label>
        <label class="designer-field">
          <span>{{ t('designer.sharedLabelFormat') }}</span>
          <select :value="label.format ?? ''" @change="onSharedFormat(index, $event)">
            <option value="">{{ t('designer.formatNone') }}</option>
            <option value="degree">{{ t('designer.formatDegree') }}</option>
            <option value="bare">{{ t('designer.formatBare') }}</option>
          </select>
        </label>
        <button
          class="designer-remove"
          :title="t('designer.removeSharedLabel')"
          @click="store.removeSharedLabel(index)"
        >
          ✕
        </button>
      </div>
      <button class="designer-add" @click="store.addSharedLabel()">
        {{ t('designer.addSharedLabel') }}
      </button>

      <h3 class="designer-subtitle">{{ t('designer.notes') }}</h3>
      <div v-for="(note, index) in scale.notes ?? []" :key="index" class="designer-subgroup">
        <div
          v-for="(part, partIndex) in noteToParts(note)"
          :key="partIndex"
          class="designer-note-part"
        >
          <input
            type="text"
            :value="part.text"
            :placeholder="t('designer.notePartText')"
            @input="onNotePart(index, partIndex, $event)"
          />
          <label class="designer-field-check">
            <input
              type="checkbox"
              :checked="part.red === true"
              @change="onNotePartRed(index, partIndex, $event)"
            />
            <span>{{ t('designer.notePartRed') }}</span>
          </label>
          <button
            class="designer-remove"
            :title="t('designer.removeNotePart')"
            @click="removeNotePart(index, partIndex)"
          >
            ✕
          </button>
        </div>
        <button @click="addNotePart(index)">{{ t('designer.addNotePart') }}</button>
        <button @click="store.removeNote(index)">{{ t('designer.removeNote') }}</button>
      </div>
      <button class="designer-add" @click="store.addNote()">{{ t('designer.addNote') }}</button>

      <button class="designer-add" @click="store.duplicateScale()">
        {{ t('designer.duplicateScale') }}
      </button>
    </template>
  </section>
</template>

<style scoped>
.designer-note-part {
  display: flex;
  align-items: center;
  gap: 6px;
}

.designer-note-part > input {
  flex: 1;
  min-width: 0;
}

.designer-add {
  margin-top: 6px;
}

.designer-muted {
  margin: 4px 0 0;
  font-size: 12px;
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

input,
select {
  padding: 5px 8px;
  border: 1px solid var(--ui-border);
  border-radius: 6px;
  font-size: 13px;
  background: var(--ui-surface);
  color: var(--ui-text);
}
</style>
