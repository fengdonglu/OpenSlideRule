<script setup lang="ts">
import { nextTick, onMounted, ref, watch } from 'vue'
import { useI18n } from 'vue-i18n'
import {
  computeFaceLayout,
  measureRadicals,
  renderDiscSheetToSVG,
  renderRuleSheetToSVG,
  type Theme,
} from '@slide-rule/renderer'
import { sideHasScales } from '@slide-rule/core'
import type {
  ScaleDefinition,
  ScaleSection,
  SlideRuleSide,
  SlideRuleStructure,
} from '@slide-rule/core'

const props = defineProps<{
  rule: SlideRuleStructure | null
  circular: boolean
  theme: Theme
}>()

const emit = defineEmits<{
  select: [selection: { face: SlideRuleSide; section: ScaleSection; index: number } | null]
}>()

const { t } = useI18n()
const host = ref<HTMLElement | null>(null)

function scaleElement(event: Event): Element | null {
  return (event.target as Element | null)?.closest('[data-scale-index]') ?? null
}

// The renderer tags every scale with `data-scale-index` / `data-section` (and
// `data-face` on its face/band) and ships an inert hit target that this preview
// re-enables (see the styles), so a scale can be selected by clicking it.
function onClick(event: MouseEvent): void {
  const scaleEl = scaleElement(event)
  if (scaleEl === null) {
    // A click outside the rule face clears the selection.
    emit('select', null)
    return
  }
  const face = scaleEl.closest('[data-face]')?.getAttribute('data-face')
  const section = scaleEl.getAttribute('data-section')
  const index = Number(scaleEl.getAttribute('data-scale-index'))
  const sections: ScaleSection[] = ['upper', 'middle', 'lower']
  if ((face !== 'front' && face !== 'back') || !sections.includes(section as ScaleSection)) return
  if (Number.isInteger(index)) emit('select', { face, section: section as ScaleSection, index })
}

// Hovering a scale highlights it. The highlight is a class on the rendered
// group, toggled directly so it costs no reactivity.
let hovered: Element | null = null
function clearHover(): void {
  hovered?.classList.remove('is-hovered')
  hovered = null
}
function onPointerMove(event: PointerEvent): void {
  const el = scaleElement(event)
  if (el === hovered) return
  clearHover()
  if (el !== null) {
    el.classList.add('is-hovered')
    hovered = el
  }
}

async function draw(): Promise<void> {
  const el = host.value
  if (el === null) return
  clearHover()
  el.replaceChildren()
  if (props.rule === null) return

  const rule = props.rule
  const faces = (['front', 'back'] as SlideRuleSide[]).filter((face) => sideHasScales(rule, face))

  if (props.circular) {
    // A circular draft without a disc is invalid; the template shows the notice.
    if (rule.disc === undefined) return
    const discSheet = renderDiscSheetToSVG(rule, {
      faces,
      theme: props.theme,
      titleOf: (scale: ScaleDefinition) => scale.name,
      paperFill: props.theme.colors.background,
    })
    el.appendChild(discSheet)
    return
  }

  const svg = renderRuleSheetToSVG(rule, {
    faces,
    theme: props.theme,
    titleOf: (scale: ScaleDefinition) => scale.name,
    paperFill: props.theme.colors.background,
  })
  el.appendChild(svg)

  await nextTick()
  if (document.fonts?.ready) await document.fonts.ready
  const layout = computeFaceLayout(rule.physical, rule.physical.faceWidthMm)
  measureRadicals(svg, layout.numeralMm * 0.9)
}

onMounted(() => {
  void draw()
})

watch([() => props.rule, () => props.circular, () => props.theme], () => {
  void draw()
})
</script>

<template>
  <div class="designer-preview">
    <div
      ref="host"
      class="designer-preview-host"
      @click="onClick"
      @pointermove="onPointerMove"
      @pointerleave="clearHover"
    />
    <p v-if="circular && !rule?.disc" class="designer-circular-note">
      {{ t('designer.circularNotice') }}
    </p>
  </div>
</template>

<style scoped>
.designer-preview {
  flex: 1 1 auto;
  min-height: 0;
  display: flex;
  flex-direction: column;
  gap: 8px;
}

/* The preview fills the space above the fixed status bar and scrolls inside. */
.designer-preview-host {
  width: 100%;
  flex: 1 1 auto;
  min-height: 0;
  overflow: auto;
  border: 1px solid var(--ui-border);
  border-radius: 6px;
  background: var(--ui-page);
}

/* The simulator's algorithm: the width fits the preview area and the height
   follows, so a tall sheet scrolls with the page's own scrollbar. */
.designer-preview-host :deep(svg) {
  display: block;
  width: calc(100% * var(--designer-zoom, 1));
  height: auto;
}

/* The renderer ships these hit targets inert; here they make a whole scale row
   or ring clickable, and the cursor hints that. */
.designer-preview-host :deep(.scale-hit) {
  pointer-events: all;
  cursor: pointer;
}

.designer-preview-host :deep(.disc-hit) {
  pointer-events: stroke;
  cursor: pointer;
}

/* Hovering a scale tints its hit target. */
.designer-preview-host :deep(.is-hovered .scale-hit) {
  fill: color-mix(in srgb, var(--ui-accent) 12%, transparent);
}

.designer-preview-host :deep(.is-hovered .disc-hit) {
  stroke: color-mix(in srgb, var(--ui-accent) 20%, transparent);
}

.designer-circular-note {
  margin: 0;
  padding: 24px;
  border: 1px dashed var(--ui-border);
  border-radius: 6px;
  color: var(--ui-text-muted);
  font-size: 13px;
  text-align: center;
}
</style>
