<script setup lang="ts">
// One section = one millimetre-coordinate SVG band containing its scale rows.
// The drawing lives in @slide-rule/renderer; this component only supplies the
// Vue state (i18n titles, theme) and drives the imperative renderer.
import { nextTick, onMounted, ref, watch } from 'vue'
import { useI18n } from 'vue-i18n'
import { storeToRefs } from 'pinia'
import { useSlideRuleStore } from '../stores/slideRule'
import type { ScaleDefinition, ScaleSection } from '@slide-rule/core'
import { measureRadicals, renderSection, type FaceLayout } from '@slide-rule/renderer'

const props = defineProps<{
  scales: ScaleDefinition[]
  section: ScaleSection
  layout: FaceLayout
}>()

const { t, locale } = useI18n()
const store = useSlideRuleStore()
const { currentTheme } = storeToRefs(store)

const svgEl = ref<SVGSVGElement | null>(null)

function draw(): void {
  if (!svgEl.value) return
  renderSection(svgEl.value, {
    scales: props.scales,
    section: props.section,
    layout: props.layout,
    theme: currentTheme.value,
    titleOf: (scale) => t('scaleDesc.' + scale.name),
  })
}

function remeasure(): void {
  if (!svgEl.value) return
  measureRadicals(svgEl.value, props.layout.numeralMm * 0.9)
}

onMounted(async () => {
  draw()
  await nextTick()
  remeasure()
  // Re-measure once the web font replaces the fallback and the glyph box moves.
  document.fonts?.ready.then(() => remeasure())
})

// Model switch / numeral-ratio change / section remount / theme or language
// switch: redraw the whole band, then re-measure the radical vincula.
watch(
  [() => props.scales, () => props.section, () => props.layout, currentTheme, locale],
  async () => {
    draw()
    await nextTick()
    remeasure()
  },
)
</script>

<template>
  <svg ref="svgEl" class="section-svg" />
</template>

<style scoped>
.section-svg {
  display: block;
  width: 100%;
  height: 100%;
  /* Ticks read against C/D may sit outside the 0..1 span; keep them visible
     rather than clipping them at the SVG viewport. */
  overflow: visible;
}
</style>
