// Regenerates packages/core/rules/1002.json and type-57.json from the runtime
// models via serializeRule. Like engine/graduationReport.test.ts this is a
// writer, not an assertion: it runs as part of `npm test` and rewrites the
// canonical JSON deterministically, so the files can never drift from the
// serializer. The committed JSON is what load/builtInRules.ts bundles.
import { it } from 'vitest'
import { writeFileSync } from 'node:fs'
import { MODEL_1002, MODEL_57 } from '../index'
import { serializeRule } from './serialize'

function write(path: string, model: Parameters<typeof serializeRule>[0]): void {
  writeFileSync(path, JSON.stringify(serializeRule(model), null, 2) + '\n')
}

it('writes the canonical built-in rule JSON', () => {
  write('packages/core/rules/1002.json', MODEL_1002)
  write('packages/core/rules/type-57.json', MODEL_57)
})
