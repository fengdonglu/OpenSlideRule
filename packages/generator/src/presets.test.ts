// @vitest-environment node
import { describe, it, expect } from 'vitest'
import {
  logScale,
  logDecades,
  linearScale,
  fnScale,
  valueFnScale,
  exprScale,
  reciprocal,
  interval,
} from './presets'

describe('logScale', () => {
  it('defaults the anchor to 1 and copies the measured fields', () => {
    expect(
      logScale({
        domain: [1, 10],
        intervals: [{ from: 1, to: 10, steps: [{ step: 0.1, level: 1 }] }],
      }),
    ).toEqual({
      domain: [1, 10],
      map: { kind: 'log', anchor: 1 },
      intervals: [{ from: 1, to: 10, steps: [{ step: 0.1, level: 1 }] }],
    })
  })

  it('passes an explicit anchor and normalize through', () => {
    expect(logScale({ domain: [1, 10], intervals: [], anchor: 2, normalize: true }).map).toEqual({
      kind: 'log',
      anchor: 2,
      normalize: true,
    })
  })

  it('carries optional labels and marks', () => {
    expect(
      logScale({
        domain: [1, 10],
        intervals: [],
        labels: [1, { value: 2, text: 'two' }],
        marks: [{ value: Math.PI, label: 'π' }],
      }),
    ).toEqual({
      domain: [1, 10],
      map: { kind: 'log', anchor: 1 },
      intervals: [],
      labels: [1, { value: 2, text: 'two' }],
      marks: [{ value: Math.PI, label: 'π' }],
    })
  })
})

describe('logDecades', () => {
  it('normalizes the map and sets the decade count', () => {
    expect(
      logDecades({
        domain: [1, 100],
        decades: 2,
        intervals: [{ from: 1, to: 10, steps: [{ step: 0.1, level: 2 }] }],
      }),
    ).toEqual({
      domain: [1, 100],
      map: { kind: 'log', anchor: 1, normalize: true },
      intervals: [{ from: 1, to: 10, steps: [{ step: 0.1, level: 2 }] }],
      decades: 2,
    })
  })

  it('honours an explicit anchor', () => {
    expect(logDecades({ domain: [1, 100], decades: 2, intervals: [], anchor: 10 }).map).toEqual({
      kind: 'log',
      anchor: 10,
      normalize: true,
    })
  })
})

describe('linearScale', () => {
  it('maps linearly and carries labels and labelFormat', () => {
    expect(
      linearScale({
        domain: [0, 1],
        intervals: [],
        labels: [0, 1],
        labelFormat: 'linearFraction',
      }),
    ).toEqual({
      domain: [0, 1],
      map: { kind: 'linear' },
      intervals: [],
      labels: [0, 1],
      labelFormat: 'linearFraction',
    })
  })
})

describe('fnScale', () => {
  it('copies fn/from and the optional label fields', () => {
    expect(
      fnScale({
        fn: 'tan',
        from: 1,
        domain: [0, 45],
        intervals: [],
        labels: [0],
        marks: [{ value: 1, label: 'x' }],
        labelFormat: 'degree',
        labelLevel: 'keep',
      }),
    ).toEqual({
      domain: [0, 45],
      map: { kind: 'fn', fn: 'tan', from: 1 },
      intervals: [],
      labels: [0],
      marks: [{ value: 1, label: 'x' }],
      labelFormat: 'degree',
      labelLevel: 'keep',
    })
  })
})

describe('valueFnScale', () => {
  it('copies the cosh/sech function and from', () => {
    expect(
      valueFnScale({ fn: 'cosh', from: 1, domain: [0, 1], intervals: [], labelFormat: 'sechZero' }),
    ).toEqual({
      domain: [0, 1],
      map: { kind: 'valueFn', fn: 'cosh', from: 1 },
      intervals: [],
      labelFormat: 'sechZero',
    })
  })
})

describe('exprScale', () => {
  it('builds an expr map with an analytic inverse', () => {
    expect(
      exprScale({
        domain: [1, 10],
        intervals: [],
        position: 'log10(x)',
        inverse: '10 ^ p',
        labelFormat: 'default',
      }),
    ).toEqual({
      domain: [1, 10],
      map: { kind: 'expr', position: 'log10(x)', inverse: '10 ^ p' },
      intervals: [],
      labelFormat: 'default',
    })
  })

  it('omits the inverse when none is given', () => {
    expect(exprScale({ domain: [1, 10], intervals: [], position: 'log10(x)' }).map).toStrictEqual({
      kind: 'expr',
      position: 'log10(x)',
    })
  })
})

describe('reciprocal', () => {
  it('builds a reciprocal read spec', () => {
    expect(reciprocal(10)).toEqual({ kind: 'reciprocal', scale: 10 })
  })
})

describe('interval', () => {
  it('builds an interval spec with its steps', () => {
    expect(
      interval(1, 2, [
        { step: 0.01, level: 3 },
        { step: 0.05, level: 1 },
      ]),
    ).toEqual({
      from: 1,
      to: 2,
      steps: [
        { step: 0.01, level: 3 },
        { step: 0.05, level: 1 },
      ],
    })
  })
})
