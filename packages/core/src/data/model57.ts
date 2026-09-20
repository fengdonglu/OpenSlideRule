// Chinese Type 57 pocket slide rule (五七型便携计算尺) - scale configuration.
// Scale list, row order, colours and reference notes are read from photographs
// of the rule (see docs/domain/model-57.md for the sources); the physical
// dimensions are the 1002's halved (6in x 1in). The rule is single-faced, so
// the front scale list is the whole rule.
//
// The runtime structure is loaded from the canonical JSON
// (packages/core/rules/type-57.json) by the JSON loader; the TS literal that
// used to define it was retired.

import { builtInRules } from '../load/builtInRules'

export const MODEL_57 = builtInRules().find((r) => r.id === '57')!
