// @vitest-environment node
import { describe, it, expect } from 'vitest'
import { parseRule } from '@slide-rule/core'
import type { CalculationSpec, PhysicalSpec } from '@slide-rule/core'
import { runCli } from './cli'
import type { CliIO } from './cli'
import type { RuleSpec } from './spec'

function physical(): PhysicalSpec {
  return {
    faceWidthMm: 304.8,
    faceHeightMm: 50.8,
    rowCount: { upper: 4, middle: 6, lower: 4 },
    grooveRowRatio: 0.7,
    marginRowRatio: 0.4,
    leftGutterMm: 26.1,
    rightPanelMm: 19.7,
    numeralRatio: 0.6,
  }
}

function logCalculation(): CalculationSpec {
  return {
    domain: [1, 10],
    map: { kind: 'log', anchor: 1 },
    intervals: [{ from: 1, to: 10, steps: [{ step: 0.1, level: 1 }] }],
  }
}

function validSpec(): RuleSpec {
  return {
    id: 'cli-rule',
    name: 'CLI rule',
    physical: physical(),
    faces: {
      front: {
        upper: [],
        middle: [
          {
            id: 'C',
            name: 'C',
            type: 'C',
            orientation: 'increasing',
            calculation: logCalculation(),
          },
        ],
        lower: [],
      },
      back: { upper: [], middle: [], lower: [] },
    },
  }
}

interface Harness {
  io: CliIO
  store: Map<string, string>
  stdout: string[]
  stderr: string[]
}

function harness(files: Record<string, string> = {}): Harness {
  const store = new Map(Object.entries(files))
  const stdout: string[] = []
  const stderr: string[] = []
  const io: CliIO = {
    readFile: (path) => {
      const value = store.get(path)
      if (value === undefined) throw new Error(`ENOENT: no such file '${path}'`)
      return value
    },
    writeFile: (path, data) => {
      store.set(path, data)
    },
    stdout: (text) => {
      stdout.push(text)
    },
    stderr: (text) => {
      stderr.push(text)
    },
  }
  return { io, store, stdout, stderr }
}

function stderrText(h: Harness): string {
  return h.stderr.join('')
}

describe('runCli build', () => {
  it('writes a valid rule and returns 0 for a valid spec', () => {
    const h = harness({ 'spec.json': JSON.stringify(validSpec()) })

    const code = runCli(['build', 'spec.json', '-o', 'out.json'], h.io)

    expect(code).toBe(0)
    const written = h.store.get('out.json')
    expect(written).toBeDefined()
    if (written === undefined) return
    expect(written.endsWith('\n')).toBe(true)
    const parsed = JSON.parse(written)
    expect(parsed.schemaVersion).toBe(1)
    expect(parseRule(parsed).ok).toBe(true)
    expect(h.stdout.length).toBeGreaterThan(0)
    expect(h.stderr).toEqual([])
  })

  it('returns 1 and prints every build error for an invalid spec', () => {
    const spec = validSpec()
    spec.faces.front.middle[0].calculation = { ...logCalculation(), domain: [10, 1] }
    const h = harness({ 'spec.json': JSON.stringify(spec) })

    const code = runCli(['build', 'spec.json', '-o', 'out.json'], h.io)

    expect(code).toBe(1)
    expect(h.store.has('out.json')).toBe(false)
    const text = stderrText(h)
    expect(text).toContain('faces.front.middle[0].calculation.domain')
    expect(text).toContain('invalidDomain')
  })

  it('returns 2 for malformed JSON', () => {
    const h = harness({ 'spec.json': '{ not json' })

    const code = runCli(['build', 'spec.json', '-o', 'out.json'], h.io)

    expect(code).toBe(2)
    expect(stderrText(h)).toContain('JSON')
  })

  it('returns 2 when the spec file is missing', () => {
    const h = harness()

    const code = runCli(['build', 'spec.json', '-o', 'out.json'], h.io)

    expect(code).toBe(2)
    expect(stderrText(h)).toContain('cannot read')
  })

  it('returns 2 for an unknown command', () => {
    const h = harness()

    const code = runCli(['frobnicate'], h.io)

    expect(code).toBe(2)
    expect(stderrText(h)).toContain('Usage')
  })

  it('returns 2 when -o is missing', () => {
    const h = harness({ 'spec.json': JSON.stringify(validSpec()) })

    const code = runCli(['build', 'spec.json'], h.io)

    expect(code).toBe(2)
    expect(h.store.has('spec.json')).toBe(true)
    expect(stderrText(h)).toContain('Usage')
  })

  it('returns 2 when the spec positional is missing', () => {
    const h = harness()

    const code = runCli(['build', '-o', 'out.json'], h.io)

    expect(code).toBe(2)
    expect(stderrText(h)).toContain('Usage')
  })

  it('returns 2 and reports an error when the output cannot be written', () => {
    const h = harness({ 'spec.json': JSON.stringify(validSpec()) })
    h.io.writeFile = () => {
      throw new Error('EACCES: permission denied')
    }

    const code = runCli(['build', 'spec.json', '-o', 'out.json'], h.io)

    expect(code).toBe(2)
    expect(stderrText(h)).toContain('cannot write')
    expect(h.stdout).toEqual([])
  })
})
