// Chinese 1002 vector log-log double-sided slide rule - scale configuration.
// Physical spec and front/back scale order follow docs/domain/model-1002.md.
// Front/back follow the prototype photographs (docs/domain/prototype/).
// Every scale is graduated, so none is a placeholder.
//
// The runtime structure is loaded from the canonical JSON
// (packages/core/rules/1002.json) by the JSON loader; the TS literal that used
// to define it was retired. The shared helpers are re-exported here so existing
// importers keep working.

import { builtInRules } from '../load/builtInRules'

export { BLACK, RED, shared, getSections, countScales, sideHasScales } from './ruleHelpers'

export const MODEL_1002 = builtInRules().find((r) => r.id === '1002')!
