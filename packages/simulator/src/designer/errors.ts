// Map the validator's dotted paths onto form fields. The loader reports a path
// such as `faces.front.upper[0].calculation.domain`; a field knows its own path
// and asks hasError, or a panel asks subtreeHasError for its prefix.
import type { BuildError } from '@slide-rule/generator'

export function errorPaths(errors: BuildError[]): Set<string> {
  const paths = new Set<string>()
  for (const error of errors) if (error.path.length > 0) paths.add(error.path)
  return paths
}

export function hasError(paths: Set<string>, path: string): boolean {
  return paths.has(path)
}

export function subtreeHasError(paths: Set<string>, prefix: string): boolean {
  for (const path of paths) {
    if (path === prefix || path.startsWith(`${prefix}.`) || path.startsWith(`${prefix}[`)) {
      return true
    }
  }
  return false
}
