// Starter rules for the designer. Minimal but valid: buildRule must accept each.
import type { CalculationSpec } from '@slide-rule/core'
import type { RuleSpec } from '@slide-rule/generator'
import { interval, linearScale, logDecades, logScale } from '@slide-rule/generator'

export interface DesignerTemplate {
  id: string
  spec: RuleSpec
}

function logCD(): CalculationSpec {
  const intervals = [
    interval(1, 2, [
      { step: 0.01, level: 3 },
      { step: 0.1, level: 1 },
    ]),
    interval(2, 10, [
      { step: 0.1, level: 3 },
      { step: 1, level: 1 },
    ]),
  ]
  const labels = [1, 2, 3, 4, 5, 6, 7, 8, 9, 10]
  return logScale({ domain: [1, 10], intervals, labels, marks: [{ value: Math.PI, label: 'π' }] })
}

export function templateSpecs(): DesignerTemplate[] {
  return [
    {
      id: 'linearLog',
      spec: {
        id: 'template-linear',
        name: 'Linear log rule',
        physical: {
          faceWidthMm: 304.8,
          faceHeightMm: 50.8,
          rowCount: { upper: 1, middle: 1, lower: 1 },
          grooveRowRatio: 0.7,
          marginRowRatio: 0.4,
          leftGutterMm: 26.1,
          rightPanelMm: 19.7,
          numeralRatio: 0.6,
        },
        faces: {
          front: {
            upper: [
              {
                id: 'A',
                name: 'A',
                type: 'A',
                orientation: 'increasing',
                calculation: logDecades({
                  domain: [1, 100],
                  decades: 2,
                  intervals: [interval(1, 10, [{ step: 1, level: 1 }])],
                }),
              },
            ],
            middle: [
              { id: 'C', name: 'C', type: 'C', orientation: 'increasing', calculation: logCD() },
            ],
            lower: [
              { id: 'D', name: 'D', type: 'D', orientation: 'increasing', calculation: logCD() },
              {
                id: 'L',
                name: 'L',
                type: 'L',
                orientation: 'increasing',
                calculation: linearScale({
                  domain: [0, 1],
                  intervals: [interval(0, 1, [{ step: 0.1, level: 1 }])],
                  labelFormat: 'linearFraction',
                }),
              },
            ],
          },
          back: { upper: [], middle: [], lower: [] },
        },
      },
    },
    {
      id: 'circularCd',
      spec: {
        id: 'template-circular',
        name: 'Circular C/D rule',
        form: 'circular',
        disc: { outerRadiusMm: 80, innerRadiusMm: 10, sheetSizeMm: 180 },
        faces: {
          front: {
            upper: [],
            middle: [
              { id: 'C', name: 'C', type: 'C', orientation: 'increasing', calculation: logCD() },
            ],
            lower: [
              { id: 'D', name: 'D', type: 'D', orientation: 'increasing', calculation: logCD() },
            ],
          },
          back: { upper: [], middle: [], lower: [] },
        },
      },
    },
  ]
}
