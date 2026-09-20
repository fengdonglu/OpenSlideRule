// Minimal Node globals for the E2E layer. The repo does not depend on
// `@types/node`; the generator hand-rolls the same shim (see
// packages/generator/src/types/node.d.ts). Only `process.env` is used here.
declare const process: {
  env: Record<string, string | undefined>
}
