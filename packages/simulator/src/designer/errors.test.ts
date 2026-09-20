// @vitest-environment node
import { describe, expect, it } from 'vitest'
import { errorPaths, hasError, subtreeHasError } from './errors'
import type { BuildError } from '@slide-rule/generator'

const errors: BuildError[] = [
  { path: 'id', message: 'id is required' },
  { path: 'faces.front.upper[0].calculation.domain', message: 'invalidDomain' },
  { path: 'faces.front.upper[0].id', message: 'duplicateScaleId' },
  { path: '', message: 'rule spec must be an object' },
]

describe('error paths', () => {
  it('collects non-empty paths', () => {
    const paths = errorPaths(errors)
    expect(paths.has('id')).toBe(true)
    expect(paths.has('')).toBe(false)
    expect(paths.size).toBe(3)
  })
  it('matches an exact field', () => {
    const paths = errorPaths(errors)
    expect(hasError(paths, 'id')).toBe(true)
    expect(hasError(paths, 'name')).toBe(false)
  })
  it('matches a subtree by dotted/indexed prefix', () => {
    const paths = errorPaths(errors)
    expect(subtreeHasError(paths, 'faces.front.upper[0]')).toBe(true)
    expect(subtreeHasError(paths, 'faces.front.upper[1]')).toBe(false)
    expect(subtreeHasError(paths, 'faces.front')).toBe(true)
    expect(subtreeHasError(paths, 'faces.back')).toBe(false)
  })
})
