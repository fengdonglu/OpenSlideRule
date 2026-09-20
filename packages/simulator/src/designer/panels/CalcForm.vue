<script setup lang="ts">
import { computed } from 'vue'
import { useI18n } from 'vue-i18n'
import type { LabelFormatSpec, MapSpec } from '@slide-rule/core'
import { useDesignerStore } from '../store'
import { errorPaths, subtreeHasError } from '../errors'
import { defaultMap, type PresetKind } from '../model'

const { t } = useI18n()
const store = useDesignerStore()
const calc = computed(() => store.selectedCalculation)
const paths = computed(() => errorPaths(store.errors))
// The validator reports resolved calculations at the scale they were inlined
// into, so this path is correct for both inline and named-ref calculations.
const calcPath = computed(() => {
  const selection = store.selection
  return selection === null
    ? null
    : `faces.${selection.face}.${selection.section}[${selection.index}].calculation`
})

function exactError(field: string): boolean {
  return calcPath.value !== null && paths.value.has(`${calcPath.value}.${field}`)
}

// The domain pair shares errors such as `domain` and `domain[0]`, so mark both
// inputs when anything under the domain path is invalid.
function subtreeError(field: string): boolean {
  return calcPath.value !== null && subtreeHasError(paths.value, `${calcPath.value}.${field}`)
}
const sharedRef = computed(() =>
  store.calculationTarget?.kind === 'named' ? store.calculationTarget.name : null,
)
const labelFormatKind = computed(() => {
  const format = calc.value?.labelFormat
  if (format === undefined || format === 'default') return ''
  return typeof format === 'string' ? format : 'number'
})

function num(event: Event): number {
  return Number((event.target as HTMLInputElement).value)
}
function text(event: Event): string {
  return (event.target as HTMLInputElement).value
}
function checked(event: Event): boolean {
  return (event.target as HTMLInputElement).checked
}
function level(event: Event): 1 | 2 | 3 {
  return Number((event.target as HTMLSelectElement).value) as 1 | 2 | 3
}

function onSeedPreset(event: Event): void {
  const target = event.target as HTMLSelectElement
  const kind = target.value
  if (kind !== '') {
    store.seedCalculationPreset(kind as PresetKind)
    // Reset the control so the same preset can be re-applied.
    target.value = ''
  }
}

function onDomainMin(event: Event): void {
  if (calc.value === null) return
  store.setDomain([num(event), calc.value.domain[1]])
}
function onDomainMax(event: Event): void {
  if (calc.value === null) return
  store.setDomain([calc.value.domain[0], num(event)])
}

function onMapKind(event: Event): void {
  store.setMap(defaultMap(text(event) as MapSpec['kind']))
}
function onMapAnchor(event: Event): void {
  const map = calc.value?.map
  if (map?.kind !== 'log') return
  store.setMap({ ...map, anchor: num(event) })
}
function onMapNormalize(event: Event): void {
  const map = calc.value?.map
  if (map?.kind !== 'log') return
  store.setMap(checked(event) ? { ...map, normalize: true } : { kind: 'log', anchor: map.anchor })
}
function onMapFn(event: Event): void {
  const map = calc.value?.map
  if (map?.kind !== 'fn') return
  store.setMap({ ...map, fn: text(event) as 'ln' | 'sin' | 'tan' | 'sinh' | 'tanh' })
}
function onValueFn(event: Event): void {
  const map = calc.value?.map
  if (map?.kind !== 'valueFn') return
  store.setMap({ ...map, fn: text(event) as 'cosh' | 'sech' })
}
function onMapFrom(event: Event): void {
  const map = calc.value?.map
  if (map?.kind !== 'fn' && map?.kind !== 'valueFn') return
  store.setMap({ ...map, from: num(event) })
}
function onExprPosition(event: Event): void {
  const map = calc.value?.map
  if (map?.kind !== 'expr') return
  store.setMap({ ...map, position: text(event) })
}
function onExprInverse(event: Event): void {
  const map = calc.value?.map
  if (map?.kind !== 'expr') return
  const inverse = text(event)
  const next: MapSpec = { kind: 'expr', position: map.position }
  if (inverse !== '') next.inverse = inverse
  store.setMap(next)
}

function onDecades(event: Event): void {
  const raw = (event.target as HTMLInputElement).value
  store.setDecades(raw === '' ? undefined : Number(raw))
}

function onDecreasing(event: Event): void {
  store.setDecreasing(checked(event) ? true : undefined)
}

function onReadKind(event: Event): void {
  const value = text(event)
  if (value === '') {
    store.setRead(undefined)
    return
  }
  const read = calc.value?.read
  store.setRead({ kind: 'reciprocal', scale: read?.scale ?? 1 })
}
function onReadScale(event: Event): void {
  const read = calc.value?.read
  if (read === undefined) return
  store.setRead({ kind: 'reciprocal', scale: num(event) })
}

function onLabelFormat(event: Event): void {
  const value = text(event)
  if (value === '' || value === 'default') {
    store.setLabelFormat(undefined)
    return
  }
  if (value === 'number') {
    const current = calc.value?.labelFormat
    const decimals = typeof current === 'object' ? current.decimals : 2
    store.setLabelFormat({ kind: 'number', decimals })
    return
  }
  store.setLabelFormat(value as LabelFormatSpec)
}
function onLabelDecimals(event: Event): void {
  const current = calc.value?.labelFormat
  if (typeof current !== 'object') return
  store.setLabelFormat({ kind: 'number', decimals: num(event) })
}

function onLabelLevel(event: Event): void {
  const value = text(event)
  if (value === '') {
    store.setLabelLevel(undefined)
    return
  }
  if (value === 'keep') {
    store.setLabelLevel('keep')
    return
  }
  store.setLabelLevel(Number(value) as 1 | 2 | 3)
}

function onLabelValue(index: number, event: Event): void {
  const entry = calc.value?.labels?.[index]
  if (entry === undefined) return
  const value = num(event)
  store.setLabel(index, typeof entry === 'number' ? value : { value, text: entry.text })
}
function onLabelText(index: number, event: Event): void {
  const entry = calc.value?.labels?.[index]
  if (entry === undefined) return
  const value = text(event)
  if (typeof entry === 'number') {
    // A numeric entry only becomes a text label once some text is typed; an
    // empty box leaves it as the plain number.
    if (value !== '') store.setLabel(index, { value: entry, text: value })
    return
  }
  store.setLabel(index, value === '' ? entry.value : { value: entry.value, text: value })
}

function onMarkValue(index: number, event: Event): void {
  const entry = calc.value?.marks?.[index]
  if (entry === undefined) return
  store.setMark(index, { value: num(event), label: entry.label })
}
function onMarkInfinity(index: number, event: Event): void {
  const entry = calc.value?.marks?.[index]
  if (entry === undefined) return
  if (checked(event)) {
    store.setMark(index, { value: 'infinity', label: entry.label })
    return
  }
  // Back to a finite mark: recover the previous value from the label when it
  // parses, otherwise fall back to 0 rather than discarding it silently.
  const parsed = Number(entry.label)
  store.setMark(index, { value: Number.isFinite(parsed) ? parsed : 0, label: entry.label })
}
function onMarkLabel(index: number, event: Event): void {
  const entry = calc.value?.marks?.[index]
  if (entry === undefined) return
  store.setMark(index, { value: entry.value, label: text(event) })
}
</script>

<template>
  <section v-if="store.selectedScale !== null" class="designer-panel">
    <h2 class="designer-panel-title">{{ t('designer.calculation') }}</h2>

    <p v-if="calc === null" class="designer-muted">{{ t('designer.calcMissingRef') }}</p>

    <template v-else>
      <p v-if="sharedRef !== null" class="designer-muted">
        {{ t('designer.calcRefShared', { ref: sharedRef }) }}
      </p>

      <label class="designer-field">
        <span>{{ t('designer.seedPreset') }}</span>
        <select :value="''" @change="onSeedPreset">
          <option value="" disabled>{{ t('designer.seedPreset') }}</option>
          <option value="log">{{ t('designer.mapKindLog') }}</option>
          <option value="linear">{{ t('designer.mapKindLinear') }}</option>
          <option value="fn">{{ t('designer.mapKindFn') }}</option>
          <option value="valueFn">{{ t('designer.mapKindValueFn') }}</option>
          <option value="expr">{{ t('designer.mapKindExpr') }}</option>
        </select>
      </label>

      <h3 class="designer-subtitle">{{ t('designer.domain') }}</h3>
      <div class="designer-subgroup">
        <label class="designer-field">
          <span>{{ t('designer.domainMin') }}</span>
          <input
            type="number"
            :value="calc.domain[0]"
            :class="{ 'is-error': subtreeError('domain') }"
            @input="onDomainMin"
          />
        </label>
        <label class="designer-field">
          <span>{{ t('designer.domainMax') }}</span>
          <input
            type="number"
            :value="calc.domain[1]"
            :class="{ 'is-error': subtreeError('domain') }"
            @input="onDomainMax"
          />
        </label>
      </div>

      <h3 class="designer-subtitle">{{ t('designer.mapKind') }}</h3>
      <div class="designer-subgroup">
        <label class="designer-field">
          <span>{{ t('designer.mapKind') }}</span>
          <select
            :value="calc.map.kind"
            :class="{ 'is-error': exactError('map') }"
            @change="onMapKind"
          >
            <option value="log">{{ t('designer.mapKindLog') }}</option>
            <option value="linear">{{ t('designer.mapKindLinear') }}</option>
            <option value="fn">{{ t('designer.mapKindFn') }}</option>
            <option value="valueFn">{{ t('designer.mapKindValueFn') }}</option>
            <option value="expr">{{ t('designer.mapKindExpr') }}</option>
          </select>
        </label>

        <template v-if="calc.map.kind === 'log'">
          <label class="designer-field">
            <span>{{ t('designer.mapAnchor') }}</span>
            <input
              type="number"
              :value="calc.map.anchor"
              :class="{ 'is-error': exactError('map.anchor') }"
              @input="onMapAnchor"
            />
          </label>
          <label class="designer-field designer-field-check">
            <input
              type="checkbox"
              :checked="calc.map.normalize === true"
              :class="{ 'is-error': exactError('map.normalize') }"
              @change="onMapNormalize"
            />
            <span>{{ t('designer.mapNormalize') }}</span>
          </label>
        </template>

        <template v-else-if="calc.map.kind === 'fn'">
          <label class="designer-field">
            <span>{{ t('designer.mapFn') }}</span>
            <select
              :value="calc.map.fn"
              :class="{ 'is-error': exactError('map.fn') }"
              @change="onMapFn"
            >
              <option value="ln">ln</option>
              <option value="sin">sin</option>
              <option value="tan">tan</option>
              <option value="sinh">sinh</option>
              <option value="tanh">tanh</option>
            </select>
          </label>
          <label class="designer-field">
            <span>{{ t('designer.mapFrom') }}</span>
            <input
              type="number"
              :value="calc.map.from"
              :class="{ 'is-error': exactError('map.from') }"
              @input="onMapFrom"
            />
          </label>
        </template>

        <template v-else-if="calc.map.kind === 'valueFn'">
          <label class="designer-field">
            <span>{{ t('designer.mapFn') }}</span>
            <select
              :value="calc.map.fn"
              :class="{ 'is-error': exactError('map.fn') }"
              @change="onValueFn"
            >
              <option value="cosh">cosh</option>
              <option value="sech">sech</option>
            </select>
          </label>
          <label class="designer-field">
            <span>{{ t('designer.mapFrom') }}</span>
            <input
              type="number"
              :value="calc.map.from"
              :class="{ 'is-error': exactError('map.from') }"
              @input="onMapFrom"
            />
          </label>
        </template>

        <template v-else-if="calc.map.kind === 'expr'">
          <label class="designer-field">
            <span>{{ t('designer.mapPosition') }}</span>
            <input
              type="text"
              :value="calc.map.position"
              :class="{ 'is-error': exactError('map.position') }"
              @input="onExprPosition"
            />
          </label>
          <label class="designer-field">
            <span>{{ t('designer.mapInverse') }}</span>
            <input
              type="text"
              :value="calc.map.inverse ?? ''"
              :class="{ 'is-error': exactError('map.inverse') }"
              @input="onExprInverse"
            />
          </label>
        </template>
      </div>

      <label class="designer-field">
        <span>{{ t('designer.decades') }}</span>
        <input type="number" :value="calc.decades ?? ''" @input="onDecades" />
      </label>
      <label class="designer-field designer-field-check">
        <input type="checkbox" :checked="calc.decreasing === true" @change="onDecreasing" />
        <span>{{ t('designer.decreasing') }}</span>
      </label>

      <label class="designer-field">
        <span>{{ t('designer.readKind') }}</span>
        <select :value="calc.read?.kind ?? ''" @change="onReadKind">
          <option value="">{{ t('designer.readNone') }}</option>
          <option value="reciprocal">{{ t('designer.readReciprocal') }}</option>
        </select>
      </label>
      <label v-if="calc.read?.kind === 'reciprocal'" class="designer-field">
        <span>{{ t('designer.readScale') }}</span>
        <input type="number" :value="calc.read.scale" @input="onReadScale" />
      </label>

      <label class="designer-field">
        <span>{{ t('designer.labelFormat') }}</span>
        <select :value="labelFormatKind" @change="onLabelFormat">
          <option value="">{{ t('designer.labelFormatDefault') }}</option>
          <option value="folded">{{ t('designer.labelFormatFolded') }}</option>
          <option value="linearFraction">{{ t('designer.labelFormatLinearFraction') }}</option>
          <option value="degree">{{ t('designer.formatDegree') }}</option>
          <option value="degreeBare">{{ t('designer.labelFormatDegreeBare') }}</option>
          <option value="degreeMinute">{{ t('designer.labelFormatDegreeMinute') }}</option>
          <option value="argument">{{ t('designer.labelFormatArgument') }}</option>
          <option value="sechZero">{{ t('designer.labelFormatSechZero') }}</option>
          <option value="number">{{ t('designer.labelFormatNumber') }}</option>
        </select>
      </label>
      <label v-if="labelFormatKind === 'number'" class="designer-field">
        <span>{{ t('designer.labelDecimals') }}</span>
        <input
          type="number"
          :value="typeof calc.labelFormat === 'object' ? calc.labelFormat.decimals : ''"
          @input="onLabelDecimals"
        />
      </label>

      <label class="designer-field">
        <span>{{ t('designer.labelLevel') }}</span>
        <select :value="calc.labelLevel ?? ''" @change="onLabelLevel">
          <option value="">{{ t('designer.formatNone') }}</option>
          <option value="1">1</option>
          <option value="2">2</option>
          <option value="3">3</option>
          <option value="keep">{{ t('designer.labelLevelKeep') }}</option>
        </select>
      </label>

      <h3 class="designer-subtitle">{{ t('designer.intervals') }}</h3>
      <div v-for="(interval, i) in calc.intervals" :key="i" class="designer-subgroup">
        <label class="designer-field">
          <span>{{ t('designer.intervalFrom') }}</span>
          <input
            type="number"
            :value="interval.from"
            @input="store.updateInterval(i, { from: num($event) })"
          />
        </label>
        <label class="designer-field">
          <span>{{ t('designer.intervalTo') }}</span>
          <input
            type="number"
            :value="interval.to"
            @input="store.updateInterval(i, { to: num($event) })"
          />
        </label>

        <h4 class="designer-subtitle">{{ t('designer.steps') }}</h4>
        <div v-for="(step, j) in interval.steps" :key="j" class="designer-note-part">
          <input
            type="number"
            :value="step.step"
            :placeholder="t('designer.step')"
            @input="store.updateIntervalStep(i, j, { step: num($event) })"
          />
          <select
            :value="String(step.level)"
            :title="t('designer.level')"
            @change="store.updateIntervalStep(i, j, { level: level($event) })"
          >
            <option value="1">1</option>
            <option value="2">2</option>
            <option value="3">3</option>
          </select>
          <button
            class="designer-remove"
            :title="t('designer.removeStep')"
            @click="store.removeIntervalStep(i, j)"
          >
            ✕
          </button>
        </div>
        <button class="designer-add" @click="store.addIntervalStep(i)">
          {{ t('designer.addStep') }}
        </button>

        <h4 class="designer-subtitle">{{ t('designer.intervalLabels') }}</h4>
        <div v-for="(labelValue, j) in interval.labels ?? []" :key="j" class="designer-note-part">
          <input
            type="number"
            :value="labelValue"
            @input="store.updateIntervalLabel(i, j, num($event))"
          />
          <button
            class="designer-remove"
            :title="t('designer.removeStep')"
            @click="store.removeIntervalLabel(i, j)"
          >
            ✕
          </button>
        </div>
        <button class="designer-add" @click="store.addIntervalLabel(i)">
          {{ t('designer.addIntervalLabel') }}
        </button>

        <button class="designer-add" @click="store.removeInterval(i)">
          {{ t('designer.removeInterval') }}
        </button>
      </div>
      <button class="designer-add" @click="store.addInterval()">
        {{ t('designer.addInterval') }}
      </button>

      <h3 class="designer-subtitle">{{ t('designer.labels') }}</h3>
      <div v-for="(entry, i) in calc.labels ?? []" :key="i" class="designer-note-part">
        <input
          type="number"
          :value="typeof entry === 'number' ? entry : entry.value"
          :placeholder="t('designer.labelValue')"
          @input="onLabelValue(i, $event)"
        />
        <input
          type="text"
          :value="typeof entry === 'number' ? '' : entry.text"
          :placeholder="t('designer.labelText')"
          @input="onLabelText(i, $event)"
        />
        <button
          class="designer-remove"
          :title="t('designer.removeStep')"
          @click="store.removeLabel(i)"
        >
          ✕
        </button>
      </div>
      <button class="designer-add" @click="store.addLabel()">
        {{ t('designer.addLabel') }}
      </button>

      <h3 class="designer-subtitle">{{ t('designer.marks') }}</h3>
      <div v-for="(entry, i) in calc.marks ?? []" :key="i" class="designer-note-part">
        <input
          type="number"
          :value="typeof entry.value === 'number' ? entry.value : ''"
          :disabled="entry.value === 'infinity'"
          :placeholder="t('designer.markValue')"
          @input="onMarkValue(i, $event)"
        />
        <label class="designer-field-check">
          <input
            type="checkbox"
            :checked="entry.value === 'infinity'"
            @change="onMarkInfinity(i, $event)"
          />
          <span>{{ t('designer.markInfinity') }}</span>
        </label>
        <input
          type="text"
          :value="entry.label"
          :placeholder="t('designer.markLabel')"
          @input="onMarkLabel(i, $event)"
        />
        <button
          class="designer-remove"
          :title="t('designer.removeStep')"
          @click="store.removeMark(i)"
        >
          ✕
        </button>
      </div>
      <button class="designer-add" @click="store.addMark()">
        {{ t('designer.addMark') }}
      </button>
    </template>
  </section>
</template>

<style scoped>
.designer-note-part {
  display: flex;
  align-items: center;
  gap: 6px;
  flex-wrap: wrap;
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
